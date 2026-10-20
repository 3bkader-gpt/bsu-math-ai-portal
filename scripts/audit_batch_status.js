const fs = require('fs');
const path = require('path');

const SUPABASE_URL = 'https://cjmlnpdtfclzcvehebsv.supabase.co';
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

async function check() {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/media_assets?lecture_id=gte.28&lecture_id=lte.35&select=id,lecture_id,asset_type,local_file_path`, {
    headers: { 'apikey': KEY, 'Authorization': `Bearer ${KEY}` }
  }).then(r => r.json());

  console.log(`Registered in Supabase (28-35): ${res.length} assets`);
  const byLec = {};
  for (let i = 28; i <= 35; i++) byLec[i] = [];
  res.forEach(a => {
    if (byLec[a.lecture_id]) byLec[a.lecture_id].push(a.asset_type);
  });

  for (let i = 28; i <= 35; i++) {
    const list = byLec[i];
    const hasAudio = list.includes('audio');
    const hasVideo = list.includes('video');
    const hasQuiz = list.includes('quiz_md');
    const hasGuide = list.includes('study_guide_md');
    const hasCards = list.includes('flashcards_md');
    const score = [hasAudio, hasVideo, hasQuiz, hasGuide, hasCards].filter(Boolean).length;
    console.log(`Lec #${i}: ${score}/5 [Audio: ${hasAudio ? '✅' : '❌'}, Video: ${hasVideo ? '✅' : '❌'}, Quiz: ${hasQuiz ? '✅' : '❌'}, Guide: ${hasGuide ? '✅' : '❌'}, Cards: ${hasCards ? '✅' : '❌'}]`);
  }

  const files = fs.readdirSync('media_storage/temp');
  console.log('\nDownloaded files in temp directory:');
  const batchFiles = files.filter(f => /^(video|audio)_(28|29|30|31|32|33|34|35)\./.test(f));
  batchFiles.forEach(f => {
    const s = fs.statSync(path.join('media_storage/temp', f));
    console.log(` - ${f} (${(s.size / 1024 / 1024).toFixed(2)} MB)`);
  });
  console.log(`Total downloaded in temp: ${batchFiles.length} files`);
}

check().catch(console.error);
