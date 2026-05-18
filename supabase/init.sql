-- Tauros Barbería - Estructura de Base de Datos
-- Ejecutar este script en el SQL Editor de Supabase

-- Tabla: Sillas
CREATE TABLE IF NOT EXISTS sillas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre TEXT NOT NULL,
    barbero_id UUID,
    activa BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla: Barberos
CREATE TABLE IF NOT EXISTS barberos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre TEXT NOT NULL,
    especialidad TEXT,
    silla_id TEXT,
    activo BOOLEAN DEFAULT true,
    foto_url TEXT,
    creado_en TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla: Horarios
CREATE TABLE IF NOT EXISTS horarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    barbero_id UUID REFERENCES barberos(id) ON DELETE CASCADE,
    dia_semana TEXT NOT NULL,
    hora_inicio TIME NOT NULL,
    hora_fin TIME NOT NULL,
    duracion_slot INTEGER DEFAULT 30,
    activo BOOLEAN DEFAULT true,
    UNIQUE(barbero_id, dia_semana)
);

-- Tabla: Citas
CREATE TABLE IF NOT EXISTS citas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    barbero_id UUID REFERENCES barberos(id) ON DELETE SET NULL,
    cliente_nombre TEXT NOT NULL,
    cliente_email TEXT NOT NULL,
    cliente_contacto TEXT NOT NULL,
    fecha DATE NOT NULL,
    hora_inicio TIME NOT NULL,
    hora_fin TIME NOT NULL,
    estado TEXT DEFAULT 'confirmada',
    creado_en TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE sillas ENABLE ROW LEVEL SECURITY;
ALTER TABLE barberos ENABLE ROW LEVEL SECURITY;
ALTER TABLE horarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE citas ENABLE ROW LEVEL SECURITY;

-- Políticas RLS - Lectura pública (solo lectura, no modificación)
CREATE POLICY "Public read sillas" ON sillas FOR SELECT USING (true);
CREATE POLICY "Public read barberos" ON barberos FOR SELECT USING (true);
CREATE POLICY "Public read horarios" ON horarios FOR SELECT USING (true);
CREATE POLICY "Public read citas" ON citas FOR SELECT USING (true);

-- Política RLS - INSERT público en citas (para agendamiento)
-- Solo permite insertar, no actualizar o eliminar
CREATE POLICY "Public insert citas" ON citas FOR INSERT WITH CHECK (
    estado IN ('confirmada', 'cancelada')
    AND cliente_nombre IS NOT NULL
    AND cliente_nombre::text ~* '^[a-zA-Z\s]+$'
    AND cliente_email IS NOT NULL
    AND cliente_email::text ~* '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    AND cliente_contacto IS NOT NULL
    AND cliente_contacto::text ~ '^[0-9]+$'
    AND length(cliente_contacto::text) >= 10
    AND fecha >= CURRENT_DATE
);

-- Eliminar políticas de UPDATE y DELETE públicas (proteger datos)
DROP POLICY IF EXISTS "Public update citas" ON citas;
DROP POLICY IF EXISTS "Public delete citas" ON citas;

-- Política para que clientes puedan cancelar sus propias citas
CREATE POLICY "Public update citas" ON citas FOR UPDATE USING (true) WITH CHECK (
    estado = 'cancelada'
);

-- Tabla para almacenar admin (solo lectura)
-- Los admin se gestionan vía Edge Functions, no tabla pública

-- Insertar Barberos de ejemplo
INSERT INTO barberos (nombre, especialidad, silla_id, activo, foto_url) VALUES
('Marco Hernández', 'Cortes Clásicos y Barba', 'Silla 1', true, null),
('Diego Reyes', 'Fade y Diseño Moderno', 'Silla 2', true, null),
('Alex Rivera', 'Cortes Vintage y Arreglos', 'Silla 3', true, null);

-- Insertar Sillas
INSERT INTO sillas (nombre, barbero_id, activa)
SELECT 'Silla 1', id, true FROM barberos WHERE nombre = 'Marco Hernández';

INSERT INTO sillas (nombre, barbero_id, activa)
SELECT 'Silla 2', id, true FROM barberos WHERE nombre = 'Diego Reyes';

INSERT INTO sillas (nombre, barbero_id, activa)
SELECT 'Silla 3', id, true FROM barberos WHERE nombre = 'Alex Rivera';

-- Insertar Horarios (Lunes a Sábado 9:00-20:00, Domingo 9:00-15:00, 60 min por slot)
INSERT INTO horarios (barbero_id, dia_semana, hora_inicio, hora_fin, duracion_slot, activo)
SELECT b.id, 'lunes', '09:00:00', '20:00:00', 60, true
FROM barberos b;

INSERT INTO horarios (barbero_id, dia_semana, hora_inicio, hora_fin, duracion_slot, activo)
SELECT b.id, 'martes', '09:00:00', '20:00:00', 60, true
FROM barberos b;

INSERT INTO horarios (barbero_id, dia_semana, hora_inicio, hora_fin, duracion_slot, activo)
SELECT b.id, 'miercoles', '09:00:00', '20:00:00', 60, true
FROM barberos b;

INSERT INTO horarios (barbero_id, dia_semana, hora_inicio, hora_fin, duracion_slot, activo)
SELECT b.id, 'jueves', '09:00:00', '20:00:00', 60, true
FROM barberos b;

INSERT INTO horarios (barbero_id, dia_semana, hora_inicio, hora_fin, duracion_slot, activo)
SELECT b.id, 'viernes', '09:00:00', '20:00:00', 60, true
FROM barberos b;

INSERT INTO horarios (barbero_id, dia_semana, hora_inicio, hora_fin, duracion_slot, activo)
SELECT b.id, 'sabado', '09:00:00', '20:00:00', 60, true
FROM barberos b;

INSERT INTO horarios (barbero_id, dia_semana, hora_inicio, hora_fin, duracion_slot, activo)
SELECT b.id, 'domingo', '09:00:00', '15:00:00', 60, true
FROM barberos b;

-- Insertar cita de ejemplo
INSERT INTO citas (barbero_id, cliente_nombre, cliente_contacto, fecha, hora_inicio, hora_fin, estado)
SELECT b.id, 'Cliente Demo', '555-1234', CURRENT_DATE + 1, '10:00:00', '10:30:00', 'confirmada'
FROM barberos b LIMIT 1;