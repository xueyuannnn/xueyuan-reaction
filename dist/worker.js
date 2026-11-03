import {aggregate} from './analytics.js?v=1.0.3';
self.onmessage=({data})=>{try{self.postMessage({revision:data.revision,data:aggregate(data.runs,data.key)});}catch(e){self.postMessage({revision:data.revision,error:e.message});}};
