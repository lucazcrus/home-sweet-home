import * as THREE from 'three';
import { createReferenceFurniture } from './reference-furniture';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

export type SceneObject = {name:string;x:number;y:number;z:number;sx:number;sy:number;sz:number;material:string;group:string;id?:string;furniture?:boolean;rotation?:number;keepFullHeight?:boolean};
export const colors:Record<string,string>={ceilingPlaster:'#f3eee3',deckWood:'#8d5d40',oak:'#b58b5f',sage:'#747f6f',upholstery:'#e5dccb',terracotta:'#b26a46',cane:'#c2a47c',roundRug:'#e4d9c8',lampshade:'#efe1c5',brass:'#b59c6b',screen:'#24343c',candle:'#f3bf6c',facadeStone:'#e1d4b9',grass:'#4e6d3f',poolTile:'#75948b',floor:'#d7d0c2',tile:'#d8d2c5',woodFloor:'#967253',concrete:'#b9b7af',warmWhite:'#e4dfd4',white:'#f3eee3',glass:'#d7e7e6',black:'#252b2b',wood:'#886344',stone:'#797063',paver:'#c9c3b6',dark:'#30302d',cabinet:'#af8b65',cabinetLight:'#d9d2c4',counter:'#eeebe1',bath:'#d6d0c5',green:'#58704a',metal:'#777772',roof:'#e7e4db',light:'#ffe2a4',fabric:'#c4bba8',linen:'#ded7c6'};
export function makeMaterials(){
  const materials:Record<string,THREE.MeshStandardMaterial>={};
  for(const [key,color] of Object.entries(colors)){
    const canvas=document.createElement('canvas');canvas.width=canvas.height=256;const ctx=canvas.getContext('2d')!;
    ctx.fillStyle=color;ctx.fillRect(0,0,256,256);
    let seed=1234;const random=()=>{seed=(seed*16807)%2147483647;return seed/2147483647;};
    for(let i=0;i<5000;i++){ctx.fillStyle=`rgba(${random()>.5?'255,255,255':'0,0,0'},${random()*.045})`;ctx.fillRect(random()*256,random()*256,1+random()*3,1+random()*3);}
    if(['wood','woodFloor','cabinet','oak','deckWood'].includes(key)){
      for(let i=0;i<180;i++){ctx.strokeStyle=`rgba(45,27,12,${random()*.12})`;ctx.lineWidth=.2+random();ctx.beginPath();const x=random()*256;ctx.moveTo(x,0);ctx.bezierCurveTo(x+random()*8,70,x-random()*8,180,x,256);ctx.stroke();}
      if(key==='woodFloor'){ctx.strokeStyle='#65503b55';ctx.lineWidth=1;for(let x=0;x<256;x+=64){ctx.strokeRect(x,0,64,256);ctx.beginPath();ctx.moveTo(x,64+(x%128));ctx.lineTo(x+64,64+(x%128));ctx.stroke();}}
    }
    if(['tile','floor','paver','bath'].includes(key)){ctx.strokeStyle='#a39e9244';ctx.lineWidth=1.3;ctx.strokeRect(.5,.5,255,255);}
    if(key==='poolTile'){
      for(let row=0;row<10;row++)for(let col=0;col<10;col++){
        ctx.fillStyle=`hsl(${153+random()*14},${11+random()*8}%,${42+random()*15}%)`;
        ctx.fillRect(col*25.6,row*25.6,25.6,25.6);ctx.strokeStyle='#c2cec08a';ctx.lineWidth=.8;ctx.strokeRect(col*25.6,row*25.6,25.6,25.6);
      }
    }
    if(key==='cane'){ctx.strokeStyle='#765d3d66';ctx.lineWidth=1;for(let n=-256;n<512;n+=9){ctx.beginPath();ctx.moveTo(n,0);ctx.lineTo(n+256,256);ctx.stroke();ctx.beginPath();ctx.moveTo(n,0);ctx.lineTo(n-256,256);ctx.stroke();}}
    if(key==='roundRug'){ctx.strokeStyle='#b9a58d';ctx.lineWidth=3;for(let r=5;r<180;r+=6){ctx.beginPath();ctx.arc(128,128,r,0,Math.PI*2);ctx.stroke();}}
    const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.anisotropy=8;
    const material=new THREE.MeshStandardMaterial({map:texture,roughness:key==='metal'?.28:key==='counter'?.25:.78,metalness:key==='metal'?.75:0});
    if(key==='deckWood'){texture.rotation=Math.PI/2;texture.center.set(.5,.5);}
    if(key==='glass'){material.map=null;material.color.set(color);material.transparent=true;material.opacity=.18;material.roughness=.08;material.depthWrite=false;}
    if(key==='ceilingPlaster'){material.userData.indirectCeiling=true;material.emissive.set('#f3efe6');material.emissiveIntensity=.28;}
    if(key==='lampshade'||key==='candle'){material.emissive.set('#ffd090');material.emissiveIntensity=.2;}
    if(key==='brass'){material.metalness=.75;material.roughness=.28;}
    if(key==='light'){material.userData.dayNightEmission=true;material.emissive.set('#ffcb83');material.emissiveIntensity=2;}
    materials[key]=material;
  }
  return materials;
}

export function createFurniture(o:SceneObject,m:Record<string,THREE.MeshStandardMaterial>){
  const reference=createReferenceFurniture(o,m);if(reference){reference.position.set(o.x,o.z-o.sz/2+.055,o.y);reference.rotation.y=-(o.rotation||0)*Math.PI/180;return reference;}
  const root=new THREE.Group();const w=o.sx,d=o.sy,h=o.sz;
  const part=(x:number,y:number,z:number,sx:number,sy:number,sz:number,mat:string,r=.025)=>{
    const mesh=new THREE.Mesh(r?new RoundedBoxGeometry(sx,sy,sz,2,Math.min(r,sx/3,sy/3,sz/3)):new THREE.BoxGeometry(sx,sy,sz),m[mat]||m.wood);mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;root.add(mesh);return mesh;
  };
  const legs=(top:number,spanX=w*.8,spanZ=d*.75)=>{for(const x of [-spanX/2,spanX/2])for(const z of [-spanZ/2,spanZ/2])part(x,top/2,z,.045,top,.045,'wood',.01);};
  const name=o.name.toLowerCase();
  if(name.includes('sofá')||name.includes('poltrona')){
    const count=name.includes('poltrona')?1:3;legs(.16);part(0,.24,0,w,.23,d*.92,'wood');
    part(0,h*.68,d*.39,w*.96,h*.62,d*.18,'fabric',.07);
    for(const x of [-w*.46,w*.46])part(x,h*.5,0,w*.09,h*.55,d,'fabric',.05);
    for(let i=0;i<count;i++){const x=(i-(count-1)/2)*(w*.83/count);part(x,h*.45,-d*.04,w*.81/count,.2,d*.76,'linen',.07);const cushion=part(x,h*.72,d*.23,w*.79/count,h*.4,.17,'fabric',.05);cushion.rotation.x=-.12;}
    const pillow=part(-w*.31,h*.7,-d*.03,w*.19,h*.34,.15,'woodFloor',.055);pillow.rotation.z=.2;
  }else if(name.includes('cama')){
    legs(.14);part(0,.23,0,w,.27,d,'wood',.035);part(0,.44,-.02,w*.96,.24,d*.96,'linen',.08);part(0,.77,d*.48,w*1.08,.93,.1,'wood',.03);
    part(0,.59,-d*.22,w*.97,.08,d*.5,'fabric',.025);
    for(const x of [-w*.24,w*.24]){const pillow=part(x,.61,d*.29,w*.42,.16,d*.22,'linen',.07);pillow.rotation.x=.08;}
  }else if(name.includes('planta')){
    const pot=new THREE.Mesh(new THREE.CylinderGeometry(w*.32,w*.23,h*.35,24),m.counter);pot.position.y=h*.175;pot.castShadow=true;root.add(pot);
    for(let i=0;i<15;i++){const angle=i*2.399;const leaf=new THREE.Mesh(new THREE.SphereGeometry(1,10,8),m.green);leaf.scale.set(w*.14,h*(.2+(i%3)*.04),w*.045);leaf.position.set(Math.cos(angle)*w*.25,h*.55+(i%3)*h*.09,Math.sin(angle)*d*.25);leaf.rotation.set(Math.sin(angle)*.55,angle,Math.cos(angle)*.55);leaf.castShadow=true;root.add(leaf);}
  }else if(name.includes('tapete')){part(0,.014,0,w,.028,d,'fabric',.015);}
  else if(name.includes('cadeira')){
    legs(h*.5,w*.72,d*.7);part(0,h*.51,0,w,.09,d,'linen',.045);part(0,h*.77,d*.39,w*.95,h*.46,.09,'fabric',.04);
  }else if(name.includes('mesa')||name.includes('escrivaninha')){
    legs(h-.06,w*.8,d*.72);part(0,h-.045,0,w,.09,d,'wood',.045);
    if(name.includes('centro')){part(w*.15,h+.025,0,w*.35,.035,d*.45,'counter',.012);part(-w*.25,h+.04,d*.1,w*.18,.06,d*.25,'linen',.015);}
    if(name.includes('jantar')){const vase=new THREE.Mesh(new THREE.CylinderGeometry(.07,.1,.19,20),m.counter);vase.position.y=h+.095;root.add(vase);}
    if(name.includes('escrivaninha')){part(0,h+.25,d*.22,w*.4,.4,.035,'black');part(0,h+.05,d*.13,.28,.04,.18,'metal');}
  }else{
    legs(.12);part(0,h*.52,0,w,h*.8,d,'wood');for(let i=0;i<3;i++)part((i-1)*w/3,h*.52,-d*.51,w/3-.012,h*.72,.028,'cabinetLight',.005);
  }
  root.position.set(o.x,o.z-o.sz/2+.055,o.y);root.rotation.y=-(o.rotation||0)*Math.PI/180;
  return root;
}

export const REFERENCE_DESIGN_VERSION=3;
const starterIds=new Set(['living-rug','living-sofa','living-coffee','living-chair','living-plant','dining-table','suite-rug','suite-bed','suite-night-a','suite-night-b','guest-bed','guest-night','office-desk','office-chair','office-plant']);
export function furnish(objects:SceneObject[],savedDesignVersion=0){
  if(savedDesignVersion>=REFERENCE_DESIGN_VERSION)return objects;
  if(savedDesignVersion===1){
    const changes:Record<string,{oldX:number;oldY:number;next:Partial<SceneObject>}>= {
      'office-desk':{oldX:8.5,oldY:2.85,next:{x:8.5,y:3.2925,sx:1.575,sy:2.15,rotation:90}},
      'office-chair':{oldX:8.72,oldY:2.40,next:{x:8.98,y:3.07,rotation:180}},
      'office-chair-b':{oldX:8.72,oldY:3.40,next:{x:7.98,y:3.07,rotation:180}},
      'office-rug':{oldX:8.05,oldY:3.15,next:{x:8.05,y:2.70}},
      'dining-table':{oldX:8.05,oldY:13.95,next:{y:14.60}}
    };
    objects=objects.map(o=>{
      const change=changes[o.id||''];if(change&&Math.abs(o.x-change.oldX)<.01&&Math.abs(o.y-change.oldY)<.01)return {...o,...change.next};
      if((o.id?.startsWith('chair-a-')&&Math.abs(o.y-13.17)<.01)||(o.id?.startsWith('chair-b-')&&Math.abs(o.y-14.73)<.01))return {...o,y:o.y+.65};
      return o;
    });
  }
  if(savedDesignVersion>=1){
    const changes:Record<string,{old:[number,number];next:Partial<SceneObject>}>={
      'living-sofa':{old:[9.05,17.15],next:{x:8.92}},
      'living-coffee':{old:[7.95,17.20],next:{x:7.80}},
      'living-chair':{old:[7.25,18.85],next:{x:7.50,y:19.14}},
      'living-chair-b':{old:[8.22,19.05],next:{x:8.55,y:19.14}},
      'living-side-table':{old:[7.75,19.16],next:{x:7.83,y:18.10}},
      'living-lamp':{old:[6.92,18.19],next:{z:.55-.055+.33/2}},
      'suite-night-a':{old:[3.98,.65],next:{x:3.95}},
      'suite-night-b':{old:[6.21,.65],next:{x:6.24}},
      'suite-lamp-a':{old:[3.98,.65],next:{x:3.95}},
      'suite-lamp-b':{old:[6.21,.65],next:{x:6.24}},
      'suite-stool':{old:[6.10,2.18],next:{x:6.20}},
      'guest-bed':{old:[8.65,6.78],next:{x:8.325,y:8.99,rotation:180}},
      'guest-night':{old:[9.29,5.88],next:{x:9.53,y:8.12}},
      'office-desk':{old:[8.50,3.2925],next:{y:3.69}},
      'office-chair':{old:[8.98,3.07],next:{x:8.55,y:3.52,rotation:180}},
      'office-chair-b':{old:[7.98,3.07],next:{x:7.75,y:3.52,rotation:180}},
      'office-rug':{old:[8.05,2.70],next:{y:3.10}}
    };
    return objects.map(o=>{
      const change=changes[o.id||''];
      if(change&&Math.abs(o.x-change.old[0])<.01&&Math.abs(o.y-change.old[1])<.01)return {...o,...change.next};
      if(o.id?.startsWith('chair-a-')&&Math.abs(o.y-13.82)<.01)return {...o,y:14.06,rotation:180};
      if(o.id?.startsWith('chair-b-')&&Math.abs(o.y-15.38)<.01)return {...o,y:15.14,rotation:0};
      return o;
    });
  }
  const result=objects.filter(o=>!o.furniture||!(starterIds.has(o.id||'')||o.id?.startsWith('chair-a-')||o.id?.startsWith('chair-b-')));
  const add=(id:string,name:string,x:number,y:number,sx:number,sy:number,sz:number,group:string,rotation=0,material='oak')=>result.push({id,name,x,y,z:sz/2,sx,sy,sz,group,rotation,material,furniture:true});
  add('living-rug','Tapete da sala',8.05,17.35,2.75,3.80,.025,'Sala',0,'linen');
  add('living-sofa','Sofá em L — linho claro',8.92,17.15,2.60,1.18,.88,'Sala',-90,'upholstery');
  add('living-coffee','Mesa de centro em carvalho',7.80,17.20,1.10,.65,.36,'Sala',90);
  add('living-chair','Poltrona curva terracota',7.50,19.14,.72,.73,.78,'Sala',-20,'terracotta');
  add('living-chair-b','Poltrona curva terracota',8.55,19.14,.72,.73,.78,'Sala',15,'terracotta');
  add('living-side-table','Mesa lateral em carvalho',7.83,18.10,.36,.36,.48,'Sala');
  add('living-lamp','Abajur cogumelo da sala',6.92,18.19,.28,.28,.33,'Sala',0,'lampshade');
  result.at(-1)!.z=.55-.055+.33/2;
  add('dining-table','Mesa de jantar em carvalho',8.05,14.60,1.75,.88,.76,'Jantar');
  for(const x of [7.50,8.05,8.60]){add(`chair-a-${x}`,'Cadeira',x,14.06,.45,.47,.84,'Jantar',180);add(`chair-b-${x}`,'Cadeira',x,15.14,.45,.47,.84,'Jantar',0);}
  add('suite-rug','Tapete do quarto master',5.10,1.87,2.85,2.95,.025,'Quarto master',0,'linen');
  add('suite-bed','Cama queen estofada — master',5.10,1.72,1.62,2.03,.64,'Quarto master',180,'upholstery');
  add('suite-night-a','Criado em carvalho e palhinha',3.95,.65,.46,.43,.48,'Quarto master',180);
  add('suite-night-b','Criado em carvalho e palhinha',6.24,.65,.46,.43,.48,'Quarto master',180);
  add('suite-lamp-a','Abajur cogumelo master',3.95,.65,.27,.27,.30,'Quarto master',0,'lampshade');result.at(-1)!.z=.48+.30/2;
  add('suite-lamp-b','Abajur cogumelo master',6.24,.65,.27,.27,.30,'Quarto master',0,'lampshade');result.at(-1)!.z=.48+.30/2;
  add('suite-stool','Pufe da penteadeira',6.20,2.18,.49,.49,.43,'Quarto master',0,'upholstery');
  add('guest-bed','Cama queen — hóspedes',8.325,8.99,1.55,1.98,.60,'Hóspedes',180,'linen');
  add('guest-night','Criado-mudo',9.53,8.12,.40,.40,.48,'Hóspedes');
  add('office-desk','Escrivaninha dupla em L',8.50,3.69,1.575,2.15,.76,'Escritório',90);
  add('office-chair','Cadeira ergonômica branca',8.55,3.52,.53,.55,.96,'Escritório',180,'upholstery');
  add('office-chair-b','Cadeira ergonômica preta',7.75,3.52,.53,.55,.96,'Escritório',180,'black');
  add('office-rug','Tapete circular do escritório',8.05,3.10,1.70,1.70,.025,'Escritório',0,'roundRug');
  return result;
}

// Move only untouched starter furniture when the architectural layout changes.
// Custom furniture and manually moved pieces retain their saved coordinates.
export function migrateFurniture(objects:SceneObject[],version:number){
  if(version>=4)return objects;
  const moves:Record<string,[number,number,number,number]>={
    'suite-rug':[2.8,8.6,5.1,1.8],'suite-bed':[2.8,8.3,5.1,1.65],
    'suite-night-a':[1.7,9,4,1.3],'suite-night-b':[3.9,9,6.2,1.3],
    'guest-bed':[8.1,7.1,8.45,6.1],'guest-night':[9.12,7.8,9.35,6.8],
    'office-desk':[8.1,11.35,8.3,10.35],'office-chair':[8.1,10.55,8.3,9.55],'office-plant':[9.15,10.9,9.35,9.9]
  };
  return objects.map(object=>{const move=moves[object.id||''];return move&&Math.abs(object.x-move[0])<.01&&Math.abs(object.y-move[1])<.01?{...object,x:move[2],y:move[3]}:object;});
}
