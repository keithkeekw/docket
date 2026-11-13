import { useEffect, useRef } from 'react';

const COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#a855f7', '#ec4899', '#06b6d4'];

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
  spin: number;
  size: number;
  color: string;
  round: boolean;
};

/**
 * A short, dependency-free confetti burst rendered on a fixed canvas. `burst`
 * increments to trigger a new animation; 0 is the idle state.
 */
export function Confetti({ burst }: { burst: number }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (burst === 0) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (!canvas || !context) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = window.innerWidth;
    const height = window.innerHeight;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    context.setTransform(dpr, 0, 0, dpr, 0, 0);

    const originX = width / 2;
    const originY = Math.max(80, height * 0.32);
    const particles: Particle[] = Array.from({ length: 130 }, () => {
      const angle = Math.random() * Math.PI * 2;
      const speed = 3 + Math.random() * 9;
      return {
        x: originX,
        y: originY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 4,
        rotation: Math.random() * Math.PI,
        spin: (Math.random() - 0.5) * 0.3,
        size: 4 + Math.random() * 7,
        color: COLORS[Math.floor(Math.random() * COLORS.length)] ?? COLORS[0] ?? '#3b82f6',
        round: Math.random() > 0.7,
      };
    });

    const startedAt = performance.now();
    let frame = 0;

    function draw(now: number) {
      if (!context) return;

      const elapsed = now - startedAt;
      context.clearRect(0, 0, width, height);

      for (const particle of particles) {
        particle.vy += 0.2;
        particle.vx *= 0.995;
        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.rotation += particle.spin;

        context.save();
        context.translate(particle.x, particle.y);
        context.rotate(particle.rotation);
        context.globalAlpha = Math.max(0, 1 - elapsed / 2400);
        context.fillStyle = particle.color;

        if (particle.round) {
          context.beginPath();
          context.arc(0, 0, particle.size / 2, 0, Math.PI * 2);
          context.fill();
        } else {
          context.fillRect(
            -particle.size / 2,
            -particle.size / 4,
            particle.size,
            particle.size / 2,
          );
        }
        context.restore();
      }

      if (elapsed < 2400) {
        frame = requestAnimationFrame(draw);
      } else {
        context.clearRect(0, 0, width, height);
      }
    }

    frame = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(frame);
      context.clearRect(0, 0, width, height);
    };
  }, [burst]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-[60]"
    />
  );
}
