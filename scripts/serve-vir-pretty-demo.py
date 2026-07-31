#!/usr/bin/env python3
"""Serve the generated VIR demo with the headers required by threaded Wasm."""

import argparse
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path


WORKSPACE = Path(__file__).resolve().parent.parent


class IsolatedDemoHandler(SimpleHTTPRequestHandler):
    def end_headers(self) -> None:
        self.send_header("Cross-Origin-Opener-Policy", "same-origin")
        self.send_header("Cross-Origin-Embedder-Policy", "require-corp")
        self.send_header("Cross-Origin-Resource-Policy", "same-origin")
        self.send_header("Cache-Control", "no-store")
        super().end_headers()


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--port", type=int, default=18321)
    parser.add_argument("--bind", default="127.0.0.1")
    parser.add_argument("--directory", type=Path, default=Path("_test/vir-code"))
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    directory = (WORKSPACE / args.directory).resolve()
    try:
        directory.relative_to(WORKSPACE)
    except ValueError as error:
        raise SystemExit(f"refusing to serve a directory outside {WORKSPACE}") from error
    if not directory.is_dir():
        raise SystemExit(f"demo directory does not exist: {directory}")
    handler = partial(IsolatedDemoHandler, directory=str(directory))
    server = ThreadingHTTPServer((args.bind, args.port), handler)
    print(f"Serving {directory} at http://{args.bind}:{args.port}/", flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
