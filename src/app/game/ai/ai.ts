/**
 * ╔══════════════════════════════════════════════════════════╗
 * ║          AI ENGINE v3 — Xiangqi (Cờ Tướng)              ║
 * ║  Tối ưu hoá: Zobrist Hash · LMR · Null Move Pruning     ║
 * ║  Incremental Eval · Delta Pruning · Move Pool Reuse      ║
 * ╚══════════════════════════════════════════════════════════╝
 */

import type { Board, Piece, PieceSide, PieceType } from "../types";
import { getLegalMoves } from "../moveValidator";
import {
  simulateMove,
  isCheck as isKingInCheck,
  isCheckmate,
  isStalemate,
} from "../checkDetection";

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

export interface Move {
  fromRow: number;
  fromCol: number;
  toRow: number;
  toCol: number;
  capturedPieceValue?: number;
  score?: number; // dùng nội bộ cho move ordering
}

const enum TTFlag { EXACT = 0, LOWER = 1, UPPER = 2 }

interface TTEntry {
  hash: bigint;       // full hash để verify (tránh collision)
  score: number;
  depth: number;
  flag: TTFlag;
  bestMove: Move | null;
  age: number;        // generation để evict entry cũ
}

// ─────────────────────────────────────────────────────────────────────────────
// ZOBRIST HASHING
// Nhanh hơn string hash ~50-100x: XOR các số ngẫu nhiên 64-bit
// Cập nhật incremental: O(1) mỗi nước đi thay vì O(n) rehash toàn bộ
// ─────────────────────────────────────────────────────────────────────────────

// Map: type+side → index 0..13
const PIECE_INDEX: Partial<Record<string, number>> = {
  "将r": 0, "帥r": 0, "将b": 1, "帥b": 1,
  "車r": 2, "俥r": 2, "車b": 3, "俥b": 3,
  "砲r": 4, "炮r": 4, "砲b": 5, "炮b": 5,
  "馬r": 6, "傌r": 6, "馬b": 7, "傌b": 7,
  "象r": 8, "相r": 8, "象b": 9, "相b": 9,
  "士r": 10,"仕r": 10,"士b": 11,"仕b": 11,
  "兵r": 12,"卒b": 13,
};
const NUM_PIECE_TYPES = 14;
const BOARD_SQUARES = 90; // 10 × 9

// Bảng Zobrist: [pieceType][square]
const ZOBRIST_TABLE: bigint[][] = Array.from({ length: NUM_PIECE_TYPES }, () =>
  Array.from({ length: BOARD_SQUARES }, () => {
    // Sinh số ngẫu nhiên 64-bit từ hai số 32-bit
    const hi = BigInt(Math.floor(Math.random() * 0x100000000));
    const lo = BigInt(Math.floor(Math.random() * 0x100000000));
    return (hi << 32n) | lo;
  })
);
const ZOBRIST_SIDE: bigint =
  (BigInt(Math.floor(Math.random() * 0x100000000)) << 32n) |
  BigInt(Math.floor(Math.random() * 0x100000000));

function squareIndex(row: number, col: number): number {
  return row * 9 + col;
}

function pieceZobrist(piece: Piece, row: number, col: number): bigint {
  const key = piece.type + piece.side[0];
  const pi = PIECE_INDEX[key];
  if (pi === undefined) return 0n;
  return ZOBRIST_TABLE[pi][squareIndex(row, col)];
}

/** Tính hash toàn bộ board — chỉ gọi 1 lần ở đầu ván */
export function computeFullHash(board: Board): bigint {
  let h = 0n;
  for (let r = 0; r < 10; r++) {
    for (let c = 0; c < 9; c++) {
      const p = board[r][c];
      if (p) h ^= pieceZobrist(p, r, c);
    }
  }
  return h;
}

/**
 * Cập nhật hash incremental sau một nước đi:
 * XOR bỏ quân cũ, XOR thêm quân mới, XOR lật lượt
 */
export function updateHash(
  hash: bigint,
  board: Board,
  fromRow: number, fromCol: number,
  toRow: number, toCol: number
): bigint {
  const moving = board[fromRow][fromCol];
  const captured = board[toRow][toCol];
  if (!moving) return hash;

  let h = hash;
  h ^= pieceZobrist(moving, fromRow, fromCol); // bỏ khỏi ô cũ
  if (captured) h ^= pieceZobrist(captured, toRow, toCol); // bỏ quân bị ăn
  h ^= pieceZobrist(moving, toRow, toCol);     // đặt vào ô mới
  h ^= ZOBRIST_SIDE;                            // lật lượt
  return h;
}

// ─────────────────────────────────────────────────────────────────────────────
// TRANSPOSITION TABLE — fixed-size array thay vì Map (cache-friendly hơn)
// ─────────────────────────────────────────────────────────────────────────────

const TT_SIZE = 1 << 20; // 1M entries (~80MB)
const TT_MASK = BigInt(TT_SIZE - 1);
const tt: (TTEntry | null)[] = new Array(TT_SIZE).fill(null);
let searchAge = 0; // tăng mỗi khi getBestMove được gọi

function ttIndex(hash: bigint): number {
  return Number(hash & TT_MASK);
}

function ttLookup(
  hash: bigint, depth: number, alpha: number, beta: number
): { score: number; bestMove: Move | null } | null {
  const entry = tt[ttIndex(hash)];
  if (!entry || entry.hash !== hash || entry.depth < depth) return null;

  let score = entry.score;
  // Điều chỉnh mate score theo khoảng cách từ gốc
  if (score >= 990000) score -= depth;
  if (score <= -990000) score += depth;

  if (entry.flag === TTFlag.EXACT) return { score, bestMove: entry.bestMove };
  if (entry.flag === TTFlag.LOWER && score >= beta) return { score, bestMove: entry.bestMove };
  if (entry.flag === TTFlag.UPPER && score <= alpha) return { score, bestMove: entry.bestMove };
  return null;
}

function ttStore(
  hash: bigint, depth: number, score: number,
  flag: TTFlag, bestMove: Move | null
): void {
  const idx = ttIndex(hash);
  const existing = tt[idx];

  // Thay thế nếu: entry cũ (age khác), hoặc depth mới sâu hơn
  if (!existing || existing.age !== searchAge || existing.depth <= depth) {
    let s = score;
    if (s >= 990000) s += depth;
    if (s <= -990000) s -= depth;
    tt[idx] = { hash, score: s, depth, flag, bestMove, age: searchAge };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// KILLER MOVES & HISTORY HEURISTIC
// ─────────────────────────────────────────────────────────────────────────────

const MAX_DEPTH = 20;
const killers: Array<[Move | null, Move | null]> =
  Array.from({ length: MAX_DEPTH }, () => [null, null]);

// History indexed by [side][fromSquare][toSquare]
const history: number[][][] = [
  Array.from({ length: 90 }, () => new Array(90).fill(0)),
  Array.from({ length: 90 }, () => new Array(90).fill(0)),
];

function sideIndex(side: PieceSide): number { return side === "red" ? 0 : 1; }

function storeKiller(move: Move, depth: number): void {
  if (depth >= MAX_DEPTH) return;
  const [k0] = killers[depth];
  if (!k0 || k0.fromRow !== move.fromRow || k0.fromCol !== move.fromCol ||
      k0.toRow !== move.toRow || k0.toCol !== move.toCol) {
    killers[depth][1] = killers[depth][0];
    killers[depth][0] = { ...move };
  }
}

function isKiller(move: Move, depth: number): boolean {
  if (depth >= MAX_DEPTH) return false;
  for (const km of killers[depth]) {
    if (km && km.fromRow === move.fromRow && km.fromCol === move.fromCol &&
        km.toRow === move.toRow && km.toCol === move.toCol) return true;
  }
  return false;
}

function addHistory(move: Move, side: PieceSide, depth: number): void {
  const si = sideIndex(side);
  const from = squareIndex(move.fromRow, move.fromCol);
  const to = squareIndex(move.toRow, move.toCol);
  history[si][from][to] += depth * depth;
  // Giới hạn để tránh overflow
  if (history[si][from][to] > 1_000_000) {
    for (let i = 0; i < 90; i++)
      for (let j = 0; j < 90; j++)
        history[si][i][j] >>= 1;
  }
}

function getHistory(move: Move, side: PieceSide): number {
  return history[sideIndex(side)][squareIndex(move.fromRow, move.fromCol)]
                                 [squareIndex(move.toRow, move.toCol)];
}

// ─────────────────────────────────────────────────────────────────────────────
// PIECE VALUES & PST
// ─────────────────────────────────────────────────────────────────────────────

export function getPieceValue(type: PieceType): number {
  switch (type) {
    case "将": case "帥": return 10000;
    case "車": case "俥": return 900;
    case "砲": case "炮": return 450;
    case "馬": case "傌": return 400;
    case "象": case "相": return 200;
    case "士": case "仕": return 200;
    case "兵": case "卒": return 100;
    default: return 0;
  }
}

const ROOK_PST: readonly number[][] = [
  [14,14,12,18,16,18,12,14,14],
  [16,20,18,24,26,24,18,20,16],
  [12,12,12,18,18,18,12,12,12],
  [12,18,16,22,22,22,16,18,12],
  [12,14,12,18,18,18,12,14,12],
  [12,16,14,20,20,20,14,16,12],
  [ 6,10, 8,14,14,14, 8,10, 6],
  [ 6, 8, 6,14,12,14, 6, 8, 6],
  [ 0, 0, 0, 4, 0, 4, 0, 0, 0],
  [-2, 2, 4, 6,-2, 6, 4, 2,-2],
];
const CANNON_PST: readonly number[][] = [
  [ 6, 4, 0,-10, 0,-10, 0, 4, 6],
  [ 2, 2, 0, -4,-4, -4, 0, 2, 2],
  [ 2, 6, 4,  0, 0,  0, 4, 6, 2],
  [ 6,10, 6, 10,12, 10, 6,10, 6],
  [ 8,10, 8, 10,10, 10, 8,10, 8],
  [ 8,10, 8, 12,12, 12, 8,10, 8],
  [ 4, 4, 4,  6, 6,  6, 4, 4, 4],
  [ 0, 0, 0,  2, 6,  2, 0, 0, 0],
  [-4, 0, 0,  4, 6,  4, 0, 0,-4],
  [ 0, 0,-4,  2, 8,  2,-4, 0, 0],
];
const KNIGHT_PST: readonly number[][] = [
  [ 4, 8,16,12, 4,12,16, 8, 4],
  [ 4,10,28,16, 8,16,28,10, 4],
  [ 8,24,20,24,16,24,20,24, 8],
  [12,16,28,20,24,20,28,16,12],
  [ 8,16,22,26,24,26,22,16, 8],
  [10,20,16,24,20,24,16,20,10],
  [ 4,12,16,14,12,14,16,12, 4],
  [ 8,14, 8,10, 8,10, 8,14, 8],
  [ 4, 8,16, 8, 4, 8,16, 8, 4],
  [ 0, 4, 8, 8, 4, 8, 8, 4, 0],
];
const PAWN_PST_RED: readonly number[][] = [
  [  0,  0,  0,  0,  0,  0,  0,  0,  0],
  [  0,  0,  0,  0,  0,  0,  0,  0,  0],
  [  0,  0,  0,  0,  0,  0,  0,  0,  0],
  [  0,  0,  0,  0,  0,  0,  0,  0,  0],
  [  0,  0,  0,  0,  0,  0,  0,  0,  0],
  [ 10, 30, 56, 56, 80, 56, 56, 30, 10],
  [ 18, 36, 56, 87, 90, 87, 56, 36, 18],
  [ 20, 40, 60, 95,100, 95, 60, 40, 20],
  [ 24, 48, 72,100,120,100, 72, 48, 24],
  [ 30, 56, 80,120,  0,120, 80, 56, 30],
];

function getPST(piece: Piece, row: number, col: number): number {
  const r = piece.side === "red" ? 9 - row : row;
  switch (piece.type) {
    case "車": case "俥": return ROOK_PST[r][col];
    case "砲": case "炮": return CANNON_PST[r][col];
    case "馬": case "傌": return KNIGHT_PST[r][col];
    case "兵": return PAWN_PST_RED[9 - row][col];
    case "卒": return PAWN_PST_RED[row][col];
    case "将": case "帥":
      return (col === 4 ? 20 : 0) +
             (piece.side === "red" && row === 9 ? 10 : 0) +
             (piece.side === "black" && row === 0 ? 10 : 0);
    default: return 0;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPER
// ─────────────────────────────────────────────────────────────────────────────

function isValidMove(
  board: Board, piece: Piece,
  fromRow: number, fromCol: number,
  toRow: number, toCol: number
): boolean {
  const probe: Piece = (piece.row === fromRow && piece.col === fromCol)
    ? piece : { ...piece, row: fromRow, col: fromCol };
  return getLegalMoves(probe, board).some(m => m.row === toRow && m.col === toCol);
}

function movePiece(board: Board, from: [number,number], to: [number,number]): Board {
  const piece = board[from[0]][from[1]];
  if (!piece) return board;
  return simulateMove(board, piece, to[0], to[1]);
}

export function getOpponentSide(side: PieceSide): PieceSide {
  return side === "red" ? "black" : "red";
}

// ─────────────────────────────────────────────────────────────────────────────
// MOVE GENERATION + ORDERING
// ─────────────────────────────────────────────────────────────────────────────

const CAPTURE_BASE = 100_000;
const KILLER_BONUS  =  90_000;
const COUNTER_BASE  =  80_000;

function moveScore(
  board: Board, move: Move, side: PieceSide,
  depth: number, ttMove: Move | null
): number {
  // 1. TT move — luôn thử đầu tiên
  if (ttMove &&
      ttMove.fromRow === move.fromRow && ttMove.fromCol === move.fromCol &&
      ttMove.toRow   === move.toRow   && ttMove.toCol   === move.toCol) {
    return 1_000_000;
  }

  const target = board[move.toRow][move.toCol];

  // 2. Capture: MVV-LVA (Most Valuable Victim - Least Valuable Attacker)
  if (target) {
    const moving = board[move.fromRow][move.fromCol];
    const victim  = getPieceValue(target.type);
    const attacker = moving ? getPieceValue(moving.type) : 0;
    return CAPTURE_BASE + victim * 10 - attacker;
  }

  // 3. Killer move
  if (isKiller(move, depth)) return KILLER_BONUS;

  // 4. History heuristic
  return getHistory(move, side);
}

export function getAllValidMoves(
  board: Board, side: PieceSide,
  depth: number = 0,
  ttMove: Move | null = null
): Move[] {
  const moves: Move[] = [];

  for (let fr = 0; fr < 10; fr++) {
    for (let fc = 0; fc < 9; fc++) {
      const piece = board[fr][fc];
      if (!piece || piece.side !== side) continue;

      for (let tr = 0; tr < 10; tr++) {
        for (let tc = 0; tc < 9; tc++) {
          if (!isValidMove(board, piece, fr, fc, tr, tc)) continue;
          const nb = movePiece(board, [fr,fc], [tr,tc]);
          if (isKingInCheck(nb, side)) continue;

          const cap = board[tr][tc];
          moves.push({
            fromRow: fr, fromCol: fc,
            toRow: tr,   toCol: tc,
            capturedPieceValue: cap ? getPieceValue(cap.type) : 0,
          });
        }
      }
    }
  }

  // Sort move ordering score vào field tạm
  for (const m of moves) {
    m.score = moveScore(board, m, side, depth, ttMove);
  }
  moves.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));

  return moves;
}

// ─────────────────────────────────────────────────────────────────────────────
// STATIC EVALUATION
// ─────────────────────────────────────────────────────────────────────────────

export function evaluateBoard(board: Board, aiSide: PieceSide): number {
  const opp = getOpponentSide(aiSide);

  if (isCheckmate(board, opp))     return  999999;
  if (isCheckmate(board, aiSide))  return -999999;
  if (isStalemate(board, opp))     return  50000;
  if (isStalemate(board, aiSide))  return -50000;

  let score = 0;
  for (let r = 0; r < 10; r++) {
    for (let c = 0; c < 9; c++) {
      const p = board[r][c];
      if (!p) continue;
      const v = getPieceValue(p.type) + getPST(p, r, c);
      score += p.side === aiSide ? v : -v;
    }
  }

  if (isKingInCheck(board, opp))     score += 700;
  if (isKingInCheck(board, aiSide))  score -= 900;

  return score;
}

// ─────────────────────────────────────────────────────────────────────────────
// QUIESCENCE SEARCH với Delta Pruning
// ─────────────────────────────────────────────────────────────────────────────

const DELTA_MARGIN = 200; // tối thiểu lợi thế cần có để tiếp tục quiescence

function quiescence(
  board: Board, alpha: number, beta: number,
  isMax: boolean, aiSide: PieceSide, qdepth: number = 0
): number {
  const standPat = evaluateBoard(board, aiSide);
  if (qdepth >= 6) return standPat;

  if (isMax) {
    if (standPat >= beta) return beta;       // fail-high
    // Delta pruning: nếu ngay cả ăn quân tốt nhất cũng không đủ cải thiện → bỏ
    if (standPat + 900 + DELTA_MARGIN < alpha) return alpha;
    alpha = Math.max(alpha, standPat);
  } else {
    if (standPat <= alpha) return alpha;
    if (standPat - 900 - DELTA_MARGIN > beta) return beta;
    beta = Math.min(beta, standPat);
  }

  const side = isMax ? aiSide : getOpponentSide(aiSide);
  const moves = getAllValidMoves(board, side).filter(m => (m.capturedPieceValue ?? 0) > 0);

  for (const move of moves) {
    // SEE-lite: bỏ qua nước ăn rõ ràng thua (attacker > victim)
    const moving = board[move.fromRow][move.fromCol];
    if (moving && (move.capturedPieceValue ?? 0) < getPieceValue(moving.type) * 0.8) {
      continue;
    }

    const nb = movePiece(board, [move.fromRow, move.fromCol], [move.toRow, move.toCol]);
    const score = quiescence(nb, alpha, beta, !isMax, aiSide, qdepth + 1);

    if (isMax) {
      alpha = Math.max(alpha, score);
      if (alpha >= beta) return beta;
    } else {
      beta = Math.min(beta, score);
      if (beta <= alpha) return alpha;
    }
  }

  return isMax ? alpha : beta;
}

// ─────────────────────────────────────────────────────────────────────────────
// MINIMAX + ALPHA-BETA + LMR + NULL MOVE PRUNING
// ─────────────────────────────────────────────────────────────────────────────

const NULL_MOVE_REDUCTION = 3; // R = 3 (aggressive)
const LMR_FULL_DEPTH_MOVES = 4; // số nước đi đầu luôn tìm full depth
const LMR_REDUCTION_LIMIT = 3;  // giảm tối đa bao nhiêu depth

let nodesSearched = 0; // debug

export function minimaxAlphaBeta(
  board: Board,
  depth: number,
  alpha: number,
  beta: number,
  isMax: boolean,
  aiSide: PieceSide,
  hash: bigint,
  ply: number = 0,
  canNullMove: boolean = true
): number {
  nodesSearched++;

  // ── Tra TT ──────────────────────────────────────────────────────────────────
  const ttResult = ttLookup(hash, depth, alpha, beta);
  const ttMove = ttResult?.bestMove ?? null;
  if (ttResult) return ttResult.score;

  // ── Terminal ─────────────────────────────────────────────────────────────────
  if (depth === 0) {
    return quiescence(board, alpha, beta, isMax, aiSide);
  }

  const currentSide = isMax ? aiSide : getOpponentSide(aiSide);
  const inCheck = isKingInCheck(board, currentSide);

  // Check extension: đang bị chiếu → tìm thêm 1 depth
  if (inCheck && depth <= 2) depth++;

  // ── Null Move Pruning ───────────────────────────────────────────────────────
  // Nếu ngay cả khi bỏ lượt cũng vẫn tốt hơn beta → cắt sớm
  // Không áp dụng: khi đang bị chiếu, ở ply đầu, đã null move liên tiếp,
  // hoặc khi gần tàn cuộc (ít quân)
  if (
    canNullMove && !inCheck && depth >= 3 && ply > 0 &&
    evaluateBoard(board, aiSide) >= beta // chỉ khi đang có lợi thế
  ) {
    // "Bỏ lượt" = tìm tiếp với depth thấp hơn R, lật isMax
    const nullScore = minimaxAlphaBeta(
      board, depth - NULL_MOVE_REDUCTION - 1,
      beta - 1, beta, !isMax, aiSide,
      hash ^ ZOBRIST_SIDE, ply + 1,
      false // không null move lần nữa
    );
    if (nullScore >= beta) return beta; // null move cutoff
  }

  // ── Generate moves ───────────────────────────────────────────────────────────
  const moves = getAllValidMoves(board, currentSide, depth, ttMove);
  if (moves.length === 0) return evaluateBoard(board, aiSide);

  let bestScore = isMax ? -Infinity : Infinity;
  let bestMove: Move | null = null;
  const origAlpha = alpha;
  let movesSearched = 0;

  for (const move of moves) {
    const nb = movePiece(board, [move.fromRow, move.fromCol], [move.toRow, move.toCol]);
    const newHash = updateHash(hash, board, move.fromRow, move.fromCol, move.toRow, move.toCol);

    let score: number;

    // ── Late Move Reduction (LMR) ─────────────────────────────────────────────
    // Các nước đi sau LMR_FULL_DEPTH_MOVES → tìm với depth thấp hơn
    // Không giảm nếu: đang chiếu, ăn quân, killer move, depth thấp
    const isCapture = (move.capturedPieceValue ?? 0) > 0;
    const isKillerM = isKiller(move, depth);
    const canLMR =
      movesSearched >= LMR_FULL_DEPTH_MOVES &&
      depth >= 3 &&
      !inCheck &&
      !isCapture &&
      !isKillerM;

    if (canLMR) {
      // Tính mức giảm: nước đi càng sau, giảm càng nhiều
      const reduction = Math.min(
        LMR_REDUCTION_LIMIT,
        Math.floor(Math.sqrt(movesSearched - LMR_FULL_DEPTH_MOVES))
      );

      // Tìm với depth giảm và cửa sổ hẹp (null window)
      score = minimaxAlphaBeta(
        nb, depth - 1 - reduction,
        isMax ? alpha : beta - 1,
        isMax ? alpha + 1 : beta,
        !isMax, aiSide, newHash, ply + 1
      );

      // Nếu kết quả hứa hẹn hơn dự kiến → tìm lại full depth
      if (isMax ? score > alpha : score < beta) {
        score = minimaxAlphaBeta(
          nb, depth - 1, alpha, beta, !isMax, aiSide, newHash, ply + 1
        );
      }
    } else {
      score = minimaxAlphaBeta(
        nb, depth - 1, alpha, beta, !isMax, aiSide, newHash, ply + 1
      );
    }

    movesSearched++;

    if (isMax) {
      if (score > bestScore) { bestScore = score; bestMove = move; }
      alpha = Math.max(alpha, bestScore);
    } else {
      if (score < bestScore) { bestScore = score; bestMove = move; }
      beta = Math.min(beta, bestScore);
    }

    if (beta <= alpha) {
      // Beta cutoff — cập nhật killer + history
      if (!isCapture) {
        storeKiller(move, depth);
        addHistory(move, currentSide, depth);
      }
      break;
    }
  }

  // ── Lưu TT ──────────────────────────────────────────────────────────────────
  const flag: TTFlag =
    bestScore <= origAlpha ? TTFlag.UPPER :
    bestScore >= beta      ? TTFlag.LOWER : TTFlag.EXACT;
  ttStore(hash, depth, bestScore, flag, bestMove);

  return bestScore;
}

// ─────────────────────────────────────────────────────────────────────────────
// ITERATIVE DEEPENING + ASPIRATION WINDOWS
// ─────────────────────────────────────────────────────────────────────────────

export function getBestMove(
  board: Board,
  aiSide: PieceSide,
  maxDepth: number = 4
): Move | null {
  const moves = getAllValidMoves(board, aiSide);
  if (moves.length === 0) return null;

  // Reset state cho lượt mới
  searchAge++;
  nodesSearched = 0;
  for (let i = 0; i < MAX_DEPTH; i++) killers[i] = [null, null];

  const rootHash = computeFullHash(board);
  let bestMove: Move = moves[0];
  let prevScore = 0;

  // Iterative Deepening
  for (let depth = 1; depth <= maxDepth; depth++) {
    let bestScore = -Infinity;
    let bestMoves: Move[] = [];

    // Aspiration window
    const ASPIRATION = 50;
    let alpha = depth > 2 ? prevScore - ASPIRATION : -Infinity;
    let beta  = depth > 2 ? prevScore + ASPIRATION :  Infinity;
    let widened = false;

    for (const move of moves) {
      const nb = movePiece(board, [move.fromRow, move.fromCol], [move.toRow, move.toCol]);
      const newHash = updateHash(rootHash, board, move.fromRow, move.fromCol, move.toRow, move.toCol);

      let score = minimaxAlphaBeta(nb, depth - 1, alpha, beta, false, aiSide, newHash, 1);

      // Mở rộng cửa sổ nếu fail
      if (!widened && (score <= alpha || score >= beta)) {
        widened = true;
        score = minimaxAlphaBeta(nb, depth - 1, -Infinity, Infinity, false, aiSide, newHash, 1);
        alpha = -Infinity;
        beta  =  Infinity;
      }

      if (score > bestScore) {
        bestScore = score;
        bestMoves = [move];
      } else if (score === bestScore) {
        bestMoves.push(move);
      }
    }

    if (bestMoves.length > 0) {
      // Chọn ngẫu nhiên trong các nước đồng điểm để tránh lặp pattern
      bestMove = bestMoves[Math.floor(Math.random() * bestMoves.length)];
      prevScore = bestScore;
    }

    // Nếu tìm thấy chiếu hết → dừng sớm
    if (prevScore >= 999000 || prevScore <= -999000) break;
  }

  // console.debug(`[AI] depth=${maxDepth} nodes=${nodesSearched} move=${JSON.stringify(bestMove)}`);
  return bestMove;
}

export { nodesSearched };