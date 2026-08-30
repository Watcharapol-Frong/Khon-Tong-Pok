/**
 * แปลงรหัสผ่านที่เก็บเป็น plaintext ให้เป็น scrypt hash
 *
 *   npm run db:hash-passwords -- --dry-run     ดูก่อนว่าจะแตะกี่แถว
 *   npm run db:hash-passwords                  ทำจริง
 *
 * ทำไมต้องมีสคริปต์นี้ ทั้งที่ login รีแฮชให้เองอยู่แล้ว
 * ---------------------------------------------------
 * การรีแฮชตอน login จะเกิดก็ต่อเมื่อ "เจ้าของบัญชีล็อกอิน" ซึ่งแปลว่ารหัสผ่าน
 * ของคนที่ไม่ได้เข้ามาอีกเลยจะเป็น plaintext ค้างอยู่ตลอดไป
 *
 * ตอนนี้เรารู้ค่ารหัสผ่านจริงของทุกคน (มันถูกเก็บแบบ plaintext อยู่) เลยแฮชได้
 * ทันทีโดยไม่ต้องให้ใครตั้งรหัสใหม่ — และนี่คือ **โอกาสสุดท้าย** ที่ทำได้
 * ง่ายขนาดนี้ พอแฮชแล้วจะย้อนกลับไปอ่านค่าเดิมไม่ได้อีก ซึ่งเป็นเรื่องที่ถูกต้อง
 *
 * รันซ้ำได้ ไม่พัง — แถวที่แฮชแล้วจะถูกข้าม
 */

// โหลด .env เอง — tsx ไม่ได้โหลดให้อัตโนมัติ ถ้าไม่มีบรรทัดนี้
// DATABASE_URL จะเป็น undefined แล้ว Prisma จะฟ้องคนละเรื่องกับที่พังจริง
// (แพตเทิร์นเดียวกับ prisma/seed.ts)
import { config as loadEnv } from "dotenv";

// .env.local มาก่อน .env — dotenv ไม่เขียนทับตัวแปรที่ตั้งไปแล้ว
// ไฟล์ที่โหลดก่อนจึงชนะ ซึ่งเป็นลำดับเดียวกับที่ Next.js ใช้
loadEnv({ path: ".env.local" });
loadEnv({ path: ".env" });

import { PrismaClient } from "@prisma/client";

import { hashPassword, isHashed } from "../src/lib/password";

const prisma = new PrismaClient();
const dryRun = process.argv.includes("--dry-run");

async function convert(
  label: string,
  rows: { id: string; email: string; password: string | null }[],
  update: (id: string, hash: string) => Promise<unknown>,
) {
  // Google-only accounts have no password to convert.
  const plaintext = rows.filter((r) => r.password !== null && !isHashed(r.password));

  console.log(`\n${label}`);
  console.log(`  ทั้งหมด            ${rows.length}`);
  console.log(`  ไม่มีรหัสผ่าน (Google) ${rows.filter((r) => r.password === null).length}`);
  console.log(`  แฮชแล้ว            ${rows.filter((r) => r.password && isHashed(r.password)).length}`);
  console.log(`  ยังเป็น plaintext  ${plaintext.length}`);

  if (!plaintext.length) return 0;
  if (dryRun) {
    console.log("  (dry-run — ยังไม่เขียนอะไร)");
    return 0;
  }

  let done = 0;
  for (const row of plaintext) {
    // ทีละแถว ไม่ยิงพร้อมกัน: scrypt กินหน่วยความจำ ~32MB ต่อครั้งโดยตั้งใจ
    // ยิง 43 แถวขนานกันคือขอ RAM 1.4GB พร้อมกัน แล้ว process จะตายกลางทาง
    await update(row.id, await hashPassword(row.password as string));
    done += 1;
    if (done % 10 === 0) console.log(`  ... ${done}/${plaintext.length}`);
  }
  console.log(`  ✓ แปลงแล้ว ${done} แถว`);
  return done;
}

async function main() {
  console.log(dryRun ? "โหมดตรวจสอบ (ไม่เขียนอะไร)" : "โหมดเขียนจริง");

  const jobSeekers = await prisma.jobSeeker.findMany({
    select: { id: true, email: true, password: true },
  });
  const hrUsers = await prisma.hRUser.findMany({
    select: { id: true, email: true, password: true },
  });

  const a = await convert("JobSeeker", jobSeekers, (id, password) =>
    prisma.jobSeeker.update({ where: { id }, data: { password } }),
  );
  const b = await convert("HRUser", hrUsers, (id, password) =>
    prisma.hRUser.update({ where: { id }, data: { password } }),
  );

  console.log("\n" + "=".repeat(50));
  if (dryRun) {
    console.log("ยังไม่ได้เขียนอะไรลงฐานข้อมูล — รันซ้ำโดยไม่ใส่ --dry-run เพื่อทำจริง");
  } else if (a + b > 0) {
    console.log(`เสร็จแล้ว: แปลง ${a + b} รหัสผ่าน`);
    console.log("ทุกคนยังล็อกอินด้วยรหัสผ่านเดิมได้ตามปกติ ไม่ต้องตั้งใหม่");
  } else {
    console.log("ไม่มีรหัสผ่าน plaintext เหลืออยู่แล้ว");
  }
  console.log("=".repeat(50));
}

main()
  .catch((err) => {
    console.error("\nล้มเหลว:", err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
