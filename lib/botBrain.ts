export const TIPS = [
  "Tahu nggak? Bug komputer pertama itu beneran ngengat yang nyangkut di relay, tahun 1947.",
  "Kenapa programmer suka dark mode? Karena cahaya menarik bug.",
  "File kamu nggak pernah keluar dari tab ini. Aku sendiri nggak bisa ngintip, udah nyoba.",
  "JPEG itu PNG yang menyerah mengejar kesempurnaan.",
  "Fakta: format GIF lahir tahun 1987 dan sampai sekarang nggak mau pensiun.",
  "Konversi lokal berarti laptop kamu yang kerja keras. Sayangi dia.",
  "Ada 10 jenis orang: yang paham biner dan yang nggak.",
  "Fakta: webcam pertama di dunia dipakai buat mantau teko kopi di Universitas Cambridge.",
  "WebAssembly bikin browser bisa jalanin kode super cepat. Makanya FFmpeg muat di satu tab.",
  "AI upscale nggak mengembalikan detail yang hilang, dia menebak dengan cerdas. Biasanya tebakannya bagus.",
  "Menunggu itu cuma buffering buat manusia.",
  "Fakta: hard disk 1 GB tahun 1980 beratnya sekitar 250 kg.",
];

export const IDLE = [
  "Taruh file di sini, aku semangatin sementara browser kamu yang kerja.",
  "Psst, klik aku buat ngobrol.",
  "Tanpa upload, tanpa server, tanpa ngintip. Cuma WebAssembly.",
];

export const pick = <T,>(list: T[]) => list[Math.floor(Math.random() * list.length)];

const ID_HINT =
  /\b(apa|bagaimana|gimana|cara|bisa|tidak|nggak|gak|halo|hai|makasih|terima kasih|kenapa|berapa|gratis|aman|lama|gue|lu|aku|kamu|lucu|dong|sih|ya)\b/i;
const EN_HINT = /\b(the|what|how|can|you|is|are|my|do|does|why|please|hello|hey|thanks|thank)\b/i;

interface Intent { test: RegExp; en: string; id: string }

const INTENTS: Intent[] = [
  { test: /\b(hi|hello|hey|halo|hai|yo|pagi|siang|malam)\b/i,
    en: "Hey! Drop some files in and I'll keep you company while they convert.",
    id: "Halo! Masukin file aja, nanti aku temenin sampai selesai dikonversi." },
  { test: /who are you|what are you|your name|siapa (kamu|lu|elu)|namamu|nama kamu/i,
    en: "I'm ShitBot, the robot living in FileShit. I can't convert files myself, but I'm great at moral support.",
    id: "Aku ShitBot, robot penghuni FileShit. Aku nggak bisa konversi sendiri, tapi jago kasih semangat." },
  { test: /privacy|private|upload|server|safe|spy|aman|privasi|diintip|bocor/i,
    en: "Everything runs inside your browser. Your files are never uploaded. Only the engines (FFmpeg, AI model) are downloaded once and cached.",
    id: "Semua diproses di browser kamu. File nggak pernah di-upload. Yang diunduh cuma mesinnya (FFmpeg, model AI), sekali saja lalu disimpan di cache." },
  { test: /upscal|enhance|blur|sharp|4x|2x|resolution|resolusi|buram|jernih|tajam/i,
    en: "Turn on AI Enhance & Upscale (2x or 4x) above the drop zone. Best for small or blurry photos. The first run downloads the AI model.",
    id: "Aktifkan AI Enhance & Upscale (2x atau 4x) di atas kotak upload. Paling cocok buat foto kecil atau buram. Pertama kali akan mengunduh model AI dulu." },
  { test: /slow|how long|eta|stuck|freeze|hang|lama|lambat|macet|nge-?lag|lag/i,
    en: "Speed depends on your device. Video and AI upscale are the heavy ones. The ETA under each progress bar updates live. Don't close the tab.",
    id: "Kecepatan tergantung perangkat kamu. Video dan AI upscale paling berat. Estimasi waktu di bawah progress bar update terus. Jangan tutup tab-nya ya." },
  { test: /heic|iphone|heif/i,
    en: "HEIC and HEIF work. Pick the 'HEIC to JPG' chip, drop your iPhone photos, then Convert All.",
    id: "HEIC dan HEIF didukung. Pilih chip 'HEIC to JPG', masukin foto iPhone, lalu klik Convert All." },
  { test: /format|support|convert (to|from)|didukung|bisa convert|bisa ubah/i,
    en: "Images (HEIC, PNG, JPG, WEBP, BMP, TIFF, SVG, GIF), audio (MP3, WAV, AAC, OGG, FLAC, M4A), video (MP4, MOV, AVI, MKV, WEBM), documents (PDF, DOCX, TXT, MD, HTML) and ZIP.",
    id: "Gambar (HEIC, PNG, JPG, WEBP, BMP, TIFF, SVG, GIF), audio (MP3, WAV, AAC, OGG, FLAC, M4A), video (MP4, MOV, AVI, MKV, WEBM), dokumen (PDF, DOCX, TXT, MD, HTML), dan ZIP." },
  { test: /video|audio|mp3|mp4|gif|ffmpeg|music|lagu/i,
    en: "Video and audio use FFmpeg in WebAssembly. Pick a target per file. 'MP3' on a video extracts the audio. The first run downloads the engine.",
    id: "Video dan audio pakai FFmpeg WebAssembly. Pilih format tujuan per file. 'MP3' di video artinya ekstrak audio. Pertama kali akan mengunduh mesinnya dulu." },
  { test: /zip|archive|extract|arsip/i,
    en: "Drop a ZIP and choose 'Extract files' to unpack it into the queue. 'Download All as ZIP' bundles everything you converted.",
    id: "Masukin ZIP lalu pilih 'Extract files' buat membukanya ke antrean. 'Download All as ZIP' menyatukan semua hasil konversi." },
  { test: /error|fail|gagal|bug|not working|broken|rusak|eror/i,
    en: "The red text under the file says what went wrong. Common causes: unsupported codec, a huge file, or no internet on the first AI/video run.",
    id: "Teks merah di bawah file menjelaskan masalahnya. Penyebab umum: codec nggak didukung, file kegedean, atau nggak ada internet saat pertama pakai AI/video. Coba lagi atau pilih format lain." },
  { test: /free|gratis|price|cost|limit|batas|harga|bayar/i,
    en: "100% free, no account, no file size limit. The only limit is your device's memory.",
    id: "100% gratis, tanpa akun, tanpa batas ukuran file. Satu-satunya batas adalah memori perangkat kamu." },
  { test: /thank|thx|makasih|terima kasih|mantap|keren/i,
    en: "Anytime. Beep boop.", id: "Sama-sama! Bip bup." },
];

/** Jawaban untuk topik yang dikenal. null kalau tidak ada yang cocok. */
export function knownReply(input: string): string | null {
  const q = input.trim();
  const en = EN_HINT.test(q) && !ID_HINT.test(q);
  if (/joke|funny|fact|lucu|lelucon|candaan|fakta|receh/i.test(q)) return pick(TIPS);
  for (const it of INTENTS) if (it.test.test(q)) return en ? it.en : it.id;
  return null;
}

export function reply(input: string): string {
  return (
    knownReply(input) ??
    "Aku belum paham yang itu. Coba tanya soal format, privasi, AI upscale, atau minta lelucon. Buat pertanyaan bebas, aktifkan mode pintar (jawabannya bahasa Inggris)."
  );
}
