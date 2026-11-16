import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {ROOMS,getRoom,interiorAt} from '../src/rooms.ts';
import {layoutFixture,parts,overlaps,sourceBox} from './layout-fixture.mjs';

test('há um único quarto de hóspedes e todo o intervalo central é jardim aberto',async t=>{
  const {model,meshes}=await layoutFixture(t),g=model.layout.lightwell;
  assert.ok(!ROOMS.some(r=>r.id==='flex'));assert.equal(ROOMS.filter(r=>r.id==='guest').length,1);
  for(const x of [g.x1+.20,(g.x1+g.x2)/2,g.x2-.20])for(const z of [g.z1+.20,(g.z1+g.z2)/2,g.z2-.20]){
    assert.equal(interiorAt(new THREE.Vector3(x,1.65,z)),undefined);
    for(const o of model.objects.filter(o=>['Pisos','Cobertura','Forros internos'].includes(o.group)))assert.ok(!sourceBox(o).containsPoint(new THREE.Vector3(x,o.z,z)),`${o.name} ocupa o jardim`);
  }
  for(const name of ['Janela do escritório para jardim de inverno','Janela dos hóspedes para jardim de inverno'])assert.equal(model.objects.find(o=>o.name===name).x,(g.x1+g.x2)/2);
  const bed=meshes.get('guest-bed'),head=new THREE.Vector3(0,0,1).applyQuaternion(bed.quaternion);assert.ok(head.z<-.99);
  assert.ok(new THREE.Box3().setFromObject(bed).min.z>g.z2+.07);
  assert.equal(getRoom('guest').bounds.z1,g.z2);
});

test('as seis cadeiras olham para o tampo e encaixam sem atravessar a mesa',async t=>{
  const {furniture,meshes}=await layoutFixture(t),table=furniture.find(o=>o.id==='dining-table'),tableParts=parts(meshes.get(table.id));
  const chairs=furniture.filter(o=>o.id.startsWith('chair-'));assert.equal(chairs.length,6);
  for(const chair of chairs){const mesh=meshes.get(chair.id),front=new THREE.Vector3(0,0,-1).applyQuaternion(mesh.quaternion),toward=new THREE.Vector3(table.x-chair.x,0,table.y-chair.y).normalize();assert.ok(front.dot(toward)>.65,`${chair.id} de costas para a mesa`);
    for(const a of parts(mesh))for(const b of tableParts)assert.ok(!overlaps(a.box,b.box),`${chair.id} atravessa ${b.name}`);
    assert.ok(Math.abs(chair.y-table.y)<table.sy/2+chair.sy/2,'o assento deve entrar sob o balanço');
  }
});

test('cadeiras do escritório, móveis da sala e suíte têm folgas entre montagens',async t=>{
  const {meshes,refs}=await layoutFixture(t);
  for(const [a,b] of [['office-chair','office-desk'],['office-chair-b','office-desk'],['office-chair','office-chair-b'],['living-sofa','living-coffee'],['living-sofa','living-chair'],['living-sofa','living-chair-b'],['living-chair','living-chair-b'],['living-chair','living-side-table'],['living-chair-b','living-side-table'],['suite-bed','suite-night-a'],['suite-bed','suite-night-b'],['suite-bed','suite-stool'],['guest-bed','guest-night']]){
    for(const pa of parts(meshes.get(a)))for(const pb of parts(meshes.get(b)))assert.ok(!overlaps(pa.box,pb.box),`${a} atravessa ${b}: ${pa.name} / ${pb.name}`);
  }
  const console=refs.groups.get('living').getObjectByName('Aparador atrás do sofá');
  for(const p of parts(meshes.get('living-sofa')))assert.ok(!overlaps(p.box,new THREE.Box3().setFromObject(console)),'aparador atravessa sofá');
});

test('móveis soltos ficam fora das paredes e do vão ampliado do jardim',async t=>{
  const {model,furniture,meshes}=await layoutFixture(t),walls=model.objects.filter(o=>o.group.toLowerCase().includes('parede'));
  for(const o of furniture.filter(o=>!o.name.toLowerCase().includes('tapete'))){
    for(const p of parts(meshes.get(o.id)))for(const wall of walls)assert.ok(!overlaps(p.box,sourceBox(wall),.004),`${o.id} atravessa ${wall.name}`);
  }
});

test('móveis apoiados têm pés em contato com a superfície do piso',async t=>{
  const {furniture,meshes}=await layoutFixture(t);
  for(const o of furniture.filter(o=>!o.name.toLowerCase().includes('abajur'))){
    const box=new THREE.Box3().setFromObject(meshes.get(o.id));assert.ok(Math.abs(box.min.y-.055)<.001,`${o.id} está suspenso ou afundado no piso: ${box.min.y}`);
  }
});

test('marcenaria fixa, quadros e espelho ficam à frente das paredes',async t=>{
  const {model,refs}=await layoutFixture(t),walls=model.objects.filter(o=>o.group.toLowerCase().includes('parede'));
  const fixed=model.objects.filter(o=>['Cozinha planejada','Marcenaria fixa'].includes(o.group));
  for(const o of fixed)for(const wall of walls)assert.ok(!overlaps(sourceBox(o),sourceBox(wall),.004),`${o.name} está dentro de ${wall.name}`);
  const names=['Estante verde - fundo','Fundo em carvalho das estantes','Cabeceira corrida em carvalho','Espelho oval da penteadeira','Aparador atrás do sofá','Buffet do jantar em carvalho','Moldura de quadro'];
  refs.root.traverse(o=>{if(o instanceof THREE.Mesh&&names.includes(o.name))for(const wall of walls)assert.ok(!overlaps(new THREE.Box3().setFromObject(o),sourceBox(wall),.004),`${o.name} está dentro de ${wall.name}`);});
});

test('cozinha separa geladeira, torre e retorno; três banquetas cabem no vão real',async t=>{
  const {model,refs}=await layoutFixture(t),kitchen=refs.groups.get('kitchen'),fridge=new THREE.Box3().setFromObject(kitchen.getObjectByName('Geladeira - gabinete'));
  for(const o of model.objects.filter(o=>['Torre de fornos','Bancada em L - retorno','Tampo do retorno em L'].includes(o.name)))assert.ok(!overlaps(fridge,sourceBox(o)),`geladeira atravessa ${o.name}`);
  const stools=kitchen.children.filter(o=>o.name.startsWith('Banqueta de madeira'));assert.equal(stools.length,3);
  assert.ok(!kitchen.getObjectByName('Revestimento de pedra em relevo da ilha'));
  const island=model.objects.filter(o=>o.name.includes('Ilha central')||o.name.startsWith('Tampo da ilha'));
  for(const stool of stools){
    assert.ok(new THREE.Vector3(0,0,-1).applyQuaternion(stool.quaternion).x<-.99);
    for(const part of parts(stool))for(const o of island)assert.ok(!overlaps(part.box,sourceBox(o)),`${stool.name} atravessa ${o.name}`);
  }
  assert.ok(model.layout.island.x2-model.layout.island.cabinetX2>.50);
});

test('lavabo dos hóspedes tem passagem no quarto e fechamento contínuo para circulação',async t=>{
  const {model}=await layoutFixture(t),b=model.layout.guestBath,opening=new THREE.Box3(new THREE.Vector3(b.door.x1+.02,.1,b.z1-.03),new THREE.Vector3(b.door.x2-.02,b.door.height-.02,b.z1+.03));
  for(const o of model.objects.filter(o=>o.group.toLowerCase().includes('parede')))assert.ok(!overlaps(sourceBox(o),opening),`${o.name} fecha o acesso`);
  const west=model.objects.find(o=>o.name==='Lavabo hóspedes - fechamento para circulação');assert.ok(west);assert.equal(west.sy,b.z2-b.z1);
});

test('migração corrige padrões antigos e preserva peças personalizadas e remoções',async t=>{
  const {furnish}=await layoutFixture(t),custom={id:'custom-chair',furniture:true,x:3,y:12},edited={id:'office-chair',furniture:true,x:7.1,y:2.6};
  const old=[{id:'guest-bed',furniture:true,x:8.65,y:6.78,rotation:90},{id:'chair-a-8.05',furniture:true,x:8.05,y:13.82,rotation:0},custom,edited],next=furnish(old,2);
  assert.equal(next[0].y,8.99);assert.equal(next[0].rotation,180);assert.equal(next[1].rotation,180);assert.equal(next[2],custom);assert.equal(next[3],edited);assert.equal(furnish(next,3),next);assert.equal(next.length,4);
});
