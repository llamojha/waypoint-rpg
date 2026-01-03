"use client";

import React from "react";
import { X, Cpu, ShieldCheck, Database, Terminal } from "lucide-react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const TurnTrace: React.FC<Props> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-parchment-900/90 flex justify-end backdrop-blur-sm">
      <div className="w-full max-w-md bg-parchment-900 border-l-4 border-parchment-800 h-full flex flex-col animate-fade-in shadow-[0_0_40px_rgba(0,0,0,0.7)]">
        <div className="flex items-center justify-between p-4 border-b border-parchment-800 bg-parchment-900 shadow-lg relative z-10">
          <h2 className="text-sm font-bold text-parchment-100 font-mono flex items-center gap-2 uppercase tracking-widest">
            <Terminal size={16} className="text-gold" /> System Chronicle
          </h2>
          <button
            onClick={onClose}
            className="text-parchment-400 hover:text-parchment-100 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6 font-mono text-xs bg-[#1a120b] text-parchment-400 custom-scrollbar">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-forest font-bold uppercase tracking-wide">
              <Database size={12} /> State Context
            </div>
            <div className="p-3 bg-[#251a12] rounded-sm border border-parchment-800/50 text-parchment-300 shadow-inner">
              <span className="opacity-50">[WORLD]</span> Location: Watchtower
              Ruins
              <br />
              <span className="opacity-50">[NPCS]</span> Glimmer (Hidden)
              <br />
              <span className="opacity-50">[QUEST]</span> The Silent Tower
              (Active)
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-gold font-bold uppercase tracking-wide">
              <ShieldCheck size={12} /> Guardrails
            </div>
            <div className="p-3 bg-[#251a12] rounded-sm border border-parchment-800/50 text-parchment-300 shadow-inner">
              <span className="opacity-50">[INPUT]</span> "I draw my dagger and
              shout"
              <br />
              <span className="opacity-50">[CHECK]</span> Violence: ALLOWED
              (Fantasy)
              <br />
              <span className="opacity-50">[CHECK]</span> Sexual: NONE
              <br />
              <span className="opacity-50">[STATUS]</span>{" "}
              <span className="text-forest font-bold">PASSED</span>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-burgundy font-bold uppercase tracking-wide">
              <Cpu size={12} /> Narrative Engine
            </div>
            <div className="p-3 bg-[#251a12] rounded-sm border border-parchment-800/50 text-parchment-300 shadow-inner">
              <span className="opacity-50">[INTENT]</span> Player initiates
              combat.
              <br />
              <span className="opacity-50">[ACTION]</span> Roll Perception vs
              Stealth.
              <br />
              <span className="opacity-50">[OUTCOME]</span> Pending RNG...
              <br />
              <span className="opacity-50">[STREAM]</span> Generating token
              stream...
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-gold-light font-bold uppercase tracking-wide">
              <Database size={12} /> Ledger Commits
            </div>
            <div className="p-3 bg-[#251a12] rounded-sm border border-parchment-800/50 text-parchment-300 shadow-inner">
              <span className="text-burgundy">+ RELATIONSHIP:</span> Glimmer
              (-1)
              <br />
              <span className="text-forest">+ STAT:</span> Adrenaline (Hidden)
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
