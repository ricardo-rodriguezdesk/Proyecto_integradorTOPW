const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export { sleep };

/**
 * GET con tiempo límite y reintentos (para errores de red, 429 y 5xx).
 * Lanza un error descriptivo si la respuesta no es exitosa.
 */
export async function fetchJson(url, { headers = {}, retries = 3, timeoutMs = 15000 } = {}) {
  let lastError;
  for (let attempt = 1; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, { headers: { Accept: 'application/json', ...headers }, signal: controller.signal });
      if (res.ok) return await res.json();

      const body = await res.text().catch(() => '');
      const err = new Error(`HTTP ${res.status} en ${redact(url)} ${body.slice(0, 160)}`);
      err.status = res.status;
      // Errores del cliente (401, 404…) no se reintentan, salvo 429 (límite de peticiones)
      if (res.status < 500 && res.status !== 429) throw err;
      lastError = err;
    } catch (err) {
      if (err.status && err.status < 500 && err.status !== 429) throw err;
      lastError = err.name === 'AbortError' ? new Error(`Tiempo agotado en ${redact(url)}`) : err;
    } finally {
      clearTimeout(timer);
    }
    if (attempt < retries) await sleep(1000 * 2 ** (attempt - 1));
  }
  throw lastError;
}

// Oculta llaves de API en los mensajes de error
function redact(url) {
  return String(url).replace(/(appid|api_key)=[^&]+/gi, '$1=***');
}
