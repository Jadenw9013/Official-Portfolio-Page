# Jaden Wong — Portfolio

Static portfolio with a decorative Three.js ribbon sculpture. Serve the repository root over HTTP:

```sh
python -m http.server 53821 --bind 127.0.0.1
```

Open `http://127.0.0.1:53821/`. No build step or API keys are needed.

The hero artwork is decorative and unrelated to the project content. Native scrolling deforms and rotates the ribbon sculpture inside a sticky hero; subtle ambient motion and pointer parallax give it depth. Click to morph between the original sculpture, a stylized Boeing 737-800, and an Earth globe. The same ribbon mesh flows between targets, with interruption-safe transitions. All eleven project cards remain in the normal page below.

The ribbon uses 32 individually closed gold strands with varied widths and generous negative space. Three connected mesh bands form each strand, keeping the shared morph topology while avoiding the dense subpixel slits of the earlier version. The loops remain closed throughout scrolling. The Earth target is watertight, with gold land, dark oceans, and a subtle graticule; drag it to explore every hemisphere.

Drag the artwork to rotate freely, with momentum on release and no snap-back. Moving more than six pixels suppresses the click action, even if the pointer returns to its starting position. On touchscreens, horizontal drags rotate while vertical swipes scroll. Focus the canvas and use arrow keys to rotate, Home to reset rotation, or Enter/Space to change shapes. Reduced motion retains direct controls but changes shapes immediately and disables momentum and ambient animation.

- `assets/hero-sculpture.mjs`: procedural ribbon geometry, metallic shader, scroll animation, and lifecycle controls.
- `assets/sculpture-rotation.mjs`: quaternion-based drag rotation and frame-rate-independent momentum. Test with `node --test tests/sculpture-rotation.test.mjs`.
- `assets/sculpture-shapes.mjs`: shared-topology aircraft/Earth geometry, morph state, and click-versus-drag classification. Test with `node --test tests/sculpture-shapes.test.mjs`.
- `assets/sculpture-ribbon.mjs`: closed periodic ribbon deformation, regression-tested across scroll positions.
- `assets/earth-texture.mjs` and `assets/earth-land.geojson`: local coastline mask from public-domain Natural Earth data; no external map service is contacted at runtime.
- `assets/hero-sculpture.css`: responsive hero layout and reduced-motion support.
- `assets/sculpture-fallback.svg`: static artwork for unavailable WebGL or JavaScript.
- `assets/vendor/three/`: locally bundled Three.js 0.186.1 and MIT license.

Rendering pauses offscreen and in hidden tabs. Reduced-motion preference uses a still composition and removes the extended scroll section. The browser harness at `tests/compatibility.html` can simulate missing WebGL, reduced motion in JavaScript, and unavailable JavaScript. It does not alter browser preferences.

Boeing internship: June–September 2026, reflected in the hero, About, Experience, metadata, and structured data.

Aircraft proportions are informed by [Boeing's 737NG airport-planning drawings](https://www.boeing.com/content/dam/boeing/v2/airports/acaps/737NG_REV_C.pdf). This is a decorative interpretation, not an engineering-accurate replica or a Boeing endorsement.

## Runtime

Production requires no Node.js server, npm install, or build step. The tracked project is a static site; ignored Next.js scaffold/build remnants are not part of deployment. Node.js is optional for the built-in test runner only. Use a current, patched LTS version (Node 24 LTS recommended); no Node 20 dependency or deployment pin is present. Run all tests with `node --test tests/sculpture-rotation.test.mjs tests/sculpture-shapes.test.mjs`.
