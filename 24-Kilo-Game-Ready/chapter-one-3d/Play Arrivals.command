#!/bin/zsh
cd -- "${0:A:h}/.." || exit 1
exec /usr/bin/python3 - <<'PY'
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.request import urlopen
import webbrowser

port = 8765
chapter = '/chapter-one-3d/'
url = f'http://127.0.0.1:{port}{chapter}'
try:
    server = ThreadingHTTPServer(('127.0.0.1', port), SimpleHTTPRequestHandler)
except OSError:
    try:
        with urlopen(url, timeout=1) as response:
            ready = response.read(32768) == Path('chapter-one-3d/index.html').read_bytes()
    except OSError:
        ready = False
    if ready:
        webbrowser.open(url)
        raise SystemExit(0)
    server = ThreadingHTTPServer(('127.0.0.1', 0), SimpleHTTPRequestHandler)
    url = f'http://127.0.0.1:{server.server_port}{chapter}'
with server:
    webbrowser.open(url)
    print(f'24 KILO is open at {url}\nKeep this window open while playing. Press Control-C to close.', flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
PY
