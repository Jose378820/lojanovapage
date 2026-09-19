(function(){
 'use strict';
 const root=document.getElementById('lojanova-1616');if(!root)return;
 const hover=root.querySelector('#tv-hover');
 if(matchMedia('(max-width:600px)').matches)root.querySelector('.tv-directory').open=true;
 root.querySelectorAll('.tv-region').forEach(region=>{
   const show=()=>{hover.textContent=region.dataset.canton+' ↗';};
   const hide=()=>{hover.textContent='Elige tu próximo destino ↗';};
   region.addEventListener('pointerenter',show);region.addEventListener('focus',show);
   region.addEventListener('pointerleave',hide);region.addEventListener('blur',hide);
 });
 if('IntersectionObserver' in window&&!matchMedia('(prefers-reduced-motion: reduce)').matches){
   const observer=new IntersectionObserver(entries=>{entries.forEach(entry=>{
     if(entry.isIntersecting){entry.target.classList.add('tv-arrive');observer.unobserve(entry.target);}
   });},{threshold:.08});
   root.querySelectorAll('.tv-heading,.tv-stage').forEach(el=>observer.observe(el));
 }
})();
