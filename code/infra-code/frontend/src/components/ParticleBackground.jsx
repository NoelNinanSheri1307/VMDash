import React, { useEffect, useRef } from "react";

const ParticleBackground = () => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    let animFrameId;
    let w, h;

    const resize = () => {
      w = canvas.width  = window.innerWidth;
      h = canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    // Particle config (stars)
    const COUNT = 85;
    const particles = Array.from({ length: COUNT }, () => ({
      x:   Math.random() * window.innerWidth,
      y:   Math.random() * window.innerHeight,
      r:   Math.random() * 1.3 + 0.4,
      vx:  (Math.random() - 0.5) * 0.18,
      vy:  (Math.random() - 0.5) * 0.18,
      o:   Math.random() * 0.45 + 0.1,
    }));

    // Space objects (Subtle planets & orbital bodies)
    const planets = [
      {
        x: 0.85 * window.innerWidth,
        y: 0.22 * window.innerHeight,
        r: 38,
        color1: "rgba(244, 114, 22, 0.15)", // Orange gas giant
        color2: "rgba(194, 65, 12, 0.02)",
        hasRings: true,
        ringColor: "rgba(251, 146, 60, 0.1)",
        ringRadiusX: 68,
        ringRadiusY: 10,
        ringAngle: -Math.PI / 8,
        driftVx: -0.015,
        driftVy: 0.005,
      },
      {
        x: 0.25 * window.innerWidth,
        y: 0.78 * window.innerHeight,
        r: 26,
        color1: "rgba(56, 189, 248, 0.15)", // Light blue
        color2: "rgba(14, 136, 211, 0.02)",
        hasRings: false,
        driftVx: 0.008,
        driftVy: -0.01,
      },
      {
        x: 0.12 * window.innerWidth,
        y: 0.16 * window.innerHeight,
        r: 12,
        color1: "rgba(167, 139, 250, 0.12)", // Purple
        color2: "rgba(109, 40, 217, 0.02)",
        hasRings: false,
        hasMoon: true,
        moonOrbitR: 24,
        moonSpeed: 0.008,
        moonAngle: Math.random() * Math.PI * 2,
        driftVx: -0.005,
        driftVy: -0.005,
      }
    ];

    // Rockets traversing the space background
    const rockets = [
      {
        x: -40,
        y: 0.35 * window.innerHeight,
        vx: 0.45,
        vy: -0.08,
        flameParticles: [],
      },
      {
        x: -120,
        y: 0.65 * window.innerHeight,
        vx: 0.52,
        vy: 0.05,
        flameParticles: [],
      }
    ];

    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = "#000000";
      ctx.fillRect(0, 0, w, h);

      // Draw Connection Constellations (Subtle stars grid)
      for (let i = 0; i < COUNT; i++) {
        for (let j = i + 1; j < COUNT; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 130) {
            const lineOpacity = (1 - dist / 130) * 0.09;
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(255,255,255,${lineOpacity})`;
            ctx.lineWidth = 0.4;
            ctx.stroke();
          }
        }
      }

      // Draw Planets
      for (const planet of planets) {
        planet.x += planet.driftVx;
        planet.y += planet.driftVy;

        // Wrap planets around screen boundaries
        if (planet.x < -planet.r * 3) planet.x = w + planet.r * 2;
        else if (planet.x > w + planet.r * 3) planet.x = -planet.r * 2;
        if (planet.y < -planet.r * 3) planet.y = h + planet.r * 2;
        else if (planet.y > h + planet.r * 3) planet.y = -planet.r * 2;

        // Saturn 3D Rings Back Half
        if (planet.hasRings) {
          ctx.save();
          ctx.translate(planet.x, planet.y);
          ctx.rotate(planet.ringAngle);
          ctx.beginPath();
          ctx.ellipse(0, 0, planet.ringRadiusX, planet.ringRadiusY, 0, Math.PI, 2 * Math.PI);
          ctx.strokeStyle = planet.ringColor;
          ctx.lineWidth = 3;
          ctx.stroke();
          ctx.restore();
        }

        // Planet Body Gradient
        const grad = ctx.createRadialGradient(
          planet.x - planet.r * 0.3,
          planet.y - planet.r * 0.3,
          planet.r * 0.1,
          planet.x,
          planet.y,
          planet.r
        );
        grad.addColorStop(0, planet.color1);
        grad.addColorStop(1, planet.color2);

        ctx.beginPath();
        ctx.arc(planet.x, planet.y, planet.r, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();

        // Subtle craters
        if (!planet.hasRings && planet.r > 20) {
          ctx.fillStyle = "rgba(255, 255, 255, 0.03)";
          ctx.beginPath();
          ctx.arc(planet.x - planet.r * 0.25, planet.y + planet.r * 0.2, planet.r * 0.18, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.arc(planet.x + planet.r * 0.35, planet.y - planet.r * 0.25, planet.r * 0.12, 0, Math.PI * 2);
          ctx.fill();
        }

        // Saturn 3D Rings Front Half
        if (planet.hasRings) {
          ctx.save();
          ctx.translate(planet.x, planet.y);
          ctx.rotate(planet.ringAngle);
          ctx.beginPath();
          ctx.ellipse(0, 0, planet.ringRadiusX, planet.ringRadiusY, 0, 0, Math.PI);
          ctx.strokeStyle = planet.ringColor;
          ctx.lineWidth = 3;
          ctx.stroke();
          ctx.restore();
        }

        // Moon Orbit
        if (planet.hasMoon) {
          planet.moonAngle += planet.moonSpeed;
          const moonX = planet.x + Math.cos(planet.moonAngle) * planet.moonOrbitR;
          const moonY = planet.y + Math.sin(planet.moonAngle) * planet.moonOrbitR;
          ctx.beginPath();
          ctx.arc(moonX, moonY, 2.5, 0, Math.PI * 2);
          ctx.fillStyle = "rgba(255, 255, 255, 0.25)";
          ctx.fill();
        }
      }

      // Draw Rockets
      for (const rocket of rockets) {
        rocket.x += rocket.vx;
        rocket.y += rocket.vy;

        // Wrap around/Reset rocket if it goes off screen
        if (rocket.x > w + 100 || rocket.y < -100 || rocket.y > h + 100) {
          rocket.x = -60;
          rocket.y = (0.15 + Math.random() * 0.7) * h;
          rocket.vx = 0.35 + Math.random() * 0.3;
          rocket.vy = (Math.random() - 0.5) * 0.12;
        }

        // Emit exhaust flame particles
        if (Math.random() < 0.4) {
          const angle = Math.atan2(rocket.vy, rocket.vx);
          rocket.flameParticles.push({
            x: rocket.x - Math.cos(angle) * 11,
            y: rocket.y - Math.sin(angle) * 11,
            vx: -rocket.vx * 0.45 + (Math.random() - 0.5) * 0.15,
            vy: -rocket.vy * 0.45 + (Math.random() - 0.5) * 0.15,
            size: Math.random() * 2.5 + 0.8,
            life: 1.0,
          });
        }

        // Draw flame trail
        for (let i = rocket.flameParticles.length - 1; i >= 0; i--) {
          const fp = rocket.flameParticles[i];
          fp.x += fp.vx;
          fp.y += fp.vy;
          fp.life -= 0.03;
          if (fp.life <= 0) {
            rocket.flameParticles.splice(i, 1);
            continue;
          }
          ctx.beginPath();
          ctx.arc(fp.x, fp.y, fp.size * fp.life, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(249, 115, 22, ${fp.life * 0.4})`; // subtle orange flame
          ctx.fill();
        }

        // Draw Rocket Shape
        const angle = Math.atan2(rocket.vy, rocket.vx);
        ctx.save();
        ctx.translate(rocket.x, rocket.y);
        ctx.rotate(angle);

        // Rocket Silhouette & outline (subtle)
        ctx.fillStyle = "rgba(148, 163, 184, 0.3)"; // Slate base
        ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
        ctx.lineWidth = 0.8;

        // Body
        ctx.beginPath();
        ctx.rect(-9, -2.5, 14, 5);
        ctx.fill();
        ctx.stroke();

        // Nose (Red)
        ctx.fillStyle = "rgba(239, 68, 68, 0.35)";
        ctx.beginPath();
        ctx.moveTo(5, -2.5);
        ctx.lineTo(11, 0);
        ctx.lineTo(5, 2.5);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Fins (Blue)
        ctx.fillStyle = "rgba(56, 189, 248, 0.35)";
        ctx.beginPath();
        ctx.moveTo(-9, -2.5);
        ctx.lineTo(-13, -5);
        ctx.lineTo(-6, -2.5);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(-9, 2.5);
        ctx.lineTo(-13, 5);
        ctx.lineTo(-6, 2.5);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.restore();
      }

      // Draw Stars
      for (const p of particles) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${p.o})`;
        ctx.fill();

        // Drift
        p.x += p.vx;
        p.y += p.vy;

        // Wrap around screen edges
        if (p.x < -5) p.x = w + 5;
        else if (p.x > w + 5) p.x = -5;
        if (p.y < -5) p.y = h + 5;
        else if (p.y > h + 5) p.y = -5;
      }

      animFrameId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animFrameId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        zIndex: 0,
        display: "block",
        pointerEvents: "none",
      }}
    />
  );
};

export default ParticleBackground;
