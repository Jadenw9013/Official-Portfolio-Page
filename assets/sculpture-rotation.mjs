import { Quaternion, Vector3 } from './vendor/three/three.min.mjs';

// Screen-space rotation, composed as quaternions: no pole limits or Euler lock.
export function createRotation() {
  const orientation = new Quaternion();
  const axis = new Vector3();
  const delta = new Quaternion();
  let speed = 0;
  function rotate(angle) {
    delta.setFromAxisAngle(axis, angle);
    orientation.premultiply(delta).normalize();
  }
  return {
    orientation,
    drag(dx, dy, size, seconds) {
      const distance = Math.hypot(dx, dy);
      if (!distance) return;
      axis.set(dy, dx, 0).normalize();
      const angle = distance * Math.PI * 2 / Math.max(240, size);
      rotate(angle);
      speed = Math.min(8, angle / Math.max(.008, seconds));
    },
    coast(seconds) {
      const decay = Math.exp(-3.2 * seconds);
      rotate(speed * (1 - decay) / 3.2);
      speed *= decay;
      if (speed < .005) speed = 0;
    },
    stop() { speed = 0; },
    reset() { speed = 0; orientation.identity(); }
  };
}
