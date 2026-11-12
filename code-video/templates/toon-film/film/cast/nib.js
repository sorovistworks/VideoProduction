// CHARACTER TEAM owns this file. Nib: a small pear-shaped mole in a red beanie. Original character (template sample).
// One base shape (a pear) and a clear silhouette (pear + pom-pom + stubby arms + big feet). Eyes are separate meshes with real
// eyelid shells; the mouth is a carved cavity driven by the voice (lips.mouth) or by the animator's pose.
//
// pose = { puff 0..1, raiseL, raiseR (rad, 0 = arm down), fwdL, fwdR, open 0..1, wide -1..1, squash, lean (rad),
//          blink 0..1, gazeX, gazeY (rad) }
// SDF-relevant values mesh once per pose (cached); eyes, lids and the root transform are posed per sub-render.
import * as THREE from 'three';
import { Sculpt, SdfCharacter, ellipsoid, sphere, capsule, torus, roundBox, cellFor } from '/engine/toon/sdf.js';
import { toonMaterial, toonFlat, addInk, setGeometry } from '/engine/toon/shade.js';

export const NIB_COLORS = { fur: '#8c8296', belly: '#ecd6b2', hat: '#d8463a', nose: '#ec8f8a', feet: '#e9a98f',
  mouth: '#4a1a22', base: '#8c8296' };
export const NIB_HEIGHT = 1.1;

function arm(s, side, raise, fwd, puff) {
  const S = [side * (0.3 + 0.04 * puff), 0.55, 0.04];
  let d = [side * Math.sin(raise), -Math.cos(raise), 0];
  d = [d[0], d[1] * Math.cos(fwd), -d[1] * Math.sin(fwd) + 0.0001];
  const L = 0.27, H = S.map((v, i) => v + d[i] * L);
  s.add(capsule(S, H, 0.068, 0.056), { k: 0.06, paint: 'fur' });
  s.add(sphere(H.map((v, i) => v + d[i] * 0.04), 0.07), { k: 0.03, paint: 'feet' });
}

function build(p) {
  const s = new Sculpt(), f = 1 + 0.18 * p.puff, sq = p.squash ?? 0;
  const sy = 1 - 0.12 * sq, sx = 1 + 0.08 * sq;
  s.add(ellipsoid([0, 0.52 * sy, 0], [0.37 * f * sx, 0.5 * sy, 0.33 * f * sx]), { paint: 'fur' });          // head-body
  s.add(ellipsoid([0, 0.33 * sy, 0.01], [0.44 * f * sx, 0.31 * sy, 0.4 * f * sx]), { k: 0.16, paint: 'fur' }); // pear bottom
  s.add(sphere([0, 0.665 * sy, 0.35 * f], 0.072), { k: 0.035, paint: 'nose' });
  for (const side of [-1, 1]) {
    s.add(ellipsoid([side * 0.16, 0.05, 0.13], [0.115, 0.06, 0.16]), { k: 0.05, paint: 'feet' });          // feet
  }
  arm(s, -1, p.raiseL, p.fwdL, p.puff);
  arm(s, 1, p.raiseR, p.fwdR, p.puff);
  s.add(sphere([0, 1.08 * sy, -0.02], 0.095), { k: 0.012, paint: 'hat' });                                   // pom-pom
  s.add(torus([0, 0.81 * sy, 0], 0.285 * f, 0.036), { k: 0.012, paint: 'hat' });                           // rolled brim
  s.paint('belly', ellipsoid([0, 0.3 * sy, 0.32 * f], [0.25 * f, 0.2, 0.2]));
  s.paint('hat', roundBox([0, 1.1 * sy, 0], [0.7, 0.29, 0.7], 0));
  // mouth: a carved cavity, painted inside, lip line on the rim
  const open = p.open ?? 0, wide = p.wide ?? 0;
  s.cut(ellipsoid([0, 0.555 * sy, 0.31 * f], [0.058 + 0.035 * wide + 0.02 * open, 0.016 + 0.07 * open, 0.07]), { k: 0.012, paint: 'mouth' });
  // faces borrow shading from the smooth head: one clean light/shadow edge, no bumps from nose and mouth
  s.shadeFrom(ellipsoid([0, 0.55 * sy, 0], [0.37 * f, 0.5 * sy, 0.33 * f]), sphere([0, 0.62, 0.25], 0.2), 0.08);
  return s;
}

export function createNib() {
  const sdf = new SdfCharacter(build, { colors: NIB_COLORS });
  const root = new THREE.Group();            // world placement (animators move this)
  const body = new THREE.Mesh(new THREE.BufferGeometry(), toonMaterial());
  body.castShadow = true; body.receiveShadow = true;
  root.add(body);
  addInk(body, 2.4);

  const white = toonFlat('#fbf6ee'), iris = toonFlat('#3b2516'), black = new THREE.MeshBasicMaterial({ color: 0x0b0608 });
  const shine = new THREE.MeshBasicMaterial({ color: 0xffffff }), lidMat = toonFlat(NIB_COLORS.fur);
  lidMat.side = THREE.DoubleSide;
  const eyes = [-1, 1].map((side) => {
    const g = new THREE.Group();
    g.position.set(side * 0.118, 0.745, 0.245);
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.086, 32, 16), white);
    const look = new THREE.Group();
    const ir = new THREE.Mesh(new THREE.SphereGeometry(0.052, 24, 12), iris); ir.scale.z = 0.45; ir.position.z = 0.068;
    const pu = new THREE.Mesh(new THREE.SphereGeometry(0.03, 20, 10), black); pu.scale.z = 0.45; pu.position.z = 0.08;
    const hi = new THREE.Mesh(new THREE.SphereGeometry(0.011, 10, 6), shine); hi.position.set(0.018, 0.022, 0.088);
    look.add(ir, pu, hi);
    const lid = new THREE.Mesh(new THREE.SphereGeometry(0.093, 32, 12, 0, Math.PI * 2, 0, Math.PI / 2), lidMat);
    const lidLow = new THREE.Mesh(new THREE.SphereGeometry(0.091, 32, 8, 0, Math.PI * 2, Math.PI * 0.62, Math.PI * 0.38), lidMat);
    addInk(ball, 1.8); addInk(lid, 1.8);
    g.add(ball, look, lid, lidLow);
    ball.castShadow = lid.castShadow = true;
    body.add(g);
    return { g, look, lid };
  });

  return {
    root, body, sdf,
    // per sub-render: meshPose comes from the frame time (cached mesh), live from the sample time (eyes, lids)
    pose(meshPose, live, { screenPx = 300 } = {}) {
      const cell = cellFor(screenPx, NIB_HEIGHT);
      setGeometry(body, sdf.geometry(meshPose, { cell }));
      const sy = 1 - 0.12 * (meshPose.squash ?? 0), f = 1 + 0.18 * meshPose.puff;
      for (const [i, e] of eyes.entries()) {
        e.g.position.set((i ? 1 : -1) * 0.118 * f, 0.745 * sy, 0.245 * f);
        e.look.rotation.set(-(live.gazeY ?? 0), live.gazeX ?? 0, 0);
        e.lid.rotation.x = THREE.MathUtils.lerp(-1.25, 1.62, live.blink ?? 0);
      }
      root.rotation.z = 0;
      body.rotation.x = live.lean ?? 0;
    },
  };
}
