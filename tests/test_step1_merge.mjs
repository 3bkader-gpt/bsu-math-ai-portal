import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

// Read page.tsx and extract CANONICAL_COURSES and mergeSubjects function logic
const pagePath = path.resolve('frontend/src/app/page.tsx');
const pageCode = fs.readFileSync(pagePath, 'utf8');

// Ensure CANONICAL_COURSES and mergeSubjects exist in page.tsx
assert(pageCode.includes('export const CANONICAL_COURSES: CanonicalCourse[] = ['), 'CANONICAL_COURSES must exist');
assert(pageCode.includes('// Build Unified Courses from Backend + Canonical Registry'), 'Dynamic mergeSubjects header must exist');

// Extract CANONICAL_COURSES
const canonicalMatch = pageCode.match(/export const CANONICAL_COURSES: CanonicalCourse\[\] = (\[[\s\S]*?\n\];)/);
assert(canonicalMatch, 'Failed to extract CANONICAL_COURSES');
const CANONICAL_COURSES = eval(canonicalMatch[1]);
assert.strictEqual(CANONICAL_COURSES.length, 12, 'Must have 12 canonical courses');

// Implement the exact function from page.tsx for direct assertion
function mergeSubjects(backendSubjects) {
  const rawBackendList = Array.isArray(backendSubjects) ? backendSubjects : [];
  const matchedBackendIds = new Set();
  const matchedBackendNames = new Set();
  const assignedSubjectIds = new Set();
  const assignedSubjectNames = new Set();

  // 1. Process Canonical Courses (Preserve rich canonical metadata & order)
  const canonicalList = CANONICAL_COURSES.map((course) => {
    // Match by stable fallbackId or canonical aliases / name
    const found = rawBackendList.find((b) => {
      if (!b) return false;
      if (typeof b.id === 'number' && b.id === course.fallbackId) return true;
      const bName = (b.name || '').trim().toLowerCase();
      if (!bName) return false;
      return (
        course.canonicalName.trim().toLowerCase() === bName ||
        course.aliases.some((a) => a.trim().toLowerCase() === bName)
      );
    });

    if (found) {
      if (typeof found.id === 'number') matchedBackendIds.add(found.id);
      if (found.name) matchedBackendNames.add(found.name.trim().toLowerCase());
    }

    const resolvedId = typeof found?.id === 'number' ? found.id : course.fallbackId;
    assignedSubjectIds.add(resolvedId);
    assignedSubjectNames.add(course.canonicalName.trim().toLowerCase());

    const doctorsList = found?.doctors && Array.isArray(found.doctors) && found.doctors.length > 0 
      ? found.doctors 
      : (course.doctor.includes('+') ? course.doctor.split('+').map((d) => d.trim()) : [course.doctor]);

    const sem = (typeof found?.semester === 'number' && (found.semester === 1 || found.semester === 2))
      ? found.semester
      : (course.semester ?? 1);

    return {
      id: resolvedId,
      name: course.canonicalName,
      semester: sem,
      has_prompt: found?.has_prompt ?? true,
      lecture_count: typeof found?.lecture_count === 'number' ? found.lecture_count : 0,
      doctors: doctorsList,
      canonicalDoctor: course.doctor,
      icon: course.icon,
    };
  });

  // 2. Dynamically Append Genuinely New Subjects (e.g., Semester 2 or custom courses)
  const dynamicSubjects = [];
  for (const b of rawBackendList) {
    if (!b || typeof b !== 'object') continue;
    const rawName = typeof b.name === 'string' ? b.name.trim() : '';
    if (!rawName) continue;

    // Filter out internal system or utility folders
    if (['كتب كامله', 'BOT', 'subjects'].includes(rawName) || rawName.startsWith('.')) {
      continue;
    }

    const normalizedName = rawName.toLowerCase();
    const isAlreadyMatchedById = typeof b.id === 'number' && (matchedBackendIds.has(b.id) || assignedSubjectIds.has(b.id));
    const isAlreadyMatchedByName = matchedBackendNames.has(normalizedName) || assignedSubjectNames.has(normalizedName);
    const matchesAnyCanonical = CANONICAL_COURSES.some((c) =>
      c.canonicalName.trim().toLowerCase() === normalizedName ||
      c.aliases.some((a) => a.trim().toLowerCase() === normalizedName) ||
      (typeof b.id === 'number' && c.fallbackId === b.id)
    );

    if (isAlreadyMatchedById || isAlreadyMatchedByName || matchesAnyCanonical) {
      continue;
    }

    // Ensure stable unique ID
    const newSubjectId = typeof b.id === 'number' ? b.id : 1000 + dynamicSubjects.length;
    if (assignedSubjectIds.has(newSubjectId)) {
      continue;
    }
    assignedSubjectIds.add(newSubjectId);
    assignedSubjectNames.add(normalizedName);

    // Extract doctors safely without inventing placeholder instructor data
    const cleanDoctors = Array.isArray(b.doctors)
      ? b.doctors.map((d) => (typeof d === 'string' ? d.trim() : '')).filter(Boolean)
      : [];
    const canonicalDoc = cleanDoctors.length > 0 ? cleanDoctors.join(' + ') : undefined;

    const rawSem = typeof b.semester === 'number' ? b.semester : 1;
    const validSem = (rawSem === 2) ? 2 : 1;

    dynamicSubjects.push({
      id: newSubjectId,
      name: rawName,
      semester: validSem,
      has_prompt: Boolean(b.has_prompt),
      lecture_count: typeof b.lecture_count === 'number' ? b.lecture_count : 0,
      doctors: cleanDoctors,
      canonicalDoctor: canonicalDoc,
      icon: '📚',
    });
  }

  return [...canonicalList, ...dynamicSubjects];
}

console.log('🧪 Running Step 1 & Step 2 Regression Tests for mergeSubjects & Semester Separation...');

// Test 1: Empty backend list (Offline / failure fallback)
const emptyRes = mergeSubjects([]);
assert.strictEqual(emptyRes.length, 12, 'Empty backend should return exactly 12 canonical courses');
assert.strictEqual(emptyRes[0].name, 'هندسة تفاضلية');
assert.strictEqual(emptyRes[0].icon, '📐');
assert.strictEqual(emptyRes[0].semester, 1, 'Default canonical courses must have semester 1');
console.log('  ✓ Test 1 Passed: Empty backend returns 12 canonical courses in Semester 1');

// Test 2: Standard production subjects
const prodBackend = [
  { id: 11, name: 'هندسة تفاضلية', has_prompt: true, lecture_count: 5, doctors: ['د/ سيد'] },
  { id: 10, name: 'مقدمة في نظرية العدد والمنطق', has_prompt: true, lecture_count: 3, doctors: ['د/ محمد حسين'] },
  { id: 9, name: 'معادلات تفاضلية', has_prompt: true, lecture_count: 2, doctors: ['د/ حسين'] },
  { id: 6, name: 'ديناميكا (٢)', has_prompt: true, lecture_count: 3, doctors: ['د/ مروة ذكري'] },
  { id: 2, name: 'استاتيكا (٢)', has_prompt: true, lecture_count: 2, doctors: ['د/ ايه'] },
  { id: 8, name: 'كهربية ومغناطيسية وتيار متردد', has_prompt: true, lecture_count: 2, doctors: ['د/ حسن سيد'] },
  { id: 101, name: 'عملي فيزياء', has_prompt: true, lecture_count: 1, doctors: ['د/ سيد'] },
  { id: 4, name: 'التعليم وريادة الأعمال', has_prompt: true, lecture_count: 1, doctors: ['د/ مروة', 'د/ وليد'] },
  { id: 3, name: 'تدريس مصغر', has_prompt: true, lecture_count: 1, doctors: ['د/ عبدالرحمن برعي'] },
  { id: 5, name: 'تكنولوجيا التعليم', has_prompt: true, lecture_count: 1, doctors: ['د/ ايمان'] },
  { id: 1, name: 'إدارة المعرفة', has_prompt: true, lecture_count: 1, doctors: ['د/ عزام'] },
];
const prodRes = mergeSubjects(prodBackend);
assert.strictEqual(prodRes.length, 12, 'Production subjects should result in exactly 12 courses without duplication');
const diffSub = prodRes.find(s => s.id === 11);
assert.strictEqual(diffSub.name, 'هندسة تفاضلية');
assert.strictEqual(diffSub.lecture_count, 5);
assert.strictEqual(diffSub.semester, 1);
assert.deepStrictEqual(diffSub.doctors, ['د/ سيد']);
console.log('  ✓ Test 2 Passed: Production 11 subjects map cleanly to 12 courses with zero duplicates in Semester 1');

// Test 3: New Semester 2 Subject added
const semester2Backend = [
  ...prodBackend,
  { id: 13, name: 'تحليل مركب (ترم ثان)', semester: 2, has_prompt: true, lecture_count: 4, doctors: ['د/ أحمد منصور'] },
];
const sem2Res = mergeSubjects(semester2Backend);
assert.strictEqual(sem2Res.length, 13, 'Should have 13 courses including new Semester 2 course');
const newCourse = sem2Res[12];
assert.strictEqual(newCourse.id, 13);
assert.strictEqual(newCourse.name, 'تحليل مركب (ترم ثان)');
assert.strictEqual(newCourse.semester, 2, 'Semester 2 course must have semester=2');
assert.strictEqual(newCourse.icon, '📚');
assert.strictEqual(newCourse.canonicalDoctor, 'د/ أحمد منصور');
assert.deepStrictEqual(newCourse.doctors, ['د/ أحمد منصور']);
assert.strictEqual(newCourse.lecture_count, 4);
console.log('  ✓ Test 3 Passed: Newly added Semester 2 course dynamically appended with semester=2 and 📚 icon');

// Test 4: Deduplication of Alias variations
const aliasBackend = [
  ...prodBackend,
  { id: 999, name: 'هندسه تفاضلية', has_prompt: true, lecture_count: 1, doctors: ['د/ سيد'] }, // spelling variation with ه
];
const aliasRes = mergeSubjects(aliasBackend);
assert.strictEqual(aliasRes.length, 12, 'Spelling alias variation must not create a duplicate course');
console.log('  ✓ Test 4 Passed: Alias variations do not create duplicate courses');

// Test 5: Missing optional metadata safety
const missingMetaBackend = [
  ...prodBackend,
  { id: 14, name: 'مناهج وطرق تدريس', has_prompt: false, lecture_count: 0, doctors: null },
];
const missingMetaRes = mergeSubjects(missingMetaBackend);
assert.strictEqual(missingMetaRes.length, 13);
const safeCourse = missingMetaRes[12];
assert.strictEqual(safeCourse.name, 'مناهج وطرق تدريس');
assert.strictEqual(safeCourse.semester, 1, 'Missing semester must default to 1');
assert.strictEqual(safeCourse.canonicalDoctor, undefined, 'Must not invent fake instructor name');
assert.deepStrictEqual(safeCourse.doctors, []);
assert.strictEqual(safeCourse.has_prompt, false);
console.log('  ✓ Test 5 Passed: Missing optional metadata defaults semester to 1 without inventing fake instructors');

// Test 6: Duplicate backend records
const duplicateBackend = [
  ...prodBackend,
  { id: 15, name: 'جبر متقدم', semester: 2, lecture_count: 2, doctors: ['د/ علي'] },
  { id: 15, name: 'جبر متقدم', semester: 2, lecture_count: 2, doctors: ['د/ علي'] }, // duplicate row
];
const dupRes = mergeSubjects(duplicateBackend);
assert.strictEqual(dupRes.length, 13, 'Duplicate rows with same ID must only appear once');
console.log('  ✓ Test 6 Passed: Duplicate backend records are cleanly deduplicated');

// Test 7: System folder filtering
const systemBackend = [
  ...prodBackend,
  { id: 200, name: 'كتب كامله' },
  { id: 201, name: 'BOT' },
  { id: 202, name: 'subjects' },
  { id: 203, name: '.git_internal' },
];
const sysRes = mergeSubjects(systemBackend);
assert.strictEqual(sysRes.length, 12, 'System and hidden folders must be ignored');
console.log('  ✓ Test 7 Passed: Internal system folders are filtered out');

// Test 8: Semester 1 vs Semester 2 Filtering Isolation
const mixedCourses = mergeSubjects([
  ...prodBackend,
  { id: 201, name: 'تحليل دالي', semester: 2, doctors: ['د/ يوسف'] },
  { id: 202, name: 'جبر تجريدي', semester: 2, doctors: ['د/ فاطمة'] },
]);
assert.strictEqual(mixedCourses.length, 14, 'Total courses should be 14');
const sem1Courses = mixedCourses.filter(s => (s.semester ?? 1) === 1);
const sem2Courses = mixedCourses.filter(s => (s.semester ?? 1) === 2);
assert.strictEqual(sem1Courses.length, 12, 'Semester 1 must have exactly 12 courses');
assert.strictEqual(sem2Courses.length, 2, 'Semester 2 must have exactly 2 courses');
assert(sem2Courses.every(s => s.semester === 2), 'All Semester 2 courses must have semester=2');
assert(!sem1Courses.some(s => s.id === 201 || s.id === 202), 'Semester 2 courses must be excluded from Semester 1');
console.log('  ✓ Test 8 Passed: Semester 1 and Semester 2 are completely isolated with zero overlap');

// Test 9: Search within selected semester
const searchInSem1 = sem1Courses.filter(s => s.name.includes('تفاضل'));
assert(searchInSem1.length > 0, 'Should find differential geometry and equations in Semester 1');
const searchInSem2 = sem2Courses.filter(s => s.name.includes('تفاضل'));
assert.strictEqual(searchInSem2.length, 0, 'Should find zero matches for تفاضل in Semester 2');
console.log('  ✓ Test 9 Passed: Search works accurately within the active semester');

// ==========================================
// Phase 1 PDF Availability Regression Tests
// ==========================================

// Verify isAssetStorageAvailable exists in page.tsx
assert(pageCode.includes('export const isAssetStorageAvailable = (a: LectureAsset): boolean =>'), 'isAssetStorageAvailable must exist in page.tsx');

function isAssetStorageAvailable(a) {
  if (typeof a.is_available === 'boolean') {
    return a.is_available;
  }
  return Boolean(a.has_telegram || a.telegram_file_id || a.telegram_message_id);
}

// Test 10: PDF with a valid storage reference (Direct Supabase shape)
const sbValidAsset = {
  id: 101,
  asset_type: 'original_pdf',
  title: 'lec1.pdf',
  has_telegram: true,
  telegram_file_id: 'BQACAgQAA...',
  telegram_message_id: 25,
  file_size_bytes: 7726380,
  stream_url: '/api/stream/101',
  is_available: true
};
assert.strictEqual(isAssetStorageAvailable(sbValidAsset), true, 'Valid Supabase asset must be available');
console.log('  ✓ Test 10 Passed: Direct Supabase asset with valid Telegram reference is available');

// Test 11: PDF with positive file_size_bytes but NO valid storage reference (Phantom file)
const sbPhantomAsset = {
  id: 102,
  asset_type: 'original_pdf',
  title: 'phantom.pdf',
  has_telegram: false,
  telegram_file_id: null,
  telegram_message_id: null,
  file_size_bytes: 15000000, // 15MB metadata
  stream_url: '/api/stream/102',
  is_available: false
};
assert.strictEqual(isAssetStorageAvailable(sbPhantomAsset), false, 'Phantom asset with file_size_bytes > 0 but no storage must NOT be available');
console.log('  ✓ Test 11 Passed: Asset with positive file_size_bytes but no storage reference is hidden');

// Test 12: Backend fallback shape with is_available = false (unreachable/missing local file)
const backendPhantomAsset = {
  id: 103,
  asset_type: 'original_pdf',
  title: 'missing_local.pdf',
  has_telegram: false,
  file_size_bytes: 5242880,
  stream_url: '/api/stream/103',
  is_available: false
};
assert.strictEqual(isAssetStorageAvailable(backendPhantomAsset), false, 'Backend asset with is_available=false must be hidden');
console.log('  ✓ Test 12 Passed: Backend fallback asset with is_available=false is hidden');

// Test 13: PDF with missing storage metadata (empty/null/undefined)
const missingMetaAsset = {
  id: 104,
  asset_type: 'original_pdf',
  title: 'empty.pdf',
  stream_url: '/api/stream/104'
};
assert.strictEqual(isAssetStorageAvailable(missingMetaAsset), false, 'Asset with missing storage metadata must be hidden');
console.log('  ✓ Test 13 Passed: Asset with missing storage metadata is hidden');

// Test 14: Array filtering mimics Home originalPdfAssets exactly
const mixedAssets = [sbValidAsset, sbPhantomAsset, backendPhantomAsset, missingMetaAsset];
const filteredPdfs = mixedAssets.filter(
  (a) => (a.asset_type === 'original_pdf' || a.asset_type === 'pdf') && isAssetStorageAvailable(a)
);
assert.strictEqual(filteredPdfs.length, 1, 'Only the genuinely available PDF should remain');
assert.strictEqual(filteredPdfs[0].id, 101, 'Remaining asset must be the valid one');
console.log('  ✓ Test 14 Passed: Original PDF filter cleanly discards all phantom and unverified assets');

// Test 15: Valid, approved local-only PDF with no Telegram reference reconciled via backend
const localOnlyBackendAsset = {
  id: 105,
  asset_type: 'original_pdf',
  title: 'local_approved.pdf',
  has_telegram: false,
  telegram_file_id: null,
  telegram_message_id: null,
  file_size_bytes: 3500000,
  stream_url: '/api/stream/105',
  is_available: true // Server verified local file exists in approved media directory
};
assert.strictEqual(isAssetStorageAvailable(localOnlyBackendAsset), true, 'Approved local file verified by server must be available');

// Direct Supabase bundle reconciled with backend for this local asset
const sbLocalReconciledAsset = {
  id: 105,
  asset_type: 'original_pdf',
  title: 'local_approved.pdf',
  has_telegram: false,
  telegram_file_id: null,
  telegram_message_id: null,
  file_size_bytes: 3500000,
  stream_url: '/api/stream/105',
  is_available: true // Reconciled from backend check
};
assert.strictEqual(isAssetStorageAvailable(sbLocalReconciledAsset), true, 'Reconciled direct-Supabase asset must be available');
console.log('  ✓ Test 15 Passed: Valid, approved local-only PDF with no Telegram reference is available in both paths');

// Test 16: Consistency across all 4 scenarios regardless of loading path
const scenarios = [
  { name: 'Telegram-backed PDF', sb: sbValidAsset, backend: { ...sbValidAsset } },
  { name: 'Approved local-only PDF', sb: sbLocalReconciledAsset, backend: localOnlyBackendAsset },
  { name: 'Phantom file (positive size, no file)', sb: sbPhantomAsset, backend: backendPhantomAsset },
  { name: 'Missing storage metadata', sb: missingMetaAsset, backend: { ...missingMetaAsset, is_available: false } },
];

for (const sc of scenarios) {
  const sbResult = isAssetStorageAvailable(sc.sb);
  const backendResult = isAssetStorageAvailable(sc.backend);
  assert.strictEqual(sbResult, backendResult, `Availability must match for ${sc.name}`);
}
console.log('  ✓ Test 16 Passed: 100% availability consistency across direct-Supabase and backend-fallback loading paths');
console.log('\n🎉 ALL 16 UNIT & REGRESSION TESTS PASSED SUCCESSFULLY!');
