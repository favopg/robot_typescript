// 9x9 Go engine (simplified): legal move generation, captures, suicide rule, end on two consecutive passes

export enum Color {
  Black = 1,
  White = -1,
}

export type Point = { x: number; y: number };

export class Board {
  readonly size: number;
  private grid: number[][]; // 0 empty, 1 black, -1 white

  constructor(size = 9, grid?: number[][]) {
    this.size = size;
    if (grid) {
      this.grid = grid.map((row) => row.slice());
    } else {
      this.grid = Array.from({ length: size }, () => Array(size).fill(0));
    }
  }

  copy(): Board {
    return new Board(this.size, this.grid);
  }

  isOnBoard(x: number, y: number): boolean {
    return x >= 0 && x < this.size && y >= 0 && y < this.size;
  }

  get(x: number, y: number): number {
    return this.grid[y][x];
  }

  set(x: number, y: number, v: number): void {
    this.grid[y][x] = v;
  }

  neighbors(x: number, y: number): Point[] {
    const ns: Point[] = [];
    if (x > 0) ns.push({ x: x - 1, y });
    if (x < this.size - 1) ns.push({ x: x + 1, y });
    if (y > 0) ns.push({ x, y: y - 1 });
    if (y < this.size - 1) ns.push({ x, y: y + 1 });
    return ns;
  }

  // Flood fill to get a group and its liberties
  private groupAndLiberties(x: number, y: number): { stones: Point[]; liberties: number } {
    const color = this.get(x, y);
    if (color === 0) return { stones: [], liberties: 0 };
    const visited = new Set<string>();
    const stones: Point[] = [];
    const seenLib = new Set<string>();
    const key = (p: Point) => `${p.x},${p.y}`;
    const stack: Point[] = [{ x, y }];
    visited.add(key({ x, y }));
    while (stack.length) {
      const p = stack.pop()!;
      stones.push(p);
      for (const n of this.neighbors(p.x, p.y)) {
        const v = this.get(n.x, n.y);
        if (v === 0) {
          seenLib.add(key(n));
        } else if (v === color) {
          const k = key(n);
          if (!visited.has(k)) {
            visited.add(k);
            stack.push(n);
          }
        }
      }
    }
    return { stones, liberties: seenLib.size };
  }

  private removeStones(stones: Point[]): void {
    for (const s of stones) this.set(s.x, s.y, 0);
  }

  // Try to play a move with captures/suicide rule applied. Returns true if legal and applied.
  playMove(color: Color, x: number, y: number): boolean {
    if (!this.isOnBoard(x, y)) return false;
    if (this.get(x, y) !== 0) return false; // cannot play on occupied

    // Place stone tentatively
    this.set(x, y, color);

    // Capture any adjacent opponent groups with zero liberties
    const opp = -color;
    const toCapture: Point[] = [];
    const capturedSet = new Set<string>();
    const k = (p: Point) => `${p.x},${p.y}`;
    for (const n of this.neighbors(x, y)) {
      if (this.get(n.x, n.y) === opp) {
        const info = this.groupAndLiberties(n.x, n.y);
        if (info.liberties === 0) {
          for (const s of info.stones) {
            const ks = k(s);
            if (!capturedSet.has(ks)) {
              capturedSet.add(ks);
              toCapture.push(s);
            }
          }
        }
      }
    }
    if (toCapture.length) {
      this.removeStones(toCapture);
    }

    // Check suicide: after captures, the placed stone group must have at least 1 liberty
    const selfInfo = this.groupAndLiberties(x, y);
    if (selfInfo.liberties === 0) {
      // Illegal: revert and return false
      this.set(x, y, 0);
      return false;
    }

    return true;
  }

  // Determine if playing would be legal by simulating on a copy
  isLegal(color: Color, x: number, y: number): boolean {
    if (!this.isOnBoard(x, y)) return false;
    if (this.get(x, y) !== 0) return false;
    const sim = this.copy();
    // Place
    sim.set(x, y, color);
    const opp = -color;
    // Capture adjacent opponent groups without liberties
    const toCapture: Point[] = [];
    const seen = new Set<string>();
    const key = (p: Point) => `${p.x},${p.y}`;
    for (const n of sim.neighbors(x, y)) {
      if (sim.get(n.x, n.y) === opp) {
        const info = sim.groupAndLiberties(n.x, n.y);
        if (info.liberties === 0) {
          for (const s of info.stones) {
            const ks = key(s);
            if (!seen.has(ks)) {
              seen.add(ks);
              toCapture.push(s);
            }
          }
        }
      }
    }
    if (toCapture.length) sim.removeStones(toCapture);
    const selfInfo = sim.groupAndLiberties(x, y);
    return selfInfo.liberties > 0; // suicide forbidden
  }

  getLegalMoves(color: Color): Point[] {
    const moves: Point[] = [];
    for (let y = 0; y < this.size; y++) {
      for (let x = 0; x < this.size; x++) {
        if (this.get(x, y) === 0 && this.isLegal(color, x, y)) moves.push({ x, y });
      }
    }
    return moves;
  }

  toString(): string {
    // Simple ASCII board: '.' empty, 'X' black, 'O' white
    return this.grid
      .map((row) => row.map((v) => (v === 0 ? '.' : v === 1 ? 'X' : 'O')).join(' '))
      .join('\n');
  }
}

export class Game {
  readonly board: Board;
  private turn: Color;
  private consecutivePasses: number;
  private finished: boolean;

  constructor(size = 9) {
    this.board = new Board(size);
    this.turn = Color.Black;
    this.consecutivePasses = 0;
    this.finished = false;
  }

  get currentPlayer(): Color {
    return this.turn;
  }

  get isOver(): boolean {
    return this.finished;
  }

  pass(): void {
    if (this.finished) return;
    this.consecutivePasses += 1;
    if (this.consecutivePasses >= 2) {
      this.finished = true; // game ends after two consecutive passes
      return;
    }
    this.turn = this.turn === Color.Black ? Color.White : Color.Black;
  }

  play(x: number, y: number): boolean {
    if (this.finished) return false;
    if (!this.board.isLegal(this.turn, x, y)) return false;
    // Apply move on the real board (captures handled inside playMove)
    const applied = this.board.playMove(this.turn, x, y);
    if (!applied) return false;
    this.consecutivePasses = 0;
    this.turn = this.turn === Color.Black ? Color.White : Color.Black;
    return true;
  }

  legalMoves(): (Point | 'pass')[] {
    const pts = this.board.getLegalMoves(this.turn);
    return [...pts, 'pass'];
  }
}
