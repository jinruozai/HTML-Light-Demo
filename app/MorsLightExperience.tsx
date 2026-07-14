"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { InteractionManager } from "three/addons/interaction/InteractionManager.js";

type HtmlCanvas = HTMLCanvasElement & {
  requestPaint?: () => void;
};

type LightRig = {
  spot: THREE.SpotLight;
  bulbLight: THREE.PointLight;
  bulbMaterial: THREE.MeshStandardMaterial;
  glowMaterial: THREE.SpriteMaterial;
  beamMaterial: THREE.MeshBasicMaterial;
  beam: THREE.Mesh;
};

type LightingSettings = {
  enabled: boolean;
  angle: number;
  brightness: number;
  color: string;
};

const CONCEPTS = {
  Space: "A sandbox universe where runtime state evolves with clear boundaries.",
  Meta: "A basic game unit that owns fields and receives rules.",
  Field: "Explicit data that keeps layout derivable and tightly packed.",
  Rule: "Rules declare what they need, and runtime derives the layout.",
  Latent: "Long-lived space-level systems for global capability and reusable scratch.",
} as const;

const COLOR_PRESETS = ["#ffb36b", "#ffd9a3", "#8fdcff", "#c79cff", "#ff5f7f"];

const INITIAL_LIGHT: LightingSettings = {
  enabled: true,
  angle: 34,
  brightness: 1450,
  color: "#ffb36b",
};

const DOWN = new THREE.Vector3(0, -1, 0);
const UP = new THREE.Vector3(0, 1, 0);
const BASE_LIGHT_DIRECTION = new THREE.Vector3(0, -0.79, -0.614).normalize();

export function MorsLightExperience() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pageSourceRef = useRef<HTMLDivElement>(null);
  const lightRigRef = useRef<LightRig | null>(null);
  const wakeRef = useRef<(() => void) | null>(null);
  const resetMotionRef = useRef<(() => void) | null>(null);
  const [concept, setConcept] = useState<keyof typeof CONCEPTS>("Space");
  const [lighting, setLighting] = useState<LightingSettings>(INITIAL_LIGHT);
  const [htmlCanvasReady, setHtmlCanvasReady] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    canvasRef.current?.setAttribute("layoutsubtree", "");

    void import("three-html-render/polyfill")
      .then(({ installHtmlInCanvasPolyfill }) => {
        if (!active) return;
        installHtmlInCanvasPolyfill();
        setHtmlCanvasReady(true);
      })
      .catch((polyfillError: unknown) => {
        console.error("HTML-in-Canvas could not be initialized.", polyfillError);
        if (active) {
          setError("HTML-in-Canvas is not available in this browser.");
        }
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!htmlCanvasReady) return;
    const canvas = canvasRef.current as HtmlCanvas;
    const pageSource = pageSourceRef.current as HTMLDivElement;
    if (!canvas || !pageSource) return;

    let disposed = false;
    let frame = 0;
    let animationFrame = 0;
    let resizeFrame = 0;
    let lastTime = performance.now();
    let accumulator = 0;
    let stableFrames = 0;
    let pulling = false;
    let pullPointerId = -1;
    let lastPointerTime = 0;
    let pullStrength = 0;

    const fixedStep = 1 / 120;
    const ropeLength = 1.62;
    const gravity = new THREE.Vector3(0, -9.81, 0);
    const anchor = new THREE.Vector3(0, 4.72, 2.42);
    const position = new THREE.Vector3(0.16, anchor.y - ropeLength, anchor.z + 0.08);
    const previous = position.clone().add(new THREE.Vector3(0.018, 0, -0.012));
    const aimTarget = new THREE.Vector3(0, 0.3, 0.08);
    const pointerVelocity = new THREE.Vector3();
    const lastPointerTarget = aimTarget.clone();

    const temp = new THREE.Vector3();
    const tempB = new THREE.Vector3();
    const tempC = new THREE.Vector3();
    const velocity = new THREE.Vector3();
    const ropeDirection = new THREE.Vector3();
    const lightDirection = new THREE.Vector3();
    const currentLightDirection = BASE_LIGHT_DIRECTION.clone();
    const midpoint = new THREE.Vector3();
    const swingQuaternion = new THREE.Quaternion();
    const lampQuaternion = new THREE.Quaternion();
    const cableQuaternion = new THREE.Quaternion();
    const pointer = new THREE.Vector2();
    const lampNdc = new THREE.Vector3();
    const interactionPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), -0.08);
    const raycaster = new THREE.Raycaster();

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
        alpha: true,
        powerPreference: "high-performance",
      });
    } catch (rendererError) {
      console.error(rendererError);
      const errorTimer = window.setTimeout(() => {
        if (!disposed) {
          setError("This experience needs WebGL to render the MORS² light study.");
        }
      }, 0);
      return () => {
        disposed = true;
        window.clearTimeout(errorTimer);
      };
    }

    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.NeutralToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.setClearColor(0x010204, 1);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x010204);

    const camera = new THREE.PerspectiveCamera(37, 1, 0.1, 80);
    camera.position.set(0, 0.2, 13.6);

    const pageGroup = new THREE.Group();
    pageGroup.position.set(0, -0.35, 0);
    scene.add(pageGroup);

    const pageTexture = new THREE.HTMLTexture(pageSource);
    pageTexture.colorSpace = THREE.SRGBColorSpace;
    pageTexture.minFilter = THREE.LinearFilter;
    pageTexture.magFilter = THREE.LinearFilter;
    pageTexture.generateMipmaps = false;

    const pageGeometry = new THREE.PlaneGeometry(1, 1, 1, 1);
    const pageMaterial = new THREE.MeshStandardMaterial({
      map: pageTexture,
      color: 0xc5cad4,
      roughness: 0.96,
      metalness: 0,
      transparent: true,
      alphaTest: 0.005,
      side: THREE.FrontSide,
    });
    const pageMesh = new THREE.Mesh(pageGeometry, pageMaterial);
    pageMesh.receiveShadow = true;
    pageGroup.add(pageMesh);

    const backingMaterial = new THREE.MeshStandardMaterial({
      color: 0x080a10,
      roughness: 0.9,
      metalness: 0.03,
    });
    const backing = new THREE.Mesh(new THREE.PlaneGeometry(1.018, 1.028), backingMaterial);
    backing.position.z = -0.035;
    pageGroup.add(backing);

    const ambient = new THREE.HemisphereLight(0x53647f, 0x080706, 0.28);
    scene.add(ambient);

    const lampRoot = new THREE.Group();
    scene.add(lampRoot);

    const ceilingCap = new THREE.Mesh(
      new THREE.CylinderGeometry(0.24, 0.3, 0.11, 32),
      new THREE.MeshStandardMaterial({ color: 0x101218, roughness: 0.64, metalness: 0.7 }),
    );
    ceilingCap.position.copy(anchor).add(new THREE.Vector3(0, 0.08, 0));
    scene.add(ceilingCap);

    const cable = new THREE.Mesh(
      new THREE.CylinderGeometry(0.014, 0.014, 1, 10),
      new THREE.MeshStandardMaterial({ color: 0x121318, roughness: 0.5, metalness: 0.55 }),
    );
    scene.add(cable);

    const shadeGroup = new THREE.Group();
    lampRoot.add(shadeGroup);

    const shadeProfile = [
      new THREE.Vector2(0.08, 0.08),
      new THREE.Vector2(0.18, 0.02),
      new THREE.Vector2(0.43, -0.16),
      new THREE.Vector2(0.82, -0.39),
      new THREE.Vector2(1.08, -0.54),
      new THREE.Vector2(1.1, -0.6),
    ];
    const shadeMaterial = new THREE.MeshStandardMaterial({
      color: 0x101116,
      roughness: 0.36,
      metalness: 0.74,
      side: THREE.DoubleSide,
    });
    const shade = new THREE.Mesh(new THREE.LatheGeometry(shadeProfile, 64), shadeMaterial);
    shadeGroup.add(shade);

    const rim = new THREE.Mesh(
      new THREE.TorusGeometry(1.095, 0.027, 10, 64),
      new THREE.MeshStandardMaterial({ color: 0x17191f, roughness: 0.28, metalness: 0.82 }),
    );
    rim.rotation.x = Math.PI / 2;
    rim.position.y = -0.585;
    shadeGroup.add(rim);

    const undersideMaterial = new THREE.MeshStandardMaterial({
      color: 0x5f462c,
      emissive: 0xff9f52,
      emissiveIntensity: 0.42,
      roughness: 0.92,
      side: THREE.DoubleSide,
    });
    const underside = new THREE.Mesh(new THREE.CircleGeometry(1.055, 64), undersideMaterial);
    underside.rotation.x = Math.PI / 2;
    underside.position.y = -0.572;
    shadeGroup.add(underside);

    const connector = new THREE.Mesh(
      new THREE.CylinderGeometry(0.095, 0.12, 0.24, 24),
      new THREE.MeshStandardMaterial({ color: 0x9c6744, roughness: 0.44, metalness: 0.66 }),
    );
    connector.position.y = 0.1;
    shadeGroup.add(connector);

    const bulbMaterial = new THREE.MeshStandardMaterial({
      color: 0xffd7ad,
      emissive: INITIAL_LIGHT.color,
      emissiveIntensity: 3.2,
      roughness: 0.2,
    });
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.16, 24, 16), bulbMaterial);
    bulb.scale.y = 1.42;
    bulb.position.y = -0.48;
    shadeGroup.add(bulb);

    const glowTexture = createGlowTexture();
    const glowMaterial = new THREE.SpriteMaterial({
      map: glowTexture,
      color: INITIAL_LIGHT.color,
      transparent: true,
      opacity: 0.86,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const glow = new THREE.Sprite(glowMaterial);
    glow.position.y = -0.52;
    glow.scale.set(0.96, 0.96, 0.96);
    shadeGroup.add(glow);

    const spot = new THREE.SpotLight(
      INITIAL_LIGHT.color,
      1,
      18,
      THREE.MathUtils.degToRad(INITIAL_LIGHT.angle),
      0.76,
      2,
    );
    spot.power = INITIAL_LIGHT.brightness;
    spot.position.set(0, -0.5, 0);
    spot.target.position.set(0, -7, 0);
    shadeGroup.add(spot, spot.target);

    const bulbLight = new THREE.PointLight(INITIAL_LIGHT.color, 1, 3.2, 2);
    bulbLight.power = 36;
    bulbLight.position.set(0, -0.5, 0);
    shadeGroup.add(bulbLight);

    const beamMaterial = new THREE.MeshBasicMaterial({
      color: INITIAL_LIGHT.color,
      transparent: true,
      opacity: 0.058,
      side: THREE.BackSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const beam = new THREE.Mesh(new THREE.ConeGeometry(1, 1, 48, 1, true), beamMaterial);
    beam.position.y = -3.4;
    beam.renderOrder = 2;
    shadeGroup.add(beam);

    lightRigRef.current = { spot, bulbLight, bulbMaterial, glowMaterial, beamMaterial, beam };

    const interactions = new InteractionManager();
    interactions.connect(renderer, camera);
    interactions.add(pageMesh);

    function createGlowTexture() {
      const textureCanvas = document.createElement("canvas");
      textureCanvas.width = 128;
      textureCanvas.height = 128;
      const context = textureCanvas.getContext("2d");
      if (context) {
        const gradient = context.createRadialGradient(64, 64, 0, 64, 64, 64);
        gradient.addColorStop(0, "rgba(255,255,255,1)");
        gradient.addColorStop(0.16, "rgba(255,222,172,.8)");
        gradient.addColorStop(0.46, "rgba(255,170,94,.22)");
        gradient.addColorStop(1, "rgba(255,140,70,0)");
        context.fillStyle = gradient;
        context.fillRect(0, 0, 128, 128);
      }
      const texture = new THREE.CanvasTexture(textureCanvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      return texture;
    }

    function resize() {
      const width = Math.max(1, canvas.clientWidth);
      const height = Math.max(1, canvas.clientHeight);
      const dpr = Math.min(window.devicePixelRatio || 1, width < 760 ? 1.35 : 1.7);
      renderer.setPixelRatio(dpr);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();

      const sourceWidth = pageSource.offsetWidth || 1440;
      const sourceHeight = pageSource.offsetHeight || 810;
      const portrait = height > width * 1.16;
      const pageWidth = portrait ? 7.2 : 12.8;
      const pageHeight = pageWidth * (sourceHeight / sourceWidth);
      pageMesh.scale.set(pageWidth, pageHeight, 1);
      backing.scale.set(pageWidth, pageHeight, 1);

      pageGroup.position.y = portrait ? -0.62 : -0.38;
      anchor.set(0, pageGroup.position.y + pageHeight / 2 + 1.52, portrait ? 2.14 : 2.42);
      ceilingCap.position.copy(anchor).add(new THREE.Vector3(0, 0.08, 0));

      if (!pulling) {
        const constrained = temp.copy(position).sub(anchor);
        if (constrained.lengthSq() < 0.001) constrained.copy(DOWN);
        constrained.normalize().multiplyScalar(ropeLength);
        position.copy(anchor).add(constrained);
        previous.copy(position);
      }

      const fitHeight = pageHeight + 3.1;
      const fitWidth = pageWidth + 1.25;
      const halfFov = THREE.MathUtils.degToRad(camera.fov * 0.5);
      const distanceForHeight = fitHeight / (2 * Math.tan(halfFov));
      const distanceForWidth = fitWidth / (2 * Math.tan(halfFov) * camera.aspect);
      camera.position.set(0, pageGroup.position.y + 0.52, Math.max(distanceForHeight, distanceForWidth));
      camera.lookAt(0, pageGroup.position.y + 0.2, 0);
      camera.updateMatrixWorld();
      interactions.update();
      canvas.requestPaint?.();
      wake();
    }

    function updateRig() {
      ropeDirection.copy(position).sub(anchor).normalize();
      midpoint.copy(anchor).add(position).multiplyScalar(0.5);
      cable.position.copy(midpoint);
      cable.scale.set(1, ropeLength, 1);
      cableQuaternion.setFromUnitVectors(UP, ropeDirection);
      cable.quaternion.copy(cableQuaternion);

      if (pulling) {
        lightDirection.copy(aimTarget).sub(position).normalize();
        currentLightDirection.lerp(lightDirection, 0.32).normalize();
      } else {
        swingQuaternion.setFromUnitVectors(DOWN, ropeDirection);
        lightDirection.copy(BASE_LIGHT_DIRECTION).applyQuaternion(swingQuaternion).normalize();
        currentLightDirection.lerp(lightDirection, 0.14).normalize();
      }
      lampQuaternion.setFromUnitVectors(DOWN, currentLightDirection);
      lampRoot.position.copy(position);
      lampRoot.quaternion.copy(lampQuaternion);

      ceilingCap.rotation.y += 0.0005;
    }

    function stepPhysics() {
      velocity.copy(position).sub(previous).multiplyScalar(pulling ? 0.985 : 0.9965);
      previous.copy(position);
      position.add(velocity).addScaledVector(gravity, fixedStep * fixedStep);

      if (pulling) {
        // The pointer defines a 3D equilibrium direction. Distance controls how
        // much of that direction is applied, like stretching an invisible spring.
        tempB.copy(aimTarget).sub(anchor).normalize();
        tempB.lerp(DOWN, 1 - pullStrength * 0.82).normalize();
        tempC.copy(tempB).multiplyScalar(ropeLength).add(anchor).sub(position);
        temp.copy(position).sub(anchor).normalize();
        tempC.addScaledVector(temp, -tempC.dot(temp));
        position.addScaledVector(tempC, 52 * fixedStep * fixedStep);
      }

      temp.copy(position).sub(anchor);
      if (temp.lengthSq() < 1e-8) temp.copy(DOWN);
      temp.normalize().multiplyScalar(ropeLength);
      position.copy(anchor).add(temp);

      velocity.copy(position).sub(previous);
      if (pulling) {
        stableFrames = 0;
      } else if (velocity.lengthSq() < 0.000000014) {
        stableFrames += 1;
      } else {
        stableFrames = 0;
      }
    }

    function animate(time: number) {
      animationFrame = 0;
      if (disposed) return;

      const delta = Math.min((time - lastTime) / 1000, 0.05);
      lastTime = time;
      accumulator = Math.min(accumulator + delta, fixedStep * 5);
      while (accumulator >= fixedStep) {
        stepPhysics();
        accumulator -= fixedStep;
      }

      updateRig();
      interactions.update();
      renderer.render(scene, camera);
      frame += 1;

      if (pulling || stableFrames < 80 || frame < 4) {
        animationFrame = requestAnimationFrame(animate);
      }
    }

    function wake() {
      stableFrames = 0;
      if (!animationFrame && !disposed) {
        lastTime = performance.now();
        animationFrame = requestAnimationFrame(animate);
      }
    }

    wakeRef.current = wake;

    function pointerNdc(event: PointerEvent) {
      const rect = canvas.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
    }

    function updatePointerTarget(event: PointerEvent) {
      pointerNdc(event);
      if (!raycaster.ray.intersectPlane(interactionPlane, aimTarget)) return false;

      lampNdc.copy(position).project(camera);
      const distanceX = (pointer.x - lampNdc.x) * camera.aspect;
      const distanceY = pointer.y - lampNdc.y;
      const pointerDistance = Math.sqrt(distanceX * distanceX + distanceY * distanceY);
      pullStrength = THREE.MathUtils.smoothstep(pointerDistance, 0.08, 1.15);
      return true;
    }

    function isInteractiveTarget(target: EventTarget | null) {
      return target instanceof Element && Boolean(target.closest("button, input, a, [data-interactive]"));
    }

    function onPointerDown(event: PointerEvent) {
      if (isInteractiveTarget(event.target)) return;
      if (!updatePointerTarget(event)) return;

      pulling = true;
      pullPointerId = event.pointerId;
      lastPointerTime = performance.now();
      lastPointerTarget.copy(aimTarget);
      pointerVelocity.set(0, 0, 0);
      canvas.classList.add("is-pulling-light");
      event.preventDefault();
      wake();
    }

    function onPointerMove(event: PointerEvent) {
      if (!pulling || event.pointerId !== pullPointerId) return;
      if (!updatePointerTarget(event)) return;
      const now = performance.now();
      const elapsed = Math.max(0.008, Math.min(0.05, (now - lastPointerTime) / 1000));
      temp.copy(aimTarget).sub(lastPointerTarget).multiplyScalar(1 / elapsed);
      pointerVelocity.lerp(temp, 0.34);
      lastPointerTarget.copy(aimTarget);
      lastPointerTime = now;
      event.preventDefault();
      wake();
    }

    function onPointerUp(event: PointerEvent) {
      if (!pulling || event.pointerId !== pullPointerId) return;

      // Preserve current motion, add pointer momentum, then add a small spring
      // return impulse. A farther pull therefore releases with more energy.
      velocity.copy(position).sub(previous).multiplyScalar(1 / fixedStep);
      temp.copy(position).sub(anchor).normalize();
      pointerVelocity.addScaledVector(temp, -pointerVelocity.dot(temp)).clampLength(0, 8);
      velocity.addScaledVector(pointerVelocity, 0.08 + pullStrength * 0.12);

      tempB.copy(anchor).addScaledVector(DOWN, ropeLength).sub(position);
      tempB.addScaledVector(temp, -tempB.dot(temp));
      if (tempB.lengthSq() > 0.0001) {
        tempB.normalize();
        velocity.addScaledVector(tempB, 0.4 + pullStrength * 2.2);
      }
      velocity.clampLength(0, 6.5);
      previous.copy(position).addScaledVector(velocity, -fixedStep);

      pulling = false;
      pullPointerId = -1;
      pullStrength = 0;
      canvas.classList.remove("is-pulling-light");
      wake();
    }

    function resetMotion() {
      pulling = false;
      pullPointerId = -1;
      pullStrength = 0;
      position.copy(anchor).addScaledVector(DOWN, ropeLength);
      previous.copy(position);
      pointerVelocity.set(0, 0, 0);
      currentLightDirection.copy(BASE_LIGHT_DIRECTION);
      canvas.classList.remove("is-pulling-light");
      wake();
    }

    resetMotionRef.current = resetMotion;

    function onResize() {
      cancelAnimationFrame(resizeFrame);
      resizeFrame = requestAnimationFrame(resize);
    }

    function onPaint() {
      wake();
    }

    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("dblclick", resetMotion);
    window.addEventListener("pointermove", onPointerMove, { passive: false });
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);
    window.addEventListener("resize", onResize, { passive: true });
    canvas.addEventListener("paint", onPaint);

    void document.fonts.ready.then(() => {
      if (disposed) return;
      canvas.requestPaint?.();
      resize();
      updateRig();
      setReady(true);
      wake();
    });

    return () => {
      disposed = true;
      cancelAnimationFrame(animationFrame);
      cancelAnimationFrame(resizeFrame);
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("dblclick", resetMotion);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);
      window.removeEventListener("resize", onResize);
      canvas.removeEventListener("paint", onPaint);
      interactions.disconnect();
      wakeRef.current = null;
      resetMotionRef.current = null;
      lightRigRef.current = null;
      pageTexture.dispose();
      pageGeometry.dispose();
      pageMaterial.dispose();
      backing.geometry.dispose();
      backingMaterial.dispose();
      shade.geometry.dispose();
      shadeMaterial.dispose();
      rim.geometry.dispose();
      (rim.material as THREE.Material).dispose();
      underside.geometry.dispose();
      undersideMaterial.dispose();
      connector.geometry.dispose();
      (connector.material as THREE.Material).dispose();
      bulb.geometry.dispose();
      bulbMaterial.dispose();
      cable.geometry.dispose();
      (cable.material as THREE.Material).dispose();
      ceilingCap.geometry.dispose();
      (ceilingCap.material as THREE.Material).dispose();
      beam.geometry.dispose();
      beamMaterial.dispose();
      glowTexture.dispose();
      glowMaterial.dispose();
      renderer.dispose();
    };
  }, [htmlCanvasReady]);

  useEffect(() => {
    const rig = lightRigRef.current;
    if (!rig) return;

    const color = new THREE.Color(lighting.color);
    const effectiveBrightness = lighting.enabled ? lighting.brightness : 0;
    rig.spot.color.copy(color);
    rig.spot.power = effectiveBrightness;
    rig.spot.angle = THREE.MathUtils.degToRad(lighting.angle);
    rig.bulbLight.color.copy(color);
    rig.bulbLight.power = lighting.enabled ? Math.max(18, lighting.brightness * 0.026) : 0;
    rig.bulbMaterial.emissive.copy(color);
    rig.bulbMaterial.emissiveIntensity = lighting.enabled ? 2.4 + lighting.brightness / 850 : 0.04;
    rig.glowMaterial.color.copy(color);
    rig.glowMaterial.opacity = lighting.enabled ? 0.52 + lighting.brightness / 4200 : 0;
    rig.beamMaterial.color.copy(color);
    rig.beamMaterial.opacity = lighting.enabled ? 0.025 + lighting.brightness / 42000 : 0;

    const beamLength = 6.8;
    const beamRadius = Math.tan(THREE.MathUtils.degToRad(lighting.angle)) * beamLength;
    rig.beam.position.y = -beamLength / 2 - 0.48;
    rig.beam.scale.set(beamRadius, beamLength, beamRadius);

    const canvas = canvasRef.current as HtmlCanvas | null;
    canvas?.requestPaint?.();
    wakeRef.current?.();
  }, [lighting]);

  function updateLighting(patch: Partial<LightingSettings>) {
    setLighting((current) => ({ ...current, ...patch }));
  }

  function resetLight() {
    setLighting(INITIAL_LIGHT);
    resetMotionRef.current?.();
  }

  return (
    <main className={`experience-shell${ready ? " is-ready" : ""}`}>
      <canvas ref={canvasRef} className="webgl-canvas" aria-label="Interactive MORS² light study">
        <div
          ref={pageSourceRef}
          className="page-source"
          style={{ "--lamp-color": lighting.color } as React.CSSProperties}
        >
          <header className="page-header">
            <div className="page-brand">
              <span className="page-logo-wrap">
                {/* The logo is part of the HTMLTexture source, so keep it as a plain DOM image. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/mors-logo.svg" alt="" />
              </span>
              <span>MORS²</span>
              <span className="page-brand-suffix">GAME ENGINE</span>
            </div>
            <div className="page-status"><span /> EARLY DEVELOPMENT</div>
          </header>

          <div className="page-main">
            <section className="page-copy" aria-labelledby="mors-title">
              <p className="page-kicker">01 / RUNTIME ARCHITECTURE</p>
              <h1 id="mors-title">
                Meta is observed<br />
                by Rule to <span>Step in Space.</span>
              </h1>
              <p className="page-subtitle">
                A Rust engine architecture where rules derive tightly packed data layout for elegant performance.
              </p>

              <div className="concepts" data-interactive>
                <div className="concept-list" role="list" aria-label="MORS² engine model">
                  {(Object.keys(CONCEPTS) as Array<keyof typeof CONCEPTS>).map((item, index) => (
                    <button
                      key={item}
                      type="button"
                      className={concept === item ? "is-active" : ""}
                      onClick={() => setConcept(item)}
                      aria-pressed={concept === item}
                    >
                      <span>0{index + 1}</span>{item}
                    </button>
                  ))}
                </div>
                <p className="concept-description"><span>{concept}</span>{CONCEPTS[concept]}</p>
              </div>
            </section>

            <aside className="light-controls" data-interactive aria-label="Spotlight controls">
              <div className="control-heading">
                <div>
                  <p>LIGHT CONTROL</p>
                  <span>PHYSICAL SPOT / 01</span>
                </div>
                <button
                  type="button"
                  className={`power-toggle${lighting.enabled ? " is-on" : ""}`}
                  onClick={() => updateLighting({ enabled: !lighting.enabled })}
                  aria-pressed={lighting.enabled}
                  aria-label={lighting.enabled ? "Turn spotlight off" : "Turn spotlight on"}
                >
                  <span />{lighting.enabled ? "ON" : "OFF"}
                </button>
              </div>

              <label className="control-row">
                <span className="control-label"><b>BEAM</b><output>{lighting.angle}°</output></span>
                <input
                  type="range"
                  min="16"
                  max="58"
                  step="1"
                  value={lighting.angle}
                  onInput={(event) => updateLighting({ angle: Number(event.currentTarget.value) })}
                  aria-label="Spotlight beam angle"
                />
              </label>

              <label className="control-row">
                <span className="control-label"><b>BRIGHTNESS</b><output>{lighting.brightness} lm</output></span>
                <input
                  type="range"
                  min="300"
                  max="2600"
                  step="50"
                  value={lighting.brightness}
                  onInput={(event) => updateLighting({ brightness: Number(event.currentTarget.value) })}
                  aria-label="Spotlight brightness"
                />
              </label>

              <div className="control-row color-control">
                <span className="control-label"><b>COLOR</b><output>{lighting.color.toUpperCase()}</output></span>
                <div className="color-options">
                  {COLOR_PRESETS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      className={lighting.color === color ? "is-active" : ""}
                      style={{ "--swatch": color } as React.CSSProperties}
                      onClick={() => updateLighting({ color })}
                      aria-label={`Set light color to ${color}`}
                      aria-pressed={lighting.color === color}
                    />
                  ))}
                  <label className="custom-color" aria-label="Choose a custom light color">
                    <input
                      type="color"
                      value={lighting.color}
                      onInput={(event) => updateLighting({ color: event.currentTarget.value })}
                    />
                    <span>+</span>
                  </label>
                </div>
              </div>

              <button type="button" className="reset-light" onClick={resetLight}>
                RESET LIGHT <span>↗</span>
              </button>
            </aside>
          </div>

          <footer className="page-footer">
            <p>SPACE / META / FIELD / RULE / LATENT</p>
            <div className="drag-instruction">
              <span className="drag-orbit" aria-hidden="true"><i /></span>
              <div><b>PRESS + PULL THE LIGHT</b><span>Farther builds a stronger 3D release</span></div>
            </div>
            <p>FOUNDATION FIRST — OPEN SOURCE WHEN READY</p>
          </footer>
        </div>
      </canvas>

      <div className={`scene-status${ready || error ? " is-hidden" : ""}`} aria-live="polite">
        <span /> PREPARING HTML SURFACE
      </div>
      {error ? <div className="scene-error">{error}</div> : null}
    </main>
  );
}
