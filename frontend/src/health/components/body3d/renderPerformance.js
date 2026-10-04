export const TARGET_FPS=30,WARNING_FPS=25,CRITICAL_FPS=20;
// Demand-render idle gaps are excluded; only contiguous rendered frames trigger fallback.
export class RenderPerformance{
 constructor(){this.last=null;this.slowMs=0;this.intervals=[];this.fallback=false;}
 sample(time,renderMs){
  const dt=this.last===null?0:time-this.last;this.last=time;
  if(dt>0&&dt<=250){this.intervals.push(dt);if(this.intervals.length>60)this.intervals.shift();this.slowMs=dt>1000/CRITICAL_FPS?this.slowMs+dt:0;}
  else{this.intervals=[];this.slowMs=0;}
  if(this.slowMs>=3000)this.fallback=true;
  return {warning:this.intervals.length>0&&1000*this.intervals.length/this.intervals.reduce((a,b)=>a+b,0)<WARNING_FPS,renderedFPS:this.intervals.length?Number((1000*this.intervals.length/this.intervals.reduce((a,b)=>a+b,0)).toFixed(1)):null,renderTimeMs:Number(renderMs.toFixed(2)),fallbackActive:this.fallback};
 }
}
