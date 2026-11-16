import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createCar,CAR_DIMENSIONS } from '../src/cars.ts';
import { createOfficeDoor } from '../src/office-door.ts';
import { readFile } from 'node:fs/promises';

for(const kind of ['tiggo','volvo'])test(`exterior ${kind} tem quatro rodas, malhas finitas e dimensões compatíveis`,()=>{
  const root=createCar(kind),d=CAR_DIMENSIONS[kind],bounds=new THREE.Box3().setFromObject(root),size=bounds.getSize(new THREE.Vector3());
  assert.equal(root.getObjectsByProperty('name','Pneu com flanco arredondado').length,4);
  assert.ok(Math.abs(size.z-d.length)<.24);assert.ok(size.x>d.width&&size.x<2.1);assert.ok(size.y<d.height+.10&&size.y>d.height-.12);
  let triangles=0;root.traverse(o=>{if(o instanceof THREE.Mesh){const p=o.geometry.getAttribute('position');for(const value of p.array)assert.ok(Number.isFinite(value));triangles+=(o.geometry.index?.count||p.count)/3;}});
  assert.ok(triangles<80000,`malha excessiva: ${triangles}`);
  assert.ok(root.getObjectByName('Carroceria com recortes dos paralamas'));assert.ok(root.getObjectByName('Para-brisa curvo'));
  if(kind==='tiggo')assert.ok(root.getObjectByName('Emblema Chery'));else assert.ok(root.getObjectByName('Iron mark Volvo'));
  root.updateMatrixWorld(true);
  const sightline=new THREE.Raycaster(new THREE.Vector3(-.38,1.25,3),new THREE.Vector3(0,0,-1));
  const opaque=sightline.intersectObject(root,true).find(hit=>!hit.object.material.transparent);
  assert.equal(opaque?.object.name,'Banco e encosto interno','o vidro deve revelar o interior, sem uma casca opaca fechando o vão');
  if(kind==='volvo'){
    const intake=root.getObjectByName('Entrada inferior EX30'),p=intake.geometry.getAttribute('position');let visibleCenter=false;
    for(let i=0;i<p.count;i++)if(Math.abs(p.getX(i))<.15&&p.getY(i)>.32&&p.getY(i)<.48&&p.getZ(i)+intake.position.z>d.length/2+.023)visibleCenter=true;
    assert.ok(visibleCenter,'a tomada de ar deve acompanhar a curva e permanecer à frente do para-choque');
  }
});

test('a porta oculta abre pelo pivô sem reconstruir ou deslocar a estante',()=>{
  const m={sage:new THREE.MeshStandardMaterial(),black:new THREE.MeshStandardMaterial(),counter:new THREE.MeshStandardMaterial()};
  const door=createOfficeDoor(m),frameMatrix=door.frame.matrix.clone(),leaf=door.leaf,geometries=[];
  leaf.traverse(o=>{if(o instanceof THREE.Mesh)geometries.push(o.geometry);});door.setOpen(true);
  assert.equal(door.isOpen,true);assert.ok(door.hinge.rotation.y>1.4);assert.equal(door.leaf,leaf);assert.deepEqual(door.frame.matrix,frameMatrix);
  const after=[];leaf.traverse(o=>{if(o instanceof THREE.Mesh)after.push(o.geometry);});assert.deepEqual(after,geometries);
  door.setOpen(false);assert.equal(door.hinge.rotation.y,0);assert.equal(door.isOpen,false);
});

test('escritório ampliado tem abertura física para a porta escondida do lavabo',async()=>{
  const model=JSON.parse(await readFile(new URL('../casa-modelo.json',import.meta.url),'utf8'));
  const office=model.layout.office;assert.equal(office.x1,6.78);assert.equal(office.z1,1.48);
  assert.ok(Math.abs((9.85-.09)-(6.78+.06)-2.92)<1e-8);
  const b=office.lavaboDoor;
  const walls=model.objects.filter(o=>o.group.includes('Paredes')&&Math.abs(o.y-b.z)<.01);
  for(const wall of walls){const overlap=Math.min(wall.x+wall.sx/2,b.x2-.015)-Math.max(wall.x-wall.sx/2,b.x1+.015);if(overlap>0)assert.ok(wall.z-wall.sz/2>=b.height-.001,`${wall.name} bloqueia a passagem`);}
  assert.ok(!model.objects.some(o=>o.name==='Box banho social'));
});
