export type Category = "image" | "audio" | "video" | "document" | "archive" | "unknown";
export type Status = "pending" | "converting" | "done" | "error";

export interface Preset {
  id: string;
  label: string;
  to: string;
  from?: string[];
  categories?: Category[];
}

export interface Item {
  id: string;
  file: File;
  ext: string;
  category: Category;
  target: string | null;
  quality: number;
  progress: number;
  status: Status;
  error?: string;
  note?: string;
  enhance: 0 | 2 | 4;
  step?: string;
  eta?: number | null;
  result?: { blob: Blob; name: string };
}

const EXT: Record<Exclude<Category, "unknown">, string[]> = {
  image: ["heic", "heif", "png", "jpg", "jpeg", "webp", "bmp", "tiff", "tif", "svg", "gif"],
  audio: ["mp3", "wav", "aac", "ogg", "flac", "m4a"],
  video: ["mp4", "mov", "avi", "mkv"],
  document: ["pdf", "docx", "txt", "md", "html"],
  archive: ["zip"],
};

const IMAGE_OUT = ["jpg", "png", "webp", "bmp", "ico", "pdf"];
const AUDIO_OUT = ["mp3", "wav", "aac", "ogg"];
const VIDEO_OUT = ["mp4", "webm", "gif", "mp3"];
const DOC_OUT: Record<string, string[]> = {
  pdf: ["txt", "png", "jpg"],
  docx: ["pdf", "txt", "html", "png", "jpg"],
  txt: ["pdf", "html", "png", "jpg"],
  md: ["pdf", "txt", "html", "png", "jpg"],
  html: ["pdf", "txt", "png", "jpg"],
};

export const PRESETS: Preset[] = [
  { id: "heic-jpg", label: "HEIC to JPG", from: ["heic", "heif"], to: "jpg" },
  { id: "video-mp3", label: "Video to MP3", categories: ["video"], to: "mp3" },
  { id: "compress", label: "Compress Image", categories: ["image"], to: "webp" },
  { id: "png-webp", label: "PNG to WEBP", from: ["png"], to: "webp" },
  { id: "img-pdf", label: "Image to PDF", categories: ["image"], to: "pdf" },
  { id: "video-gif", label: "Video to GIF", categories: ["video"], to: "gif" },
  { id: "pdf-jpg", label: "PDF to JPG", from: ["pdf"], to: "jpg" },
  { id: "docx-pdf", label: "Word to PDF", from: ["docx"], to: "pdf" },
];

export function getExt(name: string) {
  const i = name.lastIndexOf(".");
  return i === -1 ? "" : name.slice(i + 1).toLowerCase();
}

export function baseName(name: string) {
  const i = name.lastIndexOf(".");
  return i === -1 ? name : name.slice(0, i);
}

export function detectCategory(ext: string, mime = ""): Category {
  if (ext === "webm") return mime.startsWith("audio") ? "audio" : "video";
  for (const [cat, list] of Object.entries(EXT)) {
    if (list.includes(ext)) return cat as Category;
  }
  return "unknown";
}

export function targetsFor(category: Category, ext: string): string[] {
  switch (category) {
    case "image": return IMAGE_OUT;
    case "audio": return AUDIO_OUT;
    case "video": return VIDEO_OUT;
    case "document": return DOC_OUT[ext] ?? [];
    case "archive": return ["extract"];
    default: return [];
  }
}

function normalize(ext: string) {
  if (ext === "jpeg") return "jpg";
  if (ext === "tif") return "tiff";
  if (ext === "heif") return "heic";
  return ext;
}

export function applyPreset(item: Item, preset: Preset): Item {
  const targets = targetsFor(item.category, item.ext);
  if (!targets.includes(preset.to)) return item;
  if (preset.from && !preset.from.includes(item.ext)) return item;
  if (preset.categories && !preset.categories.includes(item.category)) return item;
  return {
    ...item,
    target: preset.to,
    quality: preset.id === "compress" ? 0.7 : 0.92,
    status: "pending",
    progress: 0,
    result: undefined,
    error: undefined,
    note: undefined,
    step: undefined,
    eta: null,
  };
}

export function createItem(file: File, preset?: Preset, enhance: 0 | 2 | 4 = 0): Item {
  const ext = getExt(file.name);
  const category = detectCategory(ext, file.type);
  const targets = targetsFor(category, ext);
  const item: Item = {
    id: crypto.randomUUID(),
    file,
    ext,
    category,
    target: targets.find((t) => t !== normalize(ext)) ?? targets[0] ?? null,
    quality: 0.92,
    enhance: category === "image" ? enhance : 0,
    progress: 0,
    status: "pending",
  };
  return preset ? applyPreset(item, preset) : item;
}

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
}

export function formatEta(sec: number) {
  if (sec < 60) return `${sec} second${sec === 1 ? "" : "s"}`;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m} min${s ? ` ${s} sec` : ""}`;
}
