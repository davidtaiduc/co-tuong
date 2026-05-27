// ========================================
// TYPES
// ========================================

export type {
  Piece,
  PieceType,
  PieceSide,
  Position,
  Board,
} from "./types";


// ========================================
// HELPERS
// ========================================

export {
  buildBoard,
  isInsideBoard,
  isInsidePalace,
  isRiverCrossed,
  isEnemyPiece,
  pieceAt,
} from "./helpers";


// ========================================
// MOVE ENGINE
// ========================================

export {
  getPseudoMoves,
  getLegalMoves,
} from "./moveValidator";


// ========================================
// CHECK ENGINE
// ========================================

export {
  findKing,
  simulateMove,
  isFlyingGeneral,
  isCheck,
  hasAnyLegalMoves,
  isCheckmate,
  isStalemate,
} from "./checkDetection";


// ========================================
// PIECE RULES
// ========================================

export {
  getGeneralMoves,
} from "./moves/generalMoves";

export {
  getAdvisorMoves,
} from "./moves/advisorMoves";

export {
  getElephantMoves,
} from "./moves/elephantMoves";

export {
  getKnightMoves,
} from "./moves/knightMoves";

export {
  getRookMoves,
} from "./moves/rookMoves";

export {
  getCannonMoves,
} from "./moves/cannonMoves";

export {
  getPawnMoves,
} from "./moves/pawnMoves";