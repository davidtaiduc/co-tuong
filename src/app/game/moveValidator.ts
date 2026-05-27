import type {
  Board,
  Piece,
  PieceType,
  Position,
} from "./types";

import {
  getGeneralMoves,
  getAdvisorMoves,
  getElephantMoves,
  getKnightMoves,
  getRookMoves,
  getCannonMoves,
  getPawnMoves,
} from "./moves";

import {
  simulateMove,
  isCheck,
} from "./checkDetection";

type MoveFunction =
  (
    piece: Piece,
    board: Board
  ) => Position[];

/**
 * Dispatch table
 */
const MOVE_MAP:
Record<PieceType, MoveFunction> = {

  "将": getGeneralMoves,
  "帥": getGeneralMoves,

  "士": getAdvisorMoves,
  "仕": getAdvisorMoves,

  "象": getElephantMoves,
  "相": getElephantMoves,

  "馬": getKnightMoves,
  "傌": getKnightMoves,

  "車": getRookMoves,
  "俥": getRookMoves,

  "砲": getCannonMoves,
  "炮": getCannonMoves,

  "兵": getPawnMoves,
  "卒": getPawnMoves,
};

/**
 * ====================================
 * PSEUDO MOVES
 * ====================================
 *
 * Chỉ sinh nước đi theo luật quân cờ
 * KHÔNG kiểm tra:
 * - tự chiếu
 * - chiếu bí
 * - flying general
 */
export function getPseudoMoves(
  piece: Piece,
  board: Board
): Position[] {

  const fn = MOVE_MAP[piece.type];

  return fn
    ? fn(piece, board)
    : [];
}

/**
 * ====================================
 * LEGAL MOVES
 * ====================================
 *
 * Lọc các move khiến
 * vua bị chiếu
 */
export function getLegalMoves(
  piece: Piece,
  board: Board
): Position[] {

  const pseudoMoves =
    getPseudoMoves(piece, board);

  return pseudoMoves.filter(move => {

    const next =
      simulateMove(
        board,
        piece,
        move.row,
        move.col
      );

    return !isCheck(
      next,
      piece.side
    );
  });
}