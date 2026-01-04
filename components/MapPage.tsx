"use client";

import React, { useState } from "react";
import { MapLocation } from "@/types";
import {
  MapPin,
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
    <div className="h-full w-full bg-parchment-300 relative overflow-hidden flex items-center justify-center panel-texture select-none p-4">
      {/* Map Image - responsive, always shows full image */}
      <img
        src="/map01.png"
        alt="World Map"
        className="max-w-full max-h-full object-contain border-[12px] border-parchment-800 rounded-sm shadow-2xl"
      />

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
