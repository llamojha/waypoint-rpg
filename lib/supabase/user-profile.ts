import { createClient } from "@/lib/supabase/client";

export type UserTier = "waitlist" | "free" | "paid";

export interface UserProfile {
  user_id: string;
  tier: UserTier;
  credits: number;
  created_at: string;
  updated_at: string;
}

export async function getUserProfile(): Promise<UserProfile | null> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) return null;

  const { data, error } = await supabase
    .from("waypoint_user_profiles")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (error || !data) return null;
  
  return data as UserProfile;
}

export function isWaitlistMode(): boolean {
  return process.env.NEXT_PUBLIC_WAITLIST_MODE === "true";
}

export async function canUserPlay(): Promise<{ allowed: boolean; reason?: string }> {
  if (!isWaitlistMode()) {
    return { allowed: true };
  }

  const profile = await getUserProfile();
  
  if (!profile) {
    return { allowed: false, reason: "not_authenticated" };
  }

  if (profile.tier === "waitlist") {
    return { allowed: false, reason: "waitlist" };
  }

  return { allowed: true };
}
