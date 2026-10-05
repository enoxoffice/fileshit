"use client";

import { useEffect, useRef, useState } from "react";
import { Send, Sparkles, X } from "lucide-react";
import { IDLE, TIPS, knownReply, pick, reply } from "@/lib/botBrain";

export type Mood = "idle" | "working" | "happy" | "error";
type Face = Mood | "sleepy" | "curious" | "talk" | "love";
type Micro = "wink" | "lookL" | "lookR" | null;

const GREEN = "#5EE04B";
const COLOR: Record<Face, string> = {
  idle: GREEN, working: GREEN, happy: GREEN, sleepy: GREEN, curious: GREEN, talk: GREEN,
  error: "#FF5C5C", love: "#FF7AB6",
};

function Smile({ c, wide }: { c: string; wide?: boolean }) {
  return wide ? (
    <>
      <rect x="53" y="49" width="3" height="4" fill={c} />
      <rect x="56" y="53" width="11" height="3" fill={c} />
      <rect x="67" y="49" width="3" height="4" fill={c} />
    </>
  ) : (
    <>
      <rect x="56" y="50" width="3" height="3" fill={c} />
      <rect x="59" y="53" width="5" height="3" fill={c} />
      <rect x="64" y="50" width="3" height="3" fill={c} />
    </>
  );
}

function Heart({ x, c }: { x: number; c: string }) {
  return (
    <path
      d="M6 11 L0.8 5.6 C-1.5 2.4 2.5 -0.8 6 2.6 C9.5 -0.8 13.5 2.4 11.2 5.6 Z"
      transform={`translate(${x} 31)`}
      fill={c}
    />
  );
}

function Sparkle({ x, y, c }: { x: number; y: number; c: string }) {
  return (
    <g className="bot-twinkle">
      <rect x={x - 1} y={y - 4} width="2" height="8" fill={c} />
      <rect x={x - 4} y={y - 1} width="8" height="2" fill={c} />
    </g>
  );
}

function Expression({ face, micro, c }: { face: Face; micro: Micro; c: string }) {
  switch (face) {
    case "working":
      return (
        <>
          <g className="bot-look">
            <rect x="47" y="35" width="7" height="7" fill={c} />
            <rect x="69" y="35" width="7" height="7" fill={c} />
          </g>
          {[52, 60, 68].map((x, i) => (
            <rect key={x} x={x} y="51" width="4" height="4" fill={c} className="bot-dot" style={{ animationDelay: `${i * 0.2}s` }} />
          ))}
        </>
      );
    case "happy":
      return (
        <>
          <path d="M44 42 L50 34 L56 42" stroke={c} strokeWidth="4" fill="none" strokeLinecap="square" />
          <path d="M66 42 L72 34 L78 42" stroke={c} strokeWidth="4" fill="none" strokeLinecap="square" />
          <path d="M50 47 H73 A11.5 11 0 0 1 50 47 Z" fill={c} />
          <Sparkle x={84} y={26} c={c} />
          <Sparkle x={38} y={58} c={c} />
        </>
      );
    case "love":
      return (
        <>
          <Heart x={44} c={c} />
          <Heart x={66} c={c} />
          <Smile c={c} wide />
          <Sparkle x={84} y={26} c={c} />
        </>
      );
    case "error":
      return (
        <>
          <path d="M45 33 L56 44 M56 33 L45 44" stroke={c} strokeWidth="4" strokeLinecap="square" />
          <path d="M67 33 L78 44 M78 33 L67 44" stroke={c} strokeWidth="4" strokeLinecap="square" />
          <path d="M52 56 L57 51 L62 56 L67 51 L71 55" stroke={c} strokeWidth="3" fill="none" strokeLinecap="square" />
          <rect x="30" y="24" width="62" height="3" fill={c} opacity="0.25" className="bot-glitch" />
        </>
      );
    case "sleepy":
      return (
        <>
          <rect x="45" y="40" width="11" height="3" fill={c} />
          <rect x="67" y="40" width="11" height="3" fill={c} />
          <rect x="57" y="51" width="9" height="3" fill={c} />
          <text x="78" y="32" fontSize="10" fontWeight="700" fill={c} className="bot-zzz">z</text>
          <text x="83" y="24" fontSize="13" fontWeight="700" fill={c} className="bot-zzz" style={{ animationDelay: "0.6s" }}>Z</text>
        </>
      );
    case "curious":
      return (
        <>
          <rect x="46" y="25" width="9" height="3" fill={c} />
          <rect x="68" y="21" width="9" height="3" fill={c} />
          <rect x="48" y="30" width="5" height="19" fill={c} />
          <rect x="70" y="30" width="5" height="19" fill={c} />
          <rect x="58" y="51" width="7" height="7" fill="none" stroke={c} strokeWidth="3" />
        </>
      );
    case "talk":
      return (
        <>
          <rect x="48" y="31" width="5" height="14" fill={c} className="bot-eye" />
          <rect x="70" y="31" width="5" height="14" fill={c} className="bot-eye" />
          <rect x="55" y="48" width="13" height="8" fill={c} className="bot-mouth" />
        </>
      );
    default: {
      const shift = micro === "lookL" ? -5 : micro === "lookR" ? 5 : 0;
      return (
        <g transform={`translate(${shift} 0)`}>
          {micro === "wink" ? (
            <rect x="46" y="40" width="10" height="4" fill={c} />
          ) : (
            <rect x="48" y="31" width="5" height="14" fill={c} className="bot-eye" />
          )}
          <rect x="70" y="31" width="5" height="14" fill={c} className="bot-eye" />
          <Smile c={c} wide={micro === "wink"} />
        </g>
      );
    }
  }
}

function Monitor({ face, micro }: { face: Face; micro: Micro }) {
  const c = COLOR[face];
  const ink = "#2A1F2D";
  const lit = face !== "idle" && face !== "sleepy";
  return (
    <svg viewBox="0 0 108 108" width="96" height="96" className={`bot bot-${face}`} shapeRendering="crispEdges" aria-hidden="true">
      <path d="M24 38 C10 38 12 56 16 61 C21 68 8 74 10 88 C11 96 20 97 27 94" stroke="#262626" strokeWidth="5" fill="none" strokeLinecap="round" />
      <rect x="46" y="72" width="30" height="9" fill="#C9A678" stroke={ink} strokeWidth="2" />
      <rect x="26" y="80" width="70" height="22" rx="4" fill="#EBCFA7" stroke={ink} strokeWidth="3" />
      <rect x="29" y="97" width="64" height="3" fill="#C9A678" />
      <rect x="34" y="88" width="26" height="5" fill="#2A2A2A" />
      {[66, 72, 78].map((x) => <rect key={x} x={x - 4} y="90" width="2" height="2" fill="#8B7355" />)}
      <rect x="82" y="86" width="9" height="9" fill={c} stroke={ink} strokeWidth="2" />
      <rect x="22" y="6" width="78" height="66" rx="9" fill="#EBCFA7" stroke={ink} strokeWidth="3" />
      <rect x="25" y="9" width="3" height="58" fill="#F6E3C3" />
      <rect x="95" y="12" width="3" height="58" fill="#C9A678" />
      {[31, 37, 43].map((x, i) => (
        <rect key={x} x={x} y="9" width="4" height="4" fill={lit ? c : "#4A3A33"} className={face === "working" ? "bot-dot" : undefined} style={face === "working" ? { animationDelay: `${i * 0.25}s` } : undefined} />
      ))}
      <rect x="88" y="9" width="5" height="4" fill="#4A3A33" />
      <rect x="30" y="15" width="62" height="50" rx="8" fill="#1E2422" stroke={ink} strokeWidth="2" />
      <Expression face={face} micro={micro} c={c} />
    </svg>
  );
}

interface Msg { role: "user" | "bot"; text: string }
type Smart = "off" | "loading" | "ready" | "error";

export default function RobotPet({ mood, headline }: { mood: Mood; headline?: string }) {
  const [bubble, setBubble] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([
    { role: "bot", text: "Halo, aku ShitBot! Tanya apa aja soal format file, privasi, atau AI upscale. Aku juga jago bikin lelucon receh." },
  ]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [smart, setSmart] = useState<Smart>("off");
  const [pct, setPct] = useState(0);
  const [hover, setHover] = useState(false);
  const [sleepy, setSleepy] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [love, setLove] = useState(false);
  const [micro, setMicro] = useState<Micro>(null);
  const workerRef = useRef<Worker | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const lastActive = useRef(Date.now());

  const wake = () => { lastActive.current = Date.now(); setSleepy(false); };

  const face: Face =
    mood !== "idle" ? mood : love ? "love" : thinking ? "working" : speaking ? "talk" : hover ? "curious" : sleepy ? "sleepy" : "idle";

  // Gelembung bicara mengikuti suasana hati
  useEffect(() => {
    wake();
    if (mood === "working") {
      let i = Math.floor(Math.random() * TIPS.length);
      setBubble(TIPS[i]);
      const t = setInterval(() => { i = (i + 1) % TIPS.length; setBubble(TIPS[i]); }, 7000);
      return () => clearInterval(t);
    }
    if (mood === "happy" || mood === "error") {
      setBubble(headline ?? (mood === "happy" ? "Beres!" : "Ada yang error."));
      const t = setTimeout(() => setBubble(null), 10000);
      return () => clearTimeout(t);
    }
    setBubble(pick(IDLE));
    const hide = setTimeout(() => setBubble(null), 7000);
    let hide2: ReturnType<typeof setTimeout>;
    const iv = setInterval(() => {
      setBubble(pick([...IDLE, ...TIPS]));
      hide2 = setTimeout(() => setBubble(null), 7000);
    }, 40000);
    return () => { clearTimeout(hide); clearTimeout(hide2); clearInterval(iv); };
  }, [mood, headline]);

  // Ngantuk kalau lama didiamkan
  useEffect(() => {
    const t = setInterval(() => {
      if (mood === "idle" && Date.now() - lastActive.current > 45000) setSleepy(true);
    }, 5000);
    return () => clearInterval(t);
  }, [mood]);

  // Ekspresi kecil acak saat diam: kedip sebelah, lirik kiri/kanan
  useEffect(() => {
    if (face !== "idle") { setMicro(null); return; }
    let t1: ReturnType<typeof setTimeout>;
    let t2: ReturnType<typeof setTimeout>;
    const loop = () => {
      t1 = setTimeout(() => {
        setMicro(pick<Micro>(["wink", "lookL", "lookR"]));
        t2 = setTimeout(() => { setMicro(null); loop(); }, 1300);
      }, 3500 + Math.random() * 4000);
    };
    loop();
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [face]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, thinking, open]);
  useEffect(() => () => workerRef.current?.terminate(), []);

  function botSays(text: string) {
    setMessages((p) => [...p, { role: "bot", text }]);
    setThinking(false);
    setSpeaking(true);
    setTimeout(() => setSpeaking(false), 2500);
  }

  function startSmart() {
    if (workerRef.current) return;
    setSmart("loading");
    setPct(0);
    try {
      const w = new Worker(new URL("../lib/chat.worker.ts", import.meta.url), { type: "module" });
      workerRef.current = w;
      w.onmessage = (e: MessageEvent) => {
        const m = e.data;
        if (m.type === "progress" && m.data?.status === "progress") setPct(Math.round(m.data.progress ?? 0));
        else if (m.type === "ready") setSmart("ready");
        else if (m.type === "reply") botSays(String(m.text).trim() || "Hmm, aku nggak dapat jawaban. Coba tanya lagi?");
        else if (m.type === "error") {
          setSmart("error");
          workerRef.current?.terminate();
          workerRef.current = null;
          botSays("Mode pintar gagal dimuat (butuh internet saat pertama kali). Aku balik ke mode dasar ya.");
        }
      };
      w.postMessage({ type: "load" });
    } catch {
      setSmart("error");
      workerRef.current = null;
    }
  }

  function send(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || thinking) return;
    wake();
    setInput("");
    setMessages((p) => [...p, { role: "user", text }]);
    if (/terima kasih|makasih|thanks?|thank you|keren|mantap|hebat/i.test(text)) {
      setLove(true);
      setTimeout(() => setLove(false), 3500);
    }
    setThinking(true);
    const known = knownReply(text);
    if (known || smart !== "ready" || !workerRef.current) {
      setTimeout(() => botSays(known ?? reply(text)), 500);
    } else {
      workerRef.current.postMessage({ type: "ask", prompt: text });
    }
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end">
      {open && (
        <div className="mb-3 flex h-[26rem] w-[min(21rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-line bg-white shadow-xl">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full" style={{ background: COLOR[face] }} />
              <span className="text-sm font-semibold">ShitBot</span>
            </div>
            <button onClick={() => setOpen(false)} aria-label="Tutup chat" className="rounded p-1 text-slate-500 hover:bg-slate-100">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="border-b border-line bg-slate-50 px-4 py-2 text-xs text-slate-600">
            {smart === "off" && (
              <button onClick={startSmart} className="flex items-center gap-1.5 text-left font-medium text-slate-900 hover:underline">
                <Sparkles className="h-3.5 w-3.5 shrink-0" /> Aktifkan mode pintar (AI lokal, ±250 MB sekali unduh, jawaban bahasa Inggris)
              </button>
            )}
            {smart === "loading" && <span>Memuat model AI... {pct}%</span>}
            {smart === "ready" && <span>Mode pintar aktif. Berjalan di perangkat kamu.</span>}
            {smart === "error" && <span>Mode pintar tidak tersedia. Memakai mode dasar.</span>}
          </div>

          <div className="flex-1 space-y-2 overflow-y-auto px-4 py-3 text-sm">
            {messages.map((m, i) => (
              <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
                <div className={["max-w-[85%] rounded-2xl px-3 py-2 leading-snug", m.role === "user" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-800"].join(" ")}>
                  {m.text}
                </div>
              </div>
            ))}
            {thinking && <div className="text-xs text-slate-400">ShitBot lagi mikir...</div>}
            <div ref={endRef} />
          </div>

          <form onSubmit={send} className="flex gap-2 border-t border-line p-3">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Tanya ShitBot..."
              className="h-9 flex-1 rounded-md border border-line px-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
            />
            <button type="submit" aria-label="Kirim" disabled={!input.trim() || thinking}
              className="flex h-9 w-9 items-center justify-center rounded-md bg-slate-900 text-white disabled:opacity-40">
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      )}

      {!open && bubble && (
        <div className="relative mb-2 max-w-[250px] rounded-2xl border border-line bg-white px-3.5 py-2.5 text-sm leading-snug text-slate-700 shadow-md">
          {bubble}
          <span className="absolute -bottom-1.5 right-9 h-3 w-3 rotate-45 border-b border-r border-line bg-white" />
        </div>
      )}

      <button
        onClick={() => { wake(); setOpen((o) => !o); }}
        onMouseEnter={() => { wake(); setHover(true); }}
        onMouseLeave={() => setHover(false)}
        aria-label="Ngobrol dengan ShitBot"
        className="rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
      >
        <Monitor face={face} micro={micro} />
      </button>
    </div>
  );
}
