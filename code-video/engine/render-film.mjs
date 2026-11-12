// Production render for long films (toon films and any page that exposes window.FPS + window.frameCheck).
// Owned by the integrator. Frames render in any order, so the film is split into chunks across workers (and machines).
//
//   node engine/render-film.mjs projects/<name>                       final: every shot's own sample count, 1920x1080
//   node engine/render-film.mjs projects/<name> --draft               1 sample per frame (no blur/DOF), fast
//   node engine/render-film.mjs projects/<name> --samples 4           override every shot's sample count
//   node engine/render-film.mjs projects/<name> --workers 3           parallel headless browsers (default 2)
//   node engine/render-film.mjs projects/<name> --chunk 48            frames per chunk (default 48 = 2 s at 24 fps)
//   node engine/render-film.mjs projects/<name> --chunks 0-11         render only these chunks (split across machines)
//   node engine/render-film.mjs projects/<name> --from 4 --to 9       render the chunks covering 4 s..9 s, assemble that range
//   node engine/render-film.mjs projects/<name> --assemble            only assemble chunks already on disk
//   node engine/render-film.mjs projects/<name> --meta              only write docs/cutlist.json (cuts + window.EVENTS)
//   --w 1080 --h 1920 (other format) · --query "a=b" (extra page flags) · --redo (ignore existing chunks)
//
// Safety, per frame: the page's frameCheck() probes for a blank / flat frame or a lost WebGL context; a failed frame is
// retried in a fresh browser (after warm-up frames), up to 3 times, then the render stops. Any shader compile error
// (window.__fatal) stops the render at once: a frame can look plausible with a broken shader (missing grass).
// Chunks are written losslessly (FFV1 RGB) to a temp name and only renamed after their frame count is verified, so a
// failed chunk never leaves an old or partial file behind. Assembly decodes every chunk into ONE encode and checks
// the frame count at every step (joining files with stream copy can silently drop one-frame segments).
// A page can allow intentionally flat frames (fade to black): window.ALLOW_FLAT = [[t0, t1], ...] in seconds.
import { chromium } from 'playwright';
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from './serve.mjs';

const args = process.argv.slice(2);
const dir = args[0];
if (!dir || dir.startsWith('--')) { console.error('usage: node engine/render-film.mjs projects/<name> [flags]'); process.exit(1); }
const flag = (k, d) => { const i = args.indexOf('--' + k); return i > 0 ? args[i + 1] : d; };
const has = (k) => args.includes('--' + k);
const draft = has('draft');
const W = Number(flag('w', 1920)), H = Number(flag('h', 1080));
const WORKERS = Number(flag('workers', 2)), CHUNK = Number(flag('chunk', 48));
const samples = flag('samples', draft ? '1' : null);
const query = ['render', samples ? `samples=${samples}` : '', flag('query', '')].filter(Boolean).join('&');
const tag = `${W}x${H}${draft ? '_draft' : samples ? `_s${samples}` : ''}`;

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const urlPath = relative(ROOT, resolve(dir)).split('\\').join('/');
const outDir = join(resolve(dir), 'out'), chunkDir = join(outDir, `chunks_${tag}`);
mkdirSync(chunkDir, { recursive: true });

const ffprobeFrames = (file) => Number(spawnSync('ffprobe', ['-v', 'error', '-count_frames', '-select_streams', 'v:0',
  '-show_entries', 'stream=nb_read_frames', '-of', 'csv=p=0', file], { encoding: 'utf8' }).stdout.trim());

const { server, port } = await serve();
const launch = async () => {
  const opts = { args: ['--ignore-gpu-blocklist', '--enable-gpu-rasterization'] };
  try { return await chromium.launch({ channel: 'chrome', ...opts }); } catch { return chromium.launch(opts); }
};

async function openPage(browser) {
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(`http://127.0.0.1:${port}/${urlPath}/index.html?${query}`);
  await page.waitForFunction(() => typeof window.seek === 'function', null, { timeout: 120000 });
  await page.evaluate(async () => { await document.fonts.ready; await window.ready; });
  return { page, errors, cdp: await page.context().newCDPSession(page) };
}

let exitCode = 0;
try {
  // probe: duration, fps, cut list
  const probeBrowser = await launch();
  const probe = await openPage(probeBrowser);
  const meta = await probe.page.evaluate(() => ({ DUR: window.DURATION, FPS: window.FPS ?? 24, CUTS: window.CUTS ?? [],
    EVENTS: window.EVENTS ?? {}, hasCheck: typeof window.frameCheck === 'function', ALLOW_FLAT: window.ALLOW_FLAT ?? [] }));
  await probeBrowser.close();
  const { DUR, FPS, CUTS, EVENTS, hasCheck, ALLOW_FLAT } = meta;
  mkdirSync(join(resolve(dir), 'docs'), { recursive: true });
  // the one timing file picture and sound share: cuts + named events (film seconds), read by audio/score.py
  writeFileSync(join(resolve(dir), 'docs', 'cutlist.json'), JSON.stringify({ fps: FPS, duration: DUR, cuts: CUTS, events: EVENTS }, null, 1));
  if (has('meta')) { console.log(join(dir, 'docs', 'cutlist.json')); process.exit(0); }
  const TOTAL = Math.ceil(DUR * FPS - 1e-6);
  const nChunks = Math.ceil(TOTAL / CHUNK);
  const chunkFile = (c) => join(chunkDir, `c${String(c).padStart(4, '0')}.mkv`);
  const range = (c) => [c * CHUNK, Math.min(TOTAL, (c + 1) * CHUNK)];
  console.log(`${DUR}s at ${FPS} fps = ${TOTAL} frames, ${nChunks} chunks of ${CHUNK}, ${W}x${H}, ${query}${hasCheck ? '' : '  (page has no frameCheck: blank-frame check off)'}`);

  // which chunks
  let want = [...Array(nChunks).keys()];
  if (flag('chunks')) { const [a, b] = flag('chunks').split('-').map(Number); want = want.filter((c) => c >= a && c <= (b ?? a)); }
  if (flag('from') || flag('to')) {
    const f0 = Math.floor(Number(flag('from', 0)) * FPS), f1 = Math.ceil(Number(flag('to', DUR)) * FPS);
    want = want.filter((c) => { const [a, b] = range(c); return b > f0 && a < f1; });
  }
  if (has('redo')) for (const c of want) rmSync(chunkFile(c), { force: true });
  const todo = has('assemble') ? [] : want.filter((c) => !existsSync(chunkFile(c)) || ffprobeFrames(chunkFile(c)) !== range(c)[1] - range(c)[0]);
  if (want.length - todo.length && !has('assemble')) console.log(`${want.length - todo.length} chunk(s) already rendered and verified; ${todo.length} to go`);

  const started = Date.now();
  let framesDone = 0;
  const queue = [...todo];
  const flatAllowed = (t) => ALLOW_FLAT.some(([a, b]) => t >= a && t <= b);

  async function worker(id) {
    let browser = await launch(), ctx = await openPage(browser);
    const fresh = async (warmAt) => {
      await browser.close().catch(() => {});
      browser = await launch(); ctx = await openPage(browser);
      for (let k = 2; k >= 1; k--) await ctx.page.evaluate((t) => window.seek(t), Math.max(0, warmAt - k / FPS)).catch(() => {});
    };
    try {
      while (queue.length) {
        const c = queue.shift(), [a, b] = range(c), tmp = chunkFile(c) + '.part.mkv';
        const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'png', '-i', '-',
          '-c:v', 'ffv1', '-level', '3', '-pix_fmt', 'bgr0', '-g', '1', tmp], { stdio: ['pipe', 'inherit', 'inherit'] });
        const done = new Promise((ok, fail) => { ff.on('error', fail); ff.on('close', (code) => (code ? fail(new Error('ffmpeg exit ' + code)) : ok())); });
        const t0 = Date.now();
        for (let f = a; f < b; f++) {
          const t = f / FPS;
          let png = null, why = '';
          for (let attempt = 0; attempt < 4 && !png; attempt++) {
            if (attempt) { console.log(`  [w${id}] frame ${f} (${t.toFixed(3)}s) failed: ${why}; retry ${attempt} in a fresh browser`); await fresh(t); }
            try {
              ctx.errors.length = 0;
              await ctx.page.evaluate((t) => window.seek(t), t);
              const fatal = await ctx.page.evaluate(() => window.__fatal ?? null);
              if (fatal && /shader/i.test(fatal)) throw Object.assign(new Error(fatal), { fatal: true });
              const chk = hasCheck ? await ctx.page.evaluate(() => window.frameCheck()) : { ok: true };
              if (!chk.ok && !(String(chk.why).startsWith('flat') && flatAllowed(t))) { why = chk.why; continue; }
              if (ctx.errors.length) { why = ctx.errors.join(' | ').slice(0, 300); if (/shader/i.test(why)) throw Object.assign(new Error(why), { fatal: true }); continue; }
              const { data } = await ctx.cdp.send('Page.captureScreenshot', { format: 'png', optimizeForSpeed: true });
              png = Buffer.from(data, 'base64');
            } catch (e) {
              if (e.fatal) throw e;
              why = e.message.split('\n')[0];
            }
          }
          if (!png) throw new Error(`frame ${f} (${t.toFixed(3)}s) failed 4 times: ${why}`);
          if (!ff.stdin.write(png)) await new Promise((r) => ff.stdin.once('drain', r));
          framesDone++;
        }
        ff.stdin.end();
        await done;
        const n = ffprobeFrames(tmp);
        if (n !== b - a) { rmSync(tmp, { force: true }); throw new Error(`chunk ${c}: ${n} frames on disk, expected ${b - a}`); }
        renameSync(tmp, chunkFile(c));
        const el = (Date.now() - started) / 1000, rate = framesDone / el, left = todo.reduce((s, k) => s + (range(k)[1] - range(k)[0]), 0) - framesDone;
        console.log(`[w${id}] chunk ${c} frames ${a}-${b - 1} ok in ${((Date.now() - t0) / 1000).toFixed(0)}s  ` +
          `(${rate.toFixed(2)} fps overall, ~${Math.round(left / Math.max(rate, 1e-3) / 60)} min left)`);
      }
    } finally { await browser.close().catch(() => {}); }
  }
  if (todo.length) {
    const results = await Promise.allSettled(Array.from({ length: Math.min(WORKERS, todo.length) }, (_, i) => worker(i + 1)));
    const failed = results.filter((r) => r.status === 'rejected');
    if (failed.length) { queue.length = 0; throw failed[0].reason; }
  }

  // assemble: every chunk of the wanted range must exist and be verified
  const missing = want.filter((c) => !existsSync(chunkFile(c)));
  if (missing.length) { console.log(`not assembling: chunks missing ${missing.join(',')} (render them, e.g. on another machine with --chunks)`); }
  else {
    const list = join(chunkDir, 'list.txt');
    writeFileSync(list, want.map((c) => `file '${chunkFile(c).split('\\').join('/')}'`).join('\n'));
    const expect = want.reduce((s, c) => s + range(c)[1] - range(c)[0], 0);
    const part = want.length === nChunks ? '' : `_${(range(want[0])[0] / FPS).toFixed(1)}-${(range(want.at(-1))[1] / FPS).toFixed(1)}s`;
    const out = join(outDir, `${draft ? 'draft' : 'silent'}_${W}x${H}${part}.mp4`);
    const r = spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', list,
      '-vf', 'scale=out_color_matrix=bt709:out_range=tv,format=yuv420p,setparams=range=tv:colorspace=bt709:color_primaries=bt709:color_trc=bt709',
      '-r', String(FPS), '-c:v', 'libx264', '-crf', draft ? '20' : '14', '-preset', draft ? 'veryfast' : 'slow',
      '-pix_fmt', 'yuv420p', '-movflags', '+faststart', out], { stdio: 'inherit' });
    if (r.status !== 0) throw new Error('assembly encode failed');
    const got = ffprobeFrames(out);
    if (got !== expect) throw new Error(`assembled ${got} frames, expected ${expect}: do not ship this file`);
    console.log(`${out}  (${got} frames verified, ${((Date.now() - started) / 1000).toFixed(0)}s)`);
  }
} catch (e) {
  console.error('RENDER STOPPED:', e.message);
  exitCode = 1;
} finally {
  server.close();
}
process.exit(exitCode);
