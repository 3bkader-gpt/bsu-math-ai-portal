'use client';

import React, { useRef, useState, useEffect } from 'react';
import { 
  Edit3, 
  X, 
  Trash2, 
  RotateCcw, 
  Calculator, 
  Palette, 
  Sparkles,
  Maximize2,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { playSound } from '@/lib/audio/soundEngine';

interface MathScratchpadModalProps {
  isOpen: boolean;
  onClose: () => void;
  isDark?: boolean;
  isGirls?: boolean;
}

export default function MathScratchpadModal({
  isOpen,
  onClose,
  isDark = true,
  isGirls = false,
}: MathScratchpadModalProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [tool, setTool] = useState<'pen' | 'eraser'>('pen');
  const [penColor, setPenColor] = useState<string>('#60A5FA'); // Default sky blue
  const [penWidth, setPenWidth] = useState<number>(3);
  const [undoStack, setUndoStack] = useState<string[]>([]);
  
  // Calculator Drawer State
  const [isCalcOpen, setIsCalcOpen] = useState(false);
  const [calcInput, setCalcInput] = useState<string>('');
  const [calcResult, setCalcResult] = useState<string>('');

  // Setup Canvas Size and Initial State
  useEffect(() => {
    if (!isOpen) return;

    const timer = setTimeout(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;

      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.scale(dpr, dpr);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        // Dark ruled background or grid lines
        drawCanvasGrid(ctx, rect.width, rect.height, isDark);

        // Save initial blank state
        setUndoStack([canvas.toDataURL()]);
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [isOpen, isDark]);

  const drawCanvasGrid = (ctx: CanvasRenderingContext2D, width: number, height: number, dark: boolean) => {
    ctx.fillStyle = dark ? '#0F172A' : '#F8FAFC';
    ctx.fillRect(0, 0, width, height);

    // Subtle math graph paper grid
    ctx.strokeStyle = dark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.04)';
    ctx.lineWidth = 1;

    const gridSize = 24;
    for (let x = 0; x < width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
  };

  const getCoordinates = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const startDrawing = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsDrawing(true);
    const { x, y } = getCoordinates(e);

    ctx.beginPath();
    ctx.moveTo(x, y);

    if (tool === 'eraser') {
      ctx.strokeStyle = isDark ? '#0F172A' : '#F8FAFC';
      ctx.lineWidth = penWidth * 5;
    } else {
      ctx.strokeStyle = penColor;
      ctx.lineWidth = penWidth;
    }
  };

  const draw = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCoordinates(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);

    const canvas = canvasRef.current;
    if (!canvas) return;
    // Save snapshot for undo
    setUndoStack(prev => [...prev.slice(-12), canvas.toDataURL()]);
  };

  const handleUndo = () => {
    if (undoStack.length <= 1) return;
    playSound('button_click' as any);

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const nextStack = [...undoStack];
    nextStack.pop(); // Remove current
    const prevImage = nextStack[nextStack.length - 1];

    if (prevImage) {
      const img = new Image();
      img.src = prevImage;
      img.onload = () => {
        const dpr = window.devicePixelRatio || 1;
        ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
        ctx.drawImage(img, 0, 0, canvas.width / dpr, canvas.height / dpr);
        setUndoStack(nextStack);
      };
    }
  };

  const handleClear = () => {
    playSound('button_click' as any);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    drawCanvasGrid(ctx, rect.width, rect.height, isDark);
    setUndoStack([canvas.toDataURL()]);
  };

  // Safe Calculator Evaluation
  const evaluateCalculator = () => {
    if (!calcInput.trim()) return;
    try {
      // Replace friendly math symbols with JS Math equivalents
      let expr = calcInput
        .replace(/×/g, '*')
        .replace(/÷/g, '/')
        .replace(/π/g, 'Math.PI')
        .replace(/e/g, 'Math.E')
        .replace(/sin\(/g, 'Math.sin(')
        .replace(/cos\(/g, 'Math.cos(')
        .replace(/tan\(/g, 'Math.tan(')
        .replace(/sqrt\(/g, 'Math.sqrt(')
        .replace(/ln\(/g, 'Math.log(')
        .replace(/\^/g, '**');

      // Sanitization: only allow digits, Math functions, operators and parens
      if (/[^0-9\.\+\-\*\/\(\)\sMathPIEsqrtlnsincoag\^]/.test(expr)) {
        setCalcResult('خطأ');
        return;
      }

      // Safe Function evaluation
      const res = Function(`"use strict"; return (${expr});`)();
      if (typeof res === 'number' && !isNaN(res)) {
        // Format to 6 decimal places if needed
        const formatted = Number.isInteger(res) ? res.toString() : parseFloat(res.toFixed(6)).toString();
        setCalcResult(formatted);
      } else {
        setCalcResult('خطأ');
      }
    } catch {
      setCalcResult('خطأ');
    }
  };

  const appendCalc = (val: string) => {
    setCalcInput(prev => prev + val);
  };

  if (!isOpen) return null;

  const penColors = isDark 
    ? ['#F8FAFC', '#60A5FA', '#34D399', '#F472B6', '#FBBF24'] 
    : ['#0F172A', '#2563EB', '#059669', '#E11D48', '#D97706'];

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-200"
      style={{
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        backdropFilter: 'blur(8px)',
      }}
    >
      <div 
        className="w-full max-w-4xl h-[94vh] rounded-3xl border shadow-2xl flex flex-col overflow-hidden transition-all relative"
        style={{
          backgroundColor: isDark ? '#0B1120' : '#FFFFFF',
          borderColor: isDark ? 'rgba(59, 130, 246, 0.3)' : 'rgba(219, 234, 254, 0.9)',
          boxShadow: isDark 
            ? '0 25px 50px -12px rgba(0, 0, 0, 0.9), 0 0 50px rgba(59, 130, 246, 0.2)' 
            : '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
        }}
        dir="rtl"
      >
        {/* Header Toolbar */}
        <div 
          className="p-3 sm:p-4 border-b flex items-center justify-between shrink-0 gap-2 flex-wrap"
          style={{
            borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
            backgroundColor: isDark ? 'rgba(15, 23, 42, 0.7)' : 'rgba(248, 250, 252, 0.9)',
          }}
        >
          {/* Title & Info */}
          <div className="flex items-center gap-2">
            <div 
              className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border"
              style={{
                backgroundColor: isGirls ? 'rgba(244, 63, 94, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                borderColor: isGirls ? 'rgba(244, 63, 94, 0.3)' : 'rgba(59, 130, 246, 0.3)',
                color: isGirls ? '#FB7185' : '#60A5FA',
              }}
            >
              <Edit3 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-black truncate" style={{ color: isDark ? '#F8FAFC' : '#0F172A' }}>
                المسودة الرياضية التفاعلية ✏️
              </h2>
              <span className="text-[10px] font-semibold opacity-70 block" style={{ color: isDark ? '#94A3B8' : '#64748B' }}>
                حل المسائل بيدك بالقلم أو اللمس دون مغادرة المنصة
              </span>
            </div>
          </div>

          {/* Tools Palette */}
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
            {/* Pen Tool */}
            <button
              type="button"
              onClick={() => setTool('pen')}
              className="px-2.5 py-1.5 rounded-xl border text-xs font-black transition-all cursor-pointer flex items-center gap-1"
              style={{
                backgroundColor: tool === 'pen'
                  ? (isGirls ? 'rgba(244, 63, 94, 0.2)' : 'rgba(59, 130, 246, 0.2)')
                  : (isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.04)'),
                borderColor: tool === 'pen'
                  ? (isGirls ? '#F43F5E' : '#3B82F6')
                  : (isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)'),
                color: tool === 'pen' ? (isGirls ? '#FB7185' : '#60A5FA') : (isDark ? '#CBD5E1' : '#475569'),
              }}
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">قلم</span>
            </button>

            {/* Eraser Tool */}
            <button
              type="button"
              onClick={() => setTool('eraser')}
              className="px-2.5 py-1.5 rounded-xl border text-xs font-black transition-all cursor-pointer flex items-center gap-1"
              style={{
                backgroundColor: tool === 'eraser'
                  ? 'rgba(239, 68, 68, 0.2)'
                  : (isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.04)'),
                borderColor: tool === 'eraser'
                  ? '#EF4444'
                  : (isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)'),
                color: tool === 'eraser' ? '#FCA5A5' : (isDark ? '#CBD5E1' : '#475569'),
              }}
            >
              <span>🧹</span>
              <span className="hidden sm:inline">ممحاة</span>
            </button>

            {/* Colors */}
            <div className="flex items-center gap-1 px-1">
              {penColors.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => {
                    setPenColor(c);
                    setTool('pen');
                  }}
                  className="w-5 h-5 rounded-full border transition-transform hover:scale-125 cursor-pointer"
                  style={{
                    backgroundColor: c,
                    borderColor: penColor === c ? '#FFFFFF' : 'transparent',
                    boxShadow: penColor === c ? '0 0 0 2px #3B82F6' : 'none',
                  }}
                />
              ))}
            </div>

            {/* Undo */}
            <button
              type="button"
              onClick={handleUndo}
              disabled={undoStack.length <= 1}
              className="p-1.5 rounded-xl border transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
              style={{
                backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.04)',
                borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)',
                color: isDark ? '#CBD5E1' : '#475569',
              }}
              title="تراجع"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            {/* Clear */}
            <button
              type="button"
              onClick={handleClear}
              className="p-1.5 rounded-xl border transition-all hover:text-rose-400 cursor-pointer"
              style={{
                backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.04)',
                borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)',
                color: isDark ? '#CBD5E1' : '#475569',
              }}
              title="مسح المسودة بالكامل"
            >
              <Trash2 className="w-4 h-4" />
            </button>

            {/* Calculator Toggle */}
            <button
              type="button"
              onClick={() => setIsCalcOpen(!isCalcOpen)}
              className="px-2.5 py-1.5 rounded-xl border text-xs font-black transition-all cursor-pointer flex items-center gap-1.5"
              style={{
                backgroundColor: isCalcOpen
                  ? 'rgba(168, 85, 247, 0.2)'
                  : (isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.04)'),
                borderColor: isCalcOpen
                  ? '#A855F7'
                  : (isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)'),
                color: isCalcOpen ? '#D8B4FE' : (isDark ? '#CBD5E1' : '#475569'),
              }}
            >
              <Calculator className="w-3.5 h-3.5" />
              <span>الحاسبة {isCalcOpen ? '▲' : '▼'}</span>
            </button>

            {/* Close Modal */}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl border transition-all hover:scale-105 active:scale-95 cursor-pointer mr-1"
              style={{
                backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.04)',
                borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)',
                color: isDark ? '#94A3B8' : '#64748B',
              }}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Embedded Calculator Drawer */}
        {isCalcOpen && (
          <div 
            className="p-3 border-b animate-in slide-in-from-top duration-200 shrink-0"
            style={{
              backgroundColor: isDark ? '#0A0F1D' : '#F1F5F9',
              borderColor: isDark ? 'rgba(168, 85, 247, 0.3)' : 'rgba(216, 180, 254, 0.8)',
            }}
          >
            <div className="max-w-md mx-auto space-y-2">
              {/* Calculator Screen */}
              <div 
                className="p-2.5 rounded-xl border flex flex-col items-end justify-center min-h-[48px]"
                style={{
                  backgroundColor: isDark ? '#020617' : '#FFFFFF',
                  borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
                }}
              >
                <div className="text-xs font-mono opacity-60 truncate w-full text-left" dir="ltr">
                  {calcInput || '0'}
                </div>
                <div className="text-base font-black font-mono" style={{ color: isGirls ? '#FB7185' : '#60A5FA' }} dir="ltr">
                  {calcResult ? `= ${calcResult}` : ''}
                </div>
              </div>

              {/* Calculator Keypad */}
              <div className="grid grid-cols-7 gap-1 text-xs font-bold" dir="ltr">
                {['sin(', 'cos(', 'tan(', 'sqrt(', '^', '(', ')'].map(k => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => appendCalc(k)}
                    className="p-1.5 rounded-lg border text-center transition-all hover:scale-105 active:scale-95 cursor-pointer"
                    style={{
                      backgroundColor: isDark ? 'rgba(168, 85, 247, 0.1)' : 'rgba(243, 232, 255, 0.8)',
                      borderColor: isDark ? 'rgba(168, 85, 247, 0.25)' : 'rgba(216, 180, 254, 0.6)',
                      color: isDark ? '#D8B4FE' : '#7E22CE',
                    }}
                  >
                    {k}
                  </button>
                ))}

                {['7', '8', '9', '÷', 'π', 'ln(', 'C'].map(k => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => {
                      if (k === 'C') { setCalcInput(''); setCalcResult(''); }
                      else appendCalc(k);
                    }}
                    className="p-1.5 rounded-lg border text-center transition-all hover:scale-105 active:scale-95 cursor-pointer font-black"
                    style={{
                      backgroundColor: k === 'C' ? 'rgba(239, 68, 68, 0.15)' : (isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(255, 255, 255, 0.9)'),
                      borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)',
                      color: k === 'C' ? '#FCA5A5' : (isDark ? '#F8FAFC' : '#0F172A'),
                    }}
                  >
                    {k}
                  </button>
                ))}

                {['4', '5', '6', '×', 'e', 'DEL', '='].map(k => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => {
                      if (k === 'DEL') setCalcInput(p => p.slice(0, -1));
                      else if (k === '=') evaluateCalculator();
                      else appendCalc(k);
                    }}
                    className="p-1.5 rounded-lg border text-center transition-all hover:scale-105 active:scale-95 cursor-pointer font-black"
                    style={{
                      backgroundColor: k === '=' 
                        ? (isGirls ? '#F43F5E' : '#3B82F6')
                        : (isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(255, 255, 255, 0.9)'),
                      borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)',
                      color: k === '=' ? '#FFFFFF' : (isDark ? '#F8FAFC' : '#0F172A'),
                    }}
                  >
                    {k}
                  </button>
                ))}

                {['1', '2', '3', '-', '0', '.', '+'].map(k => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => appendCalc(k)}
                    className="p-1.5 rounded-lg border text-center transition-all hover:scale-105 active:scale-95 cursor-pointer font-black"
                    style={{
                      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(255, 255, 255, 0.9)',
                      borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)',
                      color: isDark ? '#F8FAFC' : '#0F172A',
                    }}
                  >
                    {k}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Canvas Drawing Surface */}
        <div className="flex-1 w-full h-full relative overflow-hidden bg-slate-900 cursor-crosshair">
          <canvas
            ref={canvasRef}
            onPointerDown={startDrawing}
            onPointerMove={draw}
            onPointerUp={stopDrawing}
            onPointerLeave={stopDrawing}
            className="w-full h-full touch-none"
          />
        </div>
      </div>
    </div>
  );
}
