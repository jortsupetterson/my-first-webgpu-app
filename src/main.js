const GRID_SIZE = 32;
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

  // Kolmioista muodostettu neliö jaetaan ruudukon koolla  tämn avulla
  const uniforms = new Float32Array([GRID_SIZE, GRID_SIZE]);
  // GPU muistialue grid helpereille
  const uniformBuffer = device.createBuffer({
    label: "Grid uniform",
    size: uniforms.byteLength,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });
  device.queue.writeBuffer(uniformBuffer, 0, uniforms);

  const cellShaderModule = device.createShaderModule({
    label: "Cell shader",
    code: cellShader /*defined by esbuild*/,
  });

  const cellPipeline = device.createRenderPipeline({
    label: "Cell pipeline",
    layout: "auto",
    vertex: {
      module: cellShaderModule,
      entryPoint: "vertexMain",
      buffers: [vertexBufferLayout],
    },
    fragment: {
      module: cellShaderModule,
      entryPoint: "fragmentMain",
      targets: [{ format: canvasFormat }],
    },
  });

  const bindGroup = device.createBindGroup({
    label: "Cell rendered bind group",
    layout: cellPipeline.getBindGroupLayout(0),
    entries: [
      {
        binding: 0,
        resource: { buffer: uniformBuffer },
      },
    ],
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

  pass.setPipeline(cellPipeline);
  pass.setVertexBuffer(0, vertexBuffer);
  pass.setBindGroup(0, bindGroup);
  pass.draw(vertices.length / 2, GRID_SIZE * GRID_SIZE);
  pass.end();
  device.queue.submit([encoder.finish()]);
} catch (err) {
  document.body.insertAdjacentHTML("afterend", "<span>" + err + "</span>");
}
