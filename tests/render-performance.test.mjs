import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { batchStaticMeshes } from '../src/optimize-scene.ts';
import { CachedSSAOPass } from '../src/cached-ao.ts';
import { createDayNightController,cycleLight } from '../src/day-night.ts';
import { createLocalLightVolume } from '../src/light-volume.ts';
import { fileURLToPath,pathToFileURL } from 'node:url';
import { mkdtemp,writeFile,rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { build } from 'esbuild';

const triangleCount=root=>{
  let count=0;root.traverse(o=>{if(o instanceof THREE.Mesh)count+=(o.geometry.index?.count||o.geometry.getAttribute('position').count)/3*(o instanceof THREE.InstancedMesh?o.count:1);});return count;
};

test('agrupamento preserva triângulos, limites, cores lineares e transformações',()=>{
  const root=new THREE.Group();root.position.set(3,1,-2);root.rotation.y=.32;
  const colors=[new THREE.Color('#a87342'),new THREE.Color('#f3eee3'),new THREE.Color('#58704a')];
  for(let i=0;i<42;i++){
    const object=new THREE.Mesh(new THREE.BoxGeometry(.025,2.7,.055),new THREE.MeshStandardMaterial({color:colors[i%3]}));
    object.position.set(i*.03,1.4,2);object.castShadow=object.receiveShadow=true;root.add(object);
  }
  root.updateMatrixWorld(true);const bounds=new THREE.Box3().setFromObject(root),triangles=triangleCount(root);
  const result=batchStaticMeshes(root);root.updateMatrixWorld(true);
  const after=new THREE.Box3().setFromObject(root);
  assert.equal(result.before,42);assert.equal(result.after,1);assert.equal(triangleCount(root),triangles);
  assert.ok(bounds.min.distanceTo(after.min)<1e-5&&bounds.max.distanceTo(after.max)<1e-5);
  const merged=root.children.find(o=>o instanceof THREE.Mesh);
  assert.equal(merged.material.color.getHex(),0xffffff);assert.equal(merged.material.vertexColors,true);
  const colorAttribute=merged.geometry.getAttribute('color');
  for(const color of colors)assert.ok(Array.from({length:colorAttribute.count},(_,i)=>i).some(i=>Math.abs(colorAttribute.getX(i)-color.r)<1e-6&&Math.abs(colorAttribute.getY(i)-color.g)<1e-6&&Math.abs(colorAttribute.getZ(i)-color.b)<1e-6));
});

test('cobertura, terreno e grupos com visibilidade própria continuam independentes',()=>{
  const root=new THREE.Group(),roof=new THREE.Group();roof.userData.batchBoundary=true;root.add(roof);
  const material=new THREE.MeshStandardMaterial();
  for(let i=0;i<3;i++)roof.add(new THREE.Mesh(new THREE.BoxGeometry(1,1,1),material));
  for(let i=0;i<3;i++)root.add(new THREE.Mesh(new THREE.BoxGeometry(1,1,1),material));
  batchStaticMeshes(roof);batchStaticMeshes(root);
  assert.equal(roof.parent,root);assert.equal(roof.children.length,1);
  assert.equal(root.children.filter(o=>o instanceof THREE.Mesh).length,1);
  roof.visible=false;let visible=0;root.traverseVisible(o=>{if(o instanceof THREE.Mesh)visible++;});assert.equal(visible,1);
});

test('água animada, instâncias e vidro permanecem separados para animação e transparência',()=>{
  const root=new THREE.Group();
  const glass=new THREE.Mesh(new THREE.BoxGeometry(1,1,.03),new THREE.MeshStandardMaterial({transparent:true,opacity:.3}));
  const water=new THREE.Mesh(new THREE.PlaneGeometry(3,3),new THREE.ShaderMaterial());
  const grass=new THREE.InstancedMesh(new THREE.PlaneGeometry(.01,.05),new THREE.MeshStandardMaterial(),100);
  root.add(glass,water,grass);batchStaticMeshes(root);
  assert.equal(root.children.length,3);assert.equal(glass.parent,root);assert.equal(water.parent,root);assert.equal(grass.count,100);
});

test('oclusão ambiente usa o cache enquanto só a água ou as luzes mudam',()=>{
  const ao=new CachedSSAOPass(new THREE.Scene(),new THREE.PerspectiveCamera());let normals=0,passes=0;
  ao.renderOverride=()=>normals++;ao.renderPass=()=>passes++;
  ao.render({}, {}, {});assert.equal(normals,1);assert.equal(passes,3);
  ao.render({}, {}, {});assert.equal(normals,1);assert.equal(passes,4);
  ao.invalidate();ao.render({}, {}, {});assert.equal(normals,2);assert.equal(passes,7);
  ao.setSize(1600,1000);assert.equal(ao.width,800);assert.equal(ao.height,500);
  ao.dispose();
});

test('Dia/Noite altera a luz sem substituir a cena nem a câmera e descarta apenas suas luzes',()=>{
  const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera();camera.position.set(3,2,8);scene.add(camera);
  const fixture=cycleLight(new THREE.PointLight('#ffe0ab'),0,7);scene.add(fixture);
  const renderer={toneMappingExposure:1},day=new THREE.Texture(),night=new THREE.Texture();
  const controller=createDayNightController(scene,renderer,day,night,false,true),count=scene.children.length;
  controller.setNight(true);for(let i=0;i<180;i++)controller.update(1/60);
  assert.equal(scene.children.length,count);assert.equal(scene.environment,night);assert.ok(fixture.intensity>6.99);
  assert.deepEqual(camera.position.toArray(),[3,2,8]);assert.equal(controller.update(1/60),false);
  controller.setNight(false);for(let i=0;i<180;i++)controller.update(1/60);
  assert.equal(scene.environment,day);assert.ok(fixture.intensity<.01);
  controller.dispose();assert.deepEqual(scene.children,[camera,fixture]);
});

test('volume de luz mantém luzes com sombras e subaquáticas em tempo real',()=>{
  const fixture=cycleLight(new THREE.PointLight('#ffdfac',0,4,2),0,5);fixture.position.set(4,2,11.5);
  const shadowLight=cycleLight(new THREE.SpotLight(),0,16);shadowLight.castShadow=true;
  const poolLight=cycleLight(new THREE.SpotLight(),0,7);poolLight.position.y=-.4;
  const volume=createLocalLightVolume([fixture,shadowLight,poolLight]);
  assert.ok(volume.baked.has(fixture));assert.ok(!volume.baked.has(shadowLight));assert.ok(!volume.baked.has(poolLight));
  const image=volume.uniforms.houseLightPositive.value.image;
  assert.ok(image.data instanceof Uint16Array);assert.ok(image.data.some(value=>value>0));
  for(const value of image.data)assert.ok(Number.isFinite(THREE.DataUtils.fromHalfFloat(value)));
  const material=new THREE.MeshStandardMaterial(),object=new THREE.Mesh(new THREE.BoxGeometry(),material);
  volume.install(object);const shader={uniforms:{},vertexShader:'#include <worldpos_vertex>',fragmentShader:'#include <lights_fragment_end>'};
  material.onBeforeCompile(shader,{});assert.ok(shader.vertexShader.includes('instanceMatrix'));assert.ok(shader.fragmentShader.includes('houseLightPositive'));
  volume.setNightAmount(.8);assert.equal(shader.uniforms.houseLightMix.value,.8);
  const version=material.version;volume.install(object);assert.equal(material.version,version);
  volume.dispose();
});

test('mover um móvel conserva a geometria; redimensionar substitui apenas o móvel editado',async t=>{
  // Bundle the real reconciliation methods for Node, without constructing a DOM/WebGL context.
  const output=await build({entryPoints:[fileURLToPath(new URL('../src/viewer.ts',import.meta.url))],bundle:true,write:false,platform:'node',format:'esm',plugins:[{name:'three-esm',setup(builder){builder.onResolve({filter:/^three(?:\/|$)/},args=>({path:new URL(args.path==='three'?'../node_modules/three/build/three.module.js':`../node_modules/${args.path}`,import.meta.url).href,external:true}));}}]});
  const temporary=await mkdtemp(join(tmpdir(),'house-viewer-test-'));t.after(()=>rm(temporary,{recursive:true,force:true}));const bundle=join(temporary,'viewer.mjs');await writeFile(bundle,output.outputFiles[0].text);
  const {HouseViewer}=await import(pathToFileURL(bundle).href);
  const viewer=Object.create(HouseViewer.prototype),materials={};
  for(const name of ['wood','fabric','linen','woodFloor','counter','black','metal','green','cabinetLight'])materials[name]=new THREE.MeshStandardMaterial();
  const renderer={shadowMap:{needsUpdate:false}},scene=new THREE.Scene();let installed=0;
  Object.assign(viewer,{materials,renderer,scene,meshes:new Map(),furnitureData:new Map(),architectureSignature:'[]',selected:null,disposed:false,invalidate(){this.dirty=true;},ao:{invalidate(){}},patio:{invalidateReflection(){}},localVolume:{install(){installed++;}}});
  const sofa={id:'test-sofa',name:'Sofá 3 lugares',x:8,y:17,z:.41,sx:2.25,sy:.9,sz:.82,group:'Sala',material:'fabric',furniture:true};
  const table={id:'test-table',name:'Mesa de centro',x:8,y:16,z:.18,sx:1.1,sy:.65,sz:.36,group:'Sala',material:'wood',furniture:true};
  const model={units:'m',dimensions:{width:10,depth:20},objects:[sofa,table]};
  viewer.syncModel(model);const originalSofa=viewer.meshes.get(sofa.id),originalTable=viewer.meshes.get(table.id),geometries=[];
  originalSofa.traverse(o=>{if(o instanceof THREE.Mesh)geometries.push(o.geometry);});assert.equal(installed,2);
  viewer.syncModel({...model,objects:[{...sofa,x:8.25,rotation:45},table]});
  assert.equal(viewer.meshes.get(sofa.id),originalSofa);assert.equal(viewer.meshes.get(table.id),originalTable);assert.equal(viewer.renderer,renderer);assert.equal(installed,2);
  assert.equal(originalSofa.position.x,8.25);assert.ok(Math.abs(originalSofa.rotation.y+Math.PI/4)<1e-8);
  const afterMove=[];originalSofa.traverse(o=>{if(o instanceof THREE.Mesh)afterMove.push(o.geometry);});assert.deepEqual(afterMove,geometries);
  viewer.setSelected(sofa.id);assert.equal(materials.fabric.emissive.getHex(),0);
  viewer.syncModel({...model,objects:[{...sofa,sx:2.5},table]});
  assert.notEqual(viewer.meshes.get(sofa.id),originalSofa);assert.equal(viewer.meshes.get(table.id),originalTable);assert.equal(originalSofa.parent,null);assert.equal(installed,3);
  viewer.syncModel({...model,objects:[]});assert.equal(viewer.meshes.size,0);assert.equal(scene.children.length,0);
});
