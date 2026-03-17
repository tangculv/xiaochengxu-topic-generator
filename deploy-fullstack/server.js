#!/usr/bin/env node
import http from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const PORT = Number(process.env.PORT || 8787);
const HOST = '0.0.0.0';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
};

function sendJson(res, status, payload) {
  const body = JSON.stringify(payload, null, 2);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'Access-Control-Allow-Origin': '*',
  });
  res.end(body);
}

function sendFile(res, filePath) {
  const ext = path.extname(filePath);
  const type = MIME[ext] || 'text/plain; charset=utf-8';
  res.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'no-store' });
  res.end(readFileSync(filePath));
}

function runPython(args) {
  const result = spawnSync('python3', args, {
    cwd: ROOT,
    encoding: 'utf-8',
    maxBuffer: 20 * 1024 * 1024,
  });
  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || 'python command failed');
  }
  return result.stdout;
}

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, 'utf-8'));
}

function handleGenerate(body) {
  const args = ['scripts/topic_generator.py', 'generate'];
  if (body.relation) args.push('--relation', String(body.relation));
  if (body.batch_id) args.push('--batch-id', String(body.batch_id));
  if (body.name) args.push('--name', String(body.name));
  if (body.multiplier) args.push('--multiplier', String(body.multiplier));
  if (body.quality_mode) args.push('--quality-mode', String(body.quality_mode));
  const out = runPython(args).trim();
  const start = out.lastIndexOf('{');
  const batch = JSON.parse(start >= 0 ? out.slice(start) : '{}');
  const payload = readJson(path.join(ROOT, '选题库', 'generated', `${batch.batch_id}.json`));
  return { ok: true, batch: payload.batch, cards_count: payload.cards.length };
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    });
    return res.end();
  }
  try {
    if (req.method === 'GET' && (url.pathname === '/' || url.pathname === '/ui-web/' || url.pathname === '/ui-web/index.html')) {
      return sendFile(res, path.join(ROOT, 'ui-web', 'index.html'));
    }
    if (req.method === 'GET' && url.pathname === '/ui-web/styles.css') return sendFile(res, path.join(ROOT, 'ui-web', 'styles.css'));
    if (req.method === 'GET' && url.pathname === '/ui-web/app.js') return sendFile(res, path.join(ROOT, 'ui-web', 'app.js'));
    if (req.method === 'GET' && url.pathname === '/api/health') return sendJson(res, 200, { ok: true, mode: 'fullstack' });
    if (req.method === 'GET' && url.pathname === '/api/dimensions') {
      return sendJson(res, 200, {
        relations: readJson(path.join(ROOT, '选题库', 'dimensions', 'relations.json')),
        actions: readJson(path.join(ROOT, '选题库', 'dimensions', 'actions.json')),
        domains: readJson(path.join(ROOT, '选题库', 'dimensions', 'domains.json')),
        ai_levels: readJson(path.join(ROOT, '选题库', 'dimensions', 'ai_levels.json')),
      });
    }
    if (req.method === 'GET' && url.pathname === '/api/batches') {
      runPython(['scripts/topic_generator.py', 'list-batches']);
      return sendJson(res, 200, readJson(path.join(ROOT, '选题库', 'generated', 'index.json')));
    }
    if (req.method === 'GET' && url.pathname.startsWith('/api/batches/')) {
      const batchId = decodeURIComponent(url.pathname.replace('/api/batches/', ''));
      const file = path.join(ROOT, '选题库', 'generated', `${batchId}.json`);
      if (!existsSync(file)) return sendJson(res, 404, { error: 'batch_not_found', message: `批次不存在：${batchId}` });
      return sendJson(res, 200, readJson(file));
    }
    if (req.method === 'POST' && url.pathname === '/api/generate') {
      let raw = '';
      req.on('data', chunk => raw += chunk);
      req.on('end', () => {
        try {
          const body = raw ? JSON.parse(raw) : {};
          const payload = handleGenerate(body);
          sendJson(res, 200, payload);
        } catch (error) {
          sendJson(res, 500, { error: 'generate_failed', message: error.message || String(error) });
        }
      });
      return;
    }
    sendJson(res, 404, { error: 'not_found', message: `未找到接口：${url.pathname}` });
  } catch (error) {
    sendJson(res, 500, { error: 'server_error', message: error.message || String(error) });
  }
});

server.listen(PORT, HOST, () => {
  console.log(JSON.stringify({ ok: true, url: `http://${HOST}:${PORT}/ui-web/`, port: PORT }, null, 2));
});
