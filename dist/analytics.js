import {fit,included,median,logPdf} from './fit.js';
import {condition,comparison} from './core.js?v=1.0.3';
export function aggregate(runs,key){
  const participating=runs.filter(r=>r.enabled&&condition(r)===key),values=participating.flatMap(r=>r.scores),mask=included(values),model=fit(values),center=median(values);
  let i=0;const records=runs.map(r=>{const same=condition(r)===key,used=r.enabled&&same,flags=r.scores.map(()=>used?!mask[i++]:false);return {...r,same,used:used?r.scores.length:0,flags,median:median(r.scores)};});
  let latest=null,streak=0;for(let k=records.length-1;k>=0;k--){const r=records[k];if(!r.enabled||!r.same)continue;if(!r.complete||!r.scores.length)break;const n=r.flags.filter(Boolean).length;if(!latest)latest={n,total:r.scores.length,median:r.median};if(n*5<r.scores.length*4)break;streak++;}
  let warning='';if(latest&&(streak>=3||latest.n===latest.total))warning=(streak>=3?`连续 ${streak} 回合 ≥80% 偏离`:`最近回合 ${latest.n}/${latest.total} 条偏离`)+` · 中位数差 ${comparison(latest.median,center)} · 请考虑重置累计统计`;
  const sorted=[...values].sort((a,b)=>a-b),lo=sorted[0]??0,hi=Math.max(lo+1,sorted.at(-1)??500),bins=Array(14).fill(0);
  for(const v of values)bins[Math.min(13,Math.floor((v-lo)/(hi-lo)*14))]++;
  const curve=Array.from({length:100},(_,i)=>{const x=lo+(hi-lo)*i/99;return [x,model.available?Math.exp(logPdf(x,model.mu,model.sigma,model.tau)):0];});
  return {records,key,values,median:center,model,sessions:participating.filter(r=>r.scores.length).length,other:runs.reduce((n,r)=>n+r.scores.length,0)-values.length,flagged:mask.filter(v=>!v).length,warning,bins,curve,lo,hi};
}
