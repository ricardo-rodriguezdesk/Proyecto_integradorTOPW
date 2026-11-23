import { supabase } from './supabase.js';

/**
 * Ejecuta un cargador y registra el resultado en la tabla etl_runs.
 * El cargador debe devolver { records, message? }.
 */
export async function runEtl(source, loader) {
  const started = Date.now();
  console.log(`\n▶ Cargando ${source}…`);

  const { data: run, error } = await supabase
    .from('etl_runs').insert({ source }).select('id').single();
  if (error) throw new Error(`No se pudo registrar la carga (¿ejecutaste schema.sql?): ${error.message}`);

  try {
    const { records, message = null } = await loader();
    const { error: logError } = await supabase.from('etl_runs')
      .update({ status: 'success', records, message, finished_at: new Date().toISOString() })
      .eq('id', run.id);
    if (logError) console.warn(`  ⚠ No se pudo actualizar la bitácora: ${logError.message}`);
    console.log(`✔ ${source}: ${records} registros en ${((Date.now() - started) / 1000).toFixed(1)} s${message ? ` (${message})` : ''}`);
    return { source, ok: true, records };
  } catch (err) {
    await supabase.from('etl_runs')
      .update({ status: 'error', message: err.message.slice(0, 1000), finished_at: new Date().toISOString() })
      .eq('id', run.id);
    console.error(`✖ ${source}: ${err.message}`);
    return { source, ok: false, error: err.message };
  }
}
