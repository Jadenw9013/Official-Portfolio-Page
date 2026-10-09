import { Euler, Quaternion, Vector3 } from './vendor/three/three.min.mjs';

export const SHAPE_NAMES = ['Ribbon sculpture', 'Boeing 737-800', 'Earth'];
export const BAND_COUNT = 96;
export const SEGMENTS = 256;
const TAU = Math.PI * 2;
const mix = (a,b,t) => a+(b-a)*t;
const clamp = value => Math.max(0,Math.min(1,value));
const base = new Quaternion().setFromEuler(new Euler(.35,-.65,-.4));
const earthView = base.clone().invert();
const airplaneView = base.clone().invert().multiply(new Quaternion().setFromEuler(new Euler(.92,-.65,-.48)));

// Stylized 737-800, with length/span proportions informed by Boeing's 737NG
// airport-planning drawings. No external model or aircraft texture is loaded.
// Model coordinates: +Z nose, +Y up, +/-X wing span. Scale: length = 6 units.
function airplane(band,u,v) {
  if(band<32){
    const angle=(band+v)/32*TAU;
    const z=mix(-3,3,u);
    const nose=clamp((3-z)/.66),tail=clamp((z+3)/1.1);
    const radius=.286*Math.sqrt(Math.sin(nose*Math.PI/2))*Math.pow(tail,.7);
    return [Math.cos(angle)*radius,Math.sin(angle)*radius+.035*(1-tail),z];
  }
  if(band<56){
    // Chordwise strips span swept, tapered wings; upper and lower surfaces.
    const b=band-32,side=b<12?-1:1,local=b%12;
    const s=(local+v)/12;
    const x=mix(.20,2.61,u),leading=mix(.48,-1.12,u),trailing=mix(-1.06,-1.43,u);
    return [side*x,-.13+u*.18+Math.sin(s*TAU)*.045*(1-u*.7),mix(leading,trailing,(1-Math.cos(s*TAU))/2)];
  }
  if(band<68){
    const b=band-56,side=b<6?-1:1,s=(b%6+v)/6;
    return [side*mix(.12,1.02,u),.12+u*.14+Math.sin(s*TAU)*.018,mix(mix(-1.96,-2.55,u),mix(-2.74,-2.83,u),(1-Math.cos(s*TAU))/2)];
  }
  if(band<76){
    const s=(band-68+v)/8;
    return [Math.sin(s*TAU)*.034*(1-u*.8),mix(.12,1.20,u),mix(mix(-1.72,-2.50,u),mix(-2.83,-2.91,u),(1-Math.cos(s*TAU))/2)];
  }
  if(band<88){
    // Open nacelles, including the characteristic flattened lower contour.
    const b=band-76,side=b<6?-1:1,angle=(b%6+v)/6*TAU;
    const profile=.17+.042*Math.sin(u*Math.PI);
    const y=Math.max(-.15,Math.sin(angle)*profile);
    return [side*.87+Math.cos(angle)*profile,-.36+y,mix(.52,-.15,u)];
  }
  if(band<92){
    const b=band-88,side=b<2?-1:1,s=(b%2+v)/2;
    return [side*(2.61+u*.105),.05+u*.40,mix(-1.12-u*.15,-1.43-u*.015,s)];
  }
  // Engine pylons connect nacelles to the wing, visible from below.
  const b=band-92,side=b<2?-1:1,s=(b%2+v)/2;
  return [side*.87+(s-.5)*.035,mix(-.33,-.095,u),mix(.20,-.26,s)];
}

// Every adjacent latitude strip meets exactly: no gaps or double-sided ocean.
export function earthPoint(band,u,v) {
  const latitude=((band+(v-.08)/.74)/BAND_COUNT-.5)*Math.PI;
  const longitude=(u-.5)*TAU;
  return [2.24*Math.cos(latitude)*Math.sin(longitude),2.24*Math.sin(latitude),2.24*Math.cos(latitude)*Math.cos(longitude)];
}
const earth=earthPoint;

export function makeShapeAttributes(bands=BAND_COUNT,segments=SEGMENTS){
  if(bands!==BAND_COUNT)throw new Error('Shape topology requires 96 ribbons.');
  const count=bands*(segments+1)*2;
  const airplanePositions=new Float32Array(count*3),airplaneNormals=new Float32Array(count*3);
  const earthPositions=new Float32Array(count*3),earthNormals=new Float32Array(count*3);
  const point=new Vector3(),du=new Vector3(),dv=new Vector3(),normal=new Vector3(),previous=new Vector3();
  for(const [shape,view,positions,normals] of [[airplane,airplaneView,airplanePositions,airplaneNormals],[earth,earthView,earthPositions,earthNormals]]){
    for(let band=0;band<bands;band++)for(let segment=0;segment<=segments;segment++)for(let side=0;side<2;side++){
      const index=((band*(segments+1)+segment)*2+side)*3;
      const u=segment/segments,v=side===0?.08:.82,b=band;
      point.fromArray(shape(b,u,v));
      const ua=Math.max(.00001,u-.0001),ub=Math.min(.99999,u+.0001);
      du.fromArray(shape(b,ub,v)).sub(previous.fromArray(shape(b,ua,v)));
      dv.fromArray(shape(b,u,v+.001)).sub(point);
      normal.crossVectors(du,dv).normalize();
      if(shape===earth)normal.copy(point).normalize();
      if(normal.lengthSq()<.01)normal.set(0,1,0);
      point.applyQuaternion(view).toArray(positions,index);
      normal.applyQuaternion(view).toArray(normals,index);
    }
  }
  return {airplanePositions,airplaneNormals,earthPositions,earthNormals};
}

export function createMorph(){
  let index=0,elapsed=1.65,from=[1,0,0],initialPulse=0;
  const weights=[1,0,0];
  return {
    weights,
    get index(){return index;},
    get active(){return elapsed<1.65;},
    get pulse(){const t=Math.min(1,elapsed/1.65);return initialPulse*(1-t)+Math.sin(Math.PI*t)*(1-initialPulse);},
    next(reduced=false){initialPulse=reduced?0:this.pulse;from=weights.slice();index=(index+1)%3;elapsed=reduced?1.65:0;this.tick(0);},
    tick(dt){
      elapsed=Math.min(1.65,elapsed+dt);
      const t=elapsed/1.65,ease=t*t*t*(t*(t*6-15)+10);
      for(let i=0;i<3;i++)weights[i]=mix(from[i],i===index?1:0,ease);
    },
    finish(){elapsed=1.65;this.tick(0);}
  };
}

export function createGesture(){
  let x=0,y=0,moved=false;
  return {
    start(px,py){x=px;y=py;moved=false;},
    move(px,py){moved ||= Math.hypot(px-x,py-y)>6;return moved;},
    get isClick(){return !moved;}
  };
}
