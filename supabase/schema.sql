-- =====================================================================
-- Práctica integradora (Back y Front) · Esquema de base de datos
-- Ejecutar completo en Supabase → SQL Editor → New query → Run
-- Es idempotente: se puede volver a correr sin perder datos.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 0. Bitácora del proceso de carga (ETL)
-- ---------------------------------------------------------------------
create table if not exists public.etl_runs (
  id           bigint generated always as identity primary key,
  source       text        not null check (source in ('countries','starwars','movies','weather')),
  status       text        not null default 'running' check (status in ('running','success','error')),
  records      integer     not null default 0 check (records >= 0),
  message      text,
  started_at   timestamptz not null default now(),
  finished_at  timestamptz
);

-- ---------------------------------------------------------------------
-- 1. PAÍSES (REST Countries)
-- ---------------------------------------------------------------------
create table if not exists public.regions (
  id    smallint generated always as identity primary key,
  name  text not null unique
);

create table if not exists public.subregions (
  id         smallint generated always as identity primary key,
  name       text not null unique,
  region_id  smallint not null references public.regions(id) on delete cascade
);

create table if not exists public.countries (
  cca3           char(3) primary key,
  cca2           char(2) not null unique,
  common_name    text    not null,
  official_name  text,
  name_es        text,
  region_id      smallint references public.regions(id),
  subregion_id   smallint references public.subregions(id),
  capital        text,
  capital_lat    numeric(9,6),
  capital_lng    numeric(9,6),
  population     bigint  check (population >= 0),
  area_km2       numeric check (area_km2 >= 0),
  flag_png       text,
  flag_svg       text,
  flag_alt       text,
  maps_url       text,
  timezones      text[],
  updated_at     timestamptz not null default now()
);

create table if not exists public.languages (
  code  text primary key,
  name  text not null
);

create table if not exists public.country_languages (
  country_cca3   char(3) references public.countries(cca3) on delete cascade,
  language_code  text    references public.languages(code) on delete cascade,
  primary key (country_cca3, language_code)
);

create table if not exists public.currencies (
  code    text primary key,
  name    text not null,
  symbol  text
);

create table if not exists public.country_currencies (
  country_cca3   char(3) references public.countries(cca3) on delete cascade,
  currency_code  text    references public.currencies(code) on delete cascade,
  primary key (country_cca3, currency_code)
);

create table if not exists public.country_borders (
  country_cca3  char(3) references public.countries(cca3) on delete cascade,
  border_cca3   char(3) references public.countries(cca3) on delete cascade,
  primary key (country_cca3, border_cca3),
  check (country_cca3 <> border_cca3)
);

create index if not exists countries_region_idx on public.countries(region_id);
create index if not exists countries_name_idx   on public.countries(common_name);

-- ---------------------------------------------------------------------
-- 2. STAR WARS (SWAPI)
-- ---------------------------------------------------------------------
create table if not exists public.sw_planets (
  id          integer primary key,          -- id de SWAPI
  name        text not null,
  climate     text,
  terrain     text,
  population  text,
  diameter_km integer check (diameter_km >= 0),
  updated_at  timestamptz not null default now()
);

create table if not exists public.sw_people (
  id            integer primary key,        -- id de SWAPI
  name          text not null,
  gender        text,
  birth_year    text,
  height_cm     integer check (height_cm >= 0),
  mass_kg       numeric check (mass_kg >= 0),
  hair_color    text,
  eye_color     text,
  skin_color    text,
  homeworld_id  integer references public.sw_planets(id) on delete set null,
  updated_at    timestamptz not null default now()
);

create index if not exists sw_people_homeworld_idx on public.sw_people(homeworld_id);

-- ---------------------------------------------------------------------
-- 3. PELÍCULAS (TMDb)
-- ---------------------------------------------------------------------
create table if not exists public.genres (
  id    integer primary key,                -- id de TMDb
  name  text not null
);

create table if not exists public.movies (
  id                 integer primary key,   -- id de TMDb
  title              text not null,
  original_title     text,
  overview           text,
  release_date       date,
  poster_url         text,
  backdrop_url       text,
  vote_average       numeric(3,1) check (vote_average between 0 and 10),
  vote_count         integer check (vote_count >= 0),
  popularity         numeric,
  original_language  text,
  updated_at         timestamptz not null default now()
);

create table if not exists public.movie_genres (
  movie_id  integer references public.movies(id) on delete cascade,
  genre_id  integer references public.genres(id) on delete cascade,
  primary key (movie_id, genre_id)
);

create index if not exists movies_title_idx      on public.movies(title);
create index if not exists movies_popularity_idx on public.movies(popularity desc);

-- ---------------------------------------------------------------------
-- 4. CLIMA (OpenWeather)
-- ---------------------------------------------------------------------
create table if not exists public.weather_cities (
  id            bigint generated always as identity primary key,
  name          text    not null,
  country_code  char(2) not null references public.countries(cca2) on delete cascade,
  lat           numeric(9,6) not null,
  lon           numeric(9,6) not null,
  owm_id        integer,
  unique (name, country_code)
);

create table if not exists public.weather_conditions (
  id           integer primary key,         -- id de condición de OpenWeather
  main         text not null,
  description  text not null
);

create table if not exists public.weather_readings (
  id              bigint generated always as identity primary key,
  city_id         bigint  not null references public.weather_cities(id) on delete cascade,
  condition_id    integer references public.weather_conditions(id),
  icon            text,
  temp_c          numeric(5,2),
  feels_like_c    numeric(5,2),
  temp_min_c      numeric(5,2),
  temp_max_c      numeric(5,2),
  humidity        smallint check (humidity between 0 and 100),
  pressure_hpa    integer,
  wind_speed_ms   numeric(5,2) check (wind_speed_ms >= 0),
  wind_deg        smallint check (wind_deg between 0 and 360),
  clouds          smallint check (clouds between 0 and 100),
  observed_at     timestamptz not null,
  fetched_at      timestamptz not null default now(),
  unique (city_id, observed_at)              -- evita lecturas duplicadas
);

create index if not exists weather_readings_city_idx on public.weather_readings(city_id, observed_at desc);
create index if not exists weather_cities_name_idx   on public.weather_cities(name);

-- =====================================================================
-- VISTAS = "API propia" que consume el frontend (vía Supabase REST)
-- security_invoker hace que respeten las políticas RLS de las tablas.
-- =====================================================================
create or replace view public.countries_view with (security_invoker = true) as
select
  c.cca3, c.cca2, c.common_name, c.official_name,
  coalesce(c.name_es, c.common_name) as display_name,
  r.name  as region,
  s.name  as subregion,
  c.capital, c.population, c.area_km2,
  c.flag_png, c.flag_svg, c.flag_alt, c.maps_url, c.timezones,
  coalesce((select array_agg(l.name order by l.name)
            from public.country_languages cl join public.languages l on l.code = cl.language_code
            where cl.country_cca3 = c.cca3), '{}') as languages,
  coalesce((select jsonb_agg(jsonb_build_object('code', cu.code, 'name', cu.name, 'symbol', cu.symbol))
            from public.country_currencies cc join public.currencies cu on cu.code = cc.currency_code
            where cc.country_cca3 = c.cca3), '[]'::jsonb) as currencies,
  coalesce((select array_agg(b.border_cca3 order by b.border_cca3)
            from public.country_borders b where b.country_cca3 = c.cca3), '{}') as borders
from public.countries c
left join public.regions r    on r.id = c.region_id
left join public.subregions s on s.id = c.subregion_id;

create or replace view public.sw_people_view with (security_invoker = true) as
select
  p.id, p.name, p.gender, p.birth_year, p.height_cm, p.mass_kg,
  p.hair_color, p.eye_color, p.skin_color,
  pl.id as homeworld_id, pl.name as homeworld, pl.climate as homeworld_climate,
  pl.terrain as homeworld_terrain
from public.sw_people p
left join public.sw_planets pl on pl.id = p.homeworld_id;

create or replace view public.movies_view with (security_invoker = true) as
select
  m.*,
  extract(year from m.release_date)::int as release_year,
  coalesce((select array_agg(g.name order by g.name)
            from public.movie_genres mg join public.genres g on g.id = mg.genre_id
            where mg.movie_id = m.id), '{}') as genres,
  coalesce((select array_agg(mg.genre_id) from public.movie_genres mg where mg.movie_id = m.id), '{}') as genre_ids
from public.movies m;

create or replace view public.weather_latest with (security_invoker = true) as
select distinct on (wc.id)
  wc.id as city_id, wc.name as city, wc.country_code, wc.lat, wc.lon,
  c.common_name as country, c.flag_png,
  wr.temp_c, wr.feels_like_c, wr.temp_min_c, wr.temp_max_c,
  wr.humidity, wr.pressure_hpa, wr.wind_speed_ms, wr.wind_deg, wr.clouds,
  wr.icon, cond.main as condition, cond.description,
  wr.observed_at, wr.fetched_at
from public.weather_cities wc
join public.weather_readings wr        on wr.city_id = wc.id
left join public.weather_conditions cond on cond.id = wr.condition_id
left join public.countries c           on c.cca2 = wc.country_code
order by wc.id, wr.observed_at desc;

-- =====================================================================
-- SEGURIDAD (RLS): solo usuarios autenticados (OAuth) pueden LEER.
-- Nadie escribe desde el frontend: la carga usa la service role key.
-- =====================================================================
do $$
declare t text;
begin
  foreach t in array array[
    'etl_runs','regions','subregions','countries','languages','country_languages',
    'currencies','country_currencies','country_borders',
    'sw_planets','sw_people','genres','movies','movie_genres',
    'weather_cities','weather_conditions','weather_readings'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "lectura autenticados" on public.%I', t);
    execute format('create policy "lectura autenticados" on public.%I for select to authenticated using (true)', t);
  end loop;
end $$;

-- Las vistas no deben ser visibles para usuarios anónimos
revoke all on public.countries_view, public.sw_people_view, public.movies_view, public.weather_latest from anon;
grant select on public.countries_view, public.sw_people_view, public.movies_view, public.weather_latest to authenticated;
