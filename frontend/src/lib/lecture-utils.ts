/**
 * Shared Lecture Utilities, Models, and Quiz Feedback for BSU Math Portal.
 */

import { AcademicMediaAsset, AcademicLectureBundle } from '@/types/academic';
import { getApiUrl } from '@/lib/api';

export interface QuizQuestion {
  number: number;
  question: string;
  options: string[];
  correctIndex: number;
  hint: string;
}

export interface Flashcard {
  question: string;
  answer: string;
}

export interface OriginalPdfInfo {
  id: number;
  isBook: boolean;
  badgeText: string;
  badgeEmoji: string;
  title: string;
  subtitle: string;
  formattedSize: string;
  downloadUrl: string;
  suggestedFilename: string;
}

export const isAssetStorageAvailable = (a: AcademicMediaAsset): boolean => {
  if (typeof a.is_available === 'boolean') {
    return a.is_available;
  }
  return Boolean(a.has_telegram || a.telegram_file_id || a.telegram_message_id);
};

export const getOriginalPdfDetails = (pdf: any, lectureNum?: number): OriginalPdfInfo => {
  const rawTitle = (pdf.title || '').trim();
  const isBook = /كتاب/i.test(rawTitle);

  const sizeMb = pdf.file_size_bytes
    ? (pdf.file_size_bytes / (1024 * 1024)).toFixed(1)
    : null;
  const sizeKb = pdf.file_size_bytes && (!sizeMb || parseFloat(sizeMb) < 0.5)
    ? Math.round(pdf.file_size_bytes / 1024)
    : null;
  const formattedSize = sizeMb && parseFloat(sizeMb) >= 0.5 ? `${sizeMb} ميجا` : (sizeKb ? `${sizeKb} ك.ب` : '');

  const downloadUrl = (pdf.stream_url || `/api/stream/${pdf.id}`).includes('?')
    ? `${pdf.stream_url || `/api/stream/${pdf.id}`}&download=true`
    : `${pdf.stream_url || `/api/stream/${pdf.id}`}?download=true`;

  if (isBook) {
    const bookTopic = rawTitle
      .replace(/\.pdf$/i, '')
      .replace(/^كتاب\s*[-–—:]\s*/i, '')
      .trim();
    const suggestedFilename = lectureNum
      ? `المحاضرة ${lectureNum} - جزء الكتاب (${bookTopic || 'المقرر'}).pdf`
      : `جزء الكتاب - ${bookTopic || 'المقرر'}.pdf`;

    return {
      id: pdf.id,
      isBook: true,
      badgeText: 'من الكتاب المقرر',
      badgeEmoji: '📚',
      title: 'جزء المحاضرة من الكتاب',
      subtitle: bookTopic || 'المحتوى المعتمد من الكتاب الدراسي',
      formattedSize,
      downloadUrl,
      suggestedFilename,
    };
  } else {
    const suggestedFilename = lectureNum
      ? `المحاضرة ${lectureNum} - كشكول المحاضرة (بخط اليد).pdf`
      : `كشكول المحاضرة (بخط اليد).pdf`;

    return {
      id: pdf.id,
      isBook: false,
      badgeText: 'بخط اليد',
      badgeEmoji: '✍️',
      title: 'كشكول المحاضرة (بخط اليد)',
      subtitle: 'الشرح والتدوين الأصلي أثناء المحاضرة',
      formattedSize,
      downloadUrl,
      suggestedFilename,
    };
  }
};

export const GIRLS_CORRECT_MESSAGES = [
  "أشطر كتكوتة في الدنيا! إجابة في الجون 💖🐣",
  "إيه الحلاوة دي يا بطة! جبتيها صح من أول مرة 🦆✨",
  "عاش يا أحلى قطة! تركيزك عالي أوي النهارده 🐱💖",
  "برافو يا بطوطة! دماغك دي ألماظ والله 💎🦆",
  "صح الصح يا قطقوطة! أيوه كده فرحيني بشطارتك 🐾🌸",
  "الله ينور يا فرفوشة، إجابة تفتح النفس زيّك 🦋✨",
  "إجابة صح يا سكرة، مفيش حلاوة ولا شطارة بعد كده! 🍬💖",
  "برافو يا عسولة! خطواتك وتفكيرك مظبوطين بالمللي 🍯✨",
  "صح يا فراولة! إيه الدماغ الرايقة والجميلة دي؟ 🍓🌸",
  "شطورة أوي يا بنبوناية! كملي على نفس المستوى ده 🍬🥰",
  "يا جمالوا! إجابة مية فل وعشرة يا عسلية 🍯👏",
  "صح يا قمر! منورة الكويز بإجاباتك الصح 🌙💖",
  "برافو يا نجمة! إجابة تلمع من كتر ما هي صح 🌟🌸",
  "الله أكبر عليكي يا غزالة، سريعة وشاطرة! 🦌💖",
  "إجابة نموذجية يا أحلى وردة! تسلم دماغك 🌷🥰",
  "عبقرية يا أميرة! ولا أجدعها دكتور في الكلية 👑👏",
];

export const GIRLS_WRONG_MESSAGES = [
  "للأسف غلط يا كتكوتة.. إيه رأيك نجرب تاني؟ 🥹🐣",
  "تؤ تؤ، فلتت منك المرة دي يا بطة! ها، نحاول كمان مرة؟ 🥺🦆",
  "ممم، قريبة أوي بس مش هي يا قطة! ركزي شوية وهتجيبيها 🐱✨",
  "ولا يهمك يا بطوطة، غلطة صغننة ونتعلم منها! جربي تاني 🥹💖",
  "أوبس! مش دي الإجابة يا قطقوطة، فكري فيها تاني بهدوء 🐾🥺",
  "لا مش دي يا فراشة.. بس متزعليش، اقري الشرح وهتفهميها فوراً 🦋🥹",
  "عادي جداً يا سكرة، الغلط بيعلم الشطار! يلا نجرب تاني 🍬💪",
  "مش صح المرة دي يا عسولة، بس واثق إنك هتعرفيها.. بصي على التلميح كده! 💡🍯",
  "غلطة بسيطة خالص يا فراولة، متخليهاش تعطلك وكملي 🍓🥹",
  "يا خبر! خدعك السؤال ده يا بنبوناية، ركزي في التريكاية اللي فيه 🍬🥺",
  "كانت قريبة أوي يا قمر! معلش، ركزي في اللي جاي وهتعوضيها 🌙💖",
  "تؤ، مش دي يا نجمة! بس ولا يهمك، السؤال الجاي بتاعك 🌟💪",
  "جلّ من لا يسهو يا أميرة! راجعي القانون بسرعة وجربي تاني 👑🌸",
  "وقعتي في الفخ يا شطورة! شوفي التوضيح تحت عشان متقعيش فيه تاني 🥹💡",
  "معلش يا وردة، المسألة دي لئيمة شوية.. اقري الشرح وهتبقي لعبة في إيدك 🌷✨",
];

export const GIRLS_HINT_PREFIXES = [
  "غششة صغننة لأشطر بطة 🦆💡: ",
  "سر بيني وبينك يا قطة عشان تحليها 🐱🤫: ",
  "بصي يا سكرة، مفتاح الحل هنا 🍬🔑: ",
  "عشان خاطرك بس يا كتكوتة، ركزي في دي 🐣✨: ",
  "تلميح ع الماشي يا قمر 🌙💡: ",
  "بصي يا فراولة، الفكرة هنا 🍓✨: ",
  "غششة سريعة يا بطوطة 💎💡: ",
  "ركزي في التريكاية دي يا عسولة 🍯✨: ",
];

export const BOYS_CORRECT_MESSAGES = [
  "عاش يا بطل! إجابة في الجون 🎯🔥",
  "وحش يا صاحبي! إجابة صحيحة بالمللي ⚡💪",
  "الله ينور يا هندسة! دماغك ألماظ 🧠✨",
  "عاش يا كابتن! تركيز عالي ومظبوط 🚀👏",
  "إجابة مية مية يا نجم! كمل يا بطل 🌟⚡",
  "سفاح ماث يا غالي! الإجابة نموذجية 🏆🔥",
  "صح الصح يا صديقي! تسلم دماغك 🎯👌",
  "عظمة يا برنس! ولا غلطة 👑💪",
];

export const BOYS_WRONG_MESSAGES = [
  "ركز يا بطل، فلتت منك.. جرب تاني! 💪",
  "معلش يا هندسة، بسيطة.. شوف التلميح وجرب 💡",
  "قريبة يا كابتن، راجع الخطوات وهتجيبها 🎯",
  "ولا يهمك يا وحش، غلطة ونتعلم منها.. فكر تاني ⚡",
  "استعجلت يا غالي.. ركز في التريكاية دي وراجع 🔍",
  "معلش يا نجم، السؤال الجاي بتاعك ومضمون 🚀",
];

export const BOYS_HINT_PREFIXES = [
  "تلميح ع الماشي يا بطل 💡: ",
  "سر الحل يا هندسة 🔑: ",
  "فكرة المسألة يا كابتن ⚡: ",
  "بص يا صاحبي على دي 🎯: ",
  "ركز في الخطوة دي يا غالي 🧠: ",
];

export const getQuizFeedback = (qIdx: number, isCorrect: boolean, isGirls: boolean): string => {
  if (isGirls) {
    const list = isCorrect ? GIRLS_CORRECT_MESSAGES : GIRLS_WRONG_MESSAGES;
    return list[qIdx % list.length];
  } else {
    const list = isCorrect ? BOYS_CORRECT_MESSAGES : BOYS_WRONG_MESSAGES;
    return list[qIdx % list.length];
  }
};

export const getQuizHintPrefix = (qIdx: number, isGirls: boolean): string => {
  if (isGirls) {
    return GIRLS_HINT_PREFIXES[qIdx % GIRLS_HINT_PREFIXES.length];
  } else {
    return BOYS_HINT_PREFIXES[qIdx % BOYS_HINT_PREFIXES.length];
  }
};

export const parseQuizMarkdown = (md: string): QuizQuestion[] => {
  const questions: QuizQuestion[] = [];
  const sections = md.split(/(?=^###?\s+(?:Question|السؤال)\s+\d+)/m);

  for (const sec of sections) {
    if (!sec.trim().startsWith('#')) continue;
    const lines = sec.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length === 0) continue;

    const numMatch = lines[0].match(/\d+/);
    const qNum = numMatch ? parseInt(numMatch[0]) : questions.length + 1;

    const questionLines: string[] = [];
    const options: string[] = [];
    let correctIndex = 0;
    let hint = '';

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (line.startsWith('- [ ]') || line.startsWith('- [x]') || line.startsWith('* [ ]') || line.startsWith('* [x]')) {
        const isCorrect = line.includes('[x]');
        const optText = line.replace(/^[-*]\s*\[[ x]\]\s*/, '').trim();
        if (isCorrect) correctIndex = options.length;
        options.push(optText);
      } else if (line.startsWith('**Hint:**') || line.startsWith('> Hint:') || line.startsWith('Hint:')) {
        hint = line.replace(/^\*\*Hint:\*\*|^>\s*Hint:|^Hint:\s*/i, '').trim();
      } else if (options.length === 0) {
        questionLines.push(line);
      }
    }

    const questionBody = questionLines.join(' ').trim();

    if (options.length > 0) {
      const items = options.map((opt, idx) => ({ opt, isCorrect: idx === correctIndex }));
      for (let i = items.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [items[i], items[j]] = [items[j], items[i]];
      }

      questions.push({
        number: qNum,
        question: questionBody || `السؤال رقم ${qNum}`,
        options: items.map(it => it.opt),
        correctIndex: items.findIndex(it => it.isCorrect),
        hint
      });
    }
  }

  return questions;
};

export const parseFlashcardsMarkdown = (md: string): Flashcard[] => {
  const cards: Flashcard[] = [];
  const cleanContent = (str: string) => {
    if (!str) return '';
    let cleaned = str.trim();
    try {
      const match = cleaned.match(/^['"]?content['"]?:\s*['"]([\s\S]*)['"]$/);
      if (match) return match[1].trim();
      if ((cleaned.startsWith('"') && cleaned.endsWith('"')) || (cleaned.startsWith("'") && cleaned.endsWith("'"))) {
        cleaned = cleaned.slice(1, -1).trim();
      }
      return cleaned;
    } catch {
      return cleaned;
    }
  };

  const sections = md.split(/(?=^##+\s+Card\s+\d+)/m);
  for (const sec of sections) {
    if (!sec.trim().startsWith('##')) continue;
    const lines = sec.split('\n').map(l => l.trim()).filter(Boolean);
    let question = '';
    let answer = '';

    for (const line of lines) {
      if (line.startsWith('**Q:**')) {
        question = cleanContent(line.replace(/^\*\*Q:\*\*\s*/i, ''));
      } else if (line.startsWith('**A:**')) {
        answer = cleanContent(line.replace(/^\*\*A:\*\*\s*/i, ''));
      }
    }

    if (question && answer) {
      cards.push({ question, answer });
    }
  }
  return cards;
};

export const formatTime = (timeInSeconds: number) => {
  if (isNaN(timeInSeconds)) return '00:00';
  const m = Math.floor(timeInSeconds / 60);
  const s = Math.floor(timeInSeconds % 60);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

export const downloadPdfFile = async (
  url: string,
  fallbackFilename: string,
  assetIdentifier: number | string,
  setDownloading: (id: number | string | null) => void,
  setError: (msg: string | null) => void
) => {
  setDownloading(assetIdentifier);
  setError(null);
  try {
    const fullUrl = getApiUrl(url);
    const res = await fetch(fullUrl);
    if (!res.ok) {
      let errorMsg = 'تعذر تحميل الملف حالياً. يرجى المحاولة لاحقاً.';
      try {
        const errData = await res.json();
        if (errData?.detail) errorMsg = errData.detail;
      } catch (_) {}
      throw new Error(errorMsg);
    }

    let filename = fallbackFilename;
    const disposition = res.headers.get('Content-Disposition');
    if (disposition) {
      const utf8Match = disposition.match(/filename\*=UTF-8''([^;]+)/i);
      if (utf8Match && utf8Match[1]) {
        try {
          filename = decodeURIComponent(utf8Match[1]);
        } catch (_) {}
      } else {
        const basicMatch = disposition.match(/filename="([^"]+)"/i);
        if (basicMatch && basicMatch[1]) {
          filename = basicMatch[1];
        }
      }
    }

    if (!filename.toLowerCase().endsWith('.pdf')) {
      filename = `${filename}.pdf`;
    }

    const blob = await res.blob();
    const pdfBlob = new Blob([blob], { type: 'application/pdf' });
    const blobUrl = window.URL.createObjectURL(pdfBlob);

    const link = document.createElement('a');
    link.href = blobUrl;
    link.setAttribute('download', filename);
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();

    setTimeout(() => {
      try {
        if (document.body.contains(link)) {
          document.body.removeChild(link);
        }
        window.URL.revokeObjectURL(blobUrl);
      } catch (_) {}
    }, 60000);
  } catch (err: any) {
    console.error('File download error:', err);
    try {
      const directUrl = getApiUrl(url);
      window.open(directUrl, '_blank', 'noopener,noreferrer');
    } catch (_) {
      setError(err.message || 'حدث خطأ أثناء تحميل الملف');
    }
  } finally {
    setDownloading(null);
  }
};
