import type { Board, Piece, Position } from "../types";
import { isInsideBoard, pieceAt } from "../helpers";

// ─── Cannon (砲 / 炮) ─────────────────────────────────────────────────────────
// • Moves like a Rook when NOT capturing (slides through empty squares)
// • Captures by jumping over exactly ONE intervening piece (the "screen")
//   – The captured piece must be enemy
//   – Any second piece in between blocks further capture
export function getCannonMoves(piece: Piece, board: Board): Position[] {
  const moves: Position[] = [];
  const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]] as const;

  for (const [dr, dc] of dirs) {
    let r = piece.row + dr;
    let c = piece.col + dc;
    let screenFound = false;

    while (isInsideBoard(r, c)) {
      const target = pieceAt(board, r, c);

      if (!screenFound) {
        if (target === null) {
          // No screen yet → normal slide move
          moves.push({ row: r, col: c });
        } else {
          // Found the screen — stop sliding, start looking for a capture target
          screenFound = true;
        }
      } else {
        if (target !== null) {
          // First piece after screen: capture if enemy, stop either way
          if (target.side !== piece.side) {
            moves.push({ row: r, col: c });
          }
          break;
        }
        // Empty square after screen — keep scanning
      }

      r += dr;
      c += dc;
    }
  }
  return moves;
}
