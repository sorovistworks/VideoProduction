// Mouths driven by the voice tracks. tools/lipsync.py measures each line (loudness opens the mouth, the share of
// high frequencies makes it wider, low makes it rounder), places it on the film timeline, leads the sound by one frame
// and closes the mouth at the end of every phrase. This reads its docs/lipsync.json. Owned by the character team.
//
//   const lips = await loadLipsync('docs/lipsync.json');
//   const { open, wide } = lips.mouth('pip', t);         // open 0..1, wide -1 (round "oo") .. 1 (wide "ee")
export async function loadLipsync(url) {
  let data = { fps: 24, tracks: {} };
  try { const r = await fetch(url); if (r.ok) data = await r.json(); } catch { /* no voices yet: mouths stay shut */ }
  const fps = data.fps;
  return {
    data,
    mouth(who, t) {
      const tr = data.tracks[who];
      if (!tr) return { open: 0, wide: 0 };
      const f = t * fps, i = Math.floor(f), u = f - i;
      const at = (k) => tr[k] ?? [0, 0];
      const a = at(i), b = at(i + 1);
      return { open: a[0] + (b[0] - a[0]) * u, wide: a[1] + (b[1] - a[1]) * u };
    },
    speaking(who, t) { return (data.tracks[who]?.[Math.round(t * fps)]?.[0] ?? 0) > 0.05; },
  };
}
