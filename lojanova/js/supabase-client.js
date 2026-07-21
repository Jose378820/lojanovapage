// Cliente único de Supabase, reutilizado por toda la web pública
const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const BUCKET = "lojanova-imagenes";

function urlImagen(path) {
  if (!path) return "https://placehold.co/800x600/EFE9DA/1E5A3A?text=Lojanova";
  if (path.startsWith("http")) return path;
  const { data } = db.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}
