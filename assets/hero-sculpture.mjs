import * as THREE from './vendor/three/three.min.mjs';
import { RIBBON_GLSL, ribbonCoordinate } from './sculpture-ribbon.mjs';
import { createEarthTexture } from './earth-texture.mjs';
import { createRotation } from './sculpture-rotation.mjs';
import { BAND_COUNT, SEGMENTS, SHAPE_NAMES, makeShapeAttributes, createMorph, createGesture } from './sculpture-shapes.mjs';

// Decorative ribbon sculpture with shared-topology morph targets.
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
  const morph=createMorph(),gesture=createGesture();
  const earthMap=createEarthTexture(()=>request());
  const uniforms = { uScroll:{value:0}, uTime:{value:0}, uEntry:{value:motion.matches?1:0}, uWeights:{value:new THREE.Vector3(1,0,0)}, uMorph:{value:0}, uLandMask:{value:earthMap.texture} };
  const material = new THREE.ShaderMaterial({
    uniforms, side:THREE.DoubleSide,
    vertexShader:`
      attribute vec2 aParam; attribute vec2 aEarthUv;
      attribute float aBand;
      attribute vec3 aAirplane; attribute vec3 aAirplaneNormal;
      attribute vec3 aEarth; attribute vec3 aEarthNormal;
      uniform vec3 uWeights; uniform float uMorph;
      uniform float uScroll; uniform float uTime; uniform float uEntry;
      varying vec3 vNormal; varying vec3 vView; varying float vBand; varying vec2 vEarthUv;
      ${RIBBON_GLSL}
      void main(){
        vec3 p=shape(aParam.x,aParam.y);
        vec3 tangent=shape(aParam.x+0.002,aParam.y)-p;
        vec3 across=shape(aParam.x,aParam.y+0.002)-p;
        vec3 normal=normalize(cross(tangent,across));
        normal=normal*uWeights.x+aAirplaneNormal*uWeights.y+aEarthNormal*uWeights.z;
        vNormal=normalize(normalMatrix*(normal+vec3(0.00001)));
        p=p*uWeights.x+aAirplane*uWeights.y+aEarth*uWeights.z;
        // Ribbons fan out and twist together during a morph, not a model swap.
        float spread=sin(aParam.x*2.0+aBand*0.21);
        p+=uMorph*0.32*vec3(cos(aBand*0.37),sin(aBand*0.37),spread);
        float twist=uMorph*0.36*sin(aParam.x+aBand*0.025);
        p.xy=mat2(cos(twist),-sin(twist),sin(twist),cos(twist))*p.xy;
        p*=0.88+uEntry*0.12;
        vec4 view=modelViewMatrix*vec4(p,1.0);
        vView=-view.xyz;vBand=aBand;vEarthUv=aEarthUv;
        gl_Position=projectionMatrix*view;
      }`,
    fragmentShader:`
      uniform sampler2D uLandMask; uniform vec3 uWeights;
      varying vec3 vNormal; varying vec3 vView; varying float vBand; varying vec2 vEarthUv;
      void main(){
        vec3 n=normalize(vNormal);if(!gl_FrontFacing)n=-n;
        vec3 eye=normalize(vView);
        vec3 key=normalize(vec3(-0.7,1.2,1.5));
        vec3 rim=normalize(vec3(1.0,-0.3,-0.8));
        float diffuse=abs(dot(n,key));
        float shine=pow(max(dot(reflect(-key,n),eye),0.0),22.0);
        float edge=pow(1.0-abs(dot(n,eye)),2.5);
        float cool=pow(max(dot(n,rim),0.0),3.0);
        vec3 gold=vec3(0.52,0.32,0.105);
        vec3 color=gold*(0.10+0.78*diffuse)+vec3(0.85,0.74,0.50)*shine*0.85;
        color+=vec3(0.20,0.32,0.49)*cool*0.38+vec3(0.61,0.48,0.24)*edge*0.25;
        // Restrained strand-to-strand variation catches light like the aircraft ribs.
        float strandTone=0.86+0.14*sin(floor((vBand+0.01)/3.0)*2.39996+1.0);
        color*=mix(1.0,strandTone,uWeights.x);
        vec2 map=texture2D(uLandMask,vEarthUv).rg;
        vec3 ocean=vec3(0.012,0.028,0.040)*(0.6+0.6*diffuse);
        vec3 land=vec3(0.48,0.31,0.105)*(0.42+0.65*max(dot(n,key),0.0));
        vec3 earth=mix(ocean,land,map.r)+map.g*vec3(0.12,0.19,0.22);
        earth+=vec3(0.045,0.11,0.16)*edge+vec3(0.7,0.59,0.36)*shine*map.r*0.3;
        color=mix(color,earth,uWeights.z);
        gl_FragColor=vec4(color,1.0);
        #include <colorspace_fragment>
      }`
  });
  // Three connected mesh bands per open ribbon strand; morph topology stays intact.
  const bands=BAND_COUNT,segments=SEGMENTS;
  const positions=new Float32Array(bands*(segments+1)*2*3);
  const params=new Float32Array(bands*(segments+1)*2*2);
  const earthUvs=new Float32Array(params.length);
  const bandIds=new Float32Array(bands*(segments+1)*2);
  const indices=[];
  for(let band=0;band<bands;band++){
    for(let segment=0;segment<=segments;segment++){
      for(let side=0;side<2;side++){
        const vertex=(band*(segments+1)+segment)*2+side;
        params[vertex*2]=segment/segments*Math.PI*2;
        params[vertex*2+1]=ribbonCoordinate(band,side);
        bandIds[vertex]=band;
        earthUvs[vertex*2]=segment/segments;earthUvs[vertex*2+1]=(band+side)/bands;
      }
      if(segment<segments){const a=(band*(segments+1)+segment)*2;indices.push(a,a+2,a+1,a+1,a+2,a+3);}
    }
  }
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));
  geometry.setAttribute('aParam',new THREE.BufferAttribute(params,2));
  geometry.setAttribute('aEarthUv',new THREE.BufferAttribute(earthUvs,2));
  geometry.setAttribute('aBand',new THREE.BufferAttribute(bandIds,1));
  const shapes=makeShapeAttributes();
  geometry.setAttribute('aAirplane',new THREE.BufferAttribute(shapes.airplanePositions,3));
  geometry.setAttribute('aAirplaneNormal',new THREE.BufferAttribute(shapes.airplaneNormals,3));
  geometry.setAttribute('aEarth',new THREE.BufferAttribute(shapes.earthPositions,3));
  geometry.setAttribute('aEarthNormal',new THREE.BufferAttribute(shapes.earthNormals,3));
  geometry.setIndex(indices);
  const sculpture=new THREE.Mesh(geometry,material);
  sculpture.frustumCulled=false;
  scene.add(sculpture);

  let frame=0,last=0,time=0,progress=0,target=0,visible=true,lost=false;
  let pointerX=0,pointerY=0,easedX=0,easedY=0;
  const rotation=createRotation();
  const hint=document.createElement('span');
  hint.className='sculpture-hint';hint.setAttribute('aria-hidden','true');
  host.append(hint);
  function describe(){
    const name=SHAPE_NAMES[morph.index];
    canvas.setAttribute('aria-label',`${name}. Click or press Enter to change shape. Drag or use arrow keys to rotate. Home resets rotation.`);
    host.dataset.shape=name;
    hint.textContent=`${name} · Click to transform · Drag to rotate`;
  }
  function transform(){rotation.stop();morph.next(motion.matches);describe();request();}
  let dragging=null,dragX=0,dragY=0,dragTime=0;
  const clamp=(v,min,max)=>Math.min(max,Math.max(min,v));
  function scroll(){
    const rect=hero.getBoundingClientRect();
    target=clamp(-rect.top/Math.max(1,hero.offsetHeight-innerHeight),0,1);
    if(!motion.matches)request();
  }
  function resize(){
    const w=Math.max(1,host.clientWidth),h=Math.max(1,host.clientHeight);
    const ratio=Math.min(devicePixelRatio||1,1.75,Math.sqrt(2000000/(w*h)));
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
    morph.tick(dt);
    uniforms.uWeights.value.fromArray(morph.weights);uniforms.uMorph.value=motion.matches?0:morph.pulse;
    uniforms.uScroll.value=progress;uniforms.uTime.value=motion.matches?0:time;
    const scrollRotation=progress*(.18+.82*morph.weights[0]);
    sculpture.rotation.set(.35+scrollRotation*.85+easedY*.12,-.65+scrollRotation*1.7+easedX*.18,-.4+scrollRotation*.9+(motion.matches?0:Math.sin(time*.16)*.045));
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
    gesture.start(e.clientX,e.clientY);
    rotation.stop();leave();canvas.setPointerCapture(e.pointerId);
    host.classList.add('is-dragging');
  }
  function drag(e){
    if(e.pointerId!==dragging)return;
    if(gesture.move(e.clientX,e.clientY))rotation.drag(e.clientX-dragX,e.clientY-dragY,Math.min(host.clientWidth,host.clientHeight),(e.timeStamp-dragTime)/1000);
    dragX=e.clientX;dragY=e.clientY;dragTime=e.timeStamp;request();
  }
  function release(e){
    if(e.pointerId!==dragging)return;
    gesture.move(e.clientX,e.clientY);
    const click=e.type==='pointerup'&&gesture.isClick;
    if(e.type!=='pointerup'||motion.matches||e.timeStamp-dragTime>100)rotation.stop();
    dragging=null;host.classList.remove('is-dragging');
    if(canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId);
    if(click)transform();
    request();
  }
  function keyboard(e){
    if(e.key==='Enter'||e.key===' '){e.preventDefault();if(!e.repeat)transform();return;}
    const directions={ArrowLeft:[-24,0],ArrowRight:[24,0],ArrowUp:[0,-24],ArrowDown:[0,24]};
    if(e.key==='Home'){e.preventDefault();rotation.reset();request();return;}
    if(!directions[e.key])return;
    e.preventDefault();rotation.drag(...directions[e.key],Math.min(host.clientWidth,host.clientHeight),.1);rotation.stop();request();
  }
  function leave(){pointerX=0;pointerY=0;}
  function visibility(){if(document.hidden){cancelAnimationFrame(frame);frame=0;}else{last=0;request();}}
  function motionChange(){rotation.stop();if(motion.matches)morph.finish();last=0;scroll();request();}
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
  // Assistive technologies can activate a button without pointer events.
  canvas.addEventListener('click',e=>{if(e.detail===0)transform();});
  host.removeAttribute('aria-hidden');
  canvas.tabIndex=0;canvas.setAttribute('role','button');
  describe();
  canvas.title='Click to transform · Drag to rotate · Home to reset rotation';
  resize();host.classList.add('is-ready');
  addEventListener('pagehide',e=>{if(e.persisted)return;cancelAnimationFrame(frame);observer.disconnect();resizeObserver.disconnect();geometry.dispose();material.dispose();earthMap.dispose();renderer.dispose();},{once:true});
}

try { start(); } catch(error) {
  host.classList.remove('is-ready');
  console.warn('Decorative 3D unavailable; using static artwork.',error.message);
}
