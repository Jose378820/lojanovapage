// Cliente único de Supabase, reutilizado por toda la web pública
const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const BUCKET = "lojanova-imagenes";
const FALLBACK_IMAGES = {
  product: "https://images.unsplash.com/photo-1518977676601-b53f82aba655?q=80&w=1200&auto=format&fit=crop",
  category: "https://images.unsplash.com/photo-1500651230702-0e2d8a49d4ad?q=80&w=1200&auto=format&fit=crop",
  news: "https://images.unsplash.com/photo-1499529112087-3cb3b73cec95?q=80&w=1200&auto=format&fit=crop",
  producer: "https://placehold.co/800x800/EFE9DA/1E5A3A?text=Lojanova",
  default: "https://images.unsplash.com/photo-1500937386664-56d1dfef3854?q=80&w=1200&auto=format&fit=crop"
};

function urlImagen(path, tipo = "default") {
  if (!path) return FALLBACK_IMAGES[tipo] || FALLBACK_IMAGES.default;
  if (path.startsWith("http")) return path;
  const { data } = db.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}
