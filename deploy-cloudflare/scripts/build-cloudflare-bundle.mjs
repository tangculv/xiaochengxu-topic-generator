import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.cwd(), '..');
const out = path.resolve(process.cwd(), 'dist');

fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });
fs.mkdirSync(path.join(out, 'ui-web'), { recursive: true });
fs.mkdirSync(path.join(out, 'api', 'batches'), { recursive: true });

const copy = (from, to) => {
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.copyFileSync(from, to);
};

copy(path.join(root, 'ui-web', 'index.html'), path.join(out, 'ui-web', 'index.html'));
copy(path.join(root, 'ui-web', 'styles.css'), path.join(out, 'ui-web', 'styles.css'));
copy(path.join(process.cwd(), 'src', 'cloudflare-app.js'), path.join(out, 'ui-web', 'app.js'));

const generatedDir = path.join(root, '选题库', 'generated');
const dimensionsDir = path.join(root, '选题库', 'dimensions');

copy(path.join(generatedDir, 'index.json'), path.join(out, 'api', 'batches', 'index.json'));
for (const file of fs.readdirSync(generatedDir)) {
  if (file.endsWith('.json') && file !== 'index.json') {
    copy(path.join(generatedDir, file), path.join(out, 'api', 'batches', file));
  }
}
copy(path.join(dimensionsDir, 'relations.json'), path.join(out, 'api', 'dimensions.json'));

const worker = `export default {\n  async fetch(request, env) {\n    const url = new URL(request.url);\n    const pathname = url.pathname;\n    if (pathname === '/' || pathname === '/ui-web/' || pathname === '/ui-web/index.html') return env.ASSETS.fetch(new Request(new URL('/ui-web/index.html', request.url)));\n    if (pathname === '/api/health') return json({ ok: true, mode: 'cloudflare' });\n    if (pathname === '/api/dimensions') return env.ASSETS.fetch(new Request(new URL('/api/dimensions.json', request.url)));\n    if (pathname === '/api/batches') return env.ASSETS.fetch(new Request(new URL('/api/batches/index.json', request.url)));\n    if (pathname.startsWith('/api/batches/')) {\n      const batchId = pathname.split('/api/batches/')[1];\n      return env.ASSETS.fetch(new Request(new URL('/api/batches/' + batchId + '.json', request.url)));\n    }\n    if (pathname === '/api/generate' && request.method === 'POST') {\n      return json({ ok: false, cloud_mode: true, message: '云端演示版暂不支持实时生成，请在本地版生成后再同步发布。' }, 501);\n    }\n    return env.ASSETS.fetch(request);\n  }\n};\n\nfunction json(payload, status = 200) {\n  return new Response(JSON.stringify(payload, null, 2), {\n    status,\n    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'access-control-allow-origin': '*' }\n  });\n}\n`;
fs.writeFileSync(path.join(out, '_worker.js'), worker, 'utf8');
console.log(JSON.stringify({ ok: true, out }, null, 2));
