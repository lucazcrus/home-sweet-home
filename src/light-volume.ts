import * as THREE from 'three';
import architecture from './architecture.json' with {type:'json'};

type Bounds={x1:number;x2:number;y1:number;y2:number;z1:number;z2:number};
const boundsFor=(light:THREE.PointLight|THREE.SpotLight):Bounds=>{
  if(light.userData.bakeBounds)return light.userData.bakeBounds as Bounds;
  let parent:THREE.Object3D|null=light.parent;
  while(parent){
    if(parent.name.startsWith('Pátio interno')){const c=architecture.courtyard;return {x1:c.x1-.12,x2:c.x2+.12,y1:-1.3,y2:3.4,z1:c.z1-.12,z2:c.z2+.12};}
    if(parent.name==='Detalhes da fachada por referência')return {x1:-.1,x2:6.85,y1:-.1,y2:3.5,z1:15.08,z2:25.5};
    parent=parent.parent;
  }
  const p=light.position;
  return p.z>15?{x1:6.3,x2:9.95,y1:0,y2:4.65,z1:12.70,z2:20.1}:{x1:1.8,x2:6.65,y1:0,y2:2.95,z1:9.15,z2:15.20};
};

/** Precomputed diffuse irradiance of fixed warm fixtures, evaluated by world position.
 * Axis-aligned architectural faces retain the analytic cosine falloff. Movable
 * furniture samples the field at its new position without rebaking the house.
 */
export function createLocalLightVolume(lights:THREE.Light[]){
  const min=new THREE.Vector3(0,-1.3,0),size=new THREE.Vector3(10,6.6,25.5);
  const nx=57,ny=39,nz=143,count=nx*ny*nz;
  const positive=new Float32Array(count*4),negative=new Float32Array(count*4);
  const step=new THREE.Vector3(size.x/(nx-1),size.y/(ny-1),size.z/(nz-1));
  const baked=new Set<THREE.Light>(),warmColor=new THREE.Color('#ffdfac');
  for(const candidate of lights){
    if(!(candidate instanceof THREE.PointLight||candidate instanceof THREE.SpotLight)||candidate.castShadow||candidate.position.y<0)continue;
    const light=candidate,intensity=light.userData.cycle?.night||0;if(!intensity)continue;
    baked.add(light);
    const radius=light.distance||5,bounds=boundsFor(light),position=light.getWorldPosition(new THREE.Vector3());
    const direction=light instanceof THREE.SpotLight?light.target.getWorldPosition(new THREE.Vector3()).sub(position).normalize():null;
    const outer=light instanceof THREE.SpotLight?Math.cos(light.angle):0,inner=light instanceof THREE.SpotLight?Math.cos(light.angle*(1-light.penumbra)):1;
    const begin=(value:number,origin:number,spacing:number)=>Math.max(0,Math.floor((value-radius-origin)/spacing));
    const end=(value:number,origin:number,spacing:number,max:number)=>Math.min(max-1,Math.ceil((value+radius-origin)/spacing));
    const ix1=begin(position.x,min.x,step.x),ix2=end(position.x,min.x,step.x,nx),iy1=begin(position.y,min.y,step.y),iy2=end(position.y,min.y,step.y,ny),iz1=begin(position.z,min.z,step.z),iz2=end(position.z,min.z,step.z,nz);
    const relativeColor=(light.color.r/warmColor.r+light.color.g/warmColor.g+light.color.b/warmColor.b)/3;
    for(let z=iz1;z<=iz2;z++)for(let y=iy1;y<=iy2;y++)for(let x=ix1;x<=ix2;x++){
      const wx=min.x+x*step.x,wy=min.y+y*step.y,wz=min.z+z*step.z;
      if(wx<bounds.x1||wx>bounds.x2||wy<bounds.y1||wy>bounds.y2||wz<bounds.z1||wz>bounds.z2)continue;
      let dx=position.x-wx,dy=position.y-wy,dz=position.z-wz;const distance=Math.hypot(dx,dy,dz);if(distance>=radius)continue;
      const inverse=1/Math.max(distance,.05);dx*=inverse;dy*=inverse;dz*=inverse;
      let cone=1;
      if(direction){const angle=-(dx*direction.x+dy*direction.y+dz*direction.z);const t=THREE.MathUtils.clamp((angle-outer)/Math.max(inner-outer,.00001),0,1);cone=t*t*(3-2*t);if(cone===0)continue;}
      const cutoff=Math.max(0,1-Math.pow(distance/radius,4));
      const energy=Math.min(50,intensity*relativeColor*cone*cutoff*cutoff/Math.max(Math.pow(distance,light.decay),.01));
      const i=((z*ny+y)*nx+x)*4;
      positive[i]+=energy*Math.max(dx,0);positive[i+1]+=energy*Math.max(dy,0);positive[i+2]+=energy*Math.max(dz,0);
      negative[i]+=energy*Math.max(-dx,0);negative[i+1]+=energy*Math.max(-dy,0);negative[i+2]+=energy*Math.max(-dz,0);
    }
  }
  const texture=(values:Float32Array)=>{
    const half=new Uint16Array(values.length);for(let i=0;i<values.length;i++)half[i]=THREE.DataUtils.toHalfFloat(values[i]);
    const map=new THREE.Data3DTexture(half,nx,ny,nz);map.type=THREE.HalfFloatType;map.format=THREE.RGBAFormat;map.minFilter=map.magFilter=THREE.LinearFilter;map.unpackAlignment=1;map.needsUpdate=true;return map;
  };
  const positiveMap=texture(positive),negativeMap=texture(negative);
  const uniforms={houseLightPositive:{value:positiveMap},houseLightNegative:{value:negativeMap},houseLightMin:{value:min},houseLightScale:{value:new THREE.Vector3((nx-1)/nx/size.x,(ny-1)/ny/size.y,(nz-1)/nz/size.z)},houseLightOffset:{value:new THREE.Vector3(.5/nx,.5/ny,.5/nz)},houseLightColor:{value:warmColor},houseLightMix:{value:0}};
  const installed=new WeakSet<THREE.Material>();
  return {baked,uniforms,install(root:THREE.Object3D){
    root.traverse(object=>{
      if(!(object instanceof THREE.Mesh))return;
      for(const material of Array.isArray(object.material)?object.material:[object.material]){
        if(!(material instanceof THREE.MeshStandardMaterial)||installed.has(material))continue;installed.add(material);
        material.onBeforeCompile=shader=>{
          Object.assign(shader.uniforms,uniforms);
          shader.vertexShader='varying vec3 vHouseLightPosition;\n'+shader.vertexShader;
          shader.vertexShader=shader.vertexShader.replace('#include <worldpos_vertex>',`#include <worldpos_vertex>
            vec4 housePosition=vec4(transformed,1.0);
            #ifdef USE_INSTANCING
              housePosition=instanceMatrix*housePosition;
            #endif
            vHouseLightPosition=(modelMatrix*housePosition).xyz;`);
          shader.fragmentShader=`varying vec3 vHouseLightPosition;
            uniform highp sampler3D houseLightPositive;
            uniform highp sampler3D houseLightNegative;
            uniform vec3 houseLightMin,houseLightScale,houseLightOffset,houseLightColor;
            uniform float houseLightMix;
          `+shader.fragmentShader;
          shader.fragmentShader=shader.fragmentShader.replace('#include <lights_fragment_end>',`#include <lights_fragment_end>
            if(houseLightMix>0.001){
              vec3 lightUV=(vHouseLightPosition-houseLightMin)*houseLightScale+houseLightOffset;
              if(all(greaterThanEqual(lightUV,vec3(0.0)))&&all(lessThanEqual(lightUV,vec3(1.0)))){
                vec3 worldNormal=normalize(inverseTransformDirection(normal,viewMatrix));
                vec3 positiveIrradiance=texture(houseLightPositive,lightUV).rgb;
                vec3 negativeIrradiance=texture(houseLightNegative,lightUV).rgb;
                vec3 axisIrradiance=mix(negativeIrradiance,positiveIrradiance,step(vec3(0.0),worldNormal));
                float localIrradiance=dot(worldNormal*worldNormal,axisIrradiance);
                reflectedLight.indirectDiffuse+=diffuseColor.rgb*(1.0-metalnessFactor)*houseLightColor*(localIrradiance*houseLightMix*0.31830988618);
              }
            }`);
        };
        material.customProgramCacheKey=()=> 'house-local-irradiance-v1';material.needsUpdate=true;
      }
    });
  },setNightAmount(value:number){uniforms.houseLightMix.value=value;},dispose(){positiveMap.dispose();negativeMap.dispose();}};
}
