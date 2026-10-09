import test from 'node:test';
import assert from 'node:assert/strict';
import { createRotation } from '../assets/sculpture-rotation.mjs';

test('drag rotates freely on both axes and retains its orientation',()=>{
  const spin=createRotation();
  spin.drag(120,80,600,.1);
  assert.ok(Math.abs(spin.orientation.x)>.1);
  assert.ok(Math.abs(spin.orientation.y)>.1);
  const held=spin.orientation.clone();
  spin.stop();spin.coast(1);
  assert.ok(held.angleTo(spin.orientation)<1e-7);
  for(let i=0;i<1000;i++)spin.drag(25,-15,600,.016);
  assert.ok(Math.abs(spin.orientation.length()-1)<1e-10);
});
test('momentum is frame-rate independent and decays to rest',()=>{
  const a=createRotation(),b=createRotation();
  for(const spin of [a,b])spin.drag(40,20,600,.05);
  for(let i=0;i<60;i++)a.coast(1/60);
  for(let i=0;i<120;i++)b.coast(1/120);
  assert.ok(a.orientation.angleTo(b.orientation)<1e-7);
  for(let i=0;i<600;i++)a.coast(1/60);
  const rest=a.orientation.clone();a.coast(1);
  assert.ok(rest.angleTo(a.orientation)<1e-7);
  a.reset();assert.equal(a.orientation.w,1);
});
