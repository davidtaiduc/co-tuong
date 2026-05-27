import React from "react";
import { PieceBase } from "./PieceBase";
import { PieceProps } from "./types";

// ── 馬 / 傌 — HORSE ──────────────────────────────────────────────────────────
// Decoration: 4 L-brackets at corners (knight-move motif) + horseshoe arc

export function HorsePiece(props: PieceProps) {
  const { x, y, side } = props;
  const char = side === "red" ? "傌" : "馬";
  const arm = 0.30, gap = 0.12;
  const corners: [number, number][] = [[-1, -1], [1, -1], [1, 1], [-1, 1]];

  return (
    <PieceBase {...props} char={char}>
      {/* 4 L-shaped corner brackets */}
      {corners.map(([dx, dy], i) => {
        const bx = x + dx * (gap + arm * 0.5);
        const by = y + dy * (gap + arm * 0.5);
        return (
          <path key={i}
            d={`M${bx} ${by - dy * arm} L${bx} ${by} L${bx + dx * arm} ${by}`}
            fill="none" strokeWidth="0.052" />
        );
      })}
      {/* Horseshoe arc */}
      <path
        d={`M${x - 0.22} ${y + 0.28} Q${x} ${y - 0.10} ${x + 0.22} ${y + 0.28}`}
        fill="none" strokeWidth="0.032" />
    </PieceBase>
  );
}
