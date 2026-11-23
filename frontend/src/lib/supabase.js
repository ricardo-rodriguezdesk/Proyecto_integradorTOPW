import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isConfigured = Boolean(url && key);

// Cliente público: solo puede LEER lo que permiten las políticas RLS
// (usuarios autenticados con OAuth). Nunca usa la service role key.
export const supabase = isConfigured ? createClient(url, key) : null;
