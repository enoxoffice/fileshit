# FileShit

## Test di komputer
1. Install Node.js LTS: https://nodejs.org (sekali saja)
2. Windows: klik 2x `JALANKAN-WINDOWS.bat` | Mac/Linux: `./jalankan-mac-linux.sh`
3. Pertama kali: tunggu install beberapa menit (paket AI besar). Browser terbuka di http://localhost:3000 (refresh jika kosong)

## Deploy gratis (Vercel)
Upload folder ini ke GitHub, lalu vercel.com -> Add New Project -> pilih repo -> Deploy.

## Catatan
- AI Enhance & Upscale: pertama kali mengunduh model AI. Gambar input dibatasi (2x: sisi terpanjang max 1280px, 4x: 640px) supaya browser tidak kehabisan memori.
- ShitBot: mode dasar langsung jalan. "Smart mode" mengunduh model AI ~250MB sekali, lalu jalan lokal.
- FFmpeg (audio/video) juga diunduh sekali saat pertama dipakai. File Anda tidak pernah di-upload.
