import * as fs from 'node:fs';
import * as path from 'node:path';
import * as tf from '@tensorflow/tfjs';
import { Game, Color } from '../go/engine';
import { parseSgf, resultToValue } from './sgf';
import { encodeBoard, policyIndexFromXY } from './features';

export type BuiltDataset = {
  X: tf.Tensor4D; // [N,9,9,C]
  YpIdx: tf.Tensor1D; // [N] int32 indices 0..81
  Yv: tf.Tensor2D; // [N,1]
  channels: number; // C
  samples: number; // N
};

export function listSgfFilesInDir(dir: string): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  return entries
    .filter((e) => e.isFile() && e.name.toLowerCase().endsWith('.sgf'))
    .map((e) => path.join(dir, e.name));
}

export function buildDatasetFromSgfTexts(texts: string[]): BuiltDataset {
  const xs: tf.Tensor3D[] = [];
  const yPolicyIdx: number[] = [];
  const yValue: number[] = [];
  let channels = 3;

  for (const txt of texts) {
    const parsed = parseSgf(txt);
    if (parsed.size !== 9) continue; // only 9x9
    const game = new Game(9);
    const v = resultToValue(parsed.result);

    for (const mv of parsed.moves) {
      const toPlay = game.currentPlayer;
      // snapshot features BEFORE applying the move
      const feat = encodeBoard(game.board, toPlay); // [9,9,3]
      channels = feat.shape[2];

      if (mv.x == null || mv.y == null) {
        // pass
        xs.push(feat);
        yPolicyIdx.push(81); // pass index
        yValue.push(v);
        game.pass();
        continue;
      }

      // record sample
      xs.push(feat);
      yPolicyIdx.push(policyIndexFromXY(mv.x, mv.y));
      yValue.push(v);

      // apply move; if illegal (due to rules mismatch), skip applying
      const ok = game.play(mv.x, mv.y);
      if (!ok) {
        // ignore and continue; features/labels already captured
      }
    }
  }

  if (xs.length === 0) {
    // Return empty tensors to avoid runtime errors
    const X = tf.tensor4d([], [0, 9, 9, channels]);
    const YpIdx = tf.tensor1d([], 'int32');
    const Yv = tf.tensor2d([], [0, 1]);
    return { X, YpIdx, Yv, channels, samples: 0 };
  }

  const X = tf.stack(xs) as tf.Tensor4D; // [N,9,9,C]
  const YpIdx = tf.tensor1d(yPolicyIdx, 'int32');
  const Yv = tf.tensor2d(yValue.map((v) => [v]), [yValue.length, 1], 'float32');
  xs.forEach((t) => t.dispose());
  return { X, YpIdx, Yv, channels, samples: X.shape[0] };
}
