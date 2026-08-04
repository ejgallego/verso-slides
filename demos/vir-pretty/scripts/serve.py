#!/usr/bin/env python3
"""Serve the built deck with the headers required by threaded LLVM Wasm."""

from argparse import ArgumentParser
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path


class IsolatedHandler(SimpleHTTPRequestHandler):
    def end_headers(self) -> None:
        self.send_header("Cross-Origin-Opener-Policy", "same-origin")
        self.send_header("Cross-Origin-Embedder-Policy", "require-corp")
        super().end_headers()


def main() -> None:
    parser = ArgumentParser()
    parser.add_argument("--port", type=int, default=18332)
    parser.add_argument("--directory", type=Path, default=Path(__file__).parent.parent / "_site")
    args = parser.parse_args()
    handler = partial(IsolatedHandler, directory=str(args.directory.resolve()))
    server = ThreadingHTTPServer(("127.0.0.1", args.port), handler)
    print(f"Serving {args.directory.resolve()} at http://127.0.0.1:{args.port}", flush=True)
    server.serve_forever()


if __name__ == "__main__":
    main()
