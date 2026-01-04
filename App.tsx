"use client";

import React, { useState, useEffect, useRef } from "react";
import { CharacterCreation } from "@/components/CharacterCreation";
import { LandingPage } from "@/components/LandingPage";
import { LeftColumn } from "@/components/LeftColumn";
import { CenterColumn } from "@/components/CenterColumn";
import { RightColumn } from "@/components/RightColumn";
import { TurnTrace } from "@/components/TurnTrace";
import { ProfilePage } from "@/components/ProfilePage";
import { MapPage } from "@/components/MapPage";
import { CodexPage } from "@/components/CodexPage";
import { Header } from "@/components/Header";
import { GameState, Character, Turn, TurnDiff, MapLocation } from "@/types";
import {
  INITIAL_CHARACTER,
  INITIAL_QUESTS,
  INITIAL_NPCS,
  INITIAL_WORLD,
  MOCK_INITIAL_TURN,
  MOCK_SESSIONS,
  MOCK_MAP_LOCATIONS,
  USE_MOCK_DATA,
} from "@/constants";
import { User, BookOpen, Map as MapIcon, Book, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth";

type ViewState = "landing" | "creation" | "game" | "profile" | "map" | "codex";
type MobileTab = "sheet" | "play" | "map" | "codex";
export type TurnStatus = "idle" | "processing" | "error";

export default function App() {
  const { user, isLoading: authLoading } = useAuth();
  const [view, setView] = useState<ViewState>("landing");
  const [previousView, setPreviousView] = useState<ViewState>("landing");
  const [showTrace, setShowTrace] = useState(false);

  // Loading and error states for character/world data
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Theme State - Default to light
  const [theme, setTheme] = useState<"light" | "dark">("light");

  // Language State
  const [lang, setLang] = useState<"EN" | "ES">("EN");

  // Mobile Tab State
  const [mobileTab, setMobileTab] = useState<MobileTab>("play");

  // Codex Deep Linking
  const [codexSearchTerm, setCodexSearchTerm] = useState("");

  // Game State
  const [gameState, setGameState] = useState<GameState>({
    character: INITIAL_CHARACTER,
    quests: USE_MOCK_DATA ? INITIAL_QUESTS : [],
    npcs: USE_MOCK_DATA ? INITIAL_NPCS : [],
    turns: USE_MOCK_DATA ? [MOCK_INITIAL_TURN] : [],
    world: INITIAL_WORLD,
    sessions: USE_MOCK_DATA ? MOCK_SESSIONS : [],
  });

  // Turn Lifecycle State
  const [turnStatus, setTurnStatus] = useState<TurnStatus>("idle");
  const [lastInput, setLastInput] = useState<string>("");
  const [diffLog, setDiffLog] = useState<TurnDiff[]>(
    USE_MOCK_DATA && gameState.turns[0] ? gameState.turns[0].diffs : []
  );

  // Ref for cancellation
  const abortControllerRef = useRef<AbortController | null>(null);

  // Apply Theme
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  // Protected route check - redirect to landing if not authenticated on protected views
  useEffect(() => {
    const protectedViews: ViewState[] = ["game", "profile", "map", "codex"];
    if (!authLoading && !user && protectedViews.includes(view)) {
      setView("landing");
    }
  }, [user, authLoading, view]);

  // Load character on mount when user is authenticated
  const loadCharacter = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/character");
      const data = await res.json();

      if (!res.ok) {
        const errorMessage = getErrorMessage(data.code, data.error);
        throw new Error(errorMessage);
      }

      if (data.character) {
        // Character exists - load into state and show game
        setGameState((prev) => ({ ...prev, character: data.character }));
        setView("game");

        // Also fetch world state, turns, quests, and NPCs
        await loadWorldState(data.character.id);
        await loadTurns(data.character.id);
        await loadQuests(data.character.id);
        await loadNpcs(data.character.id);
      } else {
        // No character - show creation
        setView("creation");
      }
    } catch (err) {
      console.error("Failed to load character:", err);
      setError(err instanceof Error ? err.message : "Failed to load character");
    } finally {
      setIsLoading(false);
    }
  };

  // Load world state for a character
  const loadWorldState = async (characterId: string) => {
    try {
      const res = await fetch(`/api/world?character_id=${characterId}`);
      const data = await res.json();

      if (!res.ok) {
        // Log but don't throw - world state is secondary
        console.warn(
          "World state fetch failed:",
          getErrorMessage(data.code, data.error)
        );
        return;
      }

      if (data.world) {
        setGameState((prev) => ({ ...prev, world: data.world }));
      }
    } catch (err) {
      console.error("Failed to load world state:", err);
      // Don't set error - world state is secondary, game can still work with defaults
    }
  };

  // Load turns for a character
  const loadTurns = async (characterId: string) => {
    try {
      const res = await fetch(`/api/turn?character_id=${characterId}`);
      const data = await res.json();

      if (!res.ok) {
        console.warn("Turns fetch failed:", data.error);
        return;
      }

      if (data.turns && data.turns.length > 0) {
        setGameState((prev) => ({ ...prev, turns: data.turns }));
        // Update diff log with diffs from all turns
        const allDiffs = data.turns.flatMap((t: Turn) => t.diffs || []);
        setDiffLog(allDiffs);
      }
    } catch (err) {
      console.error("Failed to load turns:", err);
    }
  };

  // Load quests for a character
  const loadQuests = async (characterId: string) => {
    try {
      const res = await fetch(`/api/quests?character_id=${characterId}`);
      const data = await res.json();

      if (!res.ok) {
        console.warn("Quests fetch failed:", data.error);
        return;
      }

      if (data.quests) {
        setGameState((prev) => ({ ...prev, quests: data.quests }));
      }
    } catch (err) {
      console.error("Failed to load quests:", err);
    }
  };

  // Load NPCs with relationships for a character
  const loadNpcs = async (characterId: string) => {
    try {
      const res = await fetch(`/api/npcs?character_id=${characterId}`);
      const data = await res.json();

      if (!res.ok) {
        console.warn("NPCs fetch failed:", data.error);
        return;
      }

      if (data.npcs) {
        setGameState((prev) => ({ ...prev, npcs: data.npcs }));
      }
    } catch (err) {
      console.error("Failed to load NPCs:", err);
    }
  };

  // Fetch character when user is authenticated
  useEffect(() => {
    if (!authLoading && user) {
      loadCharacter();
    } else if (!authLoading && !user) {
      // Not authenticated - stop loading and show landing
      setIsLoading(false);
    }
  }, [user, authLoading]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "light" ? "dark" : "light"));
  };

  const handleStartGame = () => {
    // Only allow starting game if authenticated
    if (!user) {
      // The LandingPage will handle showing the auth modal
      return;
    }
    setView("creation");
  };

  const handleOpenProfile = () => {
    setPreviousView(view);
    setView("profile");
  };

  const handleCloseProfile = () => {
    setView(previousView === "profile" ? "landing" : previousView);
  };

  const handleResumeGame = () => {
    setView("game");
  };

  const handleCharacterComplete = async (charData: Partial<Character>) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/character", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(charData),
      });

      const data = await res.json();

      if (!res.ok) {
        // Handle specific error codes with user-friendly messages
        const errorMessage = getErrorMessage(data.code, data.error);
        throw new Error(errorMessage);
      }

      // Load returned character and world into gameState
      setGameState((prev) => ({
        ...prev,
        character: data.character,
        world: data.world || prev.world,
      }));
      setView("game");
    } catch (err) {
      console.error("Failed to create character:", err);
      setError(
        err instanceof Error ? err.message : "Failed to create character"
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Helper function to convert API error codes to user-friendly messages
  const getErrorMessage = (code?: string, fallback?: string): string => {
    const errorMessages: Record<string, string> = {
      MISSING_NAME: "Please provide a name for your character.",
      CHARACTER_EXISTS:
        "You already have a character. Please continue your existing adventure.",
      MISSING_USER_ID:
        "Unable to identify your account. Please try signing in again.",
      MISSING_ID: "Character information is missing. Please try again.",
      MISSING_CHARACTER_ID:
        "Character information is missing. Please try again.",
      NOT_FOUND: "Character not found. It may have been deleted.",
      DB_ERROR: "Unable to save your progress. Please try again in a moment.",
      INTERNAL_ERROR: "Something went wrong on our end. Please try again.",
    };
    return (
      errorMessages[code || ""] || fallback || "An unexpected error occurred."
    );
  };

  const handleCharacterUpdate = (updatedCharacter: Character) => {
    setGameState((prev) => ({
      ...prev,
      character: updatedCharacter,
    }));
  };

  // 1. Core Turn Processor - Calls /api/turn/stream endpoint with SSE
  const processTurn = async (input: string, rollTurnId?: string) => {
    // Reset cancellation token
    if (abortControllerRef.current) abortControllerRef.current.abort();
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    setTurnStatus("processing");

    try {
      const characterId = gameState.character.id;
      if (!characterId) {
        throw new Error("Character ID is missing. Please reload the game.");
      }

      const response = await fetch("/api/turn/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          characterId,
          playerAction: input,
          roll: !!rollTurnId,
          turnId: rollTurnId,
        }),
        signal: abortController.signal,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Turn failed: ${response.status}`);
      }

      const contentType = response.headers.get("content-type") || "";

      // Handle pending roll (non-streaming JSON response)
      if (contentType.includes("application/json")) {
        const data = await response.json();

        if (data.pendingRoll) {
          // Update the last turn with mechanics for roll
          setGameState((prev) => {
            const turns = [...prev.turns];
            const lastTurn = turns[turns.length - 1];
            if (lastTurn) {
              turns[turns.length - 1] = {
                ...lastTurn,
                id: data.turn.id,
                mechanics: data.turn.mechanics,
                isStreaming: false,
              };
            }
            return { ...prev, turns };
          });
          setTurnStatus("idle");
          return;
        }
      }

      // Handle streaming response
      if (!response.body) throw new Error("No response body");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let turnId = rollTurnId || `t-${Date.now()}`;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("event: ")) {
            const eventType = line.slice(7).trim();
            continue;
          }
          if (line.startsWith("data: ")) {
            const data = JSON.parse(line.slice(6));

            if (data.text) {
              // Streaming chunk - append to narration
              setGameState((prev) => {
                const turns = [...prev.turns];
                const lastTurn = turns[turns.length - 1];
                if (lastTurn) {
                  turns[turns.length - 1] = {
                    ...lastTurn,
                    narration: lastTurn.narration + data.text,
                    isStreaming: true,
                  };
                }
                return { ...prev, turns };
              });
            }

            if (data.turnId !== undefined) {
              turnId = data.turnId;
            }

            if (data.diffs !== undefined) {
              // Complete event - finalize turn
              setGameState((prev) => {
                const turns = [...prev.turns];
                const lastTurn = turns[turns.length - 1];
                if (lastTurn) {
                  turns[turns.length - 1] = {
                    ...lastTurn,
                    id: turnId,
                    isStreaming: false,
                    diffs: data.diffs || [],
                    suggestedActions: data.suggestedActions || [],
                    mechanics: data.mechanics || lastTurn.mechanics,
                  };
                }
                return {
                  ...prev,
                  turns,
                  character: data.updatedCharacter
                    ? { ...prev.character, ...data.updatedCharacter }
                    : prev.character,
                  world: data.updatedWorld
                    ? { ...prev.world, ...data.updatedWorld }
                    : prev.world,
                };
              });

              if (data.diffs?.length > 0) {
                setDiffLog((prev) => [...prev, ...data.diffs]);
              }
            }

            if (data.error) {
              throw new Error(data.error);
            }
          }
        }
      }

      setTurnStatus("idle");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        console.log("Turn cancelled by user");
        setTurnStatus("idle");
      } else {
        console.error("Turn processing failed:", error);
        setTurnStatus("error");
      }
    }
  };

  // 2. Player Input Handler
  const handlePlayerInput = (input: string) => {
    // Add User Turn Immediately (Optimistic)
    const userTurn: Turn = {
      id: `t-${Date.now()}-user`,
      timestamp: Date.now(),
      playerAction: input,
      narration: "",
      isStreaming: true,
      suggestedActions: [],
      diffs: [],
    };

    setGameState((prev) => ({ ...prev, turns: [...prev.turns, userTurn] }));
    setLastInput(input);

    // Start processing
    processTurn(input);
  };

  // 3. Retry Handler
  const handleRetry = () => {
    if (lastInput) {
      setTurnStatus("processing"); // Immediately show loading state
      processTurn(lastInput);
    } else {
      setTurnStatus("idle");
    }
  };

  // 4. Cancel Handler
  const handleCancel = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };

  const handleRoll = async (turnId: string) => {
    // Find the turn to get the player action
    const turn = gameState.turns.find((t) => t.id === turnId);
    if (!turn) return;

    // Mark turn as streaming while we process
    setGameState((prev) => ({
      ...prev,
      turns: prev.turns.map((t) =>
        t.id === turnId ? { ...t, isStreaming: true } : t
      ),
    }));

    // Process the roll with streaming
    await processTurn(turn.playerAction, turnId);
  };

  const handleTravel = (location: MapLocation) => {
    // 1. Update World Context
    setGameState((prev) => ({
      ...prev,
      world: {
        ...prev.world,
        poi: location.name,
        region: location.region || prev.world.region,
        description: location.description,
      },
    }));

    // 2. Add Narrative Turn
    const travelTurn: Turn = {
      id: `t-${Date.now()}-travel`,
      timestamp: Date.now(),
      playerAction: `Travel to ${location.name}`,
      narration: `You gather your supplies and set out for ${location.name}. The journey takes you through the ${location.region}. ${location.description}`,
      isStreaming: false,
      suggestedActions: ["Look for shelter", "Scout the area", "Check map"],
      diffs: [
        { type: "world", text: "Location Updated", value: location.name },
      ],
    };

    setGameState((prev) => ({ ...prev, turns: [...prev.turns, travelTurn] }));

    // 3. Switch View
    setView("game");
    setMobileTab("play");
  };

  const handleViewLore = (locationName: string) => {
    setCodexSearchTerm(locationName);
    setView("codex");
    setMobileTab("codex");
  };

  // Mobile Nav Handler to switch views or tabs
  const handleMobileNav = (tab: MobileTab) => {
    setMobileTab(tab);
    if (tab === "map") setView("map");
    if (tab === "codex") setView("codex");
    if (tab === "play" || tab === "sheet") setView("game");
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-parchment-300 text-ink overflow-hidden transition-colors duration-500">
      <Header
        view={view}
        setView={setView}
        theme={theme}
        toggleTheme={toggleTheme}
        onOpenProfile={handleOpenProfile}
        character={gameState.character}
        world={gameState.world}
        onTrace={view === "game" ? () => setShowTrace(true) : undefined}
      />

      <main className="flex-1 overflow-hidden relative flex flex-col">
        {/* Loading State */}
        {(isLoading || authLoading) && view !== "landing" && (
          <div className="absolute inset-0 bg-parchment-300 flex items-center justify-center z-50">
            <div className="flex flex-col items-center gap-4">
              <Loader2 size={48} className="text-burgundy animate-spin" />
              <span className="text-ink font-serif text-lg">
                Loading your adventure...
              </span>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && !isLoading && (
          <div className="absolute inset-0 bg-parchment-300 flex items-center justify-center z-50">
            <div className="flex flex-col items-center gap-6 max-w-md text-center p-8 bg-parchment-200 rounded-lg shadow-lg border border-parchment-800">
              <div className="w-16 h-16 rounded-full bg-burgundy/10 flex items-center justify-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-8 w-8 text-burgundy"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
              <div>
                <h2 className="text-burgundy text-xl font-serif mb-2">
                  Unable to Load Character
                </h2>
                <p className="text-ink-light text-sm">{error}</p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setError(null);
                    loadCharacter();
                  }}
                  className="px-6 py-2 bg-burgundy text-btn-text font-display rounded-sm shadow hover:bg-burgundy-dim transition-colors flex items-center gap-2"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                  Try Again
                </button>
                <button
                  onClick={() => {
                    setError(null);
                    setView("landing");
                  }}
                  className="px-6 py-2 bg-parchment-400 text-ink font-display rounded-sm shadow hover:bg-parchment-500 transition-colors"
                >
                  Go Back
                </button>
              </div>
            </div>
          </div>
        )}

        {view === "landing" && (
          <LandingPage
            onStart={handleStartGame}
            theme={theme}
            toggleTheme={toggleTheme}
            lang={lang}
            setLang={setLang}
            onProfile={handleOpenProfile}
          />
        )}

        {view === "creation" && (
          <CharacterCreation onComplete={handleCharacterComplete} />
        )}

        {view === "profile" && (
          <ProfilePage
            onBack={handleCloseProfile}
            onResume={handleResumeGame}
            theme={theme}
            toggleTheme={toggleTheme}
            character={gameState.character}
            quests={gameState.quests}
            npcs={gameState.npcs}
            sessions={gameState.sessions}
            locations={USE_MOCK_DATA ? MOCK_MAP_LOCATIONS : []}
            world={gameState.world}
          />
        )}

        {view === "map" && (
          <MapPage onTravel={handleTravel} onViewLore={handleViewLore} />
        )}

        {view === "codex" && <CodexPage initialSearchTerm={codexSearchTerm} />}

        {view === "game" && (
          <div className="flex-1 grid grid-cols-1 md:grid-cols-[320px_1fr_320px] bg-parchment-300 h-full overflow-hidden">
            {/* Left Side (Hero's Ledger) */}
            <div
              className={`${
                mobileTab === "sheet" ? "block" : "hidden"
              } md:block h-full relative z-10 border-r-2 border-parchment-800 shadow-[2px_0_10px_rgba(0,0,0,0.1)] transition-colors duration-300 overflow-hidden`}
            >
              <LeftColumn
                character={gameState.character}
                quests={gameState.quests}
                npcs={gameState.npcs}
                onCharacterUpdate={handleCharacterUpdate}
              />
            </div>

            {/* Center Column (Story) */}
            <div
              className={`${
                mobileTab === "play" ? "block" : "hidden"
              } md:block h-full relative z-0 overflow-hidden`}
            >
              <CenterColumn
                world={gameState.world}
                turns={gameState.turns}
                onSendTurn={handlePlayerInput}
                turnStatus={turnStatus}
                onRoll={handleRoll}
                onCancel={handleCancel}
                onRetry={handleRetry}
              />
            </div>

            {/* Right Side (World Memory) */}
            <div
              className={`${
                mobileTab === "map" || mobileTab === "codex"
                  ? "block"
                  : "hidden"
              } md:block h-full relative z-10 border-l-2 border-parchment-800 shadow-[-2px_0_10px_rgba(0,0,0,0.1)] transition-colors duration-300 overflow-hidden`}
            >
              {/* On Desktop: Show World Memory. On Mobile: Show Map/Codex if selected */}
              <div className="md:block hidden h-full">
                <RightColumn
                  world={gameState.world}
                  diffs={diffLog}
                  npcs={gameState.npcs}
                />
              </div>
              <div className="md:hidden h-full">
                {mobileTab === "map" && (
                  <MapPage
                    onTravel={handleTravel}
                    onViewLore={handleViewLore}
                  />
                )}
                {mobileTab === "codex" && (
                  <CodexPage initialSearchTerm={codexSearchTerm} />
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Mobile Game Nav (4 Tabs) */}
      {view === "game" && (
        <nav className="md:hidden h-16 bg-parchment-200 border-t-2 border-parchment-800 flex justify-around items-center shrink-0 z-50 shadow-[0_-5px_15px_rgba(0,0,0,0.1)] transition-colors duration-300">
          <button
            onClick={() => handleMobileNav("sheet")}
            className={`flex flex-col items-center gap-1 w-16 ${
              mobileTab === "sheet"
                ? "text-burgundy scale-110 font-bold"
                : "text-ink-faint"
            }`}
          >
            <User size={20} />
            <span className="text-[10px] font-small-caps">Hero</span>
          </button>
          <button
            onClick={() => handleMobileNav("play")}
            className={`flex flex-col items-center gap-1 w-16 ${
              mobileTab === "play"
                ? "text-burgundy scale-110 font-bold"
                : "text-ink-faint"
            }`}
          >
            <BookOpen size={20} />
            <span className="text-[10px] font-small-caps">Play</span>
          </button>
          <button
            onClick={() => handleMobileNav("map")}
            className={`flex flex-col items-center gap-1 w-16 ${
              mobileTab === "map"
                ? "text-burgundy scale-110 font-bold"
                : "text-ink-faint"
            }`}
          >
            <MapIcon size={20} />
            <span className="text-[10px] font-small-caps">Map</span>
          </button>
          <button
            onClick={() => handleMobileNav("codex")}
            className={`flex flex-col items-center gap-1 w-16 ${
              mobileTab === "codex"
                ? "text-burgundy scale-110 font-bold"
                : "text-ink-faint"
            }`}
          >
            <Book size={20} />
            <span className="text-[10px] font-small-caps">Codex</span>
          </button>
        </nav>
      )}

      {/* Trace Modal */}
      <TurnTrace isOpen={showTrace} onClose={() => setShowTrace(false)} />
    </div>
  );
}
