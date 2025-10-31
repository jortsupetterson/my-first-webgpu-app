import { build } from "esbuild";
import { minify } from "html-minifier-terser";
import { readFile, writeFile, mkdir } from "fs/promises";
import { calculateHashForCSP } from "../scripts/utils/calculateHash.js";

await mkdir("./temp", { recursive: true });
await mkdir("./dist", { recursive: true });
const html = String.raw;
const cellShaderRaw = await readFile("./src/shaders/cellShader.wgsl", "utf8");
await build({
  entryPoints: ["./src/style.css", "./src/main.js"],
  outdir: "./temp",
  define: { cellShader: JSON.stringify(cellShaderRaw) },
  minify: true,
  bundle: true,
  treeShaking: true,
  platform: "browser",
  format: "esm",
});

let [scriptRaw, styleRaw] = await Promise.all([
  readFile("./temp/main.js", "utf8"),
  readFile("./temp/style.css", "utf8"),
]);

let page = html` <!DOCTYPE html>
  <html lang="en">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>My first webGPU app</title>
      <link rel="icon" href="/webgpu.svg" />
      <style>
        ${styleRaw}
      </style>
    </head>
    <body>
      <canvas width="256" height="256"></canvas>
      <script type="module">
        ${scriptRaw};
      </script>
    </body>
  </html>`;

page = await minify(page, {
  minifyJS: { module: true, ecma: 2020 },
  minifyCSS: true,
  collapseWhitespace: true,
  collapseInlineTagWhitespace: true,
  html5: true,
  useShortDoctype: true,
  trimCustomFragments: true,
});

const styleMatch = page.match(/<style>([\s\S]*?)<\/style>/i);
const scriptMatch = page.match(/<script[^>]*>([\s\S]*?)<\/script>/i);
const finalStyle = styleMatch ? styleMatch[1] : "";
const finalScript = scriptMatch ? scriptMatch[1] : "";

const [styleHash, scriptHash] = await Promise.all([
  calculateHashForCSP(finalStyle),
  calculateHashForCSP(finalScript),
]);

const cspMeta = `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; base-uri 'none'; img-src 'self' data:; style-src '${styleHash}'; script-src '${scriptHash}'; connect-src 'self';">`;
page = page.replace(/<title>[^<]*<\/title>/i, (m) => `${m}\n  ${cspMeta}`);

await writeFile("./dist/index.html", page, "utf8");
