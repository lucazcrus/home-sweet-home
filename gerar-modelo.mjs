import fs from 'node:fs';

// Reference-based architectural study. Dimensions marked in the floor plan are
// used directly; unmarked heights, setbacks and facade details remain estimates.
// Coordinates use X (width), Y (depth, street at Y=20), Z (height), in meters.
const layout = JSON.parse(fs.readFileSync(new URL('./src/architecture.json', import.meta.url), 'utf8'));
const {courtyard:C, pool:P, lightwell:L,guest:G,guestBath:B,island:I} = layout;
const objects = [];
const box = (name, x,y,z, sx,sy,sz, material, group='Casa') => objects.push({name,x,y,z,sx,sy,sz,material,group});
const wallX = (name,x1,x2,y,z=0,h=2.8,t=.12,mat='warmWhite',group='Paredes internas') => box(name,(x1+x2)/2,y,z+h/2,x2-x1,t,h,mat,group);
const wallY = (name,x,y1,y2,z=0,h=2.8,t=.12,mat='warmWhite',group='Paredes internas') => box(name,x,(y1+y2)/2,z+h/2,t,y2-y1,h,mat,group);

const M={floor:'#e9e5dc',woodFloor:'#987557',warmWhite:'#f3f0e9',white:'#faf9f6',glass:'#9ec3cc',black:'#30383b',wood:'#a87342',stone:'#756452',concrete:'#c9c6bf',grass:'#78916a',paver:'#d7d2c8',dark:'#353331',cabinet:'#b38355',cabinetLight:'#ddd5c9',counter:'#f2f0ea',bath:'#d9dfe0',green:'#587455',deckWood:'#8d5d40',metal:'#45484a',facadeStone:'#ded1b4',poolTile:'#76948b',roof:'#f8f7f3',light:'#fff0d2',tile:'#eeeae2'};
// Plan orientation: street at Y=20; courtyard inside the envelope, never roofed.
const rect=(name,x1,x2,y1,y2,z,t,mat,group)=>box(name,(x1+x2)/2,(y1+y2)/2,z,x2-x1,y2-y1,t,mat,group);
const ring=(name,x1,x2,y1,y2,hole,z,t,mat,group)=>{
  rect(name+' - oeste',x1,hole.x1,y1,y2,z,t,mat,group);
  rect(name+' - leste',hole.x2,x2,y1,y2,z,t,mat,group);
  rect(name+' - fundos',hole.x1,hole.x2,y1,hole.z1,z,t,mat,group);
  rect(name+' - frente',hole.x1,hole.x2,hole.z2,y2,z,t,mat,group);
};
ring('Base da planta com vazio da piscina',0,10,0,20,P,-.18,.20,'grass','Terreno e paisagismo');
box('Jardim e acesso frontal — extensão estimada por foto',5,22.25,-.12,10,4.5,.22,'grass','Terreno e paisagismo');
rect('Piso da ala posterior',.15,9.85,.15,C.z1,.015,.08,'woodFloor','Pisos');
rect('Piso da cozinha',.15,6.65,C.z2,15.20,.015,.08,'tile','Pisos');
rect('Piso do lavabo e transição social',6.65,9.85,10.85,12.85,.015,.08,'tile','Pisos');
rect('Piso da circulação',5.70,6.80,C.z1,C.z2,.015,.08,'woodFloor','Pisos');
rect('Piso da ala íntima junto ao fundo',6.65,9.85,C.z1,L.z1,.015,.08,'woodFloor','Pisos');
if(L.x2<9.85)rect('Piso da ala íntima com recorte do jardim',L.x2,9.85,L.z1,L.z2,.015,.08,'woodFloor','Pisos');
rect('Piso dos quartos laterais',6.65,9.85,L.z2,10.85,.015,.08,'woodFloor','Pisos');
box('Sala frontal 3,40 x 7,15 m',8.05,16.425,.015,3.4,7.15,.08,'tile','Pisos');
box('Piso da garagem coberta',3.35,17.7,.02,6.45,4.6,.08,'tile','Pisos');
ring('Pátio aberto - piso com recorte da piscina',C.x1,C.x2,C.z1,C.z2,P,.015,.08,'paver','Pátio e piscina');
// Pool shell, below floor level: the ground and paving have matching openings.
rect('Piscina - fundo 2,80 x 3,00 m',P.x1,P.x2,P.z1,P.z2,P.floor-.06,.12,'poolTile','Pátio e piscina');
for(const [name,x1,x2,y1,y2] of [
 ['oeste',P.x1-.10,P.x1,P.z1-.10,P.z2+.10],['leste',P.x2,P.x2+.10,P.z1-.10,P.z2+.10],
 ['fundos',P.x1,P.x2,P.z1-.10,P.z1],['frente',P.x1,P.x2,P.z2,P.z2+.10]])
 rect('Piscina - parede '+name,x1,x2,y1,y2,P.floor/2,-P.floor,'poolTile','Pátio e piscina');
rect('Piscina - banco submerso',P.x1,P.x2,P.z2-.52,P.z2,(P.floor+P.benchTop)/2,P.benchTop-P.floor,'poolTile','Pátio e piscina');
// Perimeter and room wings traced against the floor-plan, rather than filling the courtyard.
wallX('Fundo da casa',.15,9.85,.15,0,2.85,.18,'warmWhite','Paredes externas');
wallY('Muro oeste - trecho posterior',.15,.15,C.z1,0,2.85,.18,'warmWhite','Paredes externas');
wallY('Muro do pátio a céu aberto',.15,C.z1,C.z2,0,2.70,.18,'warmWhite','Paredes do pátio');
wallY('Lateral oeste - cozinha e garagem',.15,C.z2,19.75,0,2.85,.18,'warmWhite','Paredes externas');
wallY('Lateral leste - escritório',9.85,.15,L.z1,0,2.85,.18,'warmWhite','Paredes externas');
wallY('Jardim de inverno - parede de pedra',9.85,L.z1,L.z2,0,2.85,.18,'stone','Paredes externas');
wallY('Lateral leste - hóspedes e lavabo',9.85,L.z2,12.85,0,2.85,.18,'warmWhite','Paredes externas');
wallY('Lateral leste - sala alta',9.75,12.85,19.75,0,4.65,.18,'warmWhite','Paredes externas');
// Suite faces the pool; the sliding opening and small bathroom window match photos 13/38.
wallX('Pátio - parede banho canto',.15,.76,C.z1,0,2.85,.16,'warmWhite','Paredes do pátio');
wallX('Pátio - parede banho e suíte',1.34,3.65,C.z1,0,2.85,.16,'warmWhite','Paredes do pátio');
wallX('Pátio - sob janela do banho',.76,1.34,C.z1,0,1.72,.16,'warmWhite','Paredes do pátio');
wallX('Pátio - sobre janela do banho',.76,1.34,C.z1,2.20,.65,.16,'warmWhite','Paredes do pátio');
wallX('Pátio - parede suíte direita',5.05,5.55,C.z1,0,2.85,.16,'warmWhite','Paredes do pátio');
wallX('Pátio - verga da suíte',3.65,5.05,C.z1,2.28,.57,.16,'warmWhite','Paredes do pátio');
box('Porta de correr da suíte para o pátio',4.35,C.z1,.1+2.15/2,1.4,.045,2.15,'glass','Esquadrias');
// Small opening in the bathroom wall.

// Window sits in a recessed panel; its opaque backing is omitted below in rendering.
box('Janela basculante do banho - pátio',1.05,C.z1+.095,1.96,.58,.025,.48,'glass','Esquadrias');
// Comment 4: the circulation/pool boundary is solid white plaster.
wallY('Circulação - parede branca para o pátio',5.63,C.z1,C.z2,0,2.85,.16,'warmWhite','Paredes do pátio');
// Kitchen facade has an actual 4.05m opening, with no solid wall behind the glass.
wallX('Pátio cozinha - montante oeste',.15,.32,C.z2,0,2.85,.16,'warmWhite','Paredes do pátio');
wallX('Pátio cozinha - entre porta e vidro',1.03,1.30,C.z2,0,2.85,.16,'warmWhite','Paredes do pátio');
wallX('Pátio cozinha - montante leste',5.35,5.63,C.z2,0,2.85,.16,'warmWhite','Paredes do pátio');
wallX('Pátio cozinha - verga contínua',.15,5.63,C.z2,2.35,.50,.16,'warmWhite','Paredes do pátio');
box('Esquadria de correr cozinha - pátio',3.325,C.z2,1.20,4.05,.045,2.30,'glass','Esquadrias');
box('Porta de alumínio preta - serviço do pátio',.675,C.z2,1.14,.71,.05,2.18,'black','Esquadrias');
// Suite, dressing room and bath at the back of the floor plan.
wallY('Suíte - divisória closet',3.46,.15,2.05,0,2.75,.12);
wallY('Suíte - divisória closet retorno',3.46,2.75,3.55,0,2.75,.12);
wallY('Suíte - parede da circulação',6.78,.15,2.65,0,2.75,.12);
wallX('Suíte - acesso à circulação',5.55,5.88,3.55,0,2.75,.12);
wallY('Banho suíte - separação closet',2.25,1.65,3.55,0,2.65,.12);
wallX('Banho suíte - parede norte',.15,2.25,1.65,0,2.65,.12);
// Enlarged office: 2.92m clear width and up to 2.95m clear depth, per the sketch.
wallY('Escritório - parede de acesso',6.78,2.65,3.30,0,2.75,.12);
wallX('Lavabo escritório - canto esquerdo da porta',6.78,6.94,1.48,0,2.75,.12);
wallX('Lavabo escritório - parede junto à estante',7.74,9.85,1.48,0,2.75,.12);
wallX('Lavabo escritório - verga da porta oculta',6.94,7.74,1.48,2.60,.15,.12);
rect('Lavabo escritório - piso cerâmico',6.84,9.76,.24,1.42,.061,.018,'tile','Lavabo do escritório');
wallY('Escritório - continuação junto ao jardim',6.78,4.10,L.z1,0,2.75,.12);
// One guest bedroom beyond the full-width winter garden. The former intermediate
// room is removed completely; it is exterior garden, not an extra bedroom.
wallY('Quarto hóspedes - acesso norte',G.x1,G.z1,8.30,0,2.75,.12);
wallY('Quarto hóspedes - acesso sul',G.x1,9.12,G.z2,0,2.75,.12);
wallY('Hóspedes - parede contínua junto à circulação',G.x1,G.z2,12.25,0,2.75,.12);
wallX('Lavabo hóspedes - ombreira esquerda',G.x1,B.door.x1,B.z1,0,2.75,.12);
wallX('Lavabo hóspedes - parede junto à porta',B.door.x2,G.x2,B.z1,0,2.75,.12);
wallX('Lavabo hóspedes - verga da porta',B.door.x1,B.door.x2,B.z1,B.door.height,2.75-B.door.height,.12);
wallX('Lavabo hóspedes - parede sul',B.x1,B.x2,B.z2,0,2.75,.12);
wallY('Lavabo hóspedes - fechamento para circulação',B.x1,B.z1,B.z2,0,2.75,.12);
// Sky-open winter garden between the posterior office and guest room.
const windowCenter=(L.x1+L.x2)/2,windowWidth=1.70,windowLeft=windowCenter-windowWidth/2,windowRight=windowCenter+windowWidth/2;
for(const [side,y,sill,top,label] of [['norte',L.z1,1.10,2.20,'escritório'],['hóspedes',L.z2,1.35,2.20,'hóspedes']]){
  wallX('Jardim de inverno - peitoril '+side,L.x1,L.x2,y,0,sill,.14,'warmWhite','Paredes jardim de inverno');
  objects.at(-1).keepFullHeight=true;
  wallX('Jardim de inverno - verga '+side,L.x1,L.x2,y,top,2.85-top,.14,'warmWhite','Paredes jardim de inverno');
  wallX('Jardim de inverno - canto '+side+' esquerdo',L.x1,windowLeft,y,sill,top-sill,.14,'warmWhite','Paredes jardim de inverno');
  wallX('Jardim de inverno - canto '+side+' direito',windowRight,L.x2,y,sill,top-sill,.14,'warmWhite','Paredes jardim de inverno');
  box(label==='escritório'?'Janela do escritório para jardim de inverno':'Janela dos hóspedes para jardim de inverno',windowCenter,y,(sill+top)/2,windowWidth,.035,top-sill,'glass','Esquadrias');
  box('Montante central - janela do jardim',windowCenter,y,(sill+top)/2,.025,.065,top-sill,'black','Esquadrias');
}
box('Porta de vidro de correr - jardim de inverno',L.x1,(L.z1+L.z2)/2,1.225,.035,L.z2-L.z1-.16,2.35,'glass','Esquadrias');
wallY('Jardim de inverno - verga da porta',L.x1,L.z1,L.z2,2.4,.45,.14,'warmWhite','Paredes jardim de inverno');
// Kitchen joinery aligned with the long left counter and measured central island.
wallY('Cozinha - parede da bancada',1.90,10.0,14.90,0,2.80,.12);
box('Bancada cozinha - fundo da caixa em madeira',1.985,12.42,.49,.035,4.68,.78,'cabinet','Cozinha planejada');
for(const y of [10.08,14.76])box('Bancada cozinha - lateral da caixa',2.26,y,.49,.57,.025,.78,'cabinet','Cozinha planejada');
box('Rodapé recuado bancada',2.23,12.42,.12,.48,4.60,.18,'dark','Cozinha planejada');
ring('Tampo cozinha com recorte real da cuba',1.97,2.60,10.04,14.80,{x1:2.04,x2:2.46,z1:11.91,z2:12.67},.94,.08,'counter','Cozinha planejada');
box('Armários superiores claros',2.11,12.42,2.28,.28,4.68,.72,'cabinetLight','Cozinha planejada');
box('Faixa de backsplash cerâmico',1.975,12.42,1.275,.025,4.60,.58,'bath','Cozinha planejada');
rect('Ilha central - marcenaria',I.cabinetX1,I.cabinetX2,I.z1+.07,I.z2-.07,.48,.88,'cabinet','Cozinha planejada');
box('Tampo da ilha - pedra clara 1,40 x 2,50 m',4.45,11.85,.96,1.40,2.50,.08,'counter','Cozinha planejada');
box('Bancada em L - retorno',5.32,14.55,.48,1.62,.62,.84,'cabinet','Cozinha planejada');
box('Tampo do retorno em L',5.32,14.55,.94,1.68,.70,.08,'counter','Cozinha planejada');
box('Torre de fornos',2.96,14.53,1.42,.66,.62,2.65,'cabinetLight','Cozinha planejada');

box('Bancada banho suíte',1.7,3.15,.48,.8,.48,.9,'bath','Louças e metais');
box('Box banho suíte',.70,2.15,.95,.85,.8,1.9,'glass','Louças e metais');

// Comment 1: the dining library is on the rear wall, perpendicular to the sofa.
wallX('Sala jantar - parede de fundo da estante',7.20,9.85,12.75,0,4.55,.14,'warmWhite','Paredes internas');
objects.at(-1).keepFullHeight=true;
// Comment 5: timber deck beside the pool, beneath the suite opening.
const deck={x1:P.x2+.15,x2:C.x2-.08,z1:C.z1+.11,z2:P.z2+.07};
const boardCount=Math.ceil((deck.z2-deck.z1)/.125),pitch=(deck.z2-deck.z1)/boardCount;
for(let i=0;i<boardCount;i++)rect('Deck madeira - régua '+(i+1),deck.x1,deck.x2,deck.z1+i*pitch+.002,deck.z1+(i+1)*pitch-.002,.072,.034,'deckWood','Pátio e piscina');
// Facade proportions reconstructed from the supplied photographs. Heights and
// front garden projection are visual estimates, not surveyed dimensions.
const facade='Fachada';
box('Pórtico alto - viga branca',8.02,19.87,4.80,3.90,.92,.62,'white',facade);
box('Pórtico alto - ombreira direita',9.76,19.73,2.33,.44,.92,4.66,'white',facade);
box('Pórtico alto - retorno esquerdo',6.18,19.73,3.90,.22,.85,1.60,'white',facade);
box('Sala alta - fechamento superior do vidro',8.00,19.49,4.35,3.30,.18,.40,'warmWhite',facade);
box('Pedra natural - lateral esquerda',6.87,19.91,2.23,.25,.16,3.90,'facadeStone',facade);
box('Pedra natural - lateral direita',9.43,19.91,2.23,.20,.16,3.90,'facadeStone',facade);
box('Pedra natural - cabeçalho',8.14,19.91,4.04,2.76,.16,.28,'facadeStone',facade);
box('Pedra natural - embasamento',8.14,19.94,.23,2.92,.20,.36,'facadeStone',facade);
box('Vidro alto frontal',8.145,19.86,2.22,2.30,.035,3.50,'glass',facade);
box('Entrada - fundo escuro do ripado',6.12,19.62,1.43,1.18,.18,2.74,'dark',facade);
box('Garagem - parede posterior',3.08,15.20,1.43,5.90,.16,2.86,'warmWhite',facade);
box('Porta de serviço em madeira',3.68,15.31,1.13,.83,.055,2.15,'wood',facade);
box('Pilar frontal esquerdo',.20,19.74,1.44,.24,.36,2.88,'white',facade);
box('Parede de retorno junto à entrada',6.36,17.40,1.42,.12,4.30,2.84,'warmWhite',facade);
// Three roof wings leave the courtyard completely open, including in walk mode.
rect('Cobertura da ala posterior',.15,9.85,.15,C.z1,2.99,.18,'roof','Cobertura');
rect('Cobertura da cozinha',.15,6.45,C.z2,15.10,2.99,.18,'roof','Cobertura');
rect('Cobertura da circulação',5.70,6.80,C.z1,C.z2,2.99,.18,'roof','Cobertura');
rect('Cobertura ala leste - fundos',6.65,9.85,C.z1,L.z1,2.99,.18,'roof','Cobertura');
if(L.x2<9.85)rect('Cobertura ala leste - junto ao jardim',L.x2,9.85,L.z1,L.z2,2.99,.18,'roof','Cobertura');
rect('Cobertura ala leste - quartos',6.65,9.85,L.z2,12.85,2.99,.18,'roof','Cobertura');
box('Pátio - testeira da ala posterior',2.85,C.z1+.09,3.02,5.40,.35,.46,'white','Cobertura');
box('Pátio - testeira da cozinha',2.85,C.z2-.09,3.02,5.40,.35,.46,'white','Cobertura');
box('Platibanda lateral da ala principal',9.85,7.7,3.12,.16,14.25,.30,'white','Cobertura');
box('Platibanda posterior da ala principal',5,.15,3.12,9.85,.16,.30,'white','Cobertura');
box('Garagem - cobertura principal',4.02,17.57,3.02,5.30,5.10,.18,'white','Cobertura');
box('Garagem - testeira contínua',3.33,20.07,3.05,6.72,.20,.46,'white','Cobertura');
box('Garagem - testeira lateral',6.58,17.57,3.05,.18,5.10,.46,'white','Cobertura');
box('Garagem - forro rebaixado',4.00,17.57,2.897,5.12,4.88,.065,'warmWhite','Cobertura');
box('Garagem - viga junto ao muro',.17,17.57,3.05,.18,5.10,.46,'white','Cobertura');
for(let i=0;i<9;i++)box(`Pergolado - travessa ${i+1}`,.79,15.35+i*.55,2.91,1.22,.10,.19,'white','Cobertura');
box('Sala alta - fechamento lateral sobre a garagem',6.30,16.35,3.76,.16,6.80,1.80,'white',facade);
box('Cobertura da sala alta',8.02,16.32,4.72,3.64,7.08,.18,'roof','Cobertura');
box('Platibanda lateral alta',9.76,16.30,4.90,.16,7.24,.40,'white','Cobertura');
box('Platibanda posterior alta',8.02,12.75,4.90,3.64,.16,.40,'white','Cobertura');
box('Soleira da entrada',6.12,19.88,.09,1.25,.52,.065,'counter',facade);
// Fixed living-room joinery observed in the house photos. Loose furniture is
// intentionally left for the user's later decorating sessions.
box('Painel de TV em madeira',6.52,17.4,1.93,.10,2.85,2.70,'wood','Marcenaria fixa');
box('Rack suspenso - módulo fechado',6.75,17.00,.34,.48,1.65,.42,'cabinetLight','Marcenaria fixa');
box('Nicho do rack - fundo',6.535,18.235,.34,.035,.78,.42,'wood','Marcenaria fixa');
for(const h of [.15,.53])box('Nicho do rack - prateleira',6.75,18.235,h,.48,.78,.04,'wood','Marcenaria fixa');
for(const y of [17.865,18.605])box('Nicho do rack - lateral',6.75,y,.34,.48,.04,.34,'wood','Marcenaria fixa');
box('Luz indireta do painel',6.58,17.4,.58,.03,2.12,.035,'light','Iluminação');


// Explicit gypsum ceilings follow the roof wings and retain the pool/garden voids.
for(const roof of [...objects].filter(o=>o.name.startsWith('Cobertura da')||o.name.startsWith('Cobertura ala'))){
  box('Forro de gesso - '+roof.name,roof.x,roof.y,roof.z-roof.sz/2-.07,roof.sx-.04,roof.sy-.04,.06,'white','Forros internos');
}
// Flatten model data for the interactive viewer and exchange formats.
fs.writeFileSync(new URL('./casa-modelo.json', import.meta.url), JSON.stringify({units:'m', modelVersion:8, designVersion:3, layout, dimensions:{width:10,depth:20}, referenceNotes:'Revisão pelas anotações: escritório posterior, jardim de inverno ocupando toda a faixa intermediária, hóspedes no antigo quarto adicional e lavabo acessível exclusivamente por hóspedes. Janelas opostas centralizadas no jardim; cama de costas para o jardim. Ilha com vão para três banquetas. Pátio 5,40 x 5,72 m e piscina 2,80 x 3,00 m cotados. Jardim, alturas e marcenaria sem levantamento executivo permanecem estimados. Ver LEVANTAMENTO.md.', objects, materials:M}, null, 2));

// Export a standard Collada file (meters, Z-up) for SketchUp Web subscribers and other 3D tools.
const esc = s => s.replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;');
const hex = color => color.match(/[0-9a-f]{2}/gi).map(v => (parseInt(v,16)/255).toFixed(4)).join(' ');
const matIds = [...new Set(objects.map(o=>o.material))];
const effects = matIds.map(id=>`<effect id="${id}-fx"><profile_COMMON><technique sid="common"><lambert><diffuse><color>${hex(M[id])}</color></diffuse></lambert></technique></profile_COMMON></effect>`).join('');
const materials = matIds.map(id=>`<material id="${id}-mat" name="${id}"><instance_effect url="#${id}-fx"/></material>`).join('');
const geoms = objects.map((o,i)=>{
  const x=o.sx/2,y=o.sy/2,z=o.sz/2;
  const v=[[-x,-y,-z],[x,-y,-z],[x,y,-z],[-x,y,-z],[-x,-y,z],[x,-y,z],[x,y,z],[-x,y,z]].flat().map(n=>n.toFixed(4)).join(' ');
  const tris='0 2 1 0 3 2 4 5 6 4 6 7 0 1 5 0 5 4 1 2 6 1 6 5 2 3 7 2 7 6 3 0 4 3 4 7';
  return `<geometry id="g${i}" name="${esc(o.name)}"><mesh><source id="p${i}"><float_array id="pa${i}" count="24">${v}</float_array><technique_common><accessor source="#pa${i}" count="8" stride="3"><param name="X" type="float"/><param name="Y" type="float"/><param name="Z" type="float"/></accessor></technique_common></source><vertices id="v${i}"><input semantic="POSITION" source="#p${i}"/></vertices><triangles material="${o.material}-mat" count="12"><input semantic="VERTEX" source="#v${i}" offset="0"/><p>${tris}</p></triangles></mesh></geometry>`;
}).join('');
const nodes = objects.map((o,i)=>`<node id="n${i}" name="${esc(o.name)}"><translate>${o.x} ${o.y} ${o.z}</translate><instance_geometry url="#g${i}"><bind_material><technique_common><instance_material symbol="${o.material}-mat" target="#${o.material}-mat"/></technique_common></bind_material></instance_geometry></node>`).join('');
const dae=`<?xml version="1.0" encoding="utf-8"?><COLLADA xmlns="http://www.collada.org/2005/11/COLLADASchema" version="1.4.1"><asset><contributor><authoring_tool>Home 3D blockout</authoring_tool></contributor><unit name="meter" meter="1"/><up_axis>Z_UP</up_axis></asset><library_effects>${effects}</library_effects><library_materials>${materials}</library_materials><library_geometries>${geoms}</library_geometries><library_visual_scenes><visual_scene id="Scene" name="Casa"><node id="Casa" name="Casa">${nodes}</node></visual_scene></library_visual_scenes><scene><instance_visual_scene url="#Scene"/></scene></COLLADA>`;
fs.writeFileSync(new URL('./Casa-Indaiatuba.dae', import.meta.url), dae);
fs.copyFileSync(new URL('./casa-modelo.json', import.meta.url), new URL('./public/casa-modelo.json', import.meta.url));
console.log(`Modelo gerado: ${objects.length} objetos, ${matIds.length} materiais`);
