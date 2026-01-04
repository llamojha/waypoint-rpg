import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { MapLocation } from "@/types";

/**
 * GET /api/locations?character_id=xxx
 * Load locations with discovery status for a character
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const characterId = searchParams.get("character_id");

    if (!characterId) {
      return NextResponse.json(
        { error: "character_id is required" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Fetch all locations with character's discovery status
    const { data: locations, error: locError } = await supabase
      .from("waypoint_locations")
      .select("*");

    if (locError) {
      console.error("Error loading locations:", locError);
      return NextResponse.json(
        { error: "Failed to load locations" },
        { status: 500 }
      );
    }

    // Fetch character's discovered locations
    const { data: discovered } = await supabase
      .from("waypoint_character_locations")
      .select("location_id, status")
      .eq("character_id", characterId);

    const discoveryMap = new Map(
      (discovered || []).map((d) => [d.location_id, d.status])
    );

    // Transform to MapLocation type
    const mapLocations: MapLocation[] = (locations || []).map((loc) => ({
      id: loc.id,
      name: loc.name,
      type: loc.type || "unknown",
      region: loc.region || "",
      coordinates: (loc.coordinates as { x: number; y: number }) || { x: 50, y: 50 },
      description: loc.description || "",
      status: (discoveryMap.get(loc.id) as MapLocation["status"]) || "unknown",
      artUrl: loc.art_url || undefined,
    }));

    return NextResponse.json({ locations: mapLocations });
  } catch (error) {
    console.error("Location loading error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
