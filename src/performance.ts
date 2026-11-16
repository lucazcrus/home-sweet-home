import * as THREE from 'three';

/** Opt-in diagnostics for repeatable local checks. Never shown in the normal viewer. */
export function createPerformanceMonitor(host:HTMLElement,camera:THREE.PerspectiveCamera,target:THREE.Vector3){
  if(!new URLSearchParams(location.search).has('perf'))return {beforeFrame:(_time:number)=>false,afterFrame:(_dt:number,_cpu:number,_calls:number,_triangles:number)=>{},dispose:()=>{}};
  const panel=document.createElement('div');panel.className='performance-monitor';
  const output=document.createElement('output'),button=document.createElement('button');button.textContent='Measure orbit · 8 s';
  output.textContent='Ready to measure orbit';panel.append(output,button);host.append(panel);
  let recording=false,started=0,azimuth=0,radius=0,height=0,lastReport=0;
  let durations:number[]=[],costs:number[]=[],calls:number[]=[],triangles:number[]=[];
  const average=(list:number[])=>list.reduce((a,b)=>a+b,0)/Math.max(1,list.length);
  const report=()=>{
    const sorted=[...durations].sort((a,b)=>a-b);const fps=1000/average(durations),p95=sorted[Math.floor((sorted.length-1)*.95)]||0;
    output.textContent=`${recording?'Measuring orbit':'Last sample'} · ${fps.toFixed(1)} FPS · p95 ${p95.toFixed(1)} ms · CPU ${average(costs).toFixed(1)} ms · ${Math.round(average(calls))} draw calls · ${Math.round(average(triangles)/1000)}k triangles`;
  };
  button.onclick=()=>{recording=true;started=performance.now();const offset=camera.position.clone().sub(target);azimuth=Math.atan2(offset.x,offset.z);radius=Math.hypot(offset.x,offset.z);height=offset.y;durations=[];costs=[];calls=[];triangles=[];button.disabled=true;};
  return {beforeFrame(time:number){
    if(!recording)return false;
    const elapsed=time-started;
    if(elapsed>=8000){recording=false;button.disabled=false;report();return false;}
    const angle=azimuth+Math.sin(elapsed/8000*Math.PI*2)*.24;
    camera.position.set(target.x+Math.sin(angle)*radius,target.y+height,target.z+Math.cos(angle)*radius);camera.lookAt(target);return true;
  },afterFrame(dt:number,cpu:number,drawCalls:number,triangleCount:number){
    if(!recording||performance.now()-started<1000)return;
    durations.push(dt*1000);costs.push(cpu);calls.push(drawCalls);triangles.push(triangleCount);
    if(performance.now()-lastReport>800){report();lastReport=performance.now();}
  },dispose(){panel.remove();}};
}
