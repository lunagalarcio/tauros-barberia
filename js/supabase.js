// ============================================
// CONFIGURACIÓN SUPABASE - Tauros Barbería
// ============================================

const SUPABASE_URL = 'https://amhtrwrucsgfbkswhttk.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFtaHRyd3J1Y3NnZmJrc3dodHRrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc4NDQxNjMsImV4cCI6MjA5MzQyMDE2M30.uN-1kwj3H_CmRlB51nOhW_7INMoj0Cq-OlNAjwKMWPY';

if (typeof window.supabaseClient === 'undefined') {
  console.log('Supabase SDK:', window.supabase);
  console.log('SupabaseJs:', window.supabaseJs);
  
  var sdk = window.supabase || window.supabaseJs;
  
  if (sdk && typeof sdk.createClient === 'function') {
    window.supabaseClient = sdk.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.log('Supabase client inicializado');
  } else {
    console.error('SDK no disponible. Verifica la carga del script.');
  }
}