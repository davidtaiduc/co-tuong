// ─── Core domain types ────────────────────────────────────────────────────────

export type PieceSide = "red" | "black";

export type PieceType =
  | "将" | "帥"   // General
  | "士" | "仕"   // Advisor
  | "象" | "相"   // Elephant
  | "馬" | "傌"   // Knight
  | "車" | "俥"   // Rook
  | "砲" | "炮"   // Cannon
  | "兵" | "卒";  // Pawn

export interface Piece {
  id: string;
  type: PieceType;
  side: PieceSide;
  row: number;
  col: number;
}

export interface Position {
  row: number;
  col: number;
}

// board[row][col], row 0 = top (black side), row 9 = bottom (red side)
export type Board = (Piece | null)[][];
