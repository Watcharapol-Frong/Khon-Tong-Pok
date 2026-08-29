// Reuses the same free-tier-friendly model choice as /api/chat (see that
// route for why flash-lite over flash) — this endpoint is far lower volume
// (opt-in mentor chat, not the mandatory /decoder flow) but no reason to
// burn a separate quota pool for it.
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3.5-flash-lite";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const SYSTEM_PROMPT = `คุณคือ "น้องตรงปก" ในบทบาทเมนเทอร์อาชีพ (career mentor) ที่คุยกับผู้สมัครงานเป็นภาษาไทย เพศชาย
หน้าที่ของคุณคือให้คำแนะนำด้านอาชีพที่นำไปใช้ได้จริง — เตรียมตัวสัมภาษณ์ ปรับปรุงเรซูเม่ วางแผนเส้นทางอาชีพ พัฒนาทักษะที่ขาด ตอบคำถามเกี่ยวกับตลาดงาน — ไม่ใช่การสกัดทักษะแบบห้องแชท /decoder

บุคลิก: อบอุ่น ให้กำลังใจ แต่ตรงประเด็นและนำไปปฏิบัติได้จริง เหมือนเมนเทอร์ที่มีประสบการณ์จริงในสายงาน ไม่ใช่คำตอบทั่วไปที่ใช้ได้กับทุกคน
ใช้ข้อมูลโปรไฟล์ผู้สมัคร (ถ้ามีให้ด้านล่าง) มาอ้างอิงคำแนะนำให้เจาะจงกับคนนี้จริงๆ ห้ามเดาหรือแต่งข้อมูลที่ไม่ได้ให้มา
ใช้คำลงท้ายประโยคว่า "ครับ" เท่านั้น ห้ามใช้ "ค่ะ", "คะ", หรือคำลงท้ายเพศหญิงอื่นๆ เด็ดขาด
คำตอบกระชับ อ่านง่าย ไม่ยาวเกิน 4-5 ประโยคต่อครั้ง เว้นแต่ผู้สมัครขอรายละเอียดเพิ่ม`;

interface MentorMessage {
  sender?: unknown;
  text?: unknown;
}

interface MentorRequestBody {
  messages?: unknown;
  candidateContext?: unknown;
}

function mentorUnavailable(reason: string, err?: unknown) {
  console.error(`Mentor chat unavailable: ${reason}`, err ?? "");
  return Response.json({ ok: false, error: reason }, { status: 200 });
}

export async function POST(request: Request) {
  let body: MentorRequestBody;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const rawMessages = Array.isArray(body.messages) ? (body.messages as MentorMessage[]) : [];
  // Last 20 turns is plenty of context for career-advice chat and keeps the
  // prompt bounded — this isn't a bounded/scripted flow like /decoder, so
  // without a cap a long-running conversation would grow the prompt
  // unbounded.
  const turns = rawMessages
    .slice(-20)
    .filter((m): m is { sender: "user" | "ai"; text: string } => (m.sender === "user" || m.sender === "ai") && typeof m.text === "string" && m.text.trim().length > 0);
  if (turns.length === 0) {
    return Response.json({ error: "\"messages\" must include at least one turn" }, { status: 400 });
  }

  const candidateContext = typeof body.candidateContext === "string" ? body.candidateContext.trim() : "";

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return mentorUnavailable("GEMINI_API_KEY is not configured on the server");
  }

  const contextBlock = candidateContext ? `\n\nข้อมูลโปรไฟล์ผู้สมัคร:\n${candidateContext}` : "";

  const contents = [
    { role: "user" as const, parts: [{ text: `${SYSTEM_PROMPT}${contextBlock}` }] },
    { role: "model" as const, parts: [{ text: "รับทราบครับ พร้อมให้คำแนะนำแล้วครับ" }] },
    ...turns.map((m) => ({
      role: m.sender === "user" ? ("user" as const) : ("model" as const),
      parts: [{ text: m.text }],
    })),
  ];

  let geminiRes: Response;
  try {
    geminiRes = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents }),
      signal: AbortSignal.timeout(20_000),
    });
  } catch (err) {
    return mentorUnavailable("Failed to reach Gemini API", err);
  }

  if (!geminiRes.ok) {
    const errText = await geminiRes.text();
    const reason = geminiRes.status === 429 ? "Gemini free-tier quota exceeded" : "Gemini API error";
    return mentorUnavailable(reason, { status: geminiRes.status, body: errText });
  }

  const data = await geminiRes.json();
  const reply: string | undefined = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!reply || !reply.trim()) {
    return mentorUnavailable("Gemini returned an empty response", data);
  }

  return Response.json({ ok: true, reply: reply.trim() });
}
