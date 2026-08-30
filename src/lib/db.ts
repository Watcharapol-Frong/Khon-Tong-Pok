import { Prisma } from "@prisma/client";

/**
 * Survives the database being unreachable.
 *
 * WHY THIS EXISTS
 * ---------------
 * Every guarded page starts by resolving the session, which is a Prisma read.
 * When Postgres can't be reached, that read throws
 * `PrismaClientInitializationError`, and because it happens during render the
 * whole page dies — a full-screen error overlay in dev, a 500 in production.
 * Not a degraded page: no page.
 *
 * That is the wrong failure for a connection problem we don't control. Supabase
 * sits behind ports 5432/6543, and plenty of venue, campus and office networks
 * allow only 80/443 outbound. One blocked port should not take the entire site
 * down, least of all while it's being demonstrated.
 *
 * WHAT IT DOES INSTEAD
 * --------------------
 * Treats "database unreachable" as "nobody is signed in" — fail closed. Nothing
 * is shown that shouldn't be, the public pages keep rendering, and the guarded
 * ones send the visitor to /login rather than crashing.
 *
 * WHAT IT DELIBERATELY DOESN'T CATCH
 * ----------------------------------
 * Only connection-level failures. A constraint violation, a bad query or a
 * missing column still throws, because those are our bugs and hiding them would
 * turn a loud error into a page that quietly shows the wrong thing.
 */

/** True for "couldn't get to the database", not "the database said no". */
export function isConnectionError(err: unknown): boolean {
  if (err instanceof Prisma.PrismaClientInitializationError) return true;

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    // P1001 can't reach server · P1002 timed out · P1008 operation timed out
    // P1017 server closed the connection · P2024 timed out fetching from pool
    return ["P1001", "P1002", "P1008", "P1017", "P2024"].includes(err.code);
  }

  return false;
}

// Logged once rather than on every request: when the database is down this path
// runs for every page load and every asset-adjacent navigation, and a thousand
// identical stack traces bury whatever else is in the terminal.
let warned = false;

function warnOnce(err: unknown) {
  if (warned) return;
  warned = true;
  console.error(
    "\n⚠  ต่อฐานข้อมูลไม่ได้ — เว็บจะทำงานต่อในสถานะ 'ยังไม่ได้เข้าสู่ระบบ'\n" +
      "   เช็คตามนี้:\n" +
      "     1. เน็ตที่ใช้อยู่บล็อกพอร์ต 6543 หรือเปล่า (ลองสลับไปเน็ตมือถือ)\n" +
      "     2. DATABASE_URL ใน .env ถูกไหม และไฟล์ชื่อ .env จริง ๆ ไม่ใช่ .env.txt\n" +
      "     3. โปรเจกต์ Supabase ยัง active อยู่ไหม (free tier หยุดเองเมื่อไม่ได้ใช้)\n" +
      `   ต้นทาง: ${err instanceof Error ? err.message.split("\n")[0] : String(err)}\n`,
  );
}

/**
 * Runs a database read, returning `fallback` if the database can't be reached.
 *
 * Takes a thunk rather than a promise so the query isn't started before the
 * try/catch is in place — an already-rejected promise passed in would become an
 * unhandled rejection instead.
 */
export async function readOrFallback<T>(run: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await run();
  } catch (err) {
    if (!isConnectionError(err)) throw err;
    warnOnce(err);
    return fallback;
  }
}
