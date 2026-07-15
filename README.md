<div align="center">

# HTML Light Demo

An interactive **HTML-in-Canvas** lighting experiment powered by Three.js.

<a href="https://jinruozai.github.io/HTML-Light-Demo/">
  <img src="https://img.shields.io/badge/Live_Demo-Open-2ea44f?style=for-the-badge&logo=githubpages&logoColor=white" alt="Open the online demo" />
</a>
<a href="https://x.com/LazyGooooo">
  <img src="https://img.shields.io/badge/Follow-@LazyGooooo-000000?style=for-the-badge&logo=x&logoColor=white" alt="Follow @LazyGooooo on X" />
</a>

**[在线体验 Demo →](https://jinruozai.github.io/HTML-Light-Demo/)**

</div>

![A hanging spotlight illuminating an interactive surface](./public/og.png)

HTML Light Demo renders a real HTML interface inside a Three.js scene with
[`three-html-render`](https://www.npmjs.com/package/three-html-render), then
illuminates it with a physics-driven hanging spotlight. Pull the lamp, reshape
the beam, and change its color or brightness—the HTML surface reacts in real
time.

## Highlights

- Real HTML rendered into WebGL through HTML-in-Canvas
- Physically simulated pendulum motion with a constrained Verlet solver
- Live spotlight angle, brightness, color, and power controls
- Mouse-driven aiming, pulling, release momentum, and reset interactions
- Idle-aware rendering that sleeps when the scene is stable

## Controls

| Input | Action |
| --- | --- |
| Left mouse | Pull and aim the lamp |
| Release | Let the lamp swing freely |
| Right-drag | Adjust the beam angle |
| Right-click | Cycle the light color |
| Double-click | Reset the lamp |

## Built With

- [three-html-render](https://www.npmjs.com/package/three-html-render) — HTML-in-Canvas rendering
- [Three.js](https://threejs.org/) — 3D scene, materials, and lighting
- [React](https://react.dev/) and [TypeScript](https://www.typescriptlang.org/) — interface and application logic
- [Vinext](https://github.com/cloudflare/vinext) and [Vite](https://vite.dev/) — development and build pipeline

## Getting Started

Requires Node.js 22.13 or newer.

```bash
git clone https://github.com/jinruozai/HTML-Light-Demo.git
cd HTML-Light-Demo
npm install
npm run dev
```

Quality checks:

```bash
npm run lint
npm test
```

## Credits

This is an unofficial recreation inspired by
[@kaolti](https://x.com/kaolti). The original concept and art direction are
credited to @kaolti. This independent implementation was created for learning
and demonstration and is not officially affiliated with the original creator.

## License

Released under the [MIT License](./LICENSE).
