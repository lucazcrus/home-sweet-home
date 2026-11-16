import * as THREE from 'three';
import { Water } from 'three/examples/jsm/objects/Water.js';
import architecture from './architecture.json';
import { cycleLight } from './day-night';

const {courtyard:C,pool:P,lightwell:L}=architecture;
type Materials=Record<string,THREE.MeshStandardMaterial>;

/** Local geometry and procedural maps: no external models or texture downloads. */
export function addPatioDetails(scene:THREE.Scene,m:Materials,options:{site:boolean;roof:boolean}){
  const root=new THREE.Group();root.name='Pátio interno a céu aberto · referência 13, 26, 38 e 39';scene.add(root);
  const roof=new THREE.Group(),site=new THREE.Group();roof.userData.batchBoundary=site.userData.batchBoundary=true;roof.name='Rufos do pátio';site.name='Canteiros do pátio';root.add(roof,site);
  const mat=(color:string,roughness=.85)=>new THREE.MeshStandardMaterial({color,roughness});
  const black=m.black,chrome=new THREE.MeshStandardMaterial({color:'#b8c4c0',metalness:.86,roughness:.23});
  const mesh=(name:string,geometry:THREE.BufferGeometry,material:THREE.Material)=>{const obj=new THREE.Mesh(geometry,material);obj.name=name;obj.castShadow=obj.receiveShadow=true;root.add(obj);return obj;};
  const box=(name:string,x:number,y:number,z:number,w:number,h:number,d:number,material:THREE.Material)=>{const obj=mesh(name,new THREE.BoxGeometry(w,h,d),material);obj.position.set(x,y,z);return obj;};
  const tube=(name:string,points:THREE.Vector3[],radius:number,material:THREE.Material)=>mesh(name,new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),20,radius,8,false),material);
  let seed=8921;const random=()=>{seed=seed*16807%2147483647;return seed/2147483647;};
  // Continuous coping with real grout joints and rounded contrast to the water.
  const coping=m.poolTile.clone();coping.color.set('#d1d8cd');
  for(const [x,z,w,d] of [[(P.x1+P.x2)/2,P.z1-.055,3.02,.15],[(P.x1+P.x2)/2,P.z2+.055,3.02,.15],[P.x1-.055,(P.z1+P.z2)/2,.15,3],[P.x2+.055,(P.z1+P.z2)/2,.15,3]])box('Borda de pedra verde da piscina',x,.048,z,w,.065,d,coping);
  const grout=mat('#bdc7bc');
  for(let i=0;i<28;i++)for(const z of [P.z1-.055,P.z2+.055])box('Junta da borda',P.x1+i*.1,.083,z,.002,.002,.15,grout);
  for(let i=0;i<30;i++)for(const x of [P.x1-.055,P.x2+.055])box('Junta da borda',x,.083,P.z1+i*.1,.15,.002,.002,grout);
  // Rails and overlapping sliding leaves allow the kitchen and suite to read through.
  const slider=(x:number,z:number,width:number,height:number,faces:number)=>{
    for(const y of [.07,height+.07])box('Trilho da esquadria de correr',x,y,z,width,.035,.09,black);
    for(let i=0;i<=faces;i++)box('Montante de folha deslizante',x-width/2+i*width/faces,height/2+.07,z,.027,height,.07,black);
    for(const side of [-1,1]){
      const hx=x+side*width*.23;
      const handle=mesh('Puxador curvo da esquadria',new THREE.TorusGeometry(.055,.008,7,18,Math.PI*1.6),black);handle.position.set(hx,1.12,z-.07);handle.rotation.y=Math.PI;
      box('Fecho da esquadria',hx,1.05,z-.045,.022,.14,.028,black);
    }
  };
  slider(3.325,C.z2-.045,4.05,2.30,4);slider(4.35,C.z1+.045,1.40,2.15,2);
  // Suite roller shutter and the louvered service door seen in the patio photographs.
  for(let i=0;i<7;i++)box('Lâmina da persiana recolhida',4.35,2.30+i*.028,C.z1+.10,1.48,.021,.055,black);
  for(let i=0;i<14;i++)box('Friso da porta de serviço',.675,.21+i*.138,C.z2-.032,.65,.007,.012,mat('#41494a'));
  box('Maçaneta da porta de serviço',.91,1.08,C.z2-.074,.035,.035,.09,black);
  box('Soleira contínua cozinha',3.325,.053,C.z2-.02,4.20,.035,.18,m.counter);
  if(options.roof){for(const z of [C.z1+.10,C.z2-.10])roof.add(box('Rufo escuro do pátio',2.85,3.26,z,5.44,.018,.36,black));}
  box('Rufo do muro lateral',.15,2.71,6.41,.20,.02,5.72,black);
  // Raised natural-stone shower panel on the boundary wall, oriented into the courtyard.
  box('Ducha - base de pedra',.285,1.23,7.98,.13,2.46,1.15,m.stone);
  const stoneMats=['#5a5144','#8f7551','#706958','#a1845c','#524f49','#78664d'].map(c=>mat(c,.95));
  const stones=stoneMats.map(material=>({material,transforms:[] as THREE.Matrix4[]}));
  for(let row=0;row<31;row++){let z=7.405;while(z<8.55){const w=Math.min(.16+random()*.27,8.555-z),d=.02+random()*.025;stones[Math.floor(random()*stones.length)].transforms.push(new THREE.Matrix4().compose(new THREE.Vector3(.36+d/2,.04+row*.077,z+w/2),new THREE.Quaternion(),new THREE.Vector3(d,.070,w-.005)));z+=w;}}
  for(const {material,transforms} of stones){const instance=new THREE.InstancedMesh(new THREE.BoxGeometry(1,1,1),material,transforms.length);transforms.forEach((t,i)=>instance.setMatrixAt(i,t));instance.castShadow=instance.receiveShadow=true;root.add(instance);}
  tube('Braço cromado da ducha',[new THREE.Vector3(.39,2.22,7.98),new THREE.Vector3(.66,2.22,7.98),new THREE.Vector3(.80,2.18,7.98)],.018,chrome);
  const head=mesh('Espalhador da ducha',new THREE.CylinderGeometry(.115,.12,.025,32),chrome);head.position.set(.80,2.16,7.98);
  const spray=mesh('Face perfurada da ducha',new THREE.CylinderGeometry(.105,.105,.006,24),black);spray.position.set(.80,2.143,7.98);
  const valve=mesh('Registro da ducha',new THREE.CylinderGeometry(.045,.045,.025,20),chrome);valve.rotation.z=Math.PI/2;valve.position.set(.41,1.10,7.98);
  box('Ralo quadrado da ducha',.73,.058,7.98,.12,.008,.12,chrome);
  for(let i=0;i<5;i++)box('Ranhura do ralo',.69+i*.019,.063,7.98,.004,.002,.09,black);
  // Light sources are local and actually illuminate plaster, paving and plants.
  const sconce=(x:number,z:number,orientation:'east'|'west'|'north'|'south')=>{
    const side=orientation==='east'||orientation==='west';box('Arandela externa do pátio',x,1.84,z,side?.045:.09,.13,side?.09:.045,black);
    const dx=orientation==='east'?.10:orientation==='west'?-.10:0,dz=orientation==='north'?-.10:orientation==='south'?.10:0;
    const glow=cycleLight(new THREE.PointLight('#ffe0ab',0,2.6,2),0,.65);glow.position.set(x+dx,1.82,z+dz);root.add(glow);
    for(const sign of [-1,1]){const light=cycleLight(new THREE.SpotLight('#ffdf9e',0,2.8,.48,.7,2),0,2.5);light.position.set(x+dx,1.84+sign*.07,z+dz);light.target.position.set(x+dx*.12,1.84+sign,z+dz*.12);root.add(light,light.target);}
  };
  for(const z of [4.4,5.8,7.15,8.8])sconce(.26,z,'east');sconce(1.15,C.z2-.10,'north');sconce(5.28,C.z1+.10,'south');
  for(const z of [4.65,6.30,8.05])sconce(5.525,z,'west');
  for(const z of [4.65,6.05]){
    const lens=mesh('Refletor subaquático',new THREE.CylinderGeometry(.055,.055,.018,20),m.light);lens.rotation.z=Math.PI/2;lens.position.set(P.x2-.012,-.44,z);
    const light=cycleLight(new THREE.SpotLight('#85dedc',0,4.0,Math.PI*.38,.85,2),0,7);light.position.set(P.x2-.12,-.42,z);light.target.position.set(1.3,-1.15,z-.10);root.add(light,light.target);
  }
  // Water uses a real planar reflection, with animated normal-map ripples.
  const size=256,data=new Uint8Array(size*size*4);
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    const u=x/size*Math.PI*2,v=y/size*Math.PI*2;
    const nx=Math.cos(u*4+Math.sin(v*3))*.19+Math.cos(u*9-v*5)*.10;
    const ny=Math.cos(v*5+Math.sin(u*2))*.19-Math.cos(u*9-v*5)*.08;
    const i=(y*size+x)*4;data[i]=128+nx*110;data[i+1]=128+ny*110;data[i+2]=250;data[i+3]=255;
  }
  const normals=new THREE.DataTexture(data,size,size);normals.wrapS=normals.wrapT=THREE.RepeatWrapping;normals.needsUpdate=true;
  const water=new Water(new THREE.PlaneGeometry(2.80,3.00),{textureWidth:1024,textureHeight:1024,waterNormals:normals,sunDirection:new THREE.Vector3(-.4,.88,-.2),sunColor:'#fff4da',waterColor:'#286f6b',distortionScale:.12,alpha:.48,fog:false});
  water.material.transparent=true;water.material.depthWrite=false;water.material.uniforms.size.value=80;
  let reflectionActive=true,reflectionDirty=true,lastReflection=-Infinity,reflectionInterval=1/8,currentTime=0;
  const reflect=water.onBeforeRender.bind(water);water.onBeforeRender=(renderer,scene,camera,geometry,material,group)=>{if(reflectionActive&&!scene.overrideMaterial&&(reflectionDirty||currentTime-lastReflection>=reflectionInterval)){reflect(renderer,scene,camera,geometry,material,group);lastReflection=currentTime;reflectionDirty=false;}};
  water.name='Água da piscina · reflexos e ondulação';water.rotation.x=-Math.PI/2;water.position.set((P.x1+P.x2)/2,P.water,(P.z1+P.z2)/2);root.add(water);
  // Caustic highlights below the water, visible on the deep basin and shallow bench.
  const causticMaterial=new THREE.ShaderMaterial({transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,uniforms:{time:{value:0},strength:{value:.2}},vertexShader:'varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',fragmentShader:'varying vec2 vUv;uniform float time;uniform float strength;void main(){vec2 p=vUv*18.0;float a=sin(p.x+sin(p.y*1.4+time*.5))+sin(p.y+sin(p.x*1.2-time*.4));float b=pow(1.0-abs(sin(a*2.5+time*.25)),14.0);gl_FragColor=vec4(.58,.91,.84,b*strength);}'});
  for(const [z,depth] of [[(P.z1+P.z2-.52)/2,P.floor+.008],[P.z2-.26,P.benchTop+.008]]){const caustic=mesh('Cáusticas sob a água',new THREE.PlaneGeometry(2.78,depth<P.benchTop?2.46:.50),causticMaterial);caustic.rotation.x=-Math.PI/2;caustic.position.set(1.95,depth,z);caustic.castShadow=false;}
  const beforeSite=new Set(root.children);
  if(options.site){
    const soil=mat('#6a4134');box('Canteiro lateral com seixos vermelhos',.35,.035,5.15,.20,.035,3.80,soil);box('Canteiro ao fundo da piscina',1.78,.035,3.76,3.12,.035,.22,soil);
    const pebble=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(.026,0),mat('#995f47'),550);const dummy=new THREE.Object3D();
    for(let i=0;i<550;i++){const end=i%3===0;dummy.position.set(end?.28+random()*3.03:.25+random()*.20,.06,end?3.69+random()*.16:3.72+random()*3.46);dummy.scale.set(1,.5+random()*.5,.7+random()*.8);dummy.rotation.set(random(),random()*6,random());dummy.updateMatrix();pebble.setMatrixAt(i,dummy.matrix);}pebble.receiveShadow=true;root.add(pebble);
    const leafMats=['#375a35','#547747','#69864e'].map(color=>{const material=mat(color,.72);material.side=THREE.DoubleSide;return material;});
    const swordPlant=(x:number,z:number,scale=1)=>{
      const positions:number[]=[],indices:number[]=[];
      for(let i=0;i<12;i++){const angle=i*2.399,dir=new THREE.Vector3(Math.cos(angle),0,Math.sin(angle)),side=new THREE.Vector3(-Math.sin(angle),0,Math.cos(angle));const height=(.38+random()*.37)*scale,spread=(.13+random()*.22)*scale,origin=new THREE.Vector3(x,.06,z),middle=origin.clone().addScaledVector(dir,spread*.32).add(new THREE.Vector3(0,height*.66,0)),tip=origin.clone().addScaledVector(dir,spread).add(new THREE.Vector3(0,height,0));const n=positions.length/3;
        for(const v of [origin,middle.clone().addScaledVector(side,.025*scale),tip,middle.clone().addScaledVector(side,-.025*scale),middle.clone().add(new THREE.Vector3(0,.005,0))])positions.push(v.x,v.y,v.z);
        indices.push(n,n+1,n+4,n+1,n+2,n+4,n+2,n+3,n+4,n+3,n,n+4);
      }
      const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setIndex(indices);geometry.computeVertexNormals();mesh('Folhas de moréia no canteiro',geometry,leafMats[Math.floor(random()*3)]);
    };
    for(let i=0;i<12;i++)swordPlant(.34,3.9+i*.245,.7+random()*.2);
    for(let i=0;i<10;i++)swordPlant(.45+i*.27,3.76,.75+random()*.25);
    // Broad heliconia leaves, creased around the midrib rather than ellipsoids.
    for(let i=0;i<12;i++){
      const a=i*2.399,h=.75+random()*.55,base=new THREE.Vector3(.40,.06,3.78),tip=new THREE.Vector3(.55+Math.cos(a)*.34,h,3.78+Math.sin(a)*.32),axis=tip.clone().sub(base).normalize(),side=new THREE.Vector3(Math.cos(a),0,Math.sin(a));
      tube('Caule tropical', [base,base.clone().lerp(tip,.45),tip],.009,leafMats[0]);
      const start=base.clone().lerp(tip,.45),center=start.clone().lerp(tip,.52),width=.14;const vertices=[start,center.clone().addScaledVector(side,width),tip,center.clone().addScaledVector(side,-width),center.clone().addScaledVector(axis,.01).add(new THREE.Vector3(0,.035,0))].flatMap(v=>[v.x,v.y,v.z]);const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geo.setIndex([0,1,4,1,2,4,2,3,4,3,0,4]);geo.computeVertexNormals();mesh('Folha tropical com nervura',geo,leafMats[i%3]);
    }
    const uplight=cycleLight(new THREE.SpotLight('#ffe1ad',0,3.2,.55,.8,2),0,3);uplight.position.set(.40,.14,3.92);uplight.target.position.set(.4,1,3.6);root.add(uplight,uplight.target);
  }
  for(const child of [...root.children])if(!beforeSite.has(child))site.add(child);
  const nightWaterColor=new THREE.Color('#124a58'),dayWaterColor=new THREE.Color('#286f6b');
  return {root,roof,site,setReflectionActive(active:boolean){reflectionActive=active;},isVisible(frustum:THREE.Frustum){return frustum.intersectsObject(water);},invalidateReflection(){reflectionDirty=true;},update(time:number,nightAmount:number,sunDirection:THREE.Vector3,moving=false){
    currentTime=time;reflectionInterval=moving?1/12:1/8;
    water.material.uniforms.time.value=time*.35;water.material.uniforms.sunDirection.value.copy(sunDirection);
    water.material.uniforms.sunColor.value.setRGB(1, .95,.82).multiplyScalar(1-nightAmount*.94);
    water.material.uniforms.waterColor.value.copy(dayWaterColor).lerp(nightWaterColor,nightAmount);
    causticMaterial.uniforms.time.value=time;causticMaterial.uniforms.strength.value=THREE.MathUtils.lerp(.28,.12,nightAmount);
  },dispose(){normals.dispose();water.material.uniforms.mirrorSampler.value.dispose();}};
}
