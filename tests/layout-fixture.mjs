import * as THREE from 'three';
import {build} from 'esbuild';
import {mkdtemp,writeFile,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';

let pending;
export async function layoutFixture(t){
  if(!pending)pending=(async()=>{
    const root=fileURLToPath(new URL('..',import.meta.url));
    const result=await build({stdin:{contents:"export {createFurniture,furnish} from './src/scene-assets.ts'; export {addReferenceScenes} from './src/reference-scenes.ts';",resolveDir:root},bundle:true,write:false,platform:'node',format:'esm',plugins:[{name:'three-esm',setup(builder){builder.onResolve({filter:/^three(?:\/|$)/},args=>({path:new URL(args.path==='three'?'../node_modules/three/build/three.module.js':`../node_modules/${args.path}`,import.meta.url).href,external:true}));}}]});
    const directory=await mkdtemp(join(tmpdir(),'home-layout-'));t.after(()=>rm(directory,{force:true,recursive:true}));const path=join(directory,'layout.mjs');await writeFile(path,result.outputFiles[0].text);const api=await import(pathToFileURL(path).href);
    const previous=globalThis.document;t.after(()=>{globalThis.document=previous;});globalThis.document={createElement(){return {width:128,height:192,getContext(){return {fillRect(){},clearRect(){},fillText(){},beginPath(){},ellipse(){},fill(){},arc(){}};}};}};
    const m=new Proxy({},{get(object,key){return object[key]??=new THREE.MeshStandardMaterial();}}),scene=new THREE.Scene();
    const refs=api.addReferenceScenes(scene,m),model=JSON.parse(await readFile(new URL('../casa-modelo.json',import.meta.url),'utf8')),furniture=api.furnish([],0),meshes=new Map(furniture.map(o=>[o.id,api.createFurniture(o,m)]));
    for(const mesh of meshes.values())scene.add(mesh);scene.updateMatrixWorld(true);
    return {...api,model,refs,furniture,meshes,scene};
  })();return pending;
}
export function parts(root){const result=[];root.traverse(o=>{if(o instanceof THREE.Mesh)result.push({name:o.name||'peça',box:new THREE.Box3().setFromObject(o)});});return result;}
export function overlaps(a,b,tolerance=.002){return ['x','y','z'].every(axis=>Math.min(a.max[axis],b.max[axis])-Math.max(a.min[axis],b.min[axis])>tolerance);}
export function sourceBox(o){return new THREE.Box3(new THREE.Vector3(o.x-o.sx/2,o.z-o.sz/2,o.y-o.sy/2),new THREE.Vector3(o.x+o.sx/2,o.z+o.sz/2,o.y+o.sy/2));}
