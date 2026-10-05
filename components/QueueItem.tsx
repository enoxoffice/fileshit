"use client";

import { AlertCircle, CheckCircle2, Download, Loader2, Play, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { downloadBlob } from "@/lib/download";
import { formatBytes, formatEta, targetsFor, type Item } from "@/lib/formats";

const selectCls =
  "h-8 rounded-md border border-line bg-white px-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300 disabled:opacity-50";

function StatusPill({ status }: { status: Item["status"] }) {
  const base = "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium";
  if (status === "converting")
    return <span className={`${base} border-blue-200 bg-blue-50 text-blue-700`}><Loader2 className="h-3 w-3 animate-spin" />Converting</span>;
  if (status === "done")
    return <span className={`${base} border-emerald-200 bg-emerald-50 text-emerald-700`}><CheckCircle2 className="h-3 w-3" />Done</span>;
  if (status === "error")
    return <span className={`${base} border-red-200 bg-red-50 text-red-700`}><AlertCircle className="h-3 w-3" />Error</span>;
  return <span className={`${base} border-line bg-white text-slate-600`}>Pending</span>;
}

interface Props {
  item: Item;
  busy: boolean;
  onTarget: (v: string) => void;
  onEnhance: (v: 0 | 2 | 4) => void;
  onConvert: () => void;
  onRemove: () => void;
}

export default function QueueItem({ item, busy, onTarget, onEnhance, onConvert, onRemove }: Props) {
  const targets = targetsFor(item.category, item.ext);
  const converting = item.status === "converting";
  const pct = Math.round(item.progress);

  let stepText = "Waiting";
  if (converting) stepText = item.step ?? "Converting...";
  else if (item.status === "done") stepText = item.note ?? "Finished";
  else if (item.status === "error") stepText = item.error ?? "Conversion failed.";

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-3 border-b border-line px-4 py-3.5 last:border-0">
      <div className="min-w-0 grow basis-52">
        <p className="truncate text-sm font-medium" title={item.file.name}>{item.file.name}</p>
        <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
          <span>{formatBytes(item.file.size)}</span>
          <Badge>{item.ext || "?"}</Badge>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {targets.length ? (
          <select value={item.target ?? ""} disabled={converting} onChange={(e) => onTarget(e.target.value)} className={selectCls} aria-label="Convert to">
            {targets.map((t) => (
              <option key={t} value={t}>{t === "extract" ? "Extract files" : t}</option>
            ))}
          </select>
        ) : (
          <span className="text-sm text-slate-400">Not supported</span>
        )}
        {item.category === "image" && (
          <select value={item.enhance} disabled={converting} onChange={(e) => onEnhance(Number(e.target.value) as 0 | 2 | 4)} className={selectCls} aria-label="AI Enhance and Upscale">
            <option value={0}>AI: Off</option>
            <option value={2}>AI: 2x</option>
            <option value={4}>AI: 4x</option>
          </select>
        )}
      </div>

      <div className="min-w-[200px] grow basis-56">
        <div className="flex items-center justify-between gap-2 text-xs">
          <span className={["truncate", item.status === "error" ? "text-red-600" : "text-slate-500"].join(" ")} title={stepText}>
            {stepText}
          </span>
          <span className="font-medium tabular-nums text-slate-700">{pct}%</span>
        </div>
        <Progress value={item.progress} className="mt-1" />
        {converting && (
          <p className="mt-1 text-xs text-slate-500">
            {item.eta != null ? `Estimated time: ${formatEta(item.eta)} remaining` : "Estimating time..."}
          </p>
        )}
      </div>

      <StatusPill status={item.status} />

      <div className="flex gap-1">
        <Button size="icon" variant="ghost" aria-label="Convert this file" disabled={busy || !item.target || item.status === "done"} onClick={onConvert}>
          <Play className="h-4 w-4" />
        </Button>
        <Button size="icon" variant="ghost" aria-label="Download" disabled={!item.result} onClick={() => item.result && downloadBlob(item.result.blob, item.result.name)}>
          <Download className="h-4 w-4" />
        </Button>
        <Button size="icon" variant="ghost" aria-label="Remove" disabled={converting} onClick={onRemove}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
