import os
import shutil

target = r"D:\aya\مقترح بوابة الجودة والتطوير المهني الذكية - Faculty Quality AI Portal"
os.makedirs(target, exist_ok=True)

src = r"d:\الكليه\BOT\docs\FACULTY_QUALITY_AI_PORTAL_PROPOSAL.md"

dst1 = os.path.join(target, "المقترح التقني والأكاديمي الشامل - بوابة الجودة والتطوير المهني.md")
dst2 = os.path.join(target, "FACULTY_QUALITY_AI_PORTAL_PROPOSAL.md")

shutil.copy(src, dst1)
shutil.copy(src, dst2)

print("SUCCESS: copied files into target directory.")
for f in os.listdir(target):
    print(" -", f.encode("ascii", "replace").decode("ascii"))
