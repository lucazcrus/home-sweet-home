import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

/** Local front is -Z, so the upholstered back stays outside the island overhang. */
export function createBarStool(oak:THREE.Material){
  const root=new THREE.Group();root.name='Banqueta de madeira e estofado verde musgo';
  const moss=new THREE.MeshStandardMaterial({color:'#4e5d3d',roughness:.91});
  const add=(name:string,g:THREE.BufferGeometry,m:THREE.Material,x:number,y:number,z:number)=>{const mesh=new THREE.Mesh(g,m);mesh.name=name;mesh.position.set(x,y,z);mesh.castShadow=mesh.receiveShadow=true;root.add(mesh);return mesh;};
  const box=(name:string,x:number,y:number,z:number,w:number,h:number,d:number,m:THREE.Material,r=.02)=>add(name,new RoundedBoxGeometry(w,h,d,2,Math.min(r,w/4,h/4,d/4)),m,x,y,z);
  const rail=(name:string,a:THREE.Vector3,b:THREE.Vector3,r=.015)=>{const delta=b.clone().sub(a),mid=a.clone().add(b).multiplyScalar(.5),mesh=add(name,new THREE.CylinderGeometry(r,r*1.08,delta.length(),12),oak,mid.x,mid.y,mid.z);mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());};
  for(const x of [-1,1])for(const z of [-1,1])rail('Pé de madeira inclinado',new THREE.Vector3(x*.205,0,z*.205),new THREE.Vector3(x*.17,.62,z*.17),.022);
  for(const side of [-1,1]){
    rail('Travessa para apoio dos pés',new THREE.Vector3(-.19,.24,side*.19),new THREE.Vector3(.19,.24,side*.19));
    rail('Travessa lateral da banqueta',new THREE.Vector3(side*.19,.24,-.19),new THREE.Vector3(side*.19,.24,.19));
    rail('Montante do encosto em madeira',new THREE.Vector3(side*.17,.57,.18),new THREE.Vector3(side*.18,.95,.235),.018);
  }
  box('Estrutura do assento em carvalho',0,.625,0,.44,.055,.44,oak,.03);
  box('Assento estofado verde musgo',0,.675,-.005,.43,.075,.425,moss,.045);
  const back=box('Encosto estofado verde musgo',0,.88,.225,.42,.24,.065,moss,.035);back.rotation.x=-.12;
  box('Travessa superior do encosto',0,1.015,.242,.45,.028,.038,oak,.014);
  return root;
}
