import type { Board, Piece, PieceSide, PieceType } from "../types";
import { getLegalMoves } from "../moveValidator";
import {
  simulateMove,
  isCheck as isKingInCheck,
  isCheckmate,
  isStalemate,
} from "../checkDetection";

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────

export interface Move {
  fromRow: number;
  fromCol: number;
  toRow: number;
  toCol: number;
  capturedPieceValue?: number;
}

const enum TTFlag {
  EXACT = 0,
  LOWER = 1, // alpha (fail-low)
  UPPER = 2, // beta  (fail-high)
}

interface TTEntry {
  score: number;
  depth: number;
  flag: TTFlag;
  bestMove: Move | null;
}

// ─────────────────────────────────────────────
// TRANSPOSITION TABLE
// Dùng Map với key là chuỗi hash thế cờ
// ─────────────────────────────────────────────

const transpositionTable = new Map<string, TTEntry>();
const TT_MAX_SIZE = 100_000;

function boardHash(board: Board): string {
  // Compact hash: chỉ mã hoá những ô có quân
  const parts: string[] = [];
  for (let r = 0; r < 10; r++) {
    for (let c = 0; c < 9; c++) {
      const p = board[r][c];
      if (p) parts.push(`${r}${c}${p.type}${p.side[0]}`);
    }
  }
  return parts.join("|");
}

function ttGet(key: string, depth: number, alpha: number, beta: number): number | null {
  const entry = transpositionTable.get(key);
  if (!entry || entry.depth < depth) return null;

  if (entry.flag === TTFlag.EXACT) return entry.score;
  if (entry.flag === TTFlag.LOWER && entry.score >= beta) return entry.score;
  if (entry.flag === TTFlag.UPPER && entry.score <= alpha) return entry.score;
  return null;
}

function ttSet(key: string, entry: TTEntry): void {
  if (transpositionTable.size >= TT_MAX_SIZE) {
    // Xoá một phần nhỏ khi đầy (simple eviction)
    const keysToDelete = Array.from(transpositionTable.keys()).slice(0, 10_000);
    keysToDelete.forEach(k => transpositionTable.delete(k));
  }
  transpositionTable.set(key, entry);
}

// ─────────────────────────────────────────────
// KILLER MOVES & HISTORY HEURISTIC
// ─────────────────────────────────────────────

// 2 killer moves per depth, max depth 10
const killerMoves: Array<[Move | null, Move | null]> = Array.from({ length: 20 }, () => [null, null]);
const historyTable = new Map<string, number>();

function historyKey(move: Move): string {
  return `${move.fromRow}${move.fromCol}${move.toRow}${move.toCol}`;
}

function updateKiller(move: Move, depth: number): void {
  const [k1] = killerMoves[depth];
  if (!k1 || k1.fromRow !== move.fromRow || k1.fromCol !== move.fromCol ||
      k1.toRow !== move.toRow || k1.toCol !== move.toCol) {
    killerMoves[depth][1] = killerMoves[depth][0];
    killerMoves[depth][0] = move;
  }
}

function isKillerMove(move: Move, depth: number): boolean {
  for (const km of killerMoves[depth]) {
    if (km && km.fromRow === move.fromRow && km.fromCol === move.fromCol &&
        km.toRow === move.toRow && km.toCol === move.toCol) return true;
  }
  return false;
}

function updateHistory(move: Move, depth: number): void {
  const key = historyKey(move);
  historyTable.set(key, (historyTable.get(key) ?? 0) + depth * depth);
}

// ─────────────────────────────────────────────
// PIECE VALUES
// ─────────────────────────────────────────────

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

// ─────────────────────────────────────────────
// POSITION SCORE TABLES (PST) — chi tiết theo từng ô
// Giá trị dương = tốt cho quân đó
// Bảng dùng cho phe Black (row 0 ở trên), phe Red thì lật ngược
// ─────────────────────────────────────────────

// Xe (Rook) — thích cột giữa và hàng tấn công
const ROOK_PST: number[][] = [
  [14, 14, 12, 18, 16, 18, 12, 14, 14],
  [16, 20, 18, 24, 26, 24, 18, 20, 16],
  [12, 12, 12, 18, 18, 18, 12, 12, 12],
  [12, 18, 16, 22, 22, 22, 16, 18, 12],
  [12, 14, 12, 18, 18, 18, 12, 14, 12],
  [12, 16, 14, 20, 20, 20, 14, 16, 12],
  [6,  10,  8, 14, 14, 14,  8, 10,  6],
  [6,   8,  6, 14, 12, 14,  6,  8,  6],
  [0,   0,  0,  4,  0,  4,  0,  0,  0],
  [-2,  2,  4,  6, -2,  6,  4,  2, -2],
];

// Pháo (Cannon) — mạnh ở hàng tấn công, cần nền để bắn
const CANNON_PST: number[][] = [
  [ 6,  4,  0, -10,  0, -10,  0,  4,  6],
  [ 2,  2,  0, -4,  -4,  -4,  0,  2,  2],
  [ 2,  6,  4,  0,   0,   0,  4,  6,  2],
  [ 6, 10,  6, 10,  12,  10,  6, 10,  6],
  [ 8, 10,  8, 10,  10,  10,  8, 10,  8],
  [ 8, 10,  8, 12,  12,  12,  8, 10,  8],
  [ 4,  4,  4,  6,   6,   6,  4,  4,  4],
  [ 0,  0,  0,  2,   6,   2,  0,  0,  0],
  [-4,  0,  0,  4,   6,   4,  0,  0, -4],
  [ 0,  0, -4,  2,   8,   2, -4,  0,  0],
];

// Mã (Knight) — thích ở trung tâm
const KNIGHT_PST: number[][] = [
  [ 4,  8, 16, 12,  4, 12, 16,  8,  4],
  [ 4, 10, 28, 16,  8, 16, 28, 10,  4],
  [ 8, 24, 20, 24, 16, 24, 20, 24,  8],
  [12, 16, 28, 20, 24, 20, 28, 16, 12],
  [ 8, 16, 22, 26, 24, 26, 22, 16,  8],
  [10, 20, 16, 24, 20, 24, 16, 20, 10],
  [ 4, 12, 16, 14, 12, 14, 16, 12,  4],
  [ 8, 14,  8, 10,  8, 10,  8, 14,  8],
  [ 4,  8, 16,  8,  4,  8, 16,  8,  4],
  [ 0,  4,  8,  8,  4,  8,  8,  4,  0],
];

// Tốt/Binh — bonus qua sông lớn
const PAWN_PST_RED: number[][] = [
  [0,   0,  0,  0,  0,  0,  0,  0,  0],
  [0,   0,  0,  0,  0,  0,  0,  0,  0],
  [0,   0,  0,  0,  0,  0,  0,  0,  0],
  [0,   0,  0,  0,  0,  0,  0,  0,  0],
  [0,   0,  0,  0,  0,  0,  0,  0,  0],
  [10, 30, 56, 56, 80, 56, 56, 30, 10], // vừa qua sông
  [18, 36, 56, 87, 90, 87, 56, 36, 18],
  [20, 40, 60, 95, 100, 95, 60, 40, 20],
  [24, 48, 72, 100, 120, 100, 72, 48, 24],
  [30, 56, 80, 120, 0,  120, 80, 56, 30], // hàng cuối (tướng)
];

// ─────────────────────────────────────────────
// HÀM TRA BẢNG PST
// ─────────────────────────────────────────────

function getPositionBonus(piece: Piece, row: number, col: number): number {
  // Chuẩn hoá về góc nhìn của black (row 0 = trên cùng)
  // Nếu là red, lật bảng ngược
  const r = piece.side === "red" ? 9 - row : row;
  const c = col;

  switch (piece.type) {
    case "車": case "俥": return ROOK_PST[r][c];
    case "砲": case "炮": return CANNON_PST[r][c];
    case "馬": case "傌": return KNIGHT_PST[r][c];
    case "兵":
      return PAWN_PST_RED[9 - row][col]; // red pawn, đi từ dưới lên
    case "卒":
      return PAWN_PST_RED[row][col]; // black pawn, đi từ trên xuống
    case "将": case "帥":
      return getGeneralPositionBonus(piece.side, row, col);
    default:
      return 0;
  }
}

function getGeneralPositionBonus(side: PieceSide, row: number, col: number): number {
  let bonus = 0;
  if (col === 4) bonus += 20;
  if (side === "red" && row === 9) bonus += 10;
  if (side === "black" && row === 0) bonus += 10;
  return bonus;
}

// ─────────────────────────────────────────────
// HELPER FUNCTIONS
// ─────────────────────────────────────────────

function isValidMove(
  board: Board, piece: Piece,
  fromRow: number, fromCol: number,
  toRow: number, toCol: number
): boolean {
  const probe: Piece = (piece.row === fromRow && piece.col === fromCol)
    ? piece
    : { ...piece, row: fromRow, col: fromCol };
  return getLegalMoves(probe, board).some(m => m.row === toRow && m.col === toCol);
}

function movePiece(
  board: Board,
  fromRow: number, fromCol: number,
  toRow: number, toCol: number
): Board {
  const piece = board[fromRow][fromCol];
  if (!piece) return board;
  return simulateMove(board, piece, toRow, toCol);
}

export function getOpponentSide(side: PieceSide): PieceSide {
  return side === "red" ? "black" : "red";
}

// ─────────────────────────────────────────────
// MOVE ORDERING — sắp xếp nước đi để Alpha-Beta cắt hiệu quả hơn
// Thứ tự ưu tiên: chiếu > ăn quân (MVV-LVA) > killer > history > vị trí
// ─────────────────────────────────────────────

function scoreMove(board: Board, move: Move, side: PieceSide, depth: number): number {
  let score = 0;

  const moving = board[move.fromRow][move.fromCol];
  const target = board[move.toRow][move.toCol];

  if (!moving) return 0;

  // MVV-LVA: ưu tiên ăn quân giá trị cao bằng quân giá trị thấp
  if (target) {
    const victimVal = getPieceValue(target.type);
    const attackerVal = getPieceValue(moving.type);
    score += 10000 + victimVal * 10 - attackerVal;
  }

  // Killer moves
  if (!target && isKillerMove(move, depth)) {
    score += 9000;
  }

  // History heuristic
  if (!target) {
    score += historyTable.get(historyKey(move)) ?? 0;
  }

  return score;
}

export function getAllValidMoves(board: Board, side: PieceSide, depth: number = 0): Move[] {
  const moves: Move[] = [];

  for (let fromRow = 0; fromRow < 10; fromRow++) {
    for (let fromCol = 0; fromCol < 9; fromCol++) {
      const piece = board[fromRow][fromCol];
      if (!piece || piece.side !== side) continue;

      for (let toRow = 0; toRow < 10; toRow++) {
        for (let toCol = 0; toCol < 9; toCol++) {
          const targetPiece = board[toRow][toCol];
          if (isValidMove(board, piece, fromRow, fromCol, toRow, toCol)) {
            const newBoard = movePiece(board, fromRow, fromCol, toRow, toCol);
            if (!isKingInCheck(newBoard, side)) {
              moves.push({
                fromRow, fromCol, toRow, toCol,
                capturedPieceValue: targetPiece ? getPieceValue(targetPiece.type) : 0,
              });
            }
          }
        }
      }
    }
  }

  // Sắp xếp theo điểm nước đi
  moves.sort((a, b) => scoreMove(board, b, side, depth) - scoreMove(board, a, side, depth));
  return moves;
}

// ─────────────────────────────────────────────
// EVALUATION FUNCTION
// ─────────────────────────────────────────────

export function evaluateBoard(board: Board, aiSide: PieceSide): number {
  const opponentSide = getOpponentSide(aiSide);

  if (isCheckmate(board, opponentSide)) return 999999;
  if (isCheckmate(board, aiSide))       return -999999;
  if (isStalemate(board, opponentSide)) return 50000;
  if (isStalemate(board, aiSide))       return -50000;

  let score = 0;

  for (let row = 0; row < 10; row++) {
    for (let col = 0; col < 9; col++) {
      const piece = board[row][col];
      if (!piece) continue;

      const value = getPieceValue(piece.type) + getPositionBonus(piece, row, col);
      score += piece.side === aiSide ? value : -value;
    }
  }

  // Thưởng chiếu đối phương, phạt bị chiếu
  if (isKingInCheck(board, opponentSide)) score += 700;
  if (isKingInCheck(board, aiSide))       score -= 900;

  return score;
}

// ─────────────────────────────────────────────
// QUIESCENCE SEARCH
// Tiếp tục tìm sau depth=0 cho đến khi không còn ăn quân "nóng"
// Tránh horizon effect
// ─────────────────────────────────────────────

function quiescenceSearch(
  board: Board,
  alpha: number,
  beta: number,
  isMaximizing: boolean,
  aiSide: PieceSide,
  qDepth: number = 0
): number {
  const standPat = evaluateBoard(board, aiSide);

  // Giới hạn quiescence depth để tránh vô hạn
  if (qDepth >= 4) return standPat;

  if (isMaximizing) {
    if (standPat >= beta) return beta;
    alpha = Math.max(alpha, standPat);
  } else {
    if (standPat <= alpha) return alpha;
    beta = Math.min(beta, standPat);
  }

  const currentSide = isMaximizing ? aiSide : getOpponentSide(aiSide);
  const allMoves = getAllValidMoves(board, currentSide);

  // Chỉ xét nước ăn quân
  const captureMoves = allMoves.filter(m => (m.capturedPieceValue ?? 0) > 0);
  if (captureMoves.length === 0) return standPat;

  if (isMaximizing) {
    let best = standPat;
    for (const move of captureMoves) {
      const newBoard = movePiece(board, move.fromRow, move.fromCol, move.toRow, move.toCol);
      const score = quiescenceSearch(newBoard, alpha, beta, false, aiSide, qDepth + 1);
      best = Math.max(best, score);
      alpha = Math.max(alpha, best);
      if (beta <= alpha) break;
    }
    return best;
  } else {
    let best = standPat;
    for (const move of captureMoves) {
      const newBoard = movePiece(board, move.fromRow, move.fromCol, move.toRow, move.toCol);
      const score = quiescenceSearch(newBoard, alpha, beta, true, aiSide, qDepth + 1);
      best = Math.min(best, score);
      beta = Math.min(beta, best);
      if (beta <= alpha) break;
    }
    return best;
  }
}

// ─────────────────────────────────────────────
// MINIMAX + ALPHA-BETA + TT + KILLER + HISTORY
// ─────────────────────────────────────────────

export function minimaxAlphaBeta(
  board: Board,
  depth: number,
  alpha: number,
  beta: number,
  isMaximizing: boolean,
  aiSide: PieceSide
): number {
  const currentSide = isMaximizing ? aiSide : getOpponentSide(aiSide);
  const hash = boardHash(board);

  // Tra cứu Transposition Table
  const cached = ttGet(hash, depth, alpha, beta);
  if (cached !== null) return cached;

  // Terminal nodes
  if (depth === 0) {
    // Chuyển sang Quiescence Search thay vì trả về ngay
    return quiescenceSearch(board, alpha, beta, isMaximizing, aiSide);
  }

  if (isCheckmate(board, currentSide)) {
    return isMaximizing ? -999999 : 999999;
  }

  const moves = getAllValidMoves(board, currentSide, depth);
  if (moves.length === 0) return evaluateBoard(board, aiSide);

  let bestScore = isMaximizing ? -Infinity : Infinity;
  let bestMove: Move | null = null;
  const originalAlpha = alpha;

  for (const move of moves) {
    const newBoard = movePiece(board, move.fromRow, move.fromCol, move.toRow, move.toCol);
    const score = minimaxAlphaBeta(newBoard, depth - 1, alpha, beta, !isMaximizing, aiSide);

    if (isMaximizing) {
      if (score > bestScore) { bestScore = score; bestMove = move; }
      alpha = Math.max(alpha, bestScore);
    } else {
      if (score < bestScore) { bestScore = score; bestMove = move; }
      beta = Math.min(beta, bestScore);
    }

    if (beta <= alpha) {
      // Cắt tỉa: cập nhật killer + history
      if (!move.capturedPieceValue || move.capturedPieceValue === 0) {
        updateKiller(move, depth);
        updateHistory(move, depth);
      }
      break;
    }
  }

  // Lưu vào Transposition Table
  const flag: TTFlag =
    bestScore <= originalAlpha ? TTFlag.UPPER :
    bestScore >= beta          ? TTFlag.LOWER :
                                 TTFlag.EXACT;
  ttSet(hash, { score: bestScore, depth, flag, bestMove });

  return bestScore;
}

// ─────────────────────────────────────────────
// ITERATIVE DEEPENING + ASPIRATION WINDOWS
// Tìm kiếm từng depth một, dùng kết quả trước để thu hẹp cửa sổ
// ─────────────────────────────────────────────

export function getBestMove(
  board: Board,
  aiSide: PieceSide,
  maxDepth: number = 3
): Move | null {
  const moves = getAllValidMoves(board, aiSide);
  if (moves.length === 0) return null;

  // Reset killer moves mỗi lần gọi getBestMove
  for (let i = 0; i < killerMoves.length; i++) {
    killerMoves[i] = [null, null];
  }

  let bestMove: Move = moves[0];
  let previousScore = 0;

  // Iterative Deepening
  for (let depth = 1; depth <= maxDepth; depth++) {
    let bestScore = -Infinity;
    const bestMoves: Move[] = [];

    // Aspiration Window: thu hẹp alpha-beta dựa trên kết quả depth trước
    let alpha = depth > 1 ? previousScore - 50 : -Infinity;
    let beta  = depth > 1 ? previousScore + 50 :  Infinity;
    let aspirationFailed = false;

    for (const move of moves) {
      const newBoard = movePiece(board, move.fromRow, move.fromCol, move.toRow, move.toCol);

      let score = minimaxAlphaBeta(newBoard, depth - 1, alpha, beta, false, aiSide);

      // Nếu ngoài cửa sổ aspiration → tìm lại với cửa sổ đầy đủ
      if ((score <= alpha || score >= beta) && !aspirationFailed) {
        aspirationFailed = true;
        score = minimaxAlphaBeta(newBoard, depth - 1, -Infinity, Infinity, false, aiSide);
        alpha = -Infinity;
        beta  =  Infinity;
      }

      if (score > bestScore) {
        bestScore = score;
        bestMoves.length = 0;
        bestMoves.push(move);
      } else if (score === bestScore) {
        bestMoves.push(move);
      }
    }

    if (bestMoves.length > 0) {
      // Chọn ngẫu nhiên trong các nước cùng điểm (tránh lặp)
      bestMove = bestMoves[Math.floor(Math.random() * bestMoves.length)];
      previousScore = bestScore;
    }

    // Nếu tìm thấy chiếu hết → dừng sớm
    if (previousScore >= 999000) break;
  }

  return bestMove;
}

// Export thêm để tiện test
export { boardHash, transpositionTable };