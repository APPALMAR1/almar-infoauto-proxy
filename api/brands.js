// api/brands.js
// GET /api/brands
// Cache 7 días en Supabase — llama a Infoauto UNA SOLA VEZ por semana
// Blindado con timeout: si algo (Supabase, Infoauto) no responde en 8s,
// devuelve error claro en vez de dejar al cliente esperando indefinidamente.

import { getValidToken } from '../lib/token.js';
import { createClient } from '@supabase/supabase-js';
import { withTimeout } from '../lib/withTimeout.js';

const IA_BASE = 'https://api.infoauto.com.ar/cars/pub';
const CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 7 días en ms
const HANDLER_TIMEOUT_MS = 8000; // menor al maxDuration:10 de vercel.json

function supabase() {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY);
}

async function fetchPage(page, pageSize, token) {
  const iaRes = await fetch(`${IA_BASE}/brands/?page=${page}&page_size=${pageSize}`, {
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
  });
  if (!iaRes.ok) throw new Error(`Infoauto brands error: ${iaRes.status}`);
  const data = await iaRes.json();
  return Array.isArray(data) ? data : (data.results || []);
}

async function loadBrands() {
  const sb = supabase();

  // 1. Verificar cache en Supabase (válido 7 días)
  const { data: cache } = await withTimeout(
    sb.from('infoauto_cache').select('*').eq('key', 'brands').single(),
    6000,
    'supabase-get-cache'
  );

  if (cache) {
    const age = Date.now() - new Date(cache.updated_at).getTime();
    if (age < CACHE_TTL) {
      // Cache válido — NO llamar a Infoauto
      return { ok: true, brands: JSON.parse(cache.value), cached: true };
    }
  }

  // 2. Cache vencido o inexistente — llamar a Infoauto
  const token = await getValidToken();

  // Traer las páginas EN PARALELO (antes era secuencial y podía superar
  // los 10s de maxDuration cuando Infoauto tardaba)
  const MAX_PAGES = 10; // máximo 1000 marcas
  const pageSize = 100;
  const pageResults = await Promise.all(
    Array.from({ length: MAX_PAGES }, (_, i) => fetchPage(i + 1, pageSize, token))
  );

  let allBrands = [];
  for (const items of pageResults) {
    if (!items.length) break;
    allBrands = allBrands.concat(items);
    if (items.length < pageSize) break; // llegamos al final antes de MAX_PAGES
  }

  const result = allBrands
    .map(b => ({ id: b.id, name: b.name }))
    .filter(b => b.id && b.name)
    .sort((a, b) => a.name.localeCompare(b.name));

  // 3. Guardar en cache por 7 días (si esto falla, igual devolvemos el resultado)
  try {
    await withTimeout(
      sb.from('infoauto_cache').upsert({
        key: 'brands',
        value: JSON.stringify(result),
        updated_at: new Date().toISOString()
      }),
      6000,
      'supabase-save-cache'
    );
  } catch (cacheErr) {
    console.error('No se pudo guardar cache de brands:', cacheErr.message);
  }

  return { ok: true, brands: result, cached: false, total: result.length };
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).end();

  try {
    const result = await withTimeout(loadBrands(), HANDLER_TIMEOUT_MS, 'brands');
    return res.status(200).json(result);
  } catch (err) {
    console.error('Brands error:', err.message);
    // Siempre devolvemos JSON válido y rápido — nunca dejamos al cliente
    // esperando sin respuesta.
    return res.status(503).json({ ok: false, error: err.message });
  }
}
