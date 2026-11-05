export class Stimulus {
  constructor(canvas){this.canvas=canvas;const gl=canvas.getContext('webgl',{alpha:false,antialias:false,depth:false,stencil:false,preserveDrawingBuffer:false,powerPreference:'high-performance'});
    if(!gl)throw Error('当前浏览器无法使用 WebGL，不能按本计时方案测试');this.gl=gl;
    const shader=(type,text)=>{const s=gl.createShader(type);gl.shaderSource(s,text);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error('图形程序准备失败');return s;};
    const p=gl.createProgram();gl.attachShader(p,shader(gl.VERTEX_SHADER,'attribute vec2 p;attribute vec2 uv;varying vec2 v;void main(){gl_Position=vec4(p,0.,1.);v=uv;}'));
    gl.attachShader(p,shader(gl.FRAGMENT_SHADER,(gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER,gl.HIGH_FLOAT).precision?'precision highp float;':'precision mediump float;')+'varying vec2 v;uniform sampler2D image;void main(){gl_FragColor=texture2D(image,v);}'));
    gl.linkProgram(p);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw Error('图形程序连接失败');gl.useProgram(p);this.program=p;this.pos=gl.getAttribLocation(p,'p');this.uv=gl.getAttribLocation(p,'uv');this.buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,this.buffer);gl.clearColor(0,0,0,1);gl.disable(gl.DEPTH_TEST);
    this.textLimit=gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER,gl.HIGH_FLOAT).precision?gl.getParameter(gl.MAX_TEXTURE_SIZE):Math.min(1024,gl.getParameter(gl.MAX_TEXTURE_SIZE));this.resize();
  }
  resize(){const ratio=devicePixelRatio||1,rect=this.canvas.getBoundingClientRect();this.canvas.width=Math.round((rect.width||innerWidth)*ratio);this.canvas.height=Math.round((rect.height||innerHeight)*ratio);this.gl.viewport(0,0,this.canvas.width,this.canvas.height);}
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
  prepareWaiting(round){
    const g=this.gl,dpr=devicePixelRatio||1,w=this.canvas.width,h=this.canvas.height;
    const max=this.textLimit,c=document.createElement('canvas');
    c.width=Math.max(1,Math.min(max,w-Math.min(48*dpr,w/8)));c.height=Math.max(1,Math.min(max,h-Math.min(48*dpr,h/8),300*dpr));
    const x=c.getContext('2d');x.fillStyle='#000';x.fillRect(0,0,c.width,c.height);x.textAlign='center';x.textBaseline='middle';
    const lines=[[round,20,'#c5d0cd',.12],['等待图片',Math.min(68,Math.max(40,w/dpr*.07)),'#69e5bd',.40],['图片出现后点击，请勿提前点击',15,'#c5d0cd',.70],['可保持一指按住 · 用第二指点击 · Esc 结束',12,'#899b90',.88]];
    for(const [text,size,color,y]of lines){let px=Math.min(size*dpr,c.height*.19);const font=()=>`${px}px -apple-system,BlinkMacSystemFont,"Segoe UI","Microsoft YaHei",sans-serif`;x.font=font();while(x.measureText(text).width>c.width-16*dpr&&px>8*dpr){px-=dpr;x.font=font();}x.fillStyle=color;x.fillText(text,Math.floor(c.width/2),Math.floor(c.height*y));}
    if(this.waitingTexture)g.deleteTexture(this.waitingTexture);this.waitingTexture=g.createTexture();g.bindTexture(g.TEXTURE_2D,this.waitingTexture);
    for(const p of [g.TEXTURE_WRAP_S,g.TEXTURE_WRAP_T])g.texParameteri(g.TEXTURE_2D,p,g.CLAMP_TO_EDGE);
    for(const p of [g.TEXTURE_MIN_FILTER,g.TEXTURE_MAG_FILTER])g.texParameteri(g.TEXTURE_2D,p,g.NEAREST);
    g.pixelStorei(g.UNPACK_FLIP_Y_WEBGL,true);g.texImage2D(g.TEXTURE_2D,0,g.RGBA,g.RGBA,g.UNSIGNED_BYTE,c);this.waitingWidth=c.width;this.waitingHeight=c.height;
    if(g.getError()!==g.NO_ERROR)throw Error('等待文字纹理准备失败');this.drawWaiting();g.finish();
  }
  render(texture,width,height,pixels=false){const g=this.gl,aspect=width/height,screen=this.canvas.width/this.canvas.height;
    let left,right,bottom,top;
    if(pixels){const x=Math.floor((this.canvas.width-width)/2),y=Math.floor((this.canvas.height-height)/2);left=x*2/this.canvas.width-1;right=(x+width)*2/this.canvas.width-1;top=1-y*2/this.canvas.height;bottom=1-(y+height)*2/this.canvas.height;}
    else{const x=aspect>screen?1:aspect/screen,y=aspect>screen?screen/aspect:1;left=-x;right=x;bottom=-y;top=y;}
    g.clear(g.COLOR_BUFFER_BIT);g.useProgram(this.program);g.bindBuffer(g.ARRAY_BUFFER,this.buffer);g.bufferData(g.ARRAY_BUFFER,new Float32Array([left,bottom,0,0,right,bottom,1,0,left,top,0,1,right,top,1,1]),g.STREAM_DRAW);
    g.enableVertexAttribArray(this.pos);g.enableVertexAttribArray(this.uv);g.vertexAttribPointer(this.pos,2,g.FLOAT,false,16,0);g.vertexAttribPointer(this.uv,2,g.FLOAT,false,16,8);
    g.activeTexture(g.TEXTURE0);g.bindTexture(g.TEXTURE_2D,texture);g.drawArrays(g.TRIANGLE_STRIP,0,4);
  }
  draw(){this.render(this.texture,this.width,this.height);}
  drawAndWait(){
    this.draw();
    const gl=this.gl;
    gl.finish();
    // WebKit may send finish asynchronously. getError waits for the ordered GPU-process reply.
    if(gl.getError()!==gl.NO_ERROR||gl.isContextLost())throw Error('刺激帧 GPU 绘制失败，本次测试已中止');
  }
  drawWaiting(){this.render(this.waitingTexture,this.waitingWidth,this.waitingHeight,true);}
  clear(){this.gl.clear(this.gl.COLOR_BUFFER_BIT);}
}
