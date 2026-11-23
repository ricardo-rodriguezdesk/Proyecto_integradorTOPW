import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en backend/.env');
  process.exit(1);
}

// Cliente con privilegios de servidor: solo se usa en el proceso de carga.
export const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

/** Inserta/actualiza en lotes para no exceder el tamaño de petición. */
export async function upsertInChunks(table, rows, options = {}, chunkSize = 500) {
  let total = 0;
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    const { error } = await supabase.from(table).upsert(chunk, options);
    if (error) throw new Error(`Error al guardar en "${table}": ${error.message}`);
    total += chunk.length;
  }
  return total;
}

/** Lanza un error legible si una consulta de Supabase falla. */
export function check({ data, error }, context) {
  if (error) throw new Error(`${context}: ${error.message}`);
  return data;
}
