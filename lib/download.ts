import JSZip from "jszip";

export function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function downloadZip(
  files: { name: string; blob: Blob }[],
  zipName = "fileshit-converted.zip",
  onProgress?: (percent: number) => void
) {
  const zip = new JSZip();
  const used = new Map<string, number>();
  for (const f of files) {
    let name = f.name;
    const n = used.get(name) ?? 0;
    used.set(name, n + 1);
    if (n > 0) {
      const dot = name.lastIndexOf(".");
      name = dot === -1 ? `${name} (${n})` : `${name.slice(0, dot)} (${n})${name.slice(dot)}`;
    }
    zip.file(name, f.blob);
  }
  downloadBlob(await zip.generateAsync({ type: "blob" }, (m) => onProgress?.(Math.round(m.percent))), zipName);
}
