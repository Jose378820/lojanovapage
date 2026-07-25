// =========================================================
// LOJANOVA — Sitemap dinámico
// Se sirve en https://lojanova.gob.ec/sitemap.xml (ver redirect en netlify.toml)
// Consulta Supabase en cada request para incluir todos los
// productos activos, sin necesidad de regenerar nada manualmente.
// =========================================================

const SUPABASE_URL = "https://pfdyxxavadiyoaxduibp.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_sz0f8pdxD7zLaKqx1xykfQ_MGZN7h6y";
const SITE_URL = "https://lojanova.gob.ec";

function escapeXml(str) {
  return String(str).replace(/[<>&'"]/g, (c) => ({
    "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;",
  }[c]));
}

function urlEntry(loc, { changefreq = "weekly", priority = "0.5", lastmod } = {}) {
  return `  <url>
    <loc>${escapeXml(loc)}</loc>
    ${lastmod ? `<lastmod>${lastmod}</lastmod>` : ""}
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`;
}

exports.handler = async function () {
  const staticUrls = [
    urlEntry(`${SITE_URL}/`, { changefreq: "daily", priority: "1.0" }),
    urlEntry(`${SITE_URL}/index.html#catalogo`, { changefreq: "daily", priority: "0.8" }),
    urlEntry(`${SITE_URL}/index.html#emprendedores`, { changefreq: "weekly", priority: "0.7" }),
    urlEntry(`${SITE_URL}/index.html#noticias`, { changefreq: "weekly", priority: "0.6" }),
    urlEntry(`${SITE_URL}/login.html`, { changefreq: "monthly", priority: "0.3" }),
  ];

  let productUrls = [];

  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/productos?select=slug,created_at&activo=eq.true`,
      {
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
      }
    );

    if (res.ok) {
      const productos = await res.json();
      productUrls = productos
        .filter((p) => p.slug)
        .map((p) =>
          urlEntry(`${SITE_URL}/producto.html?slug=${encodeURIComponent(p.slug)}`, {
            changefreq: "weekly",
            priority: "0.7",
            lastmod: p.created_at ? p.created_at.slice(0, 10) : undefined,
          })
        );
    }
  } catch (err) {
    // Si Supabase falla, igual devolvemos el sitemap con las páginas estáticas
    console.error("Error obteniendo productos para sitemap:", err);
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${[...staticUrls, ...productUrls].join("\n")}
</urlset>`;

  return {
    statusCode: 200,
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
    body: xml,
  };
};
