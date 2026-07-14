# MORS² Light Study

An interactive Three.js landing page for the MORS² game engine. The website is
rendered into the 3D scene through HTML-in-Canvas and lit by a physically
simulated hanging spotlight.

## Interaction

- Press anywhere outside the controls: the lamp aims at the pointer and an
  invisible spring pulls the pendulum toward that 3D target. Farther targets
  store more release energy.
- Adjust beam angle, luminous intensity, color, and power from the page itself.
- Select an engine concept to read how Space, Meta, Field, Rule, and Latent fit
  together.
- Release to hand both stored spring energy and pointer momentum to the free
  3D pendulum. Double-click the background or use reset to restore it.

## Development

```bash
npm install
npm run dev
npm run lint
npm test
```

The simulation uses a fixed 120 Hz constrained Verlet step. Rendering sleeps
when the pendulum and page are idle, and resumes on input, resize, or texture
updates.
