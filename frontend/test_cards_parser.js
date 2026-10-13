const fs = require('fs');

const content = fs.readFileSync('D:/الكليه/هندسه تفاضلية/lec1/notebooklm_output/flashcards.md', 'utf-8');

function cleanContent(str) {
  // If it's the raw JSON block like {'flashcardContentBlock': [{'type': 'text', 'content': '...'}]}
  try {
    const match = str.match(/'content':\s*'([^']+)'/);
    if (match) return match[1];
    const matchDbl = str.match(/"content":\s*"([^"]+)"/);
    if (matchDbl) return matchDbl[1];
  } catch (e) {}
  return str.replace(/^\*\*[QA]:\*\*\s*/, '').trim();
}

function parseFlashcards(md) {
  const cards = [];
  const sections = md.split(/(?=^##+\s+Card\s+\d+)/m);

  for (const sec of sections) {
    const trimmed = sec.trim();
    if (!trimmed.startsWith('##')) continue;

    const lines = trimmed.split('\n').map(l => l.trim()).filter(Boolean);
    let question = '';
    let answer = '';

    for (const line of lines) {
      if (line.startsWith('**Q:**')) {
        question = cleanContent(line.replace('**Q:**', ''));
      } else if (line.startsWith('**A:**')) {
        answer = cleanContent(line.replace('**A:**', ''));
      }
    }

    if (question && answer) {
      cards.push({ question, answer });
    }
  }
  return cards;
}

const cards = parseFlashcards(content);
console.log('Total Flashcards parsed:', cards.length);
console.log('Sample Card 1:', cards[0]);
console.log('Sample Card 5:', cards[4]);
