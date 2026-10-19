/**
 * Ultra-lightweight, zero-dependency canvas confetti burst.
 * Runs on GPU-accelerated 2D canvas, perfectly self-cleaning after animation completes.
 */

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  width: number;
  height: number;
  rotation: number;
  rotationSpeed: number;
  color: string;
  alpha: number;
}

const COLLEGIATE_COLORS = [
  '#F59E0B', // Gold
  '#FBBF24', // Amber
  '#10B981', // Emerald
  '#059669', // Deep Emerald
  '#06B6D4', // Cyan
  '#14B8A6', // Teal
  '#F43F5E', // Rose
  '#A855F7', // Royal Purple
];

/**
 * Triggers a vibrant confetti celebration on screen.
 */
export function triggerConfetti(intensity: 'standard' | 'epic' = 'standard'): void {
  if (typeof window === 'undefined') return;

  const particleCount = intensity === 'epic' ? 120 : 60;
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  canvas.style.position = 'fixed';
  canvas.style.top = '0';
  canvas.style.left = '0';
  canvas.style.width = '100vw';
  canvas.style.height = '100vh';
  canvas.style.pointerEvents = 'none';
  canvas.style.zIndex = '99999';

  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  document.body.appendChild(canvas);

  const particles: Particle[] = [];
  const startX = canvas.width / 2;
  const startY = canvas.height * 0.4;

  for (let i = 0; i < particleCount; i++) {
    const angle = Math.random() * Math.PI * 2;
    const velocity = 8 + Math.random() * (intensity === 'epic' ? 16 : 10);

    particles.push({
      x: startX + (Math.random() - 0.5) * 100,
      y: startY + (Math.random() - 0.5) * 60,
      vx: Math.cos(angle) * velocity,
      vy: Math.sin(angle) * velocity - 6,
      width: 6 + Math.random() * 8,
      height: 4 + Math.random() * 6,
      rotation: Math.random() * 360,
      rotationSpeed: (Math.random() - 0.5) * 12,
      color: COLLEGIATE_COLORS[Math.floor(Math.random() * COLLEGIATE_COLORS.length)],
      alpha: 1,
    });
  }

  let animFrameId: number;
  const gravity = 0.35;
  const drag = 0.98;

  const render = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    let activeCount = 0;

    for (const p of particles) {
      p.vx *= drag;
      p.vy += gravity;
      p.x += p.vx;
      p.y += p.vy;
      p.rotation += p.rotationSpeed;

      if (p.y > canvas.height * 0.5) {
        p.alpha -= 0.018;
      }

      if (p.alpha > 0 && p.y < canvas.height + 50) {
        activeCount++;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.globalAlpha = Math.max(0, p.alpha);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.width / 2, -p.height / 2, p.width, p.height);
        ctx.restore();
      }
    }

    if (activeCount > 0) {
      animFrameId = requestAnimationFrame(render);
    } else {
      cancelAnimationFrame(animFrameId);
      if (canvas.parentNode) {
        canvas.parentNode.removeChild(canvas);
      }
    }
  };

  animFrameId = requestAnimationFrame(render);
}
