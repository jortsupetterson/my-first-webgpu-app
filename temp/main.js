var p=document.querySelector("canvas");try{if(!navigator.gpu)throw new Error("Your browser cant use this system");let t=await navigator.gpu.requestAdapter();if(!t)throw new Error("Could not find a proper adapter");let e=await t.requestDevice();if(!e)throw new Error("No proper hardware found");let o=p.getContext("webgpu"),n=navigator.gpu.getPreferredCanvasFormat();o.configure({format:n,device:e});let a=new Float32Array([-.8,-.8,.8,-.8,.8,.8,-.8,-.8,.8,.8,-.8,.8]),s=e.createBuffer({label:"Cell vertices",size:a.byteLength,usage:GPUBufferUsage.VERTEX|GPUBufferUsage.COPY_DST});e.queue.writeBuffer(s,0,a);let d={arrayStride:8,attributes:[{format:"float32x2",offset:0,shaderLocation:0}]},u=new Float32Array([32,32]),i=e.createBuffer({label:"Grid uniform",size:u.byteLength,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST});e.queue.writeBuffer(i,0,u);let c=e.createShaderModule({label:"Cell shader",code:`@group(0) @binding(0) var<uniform> grid: vec2f;\r
\r
@vertex\r
fn vertexMain(@location(0) pos: vec2f, @builtin(instance_index) instance: u32) -> @builtin(position) vec4f {\r
    let i = f32(instance);\r
    let cell = vec2f(i % grid.x, floor(i/grid.y));\r
    let cellOffset = cell/grid * 2;\r
    let gridPos = (pos + 1) / grid -1 + cellOffset;\r
    return vec4f(gridPos, 0, 1);\r
};\r
\r
@fragment\r
fn fragmentMain() -> @location(0) vec4f {\r
 return vec4f(1,0,0,1);\r
};`}),f=e.createRenderPipeline({label:"Cell pipeline",layout:"auto",vertex:{module:c,entryPoint:"vertexMain",buffers:[d]},fragment:{module:c,entryPoint:"fragmentMain",targets:[{format:n}]}}),g=e.createBindGroup({label:"Cell rendered bind group",layout:f.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer:i}}]}),l=e.createCommandEncoder(),r=l.beginRenderPass({colorAttachments:[{view:o.getCurrentTexture().createView(),loadOp:"clear",storeOp:"store",clearValue:[0,0,.4,1]}]});r.setPipeline(f),r.setVertexBuffer(0,s),r.setBindGroup(0,g),r.draw(a.length/2,1024),r.end(),e.queue.submit([l.finish()])}catch(t){document.body.insertAdjacentHTML("afterend","<p>"+t+"</p>")}
