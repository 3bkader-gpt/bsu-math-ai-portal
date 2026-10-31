'use client';

import React, { useState, useEffect } from 'react';
import { 
  Bookmark, 
  X, 
  Plus, 
  Trash2, 
  Share2, 
  Search, 
  Check, 
  BookOpen, 
  Sparkles,
  FileText
} from 'lucide-react';
import { playSound } from '@/lib/audio/soundEngine';
import type { AcademicSubject } from '@/types/academic';

export interface StudentNote {
  id: string;
  title: string;
  content: string;
  subjectId?: number;
  subjectName?: string;
  createdAt: string;
}

const STORAGE_KEY_BINDER = 'bsu_math_notebook_v1';

interface StudentBinderModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeSubject?: AcademicSubject | null;
  isDark?: boolean;
  isGirls?: boolean;
}

export default function StudentBinderModal({
  isOpen,
  onClose,
  activeSubject,
  isDark = true,
  isGirls = false,
}: StudentBinderModalProps) {
  const [notes, setNotes] = useState<StudentNote[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [isCopied, setIsCopied] = useState(false);

  // Load saved notes
  useEffect(() => {
    if (!isOpen) return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY_BINDER);
      if (raw) {
        setNotes(JSON.parse(raw));
      } else {
        // Initial sample note
        setNotes([
          {
            id: 'sample_note_1',
            title: 'تذكرة لقوانين صيغ فرينيه (هندسة تفاضلية)',
            content: 'صيغ فرينيه الأساسية: dt/ds = kappa * n، و db/ds = -tau * n، و dn/ds = -kappa * t + tau * b. تذكر دائماً أن متجهات t و n و b متعامدة مثنى مثنى.',
            subjectId: activeSubject?.id,
            subjectName: activeSubject?.name || 'هندسة تفاضلية',
            createdAt: new Date().toISOString(),
          }
        ]);
      }
    } catch {}
  }, [isOpen, activeSubject]);

  const saveNotes = (updated: StudentNote[]) => {
    setNotes(updated);
    try {
      localStorage.setItem(STORAGE_KEY_BINDER, JSON.stringify(updated));
    } catch {}
  };

  const handleAddNote = () => {
    if (!newTitle.trim() || !newContent.trim()) return;
    playSound('quiz_correct');

    const note: StudentNote = {
      id: `note_${Date.now()}`,
      title: newTitle.trim(),
      content: newContent.trim(),
      subjectId: activeSubject?.id,
      subjectName: activeSubject?.name || 'ملاحظات عامة',
      createdAt: new Date().toISOString(),
    };

    saveNotes([note, ...notes]);
    setNewTitle('');
    setNewContent('');
    setIsAdding(false);
  };

  const handleDeleteNote = (id: string) => {
    if (window.confirm('هل أنت متأكد من حذف هذه الملاحظة؟')) {
      playSound('button_click' as any);
      saveNotes(notes.filter(n => n.id !== id));
    }
  };

  const handleShareAll = () => {
    if (notes.length === 0) return;
    let text = `📌 *كشكول ملاحظاتي وقوانيني - منصة بني سويف للرياضيات*\n\n`;
    notes.forEach((n, i) => {
      text += `*${i + 1}. ${n.title}* [${n.subjectName || ''}]\n`;
      text += `${n.content}\n\n`;
    });

    navigator.clipboard.writeText(text).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2500);
    });
  };

  if (!isOpen) return null;

  const filteredNotes = notes.filter(n => 
    n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    n.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (n.subjectName && n.subjectName.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200"
      style={{
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(8px)',
      }}
    >
      <div 
        className="w-full max-w-2xl rounded-3xl border shadow-2xl flex flex-col max-h-[90vh] overflow-hidden transition-all"
        style={{
          backgroundColor: isDark ? '#0B1120' : '#FFFFFF',
          borderColor: isDark ? 'rgba(59, 130, 246, 0.3)' : 'rgba(219, 234, 254, 0.9)',
          boxShadow: isDark 
            ? '0 25px 50px -12px rgba(0, 0, 0, 0.8), 0 0 40px rgba(59, 130, 246, 0.15)' 
            : '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
        }}
        dir="rtl"
      >
        {/* Header */}
        <div 
          className="p-4 sm:p-5 border-b flex items-center justify-between shrink-0"
          style={{
            borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
            backgroundColor: isDark ? 'rgba(15, 23, 42, 0.6)' : 'rgba(248, 250, 252, 0.8)',
          }}
        >
          <div className="flex items-center gap-3">
            <div 
              className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 border"
              style={{
                backgroundColor: isGirls ? 'rgba(244, 63, 94, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                borderColor: isGirls ? 'rgba(244, 63, 94, 0.3)' : 'rgba(245, 158, 11, 0.3)',
                color: isGirls ? '#FB7185' : '#FBBF24',
              }}
            >
              <Bookmark className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black" style={{ color: isDark ? '#F8FAFC' : '#0F172A' }}>
                كشكول ملاحظاتي وقوانيني الخاصة 📌
              </h2>
              <p className="text-xs font-semibold opacity-75" style={{ color: isDark ? '#94A3B8' : '#64748B' }}>
                حفظ الأفكار الذهبية، استنتاجات الدكاترة، وملاحظات المذاكرة
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {notes.length > 0 && (
              <button
                type="button"
                onClick={handleShareAll}
                className="p-2 rounded-xl border text-xs font-bold transition-all hover:scale-105 active:scale-95 cursor-pointer flex items-center gap-1.5"
                style={{
                  backgroundColor: isDark ? 'rgba(16, 185, 129, 0.15)' : 'rgba(236, 253, 245, 0.9)',
                  borderColor: isDark ? 'rgba(16, 185, 129, 0.3)' : 'rgba(167, 243, 208, 0.8)',
                  color: isDark ? '#6EE7B7' : '#059669',
                }}
                title="نسخ جميع الملاحظات للواتساب"
              >
                {isCopied ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
                <span className="hidden sm:inline">{isCopied ? 'تم النسخ!' : 'واتساب'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl border transition-all hover:scale-105 active:scale-95 cursor-pointer"
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

        {/* Search & Add Bar */}
        <div className="p-4 border-b flex items-center gap-3 shrink-0" style={{ borderColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.06)' }}>
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 opacity-50" />
            <input
              type="text"
              placeholder="ابحث في ملاحظاتك..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pr-9 pl-3 py-2 rounded-xl border text-xs font-semibold focus:outline-none transition-all"
              style={{
                backgroundColor: isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.02)',
                borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)',
                color: isDark ? '#F8FAFC' : '#0F172A',
              }}
            />
          </div>

          <button
            type="button"
            onClick={() => setIsAdding(!isAdding)}
            className="px-3.5 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all hover:scale-105 active:scale-95 cursor-pointer shrink-0"
            style={{
              backgroundColor: isGirls ? 'rgba(244, 63, 94, 0.2)' : 'rgba(59, 130, 246, 0.2)',
              borderColor: isGirls ? '#F43F5E' : '#3B82F6',
              color: isGirls ? '#FB7185' : '#60A5FA',
              borderWidth: 1,
            }}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{isAdding ? 'إلغاء' : 'إضافة ملاحظة'}</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">

          {/* New Note Form */}
          {isAdding && (
            <div 
              className="p-4 rounded-2xl border space-y-3 animate-in slide-in-from-top duration-200"
              style={{
                backgroundColor: isDark ? 'rgba(15, 23, 42, 0.6)' : 'rgba(248, 250, 252, 0.9)',
                borderColor: isGirls ? 'rgba(244, 63, 94, 0.3)' : 'rgba(59, 130, 246, 0.3)',
              }}
            >
              <h4 className="text-xs font-black" style={{ color: isDark ? '#F8FAFC' : '#0F172A' }}>
                تدوين ملاحظة / فكرة جديدة:
              </h4>

              <input
                type="text"
                placeholder="عنوان الملاحظة (مثلاً: فكرة مسألة صعبة أو قانون مهم)..."
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border text-xs font-bold focus:outline-none"
                style={{
                  backgroundColor: isDark ? '#020617' : '#FFFFFF',
                  borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
                  color: isDark ? '#F8FAFC' : '#0F172A',
                }}
              />

              <textarea
                placeholder="اكتب ملاحظتك، الشرح، أو تفاصيل الخطوة هنا..."
                rows={3}
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                className="w-full p-3 rounded-xl border text-xs font-medium focus:outline-none resize-none"
                style={{
                  backgroundColor: isDark ? '#020617' : '#FFFFFF',
                  borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
                  color: isDark ? '#F8FAFC' : '#0F172A',
                }}
              />

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="px-3 py-1.5 rounded-xl border text-xs font-bold cursor-pointer opacity-70 hover:opacity-100"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  onClick={handleAddNote}
                  className="px-4 py-1.5 rounded-xl font-black text-xs text-white shadow-md transition-all hover:scale-105 active:scale-95 cursor-pointer"
                  style={{
                    background: isGirls
                      ? 'linear-gradient(135deg, #F43F5E, #E11D48)'
                      : 'linear-gradient(135deg, #2563EB, #1D4ED8)',
                  }}
                >
                  حفظ في الكشكول 📌
                </button>
              </div>
            </div>
          )}

          {/* Notes Cards List */}
          {filteredNotes.length > 0 ? (
            <div className="space-y-3">
              {filteredNotes.map((note) => (
                <div 
                  key={note.id}
                  className="p-4 rounded-2xl border space-y-2 transition-all hover:scale-[1.01]"
                  style={{
                    backgroundColor: isDark ? 'rgba(15, 23, 42, 0.4)' : 'rgba(248, 250, 252, 0.8)',
                    borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
                  }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-black" style={{ color: isDark ? '#F8FAFC' : '#0F172A' }}>
                        {note.title}
                      </span>
                      {note.subjectName && (
                        <span 
                          className="text-[10px] font-bold px-2 py-0.5 rounded-md border"
                          style={{
                            backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.04)',
                            borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)',
                            color: isDark ? '#CBD5E1' : '#475569',
                          }}
                        >
                          {note.subjectName}
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDeleteNote(note.id)}
                      className="p-1 rounded-lg transition-colors hover:text-rose-400 opacity-60 hover:opacity-100 cursor-pointer"
                      title="حذف الملاحظة"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <p className="text-xs leading-relaxed opacity-85 whitespace-pre-wrap font-medium" style={{ color: isDark ? '#CBD5E1' : '#334155' }}>
                    {note.content}
                  </p>

                  <div className="text-[10px] font-semibold opacity-50 text-left pt-1" style={{ color: isDark ? '#94A3B8' : '#64748B' }}>
                    {new Date(note.createdAt).toLocaleDateString('ar-EG')}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 space-y-3 opacity-60">
              <FileText className="w-10 h-10 mx-auto" />
              <p className="text-xs font-bold">لا توجد ملاحظات مسجلة حتى الآن.</p>
              <button
                type="button"
                onClick={() => setIsAdding(true)}
                className="text-xs font-bold text-blue-400 hover:underline"
              >
                اضغط هنا لإضافة أول ملاحظة في كشكولك
              </button>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div 
          className="p-3 sm:p-4 border-t flex items-center justify-between text-xs"
          style={{
            borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
            backgroundColor: isDark ? 'rgba(15, 23, 42, 0.6)' : 'rgba(248, 250, 252, 0.8)',
          }}
        >
          <div className="text-[11px] font-bold opacity-75" style={{ color: isDark ? '#94A3B8' : '#64748B' }}>
            الملاحظات تُحفظ في جهازك وتظل معك دائماً 💾
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl border text-xs font-bold transition-all hover:scale-105 active:scale-95 cursor-pointer"
            style={{
              backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)',
              borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)',
              color: isDark ? '#CBD5E1' : '#334155',
            }}
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
}
