import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

function textureKey(texture:THREE.Texture|null){
  return texture?[texture.source.uuid,texture.wrapS,texture.wrapT,...texture.repeat.toArray(),...texture.offset.toArray(),texture.colorSpace].join(':'):'';
}
function materialKey(m:THREE.MeshStandardMaterial){
  return [m.type,m.roughness,m.metalness,m.side,m.flatShading,m.depthWrite,m.depthTest,m.alphaTest,m.emissive.getHex(),m.emissiveIntensity,m.userData.dayNightEmission,textureKey(m.map),textureKey(m.bumpMap),m.bumpScale,textureKey(m.normalMap),m.normalScale.toArray().join(),textureKey(m.roughnessMap),textureKey(m.metalnessMap),m.envMapIntensity].join('|');
}

/** Bake only static geometry transforms and colors. Preserve triangles, UVs and normals. */
export function batchStaticMeshes(root:THREE.Object3D){
  root.updateMatrixWorld(true);
  const inverse=new THREE.Matrix4().copy(root.matrixWorld).invert();
  const buckets=new Map<string,{meshes:THREE.Mesh[];material:THREE.MeshStandardMaterial}>();
  root.traverse(object=>{
    if(!(object instanceof THREE.Mesh)||object instanceof THREE.InstancedMesh||object instanceof THREE.SkinnedMesh||Array.isArray(object.material)||!(object.material instanceof THREE.MeshStandardMaterial)||object.material.transparent||object.userData.dynamic)return;
    let ancestor=object.parent;while(ancestor&&ancestor!==root){if(ancestor.userData.batchBoundary)return;ancestor=ancestor.parent;}
    const material=object.material;
    const key=materialKey(material)+`|${object.castShadow}|${object.receiveShadow}|${object.renderOrder}`;
    const bucket=buckets.get(key)||{meshes:[],material};bucket.meshes.push(object);buckets.set(key,bucket);
  });
  let before=0,after=0;
  const oldGeometries=new Set<THREE.BufferGeometry>();
  for(const {meshes,material} of buckets.values()){
    before+=meshes.length;
    if(meshes.length<2){after+=meshes.length;continue;}
    const geometries:THREE.BufferGeometry[]=[];
    for(const mesh of meshes){
      const geometry=mesh.geometry.index?mesh.geometry.toNonIndexed():mesh.geometry.clone();
      geometry.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inverse,mesh.matrixWorld));
      for(const name of Object.keys(geometry.attributes))if(!['position','normal','uv','color'].includes(name))geometry.deleteAttribute(name);
      if(!geometry.hasAttribute('normal'))geometry.computeVertexNormals();
      const count=geometry.getAttribute('position').count;
      if(!geometry.hasAttribute('uv'))geometry.setAttribute('uv',new THREE.Float32BufferAttribute(new Float32Array(count*2),2));
      const existing=geometry.getAttribute('color'),colors=new Float32Array(count*3);
      for(let i=0;i<count;i++){colors[i*3]=(mesh.material as THREE.MeshStandardMaterial).color.r;colors[i*3+1]=(mesh.material as THREE.MeshStandardMaterial).color.g;colors[i*3+2]=(mesh.material as THREE.MeshStandardMaterial).color.b;if(existing){colors[i*3]*=existing.getX(i);colors[i*3+1]*=existing.getY(i);colors[i*3+2]*=existing.getZ(i);}}
      geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geometry.clearGroups();geometries.push(geometry);
    }
    const merged=mergeGeometries(geometries,false);
    geometries.forEach(geometry=>geometry.dispose());
    if(!merged)throw new Error('Could not batch static geometry');
    const batchedMaterial=material.clone();batchedMaterial.color.set('#ffffff');batchedMaterial.vertexColors=true;
    const mesh=new THREE.Mesh(merged,batchedMaterial);mesh.name=`Geometria agrupada · ${meshes.length} peças`;mesh.castShadow=meshes[0].castShadow;mesh.receiveShadow=meshes[0].receiveShadow;mesh.renderOrder=meshes[0].renderOrder;
    merged.computeBoundingBox();merged.computeBoundingSphere();root.add(mesh);after++;
    for(const original of meshes){oldGeometries.add(original.geometry);original.removeFromParent();}
  }
  // Every caller batches a complete ownership group; no geometry is shared across groups.
  const retained=new Set<THREE.BufferGeometry>();root.traverse(object=>{if(object instanceof THREE.Mesh)retained.add(object.geometry);});
  oldGeometries.forEach(geometry=>{if(!retained.has(geometry))geometry.dispose();});
  return {before,after};
}

/** Dispose shared resources once, after the entire viewer is done with them. */
export function disposeSceneResources(root:THREE.Object3D){
  const geometries=new Set<THREE.BufferGeometry>(),materials=new Set<THREE.Material>(),textures=new Set<THREE.Texture>();
  root.traverse(object=>{
    if(!(object instanceof THREE.Mesh))return;
    geometries.add(object.geometry);
    for(const material of Array.isArray(object.material)?object.material:[object.material]){
      materials.add(material);
      for(const value of Object.values(material))if(value instanceof THREE.Texture)textures.add(value);
    }
  });
  geometries.forEach(item=>item.dispose());materials.forEach(item=>item.dispose());textures.forEach(item=>item.dispose());
}
