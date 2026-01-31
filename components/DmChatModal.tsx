"use client";

import React, { useState, useEffect, useRef } from "react";
import { X, Loader2, MessageCircle, Send } from "lucide-react";

interface DmChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAsk: (question: string) => void;
  answer: string | null;
  isLoading: boolean;
  initialQuestion?: string;
}

export const DmChatModal: React.FC<DmChatModalProps> = ({
  isOpen,
  onClose,
  onAsk,
  answer,
  isLoading,
  initialQuestion = "",
}) => {
  const [question, setQuestion] = useState(initialQuestion);
  const [submittedQuestion, setSubmittedQuestion] = useState<string | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Update question if initialQuestion changes
  useEffect(() => {
    if (initialQuestion) {
      setQuestion(initialQuestion);
    }
  }, [initialQuestion]);

  if (!isOpen) return null;

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!question.trim() || isLoading) return;
    setSubmittedQuestion(question.trim());
    onAsk(question.trim());
    setQuestion("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-lg mx-4 bg-parchment-200 border-2 border-parchment-600 rounded-sm shadow-2xl panel-texture animate-fade-in max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-parchment-400">
          <div className="flex items-center gap-2">
            <MessageCircle size={20} className="text-gold" />
            <h2 className="text-xl font-display text-ink">Ask the DM</h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="p-1 text-ink-light hover:text-ink transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Show submitted question */}
          {submittedQuestion && (
            <div className="bg-parchment-300/50 border border-parchment-400 rounded-sm p-4">
              <p className="text-xs font-bold font-small-caps text-ink-light uppercase tracking-wide mb-2">
                Your question:
              </p>
              <p className="font-serif text-ink italic">
                {submittedQuestion}
              </p>
            </div>
          )}

          {/* Answer display */}
          {answer && (
            <div className="bg-parchment-100 border border-parchment-400 rounded-sm p-4">
              <p className="text-xs font-bold font-small-caps text-ink-light uppercase tracking-wide mb-2">
                The DM says:
              </p>
              <div className="font-serif text-ink leading-relaxed whitespace-pre-wrap">
                {answer}
              </div>
            </div>
          )}

          {/* Loading state */}
          {isLoading && (
            <div className="flex items-center justify-center gap-3 py-8 text-ink-light">
              <Loader2 size={20} className="animate-spin" />
              <span className="font-serif italic">Thinking...</span>
            </div>
          )}
        </div>

        {/* Input area */}
        <div className="border-t border-parchment-400 p-4">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <textarea
              ref={inputRef}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isLoading}
              placeholder="Ask about the game, your character, or the world..."
              rows={2}
              className="flex-1 bg-parchment-100 border border-parchment-400 rounded-sm p-3 text-ink font-serif text-sm leading-relaxed focus:ring-1 focus:ring-gold focus:border-gold focus:outline-none resize-none placeholder-ink-faint disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!question.trim() || isLoading}
              className="self-stretch w-12 bg-gold text-ink rounded-sm hover:bg-gold/80 disabled:opacity-30 disabled:hover:bg-gold transition-all flex items-center justify-center border border-parchment-400"
            >
              <Send size={18} />
            </button>
          </form>
          <p className="text-xs text-ink-light mt-2 text-center">
            Questions don&apos;t consume turns or change game state
          </p>
        </div>
      </div>
    </div>
  );
};
