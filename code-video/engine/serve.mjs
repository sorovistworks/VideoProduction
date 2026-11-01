// Static server over the repo root, so pages can import /engine/motion.js
// (ES modules don't load over file://). Used by render.mjs and `npm run preview`.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const TYPES = {
  '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif', '.woff2': 'font/woff2',
  '.woff': 'font/woff', '.ttf': 'font/ttf', '.otf': 'font/otf', '.wav': 'audio/wav',
  '.mp3': 'audio/mpeg', '.mp4': 'video/mp4', '.glb': 'model/gltf-binary', '.hdr': 'application/octet-stream',
};

export function serve(port = 0) {
  const server = createServer(async (req, res) => {
    let path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (path.endsWith('/')) path += 'index.html';
    const file = resolve(join(ROOT, path));
    if (file !== ROOT && !file.startsWith(ROOT + sep)) { res.writeHead(403).end(); return; }
    try {
      const body = await readFile(file);
      res.writeHead(200, { 'Content-Type': TYPES[extname(file).toLowerCase()] ?? 'application/octet-stream' }).end(body);
    } catch {
      res.writeHead(404).end('not found');
    }
  });
  return new Promise((ok) => server.listen(port, '127.0.0.1', () => ok({ server, port: server.address().port })));
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { port } = await serve(Number(process.env.PORT) || 5173);
  console.log(`preview: http://127.0.0.1:${port}/projects/<name>/   (add ?render to freeze, ?t=3.2 to scrub)`);
}
