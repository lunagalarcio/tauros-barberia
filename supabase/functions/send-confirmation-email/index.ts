const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const emailHtml = (datos) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; background: #1a1a1a; color: #fff; margin: 0; padding: 20px; }
    .container { max-width: 500px; margin: 0 auto; background: #2a2a2a; border-radius: 12px; overflow: hidden; }
    .header { background: linear-gradient(135deg, #c9a050, #f0d78c); padding: 30px; text-align: center; }
    .header h1 { color: #1a1a1a; margin: 0; font-size: 28px; }
    .content { padding: 30px; }
    .detail { display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #444; }
    .detail span:first-child { color: #888; }
    .detail span:last-child { font-weight: bold; color: #c9a050; }
    .footer { background: #222; padding: 20px; text-align: center; font-size: 12px; color: #666; }
    .icon { width: 60px; height: 60px; background: #c9a050; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 30px; margin-bottom: 15px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="icon">✂️</div>
      <h1>¡Cita Confirmada!</h1>
    </div>
    <div class="content">
      <p style="color: #888; margin-top: 0;">Hola <strong>${datos.cliente_nombre}</strong>, tu cita ha sido confirmada exitosamente.</p>
      <div class="detail">
        <span>Barbero</span>
        <span>${datos.barbero_nombre}</span>
      </div>
      <div class="detail">
        <span>Fecha</span>
        <span>${datos.fecha_formato}</span>
      </div>
      <div class="detail">
        <span>Hora</span>
        <span>${datos.hora_inicio}</span>
      </div>
      <div class="detail">
        <span>Contacto</span>
        <span>${datos.cliente_contacto}</span>
      </div>
      <p style="margin-top: 25px; color: #c9a050; text-align: center;">
        <strong>💈 Recuerda llegar 5 minutos antes</strong>
      </p>
    </div>
    <div class="footer">
      Tauros Barbería | Sistema de Citas
    </div>
  </div>
</body>
</html>
`;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { cliente_email, cliente_nombre, barbero_nombre, fecha, hora_inicio, cliente_contacto } = await req.json();

    const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    const fechaObj = new Date(fecha + 'T00:00:00');
    const fechaFormateada = `${fechaObj.getDate()} de ${meses[fechaObj.getMonth()]} del ${fechaObj.getFullYear()}`;

    const datos = {
      cliente_nombre,
      cliente_email,
      barbero_nombre,
      fecha,
      fecha_formato: fechaFormateada,
      hora_inicio,
      cliente_contacto
    };

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${RESEND_API_KEY}`
      },
      body: JSON.stringify({
        from: "Tauros Barbería <onboarding@resend.dev>",
        to: cliente_email,
        subject: "✓ Confirmación de tu cita - Tauros Barbería",
        html: emailHtml(datos)
      })
    });

    if (!res.ok) {
      const error = await res.text();
      console.error("Error Resend:", error);
      return new Response(JSON.stringify({ error }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const result = await res.json();
    return new Response(JSON.stringify({ success: true, id: result.id }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (error) {
    console.error("Error general:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});