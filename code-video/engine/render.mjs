// Render a project page to video (or stills) by calling window.seek(t) frame by frame.
//   node engine/render.mjs projects/<name>                     final 1920x1080, 60 fps, 4 blended subframes
//   node engine/render.mjs projects/<name> --w 1080 --h 1920   9:16 (the page re-lays out itself)
//   node engine/render.mjs projects/<name> --draft             30 fps, no subframes, fast
//   node engine/render.mjs projects/<name> --stills 0.5,2,4    PNGs into out/stills/ for approval
//   node engine/render.mjs projects/<name> --stills board      one PNG per line, from the page's window.STORYBOARD
//   node engine/render.mjs projects/<name> --page thumb.html --w 1280 --h 720 --stills 0   YouTube thumbnail
//   node engine/render.mjs projects/<name> --draft --from 240 --to 260                      just that range
// Other flags: --fps --sub --dur (default: window.DURATION) --out <file> --page <file> (default index.html)
//   --query "silhouette&samples=4"   extra URL parameters for the page (toon films: silhouette test, debug views, samples)
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from './serve.mjs';

const args = process.argv.slice(2);
const dir = args[0];
if (!dir || dir.startsWith('--')) { console.error('usage: node engine/render.mjs projects/<name> [flags]'); process.exit(1); }
const flag = (k, d) => { const i = args.indexOf('--' + k); return i > 0 ? args[i + 1] : d; };
const draft = args.includes('--draft');
const W = Number(flag('w', 1920)), H = Number(flag('h', 1080));
const FPS = Number(flag('fps', draft ? 30 : 60)), SUB = Number(flag('sub', draft ? 1 : 4));
const stills = flag('stills');

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const urlPath = relative(ROOT, resolve(dir)).split('\\').join('/');
const outDir = join(resolve(dir), 'out');
mkdirSync(outDir, { recursive: true });

const { server, port } = await serve();
let browser;
try {
  browser = await chromium.launch({ channel: 'chrome' });
} catch {
  browser = await chromium.launch(); // bundled Chromium: `npx playwright install chromium`
}
try {
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  page.on('pageerror', (e) => console.error('page error:', e.message));
  const extra = flag('query') ? '&' + flag('query') : '';
  await page.goto(`http://127.0.0.1:${port}/${urlPath}/${flag('page', 'index.html')}?render${extra}`);
  await page.waitForFunction(() => typeof window.seek === 'function');
  await page.evaluate(async () => { await document.fonts.ready; await window.ready; });
  const DUR = Number(flag('dur', await page.evaluate(() => window.DURATION ?? 10)));
  const seek = (t) => page.evaluate((t) => window.seek(t), t);

  if (stills) {
    mkdirSync(join(outDir, 'stills'), { recursive: true });
    // --stills board: one still per storyboard line, from the page's window.STORYBOARD (seconds)
    const times = stills === 'board' ? await page.evaluate(() => window.STORYBOARD) : stills.split(',').map(Number);
    for (const t of times) {
      await seek(t);
      const base = flag('page', 'index.html').replace(/\.html$/, '');
      const tag = flag('query') ? '_' + flag('query').replace(/[^a-z0-9=]+/gi, '-') : '';
      const file = join(outDir, 'stills', `${base === 'index' ? '' : base + '_'}${W}x${H}_t${t.toFixed(2).padStart(6, '0')}${tag}.png`);
      await page.screenshot({ path: file });
      console.log(file);
    }
  } else {
    // --from/--to render only that time range (seconds), for quick checks of a changed section
    const T0 = Number(flag('from', 0)), T1 = Math.min(DUR, Number(flag('to', DUR)));
    const part = flag('from') || flag('to') ? `_${T0}-${T1}s` : '';
    const out = flag('out', join(outDir, `${draft ? 'draft' : 'silent'}_${W}x${H}${part}.mp4`));
    // Blend SUB subframes per output frame = real motion blur.
    // JPEG frames are BT.601 full range; convert to tagged BT.709 TV range so players show true blacks and colours.
    const blur = SUB > 1 ? `tmix=frames=${SUB},select='eq(mod(n\\,${SUB})\\,${SUB - 1})',setpts=N/${FPS}/TB,` : '';
    const vf = ['-vf', `${blur}scale=in_color_matrix=bt601:in_range=pc:out_color_matrix=bt709:out_range=tv,format=yuv420p,` +
      'setparams=range=tv:colorspace=bt709:color_primaries=bt709:color_trc=bt709'];
    const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-c:v', 'mjpeg', '-framerate', String(FPS * SUB), '-i', '-',
      ...vf, '-r', String(FPS), '-c:v', 'libx264', '-crf', draft ? '23' : '16', '-preset', draft ? 'veryfast' : 'slow',
      '-pix_fmt', 'yuv420p', '-movflags', '+faststart', out], { stdio: ['pipe', 'inherit', 'inherit'] });
    const done = new Promise((ok, fail) => { ff.on('error', fail); ff.on('close', (c) => (c ? fail(new Error('ffmpeg exit ' + c)) : ok())); });

    // CDP JPEG capture: ~45 ms/frame vs ~730 ms for page.screenshot PNG at 1080p (measured).
    const cdp = await page.context().newCDPSession(page);
    const shot = { format: 'jpeg', quality: draft ? 90 : 100, optimizeForSpeed: true };
    const first = Math.round(T0 * FPS) * SUB, total = Math.ceil(T1 * FPS - 1e-6) * SUB;
    const started = Date.now();
    for (let i = first; i < total; i++) {
      await seek(i / (FPS * SUB));
      const { data } = await cdp.send('Page.captureScreenshot', shot);
      if (!ff.stdin.write(Buffer.from(data, 'base64'))) await new Promise((r) => ff.stdin.once('drain', r));
      if (i % (FPS * SUB) === 0) console.log(`rendered ${i / (FPS * SUB)}s / ${DUR}s`);
    }
    ff.stdin.end();
    await done;
    console.log(`${out}  (${((Date.now() - started) / 1000).toFixed(0)}s)`);
  }
} finally {
  await browser.close();
  server.close();
}
