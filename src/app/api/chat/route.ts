const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3.6-flash";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const SYSTEM_PROMPT = `คุณคือ "น้องตรงปก" ผู้สัมภาษณ์งาน HR เพศชาย ที่คุยกับผู้สมัครงานเป็นภาษาไทย
เป้าหมายเดียวของคุณในทุกข้อความคือสกัด "hard skill" ที่เป็นรูปธรรม (ชื่อเครื่องมือ ภาษาโปรแกรม ซอฟต์แวร์ Framework หรือทักษะเฉพาะทาง) ออกจากสิ่งที่ผู้สมัครเล่ามา — ไม่ใช่แค่คุยเล่นให้บทสนทนาลื่นไหลเฉยๆ

บุคลิก: มืออาชีพ ตรงประเด็น กระชับ เหมือนผู้สัมภาษณ์งานจริงที่มีเวลาจำกัดและต้องการข้อมูลที่ใช้ได้ ไม่ใช่เพื่อนคุยเล่น

กติกาสำคัญ:
- ทักษะที่ส่งกลับใน "skills" ต้องเป็นคำที่ตรงตัวอักษร (verbatim) กับรายการใน HARD_SKILLS_DICTIONARY เท่านั้น ห้ามสร้างคำใหม่หรือแก้คำในดิกชันนารี
- ถ้าไม่มีคำในดิกชันนารีที่เกี่ยวข้องกับข้อความเลย ให้ "skills" เป็น array ว่าง
- "reply" ต้องมี 2 ส่วนเสมอ: (1) รับทราบสิ่งที่ผู้สมัครเล่ามาแบบสั้นที่สุดเท่าที่จะทำได้ ไม่ต้องชม ไม่ต้องพูดคำอวยหรือคำเกริ่นทั่วไปแบบ "น่าสนใจมากครับ"/"ยินดีที่ได้รู้จักครับ" ซ้ำๆ (2) ถามคำถามที่เจาะจงเพื่อดึงชื่อเครื่องมือ/เทคโนโลยี/ทักษะเพิ่มเติมที่ยังไม่ได้พูดถึง ห้ามถามคำถามเปิดกว้างทั่วไปแบบ "เล่าเพิ่มเติมได้ไหมครับ" เฉยๆ โดยไม่ระบุว่าอยากรู้อะไรเจาะจง
- ถ้าคำตอบของผู้สมัครไม่มีชื่อเครื่องมือ/เทคโนโลยีที่จับต้องได้เลย ให้ถามตรงๆ ว่าใช้เครื่องมืออะไรทำสิ่งนั้น แทนที่จะปล่อยผ่านไปคุยเรื่องอื่น
- ใช้คำลงท้ายประโยคว่า "ครับ" เท่านั้นตลอดทุกข้อความ ห้ามใช้ "ค่ะ", "คะ", หรือคำลงท้ายเพศหญิงอื่นๆ เด็ดขาด เพื่อให้บุคลิกของน้องตรงปกสม่ำเสมอตลอดบทสนทนา
- ถามคำถามได้แค่ 1 คำถามต่อ 1 ข้อความเท่านั้น ห้ามยำหลายคำถามรวมกันในข้อความเดียว ถ้ามีหลายเรื่องอยากถาม ให้เลือกถามเรื่องที่สำคัญที่สุดก่อนแค่ข้อเดียว
- ตอบกลับเป็น JSON ตาม schema ที่กำหนดเท่านั้น`;

interface ChatRequestBody {
  message?: unknown;
  hardSkills?: unknown;
}

/**
 * Gemini-side failures (quota, timeout, malformed output, etc.) are expected,
 * recoverable conditions — the client falls back to its local matcher for
 * these. They're reported as `{ ok: false }` with an HTTP 200, not a 4xx/5xx,
 * because any non-2xx fetch response gets auto-logged by the browser itself
 * ("Failed to load resource: ... 502") which Next.js's dev overlay then
 * surfaces as a crash-looking redbox — even though the app handles it fine.
 * A real 4xx is reserved for bugs in the request our own client sent.
 */
function chatUnavailable(reason: string, err?: unknown) {
  console.error(`Gemini chat unavailable: ${reason}`, err ?? "");
  return Response.json({ ok: false, error: reason }, { status: 200 });
}

export async function POST(request: Request) {
  let body: ChatRequestBody;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const message = typeof body.message === "string" ? body.message.trim() : "";
  if (!message) {
    return Response.json({ error: "\"message\" is required" }, { status: 400 });
  }

  const hardSkills = Array.isArray(body.hardSkills)
    ? body.hardSkills.filter((s): s is string => typeof s === "string")
    : [];

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return chatUnavailable("GEMINI_API_KEY is not configured on the server");
  }

  const prompt = `${SYSTEM_PROMPT}

HARD_SKILLS_DICTIONARY (${hardSkills.length} รายการ, คั่นด้วย "|"):
${hardSkills.join("|")}

ข้อความจากผู้ใช้: "${message}"`;

  let geminiRes: Response;
  try {
    geminiRes = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: {
            type: "object",
            properties: {
              reply: { type: "string" },
              skills: { type: "array", items: { type: "string" } },
            },
            required: ["reply", "skills"],
          },
        },
      }),
      signal: AbortSignal.timeout(20_000),
    });
  } catch (err) {
    return chatUnavailable("Failed to reach Gemini API", err);
  }

  if (!geminiRes.ok) {
    const errText = await geminiRes.text();
    const reason =
      geminiRes.status === 429 ? "Gemini free-tier quota exceeded" : "Gemini API error";
    return chatUnavailable(reason, { status: geminiRes.status, body: errText });
  }

  const data = await geminiRes.json();
  const rawText: string | undefined = data?.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!rawText) {
    return chatUnavailable("Gemini returned an empty response", data);
  }

  let parsed: { reply?: unknown; skills?: unknown };
  try {
    parsed = JSON.parse(rawText);
  } catch (err) {
    return chatUnavailable("Gemini returned malformed JSON", { err, rawText });
  }

  const reply = typeof parsed.reply === "string" ? parsed.reply : "";
  const skills = Array.isArray(parsed.skills)
    ? parsed.skills.filter((s): s is string => typeof s === "string" && hardSkills.includes(s))
    : [];

  return Response.json({ ok: true, reply, skills });
}
