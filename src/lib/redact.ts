/**
 * Strips personal data out of resume text before it is stored or sent anywhere.
 *
 * WHY THIS EXISTS IN THE BROWSER TOO
 * ----------------------------------
 * This page parses the PDF client-side (see `lib/pdf.ts`) and writes the raw
 * text straight into `JobSeekerProfile.resumeRawText`. That means the
 * candidate's real name, phone number, email and home address were being
 * persisted verbatim — on a platform whose entire pitch is that it doesn't
 * look at identity.
 *
 * The Python service (`ai-service/ai/privacy/redact.py`) does the same job
 * server-side and is the authoritative implementation. This is a deliberate
 * port rather than a call to that service, because the client-side parse path
 * still runs when the AI service isn't deployed or is unreachable — which is
 * the likely state during the pitch. A redaction that only works when the
 * backend is up is not a guarantee.
 *
 * Keep the two in sync. `ai-service/tests/test_redact.py` holds the cases both
 * are expected to satisfy; if you change a pattern here, change it there.
 *
 * LIMITS, STATED PLAINLY
 * ----------------------
 * Regex is not NER. A Thai name written with no title and not on a header line
 * can still slip through. This is a first line of defence, not a guarantee —
 * do not describe it as catching everything.
 */

export type RedactionKind =
  | "email"
  | "phone"
  | "thai_id"
  | "address"
  | "name"
  | "profile_url"
  | "gpa"
  | "university"
  | "faculty"
  | "birth_date"
  | "age"
  | "gender";

const PLACEHOLDER: Record<RedactionKind, string> = {
  email: "[อีเมล]",
  phone: "[เบอร์โทร]",
  thai_id: "[เลขบัตรประชาชน]",
  address: "[ที่อยู่]",
  name: "[ชื่อ]",
  profile_url: "[ลิงก์โปรไฟล์]",
  gpa: "[เกรด]",
  university: "[สถาบันการศึกษา]",
  faculty: "[สาขาวิชา]",
  birth_date: "[วันเกิด]",
  age: "[อายุ]",
  gender: "[เพศ]",
};

const TIER: Record<RedactionKind, "pii" | "bias"> = {
  email: "pii",
  phone: "pii",
  thai_id: "pii",
  address: "pii",
  name: "pii",
  profile_url: "pii",
  gpa: "bias",
  university: "bias",
  faculty: "bias",
  birth_date: "bias",
  age: "bias",
  gender: "bias",
};

const TH = "\\u0E00-\\u0E7F";

// Lookbehind is avoided throughout: Safari only gained support in 16.4, and a
// redaction that silently throws on an older browser is worse than a slightly
// clumsier pattern. Where a "not preceded by" guard is needed, the character is
// captured in group 1 and the match offset is advanced past it instead.
const EMAIL = /[A-Za-z0-9._%+-]+\s*(?:@|\[at\]|\(at\))\s*[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;

const PROFILE_URL =
  /(?:https?:\/\/)?(?:www\.)?(?:linkedin\.com|facebook\.com|fb\.com|fb\.me|instagram\.com|twitter\.com|x\.com|line\.me|tiktok\.com)\/[^\s,;)\]]*/gi;

const LINE_ID = /(?:LINE(?:\s*ID)?|ไลน์(?:\s*ไอดี)?)\s*[:：]?\s*@?[A-Za-z0-9._-]{3,30}/gi;

const THAI_ID = /(^|[^\d])(\d[\s-]?\d{4}[\s-]?\d{5}[\s-]?\d{2}[\s-]?\d)(?!\d)/g;

const LABELED_PHONE =
  /(?:โทรศัพท์|โทร|เบอร์(?:โทร)?(?:ติดต่อ)?|มือถือ|Tel|Telephone|Mobile|Phone|Contact)\s*[.:：]?\s*[\d][\d\s\-.()+]{7,19}\d/gi;

const BARE_PHONE = /(^|[^\dA-Za-z_])((?:\+\s?66[\s\-.]?|0)\(?\d{1,2}\)?[\s\-.]?\d{3}[\s\-.]?\d{3,4})(?!\d)/g;

const NAME_LABEL = new RegExp(
  "(?:ชื่อ(?!โครงการ|บริษัท|ตำแหน่ง|ผลงาน|วิชา|หลักสูตร|ทีม|ระบบ|ไฟล์)" +
    "(?:[\\s-]*(?:นามสกุล|สกุล|จริง|เล่น))?|Full\\s*Name|Name|Applicant)" +
    "\\s*[:：]\\s*[^\\n]{1,60}",
  "gi",
);

const NAME_TITLED_TH = new RegExp(
  "(?:นางสาว|นาง(?!สาว)|นาย(?!จ้าง|หน้า|ทะเบียน|ทุน|ประกัน)|น\\.ส\\.|ด\\.ช\\.|ด\\.ญ\\.|ว่าที่ร้อยตรี)" +
    `\\s*[${TH}]{2,}(?:\\s+[${TH}]{2,})?`,
  "g",
);

const NAME_TITLED_EN = /\b(?:Mr|Mrs|Ms|Miss)\.?\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2}/g;

const GPA =
  /(?:GPAX|GPA|เกรดเฉลี่ย(?:สะสม)?|เกรด|ผลการเรียน|Grade\s*Point)\s*[:：]?\s*(?:=\s*)?\d(?:\.\d{1,2})?(?:\s*\/\s*4(?:\.\d{1,2})?)?/gi;

const KNOWN_UNI = [
  "จุฬาลงกรณ์", "ธรรมศาสตร์", "เกษตรศาสตร์", "มหิดล", "ศิลปากร",
  "ศรีนครินทรวิโรฒ", "สงขลานครินทร์", "พระจอมเกล้า", "ลาดกระบัง",
  "บางมด", "รามคำแหง", "อัสสัมชัญ",
];

// Deliberately does not consume a following space-separated word: Thai
// compounds have no spaces, so "มหาวิทยาลัยเกษตรศาสตร์ คณะวิศวกรรมศาสตร์"
// would otherwise be swallowed whole and reported as one university with zero
// faculties — a number we'd then show to judges.
const UNIVERSITY = new RegExp(
  `(?:มหาวิทยาลัย|วิทยาลัย|สถาบันเทคโนโลยี|โรงเรียน)[${TH}]*` +
    `|(?:${KNOWN_UNI.join("|")})` +
    "|\\bUniversity\\s+of\\s+[A-Z][A-Za-z]+(?:\\s+[A-Z][A-Za-z]+)?" +
    "|\\b[A-Z][A-Za-z]*(?:\\s+[A-Z][A-Za-z]*){0,2}\\s+(?:University|College)\\b",
  "g",
);

const FACULTY = new RegExp(
  `(?:คณะ|ภาควิชา|สาขาวิชา|หลักสูตร)[${TH}]*(?:\\s+[${TH}]+){0,2}` +
    "|Faculty\\s+of\\s+[A-Za-z]+(?:\\s+[A-Za-z]+){0,2}" +
    "|(?:Bachelor|Master)(?:'s)?\\s+(?:Degree\\s+)?(?:of|in)\\s+[A-Za-z]+(?:\\s+[A-Za-z]+){0,2}",
  "g",
);

const BIRTH =
  /(?:วัน\s*เดือน\s*ปีเกิด|วันเกิด|เกิดวันที่|เกิดเมื่อ|Date\s*of\s*Birth|D\.?O\.?B\.?)\s*[:：]?\s*[^\n]{0,25}/gi;
const AGE = /อายุ\s*\d{1,2}\s*(?:ปี)?|\bAge\s*[:：]?\s*\d{1,2}\b/gi;

// Thai and Latin are split because `\b` does not work after a Thai character
// in JavaScript: Thai letters aren't `\w`, so `ชาย\b` never matches before a
// space. Python's `re` *does* treat them as word characters, so the single
// combined pattern silently behaved differently in the two ports — "เพศ ชาย"
// was redacted server-side and left in place in the browser.
const GENDER =
  /เพศ\s*[:：]?\s*(?:ชาย|หญิง)|(?:Gender|Sex)\s*[:：]?\s*(?:Male|Female|M|F)(?![A-Za-z])/gi;

/**
 * Placeholders already present in the text are reserved before any rule runs,
 * so a second pass can't redact them again.
 *
 * `[สาขาวิชา]` contains the literal word "สาขาวิชา", which the faculty pattern
 * matches — without this, running the text through twice produced
 * `[[สาขาวิชา]]`, and again for every pass after that. It matters because the
 * browser redacts and then the Python service redacts the same text again.
 *
 * Reserving the spans is the fix rather than renaming the labels, because
 * renaming only holds until someone adds the next placeholder.
 */
const PLACEHOLDER_SPAN = new RegExp(
  `\\[(?:${Object.values(PLACEHOLDER)
    .map((p) => p.slice(1, -1))
    .join("|")})\\]`,
  "g",
);

const ADDR_MARKERS = [
  "ที่อยู่", "บ้านเลขที่", "เลขที่", "หมู่ที่", "หมู่บ้าน", "ซอย", "ถนน",
  "ตำบล", "แขวง", "อำเภอ", "เขต", "จังหวัด", "รหัสไปรษณีย์",
];
const ADDR_ABBR = /(?:^|[\s,])(?:ซ|ถ|ต|อ|จ)\.\s?[฀-๿]/g;
const ADDR_EN = /\b(?:Road|Rd\.|Street|St\.|Soi|Moo|Sub-?district|Subdistrict|District|Province|Alley)\b/i;
const POSTAL = /(^|[^\d])\d{5}(?!\d)/;
const MAX_ADDRESS_LINE = 200;

const NOT_A_NAME =
  /@|https?:\/\/|www\.|\d{3}|resume|curriculum|^cv$|profile|objective|summary|address|experience|education|employment|work\s+history|skills?|qualification|certification|project|reference|language|publication|award|interest|hobb|ประวัติ|ประสบการณ์|การศึกษา|ทักษะ|ที่อยู่|เบอร์|อีเมล|ติดต่อ|วัตถุประสงค์/i;
const NOT_IN_A_NAME = /[0-9,;:|/\\()[\]{}#&%+=*"<>@]/;
const HEADER_SCAN_LINES = 24;
const MIN_LINES_FOR_HEADER_GUESS = 3;

export interface RedactionReport {
  total: number;
  pii: number;
  bias: number;
  byKind: Partial<Record<RedactionKind, number>>;
}

export interface RedactionResult {
  text: string;
  report: RedactionReport;
  summary: string;
}

/** Not a data type — a marker meaning "this range is already spoken for". */
const KEEP = "__keep__";

interface Span {
  start: number;
  end: number;
  kind: RedactionKind | typeof KEEP;
  priority: number;
}

/**
 * Best-effort guess at the candidate's name from the header block. Requires
 * the document to actually look like a document (several lines) — without
 * that guard a short pasted line such as "ใช้ React, TypeScript, PostgreSQL"
 * gets treated as a name and the whole line disappears.
 */
export function guessHeaderName(text: string): string | null {
  const lines = text.split("\n").filter((l) => l.trim());
  if (lines.length < MIN_LINES_FOR_HEADER_GUESS) return null;

  for (const raw of lines.slice(0, HEADER_SCAN_LINES)) {
    const line = raw.replace(/^[\s\t|·•\-—:]+|[\s\t|·•\-—:]+$/g, "");
    if (line.length < 2 || line.length > 40) continue;
    if (NOT_A_NAME.test(line) || NOT_IN_A_NAME.test(line)) continue;

    const words = line.split(/\s+/);
    if (words.length < 1 || words.length > 4) continue;
    if (!/[฀-๿A-Za-z]{2,}/.test(line)) continue;

    // Latin-script names in resumes are always capitalised; this rejects
    // lowercase tech lists such as "python sql excel".
    if (/^[A-Za-z\s.'-]+$/.test(line) && !words.every((w) => !/[a-zA-Z]/.test(w[0]) || w[0] === w[0].toUpperCase())) {
      continue;
    }
    return line;
  }
  return null;
}

function addressLineSpans(text: string): Array<[number, number]> {
  const spans: Array<[number, number]> = [];
  let pos = 0;

  for (const line of text.split("\n")) {
    const start = pos;
    const end = pos + line.length;
    pos = end + 1;

    const trimmed = line.trim();
    if (!trimmed || trimmed.length > MAX_ADDRESS_LINE) continue;

    let score = ADDR_MARKERS.filter((m) => line.includes(m)).length;
    score += (line.match(ADDR_ABBR) ?? []).length;
    if (ADDR_EN.test(line)) score += 1;
    if (POSTAL.test(line) && score >= 1) score += 1;

    if (trimmed.startsWith("ที่อยู่") || score >= 2) spans.push([start, end]);
  }
  return spans;
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Removes personal data and returns the cleaned text plus a report of what
 * went. Both tiers are on by default — turning one off has to be a decision
 * someone made on purpose, not something they forgot to switch on.
 */
export function redact(
  text: string,
  options: { pii?: boolean; bias?: boolean } = {},
): RedactionResult {
  const doPii = options.pii ?? true;
  const doBias = options.bias ?? true;

  if (!text) {
    return { text: "", report: { total: 0, pii: 0, bias: 0, byKind: {} }, summary: EMPTY_SUMMARY };
  }

  const spans: Span[] = [];
  let priority = 0;

  // `offsetGroup` handles the patterns that guard against a preceding
  // character by capturing it: the match starts one character too early, so
  // the real span begins after that captured prefix.
  const collect = (re: RegExp, kind: RedactionKind | typeof KEEP, offsetGroup = false) => {
    const p = priority++;
    for (const m of text.matchAll(new RegExp(re.source, re.flags.includes("g") ? re.flags : `${re.flags}g`))) {
      const prefix = offsetGroup ? (m[1] ?? "").length : 0;
      const start = (m.index ?? 0) + prefix;
      const end = start + (offsetGroup ? (m[2] ?? "").length : m[0].length);
      if (end > start) spans.push({ start, end, kind, priority: p });
    }
  };

  const collectSpans = (pairs: Array<[number, number]>, kind: RedactionKind) => {
    const p = priority++;
    for (const [start, end] of pairs) {
      if (end > start) spans.push({ start, end, kind, priority: p });
    }
  };

  // Declared first so it wins every overlap: nothing may re-redact a label
  // that a previous pass already wrote.
  collect(PLACEHOLDER_SPAN, KEEP);

  if (doPii) {
    collect(EMAIL, "email");
    collect(PROFILE_URL, "profile_url");
    collect(LINE_ID, "profile_url");
    collectSpans(addressLineSpans(text), "address");
    collect(NAME_LABEL, "name");
    collect(THAI_ID, "thai_id", true);
    collect(LABELED_PHONE, "phone");
    collect(BARE_PHONE, "phone", true);
    collect(NAME_TITLED_TH, "name");
    collect(NAME_TITLED_EN, "name");

    const headerName = guessHeaderName(text);
    if (headerName && headerName.length >= 2) {
      collect(new RegExp(escapeRegExp(headerName), "g"), "name");
    }
  }

  if (doBias) {
    collect(UNIVERSITY, "university");
    collect(FACULTY, "faculty");
    collect(BIRTH, "birth_date");
    collect(GPA, "gpa");
    collect(AGE, "age");
    collect(GENDER, "gender");
  }

  // Earliest position wins; ties go to the rule declared first (which is the
  // one with the wider, more specific reach), then to the longer match.
  spans.sort(
    (a, b) => a.start - b.start || a.priority - b.priority || b.end - b.start - (a.end - a.start),
  );

  const chosen: Span[] = [];
  let cursor = 0;
  for (const span of spans) {
    if (span.start < cursor) continue;
    chosen.push(span);
    cursor = span.end;
  }

  const byKind: Partial<Record<RedactionKind, number>> = {};
  const out: string[] = [];
  let last = 0;
  for (const span of chosen) {
    out.push(text.slice(last, span.start));
    if (span.kind === KEEP) {
      // An existing label — copied through untouched and not counted as a
      // fresh removal, so the report doesn't inflate on every pass.
      out.push(text.slice(span.start, span.end));
    } else {
      out.push(PLACEHOLDER[span.kind]);
      byKind[span.kind] = (byKind[span.kind] ?? 0) + 1;
    }
    last = span.end;
  }
  out.push(text.slice(last));

  let pii = 0;
  let bias = 0;
  for (const [kind, count] of Object.entries(byKind) as Array<[RedactionKind, number]>) {
    if (TIER[kind] === "pii") pii += count;
    else bias += count;
  }

  // Counted from the tiers, not from `chosen`, which also holds the reserved
  // spans for labels that were already there.
  const report: RedactionReport = { total: pii + bias, pii, bias, byKind };
  return { text: out.join(""), report, summary: summarise(report) };
}

const EMPTY_SUMMARY = "ไม่พบข้อมูลส่วนตัวที่ต้องลบ";

const KIND_LABEL: Record<RedactionKind, string> = {
  email: "อีเมล",
  phone: "เบอร์โทร",
  name: "ชื่อ",
  address: "ที่อยู่",
  thai_id: "เลขบัตรประชาชน",
  profile_url: "ลิงก์โปรไฟล์",
  gpa: "เกรด",
  university: "สถาบันการศึกษา",
  faculty: "สาขาวิชา",
  birth_date: "วันเกิด",
  age: "อายุ",
  gender: "เพศ",
};

function summarise(report: RedactionReport): string {
  const entries = Object.entries(report.byKind) as Array<[RedactionKind, number]>;
  if (!entries.length) return EMPTY_SUMMARY;
  return (
    "ลบออกแล้ว: " +
    entries
      .sort((a, b) => b[1] - a[1])
      .map(([kind, count]) => `${KIND_LABEL[kind]} ${count} จุด`)
      .join(" · ")
  );
}
