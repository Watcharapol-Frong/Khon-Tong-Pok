/**
 * เช็คว่าเครื่องนี้ต่อฐานข้อมูลได้ไหม และต่อไม่ได้เพราะอะไร
 *
 *   npm run db:check
 *
 * มีไว้เพราะตอนต่อ DB ไม่ได้ Prisma จะโยน PrismaClientInitializationError
 * ออกมากลางหน้าเว็บ ซึ่งบอกแค่ว่า "Can't reach database server" แล้วจบ
 * ไม่ได้บอกว่าเป็นที่ URL ผิด เน็ตบล็อกพอร์ต หรือรหัสผ่านไม่ตรง
 *
 * สคริปต์นี้แยกให้ว่าพังตรงไหน โดยไม่ต้องเปิด dev server รอดูจอแดง
 * และ **ไม่พิมพ์รหัสผ่านออกมา** เพราะทีมส่งสกรีนช็อตหากันตลอด
 */

// โหลด .env เอง — tsx ไม่ได้โหลดให้อัตโนมัติ ถ้าไม่มีบรรทัดนี้
// DATABASE_URL จะเป็น undefined แล้ว Prisma จะฟ้องคนละเรื่องกับที่พังจริง
// (แพตเทิร์นเดียวกับ prisma/seed.ts)
import { config as loadEnv } from "dotenv";

// .env.local มาก่อน .env — dotenv ไม่เขียนทับตัวแปรที่ตั้งไปแล้ว
// ไฟล์ที่โหลดก่อนจึงชนะ ซึ่งเป็นลำดับเดียวกับที่ Next.js ใช้
loadEnv({ path: ".env.local" });
loadEnv({ path: ".env" });

import net from "node:net";

import { PrismaClient } from "@prisma/client";

const CONNECT_TIMEOUT_MS = 8000;

function mask(url: string): string {
  return url.replace(/:\/\/([^:]+):[^@]+@/, "://$1:***@");
}

function parse(url: string): { host: string; port: number } | null {
  try {
    const u = new URL(url);
    return { host: u.hostname, port: Number(u.port) || 5432 };
  } catch {
    return null;
  }
}

/**
 * TCP อย่างเดียว ไม่แตะ Postgres เลย
 *
 * แยกขั้นนี้ออกมาเพราะมันตอบคำถามที่สำคัญที่สุด: ถ้า TCP ไม่ผ่าน แปลว่า
 * ปัญหาอยู่ที่เน็ต/ไฟร์วอลล์ ไม่ใช่ที่ URL หรือรหัสผ่าน จะได้ไม่ไปนั่งแก้ .env
 * ทั้งที่ .env ถูกอยู่แล้ว
 */
function tcpReachable(host: string, port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    const done = (ok: boolean) => {
      socket.destroy();
      resolve(ok);
    };
    socket.setTimeout(CONNECT_TIMEOUT_MS);
    socket.once("connect", () => done(true));
    socket.once("timeout", () => done(false));
    socket.once("error", () => done(false));
    socket.connect(port, host);
  });
}

async function checkUrl(label: string, url: string | undefined) {
  console.log(`\n── ${label} ──`);

  if (!url) {
    console.log("   ✗ ไม่ได้ตั้งค่าไว้ใน .env");
    return false;
  }

  console.log(`   ${mask(url)}`);

  const target = parse(url);
  if (!target) {
    console.log("   ✗ รูปแบบ URL ไม่ถูกต้อง");
    console.log("     ถ้ารหัสผ่านมี @ # หรือ ? ต้องเข้ารหัสก่อน (@ = %40, # = %23)");
    return false;
  }

  const poolerName =
    target.port === 6543 ? "transaction pooler" : target.port === 5432 ? "session pooler / direct" : "?";
  console.log(`   host: ${target.host}`);
  console.log(`   port: ${target.port}  (${poolerName})`);

  process.stdout.write("   TCP ... ");
  const reachable = await tcpReachable(target.host, target.port);
  if (!reachable) {
    console.log("✗ ต่อไม่ถึง");
    console.log(`\n   เน็ตที่ใช้อยู่น่าจะบล็อกพอร์ต ${target.port} ครับ`);
    console.log("   ลองตามนี้:");
    console.log("     1. สลับไปเน็ตมือถือ (hotspot) แล้วรันใหม่ — รู้ผลใน 10 วินาที");
    if (target.port === 6543) {
      console.log("     2. ถ้ายังไม่ได้ เปลี่ยน :6543 เป็น :5432 ใน DATABASE_URL");
    } else {
      console.log("     2. ถ้ายังไม่ได้ เปลี่ยน :5432 เป็น :6543 ใน DATABASE_URL");
    }
    console.log("     3. ปิด VPN แล้วลองใหม่");
    return false;
  }
  console.log("✓ ต่อถึง");

  process.stdout.write("   query ... ");
  const prisma = new PrismaClient({ datasources: { db: { url } } });
  try {
    const n = await prisma.jobSeeker.count();
    console.log(`✓ ใช้ได้ — JobSeeker ${n} แถว`);
    return true;
  } catch (err) {
    const message = err instanceof Error ? err.message.split("\n")[0] : String(err);
    console.log("✗ ล้มเหลว");
    console.log(`     ${message}`);

    // TCP ผ่านแต่ query ไม่ผ่าน = ไปถึงเซิร์ฟเวอร์แล้ว แต่ถูกปฏิเสธ
    // ซึ่งเป็นคนละปัญหากับเน็ตบล็อกโดยสิ้นเชิง
    if (/password|authentication|SASL/i.test(message)) {
      console.log("     → รหัสผ่านใน URL ไม่ตรง กด Reset database password ที่ Supabase แล้ววางใหม่");
    } else if (/does not exist|relation/i.test(message)) {
      console.log("     → ต่อได้แต่ยังไม่มีตาราง รัน: npx prisma migrate deploy");
    } else if (/prepared statement/i.test(message)) {
      console.log("     → ใช้ transaction pooler (6543) ต้องต่อท้าย URL ด้วย ?pgbouncer=true");
    }
    return false;
  } finally {
    await prisma.$disconnect();
  }
}

async function main() {
  console.log("เช็คการเชื่อมต่อฐานข้อมูล");
  console.log("=".repeat(52));

  const appOk = await checkUrl("DATABASE_URL (แอปใช้ตอนรัน)", process.env.DATABASE_URL);
  const migrateOk = await checkUrl("DIRECT_URL (Prisma Migrate ใช้)", process.env.DIRECT_URL);

  console.log("\n" + "=".repeat(52));
  if (appOk && migrateOk) {
    console.log("✓ ผ่านทั้งคู่ — เว็บควรทำงานได้ปกติ");
  } else if (appOk) {
    console.log("△ แอปรันได้ แต่ migrate ไม่ได้ (DIRECT_URL มีปัญหา)");
  } else {
    console.log("✗ แอปยังต่อฐานข้อมูลไม่ได้ — ดูคำแนะนำด้านบน");
    process.exitCode = 1;
  }
}

main();
