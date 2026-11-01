// Mux the mix onto every rendered format and master it to -14 LUFS / -1 dBTP.
//   node tools/finish.mjs projects/<name> [--audio audio/mix.wav] [--lufs -14] [--tp -1]
// Reads out/silent_*.mp4, writes out/final_*.mp4, and prints the measured loudness of each.
// Mastering = gain + oversampled peak limiter, re-measured and corrected until on target.
// (loudnorm alone falls back to dynamic mode on punchy mixes and lands ~2 LU short.)
import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const [dir, ...rest] = process.argv.slice(2);
if (!dir) { console.error('usage: node tools/finish.mjs projects/<name> [--audio file] [--lufs -14] [--tp -1]'); process.exit(1); }
const flag = (k, d) => (rest.includes('--' + k) ? rest[rest.indexOf('--' + k) + 1] : d);
const audio = join(dir, flag('audio', 'audio/mix.wav'));
const I = Number(flag('lufs', -14)), TP = Number(flag('tp', -1));
const out = join(dir, 'out');

if (!existsSync(audio)) { console.error(`missing ${audio}`); process.exit(1); }
const videos = existsSync(out) ? readdirSync(out).filter((f) => /^silent_.*\.mp4$/.test(f)) : [];
if (!videos.length) { console.error(`no out/silent_*.mp4 in ${dir}: render first`); process.exit(1); }

const ff = (args) => {
  const r = spawnSync('ffmpeg', ['-hide_banner', '-nostats', ...args], { encoding: 'utf8', maxBuffer: 64 << 20 });
  if (r.status !== 0) { console.error(r.stderr); process.exit(1); }
  return r.stderr;
};
const last = (s, re) => Number([...s.matchAll(re)].pop()[1]);
const measure = (input, chain = '', map = []) => {
  const s = ff(['-i', input, ...map, '-af', `${chain ? chain + ',' : ''}ebur128=peak=true`, '-f', 'null', '-']);
  return { lufs: last(s, /I:\s+(-?[\d.]+) LUFS/g), peak: last(s, /Peak:\s+(-?[\d.]+) dBFS/g) };
};
// 0.5 dB of headroom under TP: AAC encoding adds a little true peak.
const ceiling = 10 ** ((TP - 0.5) / 20);
const master = (gain) => `volume=${gain.toFixed(2)}dB,aresample=192000,` +
  `alimiter=limit=${ceiling.toFixed(4)}:attack=1:release=60:level=false,aresample=48000`;

let gain = I - measure(audio).lufs;
for (let k = 0; k < 4; k++) {
  const m = measure(audio, master(gain));
  if (Math.abs(m.lufs - I) < 0.15) break;
  gain += I - m.lufs;
}

let failed = false;
for (const v of videos) {
  const final = join(out, v.replace(/^silent_/, 'final_'));
  ff(['-y', '-i', join(out, v), '-i', audio, '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-af', master(gain),
    '-ac', '2', '-c:a', 'aac', '-b:a', '320k', '-shortest', '-movflags', '+faststart', final]);
  const m = measure(final, '', ['-map', '0:a']);
  const ok = Math.abs(m.lufs - I) <= 0.5 && m.peak <= TP;
  failed ||= !ok;
  console.log(`${final}  ${m.lufs} LUFS, true peak ${m.peak} dBTP  ${ok ? 'OK' : `CHECK: target ${I} LUFS / ${TP} dBTP`}`);
}
process.exit(failed ? 1 : 0);
