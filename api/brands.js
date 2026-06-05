// api/brands.js
// GET /api/brands
// Cache 7 días en Supabase — llama a Infoauto UNA SOLA VEZ por semana

import { getValidToken } from '../lib/token.js';
import { createClient } from '@supabase/supabase-js';

const IA_BASE = 'https://api.infoauto.com.ar/cars/pub';
const CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 7 días en ms

function supabase() {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY);
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).end();

  try {
    const sb = supabase();

    // 1. Verificar cache en Supabase (válido 7 días)
    const { data: cache } = await sb
      .from('infoauto_cache')
      .select('*')
      .eq('key', 'brands')
      .single();

    if (cache) {
      const age = Date.now() - new Date(cache.updated_at).getTime();
      if (age < CACHE_TTL) {
        // Cache válido — NO llamar a Infoauto
        return res.status(200).json({ ok: true, brands: JSON.parse(cache.value), cached: true });
      }
    }

    // 2. Cache vencido o inexistente — llamar a Infoauto UNA sola vez
    const token = await getValidToken();

    // Usar /brands/ paginado en lugar de /brands/download/ (menos agresivo)
    let allBrands = [];
    let page = 1;
    const pageSize = 100;

    while (true) {
      const iaRes = await fetch(`${IA_BASE}/brands/?page=${page}&page_size=${pageSize}`, {
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
      });
      if (!iaRes.ok) throw new Error(`Infoauto brands error: ${iaRes.status}`);
      const data = await iaRes.json();
      const items = Array.isArray(data) ? data : (data.results || []);
      if (!items.length) break;
      allBrands = allBrands.concat(items);
      if (items.length < pageSize) break;
      page++;
      if (page > 10) break; // máximo 1000 marcas
    }

    const result = allBrands
      .map(b => ({ id: b.id, name: b.name }))
      .filter(b => b.id && b.name)
      .sort((a, b) => a.name.localeCompare(b.name));

    // 3. Guardar en cache por 7 días
    await sb.from('infoauto_cache').upsert({
      key: 'brands',
      value: JSON.stringify(result),
      updated_at: new Date().toISOString()
    });

    return res.status(200).json({ ok: true, brands: result, cached: false, total: result.length });

  } catch (err) {
    console.error('Brands error:', err.message);
    return res.status(500).json({ ok: false, error: err.message });
  }
}
