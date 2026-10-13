const fs = require('fs');

const content = fs.readFileSync('D:/الكليه/هندسه تفاضلية/lec1/notebooklm_output/quiz.md', 'utf-8');

function parseQuiz(md) {
  const questions = [];
  // Split by Question headers (## Question X or ### Question X)
  const sections = md.split(/(?=^##+\s+Question\s+\d+)/m);

  for (const sec of sections) {
    const trimmed = sec.trim();
    if (!trimmed.startsWith('##')) continue;

    const lines = trimmed.split('\n').map(l => l.trim()).filter(Boolean);
    const headerLine = lines[0]; // e.g. ## Question 4
    const matchNum = headerLine.match(/\d+/);
    const qNum = matchNum ? parseInt(matchNum[0]) : questions.length + 1;

    let questionLines = [];
    const options = [];
    let correctIndex = -1;
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
        // This is part of the question body
        questionLines.push(line);
      }
    }

    const questionBody = questionLines.join(' ').trim();

    questions.push({
      number: qNum,
      question: questionBody,
      options,
      correctIndex,
      hint
    });
  }

  return questions;
}

const parsed = parseQuiz(content);
console.log('Total Parsed Questions:', parsed.length);
parsed.forEach(q => {
  console.log(`\n--- [Q${q.number}] ---`);
  console.log('Question Body:', q.question);
  console.log('Options count:', q.options.length, '| Correct Index:', q.correctIndex);
  console.log('Option 1:', q.options[0]);
  console.log('Hint:', q.hint);
});
