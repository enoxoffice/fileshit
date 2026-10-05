import type { Item } from "./formats";
import { convertImage } from "./image";
import { convertMedia } from "./media";
import { convertDocument } from "./docs";

export interface ConvertOutput {
  blob?: Blob;
  ext?: string;
  files?: File[];
}

async function extractZip(file: File): Promise<File[]> {
  const JSZip = (await import("jszip")).default;
  const zip = await JSZip.loadAsync(file);
  const out: File[] = [];
  for (const entry of Object.values(zip.files)) {
    if (entry.dir || entry.name.startsWith("__MACOSX") || entry.name.endsWith(".DS_Store")) continue;
    const name = entry.name.split("/").pop() || entry.name;
    out.push(new File([await entry.async("blob")], name));
  }
  return out;
}

export async function convertFile(item: Item, onProgress: (p: number, step?: string) => void): Promise<ConvertOutput> {
  const { file, ext, target, quality } = item;
  if (!target) throw new Error("This file type is not supported.");
  switch (item.category) {
    case "image":
      return { blob: await convertImage(file, ext, target, quality, item.enhance, onProgress) };
    case "audio":
    case "video":
      return { blob: await convertMedia(file, ext, target, onProgress) };
    case "document":
      return convertDocument(file, ext, target, quality, onProgress);
    case "archive": {
      onProgress(20, "Extracting ZIP...");
      const files = await extractZip(file);
      onProgress(100);
      return { files };
    }
    default:
      throw new Error("This file type is not supported.");
  }
}
