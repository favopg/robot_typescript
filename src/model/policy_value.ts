import * as tf from '@tensorflow/tfjs';

// Build a small dual-head CNN for 9x9 inputs with C channels
export function buildPolicyValueModel(C = 3): tf.LayersModel {
  const input = tf.input({ shape: [9, 9, C] });
  const x1 = tf.layers
    .conv2d({ filters: 32, kernelSize: 3, padding: 'same', activation: 'relu' })
    .apply(input) as tf.SymbolicTensor;
  const x2 = tf.layers
    .conv2d({ filters: 32, kernelSize: 3, padding: 'same', activation: 'relu' })
    .apply(x1) as tf.SymbolicTensor;

  // Policy head: outputs 82 logits (81 points + pass)
  const p1 = tf.layers.conv2d({ filters: 2, kernelSize: 1, activation: 'relu' }).apply(x2) as tf.SymbolicTensor;
  const pFlat = tf.layers.flatten().apply(p1) as tf.SymbolicTensor;
  const pLogits = tf.layers.dense({ units: 82 }).apply(pFlat) as tf.SymbolicTensor;
  const pOut = tf.layers.softmax().apply(pLogits) as tf.SymbolicTensor;

  // Value head: outputs scalar in [-1,1]
  const v1 = tf.layers.conv2d({ filters: 1, kernelSize: 1, activation: 'relu' }).apply(x2) as tf.SymbolicTensor;
  const vFlat = tf.layers.flatten().apply(v1) as tf.SymbolicTensor;
  const vHidden = tf.layers.dense({ units: 64, activation: 'relu' }).apply(vFlat) as tf.SymbolicTensor;
  const vOut = tf.layers.dense({ units: 1, activation: 'tanh' }).apply(vHidden) as tf.SymbolicTensor;

  const model = tf.model({ inputs: input, outputs: [pOut, vOut] });
  // Use string loss names compatible with softmax probabilities and scalar value.
  // Do not set metrics for multi-output to avoid runtime issues when mapping metrics.
  model.compile({
    optimizer: tf.train.adam(1e-3),
    loss: ['categoricalCrossentropy', 'meanSquaredError'],
  });
  return model;
}
