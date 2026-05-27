import React from "react";
import { PieceBase } from "./PieceBase";
import { PieceProps } from "./types";

// ── 兵 / 卒 — SOLDIER ────────────────────────────────────────────────────────
// Decoration: sword cross (vertical blade + upper guard + lower bar + pommel)

export function SoldierPiece(props: PieceProps) {
  const { x, y, side } = props;
  const char = side === "red" ? "兵" : "卒";
  const vArm = 0.42, hArm = 0.30, hY = -0.14;

  return (
    <PieceBase {...props} char={char}>
      {/* Vertical blade */}
      <line x1={x} y1={y - vArm} x2={x} y2={y + vArm} strokeWidth="0.058" />
      {/* Upper cross guard */}
      <line x1={x - hArm} y1={y + hY} x2={x + hArm} y2={y + hY} strokeWidth="0.058" />
      {/* Lower short bar */}
      <line
        x1={x - hArm * 0.55} y1={y + 0.16}
        x2={x + hArm * 0.55} y2={y + 0.16}
        strokeWidth="0.038" />
      {/* Pommel at blade tip */}
      <circle cx={x} cy={y + vArm - 0.04} r={0.075} fill="inherit" strokeWidth="0.030" />
    </PieceBase>
  );
}
