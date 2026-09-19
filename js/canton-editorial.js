(function(){
 'use strict';
 const root=document.querySelector('.canton-page'),core=window.LojanovaTerritorio;if(!root||!core)return;
 const name=root.dataset.canton, status=document.getElementById('ct-status');
 const products=document.getElementById('ct-products');
 const chips=document.getElementById('ct-chips'),retry=document.getElementById('ct-retry');
 let catalog=null,pending=false,category='',page=0;
 const size=24;
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 function picture(path,type,label){
   let url='';
   // No fotografías genéricas que puedan confundirse con un producto real.
   if(path)try{const candidate=new URL(urlImagen(path,type),location.href);if(['https:','http:'].includes(candidate.protocol))url=candidate.href;}catch(_){}
   return `<div class="ct-thumb"><span>${url?'':'Sin imagen disponible'}</span>${url?`<img src="${esc(url)}" alt="${esc(label)}" loading="lazy" decoding="async">`:''}</div>`;
 }
 function productCard(p){
   const owner=catalog.producerById.get(p.emprendedor_id),brand=owner?.emprendimiento||owner?.nombre||'';
   const body=picture(p.imagen_principal_url,'product',p.nombre)+`<div class="ct-card-body"><span class="ct-category">${esc(catalog.categories.get(p.categoria_id)?.nombre||'')}</span><h3>${esc(p.nombre)}</h3>${brand?`<span class="ct-brand">${esc(brand)}</span>`:''}<span class="ct-card-cta">${p.slug?'Descubrir producto ↗':'Producto publicado'}</span></div>`;
   return p.slug?`<a class="ct-card" href="producto.html?slug=${encodeURIComponent(p.slug)}">${body}</a>`:`<article class="ct-card">${body}</article>`;
 }
 function pager(target,current,total){
   const el=document.getElementById('ct-pager-'+target);el.hidden=total<=size;
   el.innerHTML=total>size?`<button type="button" data-page="${target}" data-step="-1" ${current===0?'disabled':''}>← Anterior</button><span>${current*size+1}–${Math.min(total,(current+1)*size)} de ${total}</span><button type="button" data-page="${target}" data-step="1" ${(current+1)*size>=total?'disabled':''}>Siguiente →</button>`:'';
 }
 function render(){
   const result=catalog.select(name,category);
   const names=result.categories.map(c=>c.nombre);
   const categories=names.length ? ' Sus categorías incluyen '+names.join(', ')+'.' : '';
   document.getElementById('ct-production').textContent=result.allProducts.length
     ? 'La oferta publicada de '+name+' en Lojanova reúne '+result.allProducts.length+' productos.'+categories+' Explora el catálogo para conocer cada propuesta y su marca de origen.'
     : 'Este espacio reunirá los productos publicados de '+name+' en Lojanova. Aún no hay oferta registrada para mostrar; esto no significa que el cantón carezca de actividad productiva.';

   page=Math.min(page,Math.max(0,Math.ceil(result.products.length/size)-1));
   document.getElementById('ct-total-products').textContent=result.allProducts.length;
   document.getElementById('ct-total-producers').textContent=result.producers.length;
   document.getElementById('ct-total-categories').textContent=result.categories.length;
   chips.innerHTML=result.categories.length?`<button type="button" data-category="" aria-pressed="${!category}">Todos los productos</button>`+result.categories.map(c=>`<button type="button" data-category="${esc(c.id)}" aria-pressed="${c.id===category}">${esc(c.nombre)}</button>`).join(''):'';
   products.innerHTML=result.products.slice(page*size,(page+1)*size).map(productCard).join('')||'<p class="ct-empty">Aún no hay productos publicados para '+esc(name)+'. Cuando se incorporen a Lojanova, aparecerán aquí.</p>';
   pager('products',page,result.products.length);
   status.textContent=`${result.products.length} productos${category?' en esta categoría':''}. Información publicada consultada en Lojanova.`;
   retry.hidden=true;
 }
 async function load(){
   if(pending)return;pending=true;retry.hidden=true;
   document.getElementById('ct-offer').setAttribute('aria-busy','true');
   status.textContent='Consultando la oferta publicada…';
   const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),30000);
   try{catalog=core.index(await core.load(db,controller.signal));render();}
   catch(error){
     controller.abort();
     status.textContent='No pudimos completar la consulta. No se muestran cifras parciales.';retry.hidden=false;document.getElementById('ct-production').textContent='La oferta publicada no pudo consultarse en este momento. Puedes volver a intentarlo más abajo.';
     products.innerHTML='<p class="ct-empty">La información no está disponible en este momento. Intenta nuevamente.</p>';
     ['products','producers','categories'].forEach(key=>document.getElementById('ct-total-'+key).textContent='—');
   }finally{clearTimeout(timeout);pending=false;document.getElementById('ct-offer').removeAttribute('aria-busy');}
 }
 chips.addEventListener('click',event=>{
   const button=event.target.closest('[data-category]');if(!button||!catalog)return;
   category=button.dataset.category;page=0;render();
   [...chips.querySelectorAll('button')].find(b=>b.dataset.category===category)?.focus({preventScroll:true});
 });
 root.addEventListener('click',event=>{
   const button=event.target.closest('[data-page]');if(!button||!catalog||button.disabled)return;
   const target=button.dataset.page;
   if(target!=='products')return;page+=Number(button.dataset.step);
   render();const grid=products;
   grid.focus({preventScroll:true});grid.scrollIntoView({block:'start',behavior:'auto'});
 });
 function imageError(img){
   if(img.tagName!=='IMG')return;
   img.hidden=true;
   if(img.closest('.ct-thumb'))img.parentElement.querySelector('span').textContent='Imagen no disponible';
   else if(img.closest('.ct-visual')){
     img.closest('figure').querySelector('.ct-no-photo').hidden=false;
     img.closest('figure').querySelector('figcaption').textContent='Cantón '+name+' · Provincia de Loja';
   }
 }
 root.addEventListener('error',event=>imageError(event.target),true);
 root.querySelectorAll('img').forEach(img=>{if(img.complete&&!img.naturalWidth)imageError(img);});
 retry.addEventListener('click',load);
 load();
})();
