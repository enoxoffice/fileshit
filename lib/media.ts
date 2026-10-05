import type { FFmpeg } from "@ffmpeg/ffmpeg";

let ffmpegPromise: Promise<FFmpeg> | null = null;

async function getFFmpeg(): Promise<FFmpeg> {
  if (!ffmpegPromise) {
    ffmpegPromise = (async () => {
      const { FFmpeg } = await import("@ffmpeg/ffmpeg");
      const { toBlobURL } = await import("@ffmpeg/util");
      const ff = new FFmpeg();
      const base = "https://unpkg.com/@ffmpeg/core@0.12.10/dist/umd";
      await ff.load({
        coreURL: await toBlobURL(`${base}/ffmpeg-core.js`, "text/javascript"),
        wasmURL: await toBlobURL(`${base}/ffmpeg-core.wasm`, "application/wasm"),
      });
      return ff;
    })().catch((e) => {
      ffmpegPromise = null;
      throw new Error("Could not load the media engine. Check your internet connection and try again.");
    });
  }
  return ffmpegPromise;
}

const ARGS: Record<string, string[]> = {
  mp3: ["-vn", "-c:a", "libmp3lame", "-q:a", "2"],
  wav: ["-vn", "-c:a", "pcm_s16le"],
  aac: ["-vn", "-c:a", "aac", "-b:a", "192k"],
  ogg: ["-vn", "-c:a", "libvorbis", "-q:a", "5"],
  mp4: ["-c:v", "libx264", "-preset", "ultrafast", "-crf", "28", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "128k"],
  webm: ["-c:v", "libvpx", "-deadline", "realtime", "-cpu-used", "5", "-crf", "32", "-b:v", "1M", "-c:a", "libvorbis"],
  gif: ["-an", "-vf", "fps=12,scale=480:-1:flags=lanczos", "-loop", "0"],
};

const MIME: Record<string, string> = {
  mp3: "audio/mpeg", wav: "audio/wav", aac: "audio/aac", ogg: "audio/ogg",
  mp4: "video/mp4", webm: "video/webm", gif: "image/gif",
};

export async function convertMedia(
  file: File, ext: string, target: string, onProgress: (p: number, step?: string) => void
): Promise<Blob> {
  onProgress(2, "Loading media engine...");
  const ff = await getFFmpeg();
  const { fetchFile } = await import("@ffmpeg/util");
  const inName = `input.${ext || "bin"}`;
  const outName = `output.${target}`;
  const onProg = ({ progress }: { progress: number }) =>
    onProgress(Math.min(99, Math.max(5, Math.round(progress * 100))), "Converting...");

  ff.on("progress", onProg);
  try {
    await ff.writeFile(inName, await fetchFile(file));
    const code = await ff.exec(["-i", inName, ...ARGS[target], outName]);
    if (code !== 0) throw new Error("This file could not be converted. It may be corrupt or use an unsupported codec.");
    const data = await ff.readFile(outName);
    onProgress(100);
    return new Blob([data as BlobPart], { type: MIME[target] });
  } finally {
    ff.off("progress", onProg);
    await ff.deleteFile(inName).catch(() => {});
    await ff.deleteFile(outName).catch(() => {});
  }
}
