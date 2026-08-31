import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import landData from "@/lib/land.json";
import type { SatState } from "@/lib/positions";

const LAND = landData as number[][][][];

export type GlobeProps = {
  /** bump to re-centre the globe on the current site */
  focusKey?: number;
  satellites: SatState[];
  site: { latitude: number; longitude: number; name?: string } | null;
  radiusKm: number;
  onPick: (lat: number, lon: number) => void;
  launching?: boolean;
  pulseConflicts?: boolean;
};

const STATUS_COLORS: Record<SatState["status"], number> = {
  conflict: 0xff4d4d,
  caution: 0xffd24a,
  clear: 0x4ade80,
  inactive: 0x64748b,
};

function makeEarthTexture() {
  const w = 2048;
  const h = 1024;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d")!;
  const ocean = ctx.createLinearGradient(0, 0, 0, h);
  ocean.addColorStop(0, "#03080f");
  ocean.addColorStop(0.5, "#071a2c");
  ocean.addColorStop(1, "#03080f");
  ctx.fillStyle = ocean;
  ctx.fillRect(0, 0, w, h);

  // subtle graticule
  ctx.strokeStyle = "rgba(56,189,248,0.07)";
  ctx.lineWidth = 1;
  for (let lon = -180; lon <= 180; lon += 15) {
    const x = ((lon + 180) / 360) * w;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }
  for (let lat = -75; lat <= 75; lat += 15) {
    const y = ((90 - lat) / 180) * h;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }

  ctx.fillStyle = "#2b6a97";
  ctx.strokeStyle = "rgba(125,211,252,0.75)";
  ctx.lineWidth = 1.4;
  for (const poly of LAND) {
    const ring = poly[0];
    if (!ring) continue;
    ctx.beginPath();
    ring.forEach(([lon, lat], i) => {
      const x = ((lon! + 180) / 360) * w;
      const y = ((90 - lat!) / 180) * h;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function dotSprite() {
  const s = 64;
  const c = document.createElement("canvas");
  c.width = c.height = s;
  const ctx = c.getContext("2d")!;
  const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.35, "rgba(255,255,255,0.9)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(s / 2, s / 2, s / 2, 0, Math.PI * 2);
  ctx.fill();
  return new THREE.CanvasTexture(c);
}

/** Sphere whose UVs run west-to-east so a standard equirectangular map is not mirrored. */
function mirroredSphere(r: number, wSeg: number, hSeg: number) {
  const geo = new THREE.SphereGeometry(r, wSeg, hSeg);
  const uv = geo.getAttribute("uv") as THREE.BufferAttribute;
  for (let i = 0; i < uv.count; i++) uv.setX(i, 1 - uv.getX(i));
  uv.needsUpdate = true;
  return geo;
}

function vecFor(lat: number, lon: number, r: number) {
  const la = (lat * Math.PI) / 180;
  // three's SphereGeometry maps texture u to -longitude, so mirror here
  const lo = (-lon * Math.PI) / 180;
  return new THREE.Vector3(
    r * Math.cos(la) * Math.cos(lo),
    r * Math.sin(la),
    r * Math.cos(la) * Math.sin(lo),
  );
}

function altRadius(altKm: number) {
  return 1 + Math.min(altKm, 2000) / 6371 + (altKm > 2000 ? 0.12 : 0);
}

export default function Globe({
  focusKey = 0,
  satellites,
  site,
  radiusKm,
  onPick,
  launching = false,
  pulseConflicts = false,
}: GlobeProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<{ x: number; y: number; text: string } | null>(null);

  // live refs so the animation loop and listeners never read stale props
  const satsRef = useRef(satellites);
  const siteRef = useRef(site);
  const radiusRef = useRef(radiusKm);
  const pickRef = useRef(onPick);
  const launchRef = useRef(launching);
  const pulseRef = useRef(pulseConflicts);
  satsRef.current = satellites;
  siteRef.current = site;
  radiusRef.current = radiusKm;
  pickRef.current = onPick;
  launchRef.current = launching;
  pulseRef.current = pulseConflicts;

  const apiRef = useRef<{
    syncSats: () => void;
    syncSite: () => void;
    startLaunch: () => void;
    focus: (lat: number, lon: number) => void;
  } | null>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
    let dist = 3.1;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mount.appendChild(renderer.domElement);
    renderer.domElement.style.touchAction = "none";
    renderer.domElement.style.display = "block";
    renderer.domElement.style.cursor = "grab";

    const root = new THREE.Group();
    scene.add(root);

    const earth = new THREE.Mesh(
      mirroredSphere(1, 96, 96),
      new THREE.MeshPhongMaterial({ map: makeEarthTexture(), shininess: 8, specular: 0x14364f }),
    );
    root.add(earth);

    const atmosphere = new THREE.Mesh(
      new THREE.SphereGeometry(1.06, 64, 64),
      new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 0.09,
        side: THREE.BackSide,
      }),
    );
    root.add(atmosphere);

    scene.add(new THREE.AmbientLight(0xffffff, 0.65));
    const sun = new THREE.DirectionalLight(0xdfefff, 1.1);
    sun.position.set(3, 2, 3);
    scene.add(sun);
    const rim = new THREE.DirectionalLight(0x2f6f9f, 0.6);
    rim.position.set(-3, -1, -2);
    scene.add(rim);

    // ---- satellites -------------------------------------------------------
    const MAX = 400;
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(MAX * 3);
    const col = new Float32Array(MAX * 3);
    const size = new Float32Array(MAX);
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
    geo.setDrawRange(0, 0);
    const points = new THREE.Points(
      geo,
      new THREE.PointsMaterial({
        size: 0.055,
        map: dotSprite(),
        vertexColors: true,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        sizeAttenuation: true,
      }),
    );
    root.add(points);

    let names: string[] = [];
    let statuses: SatState["status"][] = [];
    let count = 0;
    const targetPos = new Float32Array(MAX * 3);

    function syncSats() {
      const list = satsRef.current.slice(0, MAX);
      count = list.length;
      names = list.map((s) => s.name);
      statuses = list.map((s) => s.status);
      list.forEach((s, i) => {
        const v = vecFor(s.lat, s.lon, altRadius(s.altitude_km));
        targetPos[i * 3] = v.x;
        targetPos[i * 3 + 1] = v.y;
        targetPos[i * 3 + 2] = v.z;
        if (pos[i * 3] === 0 && pos[i * 3 + 1] === 0 && pos[i * 3 + 2] === 0) {
          pos[i * 3] = v.x;
          pos[i * 3 + 1] = v.y;
          pos[i * 3 + 2] = v.z;
        }
        const c = new THREE.Color(STATUS_COLORS[s.status]);
        col[i * 3] = c.r;
        col[i * 3 + 1] = c.g;
        col[i * 3 + 2] = c.b;
        size[i] = s.status === "inactive" ? 0.5 : 1;
      });
      geo.setDrawRange(0, count);
      geo.attributes["color"]!.needsUpdate = true;
    }

    // ---- launch site ------------------------------------------------------
    const siteGroup = new THREE.Group();
    root.add(siteGroup);

    const beacon = new THREE.Mesh(
      new THREE.SphereGeometry(0.022, 20, 20),
      new THREE.MeshBasicMaterial({ color: 0x67e8f9 }),
    );
    const halo = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: dotSprite(),
        color: 0x22d3ee,
        transparent: true,
        opacity: 0.85,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    halo.scale.setScalar(0.16);
    const rocket = new THREE.Mesh(
      new THREE.ConeGeometry(0.016, 0.06, 12),
      new THREE.MeshBasicMaterial({ color: 0xffffff }),
    );
    const trail = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: dotSprite(),
        color: 0xffb347,
        transparent: true,
        opacity: 0.9,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    trail.scale.setScalar(0.1);
    const dangerRing = new THREE.Line(
      new THREE.BufferGeometry(),
      new THREE.LineBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.85 }),
    );
    siteGroup.add(beacon, halo, rocket, trail, dangerRing);
    siteGroup.visible = false;
    rocket.visible = false;
    trail.visible = false;

    function syncSite() {
      const s = siteRef.current;
      siteGroup.visible = !!s;
      if (!s) return;
      const center = vecFor(s.latitude, s.longitude, 1.005);
      beacon.position.copy(center);
      halo.position.copy(center);

      // danger radius circle drawn on the sphere surface
      const ang = radiusRef.current / 6371;
      const n = center.clone().normalize();
      const tangent = new THREE.Vector3(0, 1, 0).cross(n);
      if (tangent.lengthSq() < 1e-6) tangent.set(1, 0, 0);
      tangent.normalize();
      const bi = n.clone().cross(tangent).normalize();
      const pts: THREE.Vector3[] = [];
      for (let i = 0; i <= 96; i++) {
        const th = (i / 96) * Math.PI * 2;
        const dir = tangent
          .clone()
          .multiplyScalar(Math.cos(th))
          .add(bi.clone().multiplyScalar(Math.sin(th)));
        pts.push(
          n
            .clone()
            .multiplyScalar(Math.cos(ang))
            .add(dir.multiplyScalar(Math.sin(ang)))
            .multiplyScalar(1.004),
        );
      }
      dangerRing.geometry.dispose();
      dangerRing.geometry = new THREE.BufferGeometry().setFromPoints(pts);
    }

    let launchT = -1;
    function startLaunch() {
      if (!siteRef.current) return;
      launchT = 0;
    }

    apiRef.current = { syncSats, syncSite, startLaunch, focus };
    (window as unknown as Record<string, unknown>)["__orbitDebug"] = () => ({
      siteVisible: siteGroup.visible,
      beacon: beacon.position.toArray(),
      ringPts: dangerRing.geometry.getAttribute("position")?.count ?? 0,
      rot: [root.rotation.x, root.rotation.y],
      count,
    });
    syncSats();
    syncSite();

    // ---- interaction ------------------------------------------------------
    let rotY = ((-(siteRef.current?.longitude ?? 80) - 90) * Math.PI) / 180;
    let rotX = ((siteRef.current?.latitude ?? 15) * Math.PI) / 180;
    let targetRotY: number | null = null;
    let targetRotX: number | null = null;
    function focus(lat: number, lon: number) {
      targetRotY = ((-lon - 90) * Math.PI) / 180;
      targetRotX = Math.max(-1.2, Math.min(1.2, (lat * Math.PI) / 180));
      while (targetRotY - rotY > Math.PI) targetRotY -= Math.PI * 2;
      while (targetRotY - rotY < -Math.PI) targetRotY += Math.PI * 2;
    }
    let dragging = false;
    let moved = 0;
    let lastX = 0;
    let lastY = 0;
    let velY = 0.0006;

    const raycaster = new THREE.Raycaster();
    raycaster.params.Points = { threshold: 0.045 };
    const ndc = new THREE.Vector2();
    let hoverPointer: { x: number; y: number } | null = null;

    function onPointerDown(e: PointerEvent) {
      dragging = true;
      moved = 0;
      lastX = e.clientX;
      lastY = e.clientY;
      renderer.domElement.setPointerCapture(e.pointerId);
      renderer.domElement.style.cursor = "grabbing";
    }
    function onPointerMove(e: PointerEvent) {
      const rect = renderer.domElement.getBoundingClientRect();
      hoverPointer = { x: e.clientX - rect.left, y: e.clientY - rect.top };
      if (!dragging) return;
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      lastX = e.clientX;
      lastY = e.clientY;
      moved += Math.abs(dx) + Math.abs(dy);
      targetRotY = null;
      targetRotX = null;
      rotY += dx * 0.005;
      rotX = Math.max(-1.4, Math.min(1.4, rotX + dy * 0.005));
      velY = dx * 0.0004;
    }
    function onPointerUp(e: PointerEvent) {
      dragging = false;
      renderer.domElement.style.cursor = "grab";
      if (moved > 6) return;
      // treat as a click: pick a point on the globe
      const rect = renderer.domElement.getBoundingClientRect();
      ndc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      ndc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(ndc, camera);
      const hit = raycaster.intersectObject(earth, false)[0];
      if (!hit) return;
      const local = root.worldToLocal(hit.point.clone()).normalize();
      const lat = (Math.asin(local.y) * 180) / Math.PI;
      const lon = (-Math.atan2(local.z, local.x) * 180) / Math.PI;
      pickRef.current(Math.round(lat * 100) / 100, Math.round(lon * 100) / 100);
    }
    function onWheel(e: WheelEvent) {
      e.preventDefault();
      const dy = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 100 : 1);
      dist = Math.max(1.5, Math.min(6, dist * Math.exp(dy * 0.0015)));
    }
    function onLeave() {
      hoverPointer = null;
      setHover(null);
    }

    const el = renderer.domElement;
    el.addEventListener("pointerdown", onPointerDown);
    el.addEventListener("pointermove", onPointerMove);
    el.addEventListener("pointerup", onPointerUp);
    el.addEventListener("pointerleave", onLeave);
    el.addEventListener("wheel", onWheel, { passive: false });

    function resize() {
      const w = mount!.clientWidth || 600;
      const h = mount!.clientHeight || 420;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(mount);

    let raf = 0;
    let frame = 0;
    const clock = new THREE.Clock();
    let hoverTick = 0;

    function tick() {
      raf = requestAnimationFrame(tick);
      const dt = Math.min(clock.getDelta(), 0.05);
      frame++;

      if (targetRotY != null && targetRotX != null) {
        rotY += (targetRotY - rotY) * 0.08;
        rotX += (targetRotX - rotX) * 0.08;
        if (Math.abs(targetRotY - rotY) < 0.002) {
          targetRotY = null;
          targetRotX = null;
        }
        velY = 0;
      } else if (!dragging) {
        rotY += velY;
        velY *= 0.96;
        if (Math.abs(velY) < 0.0006) velY = 0.0006;
      }
      root.rotation.y = rotY;
      root.rotation.x = rotX;

      camera.position.set(0, 0, dist);
      camera.lookAt(0, 0, 0);

      // smooth position interpolation toward the target time
      const attr = geo.attributes["position"] as THREE.BufferAttribute;
      for (let i = 0; i < count * 3; i++) pos[i] = pos[i]! + (targetPos[i]! - pos[i]!) * 0.18;
      attr.needsUpdate = true;

      // pulse conflicts
      const pulse = 1 + Math.sin(clock.elapsedTime * 6) * 0.35;
      const mat = points.material as THREE.PointsMaterial;
      mat.size = pulseRef.current ? 0.055 * (1 + (pulse - 1) * 0.5) : 0.055;

      halo.scale.setScalar(0.16 + Math.sin(clock.elapsedTime * 2.5) * 0.02);

      if (launchT >= 0) {
        launchT += dt;
        const s = siteRef.current;
        if (s) {
          const n = vecFor(s.latitude, s.longitude, 1).normalize();
          const rise = Math.min(launchT / 1.6, 1);
          const p = n.clone().multiplyScalar(1.01 + rise * 0.3);
          rocket.visible = rise < 1;
          trail.visible = rise < 1;
          rocket.position.copy(p);
          rocket.lookAt(p.clone().multiplyScalar(2));
          rocket.rotateX(Math.PI / 2);
          trail.position.copy(n.clone().multiplyScalar(1.01 + rise * 0.3 - 0.04));
          (trail.material as THREE.SpriteMaterial).opacity = 0.9 * (1 - rise);
        }
        if (launchT > 1.8) {
          launchT = -1;
          rocket.visible = false;
          trail.visible = false;
        }
      }

      // hover tooltip (throttled)
      if (hoverPointer && ++hoverTick % 6 === 0) {
        const rect = el.getBoundingClientRect();
        ndc.x = (hoverPointer.x / rect.width) * 2 - 1;
        ndc.y = -(hoverPointer.y / rect.height) * 2 + 1;
        raycaster.setFromCamera(ndc, camera);
        const hits = raycaster.intersectObject(points, false);
        const idx = hits[0]?.index;
        if (idx != null && idx < count && statuses[idx] !== "inactive") {
          const s = satsRef.current[idx];
          setHover({
            x: hoverPointer.x,
            y: hoverPointer.y,
            text: s ? `${names[idx]} · ${s.distanceKm.toLocaleString()} km` : names[idx]!,
          });
        } else setHover(null);
      }

      renderer.render(scene, camera);
    }
    tick();

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      el.removeEventListener("pointerdown", onPointerDown);
      el.removeEventListener("pointermove", onPointerMove);
      el.removeEventListener("pointerup", onPointerUp);
      el.removeEventListener("pointerleave", onLeave);
      el.removeEventListener("wheel", onWheel);
      renderer.dispose();
      apiRef.current = null;
      if (el.parentNode) el.parentNode.removeChild(el);
      void frame;
      void size;
    };
  }, []);

  useEffect(() => {
    apiRef.current?.syncSats();
  }, [satellites]);

  useEffect(() => {
    apiRef.current?.syncSite();
  }, [site, radiusKm]);

  useEffect(() => {
    if (launching) apiRef.current?.startLaunch();
  }, [launching]);

  useEffect(() => {
    if (focusKey && site) apiRef.current?.focus(site.latitude, site.longitude);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusKey]);

  return (
    <div className="relative h-[clamp(300px,54vh,720px)] w-full overflow-hidden rounded-lg border border-border bg-[#04070f]">
      <div ref={mountRef} className="h-full w-full" />
      {hover && (
        <div
          className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-md border border-primary/40 bg-background/90 px-2 py-1 font-mono text-[11px] whitespace-nowrap text-foreground shadow-lg"
          style={{ left: hover.x, top: hover.y - 8 }}
        >
          {hover.text}
        </div>
      )}
      {!site && (
        <div className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full border border-primary/30 bg-background/80 px-3 py-1 text-xs text-primary">
          Click the globe to set your launch site
        </div>
      )}
    </div>
  );
}
