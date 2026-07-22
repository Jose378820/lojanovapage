// Cliente único de Supabase, reutilizado por toda la web pública
const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const BUCKET = "lojanova-imagenes";
const FALLBACK_IMAGES = {
  product: "https://images.unsplash.com/photo-1518977676601-b53f82aba655?q=80&w=1200&auto=format&fit=crop",
  category: "https://images.unsplash.com/photo-1464965911861-746a04b4bca6?q=80&w=1200&auto=format&fit=crop",
  news: "https://images.unsplash.com/photo-1499529112087-3cb3b73cec95?q=80&w=1200&auto=format&fit=crop",
  producer: "https://placehold.co/800x800/EFE9DA/1E5A3A?text=Lojanova",
  default: "https://images.unsplash.com/photo-1500937386664-56d1dfef3854?q=80&w=1200&auto=format&fit=crop"
};
const CATEGORY_FALLBACKS = [
  { keys: ["cafe", "café"], url: "https://images.unsplash.com/photo-1447933601403-0c6688de566e?q=80&w=1200&auto=format&fit=crop" },
  { keys: ["cacao", "chocolate"], url: "https://images.unsplash.com/photo-1606312619070-d48b4c652a52?q=80&w=1200&auto=format&fit=crop" },
  { keys: ["miel", "abeja"], url: "https://images.unsplash.com/photo-1587049352851-8d4e89133924?q=80&w=1200&auto=format&fit=crop" },
  { keys: ["lacteo", "lácteo", "queso", "leche"], url: "https://images.unsplash.com/photo-1452195100486-9cc805987862?q=80&w=1200&auto=format&fit=crop" },
  { keys: ["artesania", "artesanía", "ceramica", "cerámica"], url: "https://images.unsplash.com/photo-1493106641515-6b5631de4bb9?q=80&w=1200&auto=format&fit=crop" },
  { keys: ["textil", "tejido"], url: "https://images.unsplash.com/photo-1606722590583-6951b5ea92ad?q=80&w=1200&auto=format&fit=crop" },
  { keys: ["fruta", "frutas", "agricola", "agrícola"], url: "https://images.unsplash.com/photo-1464965911861-746a04b4bca6?q=80&w=1200&auto=format&fit=crop" }
];

function urlImagen(path, tipo = "default") {
  if (!path) return FALLBACK_IMAGES[tipo] || FALLBACK_IMAGES.default;
  if (path.startsWith("http")) return path;
  const { data } = db.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

function urlImagenCategoria(path, nombre = "") {
  if (path) return urlImagen(path, "category");
  const normalized = nombre.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const match = CATEGORY_FALLBACKS.find(item => item.keys.some(key => normalized.includes(key.normalize("NFD").replace(/[\u0300-\u036f]/g, ""))));
  return match?.url || FALLBACK_IMAGES.category;
}
