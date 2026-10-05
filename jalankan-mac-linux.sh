#!/bin/bash
cd "$(dirname "$0")"
command -v node >/dev/null || { echo "Node.js belum terinstall. Install dari https://nodejs.org"; exit 1; }
npm install
(sleep 10; (open http://localhost:3000 || xdg-open http://localhost:3000) >/dev/null 2>&1) &
npm run dev
