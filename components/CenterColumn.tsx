"use client";

import React, { useEffect, useRef, useState } from "react";
import { Turn, WorldContext, TurnDiff } from "@/types";
import {
  Send,
  MapPin,
  MessageSquare,
  Eye,
  Feather,
  Dna,
  Dice5,
  ChevronDown,
  CheckCircle2,
  Tag,
  XCircle,
  RefreshCw,
  AlertTriangle,
  Loader2,
  Minus,
  Users,
  BookOpen,
  Scroll,
  Package,
  Heart,
  Globe,
  Sparkles,
} from "lucide-react";
import { TurnStatus } from "@/App";

interface Props {
  world: WorldContext;
  turns: Turn[];
  onSendTurn: (input: string) => void;
  turnStatus: TurnStatus;
  onRoll: (turnId: string) => void;
  onCancel: () => void;
  onRetry: () => void;
}

export const CenterColumn: React.FC<Props> = ({
  world,
  turns,
  onSendTurn,
  turnStatus,
  onRoll,
  onCancel,
  onRetry,
}) => {
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Get the last turn's streaming state and narration length for scroll trigger
  const lastTurn = turns[turns.length - 1];
  const isStreaming = lastTurn?.isStreaming;
  const narrationLength = lastTurn?.narration?.length || 0;

  useEffect(() => {
    // Auto-scroll when turns change, status changes, or narration grows while streaming
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [turns.length, turnStatus, isStreaming, narrationLength]);

  useEffect(() => {
    // Focus input when idle
    if (turnStatus === "idle") {
      inputRef.current?.focus();
    }
  }, [turnStatus]);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || turnStatus === "processing") return;
    onSendTurn(input);
    setInput("");
  };

  return (
    <div className="h-full flex flex-col bg-parchment-100 bg-texture relative">
      {/* Chapter Header */}
      <div className="sticky top-0 z-20 bg-parchment-100/95 backdrop-blur-md border-b border-parchment-400 px-8 py-4 shadow-sm flex justify-between items-center">
        <div className="flex flex-col">
          <span className="text-[10px] font-bold font-small-caps text-ink-light uppercase tracking-[0.2em]">
            Current Chapter
          </span>
          <h2 className="font-display text-2xl text-ink leading-none">
            {world.poi}
          </h2>
        </div>
        <div className="text-xs font-serif italic opacity-50">Story Mode</div>
      </div>

      {/* The Story Stream */}
      <div className="flex-1 overflow-y-auto px-8 lg:px-12 py-8 space-y-10 custom-scrollbar pb-4 scroll-smooth">
        <div className="flex items-center justify-center gap-4 text-parchment-400 py-4 opacity-50">
          <div className="h-px bg-current w-20"></div>
          <div className="text-xs font-serif italic text-ink-light">
            The story begins
          </div>
          <div className="h-px bg-current w-20"></div>
        </div>

        {turns.map((turn, index) => (
          <TurnEntry
            key={turn.id}
            turn={turn}
            isFirst={index === 0}
            onRoll={() => onRoll(turn.id)}
            onSuggest={(act) => setInput(act)}
          />
        ))}

        {/* Inline Status Area */}
        {turnStatus === "processing" && (
          <div className="flex flex-col items-center justify-center gap-3 py-6 animate-fade-in">
            <div className="flex items-center gap-3 text-burgundy">
              <Loader2 size={24} className="animate-spin" />
              <span className="font-serif italic text-lg animate-pulse">
                The ink is flowing...
              </span>
            </div>
            <button
              onClick={onCancel}
              className="text-xs font-bold font-small-caps uppercase text-ink-light hover:text-burgundy border-b border-transparent hover:border-burgundy transition-all"
            >
              Cancel Generation
            </button>
          </div>
        )}

        {turnStatus === "error" && (
          <div className="flex flex-col items-center justify-center py-6 animate-fade-in w-full">
            <div className="bg-parchment-200 border-2 border-burgundy/50 rounded-sm p-4 w-full max-w-lg shadow-sm flex items-center justify-between gap-4 relative overflow-hidden">
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-burgundy"></div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-burgundy/10 flex items-center justify-center text-burgundy shrink-0 border border-burgundy/20">
                  <AlertTriangle size={20} />
                </div>
                <div>
                  <h4 className="font-bold text-ink text-sm">Ink Spilled</h4>
                  <p className="text-xs text-ink-light italic">
                    The chronicle could not be updated.
                  </p>
                </div>
              </div>
              <button
                onClick={onRetry}
                className="px-4 py-2 bg-burgundy text-parchment-100 rounded-sm font-bold font-small-caps uppercase text-xs hover:bg-burgundy-dim shadow-md flex items-center gap-2 transition-all active:translate-y-0.5 border border-parchment-900"
              >
                <RefreshCw size={14} /> Retry
              </button>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input Deck - Fixed at bottom */}
      <div className="border-t border-parchment-400 bg-parchment-100 px-4 py-3">
        <form
          onSubmit={handleSubmit}
          className="relative flex gap-2 max-w-4xl mx-auto"
        >
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit();
              }
            }}
            disabled={turnStatus === "processing"}
            placeholder={
              turnStatus === "processing"
                ? "Wait for the ink to dry..."
                : "Speak, act, or both..."
            }
            rows={2}
            className={`flex-1 bg-parchment-100 border border-parchment-400 rounded-sm p-3 text-ink font-serif text-base leading-relaxed focus:ring-1 focus:ring-gold focus:border-gold focus:outline-none resize-none placeholder-ink-faint transition-all ${
              turnStatus === "processing" ? "opacity-50 cursor-not-allowed" : ""
            }`}
          />
          {turnStatus === "processing" ? (
            <button
              type="button"
              onClick={onCancel}
              className="self-stretch w-12 bg-parchment-200 text-burgundy border border-burgundy rounded-sm hover:bg-burgundy hover:text-parchment-100 transition-all flex items-center justify-center"
            >
              <XCircle size={20} />
            </button>
          ) : (
            <button
              type="submit"
              disabled={!input.trim()}
              className="self-stretch w-12 bg-ink text-parchment-100 rounded-sm hover:bg-gold hover:text-ink disabled:opacity-30 disabled:hover:bg-ink disabled:hover:text-parchment-100 transition-all flex items-center justify-center border border-parchment-400"
            >
              <Send size={20} />
            </button>
          )}
        </form>
      </div>
    </div>
  );
};

const TurnEntry: React.FC<{
  turn: Turn;
  isFirst: boolean;
  onRoll: () => void;
  onSuggest: (s: string) => void;
}> = ({ turn, isFirst, onRoll, onSuggest }) => {
  return (
    <div className="group animate-fade-in space-y-4">
      {/* Player */}
      {turn.playerAction && (
        <div className="flex justify-end pl-12 relative">
          <div className="relative max-w-[80%] text-right">
            <span className="font-serif italic text-lg text-ink-light leading-relaxed">
              {turn.playerAction}
            </span>
            <div className="text-[10px] font-bold text-burgundy opacity-50 uppercase tracking-widest mt-1 flex items-center justify-end gap-1">
              <span className="w-4 h-px bg-burgundy"></span> You
            </div>
          </div>
        </div>
      )}

      {/* AI */}
      {(turn.narration || turn.isStreaming || turn.mechanics) && (
        <div className="relative">
          {turn.playerAction && (
            <div className="flex justify-center my-6 opacity-30 text-gold-dim">
              <span className="font-display text-xl">~ ⚜ ~</span>
            </div>
          )}

          {/* Mechanics with Animation Logic */}
          {turn.mechanics && (
            <MechanicsCard mechanics={turn.mechanics} onRoll={onRoll} />
          )}

          <div className="narration-text text-ink text-justify relative z-10">
            <div className={isFirst ? "drop-cap" : ""}>
              {turn.narration
                ? turn.narration.split("\n").map((para, i) => (
                    <p key={i} className="mb-4 last:mb-0">
                      {para}
                      {/* Streaming cursor on last paragraph */}
                      {turn.isStreaming &&
                        i === turn.narration.split("\n").length - 1 && (
                          <span className="inline-block w-2 h-4 bg-burgundy ml-0.5 animate-pulse" />
                        )}
                    </p>
                  ))
                : /* Show cursor when narration is empty but streaming */
                  turn.isStreaming && (
                    <span className="inline-block w-2 h-4 bg-burgundy animate-pulse" />
                  )}
            </div>
          </div>

          {/* Consequences Ribbon */}
          {turn.diffs.length > 0 && (
            <div className="my-4 py-2 border-y border-parchment-400/30 bg-parchment-200/20 flex flex-wrap gap-x-4 gap-y-2 items-center justify-center">
              {turn.diffs.map((diff, i) => (
                <DiffBadge key={i} diff={diff} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const MechanicsCard: React.FC<{
  mechanics: NonNullable<Turn["mechanics"]>;
  onRoll: () => void;
}> = ({ mechanics, onRoll }) => {
  const [isRolling, setIsRolling] = useState(false);
  const [displayVal, setDisplayVal] = useState(1);

  // Animation Logic
  const handleRollClick = () => {
    setIsRolling(true);
    const duration = 1500; // 1.5s roll duration

    const interval = setInterval(() => {
      setDisplayVal(Math.floor(Math.random() * 20) + 1);
    }, 150); // ~6-7 fps, readable number changes

    setTimeout(() => {
      clearInterval(interval);
      setIsRolling(false);
      onRoll();
    }, duration);
  };

  return (
    <div className="bg-parchment-200 border border-parchment-400 rounded-sm p-4 my-6 font-mono text-xs shadow-sm relative overflow-hidden max-w-md mx-auto">
      {/* Accent Bar based on state */}
      <div
        className={`absolute top-0 left-0 w-1 h-full ${
          isRolling
            ? "bg-gold animate-pulse"
            : !mechanics.outcome
            ? "bg-gold"
            : mechanics.outcome === "success"
            ? "bg-forest"
            : "bg-burgundy"
        }`}
      ></div>

      {/* Header */}
      <div className="flex justify-between items-center mb-2 border-b border-parchment-400 pb-1">
        <span className="font-bold text-ink uppercase tracking-wide flex items-center gap-2">
          <Dice5
            size={12}
            className={
              isRolling
                ? "animate-spin text-gold"
                : mechanics.outcome
                ? "opacity-50"
                : "animate-spin-slow"
            }
          />
          CHECK: {mechanics.skill}
        </span>

        {mechanics.outcome && !isRolling ? (
          <span
            className={`font-bold px-2 rounded-sm border ${
              mechanics.outcome === "success"
                ? "text-forest bg-parchment-100 border-parchment-300"
                : "text-burgundy bg-parchment-100 border-parchment-300"
            }`}
          >
            {mechanics.outcome.toUpperCase()}
          </span>
        ) : (
          <span
            className={`font-bold bg-parchment-100 px-2 rounded-sm border border-parchment-300 ${
              isRolling ? "text-gold-dim animate-pulse" : "text-gold-dim"
            }`}
          >
            {isRolling ? "ROLLING..." : "PENDING"}
          </span>
        )}
      </div>

      {/* Details Grid */}
      <div className="space-y-1.5 text-ink-light">
        <div className="flex justify-between items-center">
          <span>Difficulty Class (DC):</span>
          <span className="text-ink font-bold">{mechanics.dc}</span>
        </div>
        <div className="flex justify-between items-center">
          <span>Stat Modifier:</span>
          <span className="text-ink font-bold">+{mechanics.modifier || 2}</span>
        </div>

        {/* Result or Action Area */}
        <div
          className={`flex justify-between items-center pt-1 mt-1 border-t border-parchment-300 ${
            !mechanics.outcome && !isRolling
              ? ""
              : "bg-parchment-100/50 -mx-4 px-4 py-1"
          }`}
        >
          {mechanics.outcome || isRolling ? (
            <>
              <span className="uppercase tracking-widest font-bold text-[10px]">
                Roll Result
              </span>
              <span className="font-bold text-ink text-sm">
                d20 (
                {isRolling
                  ? displayVal
                  : mechanics.rolled
                  ? mechanics.rolled - (mechanics.modifier || 2)
                  : 0}
                ) + {mechanics.modifier || 2} =
                <span
                  className={`ml-1 ${
                    isRolling
                      ? "text-gold"
                      : mechanics.outcome === "success"
                      ? "text-forest"
                      : "text-burgundy"
                  }`}
                >
                  {isRolling
                    ? displayVal + (mechanics.modifier || 2)
                    : mechanics.rolled}
                </span>
              </span>
            </>
          ) : (
            <div className="w-full flex justify-center pt-1">
              <button
                onClick={handleRollClick}
                className="w-full py-1.5 bg-gold text-ink font-bold font-small-caps uppercase rounded-sm hover:bg-white transition-colors shadow-sm border border-parchment-400 flex items-center justify-center gap-2"
              >
                <Dice5 size={14} /> Roll Dice
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * DiffBadge - Renders a single diff with appropriate icon and styling
 * Matches the landing page's "Consequences Ribbon" style
 */
const DiffBadge: React.FC<{ diff: TurnDiff }> = ({ diff }) => {
  // Check if value is negative for stat changes
  const isNegative =
    diff.type === "stat" &&
    typeof diff.value === "string" &&
    diff.value.startsWith("-");

  // Icon and color mapping based on diff type
  const getIconAndColor = () => {
    switch (diff.type) {
      case "npc":
        return { icon: Users, color: "text-burgundy", label: "NEW CONTACT" };
      case "relationship":
        return { icon: Users, color: "text-burgundy", label: "RELATIONSHIP" };
      case "news":
        return { icon: BookOpen, color: "text-gold", label: "CODEX" };
      case "quest":
        return { icon: Scroll, color: "text-forest", label: "QUEST" };
      case "inventory":
        return { icon: Package, color: "text-gold", label: "INVENTORY" };
      case "stat":
        return {
          icon: isNegative ? Heart : CheckCircle2,
          color: isNegative ? "text-burgundy" : "text-forest",
          label: "STAT",
        };
      case "world":
        return { icon: Globe, color: "text-forest", label: "STATE" };
      case "skill":
        return { icon: Sparkles, color: "text-gold", label: "SKILL" };
      default:
        return {
          icon: CheckCircle2,
          color: "text-forest",
          label: diff.type.toUpperCase(),
        };
    }
  };

  const { icon: Icon, color, label } = getIconAndColor();

  return (
    <div className="flex items-center gap-1.5 text-[11px] font-bold font-sans">
      <Icon size={12} className={color} />
      <span className="uppercase text-ink-light tracking-wide">{label}:</span>
      <span className="text-ink">{diff.text}</span>
      {diff.value && (
        <span className="px-1 bg-parchment-300 rounded-sm border border-parchment-400">
          {diff.value}
        </span>
      )}
    </div>
  );
};
