# Jaden Wong — Portfolio

Static portfolio with a decorative Three.js ribbon sculpture. Serve the repository root over HTTP:

```sh
python -m http.server 53821 --bind 127.0.0.1
```

Open `http://127.0.0.1:53821/`. No build step or API keys are needed.

The hero artwork is abstract and unrelated to the project content. Native scrolling opens and rotates the ribbon sculpture inside a sticky hero; subtle ambient motion and pointer parallax give it depth. All eleven project cards remain in the normal page below.

Drag the artwork to rotate freely, with momentum on release and no snap-back. On touchscreens, horizontal drags rotate while vertical swipes scroll. Focus the canvas and use arrow keys to rotate or Home to reset. Reduced motion retains direct controls but disables momentum and ambient animation.

- `assets/hero-sculpture.mjs`: procedural ribbon geometry, metallic shader, scroll animation, and lifecycle controls.
- `assets/sculpture-rotation.mjs`: quaternion-based drag rotation and frame-rate-independent momentum. Test with `node --test tests/sculpture-rotation.test.mjs`.
- `assets/hero-sculpture.css`: responsive hero layout and reduced-motion support.
- `assets/sculpture-fallback.svg`: static artwork for unavailable WebGL or JavaScript.
- `assets/vendor/three/`: locally bundled Three.js 0.186.1 and MIT license.

Rendering pauses offscreen and in hidden tabs. Reduced-motion preference uses a still composition and removes the extended scroll section. The browser harness at `tests/compatibility.html` can simulate missing WebGL, reduced motion in JavaScript, and unavailable JavaScript. It does not alter browser preferences.

Boeing internship: June–September 2026, reflected in the hero, About, Experience, metadata, and structured data.
