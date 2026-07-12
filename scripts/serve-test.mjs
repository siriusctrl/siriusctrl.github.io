import { spawnSync } from "node:child_process";
import { createReadStream, existsSync, statSync } from "node:fs";
import http from "node:http";
import path from "node:path";
import process from "node:process";

const args = process.argv.slice(2);
const portIndex = args.indexOf("--port");
const port = Number(portIndex >= 0 ? args[portIndex + 1] : process.env.PORT ?? 4321);
const host = "127.0.0.1";
const root = path.join(process.cwd(), "dist");

const build = spawnSync("npm", ["run", "build"], { stdio: "inherit", cwd: process.cwd() });
if (build.status !== 0) process.exit(build.status ?? 1);

const contentTypes = new Map([
  [".css", "text/css; charset=utf-8"],
  [".html", "text/html; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".svg", "image/svg+xml"],
  [".webp", "image/webp"],
  [".woff2", "font/woff2"],
  [".xml", "application/xml; charset=utf-8"],
]);

function resolveFile(requestPath) {
  const decoded = decodeURIComponent(requestPath.split("?")[0]);
  const relative = decoded.endsWith("/") ? `${decoded}index.html` : decoded;
  const candidate = path.resolve(root, `.${relative}`);
  if (!candidate.startsWith(root)) return null;
  if (existsSync(candidate) && statSync(candidate).isFile()) return candidate;
  return null;
}

const server = http.createServer((request, response) => {
  const requested = resolveFile(request.url ?? "/");
  const file = requested ?? path.join(root, "404.html");
  response.statusCode = requested ? 200 : 404;
  response.setHeader("Content-Type", contentTypes.get(path.extname(file)) ?? "application/octet-stream");
  createReadStream(file).pipe(response);
});

server.listen(port, host, () => {
  console.log(`Static verification server: http://${host}:${port}/`);
});

function shutdown() {
  server.close(() => process.exit(0));
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
