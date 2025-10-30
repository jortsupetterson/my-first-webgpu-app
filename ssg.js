import { build } from "esbuild";
import { minify } from "html-minifier-terser";
import { readFile, writeFile } from "fs/promises";
const html = String.raw;
const cellShader = await readFile("./shaders/cellShader.wgsl");
const page = html`
  <!DOCTYPE html>
  <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>My first webGPU app</title>
      <link rel="stylesheet" href="./style.css" />
    </head>
    <body>
      <canvas width="1024" height="1024"> </canvas>
      <script type="module">
        const canvas = document.querySelector("canvas");
        try {
          if (!navigator.gpu) {
            throw new Error("Your browser cant use this system");
          }
          const adapter = await navigator.gpu.requestAdapter();
          if (!adapter) {
            throw new Error("Could not find a proper adapter");
          }
          const device = await adapter.requestDevice();
          if (!device) {
            throw new Error("No proper hardware found");
          }
          const context = canvas.getContext("webgpu");
          const canvasFormat = navigator.gpu.getPreferredCanvasFormat();
          context.configure({
            format: canvasFormat,
            device: device,
          });
          //Kahden (neliön muodostavan) kolmion kärkien koordinaatit
          const vertices = new Float32Array([
            -0.8, -0.8, 0.8, -0.8, 0.8, 0.8, -0.8, -0.8, 0.8, 0.8, -0.8, 0.8,
          ]);

          //GPU muistialue kolmioiden kärkien koordinaateille
          const vertexBuffer = device.createBuffer({
            label: "Cell vertices",
            size: vertices.byteLength,
            usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
          });
          device.queue.writeBuffer(vertexBuffer, 0, vertices);

          const vertexBufferLayout = {
            arrayStride: 8,
            attributes: [{ format: "float32x2", offset: 0, shaderLocation: 0 }],
          };

          const cellShaderModule = device.createShaderModule({
            label: "Cell shader",
            code: ${JSON.stringify(cellShader.toString())},
          });

          const encoder = device.createCommandEncoder();
          const pass = encoder.beginRenderPass({
            colorAttachments: [
              {
                view: context.getCurrentTexture().createView(),
                loadOp: "clear",
                storeOp: "store",
                clearValue: [0, 0, 0.4, 1],
              },
            ],
          });
          pass.end();
          device.queue.submit([encoder.finish()]);
        } catch (err) {
          document.body.insertAdjacentHTML("afterend", "<p>" + err + "</p>");
        }
      </script>
    </body>
  </html>
`;

const min = await minify(page, {
  minifyJS: { module: true, ecma: 2020 },
  collapseWhitespace: true,
  collapseInlineTagWhitespace: true,
  html5: true,
  useShortDoctype: true,
  trimCustomFragments: true,
});

await writeFile("./dist/index.html", min);
await build({
  entryPoints: ["./style.css"],
  outfile: "./dist/style.css",
  loader: {
    ".css": "css",
  },
  bundle: true,
  minify: true,
  treeShaking: true,
  platform: "browser",
});
