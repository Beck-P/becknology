// A racehorse and jockey, side on, galloping: drawn into small canvases per coat, silks and frame (4 frames).
import { baked, PAL } from './pix.js';

const COATS = [
  { a: '#8a4a22', b: '#5a2e12', m: '#2a1408' },   // bay
  { a: '#b86a30', b: '#844818', m: '#5a2e10' },   // chestnut
  { a: '#2a2430', b: '#16121c', m: '#08060c' },   // black
  { a: '#c8c4d0', b: '#8a8698', m: '#4a4658' },   // grey
  { a: '#e0c070', b: '#a88a40', m: '#f4ecd0' },   // palomino
  { a: '#6a4030', b: '#40261a', m: '#1a0e08' },   // brown
];
const k = '#0c0814';
// legs: [x of hip, swing] per frame for back pair and front pair
const LEGS = [
  [[-3, 2], [3, -2]],
  [[-1, 0], [1, 0]],
  [[2, -3], [-2, 3]],
  [[0, -1], [0, 1]],
];

/** 26 × 20 frame: the horse's nose to the right, feet on the bottom row. */
export function horse(coatIdx, silk, frame) {
  const C = COATS[coatIdx % COATS.length];
  return baked('horse' + coatIdx + silk + frame, 26, 20, (g) => {
    const px = (x, y, c) => { g.fillStyle = c; g.fillRect(x, y, 1, 1); };
    const rectf = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
    const lg = LEGS[frame % 4];
    // legs (behind the body), each two segments
    const leg = (hx, sw, far) => {
      const col = far ? C.b : C.a;
      for (let i = 0; i < 4; i++) px(hx + Math.round((sw * i) / 4), 13 + i, col);
      for (let i = 0; i < 3; i++) px(hx + sw + Math.round((-sw * i) / 3) + (i === 2 ? 0 : 0), 17 + i, i === 2 ? k : col);
    };
    leg(7 + lg[0][0], lg[0][1], true); leg(17 + lg[1][0], lg[1][1], true);
    // tail
    const tw = frame % 2 ? 1 : 0;
    rectf(2, 8 + tw, 3, 1, C.m); rectf(1, 9 + tw, 2, 2, C.m); px(0, 11 + tw, C.m);
    // body
    rectf(5, 8, 14, 1, k); rectf(4, 9, 16, 4, k); rectf(5, 13, 14, 1, k);
    rectf(5, 9, 14, 4, C.a); rectf(5, 12, 14, 1, C.b); rectf(6, 9, 10, 1, '#ffffff22');
    // saddle cloth in the silks, with the number band
    rectf(9, 9, 5, 3, silk); rectf(9, 11, 5, 1, '#ffffff');
    // neck and head
    rectf(18, 6, 3, 4, k); rectf(19, 4, 3, 3, k); rectf(21, 4, 4, 3, k);
    rectf(18, 7, 2, 3, C.a); rectf(19, 5, 2, 3, C.a); rectf(21, 5, 3, 1, C.a); rectf(22, 6, 2, 1, C.b);
    px(20, 3, k); px(21, 3, C.a);                 // ear
    px(22, 5, k);                                  // eye
    rectf(18, 4, 1, 3, C.m);                       // mane
    // near legs (in front)
    leg(9 + lg[1][0], lg[0][1], false); leg(18 + lg[0][0], lg[1][1], false);
    // jockey: crouched over the withers in the silks
    rectf(12, 2, 4, 1, k); rectf(11, 3, 6, 4, k);
    rectf(12, 3, 4, 3, silk); rectf(12, 3, 4, 1, '#ffffff55');
    rectf(16, 1, 3, 3, k); rectf(16, 1, 3, 2, silk); px(18, 3, '#f0c8a0');   // cap and face
    rectf(16, 5, 3, 1, silk); px(19, 5, '#f0c8a0');                            // arm to the reins
    rectf(13, 7, 2, 2, '#f4f0e6');                                              // breeches
  });
}
export { PAL };
