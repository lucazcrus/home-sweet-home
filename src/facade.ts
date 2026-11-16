import * as THREE from 'three';
import { cycleLight } from './day-night';

// Dimensions here are photographic estimates around the measured house envelope.
// World coordinates: X width, Y height, Z depth (street/front is +Z).
export function createOutdoorEnvironment(renderer:THREE.WebGLRenderer,evening=false){
  const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=512;const c=canvas.getContext('2d')!;
  const sky=c.createLinearGradient(0,0,0,512);sky.addColorStop(0,evening?'#0e2235':'#5486b6');sky.addColorStop(.43,evening?'#3a4c61':'#b3d2e5');sky.addColorStop(.53,evening?'#59616a':'#e9e7d8');sky.addColorStop(.54,evening?'#29332e':'#707c6d');sky.addColorStop(1,evening?'#18231b':'#424d3d');c.fillStyle=sky;c.fillRect(0,0,1024,512);
  let seed=119;const random=()=>{seed=seed*16807%2147483647;return seed/2147483647;};
  for(let i=0;i<85;i++){const x=random()*1024,y=60+random()*155;const cloud=c.createRadialGradient(x,y,0,x,y,20+random()*48);cloud.addColorStop(0,evening?'#ffffff12':'#ffffff65');cloud.addColorStop(1,'#ffffff00');c.fillStyle=cloud;c.fillRect(x-70,y-70,140,140);}
  for(let i=0;i<28;i++){c.fillStyle=evening?'#24362d':i%3?'#6b7d69':'#67766a';c.beginPath();c.ellipse(random()*1024,279+random()*28,14+random()*35,10+random()*32,0,0,Math.PI*2);c.fill();}
  const source=new THREE.CanvasTexture(canvas);source.mapping=THREE.EquirectangularReflectionMapping;source.colorSpace=THREE.SRGBColorSpace;
  const pmrem=new THREE.PMREMGenerator(renderer);const target=pmrem.fromEquirectangular(source);pmrem.dispose();return {source,target};
}

type Options={evening:boolean;roof:boolean;site:boolean;environment:THREE.Texture};
export function addFacadeDetails(scene:THREE.Scene,m:Record<string,THREE.MeshStandardMaterial>,options:Options){
  const root=new THREE.Group();root.name='Detalhes da fachada por referência';scene.add(root);
  const roof=new THREE.Group();roof.name='Detalhes dependentes da cobertura';roof.userData.batchBoundary=true;root.add(roof);
  const site=new THREE.Group();site.name='Jardim frontal detalhado';site.userData.batchBoundary=true;root.add(site);
  const materials:THREE.Material[]=[];
  const material=(color:string,roughness=.8)=>{const mat=new THREE.MeshStandardMaterial({color,roughness});materials.push(mat);return mat;};
  const stucco=m.white,black=m.black,wood=m.wood;
  const mesh=(name:string,geometry:THREE.BufferGeometry,mat:THREE.Material,parent:THREE.Object3D=root)=>{const object=new THREE.Mesh(geometry,mat);object.name=name;object.castShadow=true;object.receiveShadow=true;parent.add(object);return object;};
  const box=(name:string,x:number,y:number,z:number,w:number,h:number,d:number,mat:THREE.Material=stucco,parent:THREE.Object3D=root)=>{const object=mesh(name,new THREE.BoxGeometry(w,h,d),mat,parent);object.position.set(x,y,z);return object;};
  const tube=(name:string,points:THREE.Vector3[],radius:number,mat:THREE.Material,parent:THREE.Object3D=root)=>mesh(name,new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),24,radius,5,false),mat,parent);
  let seed=6782;const random=()=>{seed=seed*16807%2147483647;return seed/2147483647;};
  // Recessed vertical battens and the door hardware.
  for(let i=0;i<42;i++){
    const mat=wood.clone();mat.color.setHSL(.085,.18,.84+random()*.12);materials.push(mat);
    box(`Ripa vertical ${i+1}`,5.548+i*.0279,1.43,19.731,.021,2.70,.055,mat);
  }
  box('Puxador longo',6.53,1.25,19.79,.022,1.15,.04,black);
  for(const y of [.78,1.72])box('Afastador do puxador',6.53,y,19.755,.024,.025,.09,black);
  box('Fechadura digital',6.61,1.26,19.75,.045,.13,.024,black);
  box('Teclado da fechadura',6.61,1.28,19.766,.028,.06,.003,material('#48504b',.3));
  box('Fresta da folha pivotante',6.66,1.43,19.73,.008,2.7,.003,black);
  box('Rodapé metálico da entrada',6.12,.09,19.745,1.17,.055,.035,material('#96968c',.32));
  // Irregular pale natural stone, as in the generated facade concept.
  const stoneColors=['#d4c5a5','#ddd0b3','#e5d9bf','#cdbf9f','#e2d1ad','#d9caac'];
  const stoneMaterials=stoneColors.map(color=>material(color,.93));
  const grainCanvas=document.createElement('canvas');grainCanvas.width=grainCanvas.height=128;const grainContext=grainCanvas.getContext('2d')!;grainContext.fillStyle='#888';grainContext.fillRect(0,0,128,128);for(let i=0;i<12000;i++){grainContext.fillStyle=random()>.5?'#aaa':'#666';grainContext.fillRect(random()*128,random()*128,1,1);}const grain=new THREE.CanvasTexture(grainCanvas);grain.wrapS=grain.wrapT=THREE.RepeatWrapping;for(const stone of stoneMaterials){stone.bumpMap=grain;stone.bumpScale=.006;}
  const stoneArea=(x:number,y:number,z:number,w:number,h:number)=>{
    const cols=Math.max(2,Math.ceil(w/.19)),rows=Math.max(2,Math.ceil(h/.21)),points:THREE.Vector2[]=[];
    for(let row=0;row<rows;row++)for(let col=0;col<cols;col++)points.push(new THREE.Vector2(-w/2+(col+.5+(random()-.5)*.65)*w/cols,-h/2+(row+.5+(random()-.5)*.65)*h/rows));
    for(const center of points){
      let polygon=[new THREE.Vector2(-w/2,-h/2),new THREE.Vector2(w/2,-h/2),new THREE.Vector2(w/2,h/2),new THREE.Vector2(-w/2,h/2)];
      for(const neighbor of points){
        if(neighbor===center)continue;
        const normal=neighbor.clone().sub(center),constant=(neighbor.lengthSq()-center.lengthSq())/2,result:THREE.Vector2[]=[];
        for(let i=0;i<polygon.length;i++){
          const a=polygon[i],b=polygon[(i+1)%polygon.length],da=a.dot(normal)-constant,db=b.dot(normal)-constant;
          if(da<=0)result.push(a);if((da<=0)!==(db<=0))result.push(a.clone().lerp(b,da/(da-db)));
        }
        polygon=result;if(polygon.length<3)break;
      }
      if(polygon.length<3)continue;
      const shape=new THREE.Shape(polygon.map(point=>point.clone().sub(center).multiplyScalar(.965).add(center)));
      const geometry=new THREE.ExtrudeGeometry(shape,{depth:.022+random()*.024,bevelEnabled:true,bevelSegments:1,steps:1,bevelSize:.002,bevelThickness:.003});
      const stone=mesh('Pedra clara irregular',geometry,stoneMaterials[Math.floor(random()*stoneMaterials.length)]);stone.position.set(x,y,z);
    }
  };
  stoneArea(6.87,2.23,20.001,.25,3.9);stoneArea(9.43,2.23,20.001,.20,3.9);stoneArea(8.14,4.04,20.001,2.76,.28);stoneArea(8.14,.23,20.047,2.92,.36);
  // Single transparent pane with only its perimeter frame.
  box('Peitoril de pedra',8.145,.435,19.98,2.46,.035,.28,material('#c9bda3',.75));
  const glass=scene.getObjectByName('Vidro alto frontal');
  if(glass instanceof THREE.Mesh){
    const glazing=new THREE.MeshPhysicalMaterial({color:'#d8e2dc',roughness:.045,metalness:.06,transparent:true,opacity:.20,transmission:0,thickness:.016,ior:1.5,clearcoat:1,envMapIntensity:.55,depthWrite:false});glazing.userData.dayNightGlass=true;glass.material=glazing;materials.push(glazing);
  }
  // Thin folded flashings and drip grooves on the white parapets.
  box('Rufo superior escuro',8.02,5.12,19.88,3.94,.025,.96,black);
  box('Pingadeira inferior do pórtico',8.02,4.476,20.22,3.49,.008,.012,material('#a4a69c'));
  box('Junta horizontal do forro alto',8.0,4.478,19.81,3.35,.006,.01,material('#b5b5aa'));
  const beforeRoof=new Set(root.children);
  if(options.roof){
    box('Rufo da marquise baixa',3.33,3.292,20.07,6.74,.016,.22,black);
    box('Rufo lateral da marquise',6.58,3.292,17.57,.2,.016,5.1,black);
    const seam=material('#a6a69a');
    for(const x of [2.42,5.25])box('Junta do alçapão',x,2.86,17.65,.008,.008,2.70,seam);
    for(const z of [16.30,19.0])box('Junta do alçapão',3.835,2.86,z,2.83,.008,.008,seam);
    for(const [x,z] of [[2.1,16.2],[5.8,16.2],[2.1,19.1],[5.8,19.1]]){
      const spot=mesh('Spot embutido',new THREE.CylinderGeometry(.045,.045,.015,16),m.light);spot.position.set(x,2.85,z);
      const light=cycleLight(new THREE.PointLight('#ffe2ae',0,3,2),0,3);light.position.set(x,2.76,z);root.add(light);
    }
  }
  for(const child of [...root.children])if(!beforeRoof.has(child))roof.add(child);
  const fixture=(x:number,y:number,z:number,side=false)=>{
    box('Arandela preta',x,y,z,side?.055:.09,.13,side?.09:.055,black);
    const glow=cycleLight(new THREE.PointLight('#ffdd9b',0,2.1,2),0,2.5);glow.position.set(x+(side?.08:0),y,z+(side?0:.08));root.add(glow);
    for(const sign of [-1,1]){const spot=cycleLight(new THREE.SpotLight('#ffe3ad',0,2.5,.48,.65,1.8),0,4.5);spot.position.set(x+(side?.06:0),y+sign*.065,z+(side?0:.06));spot.target.position.set(x+(side?.03:0),y+sign*.9,z+(side?0:.015));root.add(spot,spot.target);}
  };
  fixture(1.2,1.85,15.31);fixture(5.02,1.85,15.31);fixture(.36,1.75,16.4,true);fixture(.36,1.75,18.1,true);
  // A reveal, handle and sill make the service door read as a separate leaf.
  for(const x of [3.245,4.115])box('Guarnição da porta de serviço',x,1.13,15.352,.025,2.21,.025,black);
  box('Guarnição superior',3.68,2.23,15.352,.9,.025,.025,black);box('Puxador da porta de serviço',3.99,1.10,15.372,.018,.14,.025,material('#939792',.3));
  if(!options.site)return root;
  const beforeSite=new Set(root.children);
  // Front approach: broad slabs with continuous grass joints, not small tiles.
  const paving=m.concrete.clone();paving.roughness=.96;if(paving.map){paving.map=paving.map.clone();paving.map.repeat.set(2,1);}materials.push(paving);
  for(let row=0;row<3;row++){
    const z=20.87+row*1.38;
    box('Placa larga de concreto lavado',2.27,.015,z,4.22,.065,1.18,paving);
    box('Placa do caminho social',5.53,.015,z,1.95,.065,1.18,paving);
    box('Balizador embutido no piso',6.28,.057,z+.34,.065,.018,.065,black);
    box('Lente do balizador',6.28,.069,z+.34,.045,.004,.045,m.light);
    {const light=cycleLight(new THREE.PointLight('#ffe1ab',0,.65,2),0,.65);light.position.set(6.28,.14,z+.34);root.add(light);}
  }
  box('Passeio frontal',5,-.055,24.85,10,.1,.65,paving);
  const soil=material('#4e4236');box('Canteiro junto ao vidro',8.18,.005,20.24,3.05,.035,.34,soil);
  // Pin-nate palm leaves are actual slender leaflets along a curved rachis.
  const leafMaterials=[material('#375137'),material('#587148'),material('#6c7c4c')];leafMaterials.forEach(mat=>mat.side=THREE.DoubleSide);
  const palm=(x:number,z:number,height:number,radius:number)=>{
    const trunkMat=material('#716045');const trunk=mesh('Tronco de palmeira',new THREE.CylinderGeometry(.075,.12,height,12,10),trunkMat);trunk.position.set(x,height/2,z);trunk.rotation.z=.07;
    for(let i=0;i<height/.1;i++){const ring=mesh('Cicatriz do tronco',new THREE.TorusGeometry(.082+(1-i/(height/.1))*.028,.008,4,12),trunkMat);ring.rotation.x=Math.PI/2;ring.position.set(x-.07*i*.1,i*.1,z);}
    const crown=new THREE.Vector3(x-height*.07,height,z);
    for(let f=0;f<15;f++){
      const angle=f*2.399,spread=radius*(.7+random()*.3);const direction=new THREE.Vector3(Math.cos(angle),0,Math.sin(angle)),side=new THREE.Vector3(-Math.sin(angle),0,Math.cos(angle));
      const point=(t:number)=>crown.clone().addScaledVector(direction,spread*t).add(new THREE.Vector3(0,Math.sin(t*Math.PI)*(.72+(f%3)*.15)-t*t*.20,0));
      tube('Raque curva da palmeira',[point(0),point(.33),point(.67),point(1)],.007,leafMaterials[1]);
      const positions:number[]=[],indices:number[]=[];
      for(let j=2;j<27;j++)for(const sign of [-1,1]){
        const t=j/28,base=point(t),length=(.18+Math.sin(t*Math.PI)*.37)*(1-t*.3),tip=base.clone().addScaledVector(side,sign*length).addScaledVector(direction,.17).add(new THREE.Vector3(0,-.12-t*.15,0)),middle=base.clone().lerp(tip,.48).add(new THREE.Vector3(0,.025,0));const width=.014*(1-t*.55);const n=positions.length/3;
        for(const v of [base,middle.clone().addScaledVector(direction,width),tip,middle.clone().addScaledVector(direction,-width)])positions.push(v.x,v.y,v.z);indices.push(n,n+1,n+2,n,n+2,n+3);
      }
      const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setIndex(indices);geometry.computeVertexNormals();mesh('Folíolos de palmeira',geometry,leafMaterials[f%3]);
    }
  };
  palm(8.1,22.5,2.12,1.55);palm(9.07,22.18,1.72,1.37);
  // Variegated border grasses: curved blades with a pale center stripe.
  const borderMat=material('#9ca88b');borderMat.side=THREE.DoubleSide;
  const grassClump=(x:number,z:number,size=.34)=>{
    const positions:number[]=[],indices:number[]=[];
    for(let i=0;i<18;i++){
      const angle=i*2.399,dir=new THREE.Vector3(Math.cos(angle),0,Math.sin(angle)),perp=new THREE.Vector3(-Math.sin(angle),0,Math.cos(angle));const base=new THREE.Vector3(x,.015,z),mid=base.clone().addScaledVector(dir,size*.35).add(new THREE.Vector3(0,size*.95,0)),tip=base.clone().addScaledVector(dir,size).add(new THREE.Vector3(0,size*.3,0));const n=positions.length/3;
      for(const v of [base.clone().addScaledVector(perp,.006),mid.clone().addScaledVector(perp,.008),tip,mid.clone().addScaledVector(perp,-.008),base.clone().addScaledVector(perp,-.006)])positions.push(v.x,v.y,v.z);indices.push(n,n+1,n+2,n,n+2,n+3,n,n+3,n+4);
    }
    const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setIndex(indices);geometry.computeVertexNormals();mesh('Clorofito / bordadura',geometry,borderMat);
  };
  for(let i=0;i<14;i++)grassClump(6.9+i*.2,20.35,.29);
  for(const [cx,cz] of [[8.1,22.5],[9.07,22.18]])for(let i=0;i<12;i++){const angle=i*Math.PI/6;grassClump(cx+Math.cos(angle)*.48,cz+Math.sin(angle)*.48,.29+random()*.12);}
  const shrub=(x:number,z:number,height:number)=>{
    const leafGeo=new THREE.BufferGeometry();leafGeo.setAttribute('position',new THREE.Float32BufferAttribute([0,0,1,-.4,.05,.3,-.33,0,-.4,0,0,-1,.33,0,-.4,.4,.05,.3,0,.15,0],3));leafGeo.setIndex([6,0,1,6,1,2,6,2,3,6,3,4,6,4,5,6,5,0]);leafGeo.computeVertexNormals();const leaves=new THREE.InstancedMesh(leafGeo,Object.assign(material('#ffffff'),{side:THREE.DoubleSide}),150);const dummy=new THREE.Object3D();
    for(let i=0;i<150;i++){const a=random()*Math.PI*2,r=Math.sqrt(random())*.3;dummy.position.set(x+Math.cos(a)*r,.12+random()*height,z+Math.sin(a)*r);dummy.scale.set(.10+random()*.06,.10,.12+random()*.07);dummy.rotation.set(random(),random()*6,random());dummy.updateMatrix();leaves.setMatrixAt(i,dummy.matrix);leaves.setColorAt(i,new THREE.Color().setHSL(.23+random()*.08,.19+random()*.25,.20+random()*.11));}leaves.castShadow=leaves.receiveShadow=true;root.add(leaves);
  };
  for(let i=0;i<6;i++)shrub(9.52,20.65+i*.42,.5+random()*.35);
  for(let i=0;i<5;i++)shrub(.12,20.75+i*.68,.25+random()*.12);
  // Instanced grass adds silhouette and surface variation without thousands of draw calls.
  const blade=new THREE.BufferGeometry();blade.setAttribute('position',new THREE.Float32BufferAttribute([-.004,0,0,.004,0,0,.002,.035,.008],3));blade.computeVertexNormals();const turfMat=material('#ffffff');turfMat.side=THREE.DoubleSide;const turf=new THREE.InstancedMesh(blade,turfMat,18000);const dummy=new THREE.Object3D();
  for(let i=0;i<18000;i++){dummy.position.set(6.75+random()*3.15,0,20.45+random()*3.9);dummy.rotation.y=random()*Math.PI*2;dummy.scale.setScalar(.6+random()*.7);dummy.updateMatrix();turf.setMatrixAt(i,dummy.matrix);turf.setColorAt(i,new THREE.Color().setHSL(.28+random()*.07,.40+random()*.2,.19+random()*.11));}turf.receiveShadow=true;root.add(turf);
  for(const child of [...root.children])if(!beforeSite.has(child))site.add(child);
  return root;
}
