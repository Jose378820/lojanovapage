(function () {
  'use strict';
  const parent = document.getElementById('view-analiticas');
  if (!parent || document.getElementById('ruta-metrics')) return;
  const labels = ['ruta_cafe_menu', 'ruta_cafe_tarjeta'];
  const panel = document.createElement('section');
  panel.id = 'ruta-metrics'; panel.className = 'ruta-metrics';
  panel.innerHTML = '<header><div><h3>Ruta del café</h3><p>Conexiones desde Lojanova hacia el portal de turismo</p></div><button type="button" id="ruta-refresh">Actualizar clics</button></header><p id="ruta-status" role="status">Selecciona Actualizar clics para consultar el histórico.</p><div id="ruta-results"></div>';
  parent.append(panel);
  const button = panel.querySelector('#ruta-refresh'), status = panel.querySelector('#ruta-status'), result = panel.querySelector('#ruta-results');
  const escape = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const day = v => new Intl.DateTimeFormat('en-CA', {timeZone:'America/Guayaquil',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(v));
  const num = n => n.toLocaleString('es-EC');
  let busy = false, loaded = false;
  async function load() {
    if (busy) return;
    busy = true; button.disabled = true; result.replaceChildren(); status.textContent = 'Consultando clics registrados…';
    const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 45000);
    try {
      const auth = await db.auth.getSession();
      if (auth.error || !auth.data.session) throw new Error('Inicia sesión nuevamente.');
      const admin = await db.from('admins').select('id').eq('id', auth.data.session.user.id).maybeSingle().abortSignal(controller.signal);
      if (admin.error || !admin.data) throw new Error('No se pudo verificar el acceso de administrador.');
      const cutoff = new Date().toISOString();
      const query = () => db.from('analytics_eventos').select('id,creado_en,pagina,session_id,metadata', {count:'exact'})
        .eq('tipo','click').in('metadata->>elemento',labels).lte('creado_en', cutoff);
      const count = await query().limit(1).abortSignal(controller.signal);
      if (count.error || count.count === null) throw new Error('No se pudo consultar el total. Revisa la conexión y los permisos.');
      const rows = [], ids = new Set(); let cursor = null;
      while (rows.length < count.count) {
        let q = query().order('id').limit(500);
        if (cursor) q = q.gt('id', cursor);
        const page = await q.abortSignal(controller.signal);
        if (page.error || !page.data?.length) throw new Error('Consulta incompleta. Vuelve a actualizar.');
        for (const r of page.data) {
          if (ids.has(r.id) || !Number.isFinite(Date.parse(r.creado_en))) throw new Error('No se pudo validar el histórico.');
          ids.add(r.id); rows.push(r);
        }
        cursor = page.data.at(-1).id;
        if (rows.length > 250000) throw new Error('El volumen requiere una exportación de servidor.');
      }
      if (rows.length !== count.count) throw new Error('El total cambió durante la consulta. Vuelve a actualizar.');
      const counts = labels.map(label => rows.filter(r => r.metadata?.elemento === label).length);
      const months = new Map();
      for (const r of rows) {
        const d = day(r.creado_en), m = d.slice(0,7);
        if (!months.has(m)) months.set(m, new Map());
        if (!months.get(m).has(d)) months.get(m).set(d,[0,0]);
        months.get(m).get(d)[labels.indexOf(r.metadata.elemento)]++;
      }
      result.innerHTML = '<div class="ruta-counts">' + [['Clics totales',rows.length],['Desde el menú',counts[0]],['Desde la tarjeta',counts[1]]].map(([s,n]) => `<article>${s}<strong>${num(n)}</strong></article>`).join('') + '</div>' +
        '<p>Se contabiliza cada evento de clic recibido. No equivale a visitantes únicos ni confirma una visita dentro del sitio de destino. El registro comienza al publicar esta incorporación.</p>' +
        [...months].sort(([a],[b])=>b.localeCompare(a)).map(([m,days]) => `<details><summary>${escape(new Intl.DateTimeFormat('es-EC',{month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(m+'-01T12:00:00Z')))} · ${num([...days.values()].reduce((s,c)=>s+c[0]+c[1],0))} clics</summary><div class="ruta-table"><table><thead><tr><th>Día (Ecuador)</th><th>Menú</th><th>Tarjeta</th><th>Total</th></tr></thead><tbody>${[...days].sort(([a],[b])=>a.localeCompare(b)).map(([d,c])=>`<tr><td>${escape(d)}</td><td>${c[0]}</td><td>${c[1]}</td><td>${c[0]+c[1]}</td></tr>`).join('')}</tbody></table></div></details>`).join('') +
        '<p><small>Fuente: analytics_eventos · tipo click · etiquetas ruta_cafe_menu y ruta_cafe_tarjeta. Solo se muestran días con registros. El JSON conserva identificadores, fechas, rutas, sesiones y etiquetas para comprobar los conteos.</small></p><button type="button" id="ruta-export">Exportar trazabilidad JSON</button>';
      panel.querySelector('#ruta-export').addEventListener('click', () => {
        const url = URL.createObjectURL(new Blob([JSON.stringify({extraido_en:cutoff,fuente:'analytics_eventos',filtro:{tipo:'click',elementos:labels},total:rows.length,registros:rows},null,2)],{type:'application/json'}));
        const a = document.createElement('a'); a.href = url; a.download = 'lojanova-ruta-cafe-'+day(cutoff)+'.json'; a.click(); setTimeout(()=>URL.revokeObjectURL(url),1000);
      });
      status.textContent = `Actualizado: ${new Intl.DateTimeFormat('es-EC',{timeZone:'America/Guayaquil',dateStyle:'medium',timeStyle:'short'}).format(new Date(cutoff))} · ${num(rows.length)} registros comprobados.`;
      loaded = true;
    } catch (e) {status.textContent = e.name === 'AbortError' ? 'La consulta tardó demasiado. Vuelve a actualizar.' : (e.message || 'No se pudieron cargar los clics.');}
    finally {clearTimeout(timer); busy = false; button.disabled = false;}
  }
  button.addEventListener('click', load);
  document.querySelector('[data-view="analiticas"]')?.addEventListener('click', () => {if (!loaded) load();});
})();
