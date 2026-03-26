@echo off
cd /d %~dp0
python tools_txt_to_books.py --input .\books-txt --json .\assets\data\books.json --js .\assets\js\books-data.js
pause
