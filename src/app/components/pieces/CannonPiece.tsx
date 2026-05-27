import React from "react";
import { PieceBase } from "./PieceBase";
import { PieceProps } from "./types";

// ── 砲 / 炮 — CANNON ─────────────────────────────────────────────────────────
// Decoration: 3 concentric barrel rings (front view) + center bore + 4 diagonal vents

export function CannonPiece(props: PieceProps) {
  const { x, y, side } = props;
  const char = side === "red" ? "炮" : "砲";
  const dotCol = side === "red" ? "rgba(255,215,200,0.30)" : "rgba(200,200,200,0.25)";

  return (
    <PieceBase {...props} char={char}>
      {/* 3 concentric rings */}
      <circle cx={x} cy={y} r={0.49} fill="none" strokeWidth="0.038" />
      <circle cx={x} cy={y} r={0.33} fill="none" strokeWidth="0.032" />
      <circle cx={x} cy={y} r={0.18} fill="none" strokeWidth="0.038" />
      {/* Center bore */}
      <circle cx={x} cy={y} r={0.062} fill={dotCol} strokeWidth="0" />
      {/* 4 diagonal vent holes */}
      {[45, 135, 225, 315].map((deg, i) => {
        const a = (deg * Math.PI) / 180;
        return (
          <circle key={i}
            cx={x + Math.cos(a) * 0.41} cy={y + Math.sin(a) * 0.41}
            r={0.040} fill={dotCol} strokeWidth="0" />
        );
      })}
    </PieceBase>
  );
}
