import type { Board, Piece, Position } from "../types";
import { isInsideBoard, isRiverCrossed, pieceAt } from "../helpers";

// ─── Pawn (兵 / 卒) ───────────────────────────────────────────────────────────
// Before crossing river:
//   • Can only move forward 1 step
// After crossing river:
//   • Can move forward 1 step
//   • Can move sideways (left or right) 1 step
//   • Cannot move backward under any circumstances
//
// "Forward":
//   Red   → decreasing row (moving up toward black side)
//   Black → increasing row (moving down toward red side)
export function getPawnMoves(piece: Piece, board: Board): Position[] {
  const moves: Position[] = [];
  const crossed = isRiverCrossed(piece.row, piece.side);
  const fwd = piece.side === "red" ? -1 : 1; // row delta for forward

  const candidates: [number, number][] = [
    [fwd, 0],       // always: forward
    ...(crossed ? [[0, -1], [0, 1]] as [number, number][] : []), // after river: sideways
  ];

  for (const [dr, dc] of candidates) {
    const nr = piece.row + dr;
    const nc = piece.col + dc;

    if (!isInsideBoard(nr, nc)) continue;

    const target = pieceAt(board, nr, nc);
    if (target?.side === piece.side) continue; // cannot take own piece

    moves.push({ row: nr, col: nc });
  }
  return moves;
}
