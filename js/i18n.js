// =========================================================
// LOJANOVA — Selector de idioma (solo página principal)
// Traduce el contenido ESTÁTICO de index.html. El contenido
// dinámico (productos, emprendedores, noticias) viene de la
// base de datos en español y no se traduce automáticamente.
// =========================================================
(function(){
  const DICT = {
    "nav.sobre": { es: "Sobre el proyecto", en: "About" },
    "nav.categorias": { es: "Categorías", en: "Categories" },
    "nav.catalogo": { es: "Productos", en: "Products" },
    "nav.emprendedores": { es: "Emprendedores", en: "Entrepreneurs" },
    "nav.loja": { es: "Loja", en: "Loja" },
    "nav.noticias": { es: "Noticias", en: "News" },
    "nav.productores": { es: "Productores", en: "Producers" },
    "nav.cta": { es: "Explorar productos", en: "Explore products" },

    "hero.eyebrow": { es: "Plataforma Oficial · Prefectura de Loja", en: "Official Platform · Prefecture of Loja" },
    "hero.title1": { es: "Descubre la riqueza", en: "Discover the richness" },
    "hero.title2": { es: "productiva de Loja", en: "of Loja's production" },
    "hero.copy1": { es: "Una vitrina digital que conecta a productores, artesanos y emprendedores", en: "A digital showcase connecting producers, artisans and entrepreneurs" },
    "hero.copy2": { es: "con compradores nacionales e internacionales, promoviendo el desarrollo económico de Loja.", en: "with national and international buyers, driving Loja's economic development." },
    "hero.cta1": { es: "Explorar catálogo", en: "Explore catalog" },
    "hero.cta2": { es: "Conocer emprendedores", en: "Meet the entrepreneurs" },
    "hero.stat.cantones": { es: "Cantones", en: "Cantons" },
    "hero.stat.productos": { es: "Productos", en: "Products" },
    "hero.stat.emprendedores": { es: "Emprendedores", en: "Entrepreneurs" },
    "hero.stat.lojano": { es: "Lojano", en: "From Loja" },
    "hero.scroll": { es: "SCROLL", en: "SCROLL" },

    "about.eyebrow": { es: "Sobre el proyecto", en: "About the project" },
    "about.title": { es: "Una iniciativa de la Prefectura de Loja", en: "An initiative of the Prefecture of Loja" },
    "about.p1": { es: "Lojanova es la plataforma oficial que conecta la riqueza productiva de la provincia con compradores, distribuidores, turistas y público general, a nivel nacional e internacional.", en: "Lojanova is the official platform connecting the province's productive wealth with buyers, distributors, tourists and the general public, both nationally and internationally." },
    "about.p2": { es: "No es una tienda en línea: es una vitrina digital pensada para dar visibilidad a cada emprendedor y facilitar el contacto directo, fortaleciendo la economía local y proyectando el talento lojano al mundo.", en: "It's not an online store: it's a digital showcase designed to give visibility to each entrepreneur and enable direct contact, strengthening the local economy and projecting Loja's talent to the world." },
    "about.stat.emprendedores": { es: "Emprendedores", en: "Entrepreneurs" },
    "about.stat.productos": { es: "Productos", en: "Products" },
    "about.stat.cantones": { es: "Cantones participantes", en: "Participating cantons" },
    "about.stat.categorias": { es: "Categorías", en: "Categories" },

    "cat.eyebrow": { es: "Explora por categoría", en: "Browse by category" },
    "cat.title": { es: "La riqueza productiva de Loja", en: "Loja's productive richness" },
    "cat.copy": { es: "Desde el café de altura hasta la cerámica artesanal: doce categorías que reúnen lo mejor de la provincia.", en: "From high-altitude coffee to handcrafted ceramics: twelve categories bringing together the best of the province." },

    "catalogo.eyebrow": { es: "Catálogo", en: "Catalog" },
    "catalogo.title": { es: "Productos destacados", en: "Featured products" },
    "catalogo.copy": { es: "Un showroom permanente de la oferta productiva lojana, lista para conectar con el mundo.", en: "A permanent showroom of Loja's production, ready to connect with the world." },
    "catalogo.buscar": { es: "Buscar producto...", en: "Search product..." },
    "catalogo.opt.categoria": { es: "Categoría", en: "Category" },
    "catalogo.opt.canton": { es: "Cantón", en: "Canton" },
    "catalogo.opt.tipo": { es: "Tipo de emprendimiento", en: "Business type" },
    "catalogo.opt.export": { es: "Producto de exportación", en: "Export product" },
    "catalogo.opt.artesanal": { es: "Producto artesanal", en: "Artisanal product" },

    "emp.eyebrow": { es: "Rostros de Lojanova", en: "The faces of Lojanova" },
    "emp.title": { es: "Emprendedores lojanos", en: "Entrepreneurs from Loja" },
    "emp.copy": { es: "Historias de esfuerzo, tradición e innovación detrás de cada producto.", en: "Stories of hard work, tradition and innovation behind every product." },

    "loja.eyebrow": { es: "La provincia", en: "The province" },
    "loja.title": { es: "16 cantones, una sola tierra fértil", en: "16 cantons, one fertile land" },
    "loja.copy": { es: "Loja combina bosques secos, valles andinos y páramos australes: una geografía diversa que da origen a productos igual de diversos, desde el café orgánico hasta las artesanías en cerámica.", en: "Loja blends dry forests, Andean valleys and southern páramos: a diverse geography giving rise to equally diverse products, from organic coffee to ceramic crafts." },

    "ben.eyebrow": { es: "Por qué Lojanova", en: "Why Lojanova" },
    "ben.title": { es: "Beneficios de comprar lojano", en: "Benefits of buying from Loja" },
    "ben.1.title": { es: "Productos locales", en: "Local products" },
    "ben.1.copy": { es: "Origen verificado, directo de la provincia de Loja.", en: "Verified origin, straight from the province of Loja." },
    "ben.2.title": { es: "Calidad garantizada", en: "Guaranteed quality" },
    "ben.2.copy": { es: "Emprendedores comprometidos con procesos de calidad.", en: "Entrepreneurs committed to quality processes." },
    "ben.3.title": { es: "Contacto directo", en: "Direct contact" },
    "ben.3.copy": { es: "Habla directamente con quien produce, sin intermediarios.", en: "Talk directly with the producer, no middlemen." },
    "ben.4.title": { es: "Economía local", en: "Local economy" },
    "ben.4.copy": { es: "Cada contacto impulsa el desarrollo de la provincia.", en: "Every connection drives the province's development." },
    "ben.5.title": { es: "Proyección internacional", en: "International reach" },
    "ben.5.copy": { es: "Un puente entre Loja y mercados de todo el mundo.", en: "A bridge between Loja and markets around the world." },

    "news.eyebrow": { es: "Agenda", en: "Agenda" },
    "news.title": { es: "Noticias y eventos", en: "News and events" },
    "news.copy": { es: "Ferias, ruedas de negocio, capacitaciones y convocatorias para emprendedores lojanos.", en: "Fairs, business roundtables, training sessions and open calls for Loja entrepreneurs." },

    "ctaf.title": { es: "¿Eres un emprendedor lojano?", en: "Are you an entrepreneur from Loja?" },
    "ctaf.copy": { es: "Súmate a Lojanova y lleva tus productos a nuevos mercados nacionales e internacionales.", en: "Join Lojanova and take your products to new national and international markets." },
    "ctaf.btn": { es: "Quiero sumarme", en: "Join now" },

    "footer.tagline": { es: "Iniciativa de la Prefectura de Loja para promover la comercialización y visibilidad de los productos de la provincia.", en: "An initiative of the Prefecture of Loja to promote the marketing and visibility of the province's products." },
    "footer.sitemap": { es: "Mapa del sitio", en: "Site map" },
    "footer.institucional": { es: "Institucional", en: "Institutional" },
    "footer.prefectura": { es: "Prefectura de Loja", en: "Prefecture of Loja" },
    "footer.aviso": { es: "Aviso legal", en: "Legal notice" },
    "footer.privacidad": { es: "Política de privacidad", en: "Privacy policy" },
    "footer.admin": { es: "Acceso administrador", en: "Admin access" },
    "footer.contacto": { es: "Contacto", en: "Contact" },
    "footer.direccion": { es: "Prefectura de Loja, Ecuador", en: "Prefecture of Loja, Ecuador" },
    "footer.rights": { es: "© 2026 Lojanova · Prefectura de Loja. Todos los derechos reservados.", en: "© 2026 Lojanova · Prefecture of Loja. All rights reserved." },
    "footer.made": { es: "Hecho en Loja, Ecuador 🇪🇨", en: "Made in Loja, Ecuador 🇪🇨" },
  };

  function aplicarIdioma(lang){
    document.documentElement.lang = lang;
    document.querySelectorAll("[data-i18n]").forEach(el => {
      const entry = DICT[el.dataset.i18n];
      if (entry && entry[lang]) el.textContent = entry[lang];
    });
    document.querySelectorAll("[data-i18n-placeholder]").forEach(el => {
      const entry = DICT[el.dataset.i18nPlaceholder];
      if (entry && entry[lang]) el.placeholder = entry[lang];
    });
    const btn = document.getElementById("langToggle");
    if (btn) btn.textContent = lang === "es" ? "EN" : "ES";
    localStorage.setItem("ln_lang", lang);
  }

  function refrescarDinamico(){
    // Las tarjetas dinámicas (productos/categorías) ya tienen el texto
    // "horneado" en el HTML, hay que volver a pintarlas
    if (typeof renderProductos === "function") renderProductos();
    if (typeof cargarCategorias === "function") cargarCategorias();
  }

  const guardado = localStorage.getItem("ln_lang") || "es";
  aplicarIdioma(guardado);

  document.getElementById("langToggle")?.addEventListener("click", () => {
    const actual = localStorage.getItem("ln_lang") || "es";
    aplicarIdioma(actual === "es" ? "en" : "es");
    refrescarDinamico();
  });
})();
