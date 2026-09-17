(function () {
  'use strict';
  const root = document.getElementById('lojanova-1616'), core = window.LojanovaTerritorio;
  if (!root || !core) return;
  const content = root.querySelector('#territorio-content'), status = root.querySelector('#territorio-status');
  const select = root.querySelector('#territorio-select'), hover = root.querySelector('#territorio-hover');
  const initial = content.innerHTML;
  let catalog = null, pending = null, selected = '', category = '', productPage = 0, producerPage = 0, browseProducts = false, browseProducers = false;
  const names = new Set([...select.options].map(o=>o.value).filter(Boolean));
  const esc = v => String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const n = v => Number(v).toLocaleString('es-EC');
  const quantity = (v,singular,plural) => `${n(v)} ${v===1?singular:plural}`;
  function image(path,type,name) {
    let url = '';
    try {const candidate=new URL(urlImagen(path,type),location.href);if (['https:','http:'].includes(candidate.protocol)) url=candidate.href;} catch (_) {}
    return `<div class="thumb">${url?`<img src="${esc(url)}" alt="${esc(name)}" loading="lazy" decoding="async">`:''}</div>`;
  }
  function productCard(p) {
    const e=catalog.producerById.get(p.emprendedor_id), brand=e?.emprendimiento||e?.nombre||'';
    const body=`${image(p.imagen_principal_url,'product',p.nombre)}<div class="card-body"><div class="card-meta">${esc(catalog.categories.get(p.categoria_id)?.nombre||'')}</div><h4>${esc(p.nombre)}</h4>${brand?`<span class="territorio-brand">${esc(brand)}</span>`:''}</div>`;
    return p.slug?`<a class="card-producto" data-tilt-ready="true" href="producto.html?slug=${encodeURIComponent(p.slug)}" aria-label="Ver producto: ${esc(p.nombre)}">${body}</a>`:`<article class="card-producto" data-tilt-ready="true">${body}</article>`;
  }
  function producerCard(e) {
    const name=e.emprendimiento||e.nombre;
    return `<a class="card-emp" href="marca.html?id=${encodeURIComponent(e.id)}" aria-label="Conocer a ${esc(name)}">${image(e.foto_url,'producer',name)}<div class="card-body"><h4>${esc(name)}</h4><span class="card-meta">${esc(catalog.producerCategory(e.id))}</span></div></a>`;
  }
  function pager(type,page,size,total) {
    return `<div class="territorio-pager"><button type="button" data-page="${type}" data-step="-1" ${page===0?'disabled':''} aria-label="${type==='productos'?'Productos':'Productores'} anteriores">← Anterior</button><span>${n(page*size+1)}–${n(Math.min(total,(page+1)*size))} de ${n(total)}</span><button type="button" data-page="${type}" data-step="1" ${(page+1)*size>=total?'disabled':''} aria-label="${type==='productos'?'Productos':'Productores'} siguientes">Siguiente →</button></div>`;
  }
  function render(animate=true) {
    root.querySelectorAll('[data-canton]').forEach(el=>el.setAttribute('aria-pressed',String(el.dataset.canton===selected)));
    select.value=selected; hover.textContent=selected||'Selecciona un cantón';
    if (!selected) {content.innerHTML=initial;status.textContent='Selecciona un cantón para descubrir su oferta.';return;}
    if (!catalog) {
      content.innerHTML='<h3 id="territorio-panel-title">'+esc(selected)+'</h3><div aria-hidden="true" class="territorio-skeleton"></div><div aria-hidden="true" class="territorio-skeleton"></div><div aria-hidden="true" class="territorio-skeleton"></div>';
      return;
    }
    const result=catalog.select(selected,category), title=esc(selected);
    productPage=Math.min(productPage,Math.max(0,Math.ceil(result.products.length/3)-1));
    producerPage=Math.min(producerPage,Math.max(0,Math.ceil(result.producers.length/2)-1));
    const head=`<div class="territorio-canton-head"><h3 id="territorio-panel-title">${title}</h3><button class="territorio-reset" type="button" data-reset aria-label="Volver a explorar los cantones">×</button></div>`;
    if (!result.canton) {
      content.innerHTML=head+'<p class="territorio-empty">Estamos incorporando nuevos productores y productos de este cantón.</p>';
      status.textContent=`${selected}: aún sin oferta vinculada en la plataforma.`;
      return;
    }
    content.innerHTML=head+`<p class="territorio-counts">${quantity(result.allProducts.length,'producto','productos')} · ${quantity(result.producers.length,'productor','productores')} · ${quantity(result.categories.length,'categoría','categorías')}</p>`+
      (result.categories.length?`<h4 class="territorio-label">Categorías</h4><div class="territorio-chips" role="group" aria-label="Filtrar productos por categoría"><button type="button" class="territorio-chip" data-category="" aria-pressed="${!category}">Todos</button>${result.categories.map(c=>`<button type="button" class="territorio-chip" data-category="${esc(c.id)}" aria-pressed="${c.id===category}">${esc(c.nombre)}</button>`).join('')}</div>`:'')+
      (result.allProducts.length?`<h4 class="territorio-label">Productos de ${title}</h4><div class="territorio-products">${result.products.slice(productPage*3,productPage*3+3).map(productCard).join('')||'<p class="territorio-empty">No hay productos en esta categoría.</p>'}</div>${result.products.length>3?(browseProducts?pager('productos',productPage,3,result.products.length):`<button type="button" class="territorio-more" data-browse="productos">Ver todos los productos de ${title} →</button>`):''}`:'<p class="territorio-empty">Estamos incorporando nuevos productores y productos de este cantón.</p>')+
      (result.producers.length?`<h4 class="territorio-label">Productores de ${title}</h4><div class="territorio-producers">${result.producers.slice(producerPage*2,producerPage*2+2).map(producerCard).join('')}</div>${result.producers.length>2?(browseProducers?pager('productores',producerPage,2,result.producers.length):`<button type="button" class="territorio-more" data-browse="productores">Ver todos los productores de ${title} →</button>`):''}`:'');
    status.textContent=`${selected}: ${quantity(result.allProducts.length,'producto','productos')} · ${quantity(result.producers.length,'productor','productores')}.`;
    if (category) status.textContent+=` Filtro: ${catalog.categories.get(category)?.nombre||''}, ${n(result.products.length)} productos.`;
    if (animate&&!matchMedia('(prefers-reduced-motion: reduce)').matches) {
      content.classList.remove('territorio-swap'); void content.offsetWidth; content.classList.add('territorio-swap');
    }
  }
  function ensureData() {
    if (catalog) return Promise.resolve(catalog);
    if (pending) return pending;
    root.querySelector('.territorio-panel').setAttribute('aria-busy','true');
    status.textContent='Cargando la oferta publicada…';
    if (selected) content.innerHTML='<h3 id="territorio-panel-title">'+esc(selected)+'</h3><div aria-hidden="true" class="territorio-skeleton"></div><div aria-hidden="true" class="territorio-skeleton"></div><div aria-hidden="true" class="territorio-skeleton"></div>';
    const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),30000);
    pending=core.load(db,controller.signal).then(data=>{catalog=core.index(data);render();return catalog;}).catch(error=>{
      controller.abort();
      content.innerHTML=`<h3 id="territorio-panel-title">${esc(selected||'Explora los 16 cantones')}</h3><p class="territorio-empty">No pudimos cargar la oferta en este momento.</p><button type="button" class="territorio-retry" data-retry>Volver a intentar</button>`;
      status.textContent=error.name==='AbortError'?'La conexión tardó demasiado. Vuelve a intentarlo.':'No se completó la consulta. Puedes volver a intentarlo.';
      return null;
    }).finally(()=>{clearTimeout(timeout);pending=null;root.querySelector('.territorio-panel').removeAttribute('aria-busy');});
    return pending;
  }
  function choose(name) {
    if (name&&!names.has(name)) return;
    selected=name;category='';productPage=producerPage=0;browseProducts=browseProducers=false;
    render();
    if (name) ensureData();
  }
  select.addEventListener('change',()=>choose(select.value));
  root.addEventListener('click',event=>{
    const region=event.target.closest('[data-canton]');if(region){choose(region.dataset.canton);return;}
    const button=event.target.closest('button');if(!button)return;
    if (button.hasAttribute('data-reset')) {choose('');select.focus();}
    else if (button.hasAttribute('data-retry')) ensureData();
    else if (button.hasAttribute('data-category')) {
      category=button.dataset.category;productPage=0;browseProducts=false;render(false);
      [...root.querySelectorAll('[data-category]')].find(el=>el.dataset.category===category)?.focus({preventScroll:true});
    } else if (button.dataset.browse) {
      if(button.dataset.browse==='productos')browseProducts=true;else browseProducers=true;
      render(false);root.querySelector(`[data-page="${button.dataset.browse}"][data-step="1"]`)?.focus({preventScroll:true});
    } else if (button.dataset.page) {
      if(button.dataset.page==='productos')productPage+=Number(button.dataset.step);else producerPage+=Number(button.dataset.step);
      render(false);
      const next=root.querySelector(`[data-page="${button.dataset.page}"][data-step="${button.dataset.step}"]`);
      (next?.disabled?root.querySelector(`[data-page="${button.dataset.page}"]:not(:disabled)`):next)?.focus({preventScroll:true});
    }
  });
  root.querySelectorAll('[data-canton]').forEach(region=>{
    const show=()=>{hover.textContent=region.dataset.canton;};
    region.addEventListener('pointerenter',show);region.addEventListener('focus',show);
    region.addEventListener('pointerleave',()=>{hover.textContent=selected||'Selecciona un cantón';});
    region.addEventListener('blur',()=>{hover.textContent=selected||'Selecciona un cantón';});
    region.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();choose(region.dataset.canton);}});
  });
  content.addEventListener('error',event=>{if(event.target.tagName==='IMG')event.target.style.visibility='hidden';},true);
  if ('IntersectionObserver' in window) {
    root.classList.add('t-preparado');
    const reveal=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting)){root.classList.add('t-visible');reveal.disconnect();}},{threshold:0.08});
    reveal.observe(root);
    const preload=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting)){ensureData();preload.disconnect();}},{rootMargin:'350px'});
    preload.observe(root);
  } else {ensureData();}
})();
