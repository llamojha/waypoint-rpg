"use client";

import React, { useState } from "react";
import { Character } from "@/types";
import { User, Brush, Wand2, ChevronLeft, ChevronRight } from "lucide-react";
import { UNKNOWN_IMG } from "@/constants";

interface Props {
  onComplete: (char: Partial<Character>) => void;
}

const STEPS = ["Identity", "Portrait", "Confirm"];

export const CharacterCreation: React.FC<Props> = ({ onComplete }) => {
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [gender, setGender] = useState("");
  const [portraitUrl, setPortraitUrl] = useState(UNKNOWN_IMG);
  const [portraitDescription, setPortraitDescription] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  const next = () => setStep((s) => Math.min(s + 1, STEPS.length - 1));
  const back = () => setStep((s) => Math.max(s - 1, 0));

  const isStepValid = () => {
    switch (step) {
      case 0:
        return name.trim().length >= 2 && name.trim().length <= 30;
      case 1:
        return portraitUrl !== UNKNOWN_IMG;
      default:
        return true;
    }
  };

  const generatePortrait = async () => {
    setIsGenerating(true);
    try {
      const genderHint = gender ? `Gender: ${gender}.` : "";
      const prompt = `Fantasy portrait painting, face and shoulders only. A human adventurer. ${genderHint} ${portraitDescription}. Style: painterly fantasy art, warm lighting, neutral background. Vintage, rough brushstrokes. Safety: PG-13, no explicit content.`;

      const response = await fetch("/api/image/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to generate image");
      }

      const data = await response.json();
      if (data.imageUrl) {
        setPortraitUrl(data.imageUrl);
      }
    } catch (e) {
      console.error("Portrait generation failed", e);
      alert("Failed to generate portrait. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleComplete = () => {
    onComplete({
      name: name.trim(),
      gender: gender || undefined,
      portraitUrl,
    });
  };

  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <div className="space-y-8 text-center">
            <h2 className="text-4xl font-serif font-bold text-ink border-b-2 border-parchment-800 pb-2 inline-block">
              Who Are You?
            </h2>
            <div className="flex justify-center my-6">
              <div className="w-32 h-32 rounded-full bg-parchment-200 border-4 border-double border-parchment-800 flex items-center justify-center shadow-ink">
                <User size={64} className="text-parchment-800 opacity-50" />
              </div>
            </div>
            <div className="space-y-6 max-w-xs mx-auto">
              <div>
                <label className="block text-sm font-bold font-small-caps text-ink-light mb-2 uppercase tracking-widest">
                  Name <span className="text-burgundy">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={30}
                  className="w-full bg-transparent border-b-2 border-parchment-800 p-2 text-center text-xl font-serif font-bold text-ink focus:border-gold focus:outline-none placeholder-ink-faint"
                  placeholder="Enter your name..."
                />
                <p className="text-xs text-ink-faint mt-1">2-30 characters</p>
              </div>
              <div>
                <label className="block text-sm font-bold font-small-caps text-ink-light mb-2 uppercase tracking-widest">
                  Gender{" "}
                  <span className="text-ink-faint font-normal">(optional)</span>
                </label>
                <input
                  type="text"
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  maxLength={20}
                  className="w-full bg-transparent border-b-2 border-parchment-400 p-2 text-center text-lg font-serif text-ink focus:border-gold focus:outline-none placeholder-ink-faint"
                  placeholder="Any or none..."
                />
                <p className="text-xs text-ink-faint mt-1">
                  Used for portrait generation and narration
                </p>
              </div>
            </div>
          </div>
        );

      case 1:
        return (
          <div className="space-y-6">
            <h2 className="text-3xl font-serif font-bold text-ink text-center">
              Your Visage
            </h2>
            <div className="flex flex-col gap-6 items-center">
              <div className="relative group">
                {portraitUrl && portraitUrl !== UNKNOWN_IMG ? (
                  <>
                    <img
                      src={portraitUrl}
                      alt="Generated Portrait"
                      className="w-48 h-48 rounded-sm shadow-xl border-[6px] border-parchment-800 object-cover sepia-[.2]"
                    />
                    <div className="absolute -bottom-3 -right-3 bg-gold text-parchment-900 text-xs font-bold px-2 py-1 rounded-sm shadow border border-parchment-900">
                      Fresh Ink
                    </div>
                  </>
                ) : (
                  <div className="w-48 h-48 rounded-sm bg-parchment-200 border-4 border-dashed border-parchment-400 flex flex-col items-center justify-center text-ink-faint gap-2">
                    <Brush size={32} />
                    <span className="text-xs font-small-caps">
                      Canvas Empty
                    </span>
                  </div>
                )}
              </div>

              <div className="w-full">
                <label className="block text-sm font-bold font-small-caps text-ink-light mb-2 uppercase tracking-widest">
                  Describe Your Appearance
                </label>
                <textarea
                  value={portraitDescription}
                  onChange={(e) => setPortraitDescription(e.target.value)}
                  placeholder="e.g., Scarred warrior with piercing blue eyes, weathered face, short dark hair..."
                  className="w-full bg-parchment-100 border-2 border-parchment-400 rounded-sm p-3 text-ink text-sm focus:border-gold focus:outline-none resize-none h-24 font-serif italic shadow-inner"
                />
              </div>

              <button
                onClick={generatePortrait}
                disabled={isGenerating || !portraitDescription.trim()}
                className="w-full py-3 bg-parchment-800 hover:bg-parchment-900 text-btn-text font-display text-xl rounded-sm shadow-md border border-parchment-900 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:translate-y-0.5"
              >
                {isGenerating ? (
                  <>
                    <div className="w-4 h-4 border-2 border-parchment-100/30 border-t-parchment-100 rounded-full animate-spin" />
                    <span>Painting...</span>
                  </>
                ) : (
                  <>
                    <Wand2 size={20} />
                    <span>
                      {portraitUrl !== UNKNOWN_IMG
                        ? "Repaint Portrait"
                        : "Paint Portrait"}
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <h2 className="text-3xl font-serif font-bold text-ink text-center border-b border-parchment-400 pb-4">
              Ready to Begin
            </h2>
            <div className="bg-parchment-100 p-6 rounded-sm border-2 border-parchment-800 shadow-inner space-y-4 relative overflow-hidden">
              <div className="absolute inset-0 pointer-events-none opacity-20 bg-[url('https://www.transparenttextures.com/patterns/paper.png')]"></div>

              <div className="flex items-center gap-6 relative z-10">
                <div className="w-24 h-24 rounded-sm bg-parchment-800 flex items-center justify-center overflow-hidden border-2 border-gold shadow-md shrink-0">
                  {portraitUrl && portraitUrl !== UNKNOWN_IMG ? (
                    <img
                      src={portraitUrl}
                      alt="Portrait"
                      className="w-full h-full object-cover sepia-[.3]"
                    />
                  ) : (
                    <User size={32} className="text-parchment-100" />
                  )}
                </div>
                <div>
                  <h3 className="text-3xl font-display text-ink">{name}</h3>
                  {gender && (
                    <p className="text-sm text-ink-light italic mt-1">
                      {gender}
                    </p>
                  )}
                  <p className="text-xs text-ink-faint mt-2">
                    Human Adventurer
                  </p>
                </div>
              </div>

              <div className="border-t border-parchment-400 pt-4 relative z-10">
                <p className="text-sm text-ink-light italic text-center">
                  Your skills will develop through your actions.
                  <br />
                  Your story begins now.
                </p>
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="h-full w-full bg-parchment-300 flex items-center justify-center p-4 relative overflow-y-auto">
      <div className="w-full max-w-xl bg-parchment-200 border-[6px] border-parchment-800 rounded-sm shadow-xl flex flex-col my-auto relative panel-texture">
        {/* Progress Bar */}
        <div className="h-16 w-full flex items-center justify-center px-8 border-b border-parchment-400 bg-parchment-300/50">
          {STEPS.map((label, i) => (
            <div key={i} className="flex items-center">
              <div
                className={`w-3 h-3 rounded-full border border-parchment-900 transition-all ${
                  i <= step
                    ? "bg-burgundy scale-125 shadow-sm"
                    : "bg-parchment-400"
                }`}
                title={label}
              />
              {i < STEPS.length - 1 && (
                <div
                  className={`w-12 h-0.5 ${
                    i < step ? "bg-burgundy" : "bg-parchment-400"
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        <div className="p-8 overflow-y-auto flex-1 custom-scrollbar max-h-[60vh]">
          {renderStep()}
        </div>

        <div className="p-6 bg-parchment-300 border-t-2 border-parchment-800 flex justify-between items-center relative z-10">
          <button
            onClick={back}
            disabled={step === 0}
            className="px-4 py-2 text-ink-light hover:text-ink font-small-caps font-bold disabled:opacity-30 flex items-center gap-1"
          >
            <ChevronLeft size={16} /> Previous
          </button>
          {step === STEPS.length - 1 ? (
            <button
              onClick={handleComplete}
              disabled={!name.trim()}
              className="px-8 py-2 bg-burgundy text-btn-text font-display text-xl rounded-sm shadow hover:bg-burgundy-dim border border-parchment-900 disabled:opacity-50 disabled:grayscale transition-all"
            >
              Begin Adventure
            </button>
          ) : (
            <button
              onClick={next}
              disabled={!isStepValid()}
              className="px-6 py-2 bg-parchment-800 text-btn-text font-display text-lg rounded-sm shadow hover:bg-parchment-900 flex items-center gap-2 border border-parchment-900 disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed transition-all"
            >
              Next <ChevronRight size={16} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
