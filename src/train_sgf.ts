import * as fs from 'node:fs';
import * as path from 'node:path';
import * as tf from '@tensorflow/tfjs';
import { buildPolicyValueModel } from './model/policy_value';
import { buildDatasetFromSgfTexts, listSgfFilesInDir } from './data/dataset';

async function tryEnableNativeBackend() {
  try {
    // Use require to avoid TypeScript module resolution error when the optional
    // dependency is not installed. At runtime, if present, this will load tfjs-node.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    require('@tensorflow/tfjs-node');
    try {
      await tf.setBackend('tensorflow');
      await tf.ready();
      console.log('[tf] tfjs-node loaded. Backend set to tensorflow.');
    } catch (e) {
      console.log('[tf] tfjs-node loaded but failed to set backend:', (e as Error)?.message ?? e);
    }
  } catch {
    console.log('[tf] tfjs-node not available; training will use pure JS backend. It may be slow.');
  }
}

function readSgfInputs(inputPath: string): string[] {
  const p = path.resolve(inputPath);
  const stat = fs.statSync(p);
  if (stat.isDirectory()) {
    const files = listSgfFilesInDir(p);
    return files.map((f) => fs.readFileSync(f, 'utf8'));
  } else if (stat.isFile()) {
    return [fs.readFileSync(p, 'utf8')];
  }
  throw new Error(`Path is neither file nor directory: ${p}`);
}

// Resolve the SGF input path. If the provided path does not exist, fall back to src/data/sgf9 per project layout.
function resolveInputPath(argPath?: string): string {
  const preferred = argPath ?? '';
  const fallback = path.resolve('src', 'data', 'sgf9');

  if (preferred) {
    const abs = path.resolve(preferred);
    if (fs.existsSync(abs)) return abs;
    // If the user passed something like data\sgf9, try mapping to src\data\sgf9
    const maybeSrc = path.resolve('src', preferred);
    if (fs.existsSync(maybeSrc)) return maybeSrc;
  }

  if (fs.existsSync(fallback)) return fallback;
  throw new Error(
    `SGF input path not found. Tried: ${preferred ? path.resolve(preferred) + ', ' : ''}${preferred ? path.resolve('src', preferred) + ', ' : ''}${fallback}`
  );
}

async function main() {
  await tryEnableNativeBackend();
  console.log(`[tf] backend: ${tf.getBackend()}`);

  const args = process.argv.slice(2);
  // Resolve input path; default/fallback is src/data/sgf9
  const inPath = resolveInputPath(args[0]);
  const epochs = Number(args[1] ?? 5);
  const batchSize = Number(args[2] ?? 128);
  const outDir = String(args[3] ?? 'models');

  console.log(`[data] Using SGF input path: ${inPath}`);
  const sgfTexts = readSgfInputs(inPath);
  console.log(`[data] Loaded SGF texts: ${sgfTexts.length}`);

  const { X, YpIdx, Yv, channels, samples } = buildDatasetFromSgfTexts(sgfTexts);
  if (samples === 0) {
    console.log('[data] No 9x9 samples found. Abort.');
    return;
  }
  const YpOH = tf.oneHot(YpIdx, 82).toFloat();

  const model = buildPolicyValueModel(channels);
  model.summary(100);

  console.log(`[train] samples=${samples}, epochs=${epochs}, batchSize=${batchSize}`);
  await model.fit(X, [YpOH, Yv], {
    epochs,
    batchSize,
    shuffle: true,
    validationSplit: samples >= 10 ? 0.1 : 0.0,
    callbacks: {
      onEpochEnd: async (epoch, logs) => {
        const totalLoss = typeof logs?.loss === 'number' ? logs!.loss.toFixed(4) : String(logs?.loss ?? 'n/a');
        console.log(`Epoch ${epoch + 1}: loss=${totalLoss}`);
      },
    },
  });

  // Try to save if file IO is available (tfjs-node)
  try {
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const savePath = `file://${path.resolve(outDir)}/pv-${stamp}`;
    await fs.promises.mkdir(path.resolve(outDir), { recursive: true });
    await model.save(savePath);
    console.log(`[save] Model saved to ${savePath}`);
  } catch (e) {
    console.log('[save] Skipped saving model (likely tfjs-node not available). Reason:', (e as Error)?.message ?? e);
  }

  X.dispose();
  YpIdx.dispose();
  YpOH.dispose();
  Yv.dispose();
}

main().catch((err) => {
  console.error('[train] Error:', err);
  process.exitCode = 1;
});
