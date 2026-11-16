import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { batchStaticMeshes } from './optimize-scene.ts';
import { cycleLight } from './day-night.ts';
import { getRoom } from './rooms.ts';

type Materials=Record<string,THREE.MeshStandardMaterial>;
export function createOfficeDoor(m:Materials){
  const root=new THREE.Group(),frame=new THREE.Group(),hinge=new THREE.Group(),leaf=new THREE.Group();
  root.name='Porta oculta da estante para o lavabo';root.userData.batchBoundary=true;hinge.userData.batchBoundary=true;root.add(frame,hinge);hinge.add(leaf);hinge.position.set(6.975,.065,1.99);
  const box=(parent:THREE.Group,name:string,x:number,y:number,z:number,w:number,h:number,d:number,material:THREE.Material)=>{const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);mesh.name=name;mesh.position.set(x,y,z);mesh.castShadow=mesh.receiveShadow=true;parent.add(mesh);return mesh;};
  box(leaf,'Folha verde da porta camuflada',.375,1.275,0,.75,2.55,.055,m.sage);
  for(let i=0;i<31;i++)box(leaf,'Friso vertical da porta oculta',.014+i*.024,1.275,.033,.012,2.53,.012,m.sage);
  box(leaf,'Cava discreta para abrir a porta',.705,1.16,.037,.012,.19,.010,m.black);
  for(const x of [6.95,7.755])box(frame,'Batente da porta oculta',x,1.37,1.735,.026,2.60,.51,m.sage);
  box(frame,'Verga da marcenaria verde',7.35,2.67,1.735,.83,.045,.51,m.sage);
  box(frame,'Soleira do lavabo',7.35,.065,1.735,.82,.020,.51,m.counter);
  batchStaticMeshes(frame);batchStaticMeshes(leaf);
  let open=false;
  return {root,hinge,leaf,frame,setOpen(value:boolean){open=value;hinge.rotation.y=value?Math.PI*.47:0;hinge.updateMatrixWorld(true);},get isOpen(){return open;}};
}

export function addOfficeLavabo(root:THREE.Group,m:Materials,options:{room?:'officeBath'|'guestBath';offsetZ?:number;basinX?:number}={}){
  const holder=root;root=new THREE.Group();root.name='Equipamentos do lavabo';root.position.z=options.offsetZ||0;holder.add(root);
  const basinX=options.basinX??8.10;
  const ceramic=new THREE.MeshStandardMaterial({color:'#eeeae1',roughness:.25});
  const steel=new THREE.MeshStandardMaterial({color:'#aebbb5',roughness:.24,metalness:.87});
  const box=(name:string,x:number,y:number,z:number,w:number,h:number,d:number,mat:THREE.Material=ceramic)=>{const mesh=new THREE.Mesh(new RoundedBoxGeometry(w,h,d,2,Math.min(.025,w/4,h/4,d/4)),mat);mesh.name=name;mesh.position.set(x,y,z);mesh.castShadow=mesh.receiveShadow=true;root.add(mesh);return mesh;};
  // The WC faces across the width, preserving space in front within this compact lavabo.
  box('Lavabo - pedestal da bacia',9.35,.23,.80,.39,.34,.28);
  const bowl=new THREE.Mesh(new THREE.LatheGeometry([new THREE.Vector2(.105,0),new THREE.Vector2(.15,.08),new THREE.Vector2(.20,.22),new THREE.Vector2(.20,.27)],32),ceramic);bowl.name='Lavabo - bacia sanitária';bowl.position.set(9.29,.18,.80);bowl.scale.z=.84;root.add(bowl);
  const seatGeometry=new THREE.TorusGeometry(.177,.026,8,40);seatGeometry.scale(1.30,1,1);const seat=new THREE.Mesh(seatGeometry,ceramic);seat.rotation.x=Math.PI/2;seat.position.set(9.29,.475,.80);seat.name='Lavabo - assento sanitário';root.add(seat);
  box('Lavabo - caixa acoplada',9.65,.67,.80,.15,.43,.41);box('Lavabo - tampa da caixa',9.65,.895,.80,.17,.027,.44);box('Lavabo - acionamento',9.64,.913,.80,.042,.012,.025,steel);
  box('Lavabo - bancada suspensa',basinX,.85,.425,.72,.09,.34,m.oak);
  box('Lavabo - cuba de apoio',basinX,.902,.45,.45,.014,.23);
  for(const x of [basinX-.235,basinX+.235])box('Lavabo - borda da cuba',x,.95,.45,.020,.10,.27);
  for(const z of [.325,.575])box('Lavabo - borda da cuba',basinX,.95,z,.45,.10,.020);
  const tap=new THREE.Mesh(new THREE.CylinderGeometry(.011,.011,.25,16),steel);tap.name='Lavabo - torneira';tap.position.set(basinX,1.02,.285);root.add(tap);box('Lavabo - bica',basinX,1.145,.37,.028,.022,.17,steel);
  box('Lavabo - espelho',basinX,1.67,.253,.65,.82,.012,new THREE.MeshStandardMaterial({color:'#c9d3cc',metalness:.97,roughness:.07}));
  box('Lavabo - perfil de luz',basinX,2.12,.28,.65,.018,.018,m.light);
  const light=cycleLight(new THREE.PointLight('#ffe1b7',0,2.5,2),.05,3.5);light.position.set(basinX,2.17,.54);light.userData.bakeBounds={...getRoom(options.room||'officeBath')!.bounds,y1:0,y2:2.85};root.add(light);
  return root;
}

/** This second lavabo has one physical opening, on the guest-bedroom wall. */
export function addGuestLavabo(root:THREE.Group,m:Materials){
  addOfficeLavabo(root,m,{room:'guestBath',offsetZ:10.67,basinX:8.75});
  const box=(name:string,x:number,y:number,z:number,w:number,h:number,d:number,mat:THREE.Material)=>{const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);mesh.name=name;mesh.position.set(x,y,z);mesh.castShadow=mesh.receiveShadow=true;root.add(mesh);};
  for(const x of [7.37,8.19])box('Batente - acesso exclusivo pelos hóspedes',x,1.145,10.85,.035,2.18,.16,m.white);
  box('Verga - porta do lavabo dos hóspedes',7.78,2.24,10.85,.86,.06,.16,m.white);
  box('Porta do lavabo dos hóspedes aberta',7.415,1.115,11.275,.045,2.10,.75,m.white);
  box('Puxador da porta dos hóspedes',7.455,1.05,11.56,.035,.025,.13,m.black);
}
