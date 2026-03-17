#!/usr/bin/env python3
from __future__ import annotations

import json
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any, Dict
from urllib.parse import parse_qs, urlparse

from topic_generator import (
    GENERATED_DIR,
    ROOT,
    ensure_default_files,
    generate,
    load_json,
    render_batch_registry,
)


class TopicGeneratorApiHandler(BaseHTTPRequestHandler):
    server_version = 'TopicGeneratorServer/0.1'

    def _send_json(self, payload: Any, status: int = 200) -> None:
        body = json.dumps(payload, ensure_ascii=False, indent=2).encode('utf-8')
        self.send_response(status)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(body)))
        self.send_header('Cache-Control', 'no-store')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(body)

    def _send_file(self, path: Path, content_type: str) -> None:
        content = path.read_bytes()
        self.send_response(200)
        self.send_header('Content-Type', content_type)
        self.send_header('Content-Length', str(len(content)))
        self.send_header('Cache-Control', 'no-store')
        self.end_headers()
        self.wfile.write(content)

    def _read_json_body(self) -> Dict[str, Any]:
        length = int(self.headers.get('Content-Length', '0'))
        raw = self.rfile.read(length) if length > 0 else b'{}'
        if not raw:
            return {}
        return json.loads(raw.decode('utf-8'))

    def do_OPTIONS(self) -> None:
        self.send_response(204)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def do_GET(self) -> None:
        ensure_default_files()
        parsed = urlparse(self.path)
        path = parsed.path

        if path == '/' or path == '/ui-web/' or path == '/ui-web/index.html':
            return self._send_file(ROOT / 'ui-web' / 'index.html', 'text/html; charset=utf-8')
        if path == '/ui-web/styles.css':
            return self._send_file(ROOT / 'ui-web' / 'styles.css', 'text/css; charset=utf-8')
        if path == '/ui-web/app.js':
            return self._send_file(ROOT / 'ui-web' / 'app.js', 'application/javascript; charset=utf-8')

        if path == '/api/health':
            return self._send_json({'ok': True})
        if path == '/api/dimensions':
            return self._send_json({
                'relations': load_json('relations'),
                'actions': load_json('actions'),
                'domains': load_json('domains'),
                'ai_levels': load_json('ai_levels'),
            })
        if path == '/api/batches':
            render_batch_registry()
            return self._send_json(json.loads((GENERATED_DIR / 'index.json').read_text(encoding='utf-8')))
        if path.startswith('/api/batches/'):
            batch_id = path.split('/api/batches/', 1)[1]
            batch_path = GENERATED_DIR / f'{batch_id}.json'
            if not batch_path.exists():
                return self._send_json({'error': 'batch_not_found', 'message': f'批次不存在：{batch_id}'}, status=404)
            return self._send_json(json.loads(batch_path.read_text(encoding='utf-8')))

        return self._send_json({'error': 'not_found', 'message': f'未找到接口：{path}'}, status=404)

    def do_POST(self) -> None:
        ensure_default_files()
        parsed = urlparse(self.path)
        if parsed.path != '/api/generate':
            return self._send_json({'error': 'not_found', 'message': f'未找到接口：{parsed.path}'}, status=404)

        try:
            body = self._read_json_body()
            relation = body.get('relation') or None
            batch_id = body.get('batch_id') or None
            name = body.get('name') or None
            multiplier = int(body.get('multiplier') or 1)
            quality_mode = body.get('quality_mode') or 'focused'

            class Args:
                def __init__(self, relation: str | None, batch_id: str | None, name: str | None, multiplier: int, quality_mode: str) -> None:
                    self.relation = relation
                    self.batch_id = batch_id
                    self.name = name
                    self.multiplier = multiplier
                    self.quality_mode = quality_mode

            before = {p.stem for p in GENERATED_DIR.glob('BATCH-*.json')}
            if quality_mode == 'focused' and multiplier > 1:
                multiplier = 1
            generate(Args(relation=relation, batch_id=batch_id, name=name, multiplier=multiplier, quality_mode=quality_mode))
            after = {p.stem for p in GENERATED_DIR.glob('BATCH-*.json')}
            created = sorted(after - before, reverse=True)
            resolved_batch_id = batch_id or (created[0] if created else None)
            if not resolved_batch_id:
                render_batch_registry()
                index = json.loads((GENERATED_DIR / 'index.json').read_text(encoding='utf-8'))
                resolved_batch_id = index['batches'][0]['batch_id'] if index['batches'] else None
            payload = json.loads((GENERATED_DIR / f'{resolved_batch_id}.json').read_text(encoding='utf-8')) if resolved_batch_id else {}
            return self._send_json({'ok': True, 'batch': payload.get('batch'), 'cards_count': len(payload.get('cards', []))})
        except Exception as exc:  # noqa: BLE001
            return self._send_json({'error': 'generate_failed', 'message': str(exc)}, status=500)


def run_server(host: str = '127.0.0.1', port: int = 8765) -> None:
    ensure_default_files()
    server = ThreadingHTTPServer((host, port), TopicGeneratorApiHandler)
    print(json.dumps({'message': 'topic generator server started', 'url': f'http://{host}:{port}/ui-web/'}, ensure_ascii=False))
    server.serve_forever()


if __name__ == '__main__':
    run_server()
