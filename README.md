# Práctica integradora (Back y Front) · React + Vite + Supabase

Aplicación con **4 módulos** (Clima, Películas, Países y Star Wars) que cumple las instrucciones generales:

| Instrucción | Cómo se cumple |
|---|---|
| 1. Autenticación OAuth | Supabase Auth con **GitHub** y/o **Google** (`frontend/src/context/AuthContext.jsx`). Todas las rutas están protegidas. |
| 2. Obtención de datos públicos | `backend/src/loaders/*`: consulta varios registros, recorre la **paginación** (SWAPI y TMDb) y **maneja errores** (reintentos, tiempo límite, servidor espejo para SWAPI, errores por ciudad en el clima). |
| 3. Persistencia | `supabase/schema.sql`: tablas **normalizadas** (catálogos de regiones, idiomas, monedas, géneros, planetas y condiciones del clima, más tablas puente), llaves primarias y foráneas, `unique` y `check` para la **consistencia**. |
| 4. Proceso de carga | `npm run load` en `backend/`: API pública → Supabase con *upsert* (no duplica datos) y bitácora en la tabla `etl_runs`. |
| 5. Consumo solo de la base | El frontend usa **únicamente** Supabase (`frontend/src/services/api.js`), a través de vistas que funcionan como "API propia". Nunca llama a las APIs públicas. |
| 6. Interfaz con React + Vite | 4 pantallas con el diseño que pide cada práctica: tarjetas, diseño *responsive*, indicadores de carga, modales, panel lateral, paginación y animaciones. |

```
API pública ──► backend (Node, ETL) ──► Supabase (PostgreSQL + RLS) ──► frontend (React + Vite)
                 service role key                vistas/REST            anon key + sesión OAuth
```

## Estructura

```
practica-integradora/
├── supabase/schema.sql        # tablas, vistas, índices y seguridad (RLS)
├── backend/                   # proceso de carga (Node 18+)
│   ├── src/index.js           # CLI: all | countries | starwars | movies | weather
│   ├── src/lib/               # cliente Supabase, fetch con reintentos, bitácora
│   └── src/loaders/           # un cargador por API
└── frontend/                  # React + Vite
    └── src/
        ├── services/api.js    # todas las consultas (solo Supabase)
        ├── context/           # sesión OAuth
        ├── components/        # Loader, Modal, Pagination, ErrorMessage…
        ├── pages/             # Login, Home, Weather, Movies, Countries, StarWars
        └── styles/
```

## Puesta en marcha

### 1. Crear el proyecto en Supabase
1. Entra a <https://supabase.com>, crea un proyecto y espera a que esté listo.
2. Ve a **SQL Editor → New query**, pega todo `supabase/schema.sql` y presiona **Run**.
3. En **Project Settings → API** copia la **Project URL**, la **anon / publishable key** (para el frontend) y la **service_role / secret key** (solo para el backend).

### 2. Configurar OAuth (GitHub)
1. En GitHub: **Settings → Developer settings → OAuth Apps → New OAuth App**.
   - *Homepage URL*: `http://localhost:5173`
   - *Authorization callback URL*: `https://TU-PROYECTO.supabase.co/auth/v1/callback`
2. Copia el **Client ID** y genera un **Client Secret**.
3. En Supabase: **Authentication → Sign In / Providers → GitHub**: actívalo y pega ambos valores.
4. En **Authentication → URL Configuration**: pon `http://localhost:5173` en *Site URL* y agrégalo también en *Redirect URLs*.

> Para usar Google haz lo mismo en Google Cloud Console (OAuth client ID, con la misma URL de callback) y activa el proveedor Google en Supabase. Si solo usarás uno, deja únicamente ese en `VITE_OAUTH_PROVIDERS`.

### 3. Llaves de las APIs
- **TMDb** (películas): crea una cuenta en <https://www.themoviedb.org> → *Settings → API* y copia el **API Read Access Token**.
- **OpenWeather** (clima): crea una cuenta en <https://openweathermap.org> → *API keys*. Una llave nueva puede tardar hasta 2 horas en activarse.
- **REST Countries** y **SWAPI** no necesitan llave.

### 4. Cargar los datos (backend)
```bash
cd backend
cp .env.example .env      # y llena los valores
npm install
npm run load              # carga las 4 fuentes (el clima tarda ~5 min por el límite de la API)
```
También se pueden cargar por separado: `npm run load:countries`, `load:starwars`, `load:movies`, `load:weather`.
**El clima usa las capitales de la tabla `countries`, así que carga primero los países.**
Puedes volver a correr la carga cuando quieras: actualiza los registros sin duplicarlos y guarda una nueva lectura del clima.

### 5. Levantar la interfaz (frontend)
```bash
cd frontend
cp .env.example .env      # URL y anon key de Supabase
npm install
npm run dev               # http://localhost:5173
```
Para producción: `npm run build` genera la carpeta `dist/`.

## Seguridad
- **RLS activado en todas las tablas**: solo los usuarios autenticados pueden **leer** y nadie puede escribir desde el navegador.
- La **service role key** solo vive en `backend/.env`. Nunca la pongas en el frontend ni la subas a GitHub (`.gitignore` ya excluye los `.env`).

## Módulos

| Módulo | Fuente | Qué incluye |
|---|---|---|
| Clima | OpenWeather | Búsqueda por ciudad, temperatura, condición, humedad, viento, ícono, dashboard con tarjetas, *responsive*, carga y errores (ciudad no encontrada). |
| Películas | TMDb | Buscador, póster, título y año, filtro por género, detalle en modal, paginación, diseño oscuro estilo *streaming* con animaciones. |
| Países | REST Countries | Búsqueda, bandera, nombre y región, filtro por región, catálogo de tarjetas y panel lateral con idiomas, monedas y países vecinos. |
| Star Wars | SWAPI | Galería de tarjetas (nombre, género, año de nacimiento), ficha en modal (altura, peso, ojos, cabello y planeta), paginación, tema espacial e indicador de carga. |

## Problemas comunes
- **"Falta configurar Supabase"**: no existe `frontend/.env` o no reiniciaste `npm run dev`.
- **Al iniciar sesión vuelves al login o aparece un error de redirect**: revisa la *callback URL* en GitHub y las *Redirect URLs* en Supabase.
- **Las pantallas salen vacías**: corre la carga del backend y revisa la tabla `etl_runs` en Supabase.
- **OpenWeather devuelve 401**: la llave todavía no se activa. Espera y vuelve a correr `npm run load:weather`.
- **SWAPI no responde**: el cargador cambia solo al espejo `swapi.py4e.com`.
