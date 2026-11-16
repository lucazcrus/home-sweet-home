import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { cycleLight } from './day-night';
import { getRoom, type RoomId } from './rooms';
import architecture from './architecture.json';
import { addKitchenDetails } from './kitchen';
import { createCar } from './cars';
import { createOfficeDoor,addOfficeLavabo,addGuestLavabo } from './office-door';

type Materials=Record<string,THREE.MeshStandardMaterial>;
/** Furniture, joinery and landscape reconstructed as geometry from Imagens Geradas. */
export function addReferenceScenes(scene:THREE.Scene,m:Materials){
  const root=new THREE.Group();root.name='Projeto de decoração · imagens de referência';scene.add(root);
  const groups=new Map<RoomId,THREE.Group>();
  for(const id of ['living','kitchen','office','officeBath','guestBath','master','winter','garage','facade','corridor'] as RoomId[]){const group=new THREE.Group();group.name=`Decoração · ${id}`;group.userData.batchBoundary=true;group.userData.room=id;root.add(group);groups.set(id,group);}
  const ceiling=new THREE.Group();ceiling.name='Detalhes dos forros';ceiling.userData.batchBoundary=true;root.add(ceiling);
  addKitchenDetails(groups.get('kitchen')!,ceiling,m);
  addOfficeLavabo(groups.get('officeBath')!,m);
  addGuestLavabo(groups.get('guestBath')!,m);
  const officeDoor=createOfficeDoor(m);root.add(officeDoor.root);
  let parent:THREE.Object3D=root,seed=8631;
  const random=()=>{seed=seed*16807%2147483647;return seed/2147483647;};
  const materialCache=new Map<string,THREE.MeshStandardMaterial>();
  const mat=(color:string,roughness=.8,metalness=0)=>{const key=`${color}:${roughness}:${metalness}`;let value=materialCache.get(key);if(!value){value=new THREE.MeshStandardMaterial({color,roughness,metalness});materialCache.set(key,value);}return value;};
  const mesh=(name:string,geometry:THREE.BufferGeometry,material:THREE.Material,x:number,y:number,z:number,container=parent)=>{const obj=new THREE.Mesh(geometry,material);obj.name=name;obj.position.set(x,y,z);obj.castShadow=obj.receiveShadow=true;container.add(obj);return obj;};
  const box=(name:string,x:number,y:number,z:number,w:number,h:number,d:number,material:THREE.Material=m.oak,r=0)=>mesh(name,r?new RoundedBoxGeometry(w,h,d,2,Math.min(r,w/3,h/3,d/3)):new THREE.BoxGeometry(w,h,d),material,x,y,z);
  const cylinder=(name:string,x:number,y:number,z:number,rt:number,rb:number,h:number,material:THREE.Material)=>mesh(name,new THREE.CylinderGeometry(rt,rb,h,24),material,x,y,z);
  const tube=(name:string,points:THREE.Vector3[],radius:number,material:THREE.Material)=>mesh(name,new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),18,radius,6,false),material,0,0,0);
  const point=(id:RoomId,x:number,y:number,z:number,power=2.5)=>{const light=cycleLight(new THREE.PointLight('#ffdfac',0,2.8,2),.04,power);light.position.set(x,y,z);const room=getRoom(id)!;light.userData.bakeBounds={...room.bounds,y1:0,y2:room.height};parent.add(light);};
  const bookColors=['#e7dfce','#ae9b80','#685f51','#c0a56d','#48616a','#a35d48','#d4c4a5','#818a73'];
  const books=(x:number,y:number,z:number,count:number,axis:'x'|'z'='x')=>{
    let cursor=0;
    for(let i=0;i<count;i++){
      const width=.025+random()*.020,height=.15+random()*.14,depth=.13+random()*.025;
      const object=box('Livro com lombada',x+(axis==='x'?cursor:0),y+height/2,z+(axis==='z'?cursor:0),axis==='x'?width:depth,height,axis==='x'?depth:width,mat(bookColors[i%bookColors.length]),.002);
      if(i===count-1)object.rotation.z=.09;
      box('Filete da lombada',object.position.x+(axis==='z'?depth*.51:0),y+height*.72,object.position.z+(axis==='x'?depth*.51:0),axis==='x'?width*.76:.003,.003,axis==='x'?.003:width*.76,m.linen);
      cursor+=width+.006;
    }
  };
  const vase=(x:number,y:number,z:number,radius=.07,height=.16,material:THREE.Material=m.counter)=>{
    const profile=[new THREE.Vector2(radius*.55,0),new THREE.Vector2(radius,.04),new THREE.Vector2(radius*.96,height*.60),new THREE.Vector2(radius*.45,height*.85),new THREE.Vector2(radius*.40,height)];
    return mesh('Vaso cerâmico',new THREE.LatheGeometry(profile,20),material,x,y,z);
  };
  const leafGeometry=new THREE.BufferGeometry();leafGeometry.setAttribute('position',new THREE.Float32BufferAttribute([0,0,-1,-.5,0,-.2,-.42,.03,.5,0,0,1,.42,.03,.5,.5,0,-.2,0,.20,0],3));leafGeometry.setIndex([6,0,1,6,1,2,6,2,3,6,3,4,6,4,5,6,5,0]);leafGeometry.computeVertexNormals();
  const leafMaterial=mat('#ffffff',.75);leafMaterial.side=THREE.DoubleSide;
  const foliage=(name:string,positions:Array<{x:number;y:number;z:number;size:number;angle?:number}>)=>{
    const instance=new THREE.InstancedMesh(leafGeometry,leafMaterial,positions.length),dummy=new THREE.Object3D();instance.name=name;
    positions.forEach((p,i)=>{dummy.position.set(p.x,p.y,p.z);dummy.rotation.set(Math.PI/2-.4+random()*.8,p.angle??random()*Math.PI*2,-.4+random()*.8);dummy.scale.set(p.size*.60,p.size,p.size);dummy.updateMatrix();instance.setMatrixAt(i,dummy.matrix);instance.setColorAt(i,new THREE.Color().setHSL(.24+random()*.08,.30+random()*.20,.26+random()*.14));});
    instance.castShadow=instance.receiveShadow=true;parent.add(instance);return instance;
  };
  const trailingPlant=(x:number,y:number,z:number,length=.55,branches=5)=>{
    vase(x,y,z,.09,.13,mat('#b9b3a1'));
    const leaves:Array<{x:number;y:number;z:number;size:number}>=[];
    for(let branch=0;branch<branches;branch++){
      const a=branch*2.399,spread=.08+random()*.12,drop=length*(.5+random()*.5);
      const points:THREE.Vector3[]=[];
      for(let i=0;i<8;i++){const t=i/7,px=x+Math.cos(a)*spread+t*.025,py=y+.11+Math.sin(t*Math.PI)*.10-t*drop,pz=z+Math.sin(a)*spread+t*.10;points.push(new THREE.Vector3(px,py,pz));leaves.push({x:px,y:py,z:pz,size:.045+random()*.025});}
      tube('Ramo pendente',points,.0025,mat('#526d3e'));
    }
    foliage('Folhas de jiboia',leaves);
  };
  const frame=(x:number,y:number,z:number,width:number,height:number,side=false)=>{
    const border=box('Moldura de quadro',x,y,z,side?.025:width,height,side?width:.025,m.oak,.008);
    const canvas=document.createElement('canvas');canvas.width=128;canvas.height=192;const ctx=canvas.getContext('2d')!;ctx.fillStyle='#e8dfca';ctx.fillRect(0,0,128,192);ctx.fillStyle='#96856d';ctx.beginPath();ctx.ellipse(80,108,51,64,.2,0,Math.PI*2);ctx.fill();ctx.fillStyle='#435962';ctx.fillRect(18,88,48,82);ctx.fillStyle='#c2ad86';ctx.beginPath();ctx.arc(52,61,29,0,Math.PI*2);ctx.fill();const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
    const painting=new THREE.MeshStandardMaterial({map:texture,roughness:.95});const face=mesh('Gravura abstrata',new THREE.PlaneGeometry(width-.035,height-.035),painting,x,y,z+(side?0:.016));if(side){face.position.x=x-.016;face.rotation.y=-Math.PI/2;}
    return border;
  };

  // Office: sage cabinet, reeded tall doors, books, oak shelves and desk accessories.
  parent=groups.get('office')!;
  // Desk on the garden side (right on entering); bookcases on the opposite/back walls.
  parent.rotation.y=-Math.PI/2;parent.position.set(11.35,0,-5.45);
  const greenBookcase=new THREE.Group();greenBookcase.name='Estante verde ampliada';parent.add(greenBookcase);parent=greenBookcase;
  box('Estante verde - fundo',7.045,1.39,2.59,.035,2.60,1.90,m.sage);
  for(const z of [1.64,3.54])box('Estante verde - lateral',7.24,1.39,z,.42,2.60,.035,m.sage);
  box('Estante verde - armário inferior',7.24,.48,2.59,.42,.80,1.90,m.sage,.008);
  for(const z of [2.115,3.065]){box('Porta verde emoldurada',7.458,.49,z,.025,.70,.91,m.sage,.009);cylinder('Puxador dourado',7.48,.59,z,.015,.015,.02,m.brass).rotation.z=Math.PI/2;}
  for(const y of [.91,1.38,1.85,2.32,2.68])box('Prateleira verde',7.24,y,2.59,.43,.035,1.93,m.sage);
  for(const y of [.9275,1.3975,1.8675,2.3375])books(7.25,y,1.78,18,'z');
  parent=groups.get('office')!;
  const officeWood=new THREE.Group();officeWood.name='Estantes na parede do fundo do escritório';parent.add(officeWood);officeWood.position.z=-.17;parent=officeWood;
  box('Fundo em carvalho das estantes',8.55,1.86,1.78,2.12,1.47,.035,m.oak);
  for(const y of [1.15,1.62,2.09,2.56]){
    box('Prateleira flutuante em carvalho',8.55,y,1.90,2.18,.045,.25,m.oak,.008);
    box('LED sob prateleira escritório',8.55,y-.027,1.982,2.05,.009,.008,m.light);
    books(7.68,y+.025,1.91,9);books(8.80,y+.025,1.91,4);
  }
  vase(9.25,2.12,1.92,.075,.17);vase(9.03,2.59,1.90,.09,.19);
  trailingPlant(7.76,2.59,1.92,.63);trailingPlant(9.22,1.18,1.92,.5);
  point('office',8.55,1.75,2.05,2.8);point('office',7.50,1.6,2.3,1.6);

  parent=groups.get('office')!;

  // Master: wood headboard, upholstered bed (loose object), slats, vanity and lit oval mirror.
  parent=groups.get('master')!;
  box('Cabeceira corrida em carvalho',5.12,.65,.30,3.14,1.15,.09,m.oak,.012);
  box('Luz linear da cabeceira',5.12,1.235,.33,3.10,.015,.018,m.light);
  box('Penteadeira flutuante',6.49,.79,2.15,.40,.10,1.75,m.oak,.018);
  for(let i=0;i<39;i++)box('Ripa clara atrás da penteadeira',6.70,1.45,.52+i*.073,.025,2.70,.028,m.cabinetLight);
    for(const y of [1.65,2.12]){box('Prateleira da penteadeira',6.54,y,2.98,.32,.035,.62,m.cabinetLight,.008);box('LED da penteadeira',6.43,y-.024,2.98,.015,.008,.55,m.light);}
  trailingPlant(6.53,2.14,2.95,.40);vase(6.49,.85,2.48,.05,.15);
  const ovalPoints:THREE.Vector3[]=[];for(let i=0;i<=72;i++){const t=i/72*Math.PI*2;ovalPoints.push(new THREE.Vector3(6.674,1.60+Math.cos(t)*.80,2.01+Math.sin(t)*.27));}
  tube('Contorno luminoso do espelho oval',ovalPoints,.012,m.light);
  const mirror=mesh('Espelho oval da penteadeira',new THREE.CircleGeometry(1,48),new THREE.MeshStandardMaterial({color:'#b7c4ba',metalness:.98,roughness:.07}),6.685,1.60,2.01);mirror.rotation.y=-Math.PI/2;mirror.scale.set(.27,.80,1);
  box('Porta de correr branca do closet',3.55,1.19,3.04,.045,2.20,.78,m.white,.008);
  box('Trilho preto da porta de correr',3.60,2.40,2.55,.045,.045,1.85,m.black);
  box('Puxador preto do closet',3.60,1.15,2.83,.045,.45,.025,m.black);
  point('master',4.0,.85,.73,2.2);point('master',6.19,.85,.73,2.2);point('master',6.52,1.75,2.1,1.6);

  // Living/dining: staggered bookshelves, oak buffet, console, art and rattan pendant.
  parent=groups.get('living')!;
  box('Aparador atrás do sofá',9.56,.70,17.20,.16,.10,2.70,m.oak,.018);
  for(const z of [16.05,18.35])box('Apoio do aparador',9.56,.37,z,.06,.61,.06,m.oak);
  frame(9.64,2.05,16.82,.65,.92,true);frame(9.64,2.05,18.0,.65,.92,true);
  trailingPlant(9.56,.75,18.31,.5);vase(9.56,.75,16.1,.07,.22);
  const library=new THREE.Group();library.name='Estante e buffet na parede de fundo';parent.add(library);library.rotation.y=Math.PI/2;library.position.set(-5.57,0,22.58);parent=library;
  box('Buffet do jantar em carvalho',9.54,.49,13.96,.40,.82,2.36,m.oak,.015);
  for(const z of [13.15,13.96,14.77])box('Fresta entre portas do buffet',9.325,.49,z,.006,.72,.01,m.wood);
  for(const [y,z,length] of [[1.45,13.25,.96],[1.87,14.05,2.32],[2.29,13.90,2.24],[2.70,14.13,2.15]]){
    box('Estante suspensa do jantar',9.60,y,z,.27,.042,length,m.oak,.008);
    books(9.56,y+.025,z-length*.42,Math.floor(length*5),'z');
  }
  trailingPlant(9.58,2.723,14.88,.63);trailingPlant(9.58,1.893,13.65,.45);vase(9.58,.90,13.1,.08,.21);
  parent=groups.get('living')!;
  box('Fundo iluminado atrás da TV',6.59,1.55,17.40,.025,1.10,1.75,m.light,.012);
  box('Face do televisor',6.63,1.55,17.40,.035,.99,1.65,m.black,.015);
  box('Soundbar',6.91,.592,17.40,.14,.075,.90,m.black,.018);
  const profile=[new THREE.Vector2(.42,0),new THREE.Vector2(.43,.10),new THREE.Vector2(.40,.23),new THREE.Vector2(.30,.37),new THREE.Vector2(.12,.45)];
  mesh('Pendente de fibra natural',new THREE.LatheGeometry(profile,48),m.cane,8.05,2.25,14.60);
  for(let i=0;i<48;i++){
    const angle=i/48*Math.PI*2,points=profile.map(p=>new THREE.Vector3(8.05+Math.cos(angle)*p.x,2.25+p.y,14.60+Math.sin(angle)*p.x));tube('Trama vertical do pendente',points,.0035,m.oak);
  }
  for(const y of [2.29,2.37,2.45,2.53,2.61]){const r=y<2.45?.425:.34;const ring=mesh('Trama circular do pendente',new THREE.TorusGeometry(r,.003,4,40),m.oak,8.05,y,14.60);ring.rotation.x=Math.PI/2;}
  cylinder('Cabo do pendente',8.05,3.60,14.60,.005,.005,1.80,m.black);cylinder('Canopla',8.05,4.50,14.60,.06,.06,.025,m.black);
  point('living',6.89,1.55,17.4,2.0);point('living',8.05,2.40,14.60,4.0);

  // Winter garden: full-height sliding glass, raised bed, stone wall, tree and planting.
  parent=groups.get('winter')!;const g=architecture.lightwell,cx=(g.x1+g.x2)/2,cz=(g.z1+g.z2)/2;
  box('Canteiro elevado do jardim de inverno',cx,.13,cz,g.x2-g.x1-.20,.18,g.z2-g.z1-.20,mat('#846342'));
  box('Seixos vermelhos do jardim de inverno',cx,.23,cz,g.x2-g.x1-.24,.025,g.z2-g.z1-.24,mat('#915941'));
  for(const x of [g.x1+.11,g.x2-.11])box('Borda de madeira do canteiro',x,.245,cz,.035,.11,g.z2-g.z1-.20,m.oak);
  for(const z of [g.z1+.11,g.z2-.11])box('Borda de madeira do canteiro',cx,.245,z,g.x2-g.x1-.20,.11,.035,m.oak);
  const pebbles=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(.024,0),mat('#a16a50'),440),dummy=new THREE.Object3D();
  for(let i=0;i<440;i++){dummy.position.set(g.x1+.18+random()*(g.x2-g.x1-.36),.26,g.z1+.18+random()*(g.z2-g.z1-.36));dummy.scale.set(.7+random(),.45+random()*.35,.7+random());dummy.rotation.set(random(),random()*6,random());dummy.updateMatrix();pebbles.setMatrixAt(i,dummy.matrix);}pebbles.receiveShadow=true;parent.add(pebbles);
  const stoneColors=['#6c5840','#8f7354','#9b805c','#4e5148','#735e48'];
  for(let row=0;row<28;row++){let z=g.z1+.08;while(z<g.z2-.08){const length=Math.min(.16+random()*.27,g.z2-.08-z);box('Lâmina pétrea do jardim de inverno',g.x2-.1075,.07+row*.094,z+length/2,.035,.085,length-.006,mat(stoneColors[row%stoneColors.length]));z+=length;}}
  const treeX=cx+.04,treeZ=cz;
  tube('Tronco ramificado do jardim',[new THREE.Vector3(treeX,.26,treeZ),new THREE.Vector3(treeX-.04,.82,treeZ),new THREE.Vector3(treeX+.03,1.45,treeZ-.03)],.024,mat('#6e6048'));
  for(let i=0;i<6;i++){const a=i*2.399;tube('Galho do jardim',[new THREE.Vector3(treeX, .82+i*.06,treeZ),new THREE.Vector3(treeX+Math.cos(a)*.21,1.25+i*.07,treeZ+Math.sin(a)*.24),new THREE.Vector3(treeX+Math.cos(a)*.38,1.45+i*.06,treeZ+Math.sin(a)*.40)],.008,mat('#6e6048'));}
  const treeLeaves:Array<{x:number;y:number;z:number;size:number}>=[];
  for(let i=0;i<650;i++){const a=random()*Math.PI*2,r=Math.sqrt(random())*.46;treeLeaves.push({x:treeX+Math.cos(a)*r,y:1.16+random()*.72,z:treeZ+Math.sin(a)*r*1.15,size:.055+random()*.035});}foliage('Copa da árvore do jardim de inverno',treeLeaves);
  const grassMat=mat('#84966b');grassMat.side=THREE.DoubleSide;
  for(let clump=0;clump<14;clump++){
    const a=clump/14*Math.PI*2,x=cx+Math.cos(a)*(g.x2-g.x1)*.35,z=cz+Math.sin(a)*(g.z2-g.z1)*.35;
    for(let blade=0;blade<11;blade++){
      const t=blade*2.399,dir=new THREE.Vector3(Math.cos(t),0,Math.sin(t));const base=new THREE.Vector3(x,.25,z),mid=base.clone().addScaledVector(dir,.09).add(new THREE.Vector3(0,.32,0)),tip=base.clone().addScaledVector(dir,.23).add(new THREE.Vector3(0,.20,0));
      const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute([base.x-.004,base.y,base.z,mid.x-.006,mid.y,mid.z,tip.x,tip.y,tip.z,mid.x+.006,mid.y,mid.z,base.x+.004,base.y,base.z],3));geometry.setIndex([0,1,2,0,2,3,0,3,4]);geometry.computeVertexNormals();mesh('Bordadura do jardim de inverno',geometry,grassMat,0,0,0);
    }
  }
  const tropical:Array<{x:number;y:number;z:number;size:number;angle:number}>=[];
  for(const [x,z] of [[g.x2-.70,g.z1+.70],[g.x2-.70,g.z2-.70],[g.x1+.70,g.z2-.70]]){
    for(let i=0;i<19;i++){const a=i*2.399,r=.10+random()*.16;const tipY=.55+random()*.55;tube('Haste de folhagem tropical do jardim',[new THREE.Vector3(x,.26,z),new THREE.Vector3(x+Math.cos(a)*r,.45,z+Math.sin(a)*r),new THREE.Vector3(x+Math.cos(a)*r,tipY,z+Math.sin(a)*r)],.0035,mat('#567247'));tropical.push({x:x+Math.cos(a)*r,y:tipY,z:z+Math.sin(a)*r,size:.19+random()*.12,angle:a});}
  }
  foliage('Folhagens tropicais do jardim ampliado',tropical);
  for(let i=0;i<5;i++){const stone=mesh('Passo de pedra do jardim de inverno',new THREE.CylinderGeometry(.20,.21,.035,10),mat('#c3bca8'),g.x1+.44,.278,g.z1+.38+i*.57);stone.scale.z=.80;}
  for(const y of [.07,2.40])box('Trilho da porta de vidro do jardim',g.x1,y,cz,.10,.035,g.z2-g.z1,m.black);
  for(const z of [g.z1+.07,g.z2-.07])box('Batente lateral da porta do jardim',g.x1,1.23,z,.08,2.35,.035,m.black);
  box('Montante central da porta de correr',g.x1-.025,1.23,cz,.045,2.33,.025,m.black);
  const handle=mesh('Puxador da porta do jardim',new THREE.TorusGeometry(.045,.007,6,20,Math.PI*1.6),m.black,g.x1-.072,1.10,cz+.16);handle.rotation.y=Math.PI/2;
  point('winter',g.x1+.25,.38,g.z1+.20,1.8);point('winter',g.x2-.20,1.8,cz,1.3);

  parent=groups.get('corridor')!;
  box('Rodapé iluminado da circulação',5.735,.13,6.20,.012,.025,5.10,m.light);
  point('corridor',5.86,.24,5.1,1.6);point('corridor',5.86,.24,7.8,1.6);
  box('Sanca do corredor',5.96,2.75,6.30,.40,.06,5.35,m.white);
  box('LED na sanca do corredor',6.15,2.71,6.30,.012,.012,5.28,m.light);

  // Facade concept: two locally modelled SUVs, pale stone and vegetation over the canopy.
  parent=groups.get('garage')!;
  for(const [kind,x] of [['tiggo',1.75],['volvo',4.38]] as const){const car=createCar(kind);car.position.set(x,.055,17.58);parent.add(car);}
  parent=groups.get('facade')!;
  const hangingLeaves:Array<{x:number;y:number;z:number;size:number}>=[];
  for(let branch=0;branch<61;branch++){
    const x=.18+branch*.107,drop=.25+random()*.68;
    const points:THREE.Vector3[]=[];for(let i=0;i<12;i++){const t=i/11,px=x+Math.sin(t*5+branch)*.035,py=3.31-t*drop,pz=20.205+Math.sin(t*Math.PI)*.10;points.push(new THREE.Vector3(px,py,pz));for(const side of [-1,1])hangingLeaves.push({x:px+side*.025,y:py+.02,z:pz,size:.060+random()*.025});}
    tube('Jiboia na marquise',points,.0025,mat('#5b713d'));
  }
  foliage('Vegetação pendente da fachada',hangingLeaves);
  for(const x of [7.0,9.25])point('facade',x,.23,20.40,3.0);
  for(const [x,z] of [[8.1,22.5],[9.07,22.18]]){point('facade',x-.18,.20,z+.16,4.0);cylinder('Uplight do jardim frontal',x-.18,.08,z+.16,.045,.045,.09,m.black);}

  for(const [x,z] of [[7.0,20.45],[9.25,20.9],[9.55,22.7],[.25,20.7]]){
    const leaves:Array<{x:number;y:number;z:number;size:number}>=[];for(let i=0;i<38;i++){const a=i*2.399;leaves.push({x:x+Math.cos(a)*.22,y:.18+random()*.55,z:z+Math.sin(a)*.24,size:.11+random()*.07});}foliage('Folhagem tropical da fachada',leaves);
  }
  const rock=mesh('Pedra de jardim',new THREE.DodecahedronGeometry(.33,1),mat('#bbae91'),8.8,.18,21.0);rock.scale.set(1.25,.65,.83);
  // Interior ceiling fittings are independently toggled along with the actual plaster ceilings.
  parent=ceiling;
  for(const [id,coordinates] of [['living',[[7.1,16],[9.05,16],[7.1,18.3],[9.05,18.3]]],['office',[[7.8,2.2],[9.1,3.6]]],['master',[[4.2,1.2],[6.1,2.8]]]] as [RoomId,number[][]][]){
    const height=getRoom(id)!.height;
    for(const [x,z] of coordinates){box('Spot quadrado embutido',x,height-.035,z,.09,.025,.09,m.light,.01);}
  }
  return {root,groups,ceiling,officeDoor};
}
