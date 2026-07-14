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
  assert.match(experience, /new THREE\.SpotLight/);
  assert.match(experience, /const fixedStep = 1 \/ 120/);
  assert.match(experience, /function updatePointerTarget/);
  assert.match(experience, /pullStrength/);
  assert.match(experience, /intersectPlane/);
  assert.match(experience, />BEAM</);
  assert.match(experience, /BRIGHTNESS/);
  assert.match(experience, />COLOR</);
  assert.match(page, /<MorsLightExperience \/>/);
  assert.match(layout, /MORS²/);
  assert.match(packageJson, /"three-html-render"/);
});
