/* Lojanova: derived, read-only historical metrics. Never writes to Supabase.
   A pageview is a stored event, not a person. Calendar boundaries: Ecuador. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.LojanovaMetrics = Object.freeze(api);
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const VERSION = '20260912.1';
  const TIME_ZONE = 'America/Guayaquil';
  const dateParts = new Intl.DateTimeFormat('en-CA', {timeZone: TIME_ZONE, year:'numeric',month:'2-digit',day:'2-digit'});
  const hourParts = new Intl.DateTimeFormat('en-GB', {timeZone: TIME_ZONE, hour:'2-digit',hourCycle:'h23'});
  function day(value) {
    const date = new Date(value);
    if (!Number.isFinite(date.getTime())) throw new Error('Fecha inválida en el histórico. No se publicaron totales parciales.');
    const p = Object.fromEntries(dateParts.formatToParts(date).map(x=>[x.type,x.value]));
    return `${p.year}-${p.month}-${p.day}`;
  }
  function numeric(value, max) {
    if (value === null || value === undefined || !/^[0-9]+(\.[0-9]+)?$/.test(String(value))) return null;
    return Math.min(Number(value), max);
  }
  function label(value) { return value === null || value === undefined || value === '' ? 'No registrado' : String(value); }
  function group(rows, key, unique = false) {
    const map = new Map();
    for (const r of rows) {
      const k = label(key(r));
      if (!map.has(k)) map.set(k, unique ? new Set() : 0);
      if (unique) { if (r.session_id) map.get(k).add(r.session_id); }
      else map.set(k, map.get(k)+1);
    }
    return [...map].map(([name,v])=>({name,count:unique?v.size:v})).sort((a,b)=>b.count-a.count || a.name.localeCompare(b.name));
  }
  function product(r) {
    const path = String(r.pagina||'');
    // Support existing clean URLs, .html and the historical project prefix.
    if (!/(?:^|\/)producto(?:\.html)?\?/.test(path)) return null;
    return new URLSearchParams(path.split('?')[1]).get('slug');
  }
  function sessionStats(rows) {
    const sessions = new Map();
    for (const r of rows) {
      if (!r.session_id) continue;
      if (!sessions.has(r.session_id)) sessions.set(r.session_id,{id:r.session_id,views:0,interacted:false,pages:new Map(),first:r.creado_en,last:r.creado_en});
      const s = sessions.get(r.session_id);
      if (new Date(r.creado_en)<new Date(s.first)) s.first=r.creado_en;
      if (new Date(r.creado_en)>new Date(s.last)) s.last=r.creado_en;
      if (r.tipo==='pageview') s.views++;
      if (r.tipo!=='engagement') continue;
      const seconds = numeric(r.metadata?.tiempo_en_pagina,1800);
      const scroll = numeric(r.metadata?.profundidad_scroll,100);
      if (!s.pages.has(r.pagina)) s.pages.set(r.pagina,{seconds:null,scroll:null});
      const p=s.pages.get(r.pagina);
      if(seconds!==null) p.seconds=Math.max(p.seconds??0,seconds);
      if(scroll!==null) p.scroll=Math.max(p.scroll??0,scroll);
      if((seconds??0)>=10 || (scroll??0)>=50) s.interacted=true;
    }
    // Exclude orphan engagement-only sessions from audience and duration KPIs.
    return [...sessions.values()].filter(s=>s.views>0).map(s=>{
      const seconds=[...s.pages.values()].map(p=>p.seconds).filter(x=>x!==null);
      const scroll=[...s.pages.values()].map(p=>p.scroll).filter(x=>x!==null);
      return {id:s.id,views:s.views,first:s.first,last:s.last,bounce:s.views===1&&!s.interacted?1:0,
        duration:seconds.length?seconds.reduce((a,b)=>a+b,0):null,
        scrollSum:scroll.reduce((a,b)=>a+b,0),scrollPairs:scroll.length,
        measured:seconds.length?1:0};
    });
  }
  function summarize(rows) {
    const views=rows.filter(r=>r.tipo==='pageview');
    const sessions=sessionStats(rows);
    const measured=sessions.filter(s=>s.measured);
    const scrollPairs=sessions.reduce((n,s)=>n+s.scrollPairs,0);
    const clicks=rows.filter(r=>r.tipo==='click');
    const searches=rows.filter(r=>r.tipo==='busqueda');
    const filters=rows.filter(r=>r.tipo==='filtro');
    const source=r=>r.utm_source || r.referrer_dominio || r.referrer || 'Directo / no registrado';
    const counts={events:rows.length,views:views.length,sessions:sessions.length,clicks:clicks.length,searches:searches.length,filters:filters.length,
      bounces:sessions.reduce((n,s)=>n+s.bounce,0),measured:measured.length,
      seconds:measured.reduce((n,s)=>n+s.duration,0),scrollPairs,scrollSum:sessions.reduce((n,s)=>n+s.scrollSum,0),
      missingSession:views.filter(r=>!r.session_id).length};
    return {...counts, bounceRate:counts.sessions?counts.bounces/counts.sessions:null,
      averageSeconds:counts.measured?counts.seconds/counts.measured:null,
      averageScroll:scrollPairs?counts.scrollSum/scrollPairs:null,
      sessionDetails:sessions,
      dimensions:{pages:group(views,r=>r.pagina),products:group(views.filter(r=>product(r)),product),
        countries:group(views,r=>r.pais,true),cities:group(views,r=>`${label(r.ciudad)} · ${label(r.pais)}`,true),
        sources:group(views,source),devices:group(views,r=>r.dispositivo),browsers:group(views,r=>r.navegador),systems:group(views,r=>r.so),
        languages:group(views,r=>r.idioma),campaigns:group(views,r=>r.utm_campaign),
        hours:group(views,r=>`${hourParts.format(new Date(r.creado_en))}:00`),
        searches:group(searches,r=>r.metadata?.termino),clicks:group(clicks,r=>r.metadata?.elemento),
        filters:group(filters,r=>`${label(r.metadata?.filtro)}: ${label(r.metadata?.valor)}`)}};
  }
  function analyze(records, extractedAt) {
    const ids=new Set(),dates=new Map();
    for (const r of records) {
      if(!r.id || ids.has(r.id)) throw new Error('Identificadores ausentes o repetidos: se detuvo el cálculo.');
      ids.add(r.id); dates.set(r.id,day(r.creado_en));
    }
    const sorted=records.slice().sort((a,b)=>new Date(a.creado_en)-new Date(b.creado_en)||a.id.localeCompare(b.id));
    const byMonth=new Map(),byDay=new Map();
    for(const r of sorted) {const d=dates.get(r.id),m=d.slice(0,7);if(!byMonth.has(m))byMonth.set(m,[]);byMonth.get(m).push(r);if(!byDay.has(d))byDay.set(d,[]);byDay.get(d).push(r);}
    const months=[...byMonth].map(([month,rows])=>{
      const endDay=Math.min(day(extractedAt).startsWith(month)?Number(day(extractedAt).slice(8)):31,
        new Date(Number(month.slice(0,4)),Number(month.slice(5,7)),0).getDate());
      const days=Array.from({length:endDay},(_,i)=>{const date=`${month}-${String(i+1).padStart(2,'0')}`;return {date,...summarize(byDay.get(date)||[])};});
      return {month,...summarize(rows),days};
    });
    const summary=summarize(sorted);
    if(months.reduce((n,m)=>n+m.views,0)!==summary.views || months.some(m=>m.days.reduce((n,d)=>n+d.views,0)!==m.views)) throw new Error('Los totales diarios y mensuales no concuerdan.');
    return {version:VERSION,timeZone:TIME_ZONE,extractedAt,first:sorted[0]?.creado_en??null,last:sorted.at(-1)?.creado_en??null,
      lastPageview:sorted.filter(r=>r.tipo==='pageview').at(-1)?.creado_en??null,summary,months};
  }
  async function fetchComplete(db,onProgress=()=>{}) {
    async function run(query) {
      const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),30000);
      try {const result=await query.abortSignal(controller.signal);if(result.error)throw new Error(result.error.message);return result;}
      finally {clearTimeout(timer);}
    }
    const {data:auth,error:authError}=await db.auth.getSession();
    if(authError||!auth?.session)throw new Error('La sesión ha caducado. Vuelve a ingresar al administrador.');
    const admin=await run(db.from('admins').select('id').eq('id',auth.session.user.id).maybeSingle());
    if(!admin.data)throw new Error('Esta consulta requiere acceso de administrador.');
    const latest=await run(db.from('analytics_eventos').select('creado_en').order('creado_en',{ascending:false}).limit(1));
    if(!latest.data.length)return {records:[],expected_events:0,expected_pageviews:0,extracted_at:new Date().toISOString(),source:'public.analytics_eventos',project:'pfdyxxavadiyoaxduibp'};
    const cutoff=latest.data[0].creado_en;
    const countQuery=()=>db.from('analytics_eventos').select('id',{count:'exact',head:true}).lte('creado_en',cutoff);
    const total=await run(countQuery());
    if(!Number.isSafeInteger(total.count)||total.count>500000)throw new Error('El histórico requiere una exportación de servidor. No se mostrarán cifras incompletas.');
    const records=[];let cursor=null;
    // Keyset pagination respects server caps smaller than the requested page size.
    while(records.length<total.count) {
      let q=db.from('analytics_eventos').select('*').lte('creado_en',cutoff).order('id',{ascending:true}).limit(500);
      if(cursor) q=q.gt('id',cursor);
      const page=await run(q);
      if(!page.data?.length)throw new Error('La descarga quedó incompleta. Intenta actualizar nuevamente.');
      records.push(...page.data);cursor=page.data.at(-1).id;
      onProgress(records.length,total.count);
    }
    const finalCount=await run(countQuery());
    const pageviews=await run(countQuery().eq('tipo','pageview'));
    if(records.length!==total.count||finalCount.count!==total.count||new Set(records.map(r=>r.id)).size!==records.length||records.filter(r=>r.tipo==='pageview').length!==pageviews.count)
      throw new Error('El histórico cambió durante la lectura. Actualiza otra vez para obtener un corte consistente.');
    return {source:'public.analytics_eventos',project:'pfdyxxavadiyoaxduibp',extracted_at:new Date().toISOString(),cutoff,expected_events:total.count,expected_pageviews:pageviews.count,records};
  }
  return {VERSION,TIME_ZONE,day,numeric,analyze,summarize,sessionStats,fetchComplete};
});
