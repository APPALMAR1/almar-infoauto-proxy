// lib/withTimeout.js
// Helper compartido: envuelve una promesa y la hace fallar rápido (en vez
// de colgarse) si no resuelve dentro del tiempo dado. Usado para blindar
// las llamadas a Supabase e Infoauto contra colgadas indefinidas
// (por ejemplo, si el proyecto de Supabase queda pausado por inactividad).

export function withTimeout(promise, ms, label) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`Timeout (${label}) tras ${ms}ms`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}
