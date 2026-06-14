import React, { useEffect, useRef } from "react";
import * as THREE from "three";
import { useTheme } from "../theme/ThemeProvider";

const InfrastructureTopologyCanvas = ({ onError }) => {
  const containerRef = useRef(null);
  const { currentTheme } = useTheme();

  // Keep theme in a ref so the animation loop can access its current value without re-initializing the scene
  const themeRef = useRef(currentTheme);
  useEffect(() => {
    themeRef.current = currentTheme;
  }, [currentTheme]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // WebGL capability check
    try {
      const canvas = document.createElement("canvas");
      const gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
      if (!gl) {
        throw new Error("WebGL not supported");
      }
    } catch (e) {
      console.warn("WebGL initialization failed:", e);
      if (onError) onError();
      return;
    }

    // Set up scene, camera, and renderer
    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 100);
    camera.position.set(0, 0, 15);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // Track objects for disposal and animations
    const disposables = [];
    const animateQueue = [];

    const registerDisposable = (obj) => {
      if (!obj) return;
      disposables.push(obj);
      if (obj.geometry) disposables.push(obj.geometry);
      if (obj.material) {
        if (Array.isArray(obj.material)) {
          obj.material.forEach((mat) => disposables.push(mat));
        } else {
          disposables.push(obj.material);
        }
      }
    };

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.2);
    scene.add(ambientLight);
    registerDisposable(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight1.position.set(5, 10, 7);
    scene.add(dirLight1);
    registerDisposable(dirLight1);

    const pointLight = new THREE.PointLight(0x3b82f6, 2, 30);
    pointLight.position.set(0, 0, 5);
    scene.add(pointLight);
    registerDisposable(pointLight);

    // Create 3D Hierarchical Topology
    
    // 1. Cluster Core: Large Hexagonal Structure in center
    const clusterGeo = new THREE.CylinderGeometry(1.5, 1.5, 0.8, 6);
    const clusterMat = new THREE.MeshStandardMaterial({
      color: 0x3b82f6,
      wireframe: true,
      emissive: 0x1d4ed8,
      emissiveIntensity: 0.5,
      roughness: 0.2,
      metalness: 0.8
    });
    const clusterMesh = new THREE.Mesh(clusterGeo, clusterMat);
    clusterMesh.position.set(0, 4, 0);
    scene.add(clusterMesh);
    registerDisposable(clusterMesh);

    // Simple rotation animation for Cluster Core
    animateQueue.push((time) => {
      clusterMesh.rotation.y = time * 0.2;
      clusterMesh.rotation.z = Math.sin(time * 0.1) * 0.05;
      
      // Subtle pulse effect
      const pulse = 0.5 + Math.sin(time * 2.0) * 0.15;
      clusterMat.emissiveIntensity = pulse;
    });

    // 2. Nodes: 3 Hypervisor Node Rack outline wireframe boxes
    const nodeGeo = new THREE.BoxGeometry(1.2, 1.8, 1.2);
    const nodePositions = [
      new THREE.Vector3(-4.5, 0.5, -2),
      new THREE.Vector3(4.5, 0.5, -2),
      new THREE.Vector3(0, -0.5, 3)
    ];

    const nodeMeshes = [];
    const nodeMaterials = [];

    nodePositions.forEach((pos, idx) => {
      // Rack outline using EdgesGeometry
      const edges = new THREE.EdgesGeometry(nodeGeo);
      const edgeMat = new THREE.LineBasicMaterial({ 
        color: idx === 0 ? 0x6366f1 : idx === 1 ? 0x0d9488 : 0xf43f5e,
        linewidth: 2
      });
      const nodeLine = new THREE.LineSegments(edges, edgeMat);
      nodeLine.position.copy(pos);
      scene.add(nodeLine);
      registerDisposable(nodeLine);
      registerDisposable(edges);
      nodeMeshes.push(nodeLine);
      nodeMaterials.push(edgeMat);

      // Subtle rotation for Node
      animateQueue.push((time) => {
        nodeLine.rotation.y = time * 0.3 + idx;
        nodeLine.rotation.x = Math.sin(time * 0.2 + idx) * 0.1;
      });

      // Connection Link from Cluster Core to Node
      const points = [clusterMesh.position, pos];
      const linkGeo = new THREE.BufferGeometry().setFromPoints(points);
      const linkMat = new THREE.LineBasicMaterial({ 
        color: 0x475569, 
        transparent: true,
        opacity: 0.4 
      });
      const link = new THREE.Line(linkGeo, linkMat);
      scene.add(link);
      registerDisposable(link);
      registerDisposable(linkGeo);
    });

    // 3. VM Spheres: Small spheres orbiting nodes
    const vmGeo = new THREE.SphereGeometry(0.18, 12, 12);
    const vmPositions = [];
    const vmCount = 12; // 4 VMs per Hypervisor

    for (let i = 0; i < vmCount; i++) {
      const nodeIndex = Math.floor(i / 4);
      const nodePos = nodePositions[nodeIndex];
      
      const vmMat = new THREE.MeshStandardMaterial({
        color: nodeIndex === 0 ? 0x818cf8 : nodeIndex === 1 ? 0x2dd4bf : 0xfda4af,
        emissive: nodeIndex === 0 ? 0x4f46e5 : nodeIndex === 1 ? 0x0f766e : 0xe11d48,
        emissiveIntensity: 0.6
      });
      const vmMesh = new THREE.Mesh(vmGeo, vmMat);
      scene.add(vmMesh);
      registerDisposable(vmMesh);
      
      // Animate VM revolving around its parent Node
      const radius = 1.6 + (i % 2) * 0.4;
      const speed = 0.5 + (i % 3) * 0.2;
      const offset = i * (Math.PI / 2);

      animateQueue.push((time) => {
        const angle = time * speed + offset;
        const x = nodePos.x + Math.cos(angle) * radius;
        const z = nodePos.z + Math.sin(angle) * radius;
        const y = nodePos.y + Math.sin(angle * 2) * 0.3; // slight vertical wave
        vmMesh.position.set(x, y, z);
      });

      vmPositions.push(vmMesh);
    }

    // 4. Storage Pools: Cylinders positioned at the perimeter base
    const storageGeo = new THREE.CylinderGeometry(0.6, 0.6, 1.2, 16);
    const storagePositions = [
      new THREE.Vector3(-6, -4, -3),
      new THREE.Vector3(6, -4, -3),
      new THREE.Vector3(0, -4.5, 4.5)
    ];

    storagePositions.forEach((pos, idx) => {
      const storageMat = new THREE.MeshStandardMaterial({
        color: 0x475569,
        roughness: 0.5,
        metalness: 0.9,
        wireframe: true
      });
      const storageMesh = new THREE.Mesh(storageGeo, storageMat);
      storageMesh.position.copy(pos);
      scene.add(storageMesh);
      registerDisposable(storageMesh);

      // Animate Storage cylinder pulse
      animateQueue.push((time) => {
        storageMesh.rotation.y = time * 0.15;
        const scaleVal = 1.0 + Math.sin(time * 1.5 + idx) * 0.05;
        storageMesh.scale.set(scaleVal, 1.0, scaleVal);
      });

      // Link from Node to Storage
      const points = [nodePositions[idx], pos];
      const linkGeo = new THREE.BufferGeometry().setFromPoints(points);
      const linkMat = new THREE.LineBasicMaterial({ 
        color: 0x64748b, 
        transparent: true,
        opacity: 0.3 
      });
      const link = new THREE.Line(linkGeo, linkMat);
      scene.add(link);
      registerDisposable(link);
      registerDisposable(linkGeo);
    });

    // 5. Telemetry Packets: Small light particles traversing connection paths
    const packetGeo = new THREE.SphereGeometry(0.08, 6, 6);
    const packetMat = new THREE.MeshBasicMaterial({ color: 0x3b82f6 });
    const packets = [];
    const packetPaths = [];

    // Path definitions (pairs of start/end Vectors)
    nodePositions.forEach((nPos) => {
      packetPaths.push({ start: clusterMesh.position, end: nPos });
    });
    storagePositions.forEach((sPos, idx) => {
      packetPaths.push({ start: nodePositions[idx], end: sPos });
    });

    // Spawn 8 data flow packets
    for (let i = 0; i < 8; i++) {
      const packetMesh = new THREE.Mesh(packetGeo, packetMat);
      scene.add(packetMesh);
      registerDisposable(packetMesh);
      
      const pathIndex = i % packetPaths.length;
      const path = packetPaths[pathIndex];
      const speed = 0.2 + (i % 4) * 0.05;
      
      packets.push({
        mesh: packetMesh,
        start: path.start,
        end: path.end,
        progress: (i * 0.125) % 1.0,
        speed: speed
      });
    }

    animateQueue.push((time, delta) => {
      packets.forEach((p) => {
        p.progress += delta * p.speed;
        if (p.progress >= 1.0) {
          p.progress = 0.0;
        }
        p.mesh.position.lerpVectors(p.start, p.end, p.progress);
      });
    });

    // 6. Ambient background particles (max 600 particles for performance safety)
    const particleCount = 120;
    const particleGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 35;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 35;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 20;
    }

    particleGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    
    const pMat = new THREE.PointsMaterial({
      size: 0.08,
      color: 0x94a3b8,
      transparent: true,
      opacity: 0.6
    });
    
    const particleSystem = new THREE.Points(particleGeo, pMat);
    scene.add(particleSystem);
    registerDisposable(particleSystem);

    animateQueue.push((time) => {
      particleSystem.rotation.y = time * 0.05;
      particleSystem.rotation.x = Math.sin(time * 0.03) * 0.1;
    });

    // Parallax mouse movements
    let mouseX = 0;
    let mouseY = 0;
    let targetX = 0;
    let targetY = 0;

    const handleMouseMove = (e) => {
      mouseX = (e.clientX / window.innerWidth - 0.5) * 3;
      mouseY = (e.clientY / window.innerHeight - 0.5) * 3;
    };
    window.addEventListener("mousemove", handleMouseMove);

    // Handle Window Resizing
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener("resize", handleResize);

    // Animation loop & Tab visibility optimization
    let lastTime = 0;
    let animationFrameId = null;
    let isTabVisible = true;

    const tick = (now) => {
      if (!isTabVisible) {
        lastTime = now;
        animationFrameId = requestAnimationFrame(tick);
        return;
      }

      const timeInSecs = now * 0.001;
      const delta = Math.min((now - lastTime) * 0.001, 0.1); // cap delta to prevent frame jumps
      lastTime = now;

      // Render loop items
      animateQueue.forEach((anim) => anim(timeInSecs, delta));

      // Theme-based changes (Dynamic Color adjustment)
      const isDark = themeRef.current === "dark";
      scene.background = null; // transparent to let css gradient shine through
      ambientLight.intensity = isDark ? 0.3 : 0.6;
      pMat.color.setHex(isDark ? 0x94a3b8 : 0x475569);
      pointLight.color.setHex(isDark ? 0x3b82f6 : 0x1d4ed8);
      dirLight1.intensity = isDark ? 0.6 : 1.2;

      // Smooth camera parallax
      targetX += (mouseX - targetX) * 0.05;
      targetY += (mouseY - targetY) * 0.05;
      camera.position.x = targetX;
      camera.position.y = -targetY;
      camera.lookAt(0, 0, 0);

      renderer.render(scene, camera);
      animationFrameId = requestAnimationFrame(tick);
    };

    // Tab visibility listener
    const handleVisibilityChange = () => {
      isTabVisible = document.visibilityState === "visible";
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    // Start loop
    animationFrameId = requestAnimationFrame(tick);

    // Component Cleanup on Unmount (Prevents memory leaks)
    return () => {
      // Clean up event listeners
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("resize", handleResize);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }

      // Dispose Three.js objects
      disposables.forEach((obj) => {
        if (obj.dispose) obj.dispose();
      });

      if (renderer) {
        renderer.dispose();
        if (renderer.domElement && container.contains(renderer.domElement)) {
          container.removeChild(renderer.domElement);
        }
      }
    };
  }, [onError]);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 w-full h-full z-0 overflow-hidden"
      style={{ pointerEvents: "none" }}
    />
  );
};

export default InfrastructureTopologyCanvas;
