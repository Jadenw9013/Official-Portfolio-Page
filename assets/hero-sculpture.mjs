import * as THREE from './vendor/three/three.min.mjs';
import { createRotation } from './sculpture-rotation.mjs';

// An abstract ribbon sculpture. It conveys no project data or metrics.
const host = document.getElementById('sculpture-art');
const canvas = document.getElementById('sculpture-canvas');
const hero = document.getElementById('hero');
const motion = matchMedia('(prefers-reduced-motion: reduce)');

function start() {
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'low-power' });
  renderer.setClearColor(0x0a0a0a, 0);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 1, .1, 50);
  camera.position.set(0, 0, 12.8);
  const uniforms = { uScroll:{value:0}, uTime:{value:0}, uEntry:{value:motion.matches?1:0} };
  const material = new THREE.ShaderMaterial({
    uniforms, side:THREE.DoubleSide,
    vertexShader:`
      attribute vec2 aParam;
      attribute float aBand;
      uniform float uScroll; uniform float uTime; uniform float uEntry;
      varying vec3 vNormal; varying vec3 vView; varying float vBand;
      vec3 shape(float t,float v){
        float opening=uScroll;
        float angle=t*(1.0-opening*0.48)-opening*1.4;
        float wave=sin(t*3.0+uTime*0.28)*0.035;
        float radius=2.18+0.16*cos(t*3.0)+v*(0.77+opening*0.25)*cos(t*2.0+opening*1.8)+wave;
        return vec3(radius*cos(angle),radius*sin(angle),v*0.9*sin(t*2.0+opening*1.8)+0.19*sin(t*3.0)+opening*(t-3.14159)*0.35);
      }
      void main(){
        vec3 p=shape(aParam.x,aParam.y);
        vec3 tangent=shape(aParam.x+0.002,aParam.y)-p;
        vec3 across=shape(aParam.x,aParam.y+0.002)-p;
        vNormal=normalize(normalMatrix*normalize(cross(tangent,across)));
        p*=0.88+uEntry*0.12;
        vec4 view=modelViewMatrix*vec4(p,1.0);
        vView=-view.xyz;vBand=aBand;
        gl_Position=projectionMatrix*view;
      }`,
    fragmentShader:`
      varying vec3 vNormal; varying vec3 vView; varying float vBand;
      void main(){
        vec3 n=normalize(vNormal);if(!gl_FrontFacing)n=-n;
        vec3 eye=normalize(vView);
        vec3 key=normalize(vec3(-0.7,1.2,1.5));
        vec3 rim=normalize(vec3(1.0,-0.3,-0.8));
        float diffuse=abs(dot(n,key));
        float shine=pow(max(dot(reflect(-key,n),eye),0.0),35.0);
        float edge=pow(1.0-abs(dot(n,eye)),2.5);
        float cool=pow(max(dot(n,rim),0.0),3.0);
        vec3 gold=vec3(0.52,0.32,0.105);
        vec3 color=gold*(0.10+0.78*diffuse)+vec3(0.85,0.74,0.50)*shine*0.85;
        color+=vec3(0.20,0.32,0.49)*cool*0.38+vec3(0.61,0.48,0.24)*edge*0.25;
        color*=0.77+0.23*sin(vBand*0.9+1.0);
        gl_FragColor=vec4(color,1.0);
        #include <colorspace_fragment>
      }`
  });
  // Individual narrow surfaces produce real gaps and highlights between the ribbons.
  const bands=64,segments=256;
  const positions=new Float32Array(bands*(segments+1)*2*3);
  const params=new Float32Array(bands*(segments+1)*2*2);
  const bandIds=new Float32Array(bands*(segments+1)*2);
  const indices=[];
  for(let band=0;band<bands;band++){
    for(let segment=0;segment<=segments;segment++){
      for(let side=0;side<2;side++){
        const vertex=(band*(segments+1)+segment)*2+side;
        params[vertex*2]=segment/segments*Math.PI*2;
        params[vertex*2+1]=-1+(band+(side===0?.10:.73))/bands*2;
        bandIds[vertex]=band;
      }
      if(segment<segments){const a=(band*(segments+1)+segment)*2;indices.push(a,a+2,a+1,a+1,a+2,a+3);}
    }
  }
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));
  geometry.setAttribute('aParam',new THREE.BufferAttribute(params,2));
  geometry.setAttribute('aBand',new THREE.BufferAttribute(bandIds,1));
  geometry.setIndex(indices);
  const sculpture=new THREE.Mesh(geometry,material);
  sculpture.frustumCulled=false;
  scene.add(sculpture);

  let frame=0,last=0,time=0,progress=0,target=0,visible=true,lost=false;
  let pointerX=0,pointerY=0,easedX=0,easedY=0;
  const rotation=createRotation();
  let dragging=null,dragX=0,dragY=0,dragTime=0;
  const clamp=(v,min,max)=>Math.min(max,Math.max(min,v));
  function scroll(){
    const rect=hero.getBoundingClientRect();
    target=clamp(-rect.top/Math.max(1,hero.offsetHeight-innerHeight),0,1);
    if(!motion.matches)request();
  }
  function resize(){
    const w=Math.max(1,host.clientWidth),h=Math.max(1,host.clientHeight);
    const ratio=Math.min(devicePixelRatio||1,1.5,Math.sqrt(1300000/(w*h)));
    renderer.setSize(Math.round(w*ratio),Math.round(h*ratio),false);
    camera.aspect=w/h;
    camera.position.z=camera.aspect<1?12.8/camera.aspect:12.8;
    camera.updateProjectionMatrix();scroll();request();
  }
  function request(){if(!frame&&visible&&!document.hidden&&!lost)frame=requestAnimationFrame(draw);}
  function draw(now){
    frame=0;
    const dt=Math.min((now-(last||now-16))/1000,.05);last=now;
    if(motion.matches){progress=0;easedX=0;easedY=0;uniforms.uEntry.value=1;}
    else{
      time+=dt;progress+=(target-progress)*(1-Math.exp(-dt*6));
      easedX+=(pointerX-easedX)*.045;easedY+=(pointerY-easedY)*.045;
      uniforms.uEntry.value=Math.min(1,uniforms.uEntry.value+dt*.85);
    }
    uniforms.uScroll.value=progress;uniforms.uTime.value=motion.matches?0:time;
    sculpture.rotation.set(.35+progress*.85+easedY*.12,-.65+progress*1.7+easedX*.18,-.4+progress*.9+(motion.matches?0:Math.sin(time*.16)*.045));
    if(dragging===null&&!motion.matches)rotation.coast(dt);
    sculpture.quaternion.premultiply(rotation.orientation);
    sculpture.position.y=(motion.matches?0:Math.sin(time*.35)*.06)+progress*.05;
    renderer.render(scene,camera);
    if(!motion.matches)request();
  }
  function pointer(e){if(dragging!==null||e.pointerType==='touch'||motion.matches)return;pointerX=(e.clientX/innerWidth-.5)*2;pointerY=(e.clientY/innerHeight-.5)*2;}
  function grab(e){
    if(dragging!==null||!e.isPrimary||e.button!==0)return;
    dragging=e.pointerId;dragX=e.clientX;dragY=e.clientY;dragTime=e.timeStamp;
    rotation.stop();leave();canvas.setPointerCapture(e.pointerId);
    host.classList.add('is-dragging');
  }
  function drag(e){
    if(e.pointerId!==dragging)return;
    rotation.drag(e.clientX-dragX,e.clientY-dragY,Math.min(host.clientWidth,host.clientHeight),(e.timeStamp-dragTime)/1000);
    dragX=e.clientX;dragY=e.clientY;dragTime=e.timeStamp;request();
  }
  function release(e){
    if(e.pointerId!==dragging)return;
    if(e.type!=='pointerup'||motion.matches||e.timeStamp-dragTime>100)rotation.stop();
    dragging=null;host.classList.remove('is-dragging');
    if(canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId);
    request();
  }
  function keyboard(e){
    const directions={ArrowLeft:[-24,0],ArrowRight:[24,0],ArrowUp:[0,-24],ArrowDown:[0,24]};
    if(e.key==='Home'){e.preventDefault();rotation.reset();request();return;}
    if(!directions[e.key])return;
    e.preventDefault();rotation.drag(...directions[e.key],Math.min(host.clientWidth,host.clientHeight),.1);rotation.stop();request();
  }
  function leave(){pointerX=0;pointerY=0;}
  function visibility(){if(document.hidden){cancelAnimationFrame(frame);frame=0;}else{last=0;request();}}
  function motionChange(){rotation.stop();last=0;scroll();request();}
  function contextLost(e){e.preventDefault();lost=true;cancelAnimationFrame(frame);frame=0;host.classList.remove('is-ready','is-dragging');canvas.removeAttribute('tabindex');host.setAttribute('aria-hidden','true');}
  const observer=new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;if(visible){last=0;request();}else{cancelAnimationFrame(frame);frame=0;}},{threshold:0});
  observer.observe(hero);
  const resizeObserver=new ResizeObserver(resize);resizeObserver.observe(host);
  addEventListener('scroll',scroll,{passive:true});addEventListener('resize',resize,{passive:true});
  hero.addEventListener('pointermove',pointer,{passive:true});hero.addEventListener('pointerleave',leave);
  document.addEventListener('visibilitychange',visibility);motion.addEventListener('change',motionChange);
  canvas.addEventListener('webglcontextlost',contextLost);
  canvas.addEventListener('pointerdown',grab);
  canvas.addEventListener('pointermove',drag);
  canvas.addEventListener('pointerup',release);
  canvas.addEventListener('pointercancel',release);
  canvas.addEventListener('lostpointercapture',release);
  canvas.addEventListener('keydown',keyboard);
  host.removeAttribute('aria-hidden');
  canvas.tabIndex=0;canvas.setAttribute('role','img');
  canvas.setAttribute('aria-label','Interactive abstract sculpture. Drag or use arrow keys to rotate. Home resets rotation.');
  canvas.title='Drag to rotate · Arrow keys to rotate · Home to reset';
  resize();host.classList.add('is-ready');
  addEventListener('pagehide',e=>{if(e.persisted)return;cancelAnimationFrame(frame);observer.disconnect();resizeObserver.disconnect();geometry.dispose();material.dispose();renderer.dispose();},{once:true});
}

try { start(); } catch(error) {
  host.classList.remove('is-ready');
  console.warn('Decorative 3D unavailable; using static artwork.',error.message);
}
