import type { Board, Piece, Position } from "../types";
import { isInsidePalace, pieceAt } from "../helpers";

// ─── Advisor (士 / 仕) ────────────────────────────────────────────────────────
// • Moves exactly 1 step diagonally
// • Must stay inside the palace
export function getAdvisorMoves(piece: Piece, board: Board): Position[] {
  const moves: Position[] = [];
  const diags = [[-1, -1], [-1, 1], [1, -1], [1, 1]] as const;

  for (const [dr, dc] of diags) {
    const nr = piece.row + dr;
    const nc = piece.col + dc;

    if (!isInsidePalace(nr, nc, piece.side)) continue;

    const target = pieceAt(board, nr, nc);
    if (target?.side === piece.side) continue;

    moves.push({ row: nr, col: nc });
  }
  return moves;
}
