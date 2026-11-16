import * as THREE from 'three';

/** Each fixture keeps its own physical range and day/night light output. */
export function cycleLight<T extends THREE.Light>(light:T,day:number,night:number):T {
  light.userData.cycle={day,night};
  light.intensity=day;
  return light;
}

export type DayNightController=ReturnType<typeof createDayNightController>;
export function createDayNightController(scene:THREE.Scene,renderer:THREE.WebGLRenderer,day:THREE.Texture,night:THREE.Texture,initialNight:boolean,exterior:boolean){
  const owned:THREE.Object3D[]=[];
  const sun=cycleLight(new THREE.DirectionalLight('#ffe9cf',2.8),2.8,0);
  sun.name='Sol — luz natural pelo pátio';sun.position.set(-5,17,3);sun.target.position.set(4,0,8);
  sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-17,right:17,top:17,bottom:-17,near:.5,far:55});sun.shadow.normalBias=.018;sun.shadow.bias=-.00015;sun.shadow.radius=3;
  const moon=cycleLight(new THREE.DirectionalLight('#96b9ed',0),0,.22);moon.name='Luar';moon.position.set(12,20,-8);moon.target.position.set(4,0,8);
  const sky=cycleLight(new THREE.HemisphereLight('#d6e9ff','#736d59',.65),.65,.13);
  scene.add(sun,sun.target,moon,moon.target,sky);owned.push(sun,sun.target,moon,moon.target,sky);
  const lights:THREE.Light[]=[];const emitting=new Set<THREE.MeshStandardMaterial>();const glazing=new Set<THREE.MeshPhysicalMaterial>();const ceilingBounce=new Set<THREE.MeshStandardMaterial>();
  scene.traverse(object=>{
    if(object instanceof THREE.Light&&object.userData.cycle)lights.push(object);
    if(object instanceof THREE.Mesh){for(const mat of Array.isArray(object.material)?object.material:[object.material]){
      if(mat.userData.dayNightEmission)emitting.add(mat);
      if(mat.userData.dayNightGlass)glazing.add(mat);
      if(mat.userData.indirectCeiling)ceilingBounce.add(mat);
    }}
  });
  let exteriorView=exterior;
  const dayBackground=new THREE.Color(exterior?'#b8d5e6':'#303a36'),nightBackground=new THREE.Color(exterior?'#142437':'#121c26');
  const background=new THREE.Color();scene.background=background;scene.fog=new THREE.Fog(background,65,140);
  let amount=initialNight?1:0,target=amount,environmentNight:boolean|undefined;
  const apply=()=>{
    for(const light of lights){const {day,night}=light.userData.cycle;light.intensity=THREE.MathUtils.lerp(day,night,amount);}
    for(const mat of emitting)mat.emissiveIntensity=THREE.MathUtils.lerp(.12,2.1,amount);
    for(const mat of ceilingBounce)mat.emissiveIntensity=THREE.MathUtils.lerp(.28,.012,amount);
    for(const mat of glazing){mat.metalness=THREE.MathUtils.lerp(.06,.03,amount);mat.opacity=THREE.MathUtils.lerp(.20,.14,amount);}
    background.copy(dayBackground).lerp(nightBackground,amount);(scene.fog as THREE.Fog).color.copy(background);
    scene.environmentIntensity=THREE.MathUtils.lerp(.58,.18,amount);renderer.toneMappingExposure=THREE.MathUtils.lerp(.90,.98,amount);
    const useNight=amount>.5;if(useNight!==environmentNight){scene.environment=useNight?night:day;environmentNight=useNight;}
  };
  apply();
  return {dispose(){owned.forEach(object=>object.removeFromParent());sun.shadow.dispose();},setExterior(value:boolean){exteriorView=value;dayBackground.set(exteriorView?'#b8d5e6':'#303a36');nightBackground.set(exteriorView?'#142437':'#121c26');apply();},setNight(value:boolean){target=value?1:0;},update(dt:number){const changing=amount!==target;if(Math.abs(target-amount)>.001){amount=THREE.MathUtils.damp(amount,target,5.5,dt);apply();}else if(amount!==target){amount=target;apply();}return changing;},get nightAmount(){return amount;},sunDirection:sun.position.clone().sub(sun.target.position).normalize()};
}
