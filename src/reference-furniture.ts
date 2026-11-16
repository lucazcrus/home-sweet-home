import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import type { SceneObject } from './scene-assets';

type Materials=Record<string,THREE.MeshStandardMaterial>;
export function createReferenceFurniture(o:SceneObject,m:Materials){
  const name=o.name.toLowerCase();
  if(!['linho claro','terracota','estofada','em l','ergonômica','circular','palhinha','carvalho','abajur','pufe'].some(word=>name.includes(word)))return undefined;
  const root=new THREE.Group(),w=o.sx,d=o.sy,h=o.sz;
  const mesh=(geometry:THREE.BufferGeometry,material:THREE.Material,x:number,y:number,z:number)=>{const object=new THREE.Mesh(geometry,material);object.position.set(x,y,z);object.castShadow=object.receiveShadow=true;root.add(object);return object;};
  const box=(x:number,y:number,z:number,sx:number,sy:number,sz:number,material:THREE.Material,r=.025)=>mesh(new RoundedBoxGeometry(sx,sy,sz,2,Math.min(r,sx/3,sy/3,sz/3)),material,x,y,z);
  const cylinder=(x:number,y:number,z:number,rt:number,rb:number,height:number,material:THREE.Material)=>mesh(new THREE.CylinderGeometry(rt,rb,height,24),material,x,y,z);
  const oak=m.oak||m.wood,cream=m.upholstery||m.linen,terra=m.terracotta||m.fabric;
  if(name.includes('linho claro')){
    for(const x of [-w*.40,w*.40])for(const z of [-d*.31,d*.31])cylinder(x,.06,z,.025,.025,.12,m.black);
    cylinder(-w*.28,.06,-d*.52,.025,.025,.12,m.black);
    box(0,.17,0,w,.22,d*.86,oak,.04);box(0,.58,d*.38,w*.98,.64,.18,cream,.075);
    for(const x of [-w*.46,w*.46])box(x,.45,0,w*.09,.5,d*.92,cream,.065);
    for(let i=0;i<3;i++){
      const x=(i-1)*w*.285;box(x,.38,-.04,w*.278,.22,d*.76,cream,.075);
      const back=box(x,.65,d*.25,w*.274,.37,.17,m.linen,.055);back.rotation.x=-.12;
    }
    box(-w*.28,.38,-d*.32,w*.31,.22,d*.60,cream,.07);
    for(const x of [-w*.26,w*.27]){const cushion=box(x,.66,d*.08,.34,.34,.12,m.linen,.06);cushion.rotation.z=x<0?.18:-.14;}
    box(w*.28,.5,-d*.21,.43,.025,.70,m.linen,.012).rotation.x=.30;
  }else if(name.includes('terracota')){
    cylinder(0,.055,0,w*.31,w*.30,.11,m.black);
    const shell=mesh(new THREE.SphereGeometry(1,24,14,0,Math.PI*2,0,Math.PI*.52),terra,0,.38,.06);shell.scale.set(w*.50,h*.70,d*.49);shell.rotation.x=-Math.PI/2;
    box(0,.35,-.07,w*.76,.17,d*.72,terra,.09);box(0,.61,d*.28,w*.85,.40,.17,terra,.08);
    for(const x of [-w*.40,w*.40])box(x,.49,0,w*.15,.37,d*.79,terra,.07);
  }else if(name.includes('estofada')){
    for(const x of [-w*.37,w*.37])for(const z of [-d*.34,d*.34])cylinder(x,.06,z,.027,.027,.12,m.black);
    box(0,.18,0,w,.29,d,cream,.055);box(0,.42,-.02,w*.99,.24,d*.98,m.linen,.085);
    box(0,.78,d*.48,w*1.10,1.08,.14,cream,.09);box(0,.57,-d*.13,w,.045,d*.70,cream,.018);
    for(const x of [-w*.23,w*.23]){box(x,.60,d*.26,w*.43,.17,d*.24,m.linen,.055);box(x,.65,d*.17,w*.36,.16,d*.18,cream,.05).rotation.x=.08;}
    box(0,.62,-d*.27,w*.99,.035,.62,m.linen,.015);
    for(let i=0;i<13;i++)box(-w*.45+i*w*.075,.598,-d*.12,.003,.002,d*.55,m.cane||m.linen,.001);
  }else if(name.includes('em l')){
    const depth=.70;
    box(0,h-.035,-d/2+depth/2,w,.07,depth,oak,.025);
    // Two adjoining surfaces, with no coplanar corner overlap.
    box(w/2-depth/2,h-.035,depth/2,depth,.07,d-depth,oak,.025);
    box(-w*.30,h*.47,-d/2+depth/2,w*.36,h*.90,depth*.95,oak,.02);
    for(let i=0;i<3;i++)box(-w*.30,.15+i*.20,-d/2+depth*.99,w*.34,.009,.012,m.wood,.002);
    for(const z of [-d*.35,d*.39])box(w*.34,(h-.07)/2,z,.045,h-.07,.045,m.black,.008);
    for(const z of [-.05,.75]){
      const stand=cylinder(w*.28,h+.10,z,.012,.012,.2,m.metal);stand.rotation.z=.10;
      box(w*.28,h+.015,z,.19,.025,.25,m.metal,.01);
      box(w*.31,h+.36,z,.035,.39,.62,m.black,.018);
      box(w*.293,h+.365,z,.004,.34,.56,m.screen||m.black,.004);
      box(w*.12,h+.008,z,.19,.015,.39,m.black,.008);box(w*.09,h+.013,z+.29,.085,.025,.055,m.black,.016);
    }
  }else if(name.includes('ergonômica')){
    const upholstery=name.includes('branca')?cream:m.black;
    cylinder(0,.21,0,.025,.025,.30,m.metal);box(0,.45,0,w,.09,d*.85,upholstery,.05);
    const back=box(0,.70,d*.35,w*.82,.48,.045,upholstery,.04);back.rotation.x=-.13;
    for(let i=0;i<5;i++){
      const angle=i*Math.PI*.4,foot=box(Math.cos(angle)*w*.20,.08,Math.sin(angle)*d*.20,w*.49,.025,.04,m.metal,.012);foot.rotation.y=-angle;
      const wheel=cylinder(Math.cos(angle)*w*.42,.035,Math.sin(angle)*d*.42,.035,.035,.035,m.black);wheel.rotation.z=Math.PI/2;
    }
    for(const x of [-w*.48,w*.48]){box(x,.53,0,.025,.20,.025,m.metal,.007);box(x,.64,-.015,.045,.035,.25,upholstery,.015);}
  }else if(name.includes('circular')){
    cylinder(0,.012,0,w/2,w/2,.024,m.roundRug||m.linen);
  }else if(name.includes('palhinha')){
    box(0,(h+.12)/2,0,w,h-.12,d,oak,.018);box(0,(h+.12)/2,-d*.506,w*.88,(h-.12)*.82,.018,m.cane||m.linen,.005);
    for(const x of [-w*.35,w*.35])for(const z of [-d*.30,d*.30])box(x,.07,z,.025,.14,.025,oak,.005);
    cylinder(0,h*.55,-d*.54,.012,.012,.022,m.brass||m.metal).rotation.x=Math.PI/2;
  }else if(name.includes('abajur')){
    cylinder(0,.025,0,w*.32,w*.34,.05,m.lampshade||m.counter);cylinder(0,h*.35,0,.018,.024,h*.56,m.brass||oak);
    const shade=mesh(new THREE.SphereGeometry(w/2,24,12,0,Math.PI*2,0,Math.PI/2),m.lampshade||m.light,0,h*.62,0);
    shade.scale.y=.65;cylinder(0,h*.62,0,w*.48,w*.48,.014,m.light);
  }else if(name.includes('pufe')){
    cylinder(0,h/2,0,w/2,w*.47,h,cream);cylinder(0,h-.01,0,w*.49,w*.49,.035,m.linen);
  }else if(name.includes('carvalho')){
    if(name.includes('lateral')){cylinder(0,h-.025,0,w/2,w/2,.05,oak);cylinder(0,h*.45,0,w*.11,w*.23,h*.90,oak);}
    else{
      box(0,h-.045,0,w,.09,d,oak,.045);
      for(const x of [-w*.35,w*.35])for(const z of [-d*.30,d*.30])box(x,(h-.09)/2,z,.05,h-.09,.05,oak,.01);
      if(name.includes('centro')){box(w*.16,h+.025,0,w*.30,.035,d*.42,m.linen,.007);cylinder(-w*.20,h+.055,0,.045,.045,.11,m.candle||m.light);}
      if(name.includes('jantar')){cylinder(0,h+.08,0,.065,.09,.16,m.counter);}
    }
  }
  return root;
}
