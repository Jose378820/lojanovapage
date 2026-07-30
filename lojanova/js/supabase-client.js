// Cliente único de Supabase, reutilizado por toda la web pública
const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const BUCKET = "lojanova-imagenes";
const FALLBACK_IMAGES = {
  product: "https://images.unsplash.com/photo-1518977676601-b53f82aba655?q=80&w=1200&auto=format&fit=crop",
  category: "https://images.unsplash.com/photo-1500937386664-56d1dfef3854?q=80&w=1200&auto=format&fit=crop",
  news: "https://images.unsplash.com/photo-1499529112087-3cb3b73cec95?q=80&w=1200&auto=format&fit=crop",
  producer: "https://placehold.co/800x800/EFE9DA/1E5A3A?text=Lojanova",
  default: "https://images.unsplash.com/photo-1500937386664-56d1dfef3854?q=80&w=1200&auto=format&fit=crop"
};
const CATEGORY_FALLBACKS = [
  { keys: ["cafe", "café"], url: "https://images.unsplash.com/photo-1447933601403-0c6688de566e?q=80&w=1200&auto=format&fit=crop" },
  { keys: ["cacao", "chocolate"], url: "https://images.unsplash.com/photo-1606312619070-d48b4c652a52?q=80&w=1200&auto=format&fit=crop" },
  { keys: ["miel", "abeja"], url: "https://images.unsplash.com/photo-1587049352851-8d4e89133924?q=80&w=1200&auto=format&fit=crop" },
  { keys: ["lacteo", "lácteo", "lacteos", "lácteos", "queso", "leche"], url: "https://images.unsplash.com/photo-1480951759438-f39a376462f2?q=80&w=1200&auto=format&fit=crop" },
  { keys: ["fruta", "frutas"], url: "https://images.unsplash.com/photo-1619566636858-adf3ef46400b?q=80&w=1200&auto=format&fit=crop" },
  { keys: ["artesania", "artesanía"], url: "https://images.unsplash.com/photo-1513519245088-0e12902e5a38?q=80&w=1200&auto=format&fit=crop" },
  { keys: ["textil", "textiles", "tejido", "tejidos"], url: "https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?q=80&w=1200&auto=format&fit=crop" },
  { keys: ["cosmetica", "cosmética", "natural"], url: "https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?q=80&w=1200&auto=format&fit=crop" },
  { keys: ["procesado", "procesados", "alimentos"], url: "https://images.unsplash.com/photo-1606914501449-5a96b6ce24ca?q=80&w=1200&auto=format&fit=crop" },
  { keys: ["bebida", "bebidas"], url: "https://images.unsplash.com/photo-1544145945-f90425340c7e?q=80&w=1200&auto=format&fit=crop" },
  { keys: ["ceramica", "cerámica"], url: "https://images.unsplash.com/photo-1493106641515-6b5631de4bb9?q=80&w=1200&auto=format&fit=crop" },
  { keys: ["otro", "otros"], url: "https://images.unsplash.com/photo-1500937386664-56d1dfef3854?q=80&w=1200&auto=format&fit=crop" },
  { keys: ["agricola", "agrícola", "agro"], url: "https://images.unsplash.com/photo-1500382017468-9049fed747ef?q=80&w=1200&auto=format&fit=crop" }
];

function urlImagen(path, tipo = "default") {
  if (!path) return FALLBACK_IMAGES[tipo] || FALLBACK_IMAGES.default;
  if (path.startsWith("http")) return path;
  const { data } = db.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

function urlImagenCategoria(path, nombre = "") {
  const normalized = nombre.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const match = CATEGORY_FALLBACKS.find(item => item.keys.some(key => normalized.includes(key.normalize("NFD").replace(/[\u0300-\u036f]/g, ""))));
  if (match) return match.url;
  if (path) return urlImagen(path, "category");
  return FALLBACK_IMAGES.category;
}
