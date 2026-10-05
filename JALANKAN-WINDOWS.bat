@echo off
cd /d "%~dp0"
where node >nul 2>nul || (echo Node.js belum terinstall. Install dulu dari https://nodejs.org lalu jalankan file ini lagi. & pause & exit /b)
echo Memeriksa paket, pertama kali butuh beberapa menit...
call npm install
start "" cmd /c "timeout /t 10 >nul & start http://localhost:3000"
call npm run dev
pause
