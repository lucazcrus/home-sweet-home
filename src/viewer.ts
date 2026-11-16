import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { SMAAPass } from 'three/examples/jsm/postprocessing/SMAAPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { FXAAShader } from 'three/examples/jsm/shaders/FXAAShader.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { addFacadeDetails, createOutdoorEnvironment } from './facade';
import { addPatioDetails } from './patio';
import { createFurniture, makeMaterials, type SceneObject } from './scene-assets';
import { createDayNightController, cycleLight, type DayNightController } from './day-night';
import { batchStaticMeshes, disposeSceneResources } from './optimize-scene';
import { CachedSSAOPass } from './cached-ao';
import { createPerformanceMonitor } from './performance';
import architecture from './architecture.json';
import { createLocalLightVolume } from './light-volume';
import { addReferenceScenes } from './reference-scenes';
import { getRoom, containsPoint, interiorAt, updateRoomPlanes, type RoomId } from './rooms';

export type HouseModel={modelVersion?:number;designVersion?:number;units:string;dimensions:{width:number;depth:number};objects:SceneObject[]};
export type DisplayOptions={walls:boolean;roof:boolean;site:boolean};
type ViewerOptions={view:string;display:DisplayOptions;cutWalls:boolean;night:boolean;room:RoomId;officeDoorOpen?:boolean;onSelect:(id:string|null)=>void};
const cameras:Record<string,{position:[number,number,number];target:[number,number,number]}>={
  Frente:{position:[1,1.9,32.7],target:[5,2.3,19.6]},Piscina:{position:[5.18,2.55,8.90],target:[2.55,1.10,6]},
  Planta:{position:[5,37,12],target:[5,0,12]},Entrar:{position:[8.1,1.65,19],target:[8.1,1.3,15]},'3D':{position:[24,26,32],target:[5,.3,10]}
};

/** The renderer, environment, static geometry and GPU programs live for the whole session. */
export class HouseViewer {
  readonly scene=new THREE.Scene();
  readonly renderer:THREE.WebGLRenderer;
  readonly camera=new THREE.PerspectiveCamera(42,1,.1,150);
  readonly controls:OrbitControls;
  readonly meshes=new Map<string,THREE.Object3D>();
  private readonly materials=makeMaterials();
  private readonly composer:EffectComposer;
  private readonly ao:CachedSSAOPass;
  private readonly antialias:SMAAPass;private readonly motionAntialias:ShaderPass;
  private readonly outdoor;private readonly nightOutdoor;
  private readonly groups={facadeEnvelope:new THREE.Group(),solid:new THREE.Group(),walls:new THREE.Group(),lowWalls:new THREE.Group(),roof:new THREE.Group(),ceiling:new THREE.Group(),site:new THREE.Group()};
  private room:RoomId='all';private inside=false;
  private readonly roomPlanes=Array.from({length:4},()=>new THREE.Plane());
  private references?:ReturnType<typeof addReferenceScenes>;
  private facade?:THREE.Group;
  private patio?:ReturnType<typeof addPatioDetails>;
  private dayNight?:DayNightController;
  private readonly furnitureData=new Map<string,SceneObject>();
  private localLights:THREE.Light[]=[];private localVolume?:ReturnType<typeof createLocalLightVolume>;
  private architectureSignature='';private model:HouseModel;
  private view:string;private display:DisplayOptions;private cutWalls:boolean;private night:boolean;
  private selected:string|null=null;private frameId=0;private disposed=false;private dirty=true;private ready=false;
  private width=1;private height=1;private resolution=1;private adaptiveScale=1;
  private lastMotion=0;private lastFrame=performance.now();private lastRender=0;private lastQualityChange=0;private renderSamples:number[]=[];
  private readonly heldKeys=new Set<string>();private readonly raycaster=new THREE.Raycaster();private readonly pointer=new THREE.Vector2();
  private readonly forward=new THREE.Vector3();private readonly right=new THREE.Vector3();private readonly step=new THREE.Vector3();
  private readonly up=new THREE.Vector3(0,1,0);private readonly frustum=new THREE.Frustum();private readonly projection=new THREE.Matrix4();
  private pointerStart?:{x:number;y:number;id:number};
  private readonly observer:ResizeObserver;
  private readonly monitor:ReturnType<typeof createPerformanceMonitor>;
  private readonly stage:THREE.Mesh;

  constructor(private readonly host:HTMLElement,model:HouseModel,private readonly options:ViewerOptions){
    this.model=model;this.view=options.view;this.display={...options.display};this.cutWalls=options.cutWalls;this.night=options.night;this.room=options.room;
    this.renderer=new THREE.WebGLRenderer({antialias:false,alpha:false,powerPreference:'high-performance'});
    this.renderer.localClippingEnabled=true;this.renderer.setPixelRatio(1);this.renderer.outputColorSpace=THREE.SRGBColorSpace;this.renderer.toneMapping=THREE.ACESFilmicToneMapping;
    this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=THREE.PCFSoftShadowMap;this.renderer.shadowMap.autoUpdate=false;
    this.renderer.info.autoReset=false;this.host.appendChild(this.renderer.domElement);
    this.controls=new OrbitControls(this.camera,this.renderer.domElement);this.controls.enableDamping=true;this.controls.dampingFactor=.09;
    this.controls.maxPolarAngle=Math.PI*.54;this.controls.minDistance=.3;this.controls.maxDistance=65;
    this.outdoor=createOutdoorEnvironment(this.renderer,false);this.nightOutdoor=createOutdoorEnvironment(this.renderer,true);
    const stageShape=new THREE.Shape().moveTo(-100,-100).lineTo(100,-100).lineTo(100,100).lineTo(-100,100).closePath();
    const p=architecture.pool;stageShape.holes.push(new THREE.Path().moveTo(p.x1,-p.z1).lineTo(p.x2,-p.z1).lineTo(p.x2,-p.z2).lineTo(p.x1,-p.z2).closePath());
    this.stage=new THREE.Mesh(new THREE.ShapeGeometry(stageShape),new THREE.MeshLambertMaterial({color:'#9a9e96'}));
    this.stage.rotation.x=-Math.PI/2;this.stage.position.y=-.26;this.stage.receiveShadow=true;this.scene.add(this.stage,...Object.values(this.groups));
    this.buildArchitecture(model);
    this.syncFurniture(model);
    this.ao=new CachedSSAOPass(this.scene,this.camera);
    this.composer=new EffectComposer(this.renderer);this.composer.setPixelRatio(1);
    this.composer.addPass(new RenderPass(this.scene,this.camera));this.composer.addPass(this.ao);
    this.antialias=new SMAAPass(1,1);this.composer.addPass(this.antialias);this.motionAntialias=new ShaderPass(FXAAShader);this.motionAntialias.enabled=false;this.composer.addPass(this.motionAntialias);this.composer.addPass(new OutputPass());
    this.monitor=createPerformanceMonitor(this.host,this.camera,this.controls.target);
    this.setView(this.view);this.applyRoomScope();this.applyDisplay();this.resize();
    this.controls.addEventListener('change',this.onCameraChange);
    this.renderer.domElement.addEventListener('pointerdown',this.onPointerDown);
    this.renderer.domElement.addEventListener('pointerup',this.onPointerUp);this.renderer.domElement.addEventListener('pointercancel',this.onPointerCancel);
    window.addEventListener('keydown',this.onKeyDown);window.addEventListener('keyup',this.onKeyUp);window.addEventListener('blur',this.onBlur);
    document.addEventListener('visibilitychange',this.onVisibility);
    this.observer=new ResizeObserver(this.resize);this.observer.observe(this.host);
    // Compile shaders without blocking the first interactive frame on every view change.
    this.renderer.compileAsync(this.scene,this.camera).catch(()=>{}).finally(()=>{if(!this.disposed){this.ready=true;this.warmNightShaders();this.invalidate();this.lastFrame=performance.now();this.frameId=requestAnimationFrame(this.animate);}});
  }

  private makeArchitectureMesh(o:SceneObject,height=o.sz){
    const material=o.group.toLowerCase().includes('forros')?this.materials.ceilingPlaster:this.materials[o.material]||this.materials.warmWhite;
    const geometry=new THREE.BoxGeometry(o.sx,height,o.sy),vertices=geometry.getAttribute('position'),normals=geometry.getAttribute('normal'),uv=geometry.getAttribute('uv');
    for(let i=0;i<vertices.count;i++){
      const x=vertices.getX(i),y=vertices.getY(i),z=vertices.getZ(i);
      if(Math.abs(normals.getY(i))>.5)uv.setXY(i,x+o.x,z+o.y);
      else if(Math.abs(normals.getX(i))>.5)uv.setXY(i,z+o.y,y+o.z);
      else uv.setXY(i,x+o.x,y+o.z);
    }
    const box=new THREE.Mesh(geometry,material);box.position.set(o.x,o.z-o.sz/2+height/2,o.y);box.rotation.y=-(o.rotation||0)*Math.PI/180;
    box.name=o.name;box.castShadow=o.material!=='glass';box.receiveShadow=true;
    if(o.material!=='glass')return box;
    const group=new THREE.Group();group.add(box);const t=.035,alongZ=o.sx<o.sy;
    for(const sign of [-1,1]){
      const vertical=new THREE.Mesh(new THREE.BoxGeometry(alongZ?Math.max(.055,o.sx):t,o.sz+.06,alongZ?t:Math.max(.055,o.sy)),this.materials.black);
      vertical.position.set(o.x+(alongZ?0:sign*o.sx/2),o.z,o.y+(alongZ?sign*o.sy/2:0));vertical.castShadow=true;group.add(vertical);
      const horizontal=new THREE.Mesh(new THREE.BoxGeometry(alongZ?Math.max(.055,o.sx):o.sx+.06,t,alongZ?o.sy+.06:Math.max(.055,o.sy)),this.materials.black);
      horizontal.position.set(o.x,o.z+sign*o.sz/2,o.y);horizontal.castShadow=true;group.add(horizontal);
    }
    return group;
  }

  private buildArchitecture(model:HouseModel){
    const objects=model.objects.filter(object=>!object.furniture);
    this.architectureSignature=JSON.stringify(objects);
    for(const o of objects){
      const group=o.group.toLowerCase();
      if(o.name==='Moldura clara do pano de vidro'||o.name.includes('Palmeira -'))continue;
      const target=group==='fachada'?this.groups.facadeEnvelope:group.includes('parede')?this.groups.walls:group.includes('forro')?this.groups.ceiling:group.includes('cobertura')?this.groups.roof:group.includes('terreno')||group.includes('paisagismo')?this.groups.site:this.groups.solid;
      target.add(this.makeArchitectureMesh(o));
      if(target===this.groups.walls&&o.z-o.sz/2<1.15)this.groups.lowWalls.add(this.makeArchitectureMesh(o,o.keepFullHeight?o.sz:Math.min(o.sz,1.15-(o.z-o.sz/2))));
      if(o.material==='light'){
        const light=cycleLight(new THREE.PointLight('#ffcb85',0,4,2),.2,3);light.position.set(o.x,o.z-.12,o.y);this.groups.solid.add(light);
      }
    }
    this.facade=addFacadeDetails(this.scene,this.materials,{evening:false,roof:true,site:true,environment:this.outdoor.target.texture});
    this.patio=addPatioDetails(this.scene,this.materials,{roof:true,site:true});
    this.references=addReferenceScenes(this.scene,this.materials);this.references.officeDoor.setOpen(!!this.options.officeDoorOpen);
    for(const [x,z,height] of [[8.5,2.8,2.68],[8.1,17,4.4],[8.1,14,4.4],[5.1,1.6,2.68],[8.3,9.3,2.68],[4.45,11.85,2.68]]){
      const glow=cycleLight(new THREE.SpotLight('#ffddb1',0,6,Math.PI*.38,.75,2),.12,16);glow.position.set(x,height,z);glow.target.position.set(x,0,z);
      glow.castShadow=z===11.85||z===17||z===1.6;glow.shadow.mapSize.set(512,512);glow.shadow.bias=-.0003;glow.shadow.normalBias=.025;
      const room=interiorAt(new THREE.Vector3(x,height,z));if(room)glow.userData.bakeBounds={...room.bounds,y1:0,y2:room.height};
      this.groups.solid.add(glow,glow.target);
      const disk=new THREE.Mesh(new THREE.CylinderGeometry(.075,.075,.025,16),this.materials.light);disk.position.set(x,height+.08,z);this.groups.ceiling.add(disk);
    }
    for(const group of Object.values(this.groups))batchStaticMeshes(group);
    // Visibility groups are separate batches, so toggles never rebuild geometry.
    if(this.facade){for(const group of this.facade.children.filter(child=>child instanceof THREE.Group))batchStaticMeshes(group);batchStaticMeshes(this.facade);}
    if(this.patio){for(const group of this.patio.root.children.filter(child=>child instanceof THREE.Group))batchStaticMeshes(group);batchStaticMeshes(this.patio.root);}
    if(this.references){for(const group of this.references.groups.values())batchStaticMeshes(group);batchStaticMeshes(this.references.ceiling);}
    this.dayNight=createDayNightController(this.scene,this.renderer,this.outdoor.target.texture,this.nightOutdoor.target.texture,this.night,['Frente','Piscina','Entrar'].includes(this.view));
    this.localLights=[];this.scene.traverse(object=>{if((object instanceof THREE.PointLight||object instanceof THREE.SpotLight)&&object.userData.cycle)this.localLights.push(object);});
    this.scene.updateMatrixWorld(true);this.localVolume=createLocalLightVolume(this.localLights);this.localVolume.install(this.scene);
    this.renderer.shadowMap.needsUpdate=true;
  }

  private syncFurniture(model:HouseModel){
    const next=new Map(model.objects.filter(object=>object.furniture).map(object=>[object.id!,object]));
    for(const [id,object] of this.meshes)if(!next.has(id)){this.releaseFurniture(object);this.meshes.delete(id);this.furnitureData.delete(id);}
    for(const [id,o] of next){
      const previous=this.furnitureData.get(id);
      const changed=!previous||['sx','sy','sz','material','name'].some(key=>previous[key as keyof SceneObject]!==o[key as keyof SceneObject]);
      if(changed){
        const old=this.meshes.get(id);if(old)this.releaseFurniture(old);
        const object=createFurniture(o,this.materials);batchStaticMeshes(object);
        object.traverse(child=>{child.userData={...child.userData,id,furniture:true};if(child instanceof THREE.Mesh&&Object.values(this.materials).includes(child.material))child.material=child.material.clone();});this.scene.add(object);this.localVolume?.install(object);this.clipMaterials(object);this.meshes.set(id,object);
      }
      const object=this.meshes.get(id)!;object.position.set(o.x,o.z-o.sz/2+.085,o.y);object.rotation.y=-(o.rotation||0)*Math.PI/180;
      const room=getRoom(this.room);object.visible=!room||containsPoint(room,o.x,o.y,.15);
      this.furnitureData.set(id,{...o});
    }
  }

  private releaseFurniture(root:THREE.Object3D){
    root.traverse(object=>{if(object instanceof THREE.Mesh){object.geometry.dispose();const materials=Array.isArray(object.material)?object.material:[object.material];for(const material of materials)if(!Object.values(this.materials).includes(material))material.dispose();}});root.removeFromParent();
  }

  syncModel(model:HouseModel){
    if(this.disposed)return;
    // Imports may replace architecture; ordinary furniture edits touch only their own GPU objects.
    const signature=JSON.stringify(model.objects.filter(o=>!o.furniture));
    if(signature!==this.architectureSignature){
      for(const group of Object.values(this.groups)){this.releaseFurniture(group);group.clear();this.scene.add(group);}
      if(this.facade){this.releaseFurniture(this.facade);this.facade=undefined;}
      if(this.patio){this.patio.dispose();this.releaseFurniture(this.patio.root);this.patio=undefined;}
      if(this.references){this.releaseFurniture(this.references.root);this.references=undefined;}
      this.dayNight?.dispose();this.localVolume?.dispose();this.buildArchitecture(model);this.applyRoomScope();this.applyDisplay();
    }
    this.model=model;this.syncFurniture(model);this.setSelected(this.selected);this.renderer.shadowMap.needsUpdate=true;this.ao.invalidate();this.patio?.invalidateReflection();this.invalidate();
  }

  setSelected(id:string|null){
    this.selected=id;
    for(const [key,object] of this.meshes)object.traverse(child=>{if(child instanceof THREE.Mesh&&child.material instanceof THREE.MeshStandardMaterial){
      const material=child.material;if(!material.userData.baseEmission)material.userData.baseEmission=material.emissive.clone();
      material.emissive.copy(material.userData.baseEmission);if(key===id){material.emissive.set('#806a45');material.emissiveIntensity=.22;}
    }});
    this.invalidate();
  }

  setNight(night:boolean){this.night=night;this.dayNight?.setNight(night);if(night)this.updateLightRegion(true);this.renderer.shadowMap.needsUpdate=true;this.patio?.invalidateReflection();this.invalidate();}
  setOfficeDoorOpen(open:boolean){this.options.officeDoorOpen=open;this.references?.officeDoor.setOpen(open);this.applyRoomScope();this.renderer.shadowMap.needsUpdate=true;this.ao?.invalidate();this.patio?.invalidateReflection();this.invalidate();}
  setDisplay(display:DisplayOptions,cutWalls:boolean){this.display={...display};this.cutWalls=cutWalls;this.applyDisplay();}
  setRoom(room:RoomId){
    if(this.room===room)return;
    this.room=room;this.options.onSelect(null);this.applyRoomScope();this.frame();this.applyDisplay();
  }
  private clipMaterials(root:THREE.Object3D){
    const planes=getRoom(this.room)?this.roomPlanes:null;
    root.traverse(object=>{
      if(!(object instanceof THREE.Mesh))return;
      for(const material of Array.isArray(object.material)?object.material:[object.material]){
        // The animated water/caustics are wholly inside the pool region.
        if(material instanceof THREE.ShaderMaterial)continue;
        const changed=(material.clippingPlanes?.length||0)!==(planes?.length||0);
        material.clippingPlanes=planes;material.clipShadows=true;if(changed)material.needsUpdate=true;
      }
    });
  }
  private applyRoomScope(){
    const requested=getRoom(this.room),connected=!!this.options.officeDoorOpen&&['office','officeBath'].includes(this.room);
    const room=connected&&requested?{...requested,bounds:{...getRoom('office')!.bounds,z1:.15}}:requested;if(room)updateRoomPlanes(this.roomPlanes,room);
    this.clipMaterials(this.scene);this.ao?.setClippingPlanes(room?this.roomPlanes:null);
    this.stage.visible=!room;
    if(this.patio)this.patio.root.visible=!room||this.room==='pool';
    if(this.facade)this.facade.visible=!room||['facade','garage','living'].includes(this.room);
    if(this.references)for(const [id,group] of this.references.groups)group.visible=!room||id===this.room||(connected&&['office','officeBath'].includes(id))||(this.room==='facade'&&id==='garage')||(this.room==='garage'&&id==='facade');
    if(this.references)this.references.officeDoor.root.visible=!room||this.room==='office'||this.room==='officeBath';
    for(const [id,object] of this.meshes){const data=this.furnitureData.get(id);object.visible=!room||!!data&&containsPoint(room,data.x,data.y,.15);}
    this.ao?.invalidate();this.invalidate();
  }
  private applyDisplay(){
    this.inside=!!interiorAt(this.camera.position);
    const interior=this.inside||this.view==='Entrar';
    const cut=this.cutWalls&&!interior&&!['Frente','Piscina'].includes(this.view)&&!['facade','garage','pool'].includes(this.room);
    const roof=interior||this.display.roof;
    this.groups.walls.visible=interior||this.display.walls&&!cut;this.groups.lowWalls.visible=!interior&&this.display.walls&&cut;
    this.groups.roof.visible=roof;this.groups.ceiling.visible=roof;this.groups.facadeEnvelope.visible=this.display.walls&&(!getRoom(this.room)||['facade','living','garage'].includes(this.room));this.groups.site.visible=this.display.site&&(!getRoom(this.room)||['facade','garage','pool','winter'].includes(this.room));
    if(this.references)this.references.ceiling.visible=roof;
    if(this.facade){this.facade.getObjectByName('Detalhes dependentes da cobertura')!.visible=roof;this.facade.getObjectByName('Jardim frontal detalhado')!.visible=this.display.site;}
    if(this.patio){this.patio.roof.visible=roof;this.patio.site.visible=this.display.site;}
    this.renderer.shadowMap.needsUpdate=true;this.ao?.invalidate();this.patio?.invalidateReflection();this.updateLightRegion();this.invalidate();
  }
  setView(view:string){
    if(this.view===view&&this.ready)return;
    this.view=view;this.camera.fov=view==='Entrar'?65:view==='Piscina'?52:42;this.frame();this.applyDisplay();
    this.dayNight?.setExterior(['Frente','Piscina','Entrar'].includes(view));
    (this.stage.material as THREE.MeshLambertMaterial).color.set(['Frente','Piscina'].includes(view)?'#9a9e96':'#151a18');
  }
  frame(){
    const room=getRoom(this.room);this.camera.fov=this.view==='Entrar'?(this.room==='office'?76:65):this.view==='Piscina'?52:42;let preset=cameras[this.view]||cameras['3D'];
    if(room){
      const b=room.bounds,cx=(b.x1+b.x2)/2,cz=(b.z1+b.z2)/2,span=Math.max(b.x2-b.x1,b.z2-b.z1);
      if(this.view==='Entrar')preset={position:room.inside,target:room.look};
      else if(this.view==='Planta')preset={position:[cx,span*1.9+3,cz],target:[cx,0,cz]};
      else if(this.room==='facade')preset={position:room.inside,target:room.look};
      else {const extent=Math.max(span,3.6);preset={position:[cx+extent*(this.room==='kitchen'?.94:-.94),extent*1.05+2,cz+extent*(this.room==='kitchen'?-1.18:1.18)],target:[cx,1.0,cz]};}
    }
    if(this.view==='Planta')this.camera.up.set(0,0,-1);else this.camera.up.set(0,1,0);
    this.camera.position.set(...preset.position);this.controls.target.set(...preset.target);this.camera.updateProjectionMatrix();this.camera.lookAt(this.controls.target);this.controls.update();
    this.applyDisplay();this.ao?.invalidate();this.patio?.invalidateReflection();this.invalidate();
  }
  zoom(factor:number){this.camera.position.sub(this.controls.target).multiplyScalar(factor).add(this.controls.target);this.controls.update();this.invalidate();}
  private updateLightRegion(active=this.night||(this.dayNight?.nightAmount||0)>.001){
    // Keep all fixtures in overview/interiors. Exterior closeups do not evaluate hidden rooms' lights.
    const room=getRoom(this.room);
    for(const light of this.localLights){
      const z=light.position.z;
      light.visible=active&&!this.localVolume?.baked.has(light)&&(!room||containsPoint(room,light.position.x,z,.20))&&(this.view==='Frente'?z>=12:this.view==='Piscina'?z<=13:true);
    }
  }
  private warmNightShaders(){
    const saved=this.localLights.map(light=>light.visible);this.updateLightRegion(true);
    void this.renderer.compileAsync(this.scene,this.camera).catch(()=>{});
    this.localLights.forEach((light,index)=>{light.visible=saved[index];});
  }
  private invalidate=()=>{this.dirty=true;};
  private onCameraChange=()=>{this.lastMotion=performance.now();this.ao.invalidate();this.invalidate();};
  private resize=()=>{if(!this.host.isConnected||this.disposed)return;this.width=Math.max(1,this.host.clientWidth);this.height=Math.max(1,this.host.clientHeight);this.camera.aspect=this.width/this.height;this.camera.updateProjectionMatrix();this.applyResolution();};
  private applyResolution(){
    const ratio=Math.min(devicePixelRatio,1.5,Math.sqrt(2_200_000/(this.width*this.height)))*this.adaptiveScale;
    this.resolution=ratio;this.renderer.setSize(this.width,this.height,false);this.renderer.domElement.style.width='100%';this.renderer.domElement.style.height='100%';
    this.renderer.setPixelRatio(ratio);this.composer.setSize(Math.round(this.width*ratio),Math.round(this.height*ratio));this.motionAntialias.material.uniforms.resolution.value.set(1/Math.round(this.width*ratio),1/Math.round(this.height*ratio));this.ao.invalidate();this.invalidate();
  }
  private updateQuality(cost:number,moving:boolean,now:number){
    if(!moving)return;this.renderSamples.push(cost);if(this.renderSamples.length<30||now-this.lastQualityChange<1200)return;
    const mean=this.renderSamples.reduce((sum,value)=>sum+value,0)/this.renderSamples.length;this.renderSamples=[];
    const next=mean>19?Math.max(.60,this.adaptiveScale*.86):mean<11?Math.min(1,this.adaptiveScale+.06):this.adaptiveScale;
    if(Math.abs(next-this.adaptiveScale)>.02){this.adaptiveScale=next;this.lastQualityChange=now;this.applyResolution();}
  }

  private animate=(now:number)=>{
    if(this.disposed||document.hidden)return;this.frameId=requestAnimationFrame(this.animate);
    const rawDt=(now-this.lastFrame)/1000;this.lastFrame=now;const dt=Math.min(rawDt,.05);
    const benchmark=this.monitor.beforeFrame(now);if(benchmark)this.onCameraChange();
    if(this.view==='Entrar'&&this.heldKeys.size){
      this.camera.getWorldDirection(this.forward);this.forward.y=0;this.forward.normalize();this.right.crossVectors(this.forward,this.up);this.step.set(0,0,0);
      if(this.heldKeys.has('w')||this.heldKeys.has('ArrowUp'))this.step.add(this.forward);if(this.heldKeys.has('s')||this.heldKeys.has('ArrowDown'))this.step.sub(this.forward);
      if(this.heldKeys.has('d')||this.heldKeys.has('ArrowRight'))this.step.add(this.right);if(this.heldKeys.has('a')||this.heldKeys.has('ArrowLeft'))this.step.sub(this.right);
      this.step.normalize().multiplyScalar(dt*2);this.camera.position.add(this.step);this.controls.target.add(this.step);this.onCameraChange();
    }
    this.controls.update();if(!!interiorAt(this.camera.position)!==this.inside)this.applyDisplay();const moving=now-this.lastMotion<160;
    const changingLight=this.dayNight!.update(dt);this.localVolume?.setNightAmount(this.dayNight!.nightAmount);if(changingLight&&!this.night&&this.dayNight!.nightAmount<=.001)this.updateLightRegion(false);
    this.camera.updateMatrixWorld();this.projection.multiplyMatrices(this.camera.projectionMatrix,this.camera.matrixWorldInverse);this.frustum.setFromProjectionMatrix(this.projection);
    const poolOccluded=this.display.roof&&this.camera.position.y<3.4&&this.camera.position.z>12.5;
    const waterVisible=this.patio!.root.visible&&!poolOccluded&&this.patio!.isVisible(this.frustum);this.patio!.setReflectionActive(waterVisible);
    const animateWater=waterVisible&&now-this.lastRender>=(moving?0:1000/30);
    if(!this.dirty&&!changingLight&&!animateWater&&!benchmark)return;
    if(!moving&&this.adaptiveScale<1&&now-this.lastMotion>450){this.adaptiveScale=1;this.applyResolution();}
    this.ao.enabled=!moving;this.antialias.enabled=!moving;this.motionAntialias.enabled=moving;
    this.patio!.update(now/1000,this.dayNight!.nightAmount,this.dayNight!.sunDirection,moving);
    this.renderer.info.reset();const start=performance.now();this.composer.render(dt);const cost=performance.now()-start;
    this.monitor.afterFrame((now-this.lastRender)/1000,cost,this.renderer.info.render.calls,this.renderer.info.render.triangles);
    this.updateQuality(Math.max(cost,Math.min(rawDt*1000,80)-2),moving,now);this.lastRender=now;this.dirty=false;
    // One final frame restores cached contact shadows after interaction/damping settles.
    if(moving)this.dirty=true;
  };
  private onVisibility=()=>{cancelAnimationFrame(this.frameId);this.heldKeys.clear();if(!document.hidden&&!this.disposed&&this.ready){this.lastFrame=performance.now();this.invalidate();this.frameId=requestAnimationFrame(this.animate);}};
  private onKeyDown=(event:KeyboardEvent)=>{if(this.view!=='Entrar'||event.target instanceof HTMLInputElement||event.target instanceof HTMLTextAreaElement||event.target instanceof HTMLSelectElement)return;if(['w','a','s','d','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(event.key)){this.heldKeys.add(event.key);event.preventDefault();}};
  private onKeyUp=(event:KeyboardEvent)=>{this.heldKeys.delete(event.key);};
  private onBlur=()=>{this.heldKeys.clear();this.pointerStart=undefined;};
  private onPointerDown=(event:PointerEvent)=>{if(event.button===0)this.pointerStart={x:event.clientX,y:event.clientY,id:event.pointerId};};
  private onPointerCancel=()=>{this.pointerStart=undefined;};
  private onPointerUp=(event:PointerEvent)=>{
    const start=this.pointerStart;this.pointerStart=undefined;
    if(!start||event.pointerId!==start.id||Math.hypot(event.clientX-start.x,event.clientY-start.y)>4)return;
    const rect=this.renderer.domElement.getBoundingClientRect();this.pointer.set((event.clientX-rect.left)/rect.width*2-1,-(event.clientY-rect.top)/rect.height*2+1);this.raycaster.setFromCamera(this.pointer,this.camera);
    const room=getRoom(this.room);
    const hit=this.raycaster.intersectObjects([...this.meshes.values()].filter(object=>object.visible),true).find(hit=>!room||this.roomPlanes.every(plane=>plane.distanceToPoint(hit.point)>=0));
    this.options.onSelect(hit?.object.userData.id||null);
  };

  dispose(){
    if(this.disposed)return;this.disposed=true;cancelAnimationFrame(this.frameId);this.observer.disconnect();this.monitor.dispose();
    this.controls.removeEventListener('change',this.onCameraChange);this.controls.dispose();
    this.renderer.domElement.removeEventListener('pointerdown',this.onPointerDown);this.renderer.domElement.removeEventListener('pointerup',this.onPointerUp);this.renderer.domElement.removeEventListener('pointercancel',this.onPointerCancel);
    window.removeEventListener('keydown',this.onKeyDown);window.removeEventListener('keyup',this.onKeyUp);window.removeEventListener('blur',this.onBlur);document.removeEventListener('visibilitychange',this.onVisibility);
    this.patio?.dispose();this.ao.dispose();this.antialias.dispose();this.motionAntialias.dispose();this.composer.dispose();this.dayNight?.dispose();this.localVolume?.dispose();disposeSceneResources(this.scene);
    for(const material of Object.values(this.materials)){material.map?.dispose();material.dispose();}
    this.scene.traverse(object=>{if(object instanceof THREE.SpotLight||object instanceof THREE.DirectionalLight)object.shadow.dispose();});
    this.outdoor.source.dispose();this.outdoor.target.dispose();this.nightOutdoor.source.dispose();this.nightOutdoor.target.dispose();
    this.renderer.dispose();this.renderer.forceContextLoss();this.renderer.domElement.remove();
  }
}
