import { useEffect, useRef } from "react";
import * as THREE from "three";
import { structureParts, type BDef } from "@/game/buildings";

export function BuildingPreview({ def, seed }: { def: BDef; seed: number }) {
  const ref = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.setClearColor(0x101816, 1);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 80);
    scene.add(new THREE.AmbientLight(0xc5d5dc, 0.7));
    const sun = new THREE.DirectionalLight(0xfff4e0, 1.4);
    sun.position.set(8, 14, 6);
    scene.add(sun);
    const parts = structureParts(def, seed, 4, true);
    const geos = {
      box: new THREE.BoxGeometry(1, 1, 1),
      cyl: new THREE.CylinderGeometry(0.5, 0.5, 1, 8),
      cone: new THREE.ConeGeometry(0.5, 1, 6),
      win: new THREE.BoxGeometry(1, 1, 1),
    };
    const meshes: THREE.Mesh[] = [];
    for (const p of parts) {
      const geo = p.k === "cyl" ? geos.cyl : p.k === "cone" ? geos.cone : p.k === "win" ? geos.win : geos.box;
      const mat = new THREE.MeshStandardMaterial({
        color: p.c,
        emissive: p.k === "win" ? 0xffe1a8 : 0x000000,
        emissiveIntensity: p.k === "win" ? 0.35 : 0,
        roughness: 0.72,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(p.x, p.y + p.sy * 0.5, p.z);
      mesh.scale.set(p.sx, p.sy, p.sz);
      mesh.rotation.y = p.ry;
      scene.add(mesh);
      meshes.push(mesh);
    }
    const ground = new THREE.Mesh(new THREE.CircleGeometry(6, 24), new THREE.MeshStandardMaterial({ color: 0x1c4a32, roughness: 1 }));
    ground.rotation.x = -Math.PI / 2;
    scene.add(ground);
    let frame = 0;
    let stopped = false;
    const fit = () => {
      const w = canvas.clientWidth || 1;
      const h = canvas.clientHeight || 1;
      renderer.setSize(w, h, false);
      camera.aspect = w / Math.max(1, h);
      camera.updateProjectionMatrix();
    };
    fit();
    const loop = (now: number) => {
      if (stopped) return;
      const spin = now * 0.00035;
      const dist = 8 + def.floors * 0.35;
      camera.position.set(Math.sin(spin) * dist, dist * 0.62, Math.cos(spin) * dist);
      camera.lookAt(0, Math.min(6, def.floors * 0.35), 0);
      renderer.render(scene, camera);
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    const ro = new ResizeObserver(fit);
    ro.observe(canvas);
    return () => {
      stopped = true;
      cancelAnimationFrame(frame);
      ro.disconnect();
      for (const mesh of meshes) {
        scene.remove(mesh);
        (mesh.material as THREE.Material).dispose();
      }
      geos.box.dispose();
      geos.cyl.dispose();
      geos.cone.dispose();
      geos.win.dispose();
      ground.geometry.dispose();
      (ground.material as THREE.Material).dispose();
      renderer.dispose();
    };
  }, [def, seed]);

  return <canvas ref={ref} className="catalog-preview" aria-label={`${def.name} preview`} />;
}
