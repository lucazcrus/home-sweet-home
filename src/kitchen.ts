import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { cycleLight } from './day-night';
import { getRoom } from './rooms';
import architecture from './architecture.json';
import { createBarStool } from './bar-stool';

type Materials=Record<string,THREE.MeshStandardMaterial>;
/** Joinery and appliances reconstructed from the supplied kitchen photographs. */
export function addKitchenDetails(root:THREE.Group,ceiling:THREE.Group,m:Materials){
  const steel=new THREE.MeshStandardMaterial({color:'#b6c0ba',roughness:.26,metalness:.88});
  const brushed=new THREE.MeshStandardMaterial({color:'#7f8987',roughness:.42,metalness:.82});
  const mirror=new THREE.MeshStandardMaterial({color:'#c3cec6',roughness:.07,metalness:.97,envMapIntensity:.7});
  const ceramic=new THREE.MeshStandardMaterial({color:'#e0d4bd',roughness:.30});
  const gap=new THREE.MeshStandardMaterial({color:'#48413a',roughness:.75});
  const glass=new THREE.MeshStandardMaterial({color:'#b7c9c6',roughness:.10,metalness:.20,transparent:true,opacity:.28,depthWrite:false,side:THREE.DoubleSide});
  const mesh=(name:string,geometry:THREE.BufferGeometry,material:THREE.Material,x:number,y:number,z:number,parent:THREE.Object3D=root)=>{
    const item=new THREE.Mesh(geometry,material);item.name=name;item.position.set(x,y,z);item.castShadow=item.receiveShadow=true;parent.add(item);return item;
  };
  const box=(name:string,x:number,y:number,z:number,w:number,h:number,d:number,material:THREE.Material,r=0,parent:THREE.Object3D=root)=>mesh(name,r?new RoundedBoxGeometry(w,h,d,2,Math.min(r,w/3,h/3,d/3)):new THREE.BoxGeometry(w,h,d),material,x,y,z,parent);
  const cylinder=(name:string,x:number,y:number,z:number,r:number,h:number,material:THREE.Material)=>mesh(name,new THREE.CylinderGeometry(r,r,h,20),material,x,y,z);
  const tube=(name:string,points:THREE.Vector3[],r:number,material:THREE.Material)=>mesh(name,new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),24,r,7,false),material,0,0,0);
  const light=(x:number,y:number,z:number,power=2)=>{const fixture=cycleLight(new THREE.PointLight('#ffe0ae',0,2.8,2),.05,power);fixture.position.set(x,y,z);fixture.userData.bakeBounds={...getRoom('kitchen')!.bounds,y1:0,y2:2.85};root.add(fixture);};
  const handle=(x:number,y:number,z:number,length:number,alongZ=true)=>{
    box('Cava horizontal do puxador',x,y,z,alongZ?.014:length,.016,alongZ?length:.014,gap);
    box('Perfil metálico do puxador',x+.006,y-.012,z,alongZ?.012:length,.008,alongZ?length:.012,brushed);
  };
  // Lower timber fronts, recessed plinth and the dishwasher niche at the end.
  const cabinet=(z:number,width:number,drawers=false)=>{
    const levels=drawers?3:1;
    for(let row=0;row<levels;row++){
      const height=.70/levels-.012,y=.19+(row+.5)*.70/levels;
      box(drawers?'Gaveta de madeira da bancada':'Porta de madeira da bancada',2.555,y,z,.026,height,width-.018,m.cabinet,.006);
      handle(2.574,y+height/2-.012,z,width*.76);
    }
  };
  cabinet(10.49,.79,true);cabinet(11.28,.76);cabinet(11.99,.64);cabinet(12.65,.64);cabinet(13.32,.66,true);
  for(const z of [10.08,10.89,11.66,12.98,13.66,14.72])box('Divisória interna de marcenaria',2.26,.53,z,.57,.70,.018,m.cabinet);
  box('Fundo do nicho da lava-louças',1.993,.54,14.15,.025,.72,.88,m.wood);
  box('Tomada no nicho da lava-louças',2.014,.46,14.28,.012,.07,.07,m.white);
  for(const z of [13.82,14.46]){const connection=cylinder('Conexão hidráulica da lava-louças',2.018,.28,z,.018,.025,steel);connection.rotation.z=Math.PI/2;}
  // Real inset basin, with its floor below the opening in the generated countertop.
  box('Cuba inox - fundo',2.25,.795,12.29,.40,.014,.74,steel,.015);
  for(const x of [2.045,2.455])box('Cuba inox - lateral',x,.858,12.29,.012,.125,.74,steel);
  for(const z of [11.915,12.665])box('Cuba inox - cabeceira',2.25,.858,z,.42,.125,.012,steel);
  for(const x of [2.032,2.468])box('Aro da cuba inox',x,.985,12.29,.018,.008,.79,steel);
  for(const z of [11.899,12.681])box('Aro da cuba inox',2.25,.985,z,.455,.008,.018,steel);
  cylinder('Válvula da cuba',2.25,.806,12.29,.037,.006,brushed);
  // The faucet is mounted on the wall side of the counter, above the sink.
  tube('Torneira gourmet de bica alta',[new THREE.Vector3(2.005,.98,12.28),new THREE.Vector3(2.005,1.40,12.28),new THREE.Vector3(2.04,1.52,12.28),new THREE.Vector3(2.22,1.48,12.28),new THREE.Vector3(2.25,1.32,12.28)],.014,steel);
  cylinder('Base da torneira',2.005,1.00,12.28,.031,.035,steel);
  cylinder('Ducha da torneira',2.25,1.315,12.28,.023,.055,brushed);
  const lever=cylinder('Alavanca do misturador',2.025,1.08,12.36,.009,.10,steel);lever.rotation.z=-.45;
  // Cream subway tiles, with staggered joints, sockets and switches.
  for(let row=0;row<5;row++)for(let col=0;col<21;col++){
    const z=10.06+col*.224+(row%2)*.112;if(z>14.73)continue;
    box('Azulejo creme do backsplash',1.994,1.045+row*.110,z,.008,.104,Math.min(.217,14.80-z),ceramic,.002);
  }
  for(const z of [10.7,11.4,12.9,14.15]){
    box('Espelho de tomada da cozinha',2.008,1.26,z,.012,.09,.07,m.white,.004);
    for(const offset of [-.015,.015])box('Encaixe da tomada',2.016,1.26,z+offset,.003,.014,.006,gap);
  }
  // Upper cabinets with a framed mirrored niche and LED below it.
  for(let i=0;i<8;i++){
    const z=10.12+i*.575;
    box('Porta clara do armário superior',2.264,2.28,z,.025,.68,.555,m.cabinetLight,.006);
    box('Espelho do nicho superior',1.992,1.755,z,.008,.30,.555,mirror);
    box('Divisória do nicho espelhado',2.12,1.755,z-.282,.28,.33,.015,m.oak);
  }
  for(const y of [1.59,1.93])box('Moldura de madeira do nicho superior',2.12,y,12.42,.30,.035,4.68,m.oak);
  box('LED do nicho espelhado',2.245,1.61,12.42,.008,.009,4.58,m.light);
  for(const z of [10.6,12.2,13.7])light(2.32,1.64,z,1.8);
  // Tower: microwave above oven, with glazing, racks, controls and brushed handles.
  const appliance=(name:string,y:number,height:number)=>{
    box(name+' - moldura inox',2.96,y,14.205,.57,height,.025,steel,.008);
    box(name+' - vidro preto',2.96,y-.02,14.183,.48,height*.67,.018,m.black,.009);
    box(name+' - reflexo no vidro',2.96,y+.015,14.172,.42,height*.48,.003,glass);
    box(name+' - puxador',2.96,y+height*.24,14.145,.42,.026,.032,steel,.008);
    for(const x of [2.77,3.15]){const knob=cylinder(name+' - seletor',x,y+height*.36,14.16,.024,.020,brushed);knob.rotation.x=Math.PI/2;}
    if(name==='Forno elétrico')for(const rackY of [y-.12,y-.045])for(let line=0;line<7;line++)box('Grade interna do forno',2.77+line*.06,rackY,14.17,.012,.005,.003,brushed);
  };
  appliance('Forno elétrico',.95,.61);appliance('Micro-ondas',1.63,.43);
  box('Porta superior da torre',2.96,2.28,14.197,.61,.70,.025,m.cabinetLight,.006);
  // French-door refrigerator at the return, with freezer drawer and long handles.
  box('Geladeira - gabinete',3.90,1.30,14.49,1.10,2.46,.64,brushed,.025);
  for(const x of [3.625,4.175]){
    box('Geladeira - porta superior',x,1.67,14.151,.534,1.65,.035,m.cabinetLight,.018);
    box('Geladeira - puxador vertical',x+(x<3.90?.20:-.20),1.69,14.111,.022,.64,.025,steel,.008);
  }
  box('Geladeira - gaveta do freezer',3.90,.42,14.151,1.08,.69,.035,m.cabinetLight,.018);
  box('Geladeira - puxador do freezer',3.90,.66,14.112,.70,.022,.025,steel,.007);
  box('Geladeira - visor',3.69,1.85,14.123,.105,.12,.007,m.black,.008);
  // Return cabinetry, an oak open niche and reflected doors above.
  for(let i=0;i<3;i++){
    const x=4.78+i*.54;
    box('Porta de madeira no retorno',x,.55,14.215,.53,.68,.025,m.cabinet,.006);handle(x,.875,14.194,.42,false);
    box('Armário aéreo do retorno',x,2.34,14.43,.54,.72,.30,m.cabinetLight,.006);
  }
  for(const x of [4.525,6.115])box('Lateral do nicho aberto em madeira',x,1.77,14.37,.03,.32,.36,m.oak,.006);
  for(const y of [1.625,1.915])box('Prateleira do nicho aberto em madeira',5.32,y,14.37,1.62,.03,.36,m.oak,.006);
  box('Fundo espelhado do retorno',5.32,1.77,14.54,1.55,.24,.008,mirror);
  // Island: shallow working cabinetry leaves a real 56cm knee recess under
  // the stone top. There is no opaque stone panel behind the stools.
  for(const z of [10.96,11.76,12.56])for(let row=0;row<3;row++){
    const y=.22+row*.23;
    box('Gaveta da ilha em madeira',3.795,y+.10,z,.025,.208,.775,m.cabinet,.006);handle(3.777,y+.19,z,.62);
  }
  for(const z of [10.63,13.07])box('Fechamento lateral da ilha em pedra branca',4.45,.50,z,1.40,.88,.06,m.counter);
  box('Fundo recuado do vão das banquetas',architecture.island.cabinetX2+.012,.49,11.85,.022,.78,2.30,m.oak);
  architecture.island.stools.z.forEach((z,i)=>{const stool=createBarStool(m.oak);stool.name=`Banqueta de madeira ${i+1} · verde musgo`;stool.position.set(architecture.island.stools.x,.055,z);stool.rotation.y=Math.PI/2;root.add(stool);});
  // Five-burner gas hob, removable grates, caps and a bank of control knobs.
  box('Cooktop a gás - mesa preta',4.45,.996,11.85,.66,.025,.86,m.black,.014);
  for(const [dx,dz,r] of [[-.18,-.26,.066],[.18,-.26,.066],[-.18,.26,.066],[.18,.26,.066],[0,0,.082]]){
    cylinder('Queimador do cooktop',4.45+dx,1.017,11.85+dz,r,.017,brushed);
    cylinder('Tampa do queimador',4.45+dx,1.032,11.85+dz,r*.82,.015,m.black);
    for(const side of [-1,1]){
      box('Trempe do cooktop',4.45+dx+side*r,1.048,11.85+dz,.018,.018,r*2.5,m.black,.005);
      box('Apoio transversal da trempe',4.45+dx,1.048,11.85+dz+side*r,r*2.5,.018,.018,m.black,.005);
    }
  }
  for(let i=0;i<5;i++)cylinder('Botão do cooktop',4.73,1.025,11.54+i*.14,.018,.025,brushed);
  // Hood: curved glazing, stainless filter, duct, grille and two recessed lights.
  const points:THREE.Vector3[]=[];for(let i=0;i<=18;i++){const x=-.49+i*.98/18;points.push(new THREE.Vector3(x,.045*(1-Math.pow(x/.49,2)),0));}
  const positions:number[]=[],indices:number[]=[];for(const point of points)positions.push(point.x,point.y,-.36,point.x,point.y,.36);
  for(let i=0;i<18;i++){const n=i*2;indices.push(n,n+1,n+2,n+1,n+3,n+2);}
  const hoodGlass=new THREE.BufferGeometry();hoodGlass.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));hoodGlass.setIndex(indices);hoodGlass.computeVertexNormals();mesh('Vidro curvo da coifa',hoodGlass,glass,4.45,2.12,11.85);
  box('Coifa - filtro de inox',4.45,2.13,11.85,.53,.065,.54,steel,.02);
  box('Coifa - chaminé',4.45,2.49,11.85,.28,.65,.29,steel,.012);
  for(let i=0;i<8;i++)for(const dx of [-.08,.08])box('Coifa - grelha de ventilação',4.45+dx,2.60+i*.017,12.0,.105,.004,.005,m.black);
  for(let i=0;i<14;i++)box('Filtro perfurado da coifa',4.22+i*.034,2.094,11.85,.006,.003,.43,brushed);
  for(const dz of [-.19,.19])cylinder('Lente do spot da coifa',4.45,2.087,11.85+dz,.025,.006,m.light);
  light(4.45,2.03,11.85,2.4);
  // Stainless barbecue at the end of the wall bench beside the patio glazing.
  box('Churrasqueira a gás - base inox',2.26,1.075,10.49,.56,.18,.66,steel,.025);
  box('Churrasqueira a gás - tampa arredondada',2.23,1.26,10.49,.53,.24,.65,brushed,.075);
  box('Churrasqueira a gás - puxador',2.53,1.28,10.49,.035,.035,.45,steel,.012);
  for(const z of [10.27,10.42,10.57,10.72]){const knob=cylinder('Controle da churrasqueira',2.552,1.06,z,.025,.025,m.black);knob.rotation.z=Math.PI/2;}
  box('Churrasqueira - termômetro',2.505,1.31,10.49,.008,.05,.07,m.black,.009);
  // Gypsum ceiling channels and an L-shaped warm light, independent of cutaway view.
  for(const [x,z,w,d] of [[3.15,12.18,.018,4.65],[4.1,14.50,1.90,.018]]){
    box('Perfil embutido no forro da cozinha',x,2.792,z,w+.022,.016,d+.022,brushed,0,ceiling);
    box('LED linear do teto da cozinha',x,2.781,z,w,.009,d,m.light,0,ceiling);
  }
  for(const [x,z] of [[2.8,10.2],[5.8,10.2],[5.8,13.5]])box('Spot quadrado da cozinha',x,2.79,z,.08,.014,.08,m.light,.008,ceiling);
  light(3.15,2.71,11.3,2.6);light(3.15,2.71,13.3,2.6);
  return root;
}
