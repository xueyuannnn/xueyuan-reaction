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
export function condition(r){return ['webgl-finish-pointer-v1',r.imageId,r.min,r.max,r.fps,r.viewport].join('|');}
