#!/usr/bin/env npx tsx
/**
 * Seed Content Script
 * 
 * Inserts generated content from data/generated/ into Supabase.
 * Usage: npx tsx scripts/seed-content.ts [--dry-run] [--type npc|location|quest|codex|news]
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";
import type { Database, Json } from "../lib/supabase/database.types";

const GENERATED_DIR = path.join(process.cwd(), "data/generated");

// Initialize Supabase client
function getSupabaseClient(): SupabaseClient<Database> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  
  if (!url || !key) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_KEY");
    process.exit(1);
  }
  
  return createClient<Database>(url, key);
}

// Content type handlers
type ContentType = "npc" | "location" | "quest" | "codex" | "news";

interface SeedResult {
  file: string;
  type: ContentType;
  success: boolean;
  error?: string;
}

async function seedNpc(supabase: SupabaseClient<Database>, data: Record<string, unknown>): Promise<void> {
  const { error } = await supabase.from("waypoint_npcs").insert({
    name: data.name as string,
    role: data.role as string | null,
    location: data.location as string | null,
    personality: data.personality as Json | null,
    dialogue_hints: data.dialogueHints as Json | null,
    portrait_url: (data.portraitUrl as string) || null,
    is_preseeded: true,
  });
  if (error) throw error;
}

async function seedLocation(supabase: SupabaseClient<Database>, data: Record<string, unknown>): Promise<void> {
  const { error } = await supabase.from("waypoint_locations").insert({
    name: data.name as string,
    type: data.type as string | null,
    region: data.region as string | null,
    description: data.description as string | null,
    coordinates: data.coordinates as Json | null,
    art_url: (data.artUrl as string) || null,
    is_preseeded: true,
  });
  if (error) throw error;
}

async function seedQuest(supabase: SupabaseClient<Database>, data: Record<string, unknown>): Promise<void> {
  const { error } = await supabase.from("waypoint_quests").insert({
    title: data.title as string,
    description: data.description as string | null,
    total_progress: data.totalProgress as number | null,
    leads: data.leads as Json | null,
    is_preseeded: true,
  });
  if (error) throw error;
}

async function seedCodex(supabase: SupabaseClient<Database>, data: Record<string, unknown>): Promise<void> {
  const { error } = await supabase.from("waypoint_codex_entries").insert({
    title: data.title as string,
    category: data.category as string,
    text: data.text as string | null,
    status: data.status as string | null,
    tags: data.tags as Json | null,
    image_url: (data.imageUrl as string) || null,
  });
  if (error) throw error;
}

async function seedNews(supabase: SupabaseClient<Database>, data: Record<string, unknown>): Promise<void> {
  const { error } = await supabase.from("waypoint_world_news").insert({
    title: data.title as string,
    text: data.text as string | null,
    news_type: data.newsType as string | null,
    status: data.status as string | null,
    related_entity_type: (data.relatedEntityType as string) || null,
    related_entity_id: (data.relatedEntityId as string) || null,
  });
  if (error) throw error;
}

const seeders: Record<ContentType, (supabase: SupabaseClient<Database>, data: Record<string, unknown>) => Promise<void>> = {
  npc: seedNpc,
  location: seedLocation,
  quest: seedQuest,
  codex: seedCodex,
  news: seedNews,
};

function getContentType(filename: string): ContentType | null {
  const prefix = filename.split("-")[0];
  if (prefix in seeders) return prefix as ContentType;
  return null;
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const typeFilter = args.find(a => a.startsWith("--type="))?.split("=")[1] as ContentType | undefined;
  
  console.log(`\n📦 Waypoint Content Seeder`);
  console.log(`   Directory: ${GENERATED_DIR}`);
  if (dryRun) console.log(`   Mode: DRY RUN (no changes will be made)`);
  if (typeFilter) console.log(`   Filter: ${typeFilter} only`);
  console.log("");
  
  // Check directory exists
  if (!fs.existsSync(GENERATED_DIR)) {
    console.log("No data/generated/ directory found. Nothing to seed.");
    return;
  }
  
  // Get all JSON files
  const files = fs.readdirSync(GENERATED_DIR).filter(f => f.endsWith(".json"));
  if (files.length === 0) {
    console.log("No JSON files found in data/generated/");
    return;
  }
  
  const supabase = dryRun ? null : getSupabaseClient();
  const results: SeedResult[] = [];
  
  for (const file of files) {
    const contentType = getContentType(file);
    
    if (!contentType) {
      console.log(`⏭️  Skipping ${file} (unknown type)`);
      continue;
    }
    
    if (typeFilter && contentType !== typeFilter) {
      continue;
    }
    
    const filePath = path.join(GENERATED_DIR, file);
    
    try {
      const content = JSON.parse(fs.readFileSync(filePath, "utf-8"));
      
      if (dryRun) {
        console.log(`✓ Would seed ${contentType}: ${content.name || content.title}`);
        results.push({ file, type: contentType, success: true });
      } else {
        await seeders[contentType](supabase!, content);
        console.log(`✅ Seeded ${contentType}: ${content.name || content.title}`);
        results.push({ file, type: contentType, success: true });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.log(`❌ Failed ${file}: ${message}`);
      results.push({ file, type: contentType, success: false, error: message });
    }
  }
  
  // Summary
  const succeeded = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  
  console.log(`\n📊 Summary: ${succeeded} succeeded, ${failed} failed`);
  
  if (failed > 0) {
    process.exit(1);
  }
}

main().catch(console.error);
