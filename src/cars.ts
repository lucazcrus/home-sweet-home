import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { TessellateModifier } from 'three/examples/jsm/modifiers/TessellateModifier.js';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

type CarKind='tiggo'|'volvo';
export const CAR_DIMENSIONS={tiggo:{length:4.338,width:1.830,height:1.645,wheelbase:2.630},volvo:{length:4.233,width:1.838,height:1.550,wheelbase:2.650}};
/** Purpose-modelled, metre-scale exterior meshes. No downloaded/third-party car models. */
export function createCar(kind:CarKind){
  const v=kind==='volvo',d=CAR_DIMENSIONS[kind],half=d.length/2,root=new THREE.Group();
  root.name=v?'Volvo EX30 azul':'CAOA Chery Tiggo 5x Turbo 2022 preto';root.userData.dimensions=d;
  const paint=new THREE.MeshPhysicalMaterial({color:v?'#5898bf':'#090e13',metalness:v?.28:.32,roughness:.27,clearcoat:1,clearcoatRoughness:.14,envMapIntensity:1.05});
  const black=new THREE.MeshStandardMaterial({color:'#14191c',roughness:.61}),rubber=new THREE.MeshStandardMaterial({color:'#242727',roughness:.95});
  const chrome=new THREE.MeshStandardMaterial({color:'#bfc5c8',roughness:.22,metalness:.95}),alloy=new THREE.MeshStandardMaterial({color:'#aab2b7',roughness:.28,metalness:.85});
  const glazing=new THREE.MeshPhysicalMaterial({color:'#536a78',roughness:.10,metalness:.10,clearcoat:1,envMapIntensity:1.1,transparent:true,opacity:.72,depthWrite:false});
  const lamp=new THREE.MeshStandardMaterial({color:'#e7edf0',emissive:'#dcecff',emissiveIntensity:.65,roughness:.18,metalness:.25});
  const tail=new THREE.MeshStandardMaterial({color:'#912720',emissive:'#b3291c',emissiveIntensity:.24,roughness:.22});
  const darkLamp=new THREE.MeshStandardMaterial({color:'#152330',roughness:.14,metalness:.65});
  const mesh=(name:string,geometry:THREE.BufferGeometry,material:THREE.Material,x=0,y=0,z=0)=>{const obj=new THREE.Mesh(geometry,material);obj.name=name;obj.position.set(x,y,z);obj.castShadow=obj.receiveShadow=true;root.add(obj);return obj;};
  const box=(name:string,x:number,y:number,z:number,w:number,h:number,l:number,m:THREE.Material,r=.01)=>mesh(name,new RoundedBoxGeometry(w,h,l,Math.max(w,h,l)>.30?2:1,Math.min(r,w/3,h/3,l/3)),m,x,y,z);
  const tube=(name:string,points:THREE.Vector3[],radius:number,m:THREE.Material,closed=false)=>mesh(name,new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points,closed),Math.max(12,points.length*3),radius,5,closed),m);
  const V=(x:number,y:number,z:number)=>new THREE.Vector3(x,y,z);
  const tessellator=new TessellateModifier(.10,6);
  const surface=(name:string,nu:number,nv:number,point:(u:number,t:number)=>THREE.Vector3,m:THREE.Material)=>{
    const positions:number[]=[],uv:number[]=[],indices:number[]=[];
    for(let j=0;j<=nv;j++)for(let i=0;i<=nu;i++){const p=point(i/nu,j/nv);positions.push(p.x,p.y,p.z);uv.push(i/nu,j/nv);}
    for(let j=0;j<nv;j++)for(let i=0;i<nu;i++){const a=j*(nu+1)+i,b=a+1,c=a+nu+1;indices.push(a,c,b,b,c,c+1);}
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();return mesh(name,g,m);
  };
  // Smoothly lofted body with genuinely open wheel arches.
  const profile=[[-half,1.00,.86],[-half+.22,1.035,.89],[-1.30,1.00,d.width/2],[-.55,1.015,.899],[.35,1.015,.900],[.85,1.025,.901],[1.30,.975,d.width/2],[half-.25,1.005,.886],[half,.96,.87]];
  const sample=(z:number,column:number)=>{
    for(let i=1;i<profile.length;i++)if(z<=profile[i][0]){
      const a=profile[i-1],b=profile[i],t=(z-a[0])/(b[0]-a[0]),p0=profile[Math.max(0,i-2)][column],p1=a[column],p2=b[column],p3=profile[Math.min(profile.length-1,i+1)][column];
      return .5*((2*p1)+(-p0+p2)*t+(2*p0-5*p1+4*p2-p3)*t*t+(-p0+3*p1-3*p2+p3)*t*t*t);
    }return profile.at(-1)![column];
  };
  const axles=[-d.wheelbase/2,d.wheelbase/2],wheelY=.350,wheelR=.350,archR=.383;
  const lower=(z:number)=>{let y=.255;for(const axle of axles){const dz=z-axle;if(Math.abs(dz)<archR)y=Math.max(y,wheelY+Math.sqrt(archR*archR-dz*dz));}return y;};
  const sideX=(side:number,y:number,z:number)=>side*(sample(z,2)*(1-.045*Math.pow((y-.68)/.55,2))+.002);
  for(const side of [-1,1]){
    const panel=surface('Carroceria com recortes dos paralamas',112,12,(u,t)=>{const z=-half+u*d.length,top=sample(z,1),y=THREE.MathUtils.lerp(lower(z),top,t);return V(sideX(side,y,z),y,z);},paint);if(side<0){const index=panel.geometry.getIndex()!;for(let i=0;i<index.count;i+=3){const a=index.getX(i);index.setX(i,index.getX(i+2));index.setX(i+2,a);}panel.geometry.computeVertexNormals();}
    // Arch mouldings are open curved strips, rather than a tire intersecting a box.
    for(const axle of axles){
      const edge:number[]=[],idx:number[]=[];
      for(let i=0;i<=40;i++){const a=-.25+i*(Math.PI+.5)/40;for(const r of [archR,archR+.035]){const y=wheelY+Math.sin(a)*r,z=axle+Math.cos(a)*r;edge.push(side*(sample(z,2)+.008),y,z);}}
      for(let i=0;i<40;i++){const n=i*2;idx.push(n,n+1,n+2,n+1,n+3,n+2);}
      const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(edge,3));g.setIndex(idx);g.computeVertexNormals();const archMat=black.clone();archMat.side=THREE.DoubleSide;mesh('Moldura curva do paralama',g,archMat);
    }
    box('Soleira inferior',side*.868,.285,-.02,.055,.105,1.83,black,.025);
    if(!v)tube('Friso cromado inferior das portas',[V(side*.892,.37,-1.01),V(side*.907,.385,-.20),V(side*.898,.40,.95)],.012,chrome);
    for(const z of [-.42,-1.39])tube('Junta da porta',[V(sideX(side,.98,z)*1.003,.98,z),V(sideX(side,.75,z)*1.006,.75,z+.015),V(sideX(side,.43,z)*1.006,.43,z+.04),V(sideX(side,.34,z)*1.005,.34,z+.12)],.0023,black);
    for(const z of [.10,-.99]){
      box('Rebaixo da maçaneta',side*.900,.989,z,.013,.041,.155,black,.015);
      box(v?'Maçaneta embutida EX30':'Maçaneta cromada Tiggo',side*.911,1.002,z,.020,.025,.143,v?paint:chrome,.010);
    }
    // Mirror stalk, sculpted housing and indicator.
    box('Base do retrovisor',side*.849,1.115,.62,.11,.055,.12,black,.022);
    box('Capa do retrovisor',side*.958,1.17,.63,.116,.105,.235,v?black:paint,.042);
    box('Espelho do retrovisor',side*.955,1.168,.506,.100,.069,.005,chrome,.018);
    box('Pisca do retrovisor',side*.963,1.143,.752,.102,.010,.006,lamp,.003);
  }
  surface('Capô e ombros moldados',32,72,(u,t)=>{const z=-half+t*d.length,x=(u*2-1)*sample(z,2)*.955;return V(x,sample(z,1)+.045*(1-Math.pow(u*2-1,2)),z);},paint);
  for(const side of [-1,1]){
    const strip=surface('Transição arredondada do ombro da carroceria',112,4,(u,t)=>{const z=-half+u*d.length,y=sample(z,1),x=THREE.MathUtils.lerp(side*sample(z,2)*.955,sideX(side,y,z),t);return V(x,y+.008*Math.sin(t*Math.PI),z);},paint);
    if(side>0){const index=strip.geometry.getIndex()!;for(let i=0;i<index.count;i+=3){const a=index.getX(i);index.setX(i,index.getX(i+2));index.setX(i+2,a);}strip.geometry.computeVertexNormals();}
  }
  // Both end surfaces follow the curved corners of the body.
  for(const sign of [-1,1]){const m=paint.clone();m.side=THREE.DoubleSide;surface(sign>0?'Para-choque dianteiro esculpido':'Tampa e para-choque traseiros',30,14,(u,t)=>{const a=u*2-1,x=a*.87,y=.26+t*.73,z=sign*(half-.10*Math.pow(Math.abs(a),3)+.015*Math.sin(t*Math.PI));return V(x,y,z);},m);}
  box('Fundo e difusor',0,.24,0,1.53,.12,d.length-.16,black,.055);
  // Cabin silhouette: tapered pillars, sloping windshield and continuous roof curvature.
  const H=v?1.535:1.602;
  const stations=[[-1.94,1.04,.78],[-1.49,H-.08,.70],[-1.17,H,.695],[-.45,H+.007,.704],[.20,H-.016,.692],[.85,1.055,.79]];
  const cabinSample=(z:number,c:number)=>{for(let i=1;i<stations.length;i++)if(z<=stations[i][0]){const a=stations[i-1],b=stations[i];return THREE.MathUtils.lerp(a[c],b[c],(z-a[0])/(b[0]-a[0]));}return stations.at(-1)![c];};
  const cabinPaint=paint.clone();cabinPaint.side=THREE.DoubleSide;
  surface('Cabine afilada e teto',28,32,(u,t)=>{const z=-1.49+t*1.695,a=u*2-1,top=cabinSample(z,1),w=cabinSample(z,2),y=top-.06*Math.pow(Math.abs(a),3);return V(a*w,y,z);},cabinPaint);
  const windows=[{name:'Vidro lateral dianteiro',points:[[.70,1.06],[.17,H-.09],[-.34,H-.075],[-.36,1.06]]},{name:'Vidro lateral traseiro',points:[[-.44,1.06],[-.42,H-.075],[-1.17,H-.09],[-1.70,1.13],[-1.43,1.045]]}];
  const wrapSide=(shape:THREE.Shape,side:number,offset:number)=>{
    const source=new THREE.ShapeGeometry(shape),g=tessellator.modify(source);source.dispose();const p=g.getAttribute('position');
    for(let i=0;i<p.count;i++){const z=p.getX(i),y=p.getY(i),top=cabinSample(z,1)-.045,t=THREE.MathUtils.clamp((y-1)/Math.max(.04,top-1),0,1);p.setXYZ(i,side*(THREE.MathUtils.lerp(.862,cabinSample(z,2),t)+offset),y,z);}
    g.deleteAttribute('normal');const smooth=mergeVertices(g);g.dispose();smooth.computeVertexNormals();return smooth;
  };
  // Real window apertures in the painted shell, so the glass reveals the cabin
  // rather than covering another opaque body surface.
  for(const side of [-1,1]){
    const outline=[[-1.85,1.0],[.82,1.0],[.82,1.08],[.20,H-.045],[-.45,H-.038],[-1.17,H-.045],[-1.49,H-.125],[-1.85,1.08]].map(([z,y])=>new THREE.Vector2(z,y));
    const shell=new THREE.Shape(outline);for(const window of windows)shell.holes.push(new THREE.Path(window.points.map(([z,y])=>new THREE.Vector2(z,y))));
    mesh('Colunas com vãos reais para os vidros',wrapSide(shell,side,0),cabinPaint);
    tube('Coluna dianteira moldada',[V(side*.775,1.10,.84),V(side*.735,H-.23,.49),V(side*.686,H-.07,.205)],.024,paint);
    tube('Coluna traseira moldada',[V(side*.775,1.10,-1.94),V(side*.737,H-.23,-1.70),V(side*.688,H-.07,-1.46)],.028,v?black:paint);
  }
  const pane=(name:string,points:number[][],side:number)=>{
    const contour=points.map(([z,y])=>new THREE.Vector2(z,y));
    const at=(z:number,y:number)=>{const top=cabinSample(z,1)-.045,t=THREE.MathUtils.clamp((y-1)/Math.max(.04,top-1),0,1);return V(side*(THREE.MathUtils.lerp(.862,cabinSample(z,2),t)+.012),y,z);};
    // Subdivide before wrapping the pane around the cabin: a single polygon
    // chord would sink through the curved body between its corner vertices.
    const smooth=wrapSide(new THREE.Shape(contour),side,.012),material=glazing.clone();material.side=THREE.DoubleSide;mesh(name,smooth,material);
    tube('Guarnição do vidro lateral',points.map(([z,y])=>at(z,y)),.008,v?black:chrome,true);
  };
  for(const side of [-1,1]){
    for(const window of windows)pane(window.name,window.points,side);
    box('Pilar B preto',side*.796,1.28,-.40,.055,H-1.0,.065,black,.008);
    if(v)box('Portinhola de carga',side*.893,.94,-1.71,.012,.175,.21,paint,.025);
  }
  const screen=(name:string,rear=false)=>{
    const z0=rear?-1.94:.861,z1=rear?-1.46:.205,y0=1.10,y1=H-.025;
    const mat=glazing.clone();mat.side=THREE.DoubleSide;
    const at=(u:number,t:number)=>{const a=u*2-1,x=a*THREE.MathUtils.lerp(.758,.674,t),y=THREE.MathUtils.lerp(y0,y1-.04*Math.pow(Math.abs(a),3),t)+.010*(1-a*a),z=THREE.MathUtils.lerp(z0,z1,t)+(rear?-.013:.013)*(1-a*a);return V(x,y,z);};
    surface(name,22,10,at,mat);
    for(const t of [0,1])tube('Guarnição do '+name,Array.from({length:9},(_,i)=>at(i/8,t)),.010,black);
  };
  screen('Para-brisa curvo');screen('Vigia traseiro',true);
  const roofGlass=glazing.clone();roofGlass.side=THREE.DoubleSide;roofGlass.transparent=false;roofGlass.opacity=1;roofGlass.depthWrite=true;roofGlass.color.set('#17232c');
  surface('Teto panorâmico',16,22,(u,t)=>{const z=-1.29+t*1.42;return V((u*2-1)*.594,cabinSample(z,1)+.009,z);},roofGlass);
  box('Aerofólio traseiro',0,H-.03,-1.53,1.40,.045,.21,v?black:paint,.025);
  if(!v)for(const side of [-1,1])tube('Longarina de teto prateada',[V(side*.653,H+.045,-1.39),V(side*.674,H+.070,-.80),V(side*.672,H+.070,-.08),V(side*.652,H+.045,.23)],.018,chrome);
  for(const z of [.69,.75])tube('Limpador de para-brisa',[V(-.62,1.095,z),V(-.27,1.103,z+.03),V(.13,1.103,z+.015)],.005,black);
  const interior=new THREE.MeshStandardMaterial({color:v?'#343a3c':'#262a2b',roughness:.9});
  for(const x of [-.39,.39])for(const z of [-.12,-1.02]){
    box('Banco e encosto interno',x,1.14,z-.17,.43,.43,.105,interior,.045);
    box('Apoio de cabeça',x,1.41,z-.17,.25,.16,.10,interior,.035);
  }
  box('Painel e console do interior',0,1.035,.52,1.31,.10,.23,interior,.035);
  const steering=mesh('Volante com aro e cubo',new THREE.TorusGeometry(.116,.013,7,28),black,-.38,1.11,.31);steering.rotation.x=-.43;
  box('Centro do volante',-.38,1.11,.31,.095,.063,.036,interior,.014);
  if(v)box('Tela central do EX30',0,1.15,.48,.18,.25,.018,darkLamp,.014);
  // Tires have shaped sidewalls and an actual opening around the alloy rim.
  const tireProfile=[new THREE.Vector2(.229,-.108),new THREE.Vector2(.29,-.111),new THREE.Vector2(.335,-.087),new THREE.Vector2(.350,-.045),new THREE.Vector2(.351,.045),new THREE.Vector2(.335,.087),new THREE.Vector2(.29,.111),new THREE.Vector2(.229,.108)];
  const tireGeometry=new THREE.LatheGeometry(tireProfile,48),track=v?1.590:1.550;
  for(const side of [-1,1])for(const axle of axles){
    const wx=side*track/2;
    const tire=mesh('Pneu com flanco arredondado',tireGeometry,rubber,wx,wheelY,axle);tire.rotation.z=Math.PI/2;
    const cyl=(name:string,r:number,depth:number,material:THREE.Material,x:number)=>{const obj=mesh(name,new THREE.CylinderGeometry(r,r,depth,40),material,x,wheelY,axle);obj.rotation.z=Math.PI/2;return obj;};
    cyl('Interior preto da roda',.235,.12,black,wx);cyl('Disco de freio',.186,.010,alloy,wx+side*.065);
    const rimX=wx+side*.110;
    const ring=mesh('Aro usinado',new THREE.TorusGeometry(.227,.008,6,48),chrome,rimX,wheelY,axle);ring.rotation.y=Math.PI/2;
    const spoke=(angle:number,wide:boolean)=>{
      const shape=wide?[[.055,-.10],[.215,-.15],[.223,.26],[.105,.43]]:[[.055,-.10],[.218,-.055],[.218,.09],[.078,.16]];
      const pts=shape.map(([r,a])=>new THREE.Vector2(Math.cos(angle+a)*r,Math.sin(angle+a)*r));
      const geometry=new THREE.ExtrudeGeometry(new THREE.Shape(pts),{depth:.012,bevelEnabled:true,bevelSegments:1,steps:1,bevelSize:.002,bevelThickness:.002});
      const obj=mesh(v?'Pá aerodinâmica diamantada EX30':'Raio duplo diamantado Tiggo',geometry,chrome,rimX,wheelY,axle);obj.rotation.y=side*Math.PI/2;
    };
    for(let i=0;i<5;i++){const a=i*Math.PI*.4;spoke(a,v);if(!v)spoke(a+.24,false);}
    cyl('Cubo da roda',.053,.023,chrome,wx+side*.125);
    for(let i=0;i<5;i++){const a=i*Math.PI*.4;const bolt=mesh('Parafuso da roda',new THREE.CylinderGeometry(.008,.008,.009,6),black,wx+side*.14,wheelY+Math.cos(a)*.036,axle+Math.sin(a)*.036);bolt.rotation.z=Math.PI/2;}
    for(const offset of [-.055,-.018,.018,.055]){const groove=mesh('Sulco longitudinal do pneu',new THREE.TorusGeometry(.350,.0016,3,48),black,wx+offset,wheelY,axle);groove.rotation.y=Math.PI/2;}
  }
  // Front lamps and grille differ by model, rather than sharing a generic SUV fascia.
  const face=(name:string,points:number[][],m:THREE.Material,z:number)=>{
    const contour=points.map(([x,y])=>new THREE.Vector2(x,y)),shape=new THREE.Shape(contour);
    const source=new THREE.ExtrudeGeometry(shape,{depth:.012,bevelEnabled:true,bevelSegments:1,steps:1,bevelSize:.004,bevelThickness:.003}),g=tessellator.modify(source);source.dispose();
    const positions=g.getAttribute('position'),normals=g.getAttribute('normal'),n=new THREE.Vector3();
    for(let i=0;i<positions.count;i++){const x=positions.getX(i),slope=-.30*x*Math.abs(x)/Math.pow(.87,3);positions.setZ(i,positions.getZ(i)-.10*Math.pow(Math.abs(x)/.87,3));n.set(normals.getX(i)-slope*normals.getZ(i),normals.getY(i),normals.getZ(i)).normalize();normals.setXYZ(i,n.x,n.y,n.z);}
    return mesh(name,g,m,0,0,z);
  };
  if(!v){
    face('Grade Tiggo 2022 - contorno cromado',[[-.62,.91],[.62,.91],[.56,.585],[-.56,.585]],chrome,half+.009);
    face('Grade Tiggo 2022 - trama escura',[[-.59,.884],[.59,.884],[.533,.611],[-.533,.611]],black,half+.024);
    for(let row=0;row<6;row++)for(let col=0;col<17;col++){const x=-.55+col*.069+(row%2)*.020;if(Math.abs(x)>.54)continue;box('Malha horizontal da grade',x,.635+row*.041,half+.048,.040,.009,.008,alloy,.003);}
    for(const y of [.845,.865])box('Friso cromado superior da grade',0,y,half+.055,1.10,.012,.012,chrome,.004);
    for(const side of [-1,1]){
      const p=[ [side*.61,.91],[side*.89,.976],[side*.87,.818],[side*.62,.785] ];face('Óptica trapezoidal Tiggo',p,darkLamp,half-.014);
      tube('LED inferior do farol Tiggo',[V(side*.63,.807,half-.024),V(side*.76,.827,half-.058),V(side*.85,.854,half-.085)],.011,lamp);
      for(const x of [.693,.797]){
        const z=half+.014-.10*Math.pow(x/.87,3),obj=mesh('Projetor do farol',new THREE.CylinderGeometry(.032,.032,.016,24),chrome,side*x,.875,z);obj.rotation.x=Math.PI/2;
        const lens=mesh('Lente interna do projetor Tiggo',new THREE.SphereGeometry(.026,16,8),new THREE.MeshPhysicalMaterial({color:'#839ba9',metalness:.35,roughness:.08,clearcoat:1}),side*x,.875,z+.014);lens.scale.z=.35;
      }
      face('Entrada lateral do para-choque',[[side*.60,.55],[side*.85,.59],[side*.84,.34],[side*.61,.36]],black,half+.009);
      box('DRL horizontal no para-choque',side*.72,.385,half+.038,.25,.028,.012,lamp,.009);
      box('Friso cromado do DRL',side*.71,.355,half+.039,.30,.013,.015,chrome,.006);
    }
    box('Entrada de ar inferior',0,.365,half+.020,1.02,.13,.025,black,.020);
    for(let i=0;i<12;i++)box('Aleta da tomada de ar',-.47+i*.085,.37,half+.038,.012,.105,.012,black,.003);
    face('Protetor inferior prateado Tiggo',[[-.70,.31],[.70,.31],[.58,.235],[-.58,.235]],alloy,half+.009);
    for(const x of [-.42,-.21,0,.21,.42])box('Relevo do protetor inferior',x,.275,half+.040,.055,.06,.022,chrome,.006);
    const ellipse:THREE.Vector3[]=[];for(let i=0;i<=48;i++){const a=i/48*Math.PI*2;ellipse.push(V(Math.cos(a)*.092,.857+Math.sin(a)*.043,half+.075));}tube('Emblema Chery',ellipse,.0045,chrome);
    tube('Símbolo Chery',[V(-.068,.847,half+.078),V(-.023,.849,half+.079),V(0,.884,half+.079),V(.023,.849,half+.079),V(.068,.847,half+.078)],.005,chrome);
  }else{
    // Smooth sealed nose, segmented Thor-hammer lights and low black intake.
    surface('Painel frontal fechado EX30',28,10,(u,t)=>{const x=(u*2-1)*.65,y=.68+t*.28,z=half+.032+.018*Math.sin(t*Math.PI)*(1-Math.pow(u*2-1,2))-.10*Math.pow(Math.abs(x)/.87,3);return V(x,y,z);},cabinPaint);
    for(const side of [-1,1]){
      face('Farol EX30 - caixa preta',[[side*.42,.965],[side*.87,.995],[side*.82,.79],[side*.67,.79],[side*.65,.895],[side*.42,.895]],darkLamp,half+.009);
      for(let i=0;i<6;i++)box('Segmento horizontal do martelo de Thor',side*(.46+i*.067),.945,half+.037-.10*Math.pow((.46+i*.067)/.87,3),.052,.027,.013,lamp,.004);
      for(let i=0;i<4;i++)box('Segmento vertical do martelo de Thor',side*.79,.917-i*.032,half-.035,.035,.026,.014,lamp,.004);
      box('Rebaixo do DRL vertical',side*.79,.635,half-.062,.071,.19,.027,black,.018);
      for(let i=0;i<5;i++)box('Segmento do DRL vertical EX30',side*.79,.57+i*.032,half-.039,.027,.025,.012,lamp,.004);
    }
    face('Entrada inferior EX30',[[-.70,.54],[.70,.54],[.83,.265],[-.83,.265]],black,half+.018);
    for(const y of [.31,.365,.42,.475])box('Aleta horizontal do para-choque EX30',0,y,half+.045,1.32,.010,.012,black,.003);
    mesh('Iron mark Volvo',new THREE.TorusGeometry(.046,.0045,6,28),chrome,0,.847,half+.069);
    tube('Faixa diagonal Volvo',[V(-.16,.737,half+.064),V(.16,.970,half+.064)],.0055,chrome);
    tube('Seta do emblema Volvo',[V(.027,.882,half+.071),V(.065,.921,half+.071),V(.040,.918,half+.071),V(.065,.921,half+.071),V(.064,.897,half+.071)],.004,chrome);
    box('Centro do emblema Volvo',0,.847,half+.076,.076,.018,.006,black,.004);
  }
  // Rear lighting, glazed tailgate, reflectors and a neutral number-plate holder.
  for(const side of [-1,1]){
    if(v){tube('Lanterna vertical EX30',[V(side*.72,1.39,-half+.16),V(side*.77,1.15,-half+.035),V(side*.78,.96,-half-.010),V(side*.49,.91,-half-.015)],.020,tail);tube('Lanterna inferior em C',[V(side*.50,.87,-half-.021),V(side*.78,.87,-half-.021),V(side*.78,.69,-half-.021),V(side*.53,.69,-half-.021)],.018,tail);}
    else{box('Lanterna horizontal Tiggo',side*.59,1.00,-half+.005,.42,.105,.028,tail,.025);box('Refletor traseiro Tiggo',side*.72,.40,-half+.005,.16,.027,.012,tail,.008);}
  }
  box('Porta-placa dianteiro',0,v?.44:.51,half+.075,.36,.115,.020,black,.008);
  box('Placa neutra dianteira',0,v?.44:.51,half+.090,.335,.094,.005,alloy,.005);
  box('Porta-placa traseiro',0,.66,-half-.025,.36,.115,.020,black,.008);
  const label=(text:string,width:number,height:number,x:number,y:number,z:number,rear=false)=>{
    if(typeof document==='undefined')return;const canvas=document.createElement('canvas');canvas.width=512;canvas.height=128;const ctx=canvas.getContext('2d');if(!ctx||typeof ctx.fillText!=='function')return;
    ctx.clearRect(0,0,512,128);ctx.fillStyle='#e5e9ec';ctx.font='600 56px Arial';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,256,68);
    const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
    const material=new THREE.MeshStandardMaterial({map:texture,transparent:true,alphaTest:.2,roughness:.45,depthWrite:false});const badge=mesh('Inscrição '+text,new THREE.PlaneGeometry(width,height),material,x,y,z);if(rear)badge.rotation.y=Math.PI;badge.castShadow=false;
  };
  label(v?'EX30':'TIGGO 5X',.28,.064,0,v?.44:.51,half+.099);
  if(v)label('V O L V O',.66,.082,0,1.01,-half-.030,true);
  else label('T I G G O  5 X',.54,.07,0,.94,-half-.030,true);
  return root;
}
