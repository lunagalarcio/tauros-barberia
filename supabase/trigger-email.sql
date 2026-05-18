-- Habilitar extensión pg_net si no existe
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Crear la función que envía el email
CREATE OR REPLACE FUNCTION enviar_email_confirmacion()
RETURNS TRIGGER AS $$
DECLARE
  barbero_nombre TEXT;
  meses TEXT[] := ARRAY['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  fecha_formato TEXT;
  datos JSON;
BEGIN
  SELECT nombre INTO barbero_nombre FROM barberos WHERE id = NEW.barbero_id;

  fecha_formato := EXTRACT(DAY FROM NEW.fecha) || ' de ' || meses[EXTRACT(MONTH FROM NEW.fecha)::INTEGER] || ' del ' || EXTRACT(YEAR FROM NEW.fecha);

  datos := json_build_object(
    'cliente_email', NEW.cliente_email,
    'cliente_nombre', NEW.cliente_nombre,
    'barbero_nombre', COALESCE(barbero_nombre, 'Tu barbero'),
    'fecha', NEW.fecha::TEXT,
    'fecha_formato', fecha_formato,
    'hora_inicio', NEW.hora_inicio::TEXT,
    'cliente_contacto', NEW.cliente_contacto
  );

  PERFORM net.http_post(
    url := 'https://amhtrwrucsgfbkswhttk.supabase.co/functions/v1/send-confirmation-email',
    headers := json_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFtaHRyd3J1Y3NnZmJrc3dodHRrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc4NDQxNjMsImV4cCI6MjA5MzQyMDE2M30.uN-1kwj3H_CmRlB51nOhW_7INMoj0Cq-OlNAjwKMWPY'
    )::jsonb,
    body := datos
  );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Error enviando email: %', SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Crear el trigger
DROP TRIGGER IF EXISTS trigger_enviar_email ON citas;
CREATE TRIGGER trigger_enviar_email
AFTER INSERT ON citas
FOR EACH ROW
EXECUTE FUNCTION enviar_email_confirmacion();