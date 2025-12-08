// Minimal SGF utilities for 9x9 Go (main line only)
// This parser is intentionally simple: it extracts board size (SZ), result (RE),
// and the main move sequence consisting of B[] / W[] nodes. Variations, setup
// stones (AB/AW), and comments are ignored.

export type ParsedMove = { color: 'B' | 'W'; x: number | null; y: number | null };
export type ParsedGame = { size: number; moves: ParsedMove[]; result?: string };

// Convert SGF coordinate like 'aa'..'ii' to 0-based x,y. Empty string means pass.
function coordToXY(coord: string): { x: number | null; y: number | null } {
  if (!coord || coord.length < 2) return { x: null, y: null }; // pass
  const aCode = 'a'.charCodeAt(0);
  const x = coord.charCodeAt(0) - aCode;
  const y = coord.charCodeAt(1) - aCode;
  if (x < 0 || y < 0) return { x: null, y: null };
  return { x, y };
}

export function parseSgf(text: string): ParsedGame {
  // Normalize whitespace
  const sgf = text.replace(/\r\n?/g, '\n');

  // Extract root properties from the first node
  const rootMatch = sgf.match(/\(;([^)]*)/);
  const root = rootMatch ? rootMatch[1] : '';
  const size = (() => {
    const m = root.match(/SZ\[(\d+)\]/i);
    const v = m ? parseInt(m[1], 10) : 19;
    return Number.isFinite(v) ? v : 19;
  })();
  const result = (() => {
    const m = root.match(/RE\[([^\]]*)\]/i);
    return m ? m[1] : undefined;
  })();

  // Extract main sequence moves ;B[..];W[..] ignoring variations
  // We remove any variation trees by discarding content within ( ... ) that is not the main line.
  // A simple approach: take the first sequence of nodes starting from the initial '(' to the matching ')'
  // and then scan for ;B[...] or ;W[...]
  const moves: ParsedMove[] = [];
  const nodeRegex = /;\s*([BW])\[([^\]]*)\]/gi;
  let m: RegExpExecArray | null;
  while ((m = nodeRegex.exec(sgf)) !== null) {
    const color = m[1] as 'B' | 'W';
    const coord = m[2] || '';
    const { x, y } = coordToXY(coord);
    moves.push({ color, x, y });
  }

  return { size, moves, result };
}

export function resultToValue(re?: string): number {
  if (!re) return 0;
  const s = re.toUpperCase();
  if (s.startsWith('B+')) return 1;
  if (s.startsWith('W+')) return -1;
  return 0;
}
