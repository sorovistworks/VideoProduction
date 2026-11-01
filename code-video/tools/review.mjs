// Turn a video into images Claude can look at.
//   node tools/review.mjs projects/<name>/out/final_1920x1080.mp4 [--at 4.2]
// Writes next to the video:
//   contact.png        short videos (<= 15 s): 2 fps, one sheet
//   contact_NN.png     longer videos: one frame every 2 s, 30 per sheet, so the WHOLE video is covered
//   phone.png          15 frames spread over the whole video at 360 px wide (phone readability)
//   strip.png          12 consecutive frames from --at (catch pops, flicker, stepped blur)
//   wave.png           waveform, 300 px per second for short videos, an overview for long ones
//   wave_at.png        10 s of waveform around --at at 300 px per second (hit-on-frame check)
//   loop_check.mp4     the video played twice, to watch the seam
import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, unlinkSync } from 'node:fs';
import { dirname, join } from 'node:path';

const [video, ...rest] = process.argv.slice(2);
if (!video) { console.error('usage: node tools/review.mjs <video> [--at seconds]'); process.exit(1); }
const at = rest.includes('--at') ? Number(rest[rest.indexOf('--at') + 1]) : null;
const out = dirname(video);
const probe = (args) => spawnSync('ffprobe', ['-v', 'error', ...args, video], { encoding: 'utf8' }).stdout.trim();
const secs = Number(probe(['-show_entries', 'format=duration', '-of', 'csv=p=0']));
const hasAudio = !!probe(['-select_streams', 'a', '-show_entries', 'stream=index', '-of', 'csv=p=0']);
const wave = (w, extra = []) => [...extra, '-i', video, '-filter_complex',
  `[0:a]aformat=channel_layouts=mono,showwavespic=s=${w}x240:colors=0x1030c0:scale=sqrt[w];[w]drawgrid=w=${Math.round(w / Math.max(1, Math.round(secs)))}:h=240:color=red@0.8[o]`,
  '-map', '[o]', '-frames:v', '1'];

for (const f of existsSync(out) ? readdirSync(out) : []) if (/^contact_\d+\.png$/.test(f)) unlinkSync(join(out, f));
const jobs = [];
if (secs <= 15) jobs.push(['contact.png', ['-i', video, '-vf', 'fps=2,scale=270:-1,tile=6x5', '-frames:v', '1']]);
else jobs.push(['contact_%02d.png', ['-i', video, '-vf', 'fps=0.5,scale=320:-1,tile=6x5']]);
jobs.push(['phone.png', ['-i', video, '-vf', `fps=${(15 / secs).toFixed(5)},scale=360:-1,tile=5x3`, '-frames:v', '1']]);
jobs.push(['loop_check.mp4', ['-stream_loop', '1', '-i', video, '-c', 'copy']]);
if (at !== null) jobs.push(['strip.png', ['-ss', String(Math.max(0, at - 0.1)), '-i', video, '-vf', 'scale=320:-1,tile=12x1', '-frames:v', '1']]);
if (hasAudio) {
  jobs.push(['wave.png', wave(Math.round(Math.min(secs * 300, 6000)))]);
  if (at !== null) {
    const s0 = Math.max(0, at - 5);
    jobs.push(['wave_at.png', ['-ss', String(s0), '-t', '10', '-i', video, '-filter_complex',
      '[0:a]aformat=channel_layouts=mono,showwavespic=s=3000x240:colors=0x1030c0:scale=sqrt[w];[w]drawgrid=w=300:h=240:color=red@0.8[o]', '-map', '[o]', '-frames:v', '1']]);
  }
}

for (const [name, a] of jobs) {
  const r = spawnSync('ffmpeg', ['-y', '-loglevel', 'error', ...a, join(out, name)], { stdio: 'inherit' });
  if (r.status !== 0) { console.error(`failed: ${name}`); process.exit(1); }
  console.log(name.includes('%') ? join(out, name.replace('%02d', '01..' + String(Math.ceil(secs / 60)).padStart(2, '0'))) : join(out, name));
}
