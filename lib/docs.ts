import { canvasToBlob, canvasToPdf } from "./image";

export interface DocResult { blob: Blob; ext?: string }

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function cleanHtml(html: string): string {
  const doc = new DOMParser().parseFromString(html, "text/html");
  doc.querySelectorAll("script,iframe,object,embed,link,meta,base,style").forEach((n) => n.remove());
  return doc.body.innerHTML;
}

async function toHtml(file: File, ext: string): Promise<string> {
  if (ext === "docx") {
    const mod: any = await import("mammoth/mammoth.browser");
    const mammoth = mod.default ?? mod;
    const out = await mammoth.convertToHtml({ arrayBuffer: await file.arrayBuffer() });
    return cleanHtml(out.value);
  }
  const text = await file.text();
  if (ext === "md") {
    const { marked } = await import("marked");
    return cleanHtml(await marked.parse(text));
  }
  if (ext === "html") return cleanHtml(text);
  return `<pre style="white-space:pre-wrap;font:inherit;margin:0">${esc(text)}</pre>`;
}

function htmlToText(html: string): string {
  const doc = new DOMParser().parseFromString(
    html.replace(/<\/(p|div|h[1-6]|li|tr|pre|blockquote)>/gi, "$&\n").replace(/<br\s*\/?>/gi, "\n"),
    "text/html"
  );
  return (doc.body.textContent ?? "").replace(/\n{3,}/g, "\n\n").trim();
}

function wrapHtml(body: string, title: string) {
  return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(title)}</title><style>body{font-family:Inter,Arial,sans-serif;max-width:800px;margin:40px auto;padding:0 16px;line-height:1.6;color:#0f172a}img{max-width:100%}table{border-collapse:collapse}td,th{border:1px solid #e2e8f0;padding:4px 8px}</style></head><body>${body}</body></html>`;
}

async function textToPdf(text: string): Promise<Blob> {
  const { PDFDocument, StandardFonts, rgb } = await import("pdf-lib");
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const size = 11, margin = 50, lh = 15, W = 595.28, H = 841.89, maxW = W - margin * 2;
  const safe = text.replace(/\r/g, "").replace(/\t/g, "    ").replace(/[^\x20-\x7E\xA0-\xFF\n]/g, "?");
  let page = pdf.addPage([W, H]);
  let y = H - margin;
  const draw = (line: string) => {
    if (y < margin) { page = pdf.addPage([W, H]); y = H - margin; }
    if (line) page.drawText(line, { x: margin, y, size, font, color: rgb(0, 0, 0) });
    y -= lh;
  };
  for (const para of safe.split("\n")) {
    if (!para.trim()) { draw(""); continue; }
    let line = "";
    for (const word of para.split(" ")) {
      const t = line ? `${line} ${word}` : word;
      if (line && font.widthOfTextAtSize(t, size) > maxW) { draw(line); line = word; }
      else line = t;
    }
    draw(line);
  }
  return new Blob([(await pdf.save()) as BlobPart], { type: "application/pdf" });
}

async function htmlToCanvas(html: string): Promise<HTMLCanvasElement> {
  const width = 800;
  const style = `width:${width}px;padding:40px;box-sizing:border-box;font:16px/1.6 Inter,Arial,sans-serif;color:#0f172a;background:#fff`;
  const host = document.createElement("div");
  host.style.cssText = `position:fixed;left:-99999px;top:0;${style}`;
  host.innerHTML = html;
  document.body.appendChild(host);
  const height = Math.min(host.scrollHeight, 16000);
  host.style.cssText = style;
  const xhtml = new XMLSerializer().serializeToString(host);
  document.body.removeChild(host);

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><foreignObject width="100%" height="100%">${xhtml}</foreignObject></svg>`;
  const img = await new Promise<HTMLImageElement>((res, rej) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = () => rej(new Error("Could not render this document as an image."));
    i.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  });
  const canvas = document.createElement("canvas");
  canvas.width = width * 2;
  canvas.height = height * 2;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.scale(2, 2);
  ctx.drawImage(img, 0, 0);
  return canvas;
}

async function loadPdfjs() {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.js",
    import.meta.url
  ).toString();
  return pdfjs;
}

async function convertPdf(file: File, target: string, quality: number, onProgress: (p: number) => void): Promise<DocResult> {
  const pdfjs = await loadPdfjs();
  const pdf = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
  onProgress(15);

  if (target === "txt") {
    const pages: string[] = [];
    for (let n = 1; n <= pdf.numPages; n++) {
      const content = await (await pdf.getPage(n)).getTextContent();
      pages.push(content.items.map((it: any) => ("str" in it ? it.str : "")).join(" "));
      onProgress(15 + Math.round((n / pdf.numPages) * 80));
    }
    return { blob: new Blob([pages.join("\n\n")], { type: "text/plain" }) };
  }

  const mime = target === "png" ? "image/png" : "image/jpeg";
  const blobs: Blob[] = [];
  for (let n = 1; n <= pdf.numPages; n++) {
    const page = await pdf.getPage(n);
    const viewport = page.getViewport({ scale: 2 });
    const canvas = document.createElement("canvas");
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvasContext: ctx, viewport }).promise;
    blobs.push(await canvasToBlob(canvas, mime, quality));
    onProgress(15 + Math.round((n / pdf.numPages) * 80));
  }
  if (blobs.length === 1) return { blob: blobs[0] };
  const JSZip = (await import("jszip")).default;
  const zip = new JSZip();
  blobs.forEach((b, i) => zip.file(`page-${i + 1}.${target}`, b));
  return { blob: await zip.generateAsync({ type: "blob" }), ext: "zip" };
}

export async function convertDocument(
  file: File, ext: string, target: string, quality: number, onProgress: (p: number) => void
): Promise<DocResult> {
  onProgress(5);
  if (ext === "pdf") return convertPdf(file, target, quality, onProgress);

  const html = await toHtml(file, ext);
  onProgress(40);
  let out: DocResult;
  switch (target) {
    case "html":
      out = { blob: new Blob([wrapHtml(html, file.name)], { type: "text/html" }) };
      break;
    case "txt":
      out = { blob: new Blob([htmlToText(html)], { type: "text/plain" }) };
      break;
    case "pdf":
      out = { blob: await textToPdf(ext === "txt" ? await file.text() : htmlToText(html)) };
      break;
    case "png":
    case "jpg": {
      const canvas = await htmlToCanvas(html);
      out = { blob: await canvasToBlob(canvas, target === "png" ? "image/png" : "image/jpeg", quality) };
      break;
    }
    default:
      throw new Error(`Unsupported target: ${target}`);
  }
  onProgress(100);
  return out;
}
