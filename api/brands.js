// api/brands.js
// GET /api/brands
// Devuelve lista de marcas de Infoauto (con cache en Supabase 24hs)

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
    // Check cache in Supabase (valid 24hs)
    const sb = supabase();
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

    // Fetch from Infoauto
    const token = await getValidToken();
    const iaRes = await fetch(`${IA_BASE}/brands/`, {
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
    });
    if (!iaRes.ok) throw new Error(`Infoauto brands error: ${iaRes.status}`);
    const brands = await iaRes.json();

    // Map to simple format
    const result = (Array.isArray(brands) ? brands : [])
      .map(b => ({ id: b.id, name: b.name }))
      .sort((a, b) => a.name.localeCompare(b.name));

    // Save to cache
    await sb.from('infoauto_cache').upsert({
      key: 'brands',
      value: JSON.stringify(result),
      updated_at: new Date().toISOString()
    });

    return res.status(200).json({ ok: true, brands: result, cached: false });

  } catch (err) {
    console.error('Brands error:', err.message);
    return res.status(500).json({ ok: false, error: err.message });
  }
}
