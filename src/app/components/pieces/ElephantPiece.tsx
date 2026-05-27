import React from "react";
import { PieceBase } from "./PieceBase";
import { PieceProps } from "./types";

// ── 象 / 相 — ELEPHANT ───────────────────────────────────────────────────────
// Decoration: 2 curved tusk arcs + forehead arc + 2 stylised eyes

export function ElephantPiece(props: PieceProps) {
  const { x, y, side } = props;
  const char = side === "red" ? "相" : "象";
  const dotCol = side === "red" ? "rgba(255,215,200,0.30)" : "rgba(200,200,200,0.25)";

  return (
    <PieceBase {...props} char={char}>
      {/* Left tusk */}
      <path
        d={`M${x - 0.46} ${y + 0.18} Q${x - 0.34} ${y - 0.34} ${x - 0.08} ${y - 0.50}`}
        fill="none" strokeWidth="0.052" />
      {/* Right tusk */}
      <path
        d={`M${x + 0.46} ${y + 0.18} Q${x + 0.34} ${y - 0.34} ${x + 0.08} ${y - 0.50}`}
        fill="none" strokeWidth="0.052" />
      {/* Forehead arc */}
      <path
        d={`M${x - 0.30} ${y - 0.30} Q${x} ${y - 0.52} ${x + 0.30} ${y - 0.30}`}
        fill="none" strokeWidth="0.030" />
      {/* Eyes */}
      <circle cx={x - 0.18} cy={y - 0.20} r={0.065} fill={dotCol} strokeWidth="0" />
      <circle cx={x + 0.18} cy={y - 0.20} r={0.065} fill={dotCol} strokeWidth="0" />
    </PieceBase>
  );
}

export function getElephantMoves(
  x: number,
  y: number,
  side: "red" | "black",
  board: (any | null)[][]
) {
  const moves = [];

  const directions = [
    { dx: 2, dy: 2 },
    { dx: 2, dy: -2 },
    { dx: -2, dy: 2 },
    { dx: -2, dy: -2 },
  ];

  for (const dir of directions) {
    const nx = x + dir.dx;
    const ny = y + dir.dy;

    // ── kiểm tra trong bàn ──
    if (nx < 0 || nx > 8 || ny < 0 || ny > 9) {
      continue;
    }

    // ── không được qua sông ──
    if (side === "red" && ny < 5) {
      continue;
    }

    if (side === "black" && ny > 4) {
      continue;
    }

    // ── kiểm tra mắt tượng ──
    const eyeX = x + dir.dx / 2;
    const eyeY = y + dir.dy / 2;

    if (board[eyeY][eyeX] !== null) {
      continue;
    }

    // ── ô đích ──
    const target = board[ny][nx];

    // ăn quân hoặc ô trống
    if (!target || target.side !== side) {
      moves.push({ x: nx, y: ny });
    }
  }

  return moves;
}