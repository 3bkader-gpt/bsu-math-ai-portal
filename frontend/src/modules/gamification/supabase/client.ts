import { createClient, SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  'https://cjmlnpdtfclzcvehebsv.supabase.co';

const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNqbWxucGR0ZmNsemN2ZWhlYnN2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE4MjUyMDIsImV4cCI6MjEwNzQwMTIwMn0.NipIyq1IfvcjXiI9iL4KjIq-B-OK60AI0guQZz5PB8k';

let supabaseInstance: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (supabaseInstance) return supabaseInstance;

  supabaseInstance = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
      storageKey: 'bsu_portal_supabase_auth',
    },
  });

  return supabaseInstance;
}

export const supabase = getSupabase();
