import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

const ADMIN_EMAIL = Deno.env.get("ADMIN_EMAIL") || "admin@taurosbarberia.com"
const ADMIN_PASSWORD = Deno.env.get("ADMIN_PASSWORD") || "tauros2024secure"

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const { password } = await req.json()

    if (!password) {
      return new Response(
        JSON.stringify({ error: "Password requerida" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      )
    }

    // Verificar contraseña
    if (password !== ADMIN_PASSWORD) {
      return new Response(
        JSON.stringify({ error: "Contraseña incorrecta" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
      )
    }

    // Crear token JWT simple
    const token = btoa(JSON.stringify({ 
      role: "admin", 
      exp: Date.now() + 3600000 // 1 hora
    }))

    return new Response(
      JSON.stringify({ success: true, token }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    )
  }
})