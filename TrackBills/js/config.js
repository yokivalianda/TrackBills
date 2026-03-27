/* ─────────────────────────────────────────────
   TAGIHKU — js/config.js
   Supabase client, state global, dan konstanta.
   ───────────────────────────────────────────── */
'use strict';

/* ── SUPABASE CLIENT ── */
const sb = supabase.createClient(
  'https://tfpnjblqllckwijjkdis.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRmcG5qYmxxbGxja3dpamprZGlzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ1NzQzMDAsImV4cCI6MjA5MDE1MDMwMH0.CLU1GMess0TzHFw90d_wFbAr6mrcq3R7DBgdM0BV0FU',
  { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false } }
);

/* ── STATE GLOBAL ── */
const S = {
  user:         null,
  profile:      { name: 'Marketing', role: 'Sales Marketing' },
  transactions: [],
  konsumens:    [],
  filter:       'all',
  photoData:    null,
};

/* ── KONSTANTA ── */
const COLORS = ['#4f8ef7','#6c63ff','#22c55e','#f59e0b','#14b8a6','#ef4444','#ec4899'];
const EMOJIS = ['🏢','🏪','🏭','🏬','👤','👨‍💼','👩‍💼','🤝','💼','🎯'];
