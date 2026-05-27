import type { Board, Piece, Position } from "../types";
import { isInsidePalace, pieceAt } from "../helpers";

// ─── Flying-general check ─────────────────────────────────────────────────────
// After the general moves to (toRow, toCol) his original square becomes empty.
// Scan the column: if the two generals have a clear line-of-sight → illegal.
function wouldFlyingGeneral(
  board: Board,
  moving: Piece,
  toRow: number,
  toCol: number,
): boolean {
  // Find opponent general
  let oppRow = -1, oppCol = -1;
  outer: for (let r = 0; r < 10; r++) {
    for (let c = 0; c < 9; c++) {
      const p = board[r][c];
      if (p && p.side !== moving.side && (p.type === "将" || p.type === "帥")) {
        oppRow = r; oppCol = c;
        break outer;
      }
    }
  }
  if (oppRow === -1 || toCol !== oppCol) return false;

  // Capturing the opponent general is a winning move, never block it
  if (toRow === oppRow) return false;

  const minRow = Math.min(toRow, oppRow);
  const maxRow = Math.max(toRow, oppRow);

  for (let r = minRow + 1; r < maxRow; r++) {
    // The moving general vacates its original square
    if (r === moving.row && toCol === moving.col) continue;
    // Any piece in between breaks the line-of-sight → no flying general
    if (board[r][toCol] !== null) return false;
  }
  return true; // clear sight → illegal
}

// ─── General (将 / 帥) ────────────────────────────────────────────────────────
// • Moves 1 step orthogonally
// • Must stay inside palace
// • Cannot expose flying-general (face-to-face with no pieces in between)
export function getGeneralMoves(piece: Piece, board: Board): Position[] {
  const moves: Position[] = [];
  const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]] as const;

  for (const [dr, dc] of dirs) {
    const nr = piece.row + dr;
    const nc = piece.col + dc;

    if (!isInsidePalace(nr, nc, piece.side)) continue;

    const target = pieceAt(board, nr, nc);
    if (target?.side === piece.side) continue;            // blocked by own piece
    if (wouldFlyingGeneral(board, piece, nr, nc)) continue; // flying general

    moves.push({ row: nr, col: nc });
  }
  return moves;
}
