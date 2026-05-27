import type { Board, Piece, Position } from "../types";
import { isInsideBoard, pieceAt } from "../helpers";

// ─── Rook / Chariot (車 / 俥) ─────────────────────────────────────────────────
// • Slides orthogonally any number of squares
// • Cannot jump over any piece
// • Can capture the first enemy piece it reaches
export function getRookMoves(piece: Piece, board: Board): Position[] {
  const moves: Position[] = [];
  const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]] as const;

  for (const [dr, dc] of dirs) {
    let r = piece.row + dr;
    let c = piece.col + dc;

    while (isInsideBoard(r, c)) {
      const target = pieceAt(board, r, c);
      if (target === null) {
        moves.push({ row: r, col: c });
      } else {
        if (target.side !== piece.side) {
          moves.push({ row: r, col: c }); // can capture enemy
        }
        break; // blocked regardless of piece colour
      }
      r += dr;
      c += dc;
    }
  }
  return moves;
}
