export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const pathname = url.pathname;
    if (pathname === '/' || pathname === '/ui-web/' || pathname === '/ui-web/index.html') return env.ASSETS.fetch(new Request(new URL('/ui-web/index.html', request.url)));
    if (pathname === '/api/health') return json({ ok: true, mode: 'cloudflare' });
    if (pathname === '/api/dimensions') return env.ASSETS.fetch(new Request(new URL('/api/dimensions.json', request.url)));
    if (pathname === '/api/batches') return env.ASSETS.fetch(new Request(new URL('/api/batches/index.json', request.url)));
    if (pathname.startsWith('/api/batches/')) {
      const batchId = pathname.split('/api/batches/')[1];
      return env.ASSETS.fetch(new Request(new URL('/api/batches/' + batchId + '.json', request.url)));
    }
    if (pathname === '/api/generate' && request.method === 'POST') {
      return json({ ok: false, cloud_mode: true, message: '云端演示版暂不支持实时生成，请在本地版生成后再同步发布。' }, 501);
    }
    return env.ASSETS.fetch(request);
  }
};

function json(payload, status = 200) {
  return new Response(JSON.stringify(payload, null, 2), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'access-control-allow-origin': '*' }
  });
}
