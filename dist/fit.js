// Direct numerical port of Android ReactionFit.java. No outlier removal.
export const MIN_SAMPLES=8;
export function median(data){if(!data.length)return NaN;const a=[...data].sort((a,b)=>a-b),n=a.length;return n%2?a[(n-1)/2]:(a[n/2-1]+a[n/2])/2;}
export function included(data){if(data.length<8)return data.map(()=>true);const c=median(data),s=Math.max(1,median(data.map(x=>Math.abs(x-c))));return data.map(x=>Number.isFinite(x)&&x>=0&&.67448975*Math.abs(x-c)/s<=3.5);}
const LOG_2PI=Math.log(2*Math.PI);
export function normalLogPdf(t,mu,sigma){const z=(t-mu)/sigma;return -.5*z*z-Math.log(sigma)-.5*LOG_2PI;}
export function logPhi(z){const v=Math.abs(z)/Math.sqrt(2),t=1/(1+.5*v);
  const logErfc=Math.log(t)-v*v-1.26551223+t*(1.00002368+t*(.37409196+t*(.09678418+t*(-.18628806+t*(.27886807+t*(-1.13520398+t*(1.48851587+t*(-.82215223+t*.17087277))))))));
  return z<0?Math.log(.5)+logErfc:Math.log1p(-.5*Math.exp(logErfc));}
export function logPdf(t,mu,sigma,tau){if(tau<=0)return normalLogPdf(t,mu,sigma);const u=(t-mu)/sigma,r=sigma/tau,z=u-r;
  if(z<-10){const q=1/(z*z),series=1-q+3*q*q-15*q*q*q+105*q**4-945*q**5;return -Math.log(tau)-.5*u*u-Math.log(-z)-.5*LOG_2PI+Math.log(series);}
  return -Math.log(tau)+.5*r*r-u*r+logPhi(z);}
export function cdf(t,mu,sigma,tau){const phi=Math.exp(logPhi((t-mu)/sigma));return tau<=0?phi:Math.max(0,Math.min(1,phi-Math.exp(logPdf(t,mu,sigma,tau)+Math.log(tau))));}
function objective(p,x){if(p[0]<-20||p[0]>20||p[1]<-7||p[1]>5||p[2]<-10||p[2]>5)return 1e100;const s=Math.exp(p[1]),t=Math.exp(p[2]);let v=0;for(const a of x){const f=logPdf(a,p[0],s,t);if(!Number.isFinite(f))return 1e100;v-=f;}return v;}
function move(c,w,f){return c.map((x,k)=>x+f*(x-w[k]));}
function optimize(start,x){const p=Array.from({length:4},()=>[...start]);p[1][0]+=.25;p[2][1]+=.3;p[3][2]+=.4;const f=p.map(q=>objective(q,x));
  for(let iteration=0;iteration<400;iteration++){
    for(let j=0;j<4;j++)for(let k=j+1;k<4;k++)if(f[k]<f[j]){[f[j],f[k]]=[f[k],f[j]];[p[j],p[k]]=[p[k],p[j]];}
    let distance=0;for(let j=1;j<4;j++)for(let k=0;k<3;k++)distance=Math.max(distance,Math.abs(p[j][k]-p[0][k]));
    if(distance<1e-6&&Math.abs(f[3]-f[0])<1e-7)break;
    const c=[0,0,0];for(let j=0;j<3;j++)for(let k=0;k<3;k++)c[k]+=p[j][k]/3;
    const reflected=move(c,p[3],1),rf=objective(reflected,x);
    if(rf<f[0]){const expanded=move(c,p[3],2),ef=objective(expanded,x);p[3]=ef<rf?expanded:reflected;f[3]=Math.min(ef,rf);}
    else if(rf<f[2]){p[3]=reflected;f[3]=rf;}
    else {const outside=rf<f[3],contracted=move(c,p[3],outside?.5:-.5),cf=objective(contracted,x);
      if(cf<(outside?rf:f[3])){p[3]=contracted;f[3]=cf;}
      else for(let j=1;j<4;j++){for(let k=0;k<3;k++)p[j][k]=(p[j][k]+p[0][k])/2;f[j]=objective(p[j],x);}}
  }let best=0;for(let j=1;j<4;j++)if(f[j]<f[best])best=j;return p[best];}
export function fit(data){const n=data.length,empty={count:n,available:false};if(n<8||data.some(x=>!Number.isFinite(x)||x<0))return empty;
  const mean=data.reduce((a,b)=>a+b,0)/n,sd=Math.sqrt(data.reduce((a,x)=>a+(x-mean)**2,0)/n);
  if(sd<.001)return {count:n,available:true,mu:mean,sigma:.001,tau:0,peak:mean,ks:.5,nll:n*(Math.log(.001)+.5*LOG_2PI)};
  const center=median(data),scale=Math.max(.1,sd),x=data.map(t=>(t-center)/scale),m=(mean-center)/scale,s=sd/scale;
  let best=[m,Math.log(s),Math.log(.0001)],loss=objective(best,x);
  for(const fraction of [.08,.35,.7,.95]){const tail=s*fraction,spread=Math.sqrt(Math.max(s*s-tail*tail,.04*s*s)),p=optimize([m-tail,Math.log(spread),Math.log(tail)],x),v=objective(p,x);if(v<loss){best=p;loss=v;}}
  let mu=center+scale*best[0],sigma=scale*Math.exp(best[1]),tau=scale*Math.exp(best[2]);
  let gaussianLoss=0;for(const v of data)gaussianLoss-=normalLogPdf(v,mean,sd);loss+=n*Math.log(scale);
  if(gaussianLoss<=loss+1e-5){mu=mean;sigma=sd;tau=0;loss=gaussianLoss;}
  let a=mu-6*sigma,b=mu+Math.max(6*sigma,4*tau);const ratio=(Math.sqrt(5)-1)/2;let c=b-ratio*(b-a),d=a+ratio*(b-a);
  for(let i=0;i<100;i++){if(logPdf(c,mu,sigma,tau)>logPdf(d,mu,sigma,tau)){b=d;d=c;c=b-ratio*(b-a);}else{a=c;c=d;d=a+ratio*(b-a);}}
  const peak=(a+b)/2,sorted=[...data].sort((a,b)=>a-b);let ks=0;
  for(let i=0;i<n;i++){const f=cdf(sorted[i],mu,sigma,tau);ks=Math.max(ks,Math.abs(f-i/n),Math.abs((i+1)/n-f));}
  return !Number.isFinite(loss)||!Number.isFinite(peak)||peak<0?empty:{count:n,available:true,mu,sigma,tau,peak,ks,nll:loss};}
