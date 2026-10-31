import os
import sys
import psycopg2
import dotenv

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

dotenv.load_dotenv('d:/الكليه/BOT/.env')
url = os.getenv('DATABASE_URL').replace('postgresql+psycopg2://', 'postgres://')
conn = psycopg2.connect(url)
cur = conn.cursor()

# User's expected lecture schedule
expected_counts = {
    "تدريس مصغر": 11,
    "كهربية ومغناطيسية وتيار متردد": 7,
    "تكنولوجيا التعليم": 6,  # or "تكنولوجيا والتحول الرقمي"
    "فلسفة وتاريخ الرياضيات": 6,  # or "فلسفه وتاريخ رياضيات"
    "هندسة تفاضلية": 6,  # or "هندسه تفاضلية"
    "معادلات تفاضلية": 5,
    "مقدمة في نظرية العدد والمنطق": 4,  # or "نظريه عدد ومنطق"
    "استاتيكا (٢)": 3,  # or "استاتيكا 2"
    "ديناميكا (٢)": 3,  # or "ديناميكا 2"
    "التعليم وريادة الأعمال": 2,  # or "تعليم ورياده اعمال"
    "إدارة المعرفة": 1,  # or "اداره معرفه"
}

# Fetch all subjects and their lectures
cur.execute("""
    SELECT s.id, s.name, 
           count(l.id) as db_count, 
           array_agg(l.lecture_num ORDER BY l.lecture_num) as db_nums,
           array_agg(l.id ORDER BY l.lecture_num) as db_ids,
           array_agg(l.status ORDER BY l.lecture_num) as db_statuses
    FROM subjects s
    LEFT JOIN lectures l ON l.subject_id = s.id
    GROUP BY s.id, s.name
    ORDER BY s.id;
""")
subjects = cur.fetchall()

print("=" * 75)
print("🔍 LECTURES COMPARISON REPORT: USER SCHEDULE vs PLATFORM DB")
print("=" * 75)

# Normalization helper
def normalize(name):
    return (name.replace("أ", "ا").replace("إ", "ا").replace("آ", "ا")
                .replace("ة", "ه").replace("ى", "ي").replace("(", "").replace(")", "")
                .replace("٢", "2").replace("  ", " ").strip().lower())

matched_expected = set()

total_expected_sum = sum(expected_counts.values())
total_db_sum = 0

diff_list = []

for sub_id, name, db_count, db_nums, db_ids, db_statuses in subjects:
    total_db_sum += db_count
    norm_name = normalize(name)
    
    # Find matching expected
    exp_key = None
    for k in expected_counts:
        norm_k = normalize(k)
        if norm_k in norm_name or norm_name in norm_k:
            exp_key = k
            break
        # Special alias checks
        if "تكنولوجيا" in norm_name and "تكنولوجيا" in norm_k:
            exp_key = k
            break
        if "كهرب" in norm_name and "كهرب" in norm_k:
            exp_key = k
            break
        if "فلسف" in norm_name and "فلسف" in norm_k:
            exp_key = k
            break
        if "هندس" in norm_name and "هندس" in norm_k:
            exp_key = k
            break
        if "عدد" in norm_name and "عدد" in norm_k:
            exp_key = k
            break
        if "معادل" in norm_name and "معادل" in norm_k:
            exp_key = k
            break
        if "رياد" in norm_name and "رياد" in norm_k:
            exp_key = k
            break
        if "معرف" in norm_name and "معرف" in norm_k:
            exp_key = k
            break
        if "استاتيك" in norm_name and "استاتيك" in norm_k:
            exp_key = k
            break
        if "ديناميك" in norm_name and "ديناميك" in norm_k:
            exp_key = k
            break

    exp_num = expected_counts.get(exp_key, 0)
    if exp_key:
        matched_expected.add(exp_key)

    clean_nums = [n for n in (db_nums or []) if n is not None]
    
    # Missing numbers from 1 to exp_num
    expected_set = set(range(1, exp_num + 1))
    actual_set = set(clean_nums)
    missing = sorted(list(expected_set - actual_set))
    extra = sorted(list(actual_set - expected_set))
    
    status_icon = "✅" if db_count == exp_num and not missing else "⚠️"
    
    print(f"\n{status_icon} [المادة {sub_id}] {name}")
    print(f"   • المطلوب في جدولك: {exp_num} محاضرات")
    print(f"   • الموجود ع المنصة: {db_count} محاضرات (أرقامها: {clean_nums})")
    
    if missing:
        print(f"   ❌ المحاضرات الناقصة (مش ع المنصة): {missing}")
        diff_list.append((name, f"ناقص المحاضرات: {missing}"))
    if extra:
        print(f"   ℹ️ محاضرات زيادة ع المنصة عن المطلوب: {extra}")
        diff_list.append((name, f"زيادة: {extra}"))
    if not missing and not extra and db_count == exp_num:
        print(f"   ✨ مكتملة بالكامل ومطابقة للجدول 100%!")

# Check if any expected subjects were not matched
unmatched = set(expected_counts.keys()) - matched_expected
if unmatched:
    print(f"\n⚠️ مواد في جدولك لم يتم مطابقتها في الداتا بيز: {unmatched}")

print("\n" + "=" * 75)
print(f"📊 الإجمالي: المطلوب: {total_expected_sum} محاضرة | الموجود ع المنصة: {total_db_sum} محاضرة")
print("=" * 75)

print("\n🔎 تفاصيل مادة [تعليم ورياده اعمال] (Subject 4):")
cur.execute("""
    SELECT id, lecture_num, title, doctor, status
    FROM lectures
    WHERE subject_id = 4
    ORDER BY id;
""")
for r in cur.fetchall():
    print(f"   • ID {r[0]} | المحاضرة {r[1]} | العنوان: {r[2]} | الدكتور: {r[3]} | الحالة: {r[4]}")

print("\n🔎 تفاصيل مادة [هندسه تفاضلية] (Subject 11):")
cur.execute("""
    SELECT id, lecture_num, title, doctor, status
    FROM lectures
    WHERE subject_id = 11
    ORDER BY lecture_num;
""")
for r in cur.fetchall():
    print(f"   • ID {r[0]} | المحاضرة {r[1]} | العنوان: {r[2]} | الدكتور: {r[3]} | الحالة: {r[4]}")

cur.close()
conn.close()
