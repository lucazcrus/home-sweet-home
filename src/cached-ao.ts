import * as THREE from 'three';
import { SSAOPass } from 'three/examples/jsm/postprocessing/SSAOPass.js';

/** Occlusion depends on geometry/camera, not the animated water or light intensity. */
export class CachedSSAOPass extends SSAOPass {
  private dirty=true;
  constructor(scene:THREE.Scene,camera:THREE.Camera){
    super(scene,camera,1,1,16);
    this.kernelRadius=.6;this.minDistance=.002;this.maxDistance=.15;
  }
  invalidate(){this.dirty=true;}
  setClippingPlanes(planes:THREE.Plane[]|null){
    const changed=(this.normalMaterial.clippingPlanes?.length||0)!==(planes?.length||0);
    this.normalMaterial.clippingPlanes=planes;
    if(changed)this.normalMaterial.needsUpdate=true;
    this.invalidate();
  }
  override setSize(width:number,height:number){super.setSize(Math.max(1,Math.round(width*.5)),Math.max(1,Math.round(height*.5)));this.dirty=true;}
  override render(renderer:THREE.WebGLRenderer,writeBuffer:THREE.WebGLRenderTarget,readBuffer:THREE.WebGLRenderTarget){
    if(this.dirty){super.render(renderer,writeBuffer,readBuffer,0,false);this.dirty=false;return;}
    this.copyMaterial.uniforms.tDiffuse.value=this.blurRenderTarget.texture;this.copyMaterial.blending=THREE.CustomBlending;
    this.renderPass(renderer,this.copyMaterial,this.renderToScreen?null as unknown as THREE.WebGLRenderTarget:readBuffer);
  }
  override dispose(){super.dispose();this.ssaoMaterial.dispose();this.noiseTexture.dispose();this.normalRenderTarget.depthTexture?.dispose();}
}
