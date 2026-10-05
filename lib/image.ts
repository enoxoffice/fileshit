function loadImageUrl(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("This browser cannot read this image format."));
    img.src = url;
  });
}

async function loadImage(blob: Blob): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(blob);
  try { return await loadImageUrl(url); } finally { URL.revokeObjectURL(url); }
}

export function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality?: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Encoding failed."))), type, quality);
  });
}

function encodeBMP(img: ImageData): Blob {
  const { width, height, data } = img;
  const rowSize = Math.ceil((width * 3) / 4) * 4;
  const pixelSize = rowSize * height;
  const buffer = new ArrayBuffer(54 + pixelSize);
  const v = new DataView(buffer);
  v.setUint8(0, 0x42); v.setUint8(1, 0x4d);
  v.setUint32(2, 54 + pixelSize, true);
  v.setUint32(10, 54, true);
  v.setUint32(14, 40, true);
  v.setInt32(18, width, true);
  v.setInt32(22, height, true);
  v.setUint16(26, 1, true);
  v.setUint16(28, 24, true);
  v.setUint32(34, pixelSize, true);
  let o = 54;
  for (let y = height - 1; y >= 0; y--) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      v.setUint8(o++, data[i + 2]); v.setUint8(o++, data[i + 1]); v.setUint8(o++, data[i]);
    }
    o += rowSize - width * 3;
  }
  return new Blob([buffer], { type: "image/bmp" });
}

async function encodeICO(canvas: HTMLCanvasElement): Promise<Blob> {
  const png = new Uint8Array(await (await canvasToBlob(canvas, "image/png")).arrayBuffer());
  const buffer = new ArrayBuffer(22 + png.length);
  const v = new DataView(buffer);
  v.setUint16(2, 1, true);
  v.setUint16(4, 1, true);
  v.setUint8(6, canvas.width >= 256 ? 0 : canvas.width);
  v.setUint8(7, canvas.height >= 256 ? 0 : canvas.height);
  v.setUint16(10, 1, true);
  v.setUint16(12, 32, true);
  v.setUint32(14, png.length, true);
  v.setUint32(18, 22, true);
  new Uint8Array(buffer, 22).set(png);
  return new Blob([buffer], { type: "image/x-icon" });
}

export async function canvasToPdf(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  const { PDFDocument } = await import("pdf-lib");
  const jpg = new Uint8Array(await (await canvasToBlob(canvas, "image/jpeg", quality)).arrayBuffer());
  const pdf = await PDFDocument.create();
  const emb = await pdf.embedJpg(jpg);
  const page = pdf.addPage([canvas.width, canvas.height]);
  page.drawImage(emb, { x: 0, y: 0, width: canvas.width, height: canvas.height });
  return new Blob([(await pdf.save()) as BlobPart], { type: "application/pdf" });
}

export type ProgressFn = (p: number, step?: string) => void;

let upscalerPromise: Promise<any> | null = null;

async function getUpscaler() {
  if (!upscalerPromise) {
    upscalerPromise = (async () => {
      await import("@tensorflow/tfjs");
      const Upscaler = (await import("upscaler")).default;
      const model = (await import("@upscalerjs/default-model")).default;
      return new Upscaler({ model });
    })().catch(() => {
      upscalerPromise = null;
      throw new Error("Could not load the AI model. Check your internet connection and try again.");
    });
  }
  return upscalerPromise;
}

// 2x = one pass, 4x = two passes. Input is capped so the output stays within what a browser can handle.
async function aiUpscale(img: HTMLImageElement, factor: 2 | 4, onProgress: ProgressFn): Promise<HTMLImageElement> {
  onProgress(10, "Loading AI model (first time takes longer)...");
  const upscaler = await getUpscaler();
  const passes = factor === 4 ? 2 : 1;
  const maxSide = factor === 4 ? 640 : 1280;
  const w = img.naturalWidth || 1024;
  const h = img.naturalHeight || 1024;
  const s = Math.min(1, maxSide / Math.max(w, h));
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(w * s));
  c.height = Math.max(1, Math.round(h * s));
  c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
  let src: string = c.toDataURL("image/png");
  for (let i = 0; i < passes; i++) {
    const step = passes > 1 ? `Processing AI upscale (pass ${i + 1} of ${passes})...` : "Processing AI upscale...";
    src = await upscaler.upscale(src, {
      patchSize: 64,
      padding: 2,
      progress: (amount: number) => onProgress(20 + Math.round(((i + amount) / passes) * 65), step),
    });
  }
  return loadImageUrl(src);
}

export async function convertImage(
  file: File, ext: string, target: string, quality: number, enhance: 0 | 2 | 4, onProgress: ProgressFn
): Promise<Blob> {
  onProgress(3, "Reading file...");
  let source: Blob = file;
  if (ext === "heic" || ext === "heif") {
    onProgress(5, "Decoding HEIC...");
    const heic2any = (await import("heic2any")).default;
    const out = await heic2any({ blob: file, toType: "image/png" });
    source = Array.isArray(out) ? out[0] : out;
  } else if (ext === "svg") {
    source = new Blob([file], { type: "image/svg+xml" });
  }
  onProgress(8, "Decoding image...");
  let img = await loadImage(source);
  if (enhance) img = await aiUpscale(img, enhance, onProgress);

  onProgress(88, `Encoding ${target.toUpperCase()}...`);
  let w = img.naturalWidth || 1024;
  let h = img.naturalHeight || 1024;
  if (target === "ico" && Math.max(w, h) > 256) {
    const s = 256 / Math.max(w, h);
    w = Math.max(1, Math.round(w * s));
    h = Math.max(1, Math.round(h * s));
  }
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is not supported.");
  if (["jpg", "bmp", "pdf"].includes(target)) {
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, w, h);
  }
  ctx.drawImage(img, 0, 0, w, h);

  let result: Blob;
  switch (target) {
    case "jpg": result = await canvasToBlob(canvas, "image/jpeg", quality); break;
    case "png": result = await canvasToBlob(canvas, "image/png"); break;
    case "webp": result = await canvasToBlob(canvas, "image/webp", quality); break;
    case "bmp": result = encodeBMP(ctx.getImageData(0, 0, w, h)); break;
    case "ico": result = await encodeICO(canvas); break;
    case "pdf": result = await canvasToPdf(canvas, quality); break;
    default: throw new Error(`Unsupported target: ${target}`);
  }
  onProgress(100, "Done");
  return result;
}
