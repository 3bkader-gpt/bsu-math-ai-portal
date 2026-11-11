"""Pytest session setup: ensures schema exists and seeds baseline records on empty CI databases."""
import pytest
import app.db.models  # noqa: F401 - register all ORM models on Base.metadata
from app.db.database import Base, engine, SessionLocal
from app.db.models import Subject, Lecture, MediaAsset


def _build_ci_seed_study_guide() -> str:
    section = (
        "# المحاضرة 1: مفهوم المنحنى وطول القوس في الفراغ الثلاثي\n\n"
        "## أولاً: التمثيل البارامتري للمنحنيات المنتظمة\n"
        "نعرّف المنحنى المنتظم $r(t) = (x(t), y(t), z(t))$ بحيث لا ينعدم متجه المماس $r'(t) \\neq 0$.\n\n"
        "## ثانياً: طول القوس ومعادلات سيريه-فرينيه\n"
        "- متجه المماس الوحيد: $T(s) = r'(s)$\n"
        "- متجه العمود الأساسي: $N(s) = T'(s) / \\kappa(s)$\n"
        "- متجه العمود الثانوي: $B(s) = T(s) \\times N(s)$\n\n"
        "$$\\frac{dT}{ds} = \\kappa N, \\quad \\frac{dN}{ds} = -\\kappa T + \\tau B$$\n\n"
        "| الكمية | الرمز | الصيغة |\n"
        "| :--- | :---: | :--- |\n"
        "| الانحناء | $\\kappa$ | $|T'(s)|$ |\n"
        "| الالتواء | $\\tau$ | $-B'(s) \\cdot N(s)$ |\n"
    )
    return "\n\n".join([section] * 4)


@pytest.fixture(scope="session", autouse=True)
def ensure_test_database_ready():
    """Creates tables and seeds minimal data only when running against an empty DB (e.g., CI SQLite)."""
    Base.metadata.create_all(bind=engine)

    with SessionLocal() as db:
        lecture = db.query(Lecture).first()
        if lecture is None:
            subject = db.query(Subject).first()
            if subject is None:
                subject = Subject(
                    name="هندسة تفاضلية (CI)",
                    folder_path="/tmp/ci_subject",
                )
                db.add(subject)
                db.flush()

            lecture = Lecture(
                subject_id=subject.id,
                lecture_num=1,
                title="مفهوم المنحنى وطول القوس",
                status="completed",
            )
            db.add(lecture)
            db.flush()

        existing_guide = (
            db.query(MediaAsset)
            .filter(
                MediaAsset.asset_type == "study_guide_md",
                MediaAsset.content_text.isnot(None),
            )
            .first()
        )
        if existing_guide is None:
            db.add(
                MediaAsset(
                    lecture_id=lecture.id,
                    asset_type="study_guide_md",
                    title="الدليل الدراسي - المحاضرة 1",
                    content_text=_build_ci_seed_study_guide(),
                )
            )

        db.commit()
