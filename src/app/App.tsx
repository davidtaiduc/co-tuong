import { useState, useEffect, useCallback } from "react";
import {
  GeneralPiece, AdvisorPiece, ElephantPiece, HorsePiece,
  ChariotPiece, CannonPiece, SoldierPiece, PIECE_R,
} from "./components/pieces";
import {
  buildBoard,getPseudoMoves,getLegalMoves,isCheck,isCheckmate,isStalemate} from "./game";
import type { Piece, PieceType, PieceSide, Position } from "./game";
import {
  Sword, Shield, Trophy, Settings, Bell, Coins,
  ChevronRight, RotateCcw, Lightbulb, MessageCircle,
  Flag, Home, Share2, Star, Zap, Crown, Users, Bot,
  BookOpen, ArrowLeft, X, Check
} from "lucide-react";

type Screen = "home" | "game" | "matchmaking" | "result";
interface MoveRecord {
  piece: string;
  from: string;
  to: string;
  captured?: string;
}

const INITIAL_PIECES: Piece[] = [
  // Black pieces (top)
  { id: "b-che-1", type: "車", side: "black", row: 0, col: 0 },
  { id: "b-ma-1", type: "馬", side: "black", row: 0, col: 1 },
  { id: "b-xiang-1", type: "象", side: "black", row: 0, col: 2 },
  { id: "b-shi-1", type: "士", side: "black", row: 0, col: 3 },
  { id: "b-jiang", type: "将", side: "black", row: 0, col: 4 },
  { id: "b-shi-2", type: "士", side: "black", row: 0, col: 5 },
  { id: "b-xiang-2", type: "象", side: "black", row: 0, col: 6 },
  { id: "b-ma-2", type: "馬", side: "black", row: 0, col: 7 },
  { id: "b-che-2", type: "車", side: "black", row: 0, col: 8 },
  { id: "b-pao-1", type: "砲", side: "black", row: 2, col: 1 },
  { id: "b-pao-2", type: "砲", side: "black", row: 2, col: 7 },
  { id: "b-zu-1", type: "卒", side: "black", row: 3, col: 0 },
  { id: "b-zu-2", type: "卒", side: "black", row: 3, col: 2 },
  { id: "b-zu-3", type: "卒", side: "black", row: 3, col: 4 },
  { id: "b-zu-4", type: "卒", side: "black", row: 3, col: 6 },
  { id: "b-zu-5", type: "卒", side: "black", row: 3, col: 8 },
  // Red pieces (bottom)
  { id: "r-che-1", type: "俥", side: "red", row: 9, col: 0 },
  { id: "r-ma-1", type: "傌", side: "red", row: 9, col: 1 },
  { id: "r-xiang-1", type: "相", side: "red", row: 9, col: 2 },
  { id: "r-shi-1", type: "仕", side: "red", row: 9, col: 3 },
  { id: "r-shuai", type: "帥", side: "red", row: 9, col: 4 },
  { id: "r-shi-2", type: "仕", side: "red", row: 9, col: 5 },
  { id: "r-xiang-2", type: "相", side: "red", row: 9, col: 6 },
  { id: "r-ma-2", type: "傌", side: "red", row: 9, col: 7 },
  { id: "r-che-2", type: "俥", side: "red", row: 9, col: 8 },
  { id: "r-pao-1", type: "炮", side: "red", row: 7, col: 1 },
  { id: "r-pao-2", type: "炮", side: "red", row: 7, col: 7 },
  { id: "r-bing-1", type: "兵", side: "red", row: 6, col: 0 },
  { id: "r-bing-2", type: "兵", side: "red", row: 6, col: 2 },
  { id: "r-bing-3", type: "兵", side: "red", row: 6, col: 4 },
  { id: "r-bing-4", type: "兵", side: "red", row: 6, col: 6 },
  { id: "r-bing-5", type: "兵", side: "red", row: 6, col: 8 },
];

const MOVE_HISTORY: MoveRecord[] = [
  { piece: "炮", from: "b2", to: "e2" },
  { piece: "馬", from: "h8", to: "g6" },
  { piece: "俥", from: "a1", to: "a4" },
  { piece: "車", from: "a10", to: "a7" },
];

function colToLetter(col: number): string {
  return String.fromCharCode(97 + col);
}

// ─── Decorative Chinese background elements ────────────────────────────────

function InkBrushDecor() {
  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none opacity-5"
      viewBox="0 0 390 844"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="xMidYMid slice"
    >
      {/* Large ink brushstroke mountain */}
      <path d="M-20 600 Q80 400 160 350 Q200 300 240 280 Q280 300 320 350 Q400 400 420 600Z" fill="#d4a843" opacity="0.15" />
      <path d="M100 700 Q150 500 200 450 Q250 500 300 700Z" fill="#c8102e" opacity="0.1" />
      {/* Bamboo stems */}
      <line x1="50" y1="800" x2="60" y2="100" stroke="#d4a843" strokeWidth="3" opacity="0.3" />
      <line x1="55" y1="800" x2="65" y2="100" stroke="#d4a843" strokeWidth="1" opacity="0.2" />
      <ellipse cx="57" cy="200" rx="20" ry="6" fill="#d4a843" opacity="0.2" />
      <ellipse cx="57" cy="350" rx="22" ry="7" fill="#d4a843" opacity="0.2" />
      <ellipse cx="57" cy="500" rx="18" ry="5" fill="#d4a843" opacity="0.2" />
      <line x1="330" y1="800" x2="320" y2="200" stroke="#8a6a3a" strokeWidth="2" opacity="0.2" />
      <ellipse cx="325" cy="300" rx="18" ry="5" fill="#8a6a3a" opacity="0.15" />
      <ellipse cx="325" cy="450" rx="20" ry="6" fill="#8a6a3a" opacity="0.15" />
      {/* Chinese cloud motifs */}
      <path d="M280 80 Q290 60 310 65 Q320 50 340 60 Q355 55 360 70 Q370 65 375 80 Q365 90 350 85 Q340 95 320 90 Q305 95 290 85 Z" fill="#d4a843" opacity="0.2" />
      <path d="M20 150 Q30 130 50 135 Q60 120 80 130 Q95 125 100 140 Q110 135 115 150 Q105 160 90 155 Q80 165 60 160 Q45 165 30 155 Z" fill="#c8102e" opacity="0.15" />
      {/* Dragon scale pattern */}
      <path d="M340 750 Q355 730 370 750 Q355 770 340 750Z" fill="#d4a843" opacity="0.2" />
      <path d="M320 770 Q335 750 350 770 Q335 790 320 770Z" fill="#d4a843" opacity="0.2" />
      <path d="M360 770 Q375 750 390 770 Q375 790 360 770Z" fill="#d4a843" opacity="0.2" />
    </svg>
  );
}

function ParticleField() {
  const particles = Array.from({ length: 20 }, (_, i) => ({
    id: i,
    left: `${(i * 17 + 5) % 95}%`,
    top: `${(i * 23 + 10) % 90}%`,
    size: i % 3 === 0 ? 3 : i % 3 === 1 ? 2 : 1,
    delay: `${(i * 0.4) % 3}s`,
    duration: `${3 + (i % 4)}s`,
  }));

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute rounded-full"
          style={{
            left: p.left,
            top: p.top,
            width: p.size,
            height: p.size,
            background: p.id % 2 === 0 ? "#d4a843" : "#c8102e",
            boxShadow: p.id % 2 === 0 ? "0 0 6px #d4a843" : "0 0 6px #c8102e",
            animation: `float ${p.duration} ${p.delay} ease-in-out infinite alternate`,
            opacity: 0.6,
          }}
        />
      ))}
      <style>{`
        @keyframes float {
          0% { transform: translateY(0px) scale(1); opacity: 0.4; }
          100% { transform: translateY(-12px) scale(1.3); opacity: 0.9; }
        }
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes pulse-glow {
          0%, 100% { box-shadow: 0 0 8px currentColor; opacity: 0.8; }
          50% { box-shadow: 0 0 20px currentColor, 0 0 40px currentColor; opacity: 1; }
        }
        @keyframes search-ring {
          0% { transform: scale(0.8); opacity: 1; }
          100% { transform: scale(2); opacity: 0; }
        }
        @keyframes victory-burst {
          0% { transform: scale(0) rotate(0deg); opacity: 1; }
          100% { transform: scale(3) rotate(180deg); opacity: 0; }
        }
        @keyframes slide-up {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        @keyframes rank-ping {
          0% { transform: scale(1); }
          50% { transform: scale(1.05); }
          100% { transform: scale(1); }
        }
      `}</style>
    </div>
  );
}

// ─── Reusable UI atoms ─────────────────────────────────────────────────────

function GoldDivider() {
  return (
    <div className="flex items-center gap-2 w-full">
      <div className="flex-1 h-px" style={{ background: "linear-gradient(to right, transparent, #d4a843)" }} />
      <div className="w-1.5 h-1.5 rotate-45" style={{ background: "#d4a843" }} />
      <div className="flex-1 h-px" style={{ background: "linear-gradient(to left, transparent, #d4a843)" }} />
    </div>
  );
}

function GoldButton({
  children, onClick, className = "", variant = "primary", size = "md"
}: {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
}) {
  const base = "relative font-semibold tracking-wider transition-all duration-200 active:scale-95 select-none overflow-hidden";
  const sizes = { sm: "px-4 py-1.5 text-xs rounded-lg", md: "px-6 py-2.5 text-sm rounded-xl", lg: "px-8 py-4 text-base rounded-2xl" };
  const variants = {
    primary: "text-[#0d0a08]",
    secondary: "text-[#d4a843]",
    ghost: "text-[#d4a843]",
    danger: "text-white",
  };
  const backgrounds = {
    primary: "linear-gradient(135deg, #e8c870 0%, #d4a843 40%, #b8902e 100%)",
    secondary: "linear-gradient(135deg, rgba(42,26,8,0.9), rgba(58,37,16,0.9))",
    ghost: "transparent",
    danger: "linear-gradient(135deg, #c8102e, #8a0a1e)",
  };
  const borders = {
    primary: "2px solid #e8c870",
    secondary: "1px solid rgba(212,168,67,0.4)",
    ghost: "1px solid rgba(212,168,67,0.2)",
    danger: "1px solid #c8102e",
  };

  return (
    <button
      onClick={onClick}
      className={`${base} ${sizes[size]} ${variants[variant]} ${className}`}
      style={{ background: backgrounds[variant], border: borders[variant], boxShadow: variant === "primary" ? "0 4px 20px rgba(212,168,67,0.4), inset 0 1px 0 rgba(255,255,255,0.2)" : variant === "danger" ? "0 4px 16px rgba(200,16,46,0.4)" : "0 2px 8px rgba(0,0,0,0.4)" }}
    >
      <span className="relative z-10 flex items-center justify-center gap-2">{children}</span>
    </button>
  );
}

function PlayerAvatar({ name, rating, side, isActive = false }: { name: string; rating: number; side: PieceSide; isActive?: boolean }) {
  const initials = name.slice(0, 2).toUpperCase();
  return (
    <div className={`flex items-center gap-3 p-3 rounded-2xl transition-all duration-300 ${isActive ? "bg-[rgba(212,168,67,0.1)]" : "bg-[rgba(26,17,8,0.6)]"}`}
      style={{ border: isActive ? "1px solid rgba(212,168,67,0.5)" : "1px solid rgba(212,168,67,0.15)", boxShadow: isActive ? "0 0 20px rgba(212,168,67,0.15)" : "none" }}>
      <div className="relative">
        <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold"
          style={{ background: side === "red" ? "linear-gradient(135deg,#c8102e,#8a0a1e)" : "linear-gradient(135deg,#2a2a2a,#1a1a1a)", border: "2px solid", borderColor: side === "red" ? "#c8102e" : "#555", color: "#f5e6c8" }}>
          {initials}
        </div>
        {isActive && (
          <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-green-400 border-2 border-[#0d0a08]" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-[#f5e6c8] truncate" style={{ fontFamily: "'Inter', sans-serif" }}>{name}</p>
        <p className="text-xs" style={{ color: "#d4a843" }}>{rating} ELO</p>
      </div>
      {isActive && (
        <div className="flex items-center gap-1 text-xs text-green-400 font-medium">
          <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          TURN
        </div>
      )}
    </div>
  );
}

// ─── HOME SCREEN ──────────────────────────────────────────────────────────

function HomeScreen({ onNavigate }: { onNavigate: (s: Screen) => void }) {
  const menuItems = [
    { icon: <Users size={18} />, label: "Online Match", action: () => onNavigate("matchmaking"), color: "#d4a843" },
    { icon: <Bot size={18} />, label: "AI Mode", action: () => onNavigate("game"), color: "#8ab4d4" },
    { icon: <Sword size={18} />, label: "Local 2 Players", action: () => onNavigate("game"), color: "#c8102e" },
    { icon: <BookOpen size={18} />, label: "Tutorial", action: () => {}, color: "#7ab87a" },
    { icon: <Settings size={18} />, label: "Settings", action: () => {}, color: "#a0a0a0" },
  ];

  return (
    <div className="relative flex flex-col h-full overflow-hidden" style={{ background: "linear-gradient(180deg, #0d0a08 0%, #1a0c04 40%, #0d0a08 100%)" }}>
      <InkBrushDecor />
      <ParticleField />

      {/* Top bar */}
      <div className="relative z-10 flex items-center justify-between px-5 pt-12 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold"
            style={{ background: "linear-gradient(135deg,#c8102e,#8a0a1e)", border: "2px solid #d4a843", color: "#f5e6c8", boxShadow: "0 0 12px rgba(200,16,46,0.5)" }}>
            龙
          </div>
          <div>
            <p className="text-sm font-semibold text-[#f5e6c8]" style={{ fontFamily: "'Inter',sans-serif" }}>DragonMaster</p>
            <div className="flex items-center gap-1">
              <Crown size={10} style={{ color: "#d4a843" }} />
              <span className="text-xs" style={{ color: "#d4a843" }}>Grandmaster III</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl" style={{ background: "rgba(212,168,67,0.1)", border: "1px solid rgba(212,168,67,0.3)" }}>
            <Coins size={13} style={{ color: "#d4a843" }} />
            <span className="text-xs font-semibold" style={{ color: "#d4a843" }}>8,420</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl" style={{ background: "rgba(200,16,46,0.1)", border: "1px solid rgba(200,16,46,0.3)" }}>
            <Star size={13} style={{ color: "#c8102e" }} />
            <span className="text-xs font-semibold" style={{ color: "#c8102e" }}>2,847</span>
          </div>
          <button className="relative w-9 h-9 flex items-center justify-center rounded-full" style={{ background: "rgba(26,17,8,0.8)", border: "1px solid rgba(212,168,67,0.2)" }}>
            <Bell size={16} style={{ color: "#d4a843" }} />
            <div className="absolute top-1 right-1 w-2 h-2 rounded-full bg-[#c8102e]" />
          </button>
        </div>
      </div>

      {/* Hero title */}
      <div className="relative z-10 flex flex-col items-center px-5 pt-6 pb-2">
        <p className="text-xs tracking-[0.3em] uppercase mb-2" style={{ color: "#8a6a3a", fontFamily: "'Inter',sans-serif" }}>中国象棋</p>
        <h1 className="text-5xl font-black text-center leading-tight mb-1"
          style={{ fontFamily: "'Cinzel',serif", background: "linear-gradient(135deg, #e8c870 0%, #d4a843 50%, #b8902e 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
          XIANGQI
        </h1>
        <p className="text-sm text-center mb-4" style={{ color: "#8a6a3a", fontFamily: "'Inter',sans-serif" }}>The Art of War on the Board</p>
        <GoldDivider />
      </div>

      {/* Main Play button */}
      <div className="relative z-10 flex justify-center px-5 py-6">
        <button
          onClick={() => onNavigate("matchmaking")}
          className="relative w-48 h-48 rounded-full flex flex-col items-center justify-center transition-all duration-200 active:scale-95"
          style={{
            background: "radial-gradient(circle at 35% 35%, #e8c870, #d4a843 40%, #8a5a1e 80%, #3a2508)",
            border: "3px solid #e8c870",
            boxShadow: "0 0 40px rgba(212,168,67,0.5), 0 0 80px rgba(212,168,67,0.2), inset 0 2px 4px rgba(255,255,255,0.2)",
          }}
        >
          <div className="absolute inset-2 rounded-full" style={{ border: "1px solid rgba(255,255,255,0.15)" }} />
          <div className="absolute inset-4 rounded-full" style={{ border: "1px solid rgba(212,168,67,0.3)" }} />
          <Sword size={36} className="mb-2" style={{ color: "#0d0a08" }} />
          <span className="text-2xl font-black tracking-widest" style={{ fontFamily: "'Cinzel',serif", color: "#0d0a08" }}>PLAY</span>
          <div className="flex gap-1 mt-1">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="w-1 h-1 rounded-full" style={{ background: "#0d0a08", opacity: 0.5 }} />
            ))}
          </div>
        </button>
      </div>

      {/* Menu buttons */}
      <div className="relative z-10 flex flex-col gap-2.5 px-5 pb-6">
        {menuItems.map((item, i) => (
          <button
            key={i}
            onClick={item.action}
            className="flex items-center gap-4 px-5 py-3.5 rounded-2xl w-full transition-all duration-200 active:scale-[0.98]"
            style={{
              background: "linear-gradient(135deg, rgba(26,17,8,0.9), rgba(42,26,8,0.7))",
              border: "1px solid rgba(212,168,67,0.2)",
              boxShadow: "0 2px 12px rgba(0,0,0,0.4)",
            }}
          >
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: `${item.color}20`, border: `1px solid ${item.color}40`, color: item.color }}>
              {item.icon}
            </div>
            <span className="flex-1 text-left text-sm font-medium" style={{ color: "#f5e6c8", fontFamily: "'Inter',sans-serif" }}>{item.label}</span>
            <ChevronRight size={16} style={{ color: "#8a6a3a" }} />
          </button>
        ))}
      </div>

      {/* Bottom rank card */}
      <div className="relative z-10 mx-5 mb-8 p-4 rounded-2xl" style={{ background: "linear-gradient(135deg,rgba(200,16,46,0.1),rgba(212,168,67,0.05))", border: "1px solid rgba(200,16,46,0.2)" }}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Trophy size={14} style={{ color: "#d4a843" }} />
            <span className="text-xs font-semibold" style={{ color: "#d4a843", fontFamily: "'Inter',sans-serif" }}>Season Rank Progress</span>
          </div>
          <span className="text-xs" style={{ color: "#8a6a3a" }}>153 pts to Diamond</span>
        </div>
        <div className="w-full h-2 rounded-full" style={{ background: "rgba(212,168,67,0.15)" }}>
          <div className="h-full rounded-full" style={{ width: "67%", background: "linear-gradient(90deg,#c8102e,#d4a843)", boxShadow: "0 0 8px rgba(212,168,67,0.6)" }} />
        </div>
      </div>
    </div>
  );
}

// ─── GAME BOARD SCREEN ────────────────────────────────────────────────────

// Dispatch table: piece character → imported component
// To edit a piece, open src/components/pieces/<PieceName>.tsx
import type { PieceProps } from "./components/pieces";
const PIECE_RENDERERS: Record<PieceType, React.ComponentType<PieceProps>> = {
  "将": GeneralPiece,  "帥": GeneralPiece,
  "士": AdvisorPiece,  "仕": AdvisorPiece,
  "象": ElephantPiece, "相": ElephantPiece,
  "馬": HorsePiece,    "傌": HorsePiece,
  "車": ChariotPiece,  "俥": ChariotPiece,
  "砲": CannonPiece,   "炮": CannonPiece,
  "兵": SoldierPiece,  "卒": SoldierPiece,
};

// ═══════════════════════════════════════════════════════════════════════════
// BOARD COMPONENT
// Pure SVG — single coordinate system, zero alignment drift
// viewBox "0 0 18 20": padding=1u, spacing=2u, intersection(c,r)=(1+c*2, 1+r*2)
// ═══════════════════════════════════════════════════════════════════════════
function XiangqiBoard({ pieces, selected, highlights, onCellClick, inCheckSide, disabled }: {
  pieces: Piece[];
  selected: string | null;
  highlights: Array<{ row: number; col: number }>;
  onCellClick: (row: number, col: number) => void;
  inCheckSide?: PieceSide | null;
  disabled?: boolean;
}) {
  const R = PIECE_R;
  const sx = (col: number) => 1 + col * 2;
  const sy = (row: number) => 1 + row * 2;

  const pieceAt = (r: number, c: number) => pieces.find(p => p.row === r && p.col === c);

  const handleClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (disabled) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 18;
    const y = ((e.clientY - rect.top) / rect.height) * 20;
    const col = Math.round((x - 1) / 2);
    const row = Math.round((y - 1) / 2);
    if (col >= 0 && col <= 8 && row >= 0 && row <= 9) onCellClick(row, col);
  };

  const checkedKing = inCheckSide
    ? pieces.find(p => p.side === inCheckSide && (p.type === "将" || p.type === "帥"))
    : null;

  const bracketPositions = [
    { c:0,r:3 },{ c:2,r:3 },{ c:4,r:3 },{ c:6,r:3 },{ c:8,r:3 },
    { c:0,r:6 },{ c:2,r:6 },{ c:4,r:6 },{ c:6,r:6 },{ c:8,r:6 },
    { c:1,r:2 },{ c:7,r:2 },{ c:1,r:7 },{ c:7,r:7 },
  ];

  return (
    <div style={{ width: "100%", aspectRatio: "9/10" }}>
      <svg
        viewBox="0 0 18 20"
        style={{ width: "100%", height: "100%", cursor: "pointer", display: "block" }}
        onClick={handleClick}
      >
        <defs>
          {/* Board wood */}
          <radialGradient id="bg" cx="40%" cy="35%" r="75%">
            <stop offset="0%"   stopColor="#5c3510" />
            <stop offset="55%"  stopColor="#2d1a06" />
            <stop offset="100%" stopColor="#180d04" />
          </radialGradient>

          {/* Piece wood outer ring */}
          <radialGradient id="woodN" cx="32%" cy="22%" r="72%">
            <stop offset="0%"   stopColor="#e0a060" />
            <stop offset="30%"  stopColor="#b06828" />
            <stop offset="70%"  stopColor="#7a3e0e" />
            <stop offset="100%" stopColor="#3e1c04" />
          </radialGradient>
          <radialGradient id="woodS" cx="32%" cy="22%" r="72%">
            <stop offset="0%"   stopColor="#f0b878" />
            <stop offset="30%"  stopColor="#cc8040" />
            <stop offset="70%"  stopColor="#9a5018" />
            <stop offset="100%" stopColor="#5a2808" />
          </radialGradient>

          {/* Red lacquer */}
          <radialGradient id="redN" cx="32%" cy="22%" r="72%">
            <stop offset="0%"   stopColor="#ff9898" />
            <stop offset="28%"  stopColor="#cc1800" />
            <stop offset="65%"  stopColor="#8c1000" />
            <stop offset="100%" stopColor="#480600" />
          </radialGradient>
          <radialGradient id="redS" cx="32%" cy="22%" r="72%">
            <stop offset="0%"   stopColor="#ffb8b8" />
            <stop offset="28%"  stopColor="#ee2800" />
            <stop offset="65%"  stopColor="#aa1800" />
            <stop offset="100%" stopColor="#6a0a00" />
          </radialGradient>

          {/* Dark lacquer */}
          <radialGradient id="blkN" cx="32%" cy="22%" r="72%">
            <stop offset="0%"   stopColor="#909090" />
            <stop offset="28%"  stopColor="#404040" />
            <stop offset="65%"  stopColor="#181818" />
            <stop offset="100%" stopColor="#040404" />
          </radialGradient>
          <radialGradient id="blkS" cx="32%" cy="22%" r="72%">
            <stop offset="0%"   stopColor="#b0b0b0" />
            <stop offset="28%"  stopColor="#606060" />
            <stop offset="65%"  stopColor="#282828" />
            <stop offset="100%" stopColor="#0c0c0c" />
          </radialGradient>

          {/* Filters */}
          <filter id="ps" x="-25%" y="-25%" width="150%" height="150%">
            <feDropShadow dx="0" dy="0.14" stdDeviation="0.16" floodColor="#000" floodOpacity="0.75" />
          </filter>
          <filter id="glow" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="0.28" result="b" />
            <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
          <filter id="goldglow" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="0.22" result="b" />
            <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
          <filter id="checkglow" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="0.35" result="b" />
            <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
        </defs>

        {/* ── Board background ── */}
        <rect x="0" y="0" width="18" height="20" rx="0.9" fill="url(#bg)" />
        {Array.from({ length: 14 }, (_, i) => (
          <line key={`g${i}`} x1="0" y1={i * 1.45} x2="18" y2={i * 1.45 + 0.25}
            stroke="rgba(255,200,120,0.04)" strokeWidth="0.55" />
        ))}

        {/* Board border frames */}
        <rect x="0.15" y="0.15" width="17.7" height="19.7" rx="0.75"
          fill="none" stroke="rgba(212,168,67,0.45)" strokeWidth="0.12" />
        <rect x="0.45" y="0.45" width="17.1" height="19.1" rx="0.55"
          fill="none" stroke="rgba(212,168,67,0.18)" strokeWidth="0.06" />

        {/* ── Grid lines ── */}
        {Array.from({ length: 10 }, (_, r) => (
          <line key={`h${r}`} x1={sx(0)} y1={sy(r)} x2={sx(8)} y2={sy(r)}
            stroke="rgba(212,168,67,0.42)" strokeWidth="0.045" />
        ))}
        {Array.from({ length: 9 }, (_, c) => (
          <line key={`v${c}`} x1={sx(c)} y1={sy(0)} x2={sx(c)} y2={sy(9)}
            stroke="rgba(212,168,67,0.42)" strokeWidth="0.045" />
        ))}

        {/* ── River zone ── */}
        <rect x={sx(0)} y={sy(4) + 0.06} width={sx(8) - sx(0)} height={sy(5) - sy(4) - 0.12}
          fill="rgba(0,0,0,0.18)" />
        <text x="5.5" y="10.02" textAnchor="middle" dominantBaseline="central"
          fill="rgba(212,168,67,0.48)" fontSize="1.05"
          style={{ fontFamily: "'Noto Serif SC', serif", letterSpacing: "1.2px" }}>楚　河</text>
        <text x="12.5" y="10.02" textAnchor="middle" dominantBaseline="central"
          fill="rgba(212,168,67,0.48)" fontSize="1.05"
          style={{ fontFamily: "'Noto Serif SC', serif", letterSpacing: "1.2px" }}>汉　界</text>

        {/* ── Palace diagonals ── */}
        <line x1={sx(3)} y1={sy(0)} x2={sx(5)} y2={sy(2)} stroke="rgba(212,168,67,0.42)" strokeWidth="0.045" />
        <line x1={sx(5)} y1={sy(0)} x2={sx(3)} y2={sy(2)} stroke="rgba(212,168,67,0.42)" strokeWidth="0.045" />
        <line x1={sx(3)} y1={sy(7)} x2={sx(5)} y2={sy(9)} stroke="rgba(212,168,67,0.42)" strokeWidth="0.045" />
        <line x1={sx(5)} y1={sy(7)} x2={sx(3)} y2={sy(9)} stroke="rgba(212,168,67,0.42)" strokeWidth="0.045" />

        {/* ── Corner bracket marks ── */}
        {bracketPositions.map((m, i) => {
          const bx = sx(m.c), by = sy(m.r), d = 0.30, g = 0.10;
          const eL = m.c === 0, eR = m.c === 8;
          return (
            <g key={i} stroke="rgba(212,168,67,0.55)" strokeWidth="0.055" fill="none">
              {!eL && <><path d={`M${bx-g} ${by-d} L${bx-g} ${by-g} L${bx-d} ${by-g}`} /><path d={`M${bx-g} ${by+d} L${bx-g} ${by+g} L${bx-d} ${by+g}`} /></>}
              {!eR && <><path d={`M${bx+g} ${by-d} L${bx+g} ${by-g} L${bx+d} ${by-g}`} /><path d={`M${bx+g} ${by+d} L${bx+g} ${by+g} L${bx+d} ${by+g}`} /></>}
            </g>
          );
        })}

        {/* ── Move highlights — empty intersections ── */}
        {highlights.map((h, i) => {
          if (pieceAt(h.row, h.col)) return null;
          return (
            <circle key={`hl${i}`}
              cx={sx(h.col)} cy={sy(h.row)} r={R * 0.44}
              fill="rgba(212,168,67,0.22)" stroke="rgba(212,168,67,0.85)" strokeWidth="0.07"
              filter="url(#goldglow)" />
          );
        })}

        {/* ── Capture highlights ── */}
        {highlights.map((h, i) => {
          const p = pieceAt(h.row, h.col);
          if (!p) return null;
          return (
            <circle key={`cap${i}`}
              cx={sx(p.col)} cy={sy(p.row)} r={R + 0.12}
              fill="none" stroke="rgba(220,30,30,0.95)" strokeWidth="0.11"
              filter="url(#glow)" />
          );
        })}

        {/* ── Check ring — pulsing danger halo around threatened king ── */}
        {checkedKing && (
          <circle
            cx={sx(checkedKing.col)} cy={sy(checkedKing.row)} r={R + 0.22}
            fill="none" stroke="rgba(255,30,30,0.9)" strokeWidth="0.15"
            filter="url(#checkglow)"
          >
            <animate attributeName="r" values={`${R + 0.18};${R + 0.38};${R + 0.18}`} dur="1s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="1;0.4;1" dur="1s" repeatCount="indefinite" />
          </circle>
        )}

        {/* ── Chess pieces — each type renders via its own component ── */}
        {pieces.map(piece => {
          const Comp = PIECE_RENDERERS[piece.type];
          return (
            <Comp
              key={piece.id}
              x={sx(piece.col)}
              y={sy(piece.row)}
              side={piece.side}
              selected={piece.id === selected}
            />
          );
        })}
      </svg>
    </div>
  );
}

function GameScreen({ onNavigate }: { onNavigate: (s: Screen) => void }) {
  const [pieces, setPieces] = useState<Piece[]>(INITIAL_PIECES);
  const [selected, setSelected] = useState<string | null>(null);
  const [highlights, setHighlights] = useState<Position[]>([]);
  const [currentTurn, setCurrentTurn] = useState<PieceSide>("red");
  const [moveHistory, setMoveHistory] = useState<MoveRecord[]>(MOVE_HISTORY);
  const [redTime, setRedTime] = useState(540);
  const [blackTime, setBlackTime] = useState(540);
  const [showSurrender, setShowSurrender] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [winner, setWinner] = useState<PieceSide | null>(null);
  const [inCheckSide, setInCheckSide] = useState<PieceSide | null>(null);
  const [endReason, setEndReason] = useState<"checkmate" | "stalemate" | "resign" | null>(null);

  useEffect(() => {
    if (gameOver) return;
    const interval = setInterval(() => {
      if (currentTurn === "red") setRedTime(t => Math.max(0, t - 1));
      else setBlackTime(t => Math.max(0, t - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [currentTurn, gameOver]);

  const formatTime = (s: number) => `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;

  const handleCellClick = useCallback((row: number, col: number) => {
    if (gameOver) return;
    const clickedPiece = pieces.find(p => p.row === row && p.col === col);

    if (selected) {
      const selectedPiece = pieces.find(p => p.id === selected);
      if (!selectedPiece) return;

      const isValidMove = highlights.some(h => h.row === row && h.col === col);
      if (isValidMove) {
        const captured = pieces.find(p => p.row === row && p.col === col && p.id !== selected);
        const newPieces = pieces
          .filter(p => p.id !== (captured?.id ?? ""))
          .map(p => p.id === selected ? { ...p, row, col } : p);

        const nextTurn: PieceSide = currentTurn === "red" ? "black" : "red";
        const newBoard = buildBoard(newPieces);

        // Detect check / checkmate / stalemate for the opponent
        const oppInCheck = isCheck(newBoard, nextTurn);
        const oppCheckmated = oppInCheck && isCheckmate(newBoard, nextTurn);
        const stalemated = !oppInCheck && isStalemate(newBoard, nextTurn);

        setPieces(newPieces);
        setMoveHistory(h => [...h, {
          piece: selectedPiece.type,
          from: `${colToLetter(selectedPiece.col)}${10 - selectedPiece.row}`,
          to: `${colToLetter(col)}${10 - row}`,
          captured: captured?.type,
        }]);
        setSelected(null);
        setHighlights([]);

        if (oppCheckmated) {
          setInCheckSide(nextTurn);
          setGameOver(true);
          setWinner(currentTurn);
          setEndReason("checkmate");
        } else if (stalemated) {
          setInCheckSide(null);
          setGameOver(true);
          setWinner(null);
          setEndReason("stalemate");
        } else {
          setInCheckSide(oppInCheck ? nextTurn : null);
          setCurrentTurn(nextTurn);
        }
      } else if (clickedPiece && clickedPiece.side === currentTurn) {
        const board = buildBoard(pieces);
        setSelected(clickedPiece.id);
        setHighlights(getLegalMoves(clickedPiece, board));
      } else {
        setSelected(null);
        setHighlights([]);
      }
    } else if (clickedPiece && clickedPiece.side === currentTurn) {
      const board = buildBoard(pieces);
      setSelected(clickedPiece.id);
      setHighlights(getLegalMoves(clickedPiece, board));
    }
  }, [selected, highlights, pieces, currentTurn, gameOver]);

  const handleUndo = () => {
    if (moveHistory.length > MOVE_HISTORY.length) {
      setMoveHistory(h => h.slice(0, -1));
      setPieces(INITIAL_PIECES);
      setSelected(null);
      setHighlights([]);
    }
  };

  return (
    <div className="relative flex flex-col h-full overflow-hidden" style={{ background: "linear-gradient(180deg,#0d0a08 0%,#1a0c04 100%)" }}>
      {/* Top bar */}
      <div className="relative z-10 flex items-center justify-between px-4 pt-10 pb-2">
        <button onClick={() => onNavigate("home")} className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "rgba(26,17,8,0.8)", border: "1px solid rgba(212,168,67,0.2)" }}>
          <ArrowLeft size={16} style={{ color: "#d4a843" }} />
        </button>
        <div className="flex items-center gap-2">
          <div className="px-3 py-1 rounded-lg text-xs font-semibold" style={{ background: "rgba(212,168,67,0.1)", border: "1px solid rgba(212,168,67,0.3)", color: "#d4a843", fontFamily: "'Cinzel',serif" }}>
            Move {moveHistory.length}
          </div>
        </div>
        <div className="flex gap-2">
          <button className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "rgba(26,17,8,0.8)", border: "1px solid rgba(212,168,67,0.2)" }}>
            <MessageCircle size={15} style={{ color: "#8a6a3a" }} />
          </button>
          <button className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "rgba(26,17,8,0.8)", border: "1px solid rgba(212,168,67,0.2)" }}>
            <Settings size={15} style={{ color: "#8a6a3a" }} />
          </button>
        </div>
      </div>

      {/* Black player */}
      <div className="relative z-10 px-4 py-2">
        <PlayerAvatar name="ShadowLord99" rating={2105} side="black" isActive={currentTurn === "black"} />
        <div className="flex items-center justify-end mt-1.5">
          <div className={`px-3 py-1 rounded-lg text-xs font-mono font-bold ${currentTurn === "black" ? "text-white" : "text-[#8a6a3a]"}`}
            style={{ background: currentTurn === "black" ? "rgba(100,100,100,0.3)" : "rgba(26,17,8,0.5)", border: `1px solid ${currentTurn === "black" ? "rgba(200,200,200,0.4)" : "rgba(212,168,67,0.15)"}`, boxShadow: currentTurn === "black" ? "0 0 12px rgba(200,200,200,0.2)" : "none" }}>
            {formatTime(blackTime)}
          </div>
        </div>
      </div>

      {/* Board */}
      <div className="relative z-10 flex-1 flex items-center px-3">
        <div className="w-full">
          <XiangqiBoard pieces={pieces} selected={selected} highlights={highlights} onCellClick={handleCellClick} inCheckSide={inCheckSide} disabled={gameOver} />
        </div>
      </div>

      {/* Chiếu tướng banner — only shown when in check, not yet game over */}
      {inCheckSide && !gameOver && (
        <div className="absolute left-0 right-0 z-40 flex justify-center" style={{ top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}>
          <div className="px-6 py-2 rounded-2xl text-center"
            style={{ background: "rgba(180,0,0,0.85)", border: "2px solid rgba(255,80,80,0.6)", boxShadow: "0 0 32px rgba(255,0,0,0.5)", backdropFilter: "blur(4px)" }}>
            <div className="text-base font-black tracking-widest" style={{ fontFamily: "'Cinzel',serif", color: "#fff" }}>
              CHIẾU TƯỚNG!
            </div>
            <div className="text-xs mt-0.5" style={{ color: "rgba(255,200,200,0.9)", fontFamily: "'Inter',sans-serif" }}>
              {inCheckSide === "red" ? "Đỏ đang bị chiếu" : "Đen đang bị chiếu"}
            </div>
          </div>
        </div>
      )}

      {/* Red player */}
      <div className="relative z-10 px-4 py-2">
        <div className="flex items-center justify-start mb-1.5">
          <div className={`px-3 py-1 rounded-lg text-xs font-mono font-bold ${currentTurn === "red" ? "text-[#ffaaaa]" : "text-[#8a6a3a]"}`}
            style={{ background: currentTurn === "red" ? "rgba(200,16,46,0.2)" : "rgba(26,17,8,0.5)", border: `1px solid ${currentTurn === "red" ? "rgba(200,16,46,0.5)" : "rgba(212,168,67,0.15)"}`, boxShadow: currentTurn === "red" ? "0 0 12px rgba(200,16,46,0.3)" : "none" }}>
            {formatTime(redTime)}
          </div>
        </div>
        <PlayerAvatar name="DragonMaster" rating={2847} side="red" isActive={currentTurn === "red"} />
      </div>

      {/* Action buttons */}
      <div className="relative z-10 px-4 py-3">
        <div className="flex items-center justify-between gap-2 mb-3">
          {[
            { icon: <RotateCcw size={15} />, label: "Undo", action: handleUndo },
            { icon: <Lightbulb size={15} />, label: "Hint", action: () => {} },
            { icon: <MessageCircle size={15} />, label: "Chat", action: () => {} },
          ].map((btn, i) => (
            <button key={i} onClick={btn.action}
              className="flex-1 flex flex-col items-center gap-1 py-2.5 rounded-xl transition-all active:scale-95"
              style={{ background: "rgba(26,17,8,0.8)", border: "1px solid rgba(212,168,67,0.2)", color: "#d4a843" }}>
              {btn.icon}
              <span className="text-[10px]" style={{ fontFamily: "'Inter',sans-serif" }}>{btn.label}</span>
            </button>
          ))}
          <button
            onClick={() => setShowSurrender(true)}
            className="flex-1 flex flex-col items-center gap-1 py-2.5 rounded-xl transition-all active:scale-95"
            style={{ background: "rgba(200,16,46,0.1)", border: "1px solid rgba(200,16,46,0.3)", color: "#c8102e" }}>
            <Flag size={15} />
            <span className="text-[10px]" style={{ fontFamily: "'Inter',sans-serif" }}>Resign</span>
          </button>
        </div>

        {/* Move history strip */}
        <div className="overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
          <div className="flex gap-2" style={{ width: "max-content" }}>
            {moveHistory.slice(-6).map((m, i) => (
              <div key={i} className="px-2 py-1 rounded-lg flex items-center gap-1.5" style={{ background: "rgba(26,17,8,0.7)", border: "1px solid rgba(212,168,67,0.15)" }}>
                <span className="text-xs font-bold" style={{ color: i % 2 === 0 ? "#c8102e" : "#aaaaaa", fontFamily: "'Noto Serif SC',serif" }}>{m.piece}</span>
                <span className="text-[10px]" style={{ color: "#8a6a3a" }}>{m.from}→{m.to}</span>
                {m.captured && <span className="text-[9px] px-1 rounded" style={{ background: "rgba(200,16,46,0.2)", color: "#c8102e" }}>x{m.captured}</span>}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Game-over modal — checkmate / stalemate / resign */}
      {gameOver && (
        <div className="absolute inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(6px)" }}>
          <div className="mx-6 p-6 rounded-3xl text-center" style={{ background: "linear-gradient(135deg,#1a1108,#2a1a08)", border: "1px solid rgba(212,168,67,0.35)", boxShadow: "0 24px 64px rgba(0,0,0,0.9)" }}>
            {/* Icon */}
            <div className="flex justify-center mb-4">
              {endReason === "checkmate" && (
                <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: "rgba(200,16,46,0.15)", border: "2px solid rgba(200,16,46,0.4)" }}>
                  <Crown size={32} style={{ color: winner === "red" ? "#c8102e" : "#aaaaaa" }} />
                </div>
              )}
              {endReason === "stalemate" && (
                <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: "rgba(212,168,67,0.1)", border: "2px solid rgba(212,168,67,0.3)" }}>
                  <Shield size={32} style={{ color: "#d4a843" }} />
                </div>
              )}
              {endReason === "resign" && (
                <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: "rgba(200,16,46,0.1)", border: "2px solid rgba(200,16,46,0.3)" }}>
                  <Flag size={32} style={{ color: "#c8102e" }} />
                </div>
              )}
            </div>

            {/* Title */}
            <h2 className="text-xl font-black mb-1" style={{ fontFamily: "'Cinzel',serif", color: "#f5e6c8" }}>
              {endReason === "checkmate" ? "CHIẾU BÍ!" : endReason === "stalemate" ? "HÒA CỜ" : "ĐẦU HÀNG"}
            </h2>

            {/* Subtitle */}
            <p className="text-sm mb-1" style={{ color: "#d4a843", fontFamily: "'Noto Serif SC',serif" }}>
              {endReason === "checkmate" ? "将死" : endReason === "stalemate" ? "逼和" : "认输"}
            </p>
            <p className="text-sm mb-6" style={{ color: "#8a6a3a", fontFamily: "'Inter',sans-serif" }}>
              {endReason === "checkmate"
                ? (winner === "red" ? "Đỏ thắng — Chiếu bí thành công!" : "Đen thắng — Chiếu bí thành công!")
                : endReason === "stalemate"
                ? "Không còn nước đi — Ván cờ hòa!"
                : (winner === "red" ? "Đỏ thắng — Đối thủ đầu hàng!" : "Đen thắng — Đối thủ đầu hàng!")}
            </p>

            {/* Buttons */}
            <div className="flex gap-3">
              <GoldButton variant="secondary" className="flex-1" onClick={() => onNavigate("home")}>
                <Home size={14} className="inline mr-1" />Trang chủ
              </GoldButton>
              <GoldButton variant="primary" className="flex-1" onClick={() => {
                setPieces(INITIAL_PIECES);
                setSelected(null);
                setHighlights([]);
                setCurrentTurn("red");
                setMoveHistory(MOVE_HISTORY);
                setRedTime(540);
                setBlackTime(540);
                setGameOver(false);
                setWinner(null);
                setInCheckSide(null);
                setEndReason(null);
              }}>
                <RotateCcw size={14} className="inline mr-1" />Chơi lại
              </GoldButton>
            </div>
          </div>
        </div>
      )}

      {/* Surrender confirm modal */}
      {showSurrender && (
        <div className="absolute inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}>
          <div className="mx-6 p-6 rounded-3xl" style={{ background: "linear-gradient(135deg,#1a1108,#2a1a08)", border: "1px solid rgba(212,168,67,0.3)", boxShadow: "0 20px 60px rgba(0,0,0,0.8)" }}>
            <div className="flex items-center justify-center mb-4">
              <Flag size={32} style={{ color: "#c8102e" }} />
            </div>
            <h3 className="text-center text-lg font-bold mb-2" style={{ fontFamily: "'Cinzel',serif", color: "#f5e6c8" }}>Resign Game?</h3>
            <p className="text-center text-sm mb-6" style={{ color: "#8a6a3a" }}>Your opponent will be declared the winner.</p>
            <div className="flex gap-3">
              <GoldButton variant="secondary" className="flex-1" onClick={() => setShowSurrender(false)}>Cancel</GoldButton>
              <GoldButton variant="danger" className="flex-1" onClick={() => {
                setShowSurrender(false);
                setGameOver(true);
                setWinner(currentTurn === "red" ? "black" : "red");
                setEndReason("resign");
              }}>Resign</GoldButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── MATCHMAKING SCREEN ───────────────────────────────────────────────────

function MatchmakingScreen({ onNavigate }: { onNavigate: (s: Screen) => void }) {
  const [dots, setDots] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [found, setFound] = useState(false);

  useEffect(() => {
    const d = setInterval(() => setDots(n => (n + 1) % 4), 500);
    const e = setInterval(() => setElapsed(t => t + 1), 1000);
    const f = setTimeout(() => setFound(true), 5000);
    return () => { clearInterval(d); clearInterval(e); clearTimeout(f); };
  }, []);

  useEffect(() => {
    if (found) {
      const t = setTimeout(() => onNavigate("game"), 2000);
      return () => clearTimeout(t);
    }
  }, [found, onNavigate]);

  const formatElapsed = (s: number) => `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;

  return (
    <div className="relative flex flex-col h-full items-center justify-center overflow-hidden px-6"
      style={{ background: "linear-gradient(180deg,#0d0a08 0%,#1a0804 50%,#0d0a08 100%)" }}>
      <InkBrushDecor />
      <ParticleField />

      <button onClick={() => onNavigate("home")}
        className="absolute top-12 left-5 w-9 h-9 rounded-xl flex items-center justify-center z-10"
        style={{ background: "rgba(26,17,8,0.8)", border: "1px solid rgba(212,168,67,0.2)" }}>
        <X size={16} style={{ color: "#d4a843" }} />
      </button>

      <div className="relative z-10 flex flex-col items-center w-full">
        <p className="text-xs tracking-[0.3em] uppercase mb-6" style={{ color: "#8a6a3a", fontFamily: "'Inter',sans-serif" }}>
          {found ? "Opponent Found!" : "Searching for opponent"}
        </p>

        {/* Rank badge */}
        <div className="mb-8 flex flex-col items-center">
          <div className="relative w-24 h-24 flex items-center justify-center mb-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="absolute inset-0 rounded-full"
                style={{
                  border: "2px solid rgba(212,168,67,0.3)",
                  animation: `search-ring ${2 + i * 0.7}s ${i * 0.5}s ease-out infinite`,
                }} />
            ))}
            <div className="w-20 h-20 rounded-full flex items-center justify-center"
              style={{ background: "radial-gradient(circle at 35% 35%,#e8c870,#d4a843 50%,#8a5a1e)", border: "3px solid #e8c870", boxShadow: "0 0 30px rgba(212,168,67,0.5)" }}>
              <Crown size={32} style={{ color: "#0d0a08" }} />
            </div>
          </div>
          <p className="text-sm font-bold" style={{ fontFamily: "'Cinzel',serif", color: "#d4a843" }}>Grandmaster III</p>
          <p className="text-xs" style={{ color: "#8a6a3a" }}>2,847 ELO</p>
        </div>

        {/* VS divider */}
        {found ? (
          <div className="flex items-center gap-6 mb-8 w-full">
            <div className="flex-1 flex flex-col items-center">
              <div className="w-16 h-16 rounded-full flex items-center justify-center text-lg font-bold mb-2"
                style={{ background: "radial-gradient(circle at 35% 35%,#e86060,#c8102e,#6a0010)", border: "2px solid #ff4444", color: "#ffd4d4", fontFamily: "'Noto Serif SC',serif", boxShadow: "0 0 20px rgba(200,16,46,0.5)" }}>
                龙
              </div>
              <p className="text-xs font-semibold text-[#f5e6c8]">DragonMaster</p>
              <p className="text-xs" style={{ color: "#d4a843" }}>2847 ELO</p>
            </div>
            <div className="flex flex-col items-center">
              <div className="text-2xl font-black" style={{ fontFamily: "'Cinzel',serif", color: "#d4a843" }}>VS</div>
              <div className="w-px h-8" style={{ background: "linear-gradient(to bottom,transparent,#d4a843,transparent)" }} />
            </div>
            <div className="flex-1 flex flex-col items-center">
              <div className="w-16 h-16 rounded-full flex items-center justify-center text-lg font-bold mb-2"
                style={{ background: "radial-gradient(circle at 35% 35%,#555,#222,#0a0a0a)", border: "2px solid #666", color: "#d4d4d4", fontFamily: "'Noto Serif SC',serif", boxShadow: "0 0 20px rgba(100,100,100,0.3)" }}>
                剑
              </div>
              <p className="text-xs font-semibold text-[#f5e6c8]">ShadowLord99</p>
              <p className="text-xs" style={{ color: "#d4a843" }}>2105 ELO</p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center mb-8">
            <div className="flex gap-2 mb-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="w-2 h-2 rounded-full transition-all duration-300"
                  style={{ background: i < dots ? "#d4a843" : "rgba(212,168,67,0.2)", boxShadow: i < dots ? "0 0 8px #d4a843" : "none" }} />
              ))}
            </div>
            <p className="text-xs" style={{ color: "#8a6a3a", fontFamily: "'Inter',sans-serif" }}>
              Elapsed: {formatElapsed(elapsed)}
            </p>
          </div>
        )}

        {/* Queue info */}
        <div className="w-full p-4 rounded-2xl mb-6" style={{ background: "rgba(26,17,8,0.8)", border: "1px solid rgba(212,168,67,0.2)" }}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs" style={{ color: "#8a6a3a", fontFamily: "'Inter',sans-serif" }}>Players in queue</span>
            <span className="text-sm font-bold" style={{ color: "#d4a843" }}>1,247</span>
          </div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs" style={{ color: "#8a6a3a", fontFamily: "'Inter',sans-serif" }}>Avg wait time</span>
            <span className="text-sm font-bold" style={{ color: "#d4a843" }}>~45s</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs" style={{ color: "#8a6a3a", fontFamily: "'Inter',sans-serif" }}>Your rank range</span>
            <span className="text-sm font-bold" style={{ color: "#d4a843" }}>±150 ELO</span>
          </div>
        </div>

        {/* Chinese decorative text */}
        <p className="text-center text-2xl mb-6 opacity-30" style={{ fontFamily: "'Ma Shan Zheng',cursive", color: "#d4a843", letterSpacing: "0.5em" }}>運籌帷幄</p>

        <GoldButton variant="secondary" onClick={() => onNavigate("home")}>Cancel Search</GoldButton>
      </div>
    </div>
  );
}

// ─── RESULT SCREEN ────────────────────────────────────────────────────────

function ResultScreen({ onNavigate }: { onNavigate: (s: Screen) => void }) {
  const [visible, setVisible] = useState(false);
  const isVictory = true;

  useEffect(() => {
    setTimeout(() => setVisible(true), 100);
  }, []);

  const goldParticles = Array.from({ length: 16 }, (_, i) => ({
    id: i,
    left: `${(i * 22 + 5) % 90}%`,
    top: `${(i * 17 + 5) % 70}%`,
    size: 3 + (i % 4),
    delay: `${(i * 0.2) % 2}s`,
  }));

  return (
    <div className="relative flex flex-col h-full items-center justify-center overflow-hidden px-6"
      style={{ background: isVictory ? "linear-gradient(180deg,#0d0a08 0%,#1a0d04 40%,#1a0a00 70%,#0d0a08 100%)" : "linear-gradient(180deg,#080808 0%,#140404 50%,#080808 100%)" }}>

      {/* Victory particles */}
      {isVictory && visible && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {goldParticles.map(p => (
            <div key={p.id} className="absolute rounded-full"
              style={{
                left: p.left, top: p.top, width: p.size, height: p.size,
                background: p.id % 3 === 0 ? "#d4a843" : p.id % 3 === 1 ? "#c8102e" : "#e8c870",
                boxShadow: `0 0 ${p.size * 3}px currentColor`,
                animation: `victory-burst 2s ${p.delay} ease-out infinite`,
              }} />
          ))}
        </div>
      )}

      <div className="relative z-10 flex flex-col items-center w-full"
        style={{ opacity: visible ? 1 : 0, transform: visible ? "translateY(0)" : "translateY(20px)", transition: "all 0.6s cubic-bezier(0.34,1.56,0.64,1)" }}>

        {/* Victory/Defeat badge */}
        <div className="relative mb-6">
          <div className="w-28 h-28 rounded-full flex items-center justify-center"
            style={{
              background: isVictory ? "radial-gradient(circle at 35% 35%,#e8c870,#d4a843 50%,#8a5a1e)" : "radial-gradient(circle at 35% 35%,#444,#222,#0a0a0a)",
              border: `4px solid ${isVictory ? "#e8c870" : "#444"}`,
              boxShadow: isVictory ? "0 0 50px rgba(212,168,67,0.6), 0 0 100px rgba(212,168,67,0.2)" : "0 0 30px rgba(0,0,0,0.8)",
            }}>
            {isVictory ? <Trophy size={44} style={{ color: "#0d0a08" }} /> : <Shield size={44} style={{ color: "#888" }} />}
          </div>
          {isVictory && (
            <>
              <div className="absolute -inset-2 rounded-full" style={{ border: "1px solid rgba(212,168,67,0.3)", animation: "rank-ping 2s ease-in-out infinite" }} />
              <div className="absolute -inset-4 rounded-full" style={{ border: "1px solid rgba(212,168,67,0.15)", animation: "rank-ping 2s 0.3s ease-in-out infinite" }} />
            </>
          )}
        </div>

        <h2 className="text-4xl font-black mb-2" style={{
          fontFamily: "'Cinzel',serif",
          background: isVictory ? "linear-gradient(135deg,#e8c870,#d4a843,#b8902e)" : "linear-gradient(135deg,#888,#555,#333)",
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
        }}>
          {isVictory ? "VICTORY" : "DEFEATED"}
        </h2>
        <p className="text-sm mb-2" style={{ color: "#8a6a3a", fontFamily: "'Inter',sans-serif" }}>
          {isVictory ? "Checkmate — Brilliantly played!" : "Better luck next time"}
        </p>
        <p className="text-lg mb-6" style={{ fontFamily: "'Ma Shan Zheng',cursive", color: "rgba(212,168,67,0.5)", letterSpacing: "0.3em" }}>
          {isVictory ? "旗開得勝" : "再接再厲"}
        </p>

        <GoldDivider />

        {/* Stats row */}
        <div className="flex items-stretch gap-3 w-full my-6">
          {[
            { label: "XP Gained", value: "+320", icon: <Zap size={16} />, color: "#d4a843" },
            { label: "Rank Points", value: "+28", icon: <Star size={16} />, color: "#c8102e" },
            { label: "Coins", value: "+150", icon: <Coins size={16} />, color: "#e8c870" },
          ].map((stat, i) => (
            <div key={i} className="flex-1 flex flex-col items-center py-3 px-2 rounded-2xl"
              style={{ background: "rgba(26,17,8,0.8)", border: "1px solid rgba(212,168,67,0.2)" }}>
              <div className="mb-1" style={{ color: stat.color }}>{stat.icon}</div>
              <p className="text-base font-bold" style={{ color: stat.color, fontFamily: "'Cinzel',serif" }}>{stat.value}</p>
              <p className="text-[10px] text-center" style={{ color: "#8a6a3a", fontFamily: "'Inter',sans-serif" }}>{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Rank progress */}
        <div className="w-full p-4 rounded-2xl mb-6" style={{ background: "rgba(26,17,8,0.8)", border: "1px solid rgba(212,168,67,0.2)" }}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Crown size={13} style={{ color: "#d4a843" }} />
              <span className="text-xs font-semibold" style={{ color: "#d4a843", fontFamily: "'Inter',sans-serif" }}>Grandmaster III → Diamond I</span>
            </div>
            <span className="text-xs" style={{ color: "#8a6a3a" }}>125 pts left</span>
          </div>
          <div className="w-full h-2.5 rounded-full overflow-hidden" style={{ background: "rgba(212,168,67,0.1)" }}>
            <div className="h-full rounded-full transition-all duration-1000 delay-300"
              style={{ width: visible ? "72%" : "0%", background: "linear-gradient(90deg,#c8102e,#d4a843,#e8c870)", boxShadow: "0 0 10px rgba(212,168,67,0.7)" }} />
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-3 w-full mb-3">
          <GoldButton variant="primary" size="lg" className="flex-1" onClick={() => onNavigate("matchmaking")}>
            <RotateCcw size={16} /> Rematch
          </GoldButton>
          <GoldButton variant="secondary" size="lg" className="flex-1" onClick={() => onNavigate("home")}>
            <Home size={16} /> Home
          </GoldButton>
        </div>
        <GoldButton variant="ghost" className="w-full" onClick={() => {}}>
          <Share2 size={14} /> Share Result
        </GoldButton>
      </div>
    </div>
  );
}

// ─── NAV BAR ─────────────────────────────────────────────────────────────

function BottomNav({ screen, onNavigate }: { screen: Screen; onNavigate: (s: Screen) => void }) {
  if (screen === "game" || screen === "matchmaking") return null;
  const items = [
    { icon: <Home size={18} />, label: "Home", target: "home" as Screen },
    { icon: <Trophy size={18} />, label: "Ranked", target: "matchmaking" as Screen },
    { icon: <Users size={18} />, label: "Friends", target: "home" as Screen },
    { icon: <Settings size={18} />, label: "Settings", target: "home" as Screen },
  ];
  return (
    <div className="relative z-20 flex items-center justify-around px-2 py-2 pb-6"
      style={{ background: "linear-gradient(to top,#0d0a08,rgba(13,10,8,0.95))", borderTop: "1px solid rgba(212,168,67,0.15)" }}>
      {items.map((item, i) => (
        <button key={i} onClick={() => onNavigate(item.target)}
          className="flex flex-col items-center gap-1 px-4 py-1.5 rounded-xl transition-all duration-200 active:scale-95"
          style={{ color: screen === item.target && item.target !== "home" ? "#d4a843" : (screen === "home" && i === 0) ? "#d4a843" : "#8a6a3a" }}>
          {item.icon}
          <span className="text-[9px] font-medium" style={{ fontFamily: "'Inter',sans-serif" }}>{item.label}</span>
        </button>
      ))}
    </div>
  );
}

// ─── ROOT ─────────────────────────────────────────────────────────────────

export default function App() {
  const [screen, setScreen] = useState<Screen>("home");

  const screenComponents: Record<Screen, React.ReactNode> = {
    home: <HomeScreen onNavigate={setScreen} />,
    game: <GameScreen onNavigate={setScreen} />,
    matchmaking: <MatchmakingScreen onNavigate={setScreen} />,
    result: <ResultScreen onNavigate={setScreen} />,
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-[#050302]">
      <div className="relative flex flex-col overflow-hidden"
        style={{ width: 390, height: 844, maxHeight: "100svh", background: "#0d0a08", boxShadow: "0 0 80px rgba(0,0,0,0.9), 0 0 2px rgba(212,168,67,0.1)" }}>
        <div className="flex-1 overflow-hidden relative">
          {screenComponents[screen]}
        </div>
        <BottomNav screen={screen} onNavigate={setScreen} />
      </div>
    </div>
  );
}
