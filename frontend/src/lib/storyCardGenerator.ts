/**
 * Generates high-resolution (1080x1920, 9:16) Story Cards for WhatsApp & Instagram
 * with dark gold collegiate branding, dynamic KaTeX-free typography, and instant download/share.
 */

export interface StoryCardOptions {
  studentName: string;
  studentLevel: number;
  levelTitle: string;
  lectureTitle: string;
  subjectName?: string;
  score: number;
  total: number;
  maxCombo: number;
  timeSpentSec: number;
}

export async function generateStoryCardBlob(options: StoryCardOptions): Promise<Blob> {
  const width = 1080;
  const height = 1920;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas 2D context not supported');
  }

  // 1. Background (Rich Midnight Space Gradient)
  const bgGrad = ctx.createLinearGradient(0, 0, width, height);
  bgGrad.addColorStop(0, '#070B14');
  bgGrad.addColorStop(0.5, '#0C1222');
  bgGrad.addColorStop(1, '#05070D');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  // 2. Ambient Radial Glow Orbs
  const drawGlowOrb = (x: number, y: number, r: number, color: string) => {
    const orb = ctx.createRadialGradient(x, y, 0, x, y, r);
    orb.addColorStop(0, color);
    orb.addColorStop(1, 'transparent');
    ctx.fillStyle = orb;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  };

  drawGlowOrb(width * 0.5, height * 0.35, 550, 'rgba(234, 179, 8, 0.12)'); // Gold
  drawGlowOrb(width * 0.2, height * 0.7, 500, 'rgba(59, 130, 246, 0.1)'); // Blue
  drawGlowOrb(width * 0.8, height * 0.2, 450, 'rgba(168, 85, 247, 0.1)'); // Purple

  // 3. Subtle Geometric Grid / Accents
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
  ctx.lineWidth = 2;
  for (let x = 60; x < width; x += 120) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  for (let y = 60; y < height; y += 120) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }

  // 4. Outer Border Frame
  ctx.strokeStyle = 'rgba(234, 179, 8, 0.3)';
  ctx.lineWidth = 4;
  ctx.strokeRect(40, 40, width - 80, height - 80);

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
  ctx.lineWidth = 1;
  ctx.strokeRect(55, 55, width - 110, height - 110);

  // 5. Header: Portal Branding
  ctx.textAlign = 'center';
  ctx.fillStyle = '#EAB308';
  ctx.font = 'bold 36px system-ui, -apple-system, sans-serif';
  ctx.fillText('🎓 BSU MATH & AI PORTAL', width / 2, 140);

  ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
  ctx.font = '500 24px system-ui, -apple-system, sans-serif';
  ctx.fillText('كلية العلوم • منصة طلاب الرياضيات والذكاء الاصطناعي', width / 2, 185);

  // 6. Center Hero Shield / Ring
  const ringY = 620;
  const ringR = 210;

  // Outer glowing ring
  ctx.beginPath();
  ctx.arc(width / 2, ringY, ringR + 15, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(234, 179, 8, 0.25)';
  ctx.lineWidth = 6;
  ctx.stroke();

  // Inner Badge Circle
  const circleGrad = ctx.createLinearGradient(0, ringY - ringR, 0, ringY + ringR);
  circleGrad.addColorStop(0, '#131C31');
  circleGrad.addColorStop(1, '#0A0F1D');
  ctx.beginPath();
  ctx.arc(width / 2, ringY, ringR, 0, Math.PI * 2);
  ctx.fillStyle = circleGrad;
  ctx.fill();
  ctx.strokeStyle = '#EAB308';
  ctx.lineWidth = 5;
  ctx.stroke();

  // Score text
  const pct = options.total > 0 ? Math.round((options.score / options.total) * 100) : 0;
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '900 125px system-ui, -apple-system, sans-serif';
  ctx.fillText(`${options.score}/${options.total}`, width / 2, ringY + 30);

  ctx.fillStyle = pct === 100 ? '#4ADE80' : pct >= 80 ? '#FACC15' : '#60A5FA';
  ctx.font = 'bold 36px system-ui, -apple-system, sans-serif';
  const scoreBadgeText = pct === 100 ? 'تقفيل أسطوري 100% 👑' : pct >= 80 ? `دحيح الدفعة ${pct}% 🔥` : `إنجاز بطل ${pct}% ✨`;
  ctx.fillText(scoreBadgeText, width / 2, ringY + 95);

  // 7. Lecture & Subject Card
  const cardY = 930;
  const cardW = 860;
  const cardH = 210;
  const cardX = (width - cardW) / 2;

  ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
  ctx.fillRect(cardX, cardY, cardW, cardH);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
  ctx.lineWidth = 2;
  ctx.strokeRect(cardX, cardY, cardW, cardH);

  if (options.subjectName) {
    ctx.fillStyle = '#94A3B8';
    ctx.font = 'bold 28px system-ui, -apple-system, sans-serif';
    ctx.fillText(options.subjectName, width / 2, cardY + 60);
  }

  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 42px system-ui, -apple-system, sans-serif';
  // Truncate if lecture title is too long
  let safeTitle = options.lectureTitle;
  if (safeTitle.length > 38) safeTitle = safeTitle.substring(0, 36) + '...';
  ctx.fillText(safeTitle, width / 2, cardY + 125);

  ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
  ctx.font = '500 24px system-ui, -apple-system, sans-serif';
  ctx.fillText('اختبار تدريبي شامل ومحاكاة أسئلة الامتحانات', width / 2, cardY + 170);

  // 8. Stats Row (Combo & Time)
  const statsY = 1200;
  const colW = 400;

  // Stat 1: Max Combo
  const s1X = width / 2 - 230;
  ctx.fillStyle = 'rgba(234, 179, 8, 0.08)';
  ctx.fillRect(s1X - 180, statsY, 360, 140);
  ctx.strokeStyle = 'rgba(234, 179, 8, 0.3)';
  ctx.strokeRect(s1X - 180, statsY, 360, 140);

  ctx.fillStyle = '#FACC15';
  ctx.font = '900 48px system-ui, -apple-system, sans-serif';
  ctx.fillText(`x${Math.max(1, options.maxCombo)} 🔥`, s1X, statsY + 65);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
  ctx.font = 'bold 22px system-ui, -apple-system, sans-serif';
  ctx.fillText('أطول سلسلة كومبو صح', s1X, statsY + 105);

  // Stat 2: Time Taken
  const s2X = width / 2 + 230;
  ctx.fillStyle = 'rgba(59, 130, 246, 0.08)';
  ctx.fillRect(s2X - 180, statsY, 360, 140);
  ctx.strokeStyle = 'rgba(59, 130, 246, 0.3)';
  ctx.strokeRect(s2X - 180, statsY, 360, 140);

  const mins = Math.floor(options.timeSpentSec / 60);
  const secs = options.timeSpentSec % 60;
  const timeStr = mins > 0 ? `${mins} د و ${secs} ث` : `${secs} ثانية`;

  ctx.fillStyle = '#60A5FA';
  ctx.font = '900 48px system-ui, -apple-system, sans-serif';
  ctx.fillText(timeStr, s2X, statsY + 65);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
  ctx.font = 'bold 22px system-ui, -apple-system, sans-serif';
  ctx.fillText('زمن الحل الإجمالي', s2X, statsY + 105);

  // 9. Student Profile Section
  const profileY = 1430;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
  ctx.fillRect(width * 0.1, profileY, width * 0.8, 170);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
  ctx.strokeRect(width * 0.1, profileY, width * 0.8, 170);

  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 44px system-ui, -apple-system, sans-serif';
  ctx.fillText(options.studentName || 'طالب متميز', width / 2, profileY + 70);

  ctx.fillStyle = '#EAB308';
  ctx.font = 'bold 28px system-ui, -apple-system, sans-serif';
  ctx.fillText(`⭐ المستوى ${options.studentLevel} • ${options.levelTitle}`, width / 2, profileY + 120);

  // 10. Call-to-action & Footer Challenge
  ctx.fillStyle = '#38BDF8';
  ctx.font = 'bold 36px system-ui, -apple-system, sans-serif';
  ctx.fillText('⚔️ تقدر تكسر رقمي في الكويز ده؟ ادخل اتحداني!', width / 2, 1710);

  ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
  ctx.font = '500 24px system-ui, -apple-system, sans-serif';
  ctx.fillText('https://bsu-math-ai-portal.pages.dev', width / 2, 1765);

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('Failed to create Blob from canvas'));
    }, 'image/png');
  });
}
