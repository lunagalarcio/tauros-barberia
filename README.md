# Tauros Barbería - Sistema de Citas

Sistema de agendamiento de citas para barbería con panel de administración.

## Estructura del Proyecto

```
tauros-barberia/
├── index.html        # Página del cliente
├── admin.html        # Panel de administración
├── js/
│   ├── supabase.js   # Configuración de Supabase
│   ├── client.js     # Lógica del módulo cliente
│   └── admin.js      # Lógica del panel admin
├── css/
│   └── styles.css    # Estilos globales
└── supabase/
    └── init.sql      # Script de base de datos
```

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
4. Verifica que se crearon las tablas y datos de ejemplo

### 3. Obtener Credenciales

1. Ve a **Settings** (icono de engranaje) > **API**
2. Copia el **Project URL** (algo como `https://xxxxx.supabase.co`)
3. Copia la **anon public key** (emma bajo "Project API keys")

### 4. Configurar el Cliente

Edita `js/supabase.js` y reemplaza:

```javascript
const SUPABASE_URL = 'TU_SUPABASE_URL_AQUI';
const SUPABASE_ANON_KEY = 'TU_SUPABASE_ANON_KEY_AQUI';
```

Con los valores que copiaste:

```javascript
const SUPABASE_URL = 'https://xxxxx.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';
```

## Despliegue en Vercel

### Opción 1: Despliegue Rápido (Recomendado)

1. Ve a [vercel.com](https://vercel.com) e inicia sesión
2. Clic en **Add New...** > **Project**
3. Importa tu repositorio de GitHub o arrastra la carpeta `tauros-barberia`
4. Vercel detectará automáticamente que es un sitio estático
5. Clic en **Deploy**

### Opción 2: Despliegue Manual

1. Instala Vercel CLI: `npm i -g vercel`
2. En la carpeta del proyecto: `vercel`
3. Sigue las instrucciones en pantalla

## Uso del Sistema

### Módulo Cliente (index.html)

1. Abre la página y selecciona un barbero de las tarjetas
2. Elige una fecha del calendario
3. Selecciona un horario disponible (los ocupados aparecen en gris)
4. Completa el formulario con nombre y contacto
5. Recibe la confirmación de tu cita

### Panel Admin (admin.html)

1. Accede a `admin.html`
2. Contraseña: `tauros2024`
3. **Barberos**: Agregar, editar, activar/desactivar
4. **Horarios**: Configurar horarios por día para cada barbero
5. **Citas**: Ver todas las citas con filtros por fecha y barbero

## Notas Importantes

- El sistema incluye verificación de disponibilidad para evitar doble reservas
- Los horarios de atención son de 9:00 a 18:00, de lunes a sábado
- Los datos de ejemplo incluyen 3 barberos con horarios configurados
- El panel admin usa autenticación simple (sessionStorage)

## Tecnologías Usadas

- **Frontend**: HTML5, CSS3, JavaScript ES6+
- **CSS**: TailwindCSS (CDN) + estilos personalizados
- **Backend**: Supabase (PostgreSQL + API REST)
- **Iconos**: Font Awesome 6
- **Fuentes**: Playfair Display + Poppins (Google Fonts)
- **Despliegue**: Vercel (estático)

## Admin
- **Password**: tauros2024