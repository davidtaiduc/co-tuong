import type { Board, Piece, Position } from "../types";
import { isInsideBoard, pieceAt } from "../helpers";

// ─── Knight (馬 / 傌) ─────────────────────────────────────────────────────────
// • Moves 1 step orthogonally then 1 step diagonally (L-shape)
// • Blocked when the first orthogonal square ("leg") is occupied
//
// Each path: [legDr, legDc, finalDr, finalDc]
const KNIGHT_PATHS = [
  [-1,  0, -2, -1],
  [-1,  0, -2,  1],
  [ 0,  1, -1,  2],
  [ 0,  1,  1,  2],
  [ 1,  0,  2,  1],
  [ 1,  0,  2, -1],
  [ 0, -1,  1, -2],
  [ 0, -1, -1, -2],
] as const;

export function getKnightMoves(piece: Piece, board: Board): Position[] {
  const moves: Position[] = [];

  for (const [lr, lc, dr, dc] of KNIGHT_PATHS) {
    const legRow = piece.row + lr;
    const legCol = piece.col + lc;
    const toRow  = piece.row + dr;
    const toCol  = piece.col + dc;

    if (!isInsideBoard(toRow, toCol)) continue;

    // Leg must be clear (blocking rule)
    if (pieceAt(board, legRow, legCol) !== null) continue;

    const target = pieceAt(board, toRow, toCol);
    if (target?.side === piece.side) continue;

    moves.push({ row: toRow, col: toCol });
  }
  return moves;
}
