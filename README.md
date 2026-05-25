# Tauro's Barbería - Sistema de Citas

Sistema de agendamiento de citas para barbería con panel de administración, estadísticas y cancelación por código.

## Estructura del Proyecto

```
tauros-barberia/
├── index.html              # Página principal del cliente
├── admin.html              # Panel de administración
├── js/
│   ├── supabase.js         # Configuración de Supabase
│   ├── client.js           # Lógica del lado del cliente
│   └── admin.js            # Lógica del panel admin
├── css/
│   └── styles.css          # Estilos globales
├── supabase/
│   ├── init.sql            # Script de base de datos
│   └── functions/
│       └── send-confirmation/
│           └── index.ts    # Edge Function para enviar correos
└── images/                 # Imágenes del sitio
```

## Características

- **Agendamiento de citas** en 4 pasos (barbero, fecha, hora, formulario)
- **Selección de barberos** con fotos y especialidades
- **Calendario interactivo** para elegir fecha
- **Slots de horario** con verificación en tiempo real
- **Código único de cancelación** (ej: `TAU-A3F8`) para cancelar sin login
- **Confirmación por correo** mediante Resend (Edge Function)
- **Panel admin** con gestión de barberos, horarios y citas
- **Estadísticas** en el admin (barbero más solicitado, días concurridos, horas pico)
- **Bloqueo de horas pasadas** si se agenda el mismo día

## Configuración de Supabase

### 1. Crear Proyecto

1. Ve a [supabase.com](https://supabase.com) e inicia sesión
2. Crea un nuevo proyecto: "Tauros Barbería"
3. Establece una contraseña segura para la base de datos
4. Espera a que se aprovisione el proyecto

### 2. Ejecutar Script de Base de Datos

1. En el panel de Supabase, ve a **SQL Editor**
2. Copia el contenido de `supabase/init.sql`
3. Pega y ejecuta el script
4. Ejecuta también: `ALTER TABLE citas ADD COLUMN IF NOT EXISTS codigo_cancelacion TEXT UNIQUE;`

### 3. Obtener Credenciales

1. Ve a **Settings > API**
2. Copia el **Project URL** (`https://xxxxx.supabase.co`)
3. Copia la **anon public key**

### 4. Configurar el Cliente

Edita `js/supabase.js` y reemplaza con tus credenciales.

## Confirmación por Correo (Resend)

### 1. Registrarse en Resend
- Ve a [resend.com](https://resend.com) y crea una cuenta
- Ve a **API Keys** y crea una nueva key

### 2. Desplegar Edge Function
```bash
cd supabase
supabase functions deploy send-confirmation
```

### 3. Configurar variable de entorno
En Supabase Dashboard > Edge Functions > `send-confirmation` > Env:
- Key: `RESEND_API_KEY`
- Value: tu API key de Resend

### 4. Verificar dominio (opcional)
Para que los correos lleguen a cualquier destinatario, agrega un dominio en Resend.

## Despliegue en Vercel

### Opción 1: Repositorio Git
1. Sube el proyecto a GitHub
2. Ve a [vercel.com](https://vercel.com) y conecta el repo
3. Vercel detectará automáticamente que es estático
4. Click en **Deploy**

### Opción 2: CLI
```bash
npm i -g vercel
vercel
```

## Uso del Sistema

### Módulo Cliente (index.html)
1. Selecciona un barbero
2. Elige una fecha (días pasados bloqueados)
3. Escoge un horario (horas pasadas bloqueadas si es hoy)
4. Completa el formulario
5. Recibe código de cancelación y correo de confirmación
6. Para cancelar: ingresa el código debajo de los barberos

### Panel Admin (admin.html)
- Accede a `admin.html`
- Contraseña: `tauros2024secure`
- **Barberos**: CRUD completo, activar/desactivar
- **Horarios**: Configurar por día para cada barbero
- **Citas**: Ver todas con filtros por fecha y barbero
- **Estadísticas**: Barbero más solicitado, días y horas pico, citas por mes

## Tecnologías Usadas
- **Frontend**: HTML5, CSS3, JavaScript ES6+
- **Backend**: Supabase (PostgreSQL + API REST + Edge Functions)
- **Correo**: Resend API
- **Iconos**: Font Awesome 6
- **Fuentes**: Playfair Display + Poppins (Google Fonts)
- **Despliegue**: Vercel
