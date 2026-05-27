import type { Board, Piece, PieceSide } from "./types";

export const BOARD_ROWS = 10;
export const BOARD_COLS = 9;

// ── Boundary checks ───────────────────────────────────────────────────────────

export function isInsideBoard(row: number, col: number): boolean {
  return row >= 0 && row < BOARD_ROWS && col >= 0 && col < BOARD_COLS;
}

// Palace cols 3-5; rows 0-2 for black, rows 7-9 for red
export function isInsidePalace(
  row: number,
  col: number,
  side: PieceSide
): boolean {

  // ngoài bàn
  if (!isInsideBoard(row, col)) {
    return false;
  }

  // cột cung
  if (col < 3 || col > 5) {
    return false;
  }

  // cung đen
  if (side === "black") {
    return row >= 0 && row <= 2;
  }

  // cung đỏ
  return row >= 7 && row <= 9;
}

// Returns true when a piece has crossed the river into enemy territory
// Red starts rows 5-9 → crossed when row <= 4
// Black starts rows 0-4 → crossed when row >= 5
export function isRiverCrossed(row: number, side: PieceSide): boolean {
  return side === "red" ? row <= 4 : row >= 5;
}

// ── Piece queries ─────────────────────────────────────────────────────────────

export function isEnemyPiece(piece: Piece, side: PieceSide): boolean {
  return piece.side !== side;
}

export function pieceAt(board: Board, row: number, col: number): Piece | null {
  if (!isInsideBoard(row, col)) return null;
  return board[row][col];
}

// Build a 2-D board snapshot from a flat piece array (O(n))
export function buildBoard(pieces: Piece[]): Board {
  const board: Board = Array.from({ length: BOARD_ROWS }, () =>
    new Array<Piece | null>(BOARD_COLS).fill(null)
  );
  for (const p of pieces) {
    board[p.row][p.col] = p;
  }
  return board;
}
