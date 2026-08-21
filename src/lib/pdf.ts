let workerConfigured = false;
let readableStreamPolyfilled = false;

/**
 * Safari's `ReadableStream` doesn't implement `Symbol.asyncIterator`
 * (long-standing WebKit gap), but pdf.js's `getTextContent()` relies on
 * `for await (const value of readableStream)` internally. Without this,
 * Safari throws "undefined is not a function (near '...value of
 * readableStream...')" from inside pdf.js on every text extraction.
 */
function ensureReadableStreamAsyncIterator() {
  if (readableStreamPolyfilled) return;
  readableStreamPolyfilled = true;

  if (typeof ReadableStream === "undefined") return;
  const proto = ReadableStream.prototype as ReadableStream & {
    [Symbol.asyncIterator]?: () => AsyncIterator<unknown>;
  };
  if (proto[Symbol.asyncIterator]) return;

  proto[Symbol.asyncIterator] = function (this: ReadableStream) {
    const reader = this.getReader();
    return {
      async next() {
        const { done, value } = await reader.read();
        return { done, value };
      },
      async return(value?: unknown) {
        reader.releaseLock();
        return { done: true, value };
      },
      [Symbol.asyncIterator]() {
        return this;
      },
    };
  };
}

/**
 * Extracts text from a PDF entirely client-side via pdf.js. Returns an empty
 * string (rather than throwing) for scanned/image-only PDFs that have no
 * embedded text layer — callers should treat a near-empty result as "could
 * not read this file" rather than a hard error.
 *
 * pdfjs-dist is loaded via dynamic import (not a top-level static import)
 * because its browser build references `DOMMatrix` at module-evaluation
 * time, which doesn't exist during Next.js's server render of this "use
 * client" page. Deferring the import to when this function actually runs
 * (from a browser file-input handler) keeps it out of the SSR pass.
 *
 * The worker script and standard font metrics are served from `/public/pdfjs`
 * (copied from `node_modules/pdfjs-dist` — see that folder) rather than
 * bundler-resolved, since `standardFontDataUrl` is a directory pdf.js reads
 * filenames from at runtime, which a bundler can't statically resolve.
 * Without it, text extraction silently truncates on PDFs using non-embedded
 * standard fonts (e.g. plain Helvetica/Times) — a very common case for
 * resume PDFs.
 */
export async function extractTextFromPdf(file: File): Promise<string> {
  ensureReadableStreamAsyncIterator();
  const pdfjsLib = await import("pdfjs-dist");

  if (!workerConfigured) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdfjs/pdf.worker.min.mjs";
    workerConfigured = true;
  }

  const buffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({
    data: buffer,
    standardFontDataUrl: "/pdfjs/standard_fonts/",
  }).promise;

  const pageTexts: string[] = [];
  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    let pageText = "";
    for (const item of content.items) {
      if (!("str" in item)) continue;
      pageText += item.hasEOL ? `${item.str}\n` : `${item.str} `;
    }
    pageTexts.push(pageText);
  }

  return pageTexts.join("\n");
}

const NON_NAME_LINE_PATTERN =
  /@|https?:\/\/|www\.|\d{3}|resume|curriculum vitae|^cv$|profile|objective|summary|address|ที่อยู่|เบอร์โทร|อีเมล|ประวัติ|resumé/i;

/**
 * Best-effort guess at the candidate's name from raw resume text — a
 * person's name is almost always one of the first few non-empty lines
 * (the header/title block), so this just looks for the first line in
 * that region that doesn't look like contact info, a section heading, or
 * a document title. Returns null rather than guessing wrong when nothing
 * plausible turns up, since a wrong guess is worse than asking the user.
 */
export function guessNameFromResumeText(text: string): string | null {
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 8);

  for (const line of lines) {
    if (line.length < 2 || line.length > 40) continue;
    if (NON_NAME_LINE_PATTERN.test(line)) continue;

    const words = line.split(/\s+/);
    if (words.length < 1 || words.length > 4) continue;

    return line;
  }

  return null;
}
