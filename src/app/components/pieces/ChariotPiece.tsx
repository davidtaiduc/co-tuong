import React from "react";
import { PieceBase } from "./PieceBase";
import { PieceProps } from "./types";

// ── 車 / 俥 — CHARIOT ────────────────────────────────────────────────────────
// Decoration: 4-spoke wheel with rim + hub

export function ChariotPiece(props: PieceProps) {
  const { x, y, side } = props;
  const char = side === "red" ? "俥" : "車";
  const rim = 0.49, hub = 0.10;

  return (
    <PieceBase {...props} char={char}>
      {/* Outer rim */}
      <circle cx={x} cy={y} r={rim} fill="none" strokeWidth="0.040" />
      {/* 4 spokes at 0 / 90 / 180 / 270° */}
      {[0, 90, 180, 270].map((deg, i) => {
        const a = (deg * Math.PI) / 180;
        return (
          <line key={i}
            x1={x + Math.cos(a) * hub} y1={y + Math.sin(a) * hub}
            x2={x + Math.cos(a) * rim} y2={y + Math.sin(a) * rim}
            strokeWidth="0.055" />
        );
      })}
      {/* Hub */}
      <circle cx={x} cy={y} r={hub} fill="inherit" strokeWidth="0.040" />
    </PieceBase>
  );
}
