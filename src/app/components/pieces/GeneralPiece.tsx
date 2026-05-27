import React from "react";
import { PieceBase } from "./PieceBase";
import { PieceProps } from "./types";

// ── 将 / 帥 — GENERAL ────────────────────────────────────────────────────────
// Decoration: 8-spoke crown radiating from center + octagon outline + center dot

export function GeneralPiece(props: PieceProps) {
  const { x, y, side } = props;
  const char = side === "red" ? "帥" : "将";
  const outer = 0.50, inner = 0.22;

  return (
    <PieceBase {...props} char={char}>
      {/* 8 radial spokes */}
      {Array.from({ length: 8 }, (_, i) => {
        const a = (i * Math.PI) / 4;
        return (
          <line key={i}
            x1={x + Math.cos(a) * inner} y1={y + Math.sin(a) * inner}
            x2={x + Math.cos(a) * outer} y2={y + Math.sin(a) * outer}
            strokeWidth="0.038" />
        );
      })}
      {/* Octagon outline */}
      <polygon
        points={Array.from({ length: 8 }, (_, i) => {
          const a = (i * Math.PI) / 4;
          return `${x + Math.cos(a) * 0.37},${y + Math.sin(a) * 0.37}`;
        }).join(" ")}
        fill="none" strokeWidth="0.032" />
      {/* Center dot */}
      <circle cx={x} cy={y} r={0.060} fill="inherit" strokeWidth="0" />
    </PieceBase>
  );
}
