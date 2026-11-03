export class Stimulus {
  constructor(canvas){this.canvas=canvas;const gl=canvas.getContext('webgl',{alpha:false,antialias:false,depth:false,stencil:false,preserveDrawingBuffer:false,powerPreference:'high-performance'});
    if(!gl)throw Error('当前浏览器无法使用 WebGL，不能按本计时方案测试');this.gl=gl;
    const shader=(type,text)=>{const s=gl.createShader(type);gl.shaderSource(s,text);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error('图形程序准备失败');return s;};
    const p=gl.createProgram();gl.attachShader(p,shader(gl.VERTEX_SHADER,'attribute vec2 p;attribute vec2 uv;varying vec2 v;void main(){gl_Position=vec4(p,0.,1.);v=uv;}'));
    gl.attachShader(p,shader(gl.FRAGMENT_SHADER,'precision mediump float;varying vec2 v;uniform sampler2D image;void main(){gl_FragColor=texture2D(image,v);}'));
    gl.linkProgram(p);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw Error('图形程序连接失败');gl.useProgram(p);this.program=p;this.pos=gl.getAttribLocation(p,'p');this.uv=gl.getAttribLocation(p,'uv');this.buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,this.buffer);gl.clearColor(0,0,0,1);gl.disable(gl.DEPTH_TEST);
    this.resize();
  }
  resize(){const ratio=devicePixelRatio||1;this.canvas.width=Math.round(innerWidth*ratio);this.canvas.height=Math.round(innerHeight*ratio);this.gl.viewport(0,0,this.canvas.width,this.canvas.height);}
  upload(image){const g=this.gl;if(this.texture)g.deleteTexture(this.texture);this.texture=g.createTexture();g.bindTexture(g.TEXTURE_2D,this.texture);
    for(const p of [g.TEXTURE_WRAP_S,g.TEXTURE_WRAP_T])g.texParameteri(g.TEXTURE_2D,p,g.CLAMP_TO_EDGE);
    for(const p of [g.TEXTURE_MIN_FILTER,g.TEXTURE_MAG_FILTER])g.texParameteri(g.TEXTURE_2D,p,g.LINEAR);
    g.pixelStorei(g.UNPACK_FLIP_Y_WEBGL,true);g.texImage2D(g.TEXTURE_2D,0,g.RGBA,g.RGBA,g.UNSIGNED_BYTE,image);
    this.width=image.width;this.height=image.height;if(g.getError()!==g.NO_ERROR)throw Error('图片纹理上传失败，请选择较小的图片');
    // Prewarm in a private framebuffer, never display the stimulus during preparation.
    const f=g.createFramebuffer(),t=g.createTexture();g.bindTexture(g.TEXTURE_2D,t);g.texImage2D(g.TEXTURE_2D,0,g.RGBA,8,8,0,g.RGBA,g.UNSIGNED_BYTE,null);
    g.texParameteri(g.TEXTURE_2D,g.TEXTURE_MIN_FILTER,g.LINEAR);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_MAG_FILTER,g.LINEAR);
    g.bindFramebuffer(g.FRAMEBUFFER,f);g.framebufferTexture2D(g.FRAMEBUFFER,g.COLOR_ATTACHMENT0,g.TEXTURE_2D,t,0);
    if(g.checkFramebufferStatus(g.FRAMEBUFFER)!==g.FRAMEBUFFER_COMPLETE)throw Error('图片预热缓冲区不可用');
    g.viewport(0,0,8,8);this.draw();g.finish();g.bindFramebuffer(g.FRAMEBUFFER,null);g.deleteFramebuffer(f);g.deleteTexture(t);g.viewport(0,0,this.canvas.width,this.canvas.height);this.clear();
  }
  draw(){const g=this.gl,aspect=this.width/this.height,screen=this.canvas.width/this.canvas.height,x=aspect>screen?1:aspect/screen,y=aspect>screen?screen/aspect:1;
    g.clear(g.COLOR_BUFFER_BIT);g.useProgram(this.program);g.bindBuffer(g.ARRAY_BUFFER,this.buffer);g.bufferData(g.ARRAY_BUFFER,new Float32Array([-x,-y,0,0,x,-y,1,0,-x,y,0,1,x,y,1,1]),g.STREAM_DRAW);
    g.enableVertexAttribArray(this.pos);g.enableVertexAttribArray(this.uv);g.vertexAttribPointer(this.pos,2,g.FLOAT,false,16,0);g.vertexAttribPointer(this.uv,2,g.FLOAT,false,16,8);
    g.activeTexture(g.TEXTURE0);g.bindTexture(g.TEXTURE_2D,this.texture);g.drawArrays(g.TRIANGLE_STRIP,0,4);
  }
  present(){this.draw();this.gl.finish();return performance.now();}
  clear(){this.gl.clear(this.gl.COLOR_BUFFER_BIT);}
}
