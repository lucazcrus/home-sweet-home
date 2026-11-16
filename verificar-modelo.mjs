import fs from 'node:fs';
import assert from 'node:assert/strict';

const source=fs.readFileSync(new URL('./casa-modelo.json',import.meta.url),'utf8');
assert.equal(source,fs.readFileSync(new URL('./public/casa-modelo.json',import.meta.url),'utf8'),'A base pública deve acompanhar o gerador');
const model=JSON.parse(source),{pool:P,courtyard:C,lightwell:L}=model.layout;
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} difere de ${b}`);
close(P.x2-P.x1,2.80);close(P.z2-P.z1,3.00);close(C.x2-C.x1,5.40);close(C.z2-C.z1,5.72);
const overlaps=(o,r)=>Math.min(o.x+o.sx/2,r.x2)-Math.max(o.x-o.sx/2,r.x1)>1e-6&&Math.min(o.y+o.sy/2,r.z2)-Math.max(o.y-o.sy/2,r.z1)>1e-6;
const inside=(r,inset)=>({x1:r.x1+inset,x2:r.x2-inset,z1:r.z1+inset,z2:r.z2-inset});
for(const o of model.objects){
  for(const field of ['x','y','z','sx','sy','sz'])assert.ok(Number.isFinite(o[field]),`${o.name}: ${field} inválido`);
  assert.ok(o.sx>0&&o.sy>0&&o.sz>0,`${o.name}: dimensões positivas`);
  assert.ok(model.materials[o.material],`${o.name}: material existe`);
  if(o.group==='Cobertura'||o.group==='Forros internos'){
    assert.ok(!overlaps(o,inside(C,.36)),`${o.name} fecha o pátio aberto`);
    assert.ok(!overlaps(o,inside(L,.10)),`${o.name} fecha o jardim de luz`);
  }
  if(o.group==='Pisos'||o.group==='Terreno e paisagismo')assert.ok(!overlaps(o,inside(P,.01))||o.z+o.sz/2<P.floor,`${o.name} preenche a piscina`);
}
const basin=model.objects.find(o=>o.name==='Piscina - fundo 2,80 x 3,00 m');
assert.ok(basin);close(basin.sx,2.80);close(basin.sy,3.00);
assert.ok(model.objects.some(o=>o.name==='Esquadria de correr cozinha - pátio'));
assert.ok(!model.objects.some(o=>o.name==='Janela da circulação para o pátio aberto'));
assert.ok(!model.objects.some(o=>o.name==='Janela do escritório - esquadria preta'));
for(const name of ['Janela do escritório para jardim de inverno','Janela dos hóspedes para jardim de inverno'])assert.ok(model.objects.some(o=>o.name===name));
const whiteWall=model.objects.find(o=>o.name==='Circulação - parede branca para o pátio');assert.ok(whiteWall&&whiteWall.material==='warmWhite');close(whiteWall.sy,C.z2-C.z1);
assert.ok(model.objects.some(o=>o.name==='Sala jantar - parede de fundo da estante'&&o.keepFullHeight));
const deck=model.objects.filter(o=>o.name.startsWith('Deck madeira - régua'));assert.ok(deck.length>20);
for(const board of deck){assert.equal(board.material,'deckWood');assert.ok(!overlaps(board,P));}
const sink={x1:2.04,x2:2.46,z1:11.91,z2:12.67};
for(const countertop of model.objects.filter(o=>o.name.startsWith('Tampo cozinha com recorte')))assert.ok(!overlaps(countertop,inside(sink,.005)),`${countertop.name} fecha a cuba`);
assert.ok(model.objects.some(o=>o.name==='Porta de vidro de correr - jardim de inverno'));
assert.ok(model.objects.some(o=>o.group==='Forros internos'));
for(const floor of model.objects.filter(o=>o.group==='Pisos'))assert.ok(!overlaps(floor,inside(L,.10)),`${floor.name} preenche o jardim de inverno`);
for(const [x,y] of [[8.2,4.2],[6.2,6.3],[7.5,9.7],[4.45,11.85],[5.1,1.65]]){
  assert.ok(model.objects.some(o=>o.group==='Pisos'&&Math.abs(o.x-x)<=o.sx/2&&Math.abs(o.y-y)<=o.sy/2),`Falta piso na ala coberta em ${x}, ${y}`);
}
const floors=model.objects.filter(o=>o.group==='Pisos');
for(let i=0;i<floors.length;i++)for(let j=i+1;j<floors.length;j++){
  const a=floors[i],b=floors[j];
  if(a.material!==b.material&&Math.abs(a.z+a.sz/2-b.z-b.sz/2)<1e-5)
    assert.ok(!overlaps(a,{x1:b.x-b.sx/2,x2:b.x+b.sx/2,z1:b.y-b.sy/2,z2:b.y+b.sy/2}),`Pisos coplanares com materiais diferentes: ${a.name}, ${b.name}`);
}
console.log(`Conferidos ${model.objects.length} objetos: cotas da piscina/pátio, vazios de lajes/pisos/cuba, janelas do jardim, parede branca, deck, materiais e base pública.`);
