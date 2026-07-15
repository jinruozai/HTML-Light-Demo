import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("server-renders the MORS² light experience shell", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>MORS² — Meta is observed by Rule to Step in Space — MORS²<\/title>/i);
  assert.match(html, /Interactive MORS² light study/);
  assert.match(html, /Meta is observed/);
  assert.match(html, /A Rust engine architecture/);
  assert.match(html, /EARLY DEVELOPMENT/);
});

test("keeps the light, controls, and simulation in the shipped source", async () => {
  const [experience, page, layout, packageJson] = await Promise.all([
    readFile(new URL("../app/MorsLightExperience.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
  ]);

  assert.match(experience, /new THREE\.HTMLTexture/);
  assert.match(experience, /function installThreeHtmlTextureCompatibility/);
  assert.match(experience, /value: function texElementImage2D\(/);
  assert.match(experience, /new THREE\.HemisphereLight/);
  assert.match(experience, /new THREE\.DirectionalLight/);
  assert.match(experience, /new THREE\.SpotLight/);
  assert.doesNotMatch(experience, /ConeGeometry/);
  assert.match(experience, /event\.button === 2/);
  assert.match(experience, /Math\.round\(beamStartAngle \+ movementX \* 0\.14\)/);
  assert.match(experience, /shouldCycleColor/);
  assert.match(experience, /contextmenu/);
  assert.match(experience, /const BASE_LIGHT_DIRECTION = DOWN\.clone\(\)/);
  assert.match(experience, /const cameraDrop = portrait/);
  assert.match(experience, /const upwardTarget = portrait/);
  assert.match(experience, /const fixedStep = 1 \/ 120/);
  assert.match(experience, /function updatePointerTarget/);
  assert.match(experience, /pullStrength/);
  assert.match(experience, /intersectPlane/);
  assert.doesNotMatch(experience, /isInteractiveTarget/);
  assert.doesNotMatch(experience, /event\.preventDefault\(\)/);
  assert.match(experience, />BEAM</);
  assert.match(experience, /BRIGHTNESS/);
  assert.match(experience, />COLOR</);
  assert.match(page, /<MorsLightExperience \/>/);
  assert.match(layout, /MORS²/);
  assert.match(packageJson, /"three-html-render"/);
});

test("keeps the GitHub Pages static deployment configured", async () => {
  const [nextConfig, workflow, readme, experience] = await Promise.all([
    readFile(new URL("../next.config.ts", import.meta.url), "utf8"),
    readFile(new URL("../.github/workflows/deploy-pages.yml", import.meta.url), "utf8"),
    readFile(new URL("../README.md", import.meta.url), "utf8"),
    readFile(new URL("../app/MorsLightExperience.tsx", import.meta.url), "utf8"),
  ]);

  assert.match(nextConfig, /output: "export"/);
  assert.match(nextConfig, /basePath/);
  assert.match(experience, /NEXT_PUBLIC_BASE_PATH/);
  assert.match(workflow, /actions\/configure-pages@v5/);
  assert.match(workflow, /actions\/upload-pages-artifact@v4/);
  assert.match(workflow, /actions\/deploy-pages@v5/);
  assert.match(readme, /https:\/\/jinruozai\.github\.io\/HTML-Light-Demo\//);
});
