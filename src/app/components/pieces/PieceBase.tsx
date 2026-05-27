import React from "react";
import { PIECE_R, PieceProps } from "./types";

// ── PieceBase ────────────────────────────────────────────────────────────────
// Shared 5-layer wooden disc used by every piece component.
// Rendering order: wood ring → grain ring → gold ring → lacquer → decoration → engraving ring → shine → char
//
// SVG gradient/filter IDs are defined once in XiangqiBoard's <defs>:
//   woodN / woodS   — wood outer ring (normal / selected)
//   redN  / redS    — red lacquer face (normal / selected)
//   blkN  / blkS    — dark lacquer face (normal / selected)
//   ps              — drop shadow filter
//   glow            — selection glow filter

interface PieceBaseProps extends PieceProps {
  char: string;
  children?: React.ReactNode;
}

export function PieceBase({ x, y, side, selected, char, children }: PieceBaseProps) {
  const R = PIECE_R;
  const isRed = side === "red";

  const woodId   = selected ? "woodS" : "woodN";
  const faceId   = isRed ? (selected ? "redS" : "redN") : (selected ? "blkS" : "blkN");
  const textCol  = isRed ? "#ffdcdc" : "#d8d8d8";
  const glowCol  = isRed ? "rgba(255,120,120,0.9)" : "rgba(200,200,200,0.7)";
  const decorStr = isRed ? "rgba(255,215,200,0.20)" : "rgba(200,200,200,0.17)";
  const decorFil = isRed ? "rgba(255,215,200,0.22)" : "rgba(200,200,200,0.19)";

  return (
    <g filter={selected ? "url(#glow)" : "url(#ps)"}>
      {selected && (
        <circle cx={x} cy={y} r={R + 0.17}
          fill="none" stroke={glowCol} strokeWidth="0.13" />
      )}

      {/* Layer 1 — wood outer body */}
      <circle cx={x} cy={y} r={R} fill={`url(#${woodId})`} />

      {/* Layer 2 — wood-grain concentric ring */}
      <circle cx={x} cy={y} r={R * 0.91}
        fill="none" stroke="rgba(160,90,25,0.28)" strokeWidth="0.042" />

      {/* Layer 3 — gold separator ring */}
      <circle cx={x} cy={y} r={R * 0.82}
        fill="none" stroke="#d4a843" strokeWidth="0.058" opacity="0.90" />

      {/* Layer 4 — lacquer face */}
      <circle cx={x} cy={y} r={R * 0.78} fill={`url(#${faceId})`} />

      {/* Layer 5 — piece-specific decoration (watermark beneath character) */}
      <g stroke={decorStr} fill={decorFil}
        strokeWidth="0.042" strokeLinecap="round" strokeLinejoin="round">
        {children}
      </g>

      {/* Inner engraving ring */}
      <circle cx={x} cy={y} r={R * 0.67}
        fill="none"
        stroke={isRed ? "rgba(255,170,170,0.20)" : "rgba(190,190,190,0.16)"}
        strokeWidth="0.032" />

      {/* Specular shine — top-left highlight */}
      <ellipse
        cx={x - R * 0.29} cy={y - R * 0.29}
        rx={R * 0.21} ry={R * 0.11}
        fill="rgba(255,255,255,0.28)"
        transform={`rotate(-38,${x - R * 0.29},${y - R * 0.29})`} />

      {/* Chinese character */}
      <text
        x={x} y={y}
        textAnchor="middle" dominantBaseline="central"
        fontSize={R * 0.90} fontWeight="700" fill={textCol}
        style={{ fontFamily: "'Noto Serif SC', serif", userSelect: "none" }}>
        {char}
      </text>
    </g>
  );
}
