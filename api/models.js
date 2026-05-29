// api/models.js
// GET /api/models?brand_id=X
// Devuelve modelos de una marca (con cache en Supabase 24hs)

import { getValidToken } from '../lib/token.js';
import { createClient } from '@supabase/supabase-js';

const IA_BASE = 'https://api.infoauto.com.ar/cars/pub';

function supabase() {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY);
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).end();

  const { brand_id } = req.query;
  if (!brand_id) return res.status(400).json({ error: 'brand_id requerido' });

  try {
    const sb = supabase();
    const cacheKey = `models_${brand_id}`;

    // Check cache
    const { data: cache } = await sb
      .from('infoauto_cache')
      .select('*')
      .eq('key', cacheKey)
      .single();

    if (cache) {
      const age = Date.now() - new Date(cache.updated_at).getTime();
      if (age < 24 * 60 * 60 * 1000) {
        return res.status(200).json({ ok: true, models: JSON.parse(cache.value), cached: true });
      }
    }

    // Fetch from Infoauto - get all models for brand
    const token = await getValidToken();
    const iaRes = await fetch(`${IA_BASE}/brands/${brand_id}/models/`, {
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
    });
    if (!iaRes.ok) throw new Error(`Infoauto models error: ${iaRes.status}`);
    const models = await iaRes.json();

    // Map - group by group name, deduplicate
    const seen = new Set();
    const result = (Array.isArray(models) ? models : [])
      .filter(m => m.prices && m.prices_to >= new Date().getFullYear() - 15)
      .map(m => ({
        codia: m.codia,
        descripcion: m.description,
        grupo: m.group?.name || '',
        anioDesde: m.prices_from,
        anioHasta: m.prices_to,
      }))
      .filter(m => {
        const key = m.grupo + '_' + m.descripcion;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .sort((a, b) => (a.grupo + a.descripcion).localeCompare(b.grupo + b.descripcion));

    // Save cache
    await sb.from('infoauto_cache').upsert({
      key: cacheKey,
      value: JSON.stringify(result),
      updated_at: new Date().toISOString()
    });

    return res.status(200).json({ ok: true, models: result, cached: false });

  } catch (err) {
    console.error('Models error:', err.message);
    return res.status(500).json({ ok: false, error: err.message });
  }
}
