import test from 'node:test';
import assert from 'node:assert/strict';
import { BAND_COUNT, SEGMENTS, SHAPE_NAMES, makeShapeAttributes, createMorph, createGesture, earthPoint } from '../assets/sculpture-shapes.mjs';
import { ribbonPoint, ribbonCoordinate, RIBBON_STRANDS } from '../assets/sculpture-ribbon.mjs';

test('open ribbon has 32 separated strands with connected sub-bands and closed loops',()=>{
  assert.equal(BAND_COUNT,RIBBON_STRANDS*3);
  for(let band=0;band<BAND_COUNT;band++){
    const start=ribbonCoordinate(band,0),end=ribbonCoordinate(band,1);
    assert.ok(start<end&&start>=-1&&end<=1);
    if(band<BAND_COUNT-1){
      const next=ribbonCoordinate(band+1,0);
      if(band%3===2)assert.ok(next-end>.02);
      else assert.ok(Math.abs(end-next)<1e-12);
    }
    for(const v of [start,end])for(const scroll of [0,.5,1]){
      const a=ribbonPoint(0,v,scroll),b=ribbonPoint(Math.PI*2,v,scroll);
      assert.ok(Math.hypot(...a.map((value,i)=>value-b[i]))<1e-10);
    }
  }
});

test('ribbon remains closed, including seam tangents, at all scroll positions',()=>{
  for(const scroll of [0,.25,.5,.75,1])for(const time of [0,4,21])for(const v of [-1,-.5,0,.5,1]){
    const a=ribbonPoint(0,v,scroll,time),b=ribbonPoint(Math.PI*2,v,scroll,time);
    assert.ok(Math.hypot(...a.map((n,i)=>n-b[i]))<1e-10);
    const da=ribbonPoint(.0001,v,scroll,time),db=ribbonPoint(Math.PI*2+.0001,v,scroll,time);
    assert.ok(Math.hypot(...da.map((n,i)=>n-db[i]))<1e-10);
  }
});
test('Earth has a constant radius and gap-free latitude and longitude seams',()=>{
  assert.deepEqual(SHAPE_NAMES,['Ribbon sculpture','Boeing 737-800','Earth']);
  for(let band=0;band<BAND_COUNT;band++)for(const u of [0,.25,.5,.75,1]){
    const p=earthPoint(band,u,.08);
    assert.ok(Math.abs(Math.hypot(...p)-2.24)<1e-10);
    const a=earthPoint(band,u,.82),b=earthPoint(band+1,u,.08);
    assert.ok(Math.hypot(...a.map((n,i)=>n-b[i]))<1e-10);
  }
  for(let band=0;band<BAND_COUNT;band++){
    const a=earthPoint(band,0,.08),b=earthPoint(band,1,.08);
    assert.ok(Math.hypot(...a.map((n,i)=>n-b[i]))<1e-10);
  }
});

test('all morph targets share topology, finite bounded positions and unit normals',()=>{
  const shapes=makeShapeAttributes();
  for(const [name,array] of Object.entries(shapes)){
    assert.equal(array.length,BAND_COUNT*(SEGMENTS+1)*6);
    for(const value of array)assert.ok(Number.isFinite(value)&&Math.abs(value)<4,name);
    if(name.endsWith('Normals'))for(let i=0;i<array.length;i+=3)assert.ok(Math.abs(Math.hypot(...array.subarray(i,i+3))-1)<1e-5);
  }
});
test('morphs cycle, remain continuous on interruption and settle exactly',()=>{
  const morph=createMorph();morph.next();morph.tick(.7);
  const previous=morph.weights.slice(),pulse=morph.pulse;morph.next();
  assert.deepEqual(morph.weights,previous);
  assert.ok(Math.abs(morph.pulse-pulse)<1e-10);
  morph.tick(2);assert.deepEqual(morph.weights,[0,0,1]);
  assert.equal(morph.active,false);
  morph.next(true);assert.deepEqual(morph.weights,[1,0,0]);
  morph.next();morph.tick(.3);morph.finish();assert.deepEqual(morph.weights,[0,1,0]);
});
test('dragging away and back cannot accidentally trigger a morph',()=>{
  const gesture=createGesture();gesture.start(10,10);gesture.move(13,12);assert.equal(gesture.isClick,true);
  gesture.move(50,10);gesture.move(10,10);assert.equal(gesture.isClick,false);
  gesture.start(5,5);assert.equal(gesture.isClick,true);
});
