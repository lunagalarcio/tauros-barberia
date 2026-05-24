import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const RESEND_KEY = Deno.env.get("RESEND_API_KEY")

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  const { cliente_email, cliente_nombre, barbero_nombre, fecha, hora } = await req.json()

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
        <p>Te esperamos!</p>
      `
    })
  })

  const data = await res.json()
  return new Response(JSON.stringify(data), { headers: { ...corsHeaders, "Content-Type": "application/json" } })
})
