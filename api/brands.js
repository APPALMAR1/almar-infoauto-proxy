// api/brands.js
// GET /api/brands
// Usa /brands/download/ para traer TODAS las marcas de una vez (sin paginación)

import { getValidToken } from '../lib/token.js';
import { createClient } from '@supabase/supabase-js';

const IA_BASE = 'https://api.infoauto.com.ar/cars/pub';

function supabase() {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY);
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).end();

  try {
    const sb = supabase();

    // Check cache in Supabase (valid 24hs)
    const { data: cache } = await sb
      .from('infoauto_cache')
      .select('*')
      .eq('key', 'brands')
      .single();

    if (cache) {
      const age = Date.now() - new Date(cache.updated_at).getTime();
      if (age < 24 * 60 * 60 * 1000) {
        return res.status(200).json({ ok: true, brands: JSON.parse(cache.value), cached: true });
      }
    }

    // /brands/download/ trae TODAS las marcas con sus grupos — sin paginación
    const token = await getValidToken();
    const iaRes = await fetch(`${IA_BASE}/brands/download/`, {
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
    });
    if (!iaRes.ok) throw new Error(`Infoauto brands/download error: ${iaRes.status}`);
    const data = await iaRes.json();

    // El response es array de marcas con grupos anidados
    const brands = Array.isArray(data) ? data : (data.results || data.brands || []);

    const result = brands
      .map(b => ({ id: b.id, name: b.name }))
      .filter(b => b.id && b.name)
      .sort((a, b) => a.name.localeCompare(b.name));

    // Guardar en cache
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
