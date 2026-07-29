const http = require("http");
const fs = require("fs");
const path = require("path");
const { URL } = require("url");

const PORT = process.env.PORT || 8080;
const HOST = "0.0.0.0";
const ROOT = __dirname;

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf"
};

const server = http.createServer((req, res) => {
  let pathname;

  try {
    pathname = decodeURIComponent(
      new URL(req.url, `http://${req.headers.host || "localhost"}`).pathname
    );
  } catch {
    res.writeHead(400);
    res.end("Solicitud incorrecta");
    return;
  }

  let relativePath = pathname.replace(/^\/+/, "");

  if (!relativePath) {
    relativePath = "index.html";
  }

  let filePath = path.resolve(ROOT, relativePath);

  // Evitar acceso fuera del proyecto
  if (!filePath.startsWith(ROOT + path.sep) && filePath !== ROOT) {
    res.writeHead(403);
    res.end("Acceso denegado");
    return;
  }

  // Permitir rutas como /producto en lugar de /producto.html
  if (!fs.existsSync(filePath) && !path.extname(filePath)) {
    const htmlPath = `${filePath}.html`;

    if (fs.existsSync(htmlPath)) {
      filePath = htmlPath;
    }
  }

  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    filePath = path.join(filePath, "index.html");
  }

  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    res.writeHead(404, {
      "Content-Type": "text/plain; charset=utf-8"
    });
    res.end(`Archivo no encontrado: ${pathname}`);
    return;
  }

  const extension = path.extname(filePath).toLowerCase();
  const contentType = mimeTypes[extension] || "application/octet-stream";

  res.writeHead(200, {
    "Content-Type": contentType,
    "Cache-Control": "no-store, no-cache, must-revalidate"
  });

  if (req.method === "HEAD") {
    res.end();
    return;
  }

  const stream = fs.createReadStream(filePath);

  stream.on("error", () => {
    if (!res.headersSent) {
      res.writeHead(500);
    }

    res.end("Error interno del servidor");
  });

  stream.pipe(res);
});

server.listen(PORT, HOST, () => {
  console.log(`Lojanova funcionando en http://${HOST}:${PORT}`);
});
