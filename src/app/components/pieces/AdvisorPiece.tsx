import React from "react";
import { PieceBase } from "./PieceBase";
import { PieceProps } from "./types";

// ── 士 / 仕 — ADVISOR ────────────────────────────────────────────────────────
// Decoration: double-diamond outline + 4 cardinal dots

export function AdvisorPiece(props: PieceProps) {
  const { x, y, side } = props;
  const char = side === "red" ? "仕" : "士";
  const d = 0.44;
  const dotCol = side === "red" ? "rgba(255,215,200,0.30)" : "rgba(200,200,200,0.25)";

  return (
    <PieceBase {...props} char={char}>
      {/* Outer diamond */}
      <polygon
        points={`${x},${y - d} ${x + d},${y} ${x},${y + d} ${x - d},${y}`}
        fill="none" strokeWidth="0.042" />
      {/* Inner diamond */}
      <polygon
        points={`${x},${y - d * 0.55} ${x + d * 0.55},${y} ${x},${y + d * 0.55} ${x - d * 0.55},${y}`}
        fill="none" strokeWidth="0.026" />
      {/* 4 cardinal dots */}
      {[0, 90, 180, 270].map((deg, i) => {
        const a = (deg * Math.PI) / 180;
        return (
          <circle key={i}
            cx={x + Math.cos(a) * 0.24} cy={y + Math.sin(a) * 0.24}
            r={0.058} fill={dotCol} strokeWidth="0" />
        );
      })}
    </PieceBase>
  );
}
