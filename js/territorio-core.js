/* Lojanova 16/16 · consultas de lectura y relaciones territoriales. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.LojanovaTerritorio = api;
})(typeof window === 'object' ? window : globalThis, function () {
  'use strict';
  const normalize = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase();
  async function readAll(db, table, fields, active, signal) {
    const rows = [], ids = new Set(); let cursor = null, expected = null;
    while (true) {
      let q = db.from(table).select(fields,{count:'exact'}).order('id').limit(500);
      if (active) q = q.eq('activo',true);
      if (cursor) q = q.gt('id',cursor);
      const {data,error,count} = await q.abortSignal(signal);
      if (error || !Array.isArray(data) || !Number.isInteger(count)) throw new Error('No se pudo cargar la oferta completa. Inténtalo de nuevo.');
      if (expected === null) expected = count;
      if (!data.length) break;
      for (const row of data) {
        if (!row.id || ids.has(row.id)) throw new Error('La consulta cambió durante la carga. Inténtalo de nuevo.');
        ids.add(row.id); rows.push(row);
      }
      if (rows.length > 100000) throw new Error('La oferta requiere una consulta de mayor capacidad.');
      cursor = data[data.length-1].id;
      if (rows.length >= expected) break;
    }
    if (rows.length !== expected) throw new Error('La consulta está incompleta. Inténtalo de nuevo.');
    return rows;
  }
  async function load(db, signal) {
    const [cantons,categories,products,producers] = await Promise.all([
      readAll(db,'cantones','id,nombre,orden',false,signal),
      readAll(db,'categorias','id,nombre,orden',false,signal),
      readAll(db,'productos','id,nombre,slug,canton_id,categoria_id,emprendedor_id,imagen_principal_url,activo',true,signal),
      readAll(db,'emprendedores','id,nombre,emprendimiento,canton_id,foto_url,activo',true,signal)
    ]);
    return {cantons,categories,products,producers};
  }
  function index(data) {
    const categories = new Map(data.categories.map(c=>[c.id,c]));
    const producers = data.producers.filter(e=>e.activo===true);
    const producerById = new Map(producers.map(e=>[e.id,e]));
    const products = data.products.filter(p=>p.activo===true);
    const cantons = new Map(data.cantons.map(c=>[c.id,c]));
    const names = new Map();
    for (const c of data.cantons) {
      const key = normalize(c.nombre);
      if (names.has(key)) throw new Error('Hay cantones con nombres duplicados. Revisa el catálogo de cantones.');
      names.set(key,c);
    }
    const territory = p => p.canton_id || producerById.get(p.emprendedor_id)?.canton_id || null;
    const sorted = rows => rows.slice().sort((a,b)=>String(a.emprendimiento||a.nombre).localeCompare(String(b.emprendimiento||b.nombre),'es'));
    function select(name, category = '') {
      const canton = names.get(normalize(name));
      const allProducts = canton ? sorted(products.filter(p=>territory(p)===canton.id)) : [];
      const localProducers = canton ? sorted(producers.filter(e=>e.canton_id===canton.id)) : [];
      const available = sorted([...new Set(allProducts.map(p=>p.categoria_id))].map(id=>categories.get(id)).filter(Boolean));
      return {canton,products:category?allProducts.filter(p=>p.categoria_id===category):allProducts,allProducts,producers:localProducers,categories:available};
    }
    function producerCategory(id) {
      const counts = new Map();
      for (const p of products) if (p.emprendedor_id===id && categories.has(p.categoria_id)) counts.set(p.categoria_id,(counts.get(p.categoria_id)||0)+1);
      return [...counts].sort((a,b)=>b[1]-a[1] || categories.get(a[0]).nombre.localeCompare(categories.get(b[0]).nombre,'es')).map(([id])=>categories.get(id).nombre)[0] || '';
    }
    return {select,producerCategory,categories,producerById,cantons,products,producers};
  }
  return {normalize,readAll,load,index};
});
