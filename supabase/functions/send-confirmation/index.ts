import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

// Lee la API Key de Resend desde las variables de entorno
const RESEND_KEY = Deno.env.get("RESEND_API_KEY")

// Headers CORS para permitir peticiones desde cualquier origen
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

serve(async (req) => {
  // Responde a preflight CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  // Recibe los datos de la cita desde el cliente
  const { cliente_email, cliente_nombre, barbero_nombre, fecha, hora, codigo } = await req.json()

  // Envía el correo usando la API de Resend
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${RESEND_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from: "Tauro's Barbería <onboarding@resend.dev>",
      to: cliente_email,
      subject: "Cita confirmada en Tauro's Barbería",
      html: `
        <h2>Hola ${cliente_nombre}!</h2>
        <p>Tu cita fue confirmada:</p>
        <p><b>Barbero:</b> ${barbero_nombre}</p>
        <p><b>Fecha:</b> ${fecha}</p>
        <p><b>Hora:</b> ${hora}</p>
        ${codigo ? `<div style="margin:24px 0;padding:20px;background:#fef3c7;border-radius:12px;text-align:center;border:2px dashed #f59e0b"><p style="font-size:0.8rem;color:#92400e;margin:0 0 8px;text-transform:uppercase;letter-spacing:1px">Tu c\u00f3digo de cancelaci\u00f3n</p><p style="font-size:1.8rem;font-weight:700;color:#92400e;letter-spacing:4px;margin:0;font-family:monospace">${codigo}</p><p style="font-size:0.8rem;color:#92400e;margin:8px 0 0">Guarda este c\u00f3digo para cancelar tu cita</p></div>` : ''}
        <p>Te esperamos!</p>
      `
    })
  })

  // Log para debug
  const data = await res.text()
  console.log('Resend status:', res.status, data)

  return new Response(JSON.stringify({ status: res.status, body: data }), { headers: { ...corsHeaders, "Content-Type": "application/json" } })
})