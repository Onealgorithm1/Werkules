const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = parseInt(process.env.PORT, 10) || 3000;
const ROOT = path.resolve(__dirname);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.csv': 'text/csv; charset=utf-8',
  '.pdf': 'application/pdf'
};

function safePath(p) {
  const decoded = decodeURIComponent((p || '/').split('?')[0]);
  const pathname = path.normalize(decoded).replace(/^([.][.][/\\])+/, '');
  return path.join(ROOT, pathname);
}

function send(res, code, data, headers = {}) {
  res.writeHead(code, {
    'Cache-Control': 'no-store',
    ...headers
  });
  if (data instanceof Buffer || typeof data === 'string') {
    res.end(data);
  } else {
    res.end('');
  }
}

function directoryListingHTML(dir, requestPath) {
  const items = fs
    .readdirSync(dir, { withFileTypes: true })
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((d) => {
      const slash = d.isDirectory() ? '/' : '';
      const href = path.posix.join(requestPath, d.name) + slash;
      return `<li><a href="${href}">${d.name}${slash}</a></li>`;
    })
    .join('');
  const title = `Index of ${requestPath}`;
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title><style>body{font-family:system-ui,-apple-system,Segoe UI,Roboto,Ubuntu,Cantarell,Noto Sans,sans-serif;line-height:1.5;padding:24px;max-width:900px;margin:0 auto}h1{font-size:20px;margin:0 0 12px}ul{list-style:none;padding:0;margin:0}li{padding:6px 0;border-bottom:1px solid #eee}a{text-decoration:none;color:#0366d6}a:hover{text-decoration:underline}</style></head><body><h1>${title}</h1><ul>${items}</ul></body></html>`;
}

const server = http.createServer((req, res) => {
  try {
    const parsed = url.parse(req.url || '/');
    const reqPath = parsed.pathname || '/';
    const filePath = safePath(reqPath);

    if (!filePath.startsWith(ROOT)) {
      return send(res, 403, 'Forbidden');
    }

    if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
      const indexFile = path.join(filePath, 'index.html');
      if (fs.existsSync(indexFile)) {
        const data = fs.readFileSync(indexFile);
        return send(res, 200, data, { 'Content-Type': MIME['.html'] });
      }
      const html = directoryListingHTML(filePath, reqPath.endsWith('/') ? reqPath : reqPath + '/');
      return send(res, 200, html, { 'Content-Type': MIME['.html'] });
    }

    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      const ext = path.extname(filePath).toLowerCase();
      const type = MIME[ext] || 'application/octet-stream';
      const data = fs.readFileSync(filePath);
      return send(res, 200, data, { 'Content-Type': type });
    }

    if (reqPath === '/' && !fs.existsSync(path.join(ROOT, 'index.html'))){
      const html = directoryListingHTML(ROOT, '/');
      return send(res, 200, html, { 'Content-Type': MIME['.html'] });
    }

    return send(res, 404, 'Not Found');
  } catch (err) {
    return send(res, 500, `Internal Server Error\n\n${err && err.stack ? err.stack : String(err)}`);
  }
});

server.listen(PORT, () => {
  console.log(`Dev server running at http://localhost:${PORT}`);
});
