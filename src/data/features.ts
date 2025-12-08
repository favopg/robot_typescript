import * as tf from '@tensorflow/tfjs';
import { Board, Color } from '../go/engine';

// Encode board into [9,9,C] float32 tensor. Minimal planes: black, white, toPlay.
export function encodeBoard(board: Board, toPlay: Color) {
  const S = board.size;
  const C = 3;
  const arr = new Float32Array(S * S * C);
  let idx = 0;
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const v = board.get(x, y);
      arr[idx + 0] = v === 1 ? 1 : 0; // black
      arr[idx + 1] = v === -1 ? 1 : 0; // white
      arr[idx + 2] = toPlay === Color.Black ? 1 : 0; // toPlay plane is all-ones for black, zeros for white
      idx += C;
    }
  }
  return tf.tensor3d(arr, [S, S, C]);
}

export function policyIndexFromXY(x: number, y: number): number {
  return y * 9 + x; // 0..80 for 9x9
}
