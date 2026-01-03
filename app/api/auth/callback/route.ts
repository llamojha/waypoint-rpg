import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import type { ResponseCookie } from "next/dist/compiled/@edge-runtime/cookies";
import { getAuthErrorMessage } from "@/lib/auth/error-utils";

type CookieToSet = {
  name: string;
  value: string;
  options?: Partial<ResponseCookie>;
};

/**
 * GET /api/auth/callback
 * Handles OAuth code exchange and Magic Link token verification
 * Requirements: 7.1, 7.2, 7.3, 7.4
 */
export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const error = requestUrl.searchParams.get("error");
  const errorDescription = requestUrl.searchParams.get("error_description");
  const origin = requestUrl.origin;

  // Handle error parameters from OAuth/Magic Link (Requirement 7.3)
  if (error) {
    const errorMessage = getAuthErrorMessage(errorDescription || error);
    return NextResponse.redirect(
      `${origin}/?error=${encodeURIComponent(errorMessage)}`
    );
  }

  // If no code provided, redirect with error
  if (!code) {
    return NextResponse.redirect(
      `${origin}/?error=${encodeURIComponent(
        "Authentication failed. Please try again."
      )}`
    );
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.redirect(
      `${origin}/?error=${encodeURIComponent(
        "Server configuration error. Please try again later."
      )}`
    );
  }

  const cookieStore = await cookies();

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: CookieToSet[]) {
        cookiesToSet.forEach(({ name, value, options }) => {
          cookieStore.set(name, value, options);
        });
      },
    },
  });

  try {
    // Exchange code for session (Requirements 7.1, 7.2)
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(
      code
    );

    if (exchangeError) {
      const errorMessage = getAuthErrorMessage(exchangeError);
      return NextResponse.redirect(
        `${origin}/?error=${encodeURIComponent(errorMessage)}`
      );
    }

    // Get the authenticated user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.redirect(
        `${origin}/?error=${encodeURIComponent(
          "Failed to retrieve user information. Please try again."
        )}`
      );
    }

    // Check if user has an existing character (Requirement 7.4)
    const { data: character, error: characterError } = await supabase
      .from("waypoint_characters")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (characterError) {
      // Log error but don't expose details to user
      console.error("Error checking character existence:", characterError);
    }

    // Redirect based on character existence (Requirement 7.4)
    if (character) {
      // User has a character, redirect to game
      return NextResponse.redirect(`${origin}/?view=game`);
    } else {
      // No character, redirect to character creation
      return NextResponse.redirect(`${origin}/?view=creation`);
    }
  } catch (err) {
    console.error("Auth callback error:", err);
    return NextResponse.redirect(
      `${origin}/?error=${encodeURIComponent(
        "An unexpected error occurred. Please try again."
      )}`
    );
  }
}
