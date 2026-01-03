"use client";

import React, { useState } from "react";
import { MapLocation } from "@/types";
import {
  MapPin,
  Navigation,
  Castle,
  Trees,
  Mountain,
  HelpCircle,
} from "lucide-react";
import { MOCK_MAP_LOCATIONS, USE_MOCK_DATA } from "@/constants";

interface Props {
  locations?: MapLocation[];
  onTravel?: (location: MapLocation) => void;
  onViewLore?: (locationName: string) => void;
}

export const MapPage: React.FC<Props> = ({
  locations,
  onTravel,
  onViewLore,
}) => {
  const [selectedLocation, setSelectedLocation] = useState<MapLocation | null>(
    null
  );

  // Use provided locations, or mock data if enabled, or empty array
  const displayLocations =
    locations ?? (USE_MOCK_DATA ? MOCK_MAP_LOCATIONS : []);

  const getIcon = (type: string) => {
    switch (type) {
      case "city":
        return <Castle size={20} />;
      case "ruin":
        return <HelpCircle size={20} />;
      case "forest":
        return <Trees size={20} />;
      case "mountain":
        return <Mountain size={20} />;
      default:
        return <MapPin size={20} />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "visited":
        return "bg-burgundy text-parchment-100 border-parchment-900";
      case "known":
        return "bg-parchment-200 text-ink border-ink";
      case "locked":
        return "bg-parchment-400 text-ink-faint border-parchment-500";
      default:
        return "bg-parchment-800 text-parchment-100";
    }
  };

  return (
    <div className="h-full w-full bg-parchment-300 relative overflow-hidden flex flex-col items-center justify-center panel-texture select-none">
      {/* Map Container */}
      <div className="relative w-full max-w-5xl aspect-video bg-[#d6cbb1] border-[12px] border-parchment-800 rounded-sm shadow-2xl overflow-hidden m-4 group">
        {/* Map Texture */}
        <div className="absolute inset-0 opacity-40 bg-[url('https://www.transparenttextures.com/patterns/aged-paper.png')] pointer-events-none"></div>
        <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/shattered-island.png')] mix-blend-multiply pointer-events-none scale-150"></div>

        {/* Grid Lines */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "linear-gradient(to right, rgba(0,0,0,0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(0,0,0,0.05) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        ></div>

        {/* Locations */}
        {displayLocations.map((loc) => (
          <button
            key={loc.id}
            onClick={() => setSelectedLocation(loc)}
            className={`absolute transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-1 group/pin transition-all hover:scale-110 z-10`}
            style={{
              top: `${loc.coordinates.y}%`,
              left: `${loc.coordinates.x}%`,
            }}
          >
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center border-2 shadow-md ${getStatusColor(
                loc.status
              )}`}
            >
              {getIcon(loc.type)}
            </div>
            <span
              className={`text-[10px] font-bold font-small-caps uppercase tracking-wide px-2 py-0.5 bg-parchment-100/80 border border-parchment-400 rounded-sm shadow-sm whitespace-nowrap ${
                loc.status === "locked" ? "opacity-50" : ""
              }`}
            >
              {loc.name}
            </span>
          </button>
        ))}

        {/* Current Location Marker (Animated) */}
        <div className="absolute top-[25%] left-[35%] w-12 h-12 border-2 border-burgundy rounded-full animate-ping opacity-20 pointer-events-none"></div>

        {/* Fog of War Overlay */}
        <div className="absolute inset-0 pointer-events-none bg-gradient-to-br from-transparent via-transparent to-parchment-900/40"></div>

        {/* Compass Rose */}
        <div className="absolute bottom-8 right-8 opacity-50 pointer-events-none">
          <div className="w-24 h-24 border-2 border-ink rounded-full flex items-center justify-center relative">
            <div className="absolute top-0 -mt-2 text-xs font-serif font-bold">
              N
            </div>
            <div className="w-16 h-16 border border-ink rotate-45"></div>
          </div>
        </div>
      </div>

      {/* Legend / Info Panel */}
      {selectedLocation && (
        <div className="absolute bottom-10 left-10 w-80 bg-parchment-100 border-2 border-parchment-800 p-4 shadow-xl rounded-sm animate-fade-in z-20">
          <div className="flex justify-between items-start mb-2">
            <h3 className="text-xl font-display text-ink">
              {selectedLocation.name}
            </h3>
            <button
              onClick={() => setSelectedLocation(null)}
              className="text-ink-light hover:text-burgundy font-bold"
            >
              ✕
            </button>
          </div>
          <div className="text-xs font-bold font-small-caps uppercase text-burgundy mb-2 tracking-widest">
            {selectedLocation.region} • {selectedLocation.type}
          </div>
          <p className="font-serif text-ink leading-relaxed mb-4">
            {selectedLocation.description}
          </p>

          <div className="flex gap-2">
            <button
              onClick={() => onTravel && onTravel(selectedLocation)}
              className="flex-1 py-1 bg-parchment-800 text-parchment-100 font-bold uppercase text-xs rounded-sm hover:bg-gold hover:text-ink transition-colors"
            >
              Travel Here
            </button>
            <button
              onClick={() => onViewLore && onViewLore(selectedLocation.name)}
              className="flex-1 py-1 bg-parchment-200 text-ink font-bold uppercase text-xs rounded-sm border border-parchment-400 hover:bg-parchment-300"
            >
              View Lore
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
