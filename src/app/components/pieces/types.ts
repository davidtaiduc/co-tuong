export type PieceSide = "red" | "black";

export interface PieceProps {
  x: number;
  y: number;
  side: PieceSide;
  selected: boolean;
}

// Shared radius — change this one value to resize all pieces uniformly
export const PIECE_R = 0.83;
