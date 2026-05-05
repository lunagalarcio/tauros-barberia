// ============================================
// CONFIGURACIÓN SUPABASE - Tauros Barbería
// ============================================
// Reemplaza las constantes abaixo con las credenciales de tu proyecto Supabase
// Obténlas en: Supabase Dashboard > Settings > API

const SUPABASE_URL = 'TU_SUPABASE_URL_AQUI';
const SUPABASE_ANON_KEY = 'TU_SUPABASE_ANON_KEY_AQUI';

// Importar cliente Supabase desde CDN
const { createClient } = window.supabaseJs;

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Exponer globalmente para usar en client.js y admin.js
window.supabase = supabase;