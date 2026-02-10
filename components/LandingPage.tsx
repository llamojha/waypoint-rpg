"use client";

import React, { useState } from "react";
import {
  Users,
  Sword,
  ChevronRight,
  CheckCircle2,
  Feather,
  BookOpen,
} from "lucide-react";
import { AuthModal } from "@/components/AuthModal";
import { useAuth } from "@/lib/auth";
import { canUserPlay, isWaitlistMode } from "@/lib/supabase/user-profile";

interface Props {
  onStart: () => void;
  theme: "light" | "dark";
  toggleTheme: () => void;
  onProfile: () => void;
  lang: "EN" | "ES";
  setLang: (lang: "EN" | "ES") => void;
}

export const LandingPage: React.FC<Props> = ({ onStart, lang, setLang }) => {
  const { user } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showWaitlistMessage, setShowWaitlistMessage] = useState(false);

  const handleStartClick = async () => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }

    // Check if user can play (tier check)
    const { allowed, reason } = await canUserPlay();
    if (!allowed && reason === "waitlist") {
      setShowWaitlistMessage(true);
      return;
    }

    onStart();
  };

  // Navigation is now handled by the global Header via IDs
  const waitlistMode = isWaitlistMode();
  // Show waitlist button if: waitlist mode is on AND user is not logged in
  const showWaitlistButton = waitlistMode && !user;
  
  return (
    <div
      id="landing-container"
      className="h-full w-full overflow-y-auto overflow-x-hidden bg-parchment-300 text-ink font-sans selection:bg-gold selection:text-ink relative scroll-smooth"
    >
      <main className="space-y-24">
        <Hero onStart={handleStartClick} isWaitlist={showWaitlistButton} />
        {/* CoreSystems removed as requested */}
        <AvatarGrid />
        <Testimonials />
        <SkillsShowcase />
        <ChatDemo />
        <FAQList />
        <FinalCTA onStart={handleStartClick} isWaitlist={showWaitlistButton} />
      </main>

      <Footer lang={lang} setLang={setLang} />

      {/* Auth Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        isWaitlist={waitlistMode}
      />

      {/* Waitlist Message Modal */}
      {showWaitlistMessage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowWaitlistMessage(false)}
          />
          <div className="relative w-full max-w-md mx-4 bg-parchment-200 border-2 border-parchment-600 rounded-sm shadow-2xl p-8 text-center">
            <h2 className="text-2xl font-display text-ink mb-3">You're on the Waiting List!</h2>
            <p className="text-ink-light font-serif mb-6">
              Thanks for your interest! We'll notify you when Waypoint is ready for you to play.
            </p>
            <button
              onClick={() => setShowWaitlistMessage(false)}
              className="px-6 py-2 bg-burgundy text-parchment-100 font-bold font-small-caps uppercase tracking-wider rounded-sm hover:bg-burgundy-dim transition-all"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

/* -------------------------------------------------------------------------
   3. Hero Block
------------------------------------------------------------------------- */
const Hero = ({ onStart, isWaitlist }: { onStart: () => void; isWaitlist: boolean }) => (
  <section className="relative pt-20 pb-32 px-4 text-center max-w-full mx-auto animate-fade-in overflow-hidden">
    {/* Background Image */}
    <div className="absolute inset-0 z-0">
      <img
        src="/hero_waypoint_bg_watercolour.png"
        alt="The Waypoint"
        className="absolute inset-0 w-full h-full object-cover opacity-30 scale-105"
      />
    </div>
    <div
      className="absolute inset-0 z-10 bg-gradient-to-t from-parchment-300 via-parchment-300/60 to-transparent pointer-events-none"
      aria-hidden="true"
    ></div>
    <div className="relative z-20 max-w-5xl mx-auto">
      <h1 className="text-6xl md:text-8xl font-display text-ink mb-6 text-shadow">
        Explore <span className="text-burgundy">Summerland Island.</span>
      </h1>

      <h2 className="text-2xl md:text-3xl font-serif text-ink-light mb-6">
        A persistent sandbox RPG where skills replace classes, and the world
        remembers.
      </h2>

      <div className="flex flex-wrap justify-center gap-3 mb-8">
        <PromiseChip text="No Classes. Just Skills." />
        <PromiseChip text="Your Choices Become Lore" />
        <PromiseChip text="Magic is a Myth (until you find it)" />
      </div>

      <p className="text-lg text-ink-faint max-w-2xl mx-auto mb-10 font-serif italic">
        No DM required. Take any action you can imagine. The game resolves the
        outcome, records what changed, and carries the consequences forward.
      </p>

      <div className="flex flex-col items-center gap-4">
        <button
          onClick={onStart}
          className="group relative px-10 py-5 bg-burgundy text-parchment-100 font-display text-2xl rounded-sm shadow-xl hover:bg-burgundy-dim border-2 border-parchment-900 transition-all active:translate-y-1 overflow-hidden"
        >
          <div className="flex items-center gap-3 relative z-10">
            <Sword className="fill-current" size={24} />
            <span>{isWaitlist ? "Join the Waiting List" : "Start Your Saga"}</span>
            <ChevronRight
              className="group-hover:translate-x-1 transition-transform"
              size={24}
            />
          </div>
          {/* Shine effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
        </button>

        <button
          onClick={() =>
            document
              .getElementById("how-it-works")
              ?.scrollIntoView({ behavior: "smooth" })
          }
          className="text-sm font-bold text-burgundy hover:underline opacity-80 mb-2"
        >
          See how the Codex works
        </button>
      </div>
    </div>
  </section>
);

const PromiseChip = ({ text }: { text: string }) => (
  <span className="px-3 py-1 bg-parchment-200 border border-parchment-400 rounded-full text-xs font-bold font-small-caps text-ink uppercase tracking-wide shadow-sm">
    {text}
  </span>
);

/* -------------------------------------------------------------------------
   4. Character Gallery
------------------------------------------------------------------------- */
const AvatarGrid = () => {
  // NPCs from across the island - 2 from each region
  const avatars = [
    // The Highlands
    { name: "Lucie", src: "/npc_lucie.png" },
    { name: "Aran", src: "/npc_aran.png" },
    // Stormwall Coast
    { name: "Domhnall", src: "/npc_domhnall.png" },
    { name: "Morag", src: "/npc_morag.png" },
    // Caledonia
    { name: "Élodie", src: "/npc_elodie.png" },
    { name: "Gaspard", src: "/npc_gaspard.png" },
    // Dunamar
    { name: "Pedro", src: "/npc_pedro.png" },
    { name: "Celia", src: "/npc_celia.png" },
  ];

  return (
    <section id="gallery" className="px-4 max-w-6xl mx-auto">
      <div className="grid grid-cols-4 md:grid-cols-8 gap-3 mb-8">
        {avatars.map((av, i) => (
          <div
            key={i}
            className="group relative aspect-square rounded-sm overflow-hidden border-2 border-parchment-800 bg-parchment-900 shadow-md transition-all duration-300 hover:scale-110 hover:z-10 hover:border-gold cursor-pointer"
          >
            <img
              src={av.src}
              alt={av.name}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center pb-2">
              <span className="text-[10px] text-parchment-100 font-bold uppercase tracking-widest text-center px-1">
                {av.name}
              </span>
            </div>
          </div>
        ))}
      </div>
      <p className="text-center font-serif text-xl text-ink italic mb-2">
        "Salvage shipwrecks. Charm a baroness. Explore forgotten caves. You aren’t locked
        into a class, you become what you practice."
      </p>
      <p className="text-center text-xs font-bold font-small-caps text-ink-light uppercase tracking-widest opacity-70">
        Unlock new actions as you level skills: track trails, forge alloys,
        negotiate treaties, decode ruins.
      </p>
    </section>
  );
};

/* -------------------------------------------------------------------------
   5. Testimonials Wall (Infinite Scroll)
------------------------------------------------------------------------- */
const Testimonials = () => {
  const reviews = [
    {
      text: "I spent three sessions earning Domhnall's trust. Now the flotsam hunters share their salvage routes with me.",
      author: "Sarah J.",
      color: "border-burgundy",
      img: "/reviewer_1_v2.png",
    },
    {
      text: "Baroness Solène remembered I insulted her at the market. The guards 'escorted' me out of Caledonia.",
      author: "Mike R.",
      color: "border-forest",
      img: "/reviewer_2_v2.png",
    },
    {
      text: "We followed rumors about the Black Fort for two nights… and uncovered what really happened there.",
      author: "Sam W.",
      color: "border-gold",
      img: "/reviewer_3_v2.png",
    },
    {
      text: "Found Aris deep in La Cueva. The things he knows about the island... it changes everything.",
      author: "Lina P.",
      color: "border-ink",
      img: "/reviewer_4_v2.png",
    },
    {
      text: "Crossed the Howling-Spine in a storm. Lost my best gear but the scholars at Forel took me in.",
      author: "Casey B.",
      color: "border-burgundy-dim",
      img: "/reviewer_5_v2.png",
    },
    {
      text: "No prep needed. I just arrived at the Waystone and the island was there, waiting.",
      author: "Jordan P.",
      color: "border-forest-dim",
      img: "/reviewer_6_v2.png",
    },
    {
      text: "Morag at the Flotsam Hold still won't serve me. That bar fight was three sessions ago.",
      author: "Devin K.",
      color: "border-gold-dim",
      img: "/reviewer_7_v2.png",
    },
    {
      text: "Started as a trader, now I'm known across Dunamar as a tracker. The skills reflect how I actually play.",
      author: "Riley M.",
      color: "border-ink",
      img: "/reviewer_8_v2.png",
    },
    {
      text: "Héctor's songs spread my reputation faster than I could travel. Now everyone in Caleta knows my name.",
      author: "Alex T.",
      color: "border-forest",
      img: "/reviewer_9_v2.png",
    },
  ];

  // Distribute reviews into 3 columns
  const col1 = [reviews[0], reviews[3], reviews[6]];
  const col2 = [reviews[1], reviews[4], reviews[7]];
  const col3 = [reviews[2], reviews[5], reviews[8]];

  return (
    <section className="px-4 max-w-7xl mx-auto overflow-hidden">
      <h3 className="text-center text-2xl font-display text-ink mb-10">
        What Adventurers Are Saying
      </h3>

      {/* Mobile: Standard Scrollable List (Show ALL) */}
      <div className="md:hidden h-[500px] overflow-y-auto mask-gradient pr-2">
        <div className="flex flex-col gap-6 pb-12 pt-4">
          {reviews.map((r, i) => (
            <ReviewCard key={`m-${i}`} {...r} />
          ))}
        </div>
      </div>

      {/* Desktop: Animated Infinite Scroll Columns */}
      <div className="hidden md:block relative h-[600px] mask-gradient overflow-hidden">
        <div className="grid grid-cols-3 gap-6 h-full">
          {/* Column 1 - Scroll Up */}
          <div className="relative h-full overflow-hidden">
            <div className="animate-scroll-up flex flex-col gap-6">
              {/* Duplicate content for seamless loop */}
              {[...col1, ...col1, ...col1, ...col1].map((r, i) => (
                <ReviewCard key={`c1-${i}`} {...r} />
              ))}
            </div>
          </div>

          {/* Column 2 - Scroll Down (Slower) */}
          <div className="relative h-full overflow-hidden">
            <div className="animate-scroll-down flex flex-col gap-6">
              {[...col2, ...col2, ...col2, ...col2].map((r, i) => (
                <ReviewCard key={`c2-${i}`} {...r} />
              ))}
            </div>
          </div>

          {/* Column 3 - Scroll Up (Faster) */}
          <div className="relative h-full overflow-hidden">
            <div
              className="animate-scroll-up flex flex-col gap-6"
              style={{ animationDuration: "70s" }}
            >
              {[...col3, ...col3, ...col3, ...col3].map((r, i) => (
                <ReviewCard key={`c3-${i}`} {...r} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

const ReviewCard = ({ text, author, color, img }: any) => (
  <div
    className={`p-6 bg-parchment-100 rounded-sm border-l-4 ${color} shadow-sm transition-shadow`}
  >
    <p className="font-serif text-lg text-ink mb-4 leading-relaxed">"{text}"</p>
    <div className="flex items-center gap-2">
      <div className="w-10 h-10 rounded-full overflow-hidden border border-parchment-400 bg-parchment-300 shadow-inner">
        <img src={img} alt={author} className="w-full h-full object-cover" />
      </div>
      <span className="text-xs font-bold font-small-caps text-ink-light uppercase tracking-wide">
        {author}
      </span>
    </div>
  </div>
);

/* -------------------------------------------------------------------------
   6. Skills Showcase (replaces Video Embed)
------------------------------------------------------------------------- */
const SkillsShowcase = () => {
  const skills = [
    { name: "Melee", tier1: ["strike", "slash", "thrust"], tier2: ["cleave", "feint", "lunge"], tier3: ["disarm", "riposte", "execution"] },
    { name: "Sneaking", tier1: ["sneak", "creep", "slip"], tier2: ["shadow", "stalk", "ghost"], tier3: ["vanish", "silent step", "unseen"] },
    { name: "Persuasion", tier1: ["persuade", "convince", "appeal"], tier2: ["negotiate", "reassure", "reason"], tier3: ["compel", "sway", "convert"] },
    { name: "Perception", tier1: ["notice", "spot", "listen"], tier2: ["scan", "search", "scrutinize"], tier3: ["pinpoint", "true sight"] },
    { name: "Tracking", tier1: ["track", "follow", "trail"], tier2: ["pursue", "backtrack", "read spoor"], tier3: ["predict route", "reconstruct path"] },
    { name: "Barter", tier1: ["haggle", "bargain", "barter"], tier2: ["leverage", "bundle deal", "undercut"], tier3: ["perfect deal", "market play", "price crush"] },
  ];

  return (
    <section className="px-4 max-w-5xl mx-auto">
      <div className="text-center mb-10">
        <h3 className="text-3xl font-display text-ink mb-3">
          Skills, Not Classes
        </h3>
        <p className="text-lg text-ink-light font-serif italic max-w-2xl mx-auto mb-6">
          Your character emerges from your choices. Use "strike" in combat, gain Melee XP. 
          "Convince" an NPC, level Persuasion. You become what you practice.
        </p>
        <div className="bg-parchment-200 border-2 border-parchment-800 rounded-sm p-4 max-w-2xl mx-auto">
          <div className="flex items-center justify-center gap-3 text-sm">
            <div className="flex gap-1">
              <span className="px-2 py-0.5 text-ink text-[10px] rounded-sm font-mono">Tier 1</span>
              <span className="px-2 py-0.5 text-gold text-[10px] rounded-sm font-mono">Tier 2</span>
              <span className="px-2 py-0.5 text-burgundy text-[10px] rounded-sm font-mono">Tier 3</span>
            </div>
            <span className="text-ink-light font-serif">
              Power words unlock as you level. Higher tiers grant bigger bonuses to your rolls.
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {skills.map((skill) => (
          <div
            key={skill.name}
            className="bg-parchment-200 border-2 border-parchment-800 p-4 rounded-sm"
          >
            <div className="text-sm font-bold text-ink mb-2 text-center border-b border-parchment-400 pb-2">
              {skill.name}
            </div>
            <div className="flex flex-wrap justify-center gap-1">
              {skill.tier1.map((word) => (
                <span key={word} className="text-[10px] px-1.5 py-0.5 rounded-sm font-mono text-ink">{word}</span>
              ))}
              {skill.tier2.map((word) => (
                <span key={word} className="text-[10px] px-1.5 py-0.5 rounded-sm font-mono text-gold">{word}</span>
              ))}
              {skill.tier3.map((word) => (
                <span key={word} className="text-[10px] px-1.5 py-0.5 rounded-sm font-mono text-burgundy">{word}</span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

/* -------------------------------------------------------------------------
   7. "How It Works" Chat Transcript (Updated to match Game UI)
------------------------------------------------------------------------- */
const ChatDemo = () => (
  <section id="how-it-works" className="px-4 max-w-4xl mx-auto py-10">
    <div className="bg-parchment-100 border-4 border-parchment-800 rounded-sm shadow-2xl overflow-hidden relative flex flex-col panel-texture">
      {/* Sticky Header (Game Style) */}
      <div className="sticky top-0 z-20 bg-parchment-100/95 backdrop-blur-md border-b border-parchment-400 px-6 py-4 shadow-sm flex justify-between items-center">
        <div className="flex flex-col">
          <span className="text-[10px] font-bold font-small-caps text-ink-light uppercase tracking-[0.2em]">
            Current Chapter
          </span>
          <h2 className="font-display text-2xl text-ink leading-none">
            The Black Fort Ruins
          </h2>
        </div>
        <div className="text-xs font-serif italic opacity-50">Story Mode</div>
      </div>

      {/* Story Stream */}
      <div className="px-8 py-6 space-y-6 relative">
        <div className="flex items-center justify-center gap-4 text-parchment-400 py-2 opacity-50">
          <div className="h-px bg-current w-12"></div>
          <div className="text-xs font-serif italic text-ink-light">
            Adventure Log
          </div>
          <div className="h-px bg-current w-12"></div>
        </div>

        {/* Turn 1: DM */}
        <div className="relative animate-fade-in">
          <div className="flex justify-center my-4 opacity-30 text-gold-dim">
            <span className="font-display text-xl flex items-center gap-2"><span className="translate-y-[7px]">~</span><span>⚜</span><span className="translate-y-[7px]">~</span></span>
          </div>
          <div className="narration-text text-ink text-justify relative z-10 drop-cap">
            Wind howls through the crumbling battlements. Ravens scatter from the collapsed tower. Fresh bootprints in the mud lead inside.
            <br />
            Someone’s here.
          </div>
        </div>

        {/* Turn 1: Player */}
        <div
          className="flex justify-end pl-12 relative animate-fade-in"
          style={{ animationDelay: "0.3s" }}
        >
          <div className="relative max-w-[90%] text-right">
            <span className="font-serif italic text-lg text-ink-light leading-relaxed">
              I step inside and call up the tower: “Friend or foe? Hear me out.
              I’m looking for the missing courier.”
            </span>
            <div className="text-[10px] font-bold text-burgundy opacity-50 uppercase tracking-widest mt-1 flex items-center justify-end gap-1">
              <span className="w-4 h-px bg-burgundy"></span> You
            </div>
          </div>
        </div>

        {/* Turn 2: DM Response & Mechanics */}
        <div
          className="relative animate-fade-in"
          style={{ animationDelay: "1s" }}
        >
          <div className="flex justify-center my-4 opacity-30 text-gold-dim">
            <span className="font-display text-xl flex items-center gap-2"><span className="translate-y-[7px]">~</span><span>⚜</span><span className="translate-y-[7px]">~</span></span>
          </div>

          {/* Mechanics Breakdown (Skill Check with Power Word) */}
          <div className="bg-parchment-200 border border-parchment-400 rounded-sm p-4 my-4 font-mono text-xs shadow-sm relative overflow-hidden max-w-md mx-auto">
            <div className="absolute top-0 left-0 w-1 h-full bg-forest"></div>

            {/* Header */}
            <div className="flex justify-between items-center mb-2 border-b border-parchment-400 pb-1">
              <span className="font-bold text-ink uppercase tracking-wide">
                CHECK: Persuasion (Parley)
              </span>
              <span className="text-forest font-bold bg-parchment-100 px-2 rounded-sm border border-parchment-300">
                SUCCESS
              </span>
            </div>

            {/* Details Grid */}
            <div className="space-y-1.5 text-ink-light">
              <div className="flex justify-between items-center">
                <span>Matched Power Word:</span>
                <span className="text-burgundy font-bold">
                  “hear me out”{" "}
                  <span className="text-ink-faint font-normal">
                    (Tier 1, +1)
                  </span>
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span>Skill Level:</span>
                <span>Persuasion 4 (+2)</span>
              </div>
              <div className="flex justify-between items-center border-t border-dashed border-parchment-400 pt-1 mt-1">
                <span>Total Bonus:</span>
                <span className="font-bold">+3</span>
              </div>
              <div className="flex justify-between items-center pt-1 bg-parchment-100/50 -mx-4 px-4 py-1 mt-1 border-t border-parchment-300">
                <span className="uppercase tracking-widest font-bold text-[10px]">
                  Roll Result
                </span>
                <span className="font-bold text-ink text-sm">
                  d20 (13) + 3 = <span className="text-forest">16</span>
                </span>
              </div>
            </div>
          </div>

          <div className="narration-text text-ink text-justify relative z-10 mb-4">
            A crossbow clicks above you. A voice answers, calm and close:
            <br />
            “Depends who’s asking.”
          </div>

          {/* Consequences Ribbon */}
          <div className="my-4 py-2 border-y border-parchment-400/30 bg-parchment-200/20 flex flex-wrap gap-x-4 gap-y-2 items-center justify-center">
            <div className="flex items-center gap-1.5 text-[11px] font-bold font-sans">
              <BookOpen size={12} className="text-gold" />
              <span className="uppercase text-ink-light tracking-wide">
                CODEX:
              </span>
              <span className="text-ink">Black Fort Ruins (Occupied)</span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] font-bold font-sans">
              <Users size={12} className="text-burgundy" />
              <span className="uppercase text-ink-light tracking-wide">
                NEW CONTACT:
              </span>
              <span className="text-ink">Finlay (Suspicious)</span>
            </div>
          </div>
        </div>

        {/* Turn 2: Player */}
        <div
          className="flex justify-end pl-12 relative animate-fade-in"
          style={{ animationDelay: "2s" }}
        >
          <div className="relative max-w-[90%] text-right">
            <span className="font-serif italic text-lg text-ink-light leading-relaxed">
              “I’m tracking the missing courier. I saw his seal on the road.”
            </span>
            <div className="text-[10px] font-bold text-burgundy opacity-50 uppercase tracking-widest mt-1 flex items-center justify-end gap-1">
              <span className="w-4 h-px bg-burgundy"></span> You
            </div>
          </div>
        </div>

        {/* Turn 3: DM Response */}
        <div
          className="relative animate-fade-in"
          style={{ animationDelay: "3s" }}
        >
          <div className="flex justify-center my-4 opacity-30 text-gold-dim">
            <span className="font-display text-xl flex items-center gap-2"><span className="translate-y-[7px]">~</span><span>⚜</span><span className="translate-y-[7px]">~</span></span>
          </div>

          <div className="narration-text text-ink text-justify relative z-10 mb-4">
            Silence. then the lantern light shifts. You hear boots reposition.
            “Seal,” Mara repeats. “Then you’re already late.”
            <br />
            <br />
            She doesn’t fire… but she bars the stair with her body.
          </div>

          {/* Consequences Ribbon */}
          <div className="my-4 py-2 border-y border-parchment-400/30 bg-parchment-200/20 flex flex-wrap gap-x-4 gap-y-2 items-center justify-center">
            <div className="flex items-center gap-1.5 text-[11px] font-bold font-sans">
              <CheckCircle2 size={12} className="text-burgundy" />
              <span className="uppercase text-ink-light tracking-wide">
                STATE:
              </span>
              <span className="text-ink">Negotiation Open</span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] font-bold font-sans">
              <BookOpen size={12} className="text-gold" />
              <span className="uppercase text-ink-light tracking-wide">
                CODEX:
              </span>
              <span className="text-ink">Flotsam Hunters</span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] font-bold font-sans">
              <Users size={12} className="text-burgundy" />
              <span className="uppercase text-ink-light tracking-wide">
                RELATIONSHIP:
              </span>
              <span className="text-ink">Finlay (-1)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Input Deck (Game Style) */}
      <div className="bg-gradient-to-t from-parchment-200 via-parchment-200 to-transparent pt-8 pb-6 px-8 relative z-10">
        <div className="flex justify-center gap-3 mb-4 opacity-60">
          <span className="text-[10px] text-ink-light border border-parchment-400 px-2 py-0.5 rounded-full bg-parchment-100">
            Offer to help with salvage
          </span>
          <span className="text-[10px] text-ink-light border border-parchment-400 px-2 py-0.5 rounded-full bg-parchment-100">
            Ask about Domhnall
          </span>
        </div>

        <div className="relative group shadow-lg rounded-sm bg-parchment-100">
          <div className="w-full bg-parchment-100 border-2 border-parchment-400 rounded-sm p-4 text-ink-faint font-serif text-lg leading-relaxed h-16 shadow-inner flex items-center justify-between">
            <span>Write your next action...</span>
            <button className="px-4 py-1.5 bg-ink text-parchment-100 rounded-full flex items-center gap-2 text-xs font-bold uppercase tracking-widest border border-parchment-400 shadow-md">
              <Feather size={12} /> <span>Write</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </section>
);

/* -------------------------------------------------------------------------
   8. FAQ List
------------------------------------------------------------------------- */
const FAQList = () => {
  const faqs = [
    {
      q: "Do I need to know D&D rules?",
      a: "Not at all. The game handles rolls, outcomes, and character state. You just describe what you do.",
    },
    {
      q: "What makes it a “persistent world”?",
      a: "Discoveries and consequences carry forward, reputations change, locations gain tags, and major findings can enter the shared Codex as canon.",
    },
    {
      q: "Can we write lore without breaking continuity?",
      a: "Yes. Player stories start as Rumors. When proven through play, they become Canon, so the world stays coherent.",
    },
    {
      q: "Is magic in the game?",
      a: "Yes, but it’s rare, powerful, and costly. Finding it is an event, not a build choice.",
    },
    {
      q: "Is it free?",
      a: "Yes! The Wanderer tier gives you daily energy for a full session every day.",
    },
  ];

  return (
    <section id="faq" className="px-4 max-w-2xl mx-auto py-10">
      <h3 className="text-3xl font-display text-ink mb-8 text-center">
        Frequently Asked Questions
      </h3>
      <div className="space-y-8">
        {faqs.map((f, i) => (
          <div key={i} className="border-b border-parchment-400 pb-6">
            <h4 className="text-xl font-bold font-serif text-ink mb-2">
              {f.q}
            </h4>
            <p className="text-ink-light font-sans leading-relaxed">{f.a}</p>
          </div>
        ))}
      </div>
    </section>
  );
};

/* -------------------------------------------------------------------------
   9. Final CTA
------------------------------------------------------------------------- */
const FinalCTA = ({ onStart, isWaitlist }: { onStart: () => void; isWaitlist: boolean }) => (
  <section className="relative px-4 text-center py-24 bg-parchment-200 border-y-2 border-parchment-800 overflow-hidden">
    {/* Background Image */}
    <div className="absolute inset-0 z-0">
      <img
        src="/cta_camp_party_bg_watercolour.png"
        alt="Adventurer's Camp"
        className="w-full h-full object-cover opacity-20 scale-105"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-parchment-200 via-transparent to-parchment-200"></div>
    </div>

    <div className="relative z-10 max-w-3xl mx-auto">
      <h2 className="text-4xl md:text-5xl font-display text-ink mb-4">
        Your Story Awaits
      </h2>
      <p className="text-xl text-ink-light font-serif italic mb-10">
        No DM required. Take any action you can imagine. The game resolves the outcome, 
        records what changed, and carries the consequences forward.
      </p>

      <div className="flex flex-col items-center gap-6">
        <button
          onClick={onStart}
          className="px-12 py-5 bg-burgundy text-parchment-100 font-display text-2xl rounded-sm shadow-xl hover:bg-burgundy-dim border-2 border-parchment-900 transition-all hover:-translate-y-1"
        >
          {isWaitlist ? "Join the Waiting List" : "Start Playing Now"}
        </button>
        <div className="flex flex-col items-center gap-1">
          <div className="text-[10px] font-bold text-ink-faint uppercase tracking-widest opacity-60">
            Play anytime. Your choices become lore.
          </div>
        </div>
      </div>
    </div>
  </section>
);

/* -------------------------------------------------------------------------
   10. Language & 11. Footer
------------------------------------------------------------------------- */
const Footer = ({
  lang,
  setLang,
}: {
  lang: "EN" | "ES";
  setLang: (l: "EN" | "ES") => void;
}) => (
  <footer className="bg-parchment-900 text-parchment-400 dark:text-ink-light py-12 px-4 border-t-4 border-parchment-800 relative overflow-hidden">
    <div className="absolute inset-0 opacity-20 bg-[url('/footer_oak_texture.png')] bg-cover bg-center pointer-events-none"></div>

    <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-center items-center gap-8 relative z-10">
      {/* Signature */}
      <div className="text-xs text-center opacity-60 font-mono">
        <div>Made with ☕ in Madrid, Spain</div>
        <div className="mt-1">© 2026 Waypoint RPG</div>
      </div>
    </div>
  </footer>
);

const LanguageButton = ({
  label,
  active,
  onClick,
}: {
  label: string;
  active?: boolean;
  onClick: () => void;
}) => (
  <button
    onClick={onClick}
    className={`text-sm font-bold font-small-caps transition-transform hover:scale-110 ${
      active
        ? "opacity-100 scale-110 drop-shadow-md text-parchment-100"
        : "opacity-50 hover:opacity-100"
    }`}
  >
    {label}
  </button>
);
