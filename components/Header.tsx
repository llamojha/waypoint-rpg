"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  User,
  Shield,
  Moon,
  Sun,
  Code,
  Map as MapIcon,
  Book,
  Compass,
  Bell,
  Search,
  LogOut,
  ChevronDown,
} from "lucide-react";
import { Character, WorldContext } from "@/types";
import { useAuth } from "@/lib/auth/use-auth";
import { AuthModal } from "@/components/AuthModal";

interface Props {
  view: "landing" | "creation" | "game" | "profile" | "map" | "codex";
  setView: (view: any) => void;
  theme: "light" | "dark";
  toggleTheme: () => void;
  onOpenProfile: () => void;
  character?: Character;
  world?: WorldContext;
  onTrace?: () => void;
}

/** Weather icon mapping */
const WEATHER_ICONS: Record<string, string> = {
  Clear: "☀️",
  Cloudy: "☁️",
  Rain: "🌧️",
  Storm: "⛈️",
  Foggy: "🌫️",
  Snow: "❄️",
  Wind: "💨",
  Heatwave: "🔥",
};

function getWeatherIcon(weather: string): string {
  return WEATHER_ICONS[weather] || "☀️";
}

export const Header: React.FC<Props> = ({
  view,
  setView,
  theme,
  toggleTheme,
  onOpenProfile,
  character,
  world,
  onTrace,
}) => {
  const { user, isLoading, signOut } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Close user menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        userMenuRef.current &&
        !userMenuRef.current.contains(event.target as Node)
      ) {
        setShowUserMenu(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleScrollTo = (id: string) => {
    if (view !== "landing") {
      setView("landing");
      setTimeout(() => {
        document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    } else {
      document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    }
  };

  const handleSignOut = async () => {
    setShowUserMenu(false);
    await signOut();
    setView("landing");
  };

  const getUserDisplayName = () => {
    if (!user) return null;
    return (
      user.user_metadata?.full_name || user.email?.split("@")[0] || "Adventurer"
    );
  };

  return (
    <header className="h-16 bg-parchment-200 border-b-2 border-parchment-800 flex items-center justify-between px-4 lg:px-8 z-50 shrink-0 shadow-md relative transition-colors duration-300">
      {/* Vignette overlay */}
      <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_20px_rgba(0,0,0,0.1)]"></div>

      {/* Left: Logo & World Info */}
      <div className="flex items-center gap-6 relative z-10">
        <div
          className="flex items-center gap-3 cursor-pointer group"
          onClick={() => setView("landing")}
        >
          <div className="w-9 h-9 bg-parchment-900 rotate-3 border-2 border-gold rounded-sm flex items-center justify-center shadow-lg transition-transform group-hover:rotate-6">
            <span className="font-display text-gold text-2xl pt-1">W</span>
          </div>
          <div className="flex flex-col leading-tight">
            <h1 className="font-display text-2xl text-ink tracking-wide">
              WAYPOINT
            </h1>
            <span className="text-[10px] font-small-caps text-ink-light tracking-widest -mt-1 hidden sm:block">
              {world?.region || "The Ash Coast"}
            </span>
          </div>
        </div>

        {view !== "landing" && world && (
          <div className="hidden xl:flex items-center gap-2 px-3 py-1 bg-parchment-300 border border-parchment-400 rounded-full shadow-inner opacity-80">
            <span className="w-2 h-2 rounded-full bg-gold animate-pulse"></span>
            <span className="text-xs font-bold font-small-caps text-ink-light uppercase tracking-wide">
              Day {world.time.day} • {world.time.phase} • {getWeatherIcon(world.weather)} {world.weather}
            </span>
          </div>
        )}
      </div>

      {/* Center: Persistent World Navigation */}
      <div className="hidden md:flex items-center gap-8 text-sm font-bold font-small-caps uppercase tracking-wider text-ink-light relative z-10">
        {view === "landing" ? (
          <>
            <button
              onClick={() => handleScrollTo("how-it-works")}
              className="hover:text-gold transition-colors"
            >
              How it works
            </button>
            <button
              onClick={() => handleScrollTo("gallery")}
              className="hover:text-gold transition-colors"
            >
              Gallery
            </button>
            <button
              onClick={() => handleScrollTo("faq")}
              className="hover:text-gold transition-colors"
            >
              FAQ
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => setView("game")}
              className={`${
                view === "game"
                  ? "text-burgundy border-b-2 border-burgundy"
                  : "hover:text-gold"
              } transition-all py-1`}
            >
              Adventure
            </button>
            <button
              onClick={() => setView("profile")}
              className={`${
                view === "profile"
                  ? "text-burgundy border-b-2 border-burgundy"
                  : "hover:text-gold"
              } transition-all py-1`}
            >
              Journal
            </button>
            <button
              onClick={() => setView("codex")}
              className={`${
                view === "codex"
                  ? "text-burgundy border-b-2 border-burgundy"
                  : "hover:text-gold"
              } transition-all py-1 flex items-center gap-1`}
            >
              <Book size={14} /> Codex
            </button>
            <button
              onClick={() => setView("map")}
              className={`${
                view === "map"
                  ? "text-burgundy border-b-2 border-burgundy"
                  : "hover:text-gold"
              } transition-all py-1 flex items-center gap-1`}
            >
              <MapIcon size={14} /> Map
            </button>
          </>
        )}
      </div>

      {/* Right: Actions & Profile */}
      <div className="flex items-center gap-3 relative z-10">
        {view !== "landing" && (
          <>
            <button className="p-2 text-ink-light hover:text-gold transition-colors relative">
              <Bell size={18} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-burgundy rounded-full border border-parchment-200"></span>
            </button>
            <button className="p-2 text-ink-light hover:text-gold transition-colors hidden lg:block">
              <Search size={18} />
            </button>
          </>
        )}

        <div className="h-6 w-px bg-parchment-400 mx-1"></div>

        <button
          onClick={toggleTheme}
          className="p-2 text-ink-light hover:text-gold transition-colors rounded-full hover:bg-parchment-300/50"
        >
          {theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
        </button>

        {view !== "landing" && (
          <>
            <button
              className="hidden lg:flex items-center gap-1 group px-2"
              title="Safety Settings"
            >
              <Shield
                size={14}
                className="text-burgundy/70 group-hover:text-burgundy"
              />
            </button>

            {onTrace && (
              <button
                onClick={onTrace}
                className="hidden sm:flex text-xs font-bold text-ink-light hover:text-gold-dim items-center gap-1 uppercase tracking-wide transition-colors"
              >
                <Code size={14} />
              </button>
            )}

            <button
              onClick={onOpenProfile}
              className={`w-9 h-9 rounded-full border-2 flex items-center justify-center overflow-hidden shadow-inner transition-all duration-300 group ml-2 ${
                view === "profile"
                  ? "border-burgundy ring-2 ring-burgundy/30"
                  : "bg-parchment-400 border-parchment-800 hover:border-gold"
              }`}
            >
              {character?.portraitUrl ? (
                <img
                  src={character.portraitUrl}
                  alt="Me"
                  className="w-full h-full object-cover group-hover:sepia-[.2] transition-all"
                />
              ) : (
                <User size={18} className="text-ink-light" />
              )}
            </button>
          </>
        )}

        {view === "landing" && (
          <div className="flex items-center gap-4 ml-2">
            {isLoading ? (
              <div className="w-6 h-6 border-2 border-parchment-400 border-t-ink rounded-full animate-spin" />
            ) : user ? (
              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-2 px-3 py-1.5 bg-parchment-100 border border-parchment-400 rounded-sm hover:border-gold transition-colors"
                >
                  <div className="w-6 h-6 rounded-full bg-parchment-400 flex items-center justify-center overflow-hidden">
                    {user.user_metadata?.avatar_url ? (
                      <img
                        src={user.user_metadata.avatar_url}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <User size={14} className="text-ink-light" />
                    )}
                  </div>
                  <span className="text-sm font-bold font-small-caps text-ink max-w-[100px] truncate">
                    {getUserDisplayName()}
                  </span>
                  <ChevronDown size={14} className="text-ink-light" />
                </button>

                {showUserMenu && (
                  <div className="absolute right-0 top-full mt-2 w-48 bg-parchment-100 border-2 border-parchment-800 rounded-sm shadow-xl z-50">
                    <div className="p-3 border-b border-parchment-400">
                      <p className="text-xs text-ink-faint truncate">
                        {user.email}
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        setView("profile");
                      }}
                      className="w-full px-4 py-2 text-left text-sm font-bold font-small-caps text-ink hover:bg-parchment-200 transition-colors flex items-center gap-2"
                    >
                      <User size={14} />
                      Profile
                    </button>
                    <button
                      onClick={handleSignOut}
                      className="w-full px-4 py-2 text-left text-sm font-bold font-small-caps text-burgundy hover:bg-parchment-200 transition-colors flex items-center gap-2"
                    >
                      <LogOut size={14} />
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <>
                <button
                  onClick={() => setShowAuthModal(true)}
                  className="text-sm font-bold font-small-caps uppercase tracking-wider text-ink hover:text-gold transition-colors"
                >
                  Sign In
                </button>
                <button
                  onClick={() => setShowAuthModal(true)}
                  className="px-4 py-1.5 bg-parchment-800 text-parchment-100 font-bold font-small-caps uppercase tracking-wider rounded-sm shadow-md hover:bg-gold hover:text-ink transition-all border border-parchment-900"
                >
                  Play Free
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Auth Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
      />
    </header>
  );
};
