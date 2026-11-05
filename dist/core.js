export const SUBMIT_PROTOCOL='webgl-submit-pointer-v2';
export const validProtocol=p=>['webgl-finish-pointer-v1',SUBMIT_PROTOCOL].includes(p);
export const protocolLabel=p=>p===SUBMIT_PROTOCOL?'显示发起起点':'旧 GPU 完成起点';
// Milliseconds throughout. Browser timestamps never acquire invented nanosecond precision.
export class Trial {
  stage='preparing'; startMs=NaN;
  ready(){if(this.stage!=='preparing')return false;this.stage='waiting';return true;}
  request(){if(this.stage!=='waiting')return false;this.stage='rendering';return true;}
  arm(now){if(this.stage!=='rendering')return false;this.startMs=now;this.stage='armed';return true;}
  touch(time){if(['finished','cancelled'].includes(this.stage))return 'ignore';
    const result=this.stage==='armed'&&time>=this.startMs?'valid':'false-start';this.stage='finished';return result;}
  cancel(){this.stage='cancelled';}
}
export function eventTime(stamp,origin,now){
  let value=Number(stamp);if(value>1e12)value-=origin;
  if(!Number.isFinite(value)||value<=0||value>now+1000||value<0)throw Error('浏览器未提供可用的原始事件时间，请更换浏览器后重试');
  return value;
}
export function config(min,max,rounds){
  if(!/^\d+$/.test(String(min))||!/^\d+$/.test(String(max))||+min<200||+max>60000||+min>+max)throw Error('等待范围须为 200–60000 ms，最小值不能大于最大值');
  if(!/^\d+$/.test(String(rounds))||+rounds<1||+rounds>100)throw Error('测试轮数须为 1–100');
  return {min:+min,max:+max,rounds:+rounds};
}
export function stats(values){
  const n=values.length;if(!n)return {n:0,mean:NaN,min:NaN,max:NaN,sd:NaN};
  const mean=values.reduce((a,b)=>a+b,0)/n;return {n,mean,min:Math.min(...values),max:Math.max(...values),sd:Math.sqrt(values.reduce((a,b)=>a+(b-mean)**2,0)/n)};
}
export function signed(x){return (Math.abs(x)<.005?'+0.00':(x>=0?'+':'')+x.toFixed(2));}
export function comparison(value,median){if(!Number.isFinite(value)||!Number.isFinite(median))return '— ms（—%）';return `${signed(value-median)} ms（${median>0?signed((value-median)/median*100):'—'}%）`;}
export function frequency(intervals){const a=intervals.filter(x=>x>0&&x<250).sort((a,b)=>a-b);if(a.length<12)return null;
  const dt=a[Math.floor(a.length/2)],raw=1000/dt;
  const rates=[24,30,40,48,50,60,72,75,80,90,100,120,144,160,165,180,200,240,360];
  const nearest=rates.reduce((a,b)=>Math.abs(a-raw)<Math.abs(b-raw)?a:b);
  return {fps:Math.abs(raw-nearest)/nearest<.04?nearest:Math.round(raw),raw,period:dt,jitter:a[Math.floor(a.length*.9)]-a[Math.floor(a.length*.1)]};
}
export function condition(r){const timing=r.frameTiming;return [r.protocol||'webgl-finish-pointer-v1',r.imageId,r.min,r.max,r.fps,r.viewport].join('|')+(r.displayMode==='window'?'|window-v1':'')+(timing&&(timing.changed||timing.longGaps>0)?`|variable-fps-v1|${timing.minFps}|${timing.maxFps}`:'');}
export function viewportBox(visual,width,height){return {left:Number.isFinite(visual?.offsetLeft)?visual.offsetLeft:0,top:Number.isFinite(visual?.offsetTop)?visual.offsetTop:0,width:Number.isFinite(visual?.width)&&visual.width>0?visual.width:width,height:Number.isFinite(visual?.height)&&visual.height>0?visual.height:height};}
export class FrameMonitor {
  constructor(initialFps){this.reference=initialFps;this.samples=[];this.votes=0;this.data={initialFps,minFps:initialFps,maxFps:initialFps,changed:false,maxGapMs:0,longGaps:0};}
  observe(delta){if(!Number.isFinite(delta)||delta<=0)return;const d=this.data;d.maxGapMs=Math.max(d.maxGapMs,delta);
    if(delta>Math.max(150,this.reference>0?8000/this.reference:150))d.longGaps++;
    this.samples.push(delta);if(this.samples.length>24)this.samples.shift();if(this.samples.length<24)return;
    const current=frequency(this.samples);if(!current)return;if(!this.reference)this.reference=current.raw;
    if(!d.minFps)d.minFps=current.fps;else d.minFps=Math.min(d.minFps,current.fps);d.maxFps=Math.max(d.maxFps,current.fps);
    if(Math.abs(current.raw-this.reference)/this.reference>.2){if(++this.votes>=12)d.changed=true;}else this.votes=0;
  }
}
export function validFrameTiming(t){return t===undefined||(t&&typeof t==='object'&&typeof t.changed==='boolean'&&['initialFps','minFps','maxFps','maxGapMs','longGaps'].every(k=>Number.isFinite(t[k])&&t[k]>=0)&&t.minFps<=t.maxFps&&t.maxFps<=10000&&Number.isInteger(t.longGaps));}
export function frameWarning(r){const t=r.frameTiming;if(!t)return '';const notes=[];
  if(t.changed)notes.push(`本回合页面帧率发生变化（观测约 ${t.minFps}–${t.maxFps} fps）`);
  if(t.longGaps>0)notes.push(`检测到 ${t.longGaps} 次页面卡顿，最大帧间隔 ${t.maxGapMs.toFixed(2)} ms`);
  if(t.initialFps===0)notes.push('准备阶段未测得可靠页面帧率');
  return notes.length?notes.join('；')+'。成绩已保留，请结合这些情况比较结果。'+(t.changed||t.longGaps>0?'本回合按帧率变化／卡顿条件单独累计。':''):'';
}
