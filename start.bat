@echo off
cd /d "%~dp0"
echo Starting Projet Ados dynamic backend and Cloudflare tunnel...
start "Projet Ados Server" "C:\Users\LENOVO\AppData\Local\nodejs\node.exe" --env-file=.env server.js
start "Projet Ados Tunnel" "C:\Users\LENOVO\AppData\Local\agy\bin\cloudflared.exe" tunnel --protocol http2 --url http://127.0.0.1:3000
echo Running!
