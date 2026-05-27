import type {
  Board,
  Piece,
  PieceSide,
  Position,
} from "./types";

import {
  getPseudoMoves,
  getLegalMoves,
} from "./moveValidator";

/**
 * =========================
 * FIND KING
 * =========================
 */
export function findKing(
  board: Board,
  side: PieceSide
): Piece | null {

  for (let r = 0; r < 10; r++) {

    for (let c = 0; c < 9; c++) {

      const p = board[r][c];

      if (
        p &&
        p.side === side &&
        (
          p.type === "将" ||
          p.type === "帥"
        )
      ) {
        return p;
      }
    }
  }

  return null;
}

/**
 * =========================
 * SIMULATE MOVE
 * =========================
 */
export function simulateMove(
  board: Board,
  piece: Piece,
  toRow: number,
  toCol: number
): Board {

  const next =
    board.map(row =>
      row.map(cell =>
        cell
          ? { ...cell }
          : null
      )
    );

  const movingPiece =
    next[piece.row][piece.col];

  if (!movingPiece) {
    return next;
  }

  next[piece.row][piece.col] = null;

  movingPiece.row = toRow;
  movingPiece.col = toCol;

  next[toRow][toCol] =
    movingPiece;

  return next;
}

/**
 * =========================
 * FLYING GENERAL
 * =========================
 */
export function isFlyingGeneral(
  board: Board
): boolean {

  const redKing =
    findKing(board, "red");

  const blackKing =
    findKing(board, "black");

  if (
    !redKing ||
    !blackKing
  ) {
    return false;
  }

  if (
    redKing.col !==
    blackKing.col
  ) {
    return false;
  }

  const minR = Math.min(
    redKing.row,
    blackKing.row
  );

  const maxR = Math.max(
    redKing.row,
    blackKing.row
  );

  for (
    let r = minR + 1;
    r < maxR;
    r++
  ) {

    if (
      board[r][redKing.col]
    ) {
      return false;
    }
  }

  return true;
}

/**
 * =========================
 * CHECK DETECTION
 * =========================
 */
export function isCheck(
  board: Board,
  side: PieceSide
): boolean {

  // flying general
  if (
    isFlyingGeneral(board)
  ) {
    return true;
  }

  const king =
    findKing(board, side);

  if (!king) {
    return false;
  }

  const enemy =
    side === "red"
      ? "black"
      : "red";

  for (let r = 0; r < 10; r++) {

    for (let c = 0; c < 9; c++) {

      const p = board[r][c];

      if (
        !p ||
        p.side !== enemy
      ) {
        continue;
      }

      // IMPORTANT:
      // dùng pseudo moves
      const attacks =
        getPseudoMoves(
          p,
          board
        );

      const attacksKing =
        attacks.some(
          move =>
            move.row ===
              king.row &&
            move.col ===
              king.col
        );

      if (attacksKing) {
        return true;
      }
    }
  }

  return false;
}

/**
 * =========================
 * ANY LEGAL MOVES
 * =========================
 */
export function hasAnyLegalMoves(
  board: Board,
  side: PieceSide
): boolean {

  for (let r = 0; r < 10; r++) {

    for (let c = 0; c < 9; c++) {

      const p = board[r][c];

      if (
        !p ||
        p.side !== side
      ) {
        continue;
      }

      const legalMoves =
        getLegalMoves(
          p,
          board
        );

      if (
        legalMoves.length > 0
      ) {
        return true;
      }
    }
  }

  return false;
}

/**
 * =========================
 * CHECKMATE
 * =========================
 */
export function isCheckmate(
  board: Board,
  side: PieceSide
): boolean {

  return (
    isCheck(board, side) &&
    !hasAnyLegalMoves(
      board,
      side
    )
  );
}

/**
 * =========================
 * STALEMATE
 * =========================
 */
export function isStalemate(
  board: Board,
  side: PieceSide
): boolean {

  return (
    !isCheck(board, side) &&
    !hasAnyLegalMoves(
      board,
      side
    )
  );
}