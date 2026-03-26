#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
python3 ./tools_txt_to_books.py --input ./books-txt --json ./assets/data/books.json --js ./assets/js/books-data.js
