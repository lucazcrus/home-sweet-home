import * as THREE from 'three';
import architecture from './architecture.json' with {type:'json'};

export type RoomId='all'|'living'|'kitchen'|'master'|'office'|'officeBath'|'guest'|'guestBath'|'winter'|'pool'|'garage'|'facade'|'corridor'|'bath';
export type RoomDefinition={id:RoomId;label:string;bounds:{x1:number;x2:number;z1:number;z2:number};interior:boolean;height:number;inside:[number,number,number];look:[number,number,number]};
export const ROOMS:RoomDefinition[]=[
  {id:'living',label:'Living and dining',bounds:{x1:6.35,x2:9.85,z1:12.75,z2:20.10},interior:true,height:4.55,inside:[7.10,1.65,19.10],look:[8.10,1.25,15.30]},
  {id:'kitchen',label:'Kitchen',bounds:{x1:1.85,x2:6.50,z1:9.27,z2:15.10},interior:true,height:2.82,inside:[5.85,1.65,14.20],look:[3.6,1.1,11.4]},
  {id:'master',label:'Primary bedroom',bounds:{x1:3.46,x2:6.85,z1:.15,z2:3.55},interior:true,height:2.82,inside:[3.95,1.65,3.14],look:[5.55,1.10,1.35]},
  {id:'office',label:'Office',bounds:{x1:6.78,x2:9.85,z1:1.48,z2:4.55},interior:true,height:2.82,inside:[7.10,1.65,2.50],look:[8.00,1.35,3.50]},
  {id:'officeBath',label:'Office powder room',bounds:{x1:6.78,x2:9.85,z1:.15,z2:1.48},interior:true,height:2.82,inside:[7.35,1.65,1.10],look:[8.55,1.25,.60]},
  {id:'guest',label:'Guest bedroom',bounds:{...architecture.guest},interior:true,height:2.82,inside:[7.10,1.65,10.18],look:[8.33,1.15,8.25]},
  {id:'guestBath',label:'Guest powder room',bounds:{...architecture.guestBath},interior:true,height:2.82,inside:[7.70,1.65,11.15],look:[9.05,1.20,11.60]},
  {id:'winter',label:'Winter garden',bounds:{...architecture.lightwell},interior:false,height:2.85,inside:[6.22,1.65,6.80],look:[8.45,1.1,6.0]},
  {id:'pool',label:'Courtyard and pool',bounds:{...architecture.courtyard},interior:false,height:3.3,inside:[5.18,2.55,8.90],look:[2.55,1.10,6.00]},
  {id:'garage',label:'Garage',bounds:{x1:.02,x2:6.7,z1:15.10,z2:20.25},interior:false,height:2.86,inside:[3.35,1.65,23.10],look:[3.35,1.2,17.20]},
  {id:'facade',label:'Facade and garden',bounds:{x1:-.1,x2:10.1,z1:15.1,z2:25.5},interior:false,height:5.15,inside:[1,1.9,32.7],look:[5,2.3,19.6]},
  {id:'corridor',label:'Hallway',bounds:{x1:5.55,x2:6.85,z1:3.4,z2:12.85},interior:true,height:2.82,inside:[6.15,1.65,7.2],look:[6.15,1.4,4.5]},
  {id:'bath',label:'Primary closet and bathroom',bounds:{x1:.15,x2:3.46,z1:.15,z2:3.55},interior:true,height:2.82,inside:[2.85,1.65,2.6],look:[1.3,1.2,1.8]}
];
export const getRoom=(id:RoomId)=>ROOMS.find(room=>room.id===id);
export function containsPoint(room:RoomDefinition,x:number,z:number,margin=0){const b=room.bounds;return x>=b.x1-margin&&x<=b.x2+margin&&z>=b.z1-margin&&z<=b.z2+margin;}
export function interiorAt(position:THREE.Vector3){
  const g=architecture.lightwell;
  if(position.x>g.x1&&position.x<g.x2&&position.z>g.z1&&position.z<g.z2)return undefined;
  return ROOMS.find(room=>room.interior&&position.y>.12&&position.y<room.height+.02&&containsPoint(room,position.x,position.z));
}
/** Plane normals point toward the retained room. Plane objects are reused across selections. */
export function updateRoomPlanes(planes:THREE.Plane[],room:RoomDefinition,margin=.13){
  const b=room.bounds;
  planes[0].setComponents(1,0,0,-b.x1+margin);planes[1].setComponents(-1,0,0,b.x2+margin);
  planes[2].setComponents(0,0,1,-b.z1+margin);planes[3].setComponents(0,0,-1,b.z2+margin);
}
