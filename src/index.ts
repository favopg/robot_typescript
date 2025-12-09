import * as tf from '@tensorflow/tfjs';

// Try to enable native TensorFlow backend if available, but don't crash if missing
async function tryEnableNativeBackend() {
  try {
    // Dynamic import so that absence of optional dependency won't throw at startup
    await import('@tensorflow/tfjs-node');
    // When tfjs-node loads successfully, explicitly switch to the native backend
    // to avoid sticking to a previous backend (e.g., 'cpu' or 'wasm').
    try {
      await tf.setBackend('tensorflow');
      await tf.ready();
      console.log('[tf] tfjs-node loaded. Backend set to tensorflow.');
    } catch (setErr) {
      console.log('[tf] tfjs-node loaded but failed to set backend to tensorflow. Falling back to current backend. Reason:', (setErr as Error)?.message ?? setErr);
    }
  } catch (e) {
    // Fall back to pure JS backend silently but log a concise hint
    console.log('[tf] tfjs-node not available; using pure JS backend. For faster native backend, install Python 3 and build tools, or use a Node version with prebuilt binaries.');
  }
}

async function main() {
  await tryEnableNativeBackend();
  // Ensure backend is initialized even when tfjs-node is not available
  await tf.ready();
  // Verify backend
  const backend = tf.getBackend();
  console.log(`[tf] backend: ${backend}`);

  // Simple sanity check computation
  const a = tf.tensor2d([[1, 2, 3], [4, 5, 6]]);
  const b = tf.tensor2d([[1], [0], [-1]]);
  const c = tf.matMul(a, b);
  c.print();

  // 9x9 Go board placeholder: 3 feature planes (black, white, empty) one-hot
  const size = 9;
  const planes = 3;
  const board = tf.tidy(() => tf.zeros([size, size, planes]));
  console.log(`[go] board tensor shape: ${board.shape}`);

  // Clean up
  a.dispose();
  b.dispose();
  c.dispose();
  board.dispose();

  // Show memory
  console.log('[tf] memory:', tf.memory());

  // --- Minimal 9x9 Go engine demo ---
  const { Game, Color } = await import('./go/engine');
  const game = new Game(9);
  console.log('\n[go] New 9x9 game started. Current player: Black');
  // List legal moves count for Black
  const legalForBlack = game.legalMoves();
  // Remove 'pass' from count when printing grid moves
  const gridMovesCount = legalForBlack.filter((m) => m !== 'pass').length;
  console.log(`[go] Legal moves for Black (excluding pass): ${gridMovesCount}`);

  // Play a simple opening at 4,4 if legal
  const x = 4, y = 4;
  const played = game.play(x, y);
  console.log(`[go] Black plays at (${x}, ${y}): ${played ? 'ok' : 'illegal'}`);
  console.log('[go] Board after move:');
  console.log(game.board.toString());

  // Two passes to end the game
  game.pass(); // White passes
  game.pass(); // Black passes -> game over
  console.log(`[go] Game over: ${game.isOver}`);
}

main().catch((err) => {
  console.error('Error running sample:', err);
  process.exitCode = 1;
});
