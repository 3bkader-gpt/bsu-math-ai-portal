const fs = require('fs');
const path = require('path');

const SUPABASE_URL = 'https://cjmlnpdtfclzcvehebsv.supabase.co';
const KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNqbWxucGR0ZmNsemN2ZWhlYnN2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MTgyNTIwMiwiZXhwIjoyMTA3NDAxMjAyfQ.GSyJX2iMGJgT2b7lmCoBO1g1zLFQbGve4ttWjt8Lkaw';

async function uploadWithRetry(localPath, remoteName, contentType, maxRetries = 3) {
  const fileBuffer = fs.readFileSync(localPath);
  for (let i = 1; i <= maxRetries; i++) {
    try {
      console.log(`[Attempt ${i}] Uploading ${remoteName} (${fileBuffer.length} bytes)...`);
      const uploadRes = await fetch(`${SUPABASE_URL}/storage/v1/object/lectures/media/${remoteName}`, {
        method: 'POST',
        headers: {
          'apikey': KEY,
          'Authorization': `Bearer ${KEY}`,
          'Content-Type': contentType,
          'x-upsert': 'true'
        },
        body: fileBuffer
      });
      const resText = await uploadRes.text();
      console.log(`Upload result: ${uploadRes.status}`, resText);
      if (uploadRes.ok || uploadRes.status === 200 || uploadRes.status === 201) {
        return `${SUPABASE_URL}/storage/v1/object/public/lectures/media/${remoteName}`;
      }
    } catch (e) {
      console.error(`Attempt ${i} error: ${e.message}`);
      if (i < maxRetries) await new Promise(r => setTimeout(r, 2000));
    }
  }
  throw new Error('All retries failed');
}

async function registerAsset(lectureId, assetType, title, url, size) {
  const chk = await fetch(`${SUPABASE_URL}/rest/v1/media_assets?lecture_id=eq.${lectureId}&asset_type=eq.${assetType}`, {
    headers: { 'apikey': KEY, 'Authorization': `Bearer ${KEY}` }
  }).then(r => r.json());

  const payload = {
    lecture_id: lectureId,
    asset_type: assetType,
    title: title,
    local_file_path: url,
    telegram_file_id: 'supabase_storage',
    file_size_bytes: size
  };

  if (chk && chk.length > 0) {
    const id = chk[0].id;
    await fetch(`${SUPABASE_URL}/rest/v1/media_assets?id=eq.${id}`, {
      method: 'PATCH',
      headers: { 'apikey': KEY, 'Authorization': `Bearer ${KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    console.log(`✅ Updated asset #${id} for lec ${lectureId} (${assetType})`);
  } else {
    await fetch(`${SUPABASE_URL}/rest/v1/media_assets`, {
      method: 'POST',
      headers: { 'apikey': KEY, 'Authorization': `Bearer ${KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    console.log(`✅ Created asset for lec ${lectureId} (${assetType})`);
  }
}

async function main() {
  const targetFile = process.argv[2];
  const lectureId = parseInt(process.argv[3], 10);
  const assetType = process.argv[4];
  const title = process.argv[5];

  if (!targetFile || !lectureId || !assetType) {
    console.log("Usage: node upload_single_media.js <filename> <lectureId> <assetType> <title>");
    process.exit(1);
  }

  const filePath = path.resolve('media_storage/temp', targetFile);
  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    process.exit(1);
  }

  const stat = fs.statSync(filePath);
  const contentType = assetType === 'video' ? 'video/mp4' : 'audio/mp4';
  const url = await uploadWithRetry(filePath, targetFile, contentType);
  await registerAsset(lectureId, assetType, title, url, stat.size);
  console.log(`🎉 Complete: ${targetFile} -> ${url}`);
}

main().catch(err => {
  console.error("Fatal:", err);
  process.exit(1);
});
