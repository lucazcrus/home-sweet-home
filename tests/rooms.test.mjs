import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { ROOMS,getRoom,interiorAt,updateRoomPlanes } from '../src/rooms.ts';
import { fileURLToPath,pathToFileURL } from 'node:url';
import { mkdtemp,writeFile,rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { build } from 'esbuild';

let modules;
async function appModules(t){
  if(!modules)modules=(async()=>{
    const root=fileURLToPath(new URL('..',import.meta.url));
    const output=await build({stdin:{contents:"export {HouseViewer} from './src/viewer.ts';export {furnish} from './src/scene-assets.ts';export {addReferenceScenes} from './src/reference-scenes.ts';",resolveDir:root},bundle:true,write:false,platform:'node',format:'esm',plugins:[{name:'three-esm',setup(builder){builder.onResolve({filter:/^three(?:\/|$)/},args=>({path:new URL(args.path==='three'?'../node_modules/three/build/three.module.js':`../node_modules/${args.path}`,import.meta.url).href,external:true}));}}]});
    const temporary=await mkdtemp(join(tmpdir(),'house-rooms-test-'));t.after(()=>rm(temporary,{recursive:true,force:true}));const bundle=join(temporary,'rooms.mjs');await writeFile(bundle,output.outputFiles[0].text);return import(pathToFileURL(bundle).href);
  })();return modules;
}

test('recorte mantém somente o ambiente e reutiliza os quatro planos',()=>{
  const planes=Array.from({length:4},()=>new THREE.Plane()),identities=[...planes];
  for(const room of ROOMS){
    updateRoomPlanes(planes,room);const b=room.bounds;
    assert.ok(planes.every(plane=>plane.distanceToPoint(new THREE.Vector3((b.x1+b.x2)/2,1.5,(b.z1+b.z2)/2))>0));
    for(const [x,z] of [[b.x1-1,b.z1],[b.x2+1,b.z1],[b.x1,b.z1-1],[b.x1,b.z2+1]])assert.ok(planes.some(plane=>plane.distanceToPoint(new THREE.Vector3(x,1.5,z))<0));
    assert.deepEqual(planes,identities);
  }
});

test('detecção interna reconhece sala e escritório, preserva céu aberto e exterior',()=>{
  assert.equal(interiorAt(new THREE.Vector3(8.1,1.65,17)).id,'living');
  assert.equal(interiorAt(new THREE.Vector3(8.4,1.65,2.5)).id,'office');
  assert.equal(interiorAt(new THREE.Vector3(7.3,1.65,5.0)),undefined);
  assert.equal(interiorAt(new THREE.Vector3(2.0,1.65,5.0)),undefined);
  assert.equal(interiorAt(new THREE.Vector3(8.1,9,17)),undefined);
  assert.equal(interiorAt(new THREE.Vector3(5,1.65,24)),undefined);
});

test('teto e paredes completos aparecem ao entrar, mesmo com cobertura desmarcada',async t=>{
  const {HouseViewer}=await appModules(t),viewer=Object.create(HouseViewer.prototype);
  const groups=Object.fromEntries(['facadeEnvelope','solid','walls','lowWalls','roof','ceiling','site'].map(key=>[key,new THREE.Group()]));
  const ceiling=new THREE.Group();
  Object.assign(viewer,{camera:new THREE.PerspectiveCamera(),view:'3D',room:'all',display:{walls:true,roof:false,site:true},cutWalls:true,groups,references:{ceiling},renderer:{shadowMap:{}},localLights:[],ao:{invalidate(){}},invalidate(){}});
  viewer.camera.position.set(15,15,30);viewer.applyDisplay();assert.equal(groups.roof.visible,false);assert.equal(groups.lowWalls.visible,true);
  viewer.camera.position.set(8.1,1.65,17);viewer.applyDisplay();assert.equal(groups.roof.visible,true);assert.equal(groups.ceiling.visible,true);assert.equal(ceiling.visible,true);assert.equal(groups.walls.visible,true);assert.equal(groups.lowWalls.visible,false);
  viewer.camera.position.set(2,1.65,5);viewer.applyDisplay();assert.equal(groups.roof.visible,false);
  viewer.view='Entrar';viewer.applyDisplay();assert.equal(groups.roof.visible,true);assert.equal(groups.ceiling.visible,true);
});

test('isolamento oculta móveis externos e sombras sem reconstruir a geometria',async t=>{
  const {HouseViewer}=await appModules(t),viewer=Object.create(HouseViewer.prototype),scene=new THREE.Scene();
  const architecture=new THREE.Mesh(new THREE.BoxGeometry(10,.1,20),new THREE.MeshStandardMaterial());scene.add(architecture);
  const geometry=architecture.geometry,stage=new THREE.Mesh(),office=new THREE.Group(),living=new THREE.Group();scene.add(stage,office,living);
  const refs=new Map([['office',new THREE.Group()],['living',new THREE.Group()]]);const clipped=[];
  Object.assign(viewer,{scene,stage,room:'all',roomPlanes:Array.from({length:4},()=>new THREE.Plane()),meshes:new Map([['desk',office],['sofa',living]]),furnitureData:new Map([['desk',{x:8.5,y:2.8}],['sofa',{x:9,y:17}]]),references:{groups:refs,officeDoor:{root:new THREE.Group()}},options:{onSelect(){}},ao:{setClippingPlanes(planes){clipped.push(planes);},invalidate(){}},frame(){},applyDisplay(){},invalidate(){}});
  viewer.setRoom('office');assert.equal(stage.visible,false);assert.equal(office.visible,true);assert.equal(living.visible,false);assert.equal(refs.get('living').visible,false);assert.equal(architecture.material.clippingPlanes.length,4);assert.equal(architecture.material.clipShadows,true);
  const version=architecture.material.version,planes=architecture.material.clippingPlanes;
  viewer.setRoom('master');assert.equal(architecture.material.clippingPlanes,planes);assert.equal(architecture.material.version,version);assert.equal(architecture.geometry,geometry);
  viewer.setRoom('all');assert.equal(stage.visible,true);assert.equal(office.visible,true);assert.equal(living.visible,true);assert.equal(architecture.material.clippingPlanes,null);assert.equal(clipped.at(-1),null);
});

test('decoração nova migra uma vez e mantém móveis personalizados',async t=>{
  const {furnish}=await appModules(t),custom={id:'custom-table',name:'Mesa personalizada',furniture:true,x:3,y:12};
  const old={id:'office-desk',name:'Escrivaninha',furniture:true,x:8.3,y:10.35};
  const result=furnish([old,custom],0),desk=result.find(item=>item.id==='office-desk');
  assert.equal(result.find(item=>item.id==='custom-table'),custom);assert.equal(desk.y,3.69);assert.equal(desk.rotation,90);assert.ok(desk.name.includes('em L'));
  assert.equal(result.find(item=>item.id==='suite-bed').rotation,180);assert.equal(new Set(result.map(item=>item.id)).size,result.length);
  assert.equal(furnish(result,3),result);
  const saved=result.filter(item=>item.id!=='living-chair');assert.equal(furnish(saved,3),saved);assert.ok(!furnish(saved,3).some(item=>item.id==='living-chair'));
});

test('jardim e referências têm geometria 3D, instâncias e luz delimitada por cômodo',async t=>{
  const {addReferenceScenes}=await appModules(t);
  const previous=globalThis.document;t.after(()=>{globalThis.document=previous;});
  globalThis.document={createElement(){return {width:128,height:192,getContext(){return {fillRect(){},beginPath(){},ellipse(){},fill(){},arc(){}};}};}};
  const materials=new Proxy({},{get(object,key){return object[key]??=new THREE.MeshStandardMaterial();}}),scene=new THREE.Scene();
  const {groups}=addReferenceScenes(scene,materials),winter=groups.get('winter');
  assert.ok(winter.getObjectByName('Canteiro elevado do jardim de inverno'));
  assert.ok(winter.getObjectByName('Montante central da porta de correr'));
  assert.ok(winter.getObjectByName('Copa da árvore do jardim de inverno') instanceof THREE.InstancedMesh);
  assert.equal(winter.getObjectByName('Copa da árvore do jardim de inverno').count,650);
  let lights=0;scene.traverse(object=>{if(object instanceof THREE.PointLight){lights++;assert.ok(object.userData.bakeBounds);}});assert.ok(lights>=10);
  scene.updateMatrixWorld(true);
  const buffet=groups.get('living').getObjectByName('Buffet do jantar em carvalho').getWorldPosition(new THREE.Vector3());
  assert.ok(Math.abs(buffet.x-8.39)<1e-8&&Math.abs(buffet.z-13.04)<1e-8);
  assert.ok(groups.get('kitchen').getObjectByName('Cuba inox - fundo'));
  assert.ok(groups.get('kitchen').getObjectByName('Cooktop a gás - mesa preta'));
  assert.ok(groups.get('kitchen').getObjectByName('Geladeira - gabinete'));
  assert.ok(groups.get('kitchen').getObjectByName('Vidro curvo da coifa'));
  assert.ok(groups.get('office').getObjectByName('Estante verde - fundo'));
  assert.ok(groups.get('master').getObjectByName('Espelho oval da penteadeira'));
  assert.ok(groups.get('living').getObjectByName('Pendente de fibra natural'));
  assert.ok(groups.get('garage').getObjectByName('Volvo EX30 azul'));
});


test('correção da implantação migra só os móveis iniciais que ainda não foram reposicionados',async t=>{
  const {furnish}=await appModules(t);
  const original=[{id:'office-desk',x:8.5,y:2.85,rotation:0,furniture:true},{id:'dining-table',x:8.05,y:13.95,furniture:true},{id:'office-chair',x:8.72,y:1.9,furniture:true},{id:'custom',x:8.2,y:14,furniture:true}];
  const next=furnish(original,1);assert.equal(next[0].rotation,90);assert.equal(next[0].y,3.69);assert.equal(next[1].y,14.60);assert.equal(next[2],original[2]);assert.equal(next[3],original[3]);assert.equal(furnish(next,3),next);
});
