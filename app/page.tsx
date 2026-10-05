"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { ArrowRightLeft, Download, Loader2, ShieldCheck, Sparkles, UploadCloud } from "lucide-react";
import { Button } from "@/components/ui/button";
import QueueItem from "@/components/QueueItem";
import RobotPet, { type Mood } from "@/components/RobotPet";
import { PRESETS, applyPreset, baseName, createItem, type Item } from "@/lib/formats";
import { convertFile } from "@/lib/convert";
import { downloadZip } from "@/lib/download";

type Enhance = 0 | 2 | 4;
interface Outcome { mood: Mood; headline: string }

export default function Home() {
  const [items, setItems] = useState<Item[]>([]);
  const [activePreset, setActivePreset] = useState<string | null>(null);
  const [enhance, setEnhance] = useState<Enhance>(0);
  const [busy, setBusy] = useState(false);
  const [packaging, setPackaging] = useState<number | null>(null);
  const [outcome, setOutcome] = useState<Outcome | null>(null);

  const patch = useCallback((id: string, p: Partial<Item>) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...p } : i)));
  }, []);

  const onDrop = useCallback(
    (files: File[]) => {
      const preset = PRESETS.find((p) => p.id === activePreset);
      setOutcome(null);
      setItems((prev) => [...prev, ...files.map((f) => createItem(f, preset, enhance))]);
    },
    [activePreset, enhance]
  );
  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop });

  function togglePreset(id: string) {
    const preset = PRESETS.find((p) => p.id === id);
    if (!preset) return;
    if (activePreset === id) return setActivePreset(null);
    setActivePreset(id);
    setItems((prev) => prev.map((it) => (it.status === "converting" ? it : applyPreset(it, preset))));
  }

  function changeEnhance(v: Enhance) {
    setEnhance(v);
    setItems((prev) =>
      prev.map((it) =>
        it.category === "image" && it.status !== "converting"
          ? { ...it, enhance: v, status: "pending", progress: 0, result: undefined, error: undefined, step: undefined, eta: null }
          : it
      )
    );
  }

  const convertOne = useCallback(
    async (item: Item): Promise<boolean> => {
      if (!item.target) return false;
      const startedAt = Date.now();
      patch(item.id, { status: "converting", progress: 0, step: "Starting...", eta: null, error: undefined, result: undefined, note: undefined });
      try {
        const out = await convertFile(item, (p, step) => {
          const elapsed = (Date.now() - startedAt) / 1000;
          const eta = p >= 8 && p < 100 && elapsed > 1.5 ? Math.max(1, Math.round((elapsed * (100 - p)) / p)) : null;
          patch(item.id, { progress: p, step: step ?? "Converting...", eta });
        });
        if (out.files) {
          setItems((prev) => [...prev, ...out.files!.map((f) => createItem(f, undefined, enhance))]);
          patch(item.id, { status: "done", progress: 100, eta: null, step: "Done", note: `${out.files.length} files added to the queue` });
        } else if (out.blob) {
          patch(item.id, {
            status: "done",
            progress: 100,
            eta: null,
            step: "Done",
            result: { blob: out.blob, name: `${baseName(item.file.name)}.${out.ext ?? item.target}` },
          });
        }
        return true;
      } catch (e) {
        patch(item.id, { status: "error", progress: 0, eta: null, error: e instanceof Error ? e.message : "Conversion failed." });
        return false;
      }
    },
    [patch, enhance]
  );

  async function run(list: Item[]) {
    setBusy(true);
    setOutcome(null);
    let ok = 0;
    let fail = 0;
    for (const it of list) (await convertOne(it)) ? ok++ : fail++;
    setBusy(false);
    setOutcome(
      fail > 0
        ? { mood: "error", headline: `${fail} file gagal. Teks merah di bawah tiap file menjelaskan sebabnya.` }
        : { mood: "happy", headline: `Beres! ${ok} file selesai dikonversi. Nol byte di-upload.` }
    );
  }

  async function zipAll() {
    setPackaging(0);
    try {
      await downloadZip(
        done.map((i) => ({ name: i.result!.name, blob: i.result!.blob })),
        "fileshit-converted.zip",
        (p) => setPackaging(p)
      );
      setOutcome({ mood: "happy", headline: "ZIP selesai dibuat dan diunduh." });
    } catch {
      setOutcome({ mood: "error", headline: "Gagal membuat ZIP." });
    } finally {
      setPackaging(null);
    }
  }

  const done = items.filter((i) => i.result);
  const runnable = items.filter((i) => i.target && (i.status === "pending" || i.status === "error"));
  const mood: Mood = busy || packaging !== null ? "working" : outcome?.mood ?? "idle";

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 border-b border-line bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 text-white">
              <ArrowRightLeft className="h-4 w-4" />
            </div>
            <span className="text-base font-semibold tracking-tight">FileShit</span>
          </div>
          <div className="flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
            <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
            <span className="hidden sm:inline">100% Local Processing • No Files Uploaded To Servers</span>
            <span className="sm:hidden">100% Local</span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 pb-40">
        <section className="py-14 text-center sm:py-20">
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
            Convert any file, instantly in your browser.
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-base text-slate-500">
            Free, unlimited and private. Your files stay on your device, so there is no upload, no waiting and no size limit.
          </p>
        </section>

        <section className="mb-5 flex flex-wrap justify-center gap-2">
          {PRESETS.map((p) => (
            <button
              key={p.id}
              onClick={() => togglePreset(p.id)}
              className={[
                "rounded-full border px-3.5 py-1.5 text-sm transition-colors",
                activePreset === p.id ? "border-slate-900 bg-slate-900 text-white" : "border-line bg-white text-slate-700 hover:bg-slate-50",
              ].join(" ")}
            >
              {p.label}
            </button>
          ))}
        </section>

        <section className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-white px-4 py-3 shadow-sm">
          <div className="flex items-start gap-2.5">
            <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
            <div>
              <p className="text-sm font-medium">AI Enhance &amp; Upscale</p>
              <p className="text-xs text-slate-500">
                Sharpens and enlarges images on your device. Best for small or blurry photos. The first run downloads the AI model.
              </p>
            </div>
          </div>
          <div className="inline-flex rounded-lg border border-line bg-white p-0.5" role="group" aria-label="AI Enhance and Upscale">
            {([0, 2, 4] as Enhance[]).map((v) => (
              <button
                key={v}
                onClick={() => changeEnhance(v)}
                className={[
                  "rounded-md px-3.5 py-1 text-sm transition-colors",
                  enhance === v ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-50",
                ].join(" ")}
              >
                {v === 0 ? "Off" : `${v}x`}
              </button>
            ))}
          </div>
        </section>

        <section
          {...getRootProps()}
          className={[
            "cursor-pointer rounded-2xl border-2 border-dashed bg-white px-6 py-14 text-center shadow-sm transition-colors",
            isDragActive ? "border-slate-900 bg-slate-50" : "border-line hover:border-slate-400",
          ].join(" ")}
        >
          <input {...getInputProps()} />
          <UploadCloud className="mx-auto h-9 w-9 text-slate-400" />
          <p className="mt-3 text-base font-medium">{isDragActive ? "Drop files here" : "Drag and drop files here"}</p>
          <p className="mt-1 text-sm text-slate-500">or click to browse. Images, audio, video, documents and ZIP files.</p>
        </section>

        {items.length > 0 && (
          <section className="mt-8 overflow-hidden rounded-2xl border border-line bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3">
              <p className="text-sm text-slate-600">
                {items.length} file{items.length > 1 ? "s" : ""}, {done.length} converted
                {packaging !== null && <span className="ml-2 text-slate-500">Packaging ZIP... {packaging}%</span>}
              </p>
              <div className="flex gap-2">
                <Button onClick={() => run(runnable)} disabled={busy || packaging !== null || runnable.length === 0}>
                  {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                  Convert All
                </Button>
                <Button variant="outline" disabled={done.length === 0 || packaging !== null || busy} onClick={zipAll}>
                  {packaging !== null ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                  Download All as ZIP
                </Button>
              </div>
            </div>

            {items.map((it) => (
              <QueueItem
                key={it.id}
                item={it}
                busy={busy || packaging !== null}
                onTarget={(v) => patch(it.id, { target: v, status: "pending", progress: 0, result: undefined, error: undefined, note: undefined, step: undefined, eta: null })}
                onEnhance={(v) => patch(it.id, { enhance: v, status: "pending", progress: 0, result: undefined, error: undefined, step: undefined, eta: null })}
                onConvert={() => run([it])}
                onRemove={() => setItems((prev) => prev.filter((x) => x.id !== it.id))}
              />
            ))}
          </section>
        )}
      </main>

      <footer className="border-t border-line bg-white py-6 pb-28 text-center text-sm text-slate-500">
        FileShit runs entirely on your device.
      </footer>

      <RobotPet mood={mood} headline={outcome?.headline} />
    </div>
  );
}
