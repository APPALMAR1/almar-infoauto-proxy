// api/models.js
// GET /api/models?brand_id=X
// Trae TODOS los modelos de una marca paginando hasta agotar resultados

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

    // Check cache (valid 24hs)
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

    const token = await getValidToken();
    let allModels = [];
    let page = 1;
    const pageSize = 100;

    // Paginar hasta traer todos los modelos
    while (true) {
      const url = `${IA_BASE}/brands/${brand_id}/models/?page=${page}&page_size=${pageSize}`;
      const iaRes = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
      });
      if (!iaRes.ok) break;
      const data = await iaRes.json();
      const items = Array.isArray(data) ? data : (data.results || []);
      if (!items.length) break;
      allModels = allModels.concat(items);
      if (items.length < pageSize) break;
      page++;
      if (page > 20) break; // Seguridad: máximo 2000 modelos
    }

    // Agrupar por grupo, filtrar con precios usados o 0km
    const gruposMap = {};
    allModels
      .filter(m => m.prices || m.list_price)
      .forEach(m => {
        const grupo = m.group?.name || 'SIN GRUPO';
        if (!gruposMap[grupo]) {
          gruposMap[grupo] = {
            grupo,
            anioDesde: m.prices_from || null,
            anioHasta: m.prices_to || null,
            versiones: []
          };
        }
        const g = gruposMap[grupo];
        if (m.prices_from && (!g.anioDesde || m.prices_from < g.anioDesde)) g.anioDesde = m.prices_from;
        if (m.prices_to   && (!g.anioHasta || m.prices_to   > g.anioHasta)) g.anioHasta = m.prices_to;
        if (m.prices || m.list_price) {
          g.versiones.push({
            codia: m.codia,
            descripcion: m.description,
            anioDesde: m.prices_from,
            anioHasta: m.prices_to,
          });
        }
      });

    const result = Object.values(gruposMap)
      .sort((a, b) => a.grupo.localeCompare(b.grupo));

    // Guardar cache
    await sb.from('infoauto_cache').upsert({
      key: cacheKey,
      value: JSON.stringify(result),
      updated_at: new Date().toISOString()
    });

    return res.status(200).json({ ok: true, models: result, cached: false, total: result.length });

  } catch (err) {
    console.error('Models error:', err.message);
    return res.status(500).json({ ok: false, error: err.message });
  }
}
