import type { Board, Piece, Position } from "../types";
import { isInsideBoard, isRiverCrossed, pieceAt } from "../helpers";

// ─── Elephant (象 / 相) ───────────────────────────────────────────────────────
// • Moves exactly 2 steps diagonally (not 1!)
// • Cannot cross the river
// • Blocked when the intermediate square ("elephant's eye") is occupied
//
// Each path: [eyeDr, eyeDc, finalDr, finalDc]
const ELEPHANT_PATHS = [
  [-1, -1, -2, -2],
  [-1,  1, -2,  2],
  [ 1, -1,  2, -2],
  [ 1,  1,  2,  2],
] as const;

export function getElephantMoves(piece: Piece, board: Board): Position[] {
  const moves: Position[] = [];

  for (const [er, ec, dr, dc] of ELEPHANT_PATHS) {
    const eyeRow = piece.row + er;
    const eyeCol = piece.col + ec;
    const toRow  = piece.row + dr;
    const toCol  = piece.col + dc;

    if (!isInsideBoard(toRow, toCol)) continue;

    // Cannot cross the river
    if (isRiverCrossed(toRow, piece.side)) continue;

    // Elephant's eye must be empty
    if (pieceAt(board, eyeRow, eyeCol) !== null) continue;

    const target = pieceAt(board, toRow, toCol);
    if (target?.side === piece.side) continue;

    moves.push({ row: toRow, col: toCol });
  }
  return moves;
}
