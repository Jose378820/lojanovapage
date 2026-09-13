(function () {
  'use strict';
  const core=window.LojanovaMetrics, root=document.getElementById('view-globales');
  if(!core||!root)return;
  const content=document.getElementById('vg-content'),status=document.getElementById('vg-status'),refresh=document.getElementById('vg-refresh');
  let snapshot=null,report=null,busy=false,generation=0;
  const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const n=value=>Number(value).toLocaleString('es-EC');
  const stamp=value=>value?new Intl.DateTimeFormat('es-EC',{timeZone:core.TIME_ZONE,dateStyle:'medium',timeStyle:'short'}).format(new Date(value)):'Sin registros';
  const monthName=m=>new Intl.DateTimeFormat('es-EC',{timeZone:'UTC',month:'long',year:'numeric'}).format(new Date(`${m}-01T12:00:00Z`));
  const pct=v=>v===null?'Sin medición':`${(v*100).toLocaleString('es-EC',{maximumFractionDigits:1})}%`;
  const seconds=v=>v===null?'Sin medición':`${v.toLocaleString('es-EC',{maximumFractionDigits:1})} s`;
  const covered=d=>!report.first||d.date>=core.day(report.first);
  const coverage=d=>!covered(d)?'Antes del primer registro':d.date===core.day(report.extractedAt)?'Día en curso':d.events?'Con registros':'Sin registros';
  function download(name,text,type){
    const url=URL.createObjectURL(new Blob([text],{type}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  function table(headers,rows){return `<div class="vg-table-scroll" tabindex="0" role="region" aria-label="Tabla desplazable"><table><thead><tr>${headers.map(h=>`<th scope="col">${escape(h)}</th>`).join('')}</tr></thead><tbody>${rows.length?rows.map(r=>`<tr>${r.map(x=>`<td>${escape(x)}</td>`).join('')}</tr>`).join(''):`<tr><td colspan="${headers.length}">Sin registros en este período</td></tr>`}</tbody></table></div>`;}
  const dims={pages:['Páginas visitadas','Ruta original','Visitas'],products:['Productos vistos','Identificador de producto','Visitas'],countries:['Países','País','Sesiones'],cities:['Ciudades','Ciudad y país','Sesiones'],sources:['Origen del tráfico','Origen registrado','Visitas'],devices:['Dispositivos','Dispositivo','Visitas'],browsers:['Navegadores','Navegador','Visitas'],systems:['Sistemas operativos','Sistema','Visitas'],languages:['Idiomas','Idioma','Visitas'],campaigns:['Campañas','Campaña','Visitas'],hours:['Horas de actividad','Hora de Ecuador','Visitas'],searches:['Búsquedas','Término original','Eventos'],clicks:['Clics registrados','Elemento','Eventos'],filters:['Filtros utilizados','Filtro y valor','Eventos']};
  function kpis(s){return `<div class="vg-kpis">${[['Visitas registradas',n(s.views),'Eventos de vista de página'],['Sesiones identificadas',n(s.sessions),'No equivale a personas únicas'],['Clics registrados',n(s.clicks),'Acciones que recibió el sistema'],['Tiempo estimado / sesión',s.averageSeconds===null?'Sin medición':`${Math.round(s.averageSeconds)} s`,`${n(s.measured)} sesiones con tiempo medido`]].map(([label,value,help])=>`<article><span>${label}</span><strong>${value}</strong><small>${help}</small></article>`).join('')}</div>`;}
  function showMonth(m){
    const daily=m.days.map(d=>[d.date,...[d.views,d.sessions,d.clicks,d.searches,d.filters,d.events].map(v=>covered(d)?n(v):'—'),coverage(d)]);
    const measured=m.days.filter(covered).map(d=>[d.date,seconds(d.averageSeconds),n(d.measured),pct(d.sessions?d.measured/d.sessions:null),pct(d.bounceRate),pct(d.averageScroll===null?null:d.averageScroll/100),n(d.scrollPairs)]);
    const indicators=[['Visitas registradas',n(m.views),'Conteo de eventos pageview'],['Sesiones identificadas',n(m.sessions),'Identificadores distintos con visita en el mes; no suma de únicos diarios'],['Tiempo medio estimado',seconds(m.averageSeconds),`${n(m.seconds)} segundos / ${n(m.measured)} sesiones medidas`],['Cobertura del tiempo',pct(m.sessions?m.measured/m.sessions:null),`${n(m.measured)} sesiones medidas / ${n(m.sessions)} sesiones con visita`],['Rebote estimado',pct(m.bounceRate),`${n(m.bounces)} sesiones clasificadas como rebote / ${n(m.sessions)} sesiones`],['Scroll medio medido',pct(m.averageScroll===null?null:m.averageScroll/100),`${n(m.scrollSum)} puntos porcentuales / ${n(m.scrollPairs)} pares sesión-página medidos`],['Eventos conservados',n(m.events),'Todos los tipos de evento; no equivale a visitas'],['Diferencia entre visitas diarias y mensuales',n(m.days.reduce((sum,d)=>sum+d.views,0)-m.views),'Debe ser 0; comprobación contra los registros originales']];
    return `${kpis(m)}<div class="vg-secondary"><span>Rebote estimado: <b>${pct(m.bounceRate)}</b></span><span>Scroll medio medido: <b>${m.averageScroll===null?'Sin medición':Math.round(m.averageScroll)+'%'}</b></span><span>Eventos totales: <b>${n(m.events)}</b></span></div>
      <h3>Actividad diaria</h3>${table(['Día','Visitas','Sesiones','Clics','Búsquedas','Filtros','Eventos','Cobertura'],daily)}
      <details class="vg-method"><summary>Indicadores del mes y comprobación de totales</summary><p>Los meses inicial y actual tienen cobertura parcial. El cierre se calcula con los registros conservados, sin inventar datos faltantes.</p>${table(['Indicador','Valor','Cálculo verificable'],indicators)}</details>
      <details class="vg-method"><summary>Medición diaria de tiempo, rebote y scroll</summary>${table(['Día','Tiempo medio','Sesiones medidas','Cobertura del tiempo','Rebote estimado','Scroll medio','Pares medidos'],measured)}</details>
      <div class="vg-dimensions">${Object.entries(dims).map(([key,[title,name,count]])=>`<details class="vg-dimension"><summary>${title}<span>${n(m.dimensions[key].length)} categorías</span></summary>${table([name,count],m.dimensions[key].map(d=>[d.name,n(d.count)]))}</details>`).join('')}</div>`;
  }
  function render(){
    const s=report.summary;
    content.innerHTML=`${kpis(s)}<div class="vg-source"><div><strong>Desde el primer registro conservado</strong><p>${stamp(report.first)} — ${stamp(report.last)} · Hora de Ecuador</p><small>Fuente: public.analytics_eventos · ${n(s.events)} eventos comprobados por identificador. No se suman latidos ni interacciones como visitas.</small></div><div class="vg-actions"><button type="button" data-vg-export="json">Exportar histórico JSON</button><button type="button" data-vg-export="csv">Exportar días CSV</button></div></div>
      <div class="vg-note"><strong>Alcance del histórico</strong><p>Incluye todas las vistas de página conservadas en esta fuente, también sus rutas antiguas. No permite recuperar visitas nunca registradas ni separar retrospectivamente dominios que guardaron la misma ruta. Un día sin registros no demuestra ausencia de tráfico.</p></div>
      <div class="vg-months">${report.months.slice().reverse().map(m=>`<details class="vg-month" data-month="${m.month}"><summary><span class="vg-month-name">${escape(monthName(m.month))}<small>${m.month===core.day(report.extractedAt).slice(0,7)?'Mes en curso':m.month===core.day(report.first).slice(0,7)?'Inicio de la cobertura disponible':'Mes calendario'}</small></span><span><b>${n(m.views)}</b> visitas</span><span><b>${n(m.sessions)}</b> sesiones</span><span class="vg-chevron" aria-hidden="true">⌄</span></summary><div class="vg-month-body"></div></details>`).join('')}</div>
      <details class="vg-method"><summary>Cómo se calculan los indicadores y su trazabilidad</summary><p>Una visita es un registro con tipo pageview. Cada evento conserva su id, fecha original y ruta en la exportación JSON. Las sesiones son identificadores distintos con al menos una visita dentro del período; no se suman los únicos diarios para obtener los mensuales.</p><p>Tiempo estimado: suma del máximo registrado por sesión y página, limitado a 1.800 segundos por par; promedio solo de sesiones con medición. No se considera tiempo visible garantizado. Scroll: promedio de máximos por sesión y página con medición. Rebote estimado: sesión con una sola visita y sin engagement de 10 segundos o scroll de 50%. Estos cálculos mensuales no reemplazan los indicadores anteriores de 30 días.</p><p>Países y ciudades muestran sesiones por ubicación registrada, no personas verificadas; una sesión puede figurar en varias ubicaciones. La geolocalización es aproximada. Origen prioriza utm_source, referrer_dominio y referrer. Las rutas y términos se conservan sin fusionar ni corregir retroactivamente.</p><p>Exportación privada para administración. No subas los archivos históricos ni el Excel al repositorio público. Versión de cálculo: ${core.VERSION}.</p></details>`;
    content.querySelectorAll('.vg-month').forEach(el=>el.addEventListener('toggle',()=>{
      if(el.open&&!el.dataset.loaded){el.querySelector('.vg-month-body').innerHTML=showMonth(report.months.find(m=>m.month===el.dataset.month));el.dataset.loaded='true';}
    }));
    content.querySelectorAll('[data-vg-export]').forEach(el=>el.addEventListener('click',()=>{
      if(el.dataset.vgExport==='json')download(`lojanova-historico-${core.day(snapshot.extracted_at)}.json`,JSON.stringify(snapshot),'application/json');
      else {
        const rows=[['Fecha Ecuador','Visitas registradas','Sesiones identificadas','Clics','Busquedas','Filtros','Eventos','Tiempo medio segundos','Sesiones medidas','Cobertura tiempo fraccion','Rebote fraccion','Scroll porcentaje','Pares medidos','Cobertura del dia'],...report.months.flatMap(m=>m.days.map(d=>[d.date,...[d.views,d.sessions,d.clicks,d.searches,d.filters,d.events,d.averageSeconds,d.measured,d.sessions?d.measured/d.sessions:null,d.bounceRate,d.averageScroll,d.scrollPairs].map(v=>covered(d)?v??'':''),coverage(d)]))];
        const cell=v=>'"'+String(v).replace(/^[=+@-]/,"'$&").replace(/"/g,'""')+'"';
        download(`lojanova-diarias-${core.day(snapshot.extracted_at)}.csv`,'\ufeff'+rows.map(r=>r.map(cell).join(',')).join('\r\n'),'text/csv;charset=utf-8');
      }
    }));
  }
  async function load(){
    if(busy)return;busy=true;const request=++generation;refresh.disabled=true;root.setAttribute('aria-busy','true');
    status.className='vg-loading';status.textContent='Consultando y verificando todo el histórico…';
    try{
      const result=await core.fetchComplete(db,(loaded,total)=>{if(request===generation)status.textContent=`Leyendo histórico: ${n(loaded)} de ${n(total)} eventos…`;});
      if(request!==generation)return;
      const calculated=core.analyze(result.records,result.extracted_at);
      snapshot=result;report=calculated;render();status.className='vg-success';
      status.textContent=`Lectura completa: ${n(report.summary.events)} eventos · Consultado ${stamp(report.extractedAt)} · Última visita ${stamp(report.lastPageview)}`;
    }catch(error){
      if(request!==generation)return;
      snapshot=null;report=null;content.replaceChildren();status.className='vg-error';
      status.textContent=`No se pudo completar la lectura. ${error?.message||'Revisa tu conexión y vuelve a intentar.'}`;
    }finally{if(request===generation){busy=false;refresh.disabled=false;root.removeAttribute('aria-busy');}}
  }
  document.querySelector('[data-view="globales"]').addEventListener('click',()=>{if(!snapshot)load();});
  // Existing markup has a mobile menu button but no click handler in this build.
  const mobileToggle=document.getElementById('mobileToggle'), sidebar=document.getElementById('sidebar');
  if(mobileToggle&&sidebar){
    mobileToggle.setAttribute('aria-label','Abrir menú de administración');
    mobileToggle.setAttribute('aria-controls','sidebar');mobileToggle.setAttribute('aria-expanded','false');
    mobileToggle.addEventListener('click',()=>mobileToggle.setAttribute('aria-expanded',String(sidebar.classList.toggle('open'))));
    sidebar.querySelectorAll('[data-view]').forEach(button=>button.addEventListener('click',()=>mobileToggle.setAttribute('aria-expanded','false')));
  }
  refresh.addEventListener('click',load);
  db.auth.onAuthStateChange((event)=>{if(event==='SIGNED_OUT'){generation++;snapshot=null;report=null;busy=false;content.replaceChildren();status.textContent='Sesión cerrada.';refresh.disabled=false;root.removeAttribute('aria-busy');}});
})();
