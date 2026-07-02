from __future__ import annotations

import argparse
import json
import re
import shutil
import subprocess
import sys
import tempfile
import time
import unicodedata
from dataclasses import dataclass
from pathlib import Path
from typing import Any

REPO_ROOT = Path(__file__).resolve().parents[1]
DOCS_DIR = REPO_ROOT / "docs"
SEED_DIR = REPO_ROOT / "supabase" / "seed"
OCR_DEBUG_DIR = SEED_DIR / "ocr-debug"
CATALOG_PATH = SEED_DIR / "catalog" / "canonical.curriculum.catalog.json"
SEED_SQL_PATH = REPO_ROOT / "supabase" / "seed.sql"
PDFTOPPM = Path(
    r"C:\Users\ADMIN\.cache\codex-runtimes\codex-primary-runtime\dependencies\native\poppler\Library\bin\pdftoppm.exe"
)

CODE_PATTERN = re.compile(r"^[A-Z]{3,5}\d{4,5}$")
INTEGER_PATTERN = re.compile(r"^\d{1,3}$")
TERM_PATTERN = re.compile(r"HOC\s*KY\s*(\d+)", re.IGNORECASE)


@dataclass(frozen=True)
class ProgramMeta:
    id: str
    code: str
    name: str
    english_name: str
    degree: str
    emphasis: str
    pdf_name: str


PROGRAMS = [
    ProgramMeta(
        id="cntt-2024",
        code="7480201",
        name="Cong nghe thong tin",
        english_name="Information Technology",
        degree="Cu nhan Cong nghe thong tin",
        emphasis="Phat trien he thong CNTT tong hop voi dinh huong web, cloud, bao mat va tich hop.",
        pdf_name="CTDT_Khoa 2024_18Sep2024_CNTTin.pdf",
    ),
    ProgramMeta(
        id="khmt-2024",
        code="7480101",
        name="Khoa hoc may tinh",
        english_name="Computer Science",
        degree="Cu nhan Khoa hoc may tinh",
        emphasis="Khoa hoc du lieu, tri tue nhan tao, thi giac may tinh va nghien cuu chuyen sau.",
        pdf_name="CTDT_Khoa 2024_18Sep2024_KHMT.pdf",
    ),
    ProgramMeta(
        id="ktpm-2024",
        code="7480103",
        name="Ky thuat phan mem",
        english_name="Software Engineering",
        degree="Cu nhan Ky thuat phan mem",
        emphasis="Thiet ke, phat trien, kiem thu, quan ly va van hanh san pham phan mem.",
        pdf_name="CTDT_Khoa 2024_18Sep2024_KTPM.pdf",
    ),
    ProgramMeta(
        id="httt-2024",
        code="7480104",
        name="He thong thong tin",
        english_name="Information Systems",
        degree="Cu nhan He thong thong tin",
        emphasis="Phan tich nghiep vu, quan tri du lieu, tri thuc kinh doanh va he thong doanh nghiep.",
        pdf_name="CTDT_Khoa 2024_18Sep2024_HTTT.pdf",
    ),
]


GROUPS = [
    {
        "key": "general-education",
        "title": "Giao duc dai cuong",
        "required_credits": 56,
        "description": "Khoi kien thuc dai cuong tinh vao tin chi tot nghiep, khong ke ngoai ngu, GDTC, GDQPAN.",
        "order": 1,
    },
    {
        "key": "foundation",
        "title": "Co so nganh",
        "required_credits": 38,
        "description": "Khoi kien thuc co so nganh va nen tang cong nghe thong tin.",
        "order": 2,
    },
    {
        "key": "major-core",
        "title": "Nganh chuyen nganh",
        "required_credits": 16,
        "description": "Cac hoc phan chuyen nganh bat buoc.",
        "order": 3,
    },
    {
        "key": "major-elective",
        "title": "Tu chon chuyen nganh",
        "required_credits": 18,
        "description": "Cac hoc phan tu chon nganh, chuyen nganh, va tu chon tu do trong CTDT.",
        "order": 4,
    },
    {
        "key": "graduation",
        "title": "Tot nghiep",
        "required_credits": 10,
        "description": "Thuc tap, do an, khoa luan, va hoc phan tot nghiep.",
        "order": 5,
    },
]

CONDITION_COURSE_CODES = {
    "ADD00031",
    "ADD00032",
    "ADD00033",
    "ADD00034",
    "BAA00021",
    "BAA00022",
    "BAA00030",
}

REQUIREMENT_SECTIONS = [
    {
        "key": "general-education-requirement",
        "title": "Giáo dục đại cương (I)",
        "category": "general-education",
        "requiredCredits": 42,
        "electiveCredits": 14,
        "freeElectiveCredits": 0,
        "totalCredits": 56,
        "sourceNote": "Theo bảng tổng hợp CTĐT khóa 2024; không kể Ngoại ngữ, GDTC và GDQPAN.",
        "order": 1,
    },
    {
        "key": "foundation-requirement",
        "title": "Cơ sở ngành (2)",
        "category": "foundation",
        "requiredCredits": 38,
        "electiveCredits": 0,
        "freeElectiveCredits": 0,
        "totalCredits": 38,
        "sourceNote": "Theo bảng tổng hợp CTĐT khóa 2024.",
        "order": 2,
    },
    {
        "key": "major-requirement",
        "title": "Chuyên ngành (3)",
        "category": "major",
        "requiredCredits": 16,
        "electiveCredits": 8,
        "freeElectiveCredits": 10,
        "totalCredits": 34,
        "sourceNote": "Theo bảng tổng hợp CTĐT khóa 2024; app hiện hiển thị tổng, chưa khóa hướng chuyên ngành.",
        "order": 3,
    },
    {
        "key": "graduation-requirement",
        "title": "Tốt nghiệp (4)",
        "category": "graduation",
        "requiredCredits": 0,
        "electiveCredits": 10,
        "freeElectiveCredits": 0,
        "totalCredits": 10,
        "sourceNote": "Theo bảng tổng hợp CTĐT khóa 2024.",
        "order": 4,
    },
]


PROGRAM_PREREQUISITES: dict[str, dict[str, list[str]]] = {
    "ktpm-2024": {
        "CSC10004": ["CSC10012"],
        "CSC10003": ["CSC10012"],
        "CSC10008": ["CSC00004"],
        "CSC10014": ["CSC10004"],
        "CSC10006": ["CSC10004"],
        "CSC10009": ["CSC00004"],
        "CSC13102": ["CSC10003"],
        "CSC13003": ["CSC10003"],
        "CSC13005": ["CSC10006"],
        "CSC13006": ["CSC13005"],
        "CSC13010": ["CSC10003"],
        "CSC13112": ["CSC13010"],
        "CSC13008": ["CSC10006", "CSC10003"],
        "CSC13114": ["CSC13008"],
        "CSC13009": ["CSC13102"],
        "CSC10107": ["CSC13006"],
    },
    "khmt-2024": {
        "CSC10004": ["CSC10012"],
        "CSC10003": ["CSC10012"],
        "CSC10008": ["CSC00004"],
        "CSC10014": ["CSC10004"],
        "CSC10006": ["CSC10004"],
        "CSC14003": ["CSC10004", "MTH00044"],
        "CSC15010": ["CSC10008"],
        "CSC16004": ["CSC14003"],
        "CSC16005": ["CSC16004"],
        "CSC17001": ["CSC14003", "CSC10006"],
    },
    "httt-2024": {
        "CSC10004": ["CSC10012"],
        "CSC10003": ["CSC10012"],
        "CSC10008": ["CSC00004"],
        "CSC10014": ["CSC10004"],
        "CSC10006": ["CSC10004"],
        "CSC12004": ["CSC10006"],
        "CSC12107": ["CSC10006"],
    },
    "cntt-2024": {
        "CSC10004": ["CSC10012"],
        "CSC10003": ["CSC10012"],
        "CSC10008": ["CSC00004"],
        "CSC10014": ["CSC10004"],
        "CSC10006": ["CSC10004"],
        "CSC10009": ["CSC00004"],
        "CSC11002": ["CSC10009"],
        "CSC11003": ["CSC10008"],
        "CSC11004": ["CSC11002"],
        "CSC11007": ["CSC11004"],
        "CSC12112": ["CSC12004"],
        "CSC13102": ["CSC10003"],
        "CSC13005": ["CSC10006"],
        "CSC13006": ["CSC13005"],
        "CSC13008": ["CSC10006", "CSC10003"],
        "CSC13114": ["CSC13008"],
        "CSC13009": ["CSC13102"],
        "CSC10107": ["CSC13006"],
    },
}


KNOWN_TITLE_FIXES = {
    "H6a": "Hoa",
    "di lieu": "du lieu",
    "tuy�n": "tuyen",
    "thuy�t": "thuyet",
    "ngur": "ngu",
    "curong": "cuong",
    "Phurong": "Phuong",
    "ungdung": "ung dung",
    "tir": "tu",
    "thurc": "thuc",
    "Ki�n": "Kien",
}

SUSPICIOUS_TITLE_PATTERNS = [
    (re.compile(r"\ufffd"), "contains replacement character"),
    (re.compile(r"\b\d(?:\s+\d){4,}\b"), "contains numeric OCR tail"),
    (re.compile(r"\b[0-9](?:\.[0-9])+.*"), "contains section numbering tail"),
    (re.compile(r"trinhdao|khoatuyen|mauba"), "contains OCR page fragment"),
    (re.compile(r"\b(?:u|i)?ruu+ng|uuu+ng"), "contains broken 'ứng' OCR fragment"),
    (re.compile(r"\bmth\d{3}\b"), "contains leaked course-code suffix"),
]

PROGRAM_BY_ID = {program.id: program for program in PROGRAMS}


def normalize_text(value: str) -> str:
    value = unicodedata.normalize("NFKD", value)
    value = "".join(ch for ch in value if not unicodedata.combining(ch))
    value = value.replace("đ", "d").replace("Đ", "D")
    value = re.sub(r"\s+", " ", value)
    return value.strip()


def clean_display_text(value: str) -> str:
    cleaned = value.replace("—", "-").replace("--", "-")
    cleaned = re.sub(r"\s+", " ", cleaned).strip(" .:-")

    for wrong, right in KNOWN_TITLE_FIXES.items():
        cleaned = cleaned.replace(wrong, right)

    return cleaned


def suspicious_title_reason(title: str) -> str | None:
    normalized = normalize_text(title).lower().replace(" ", "")
    raw = title.lower()

    for pattern, reason in SUSPICIOUS_TITLE_PATTERNS:
        if pattern.search(raw) or pattern.search(normalized):
            return reason

    return None


def slugify(value: str) -> str:
    return normalize_text(value).lower().replace(" ", "-")


def detect_category(line: str, current: str | None) -> str | None:
    normalized = normalize_text(line).lower()

    if "giao duc dai cuong" in normalized:
        return "general-education"
    if "co so nganh" in normalized:
        return "foundation"
    if "tu chon nganh" in normalized or "tu chon chuyen nganh" in normalized or "kien thuc tu chon" in normalized:
        return "major-elective"
    if "tot nghiep" in normalized and "kien thuc" in normalized:
        return "graduation"
    if "hoc ky" in normalized:
        return current
    if "nganh" in normalized or "chuyen nganh" in normalized:
        return "major-core"
    return current


def looks_like_noise(token: str) -> bool:
    normalized = normalize_text(token).lower()
    if not normalized:
        return True

    noisy_fragments = [
        "so tiet",
        "ma hoc",
        "ten hoc",
        "ghi chu",
        "loai hoc",
        "tong cong",
        "stt",
        "ly",
        "thuc",
        "bai",
        "tap",
        "thuyet",
        "hanh",
        "phan",
        "chuong trinh dao tao",
        "trang ",
    ]
    return any(fragment == normalized for fragment in noisy_fragments)


def parse_kind(token: str) -> str | None:
    normalized = normalize_text(token).upper()
    if normalized in {"BB", "BAT BUOC"}:
        return "required"
    if normalized in {"TC", "TU CHON"}:
        return "elective"
    if normalized in {"TN", "TOT NGHIEP"}:
        return "graduation"
    return None


def render_pages(
    pdf_path: Path,
    *,
    from_page: int,
    to_page: int | None,
    dpi: int,
) -> list[Path]:
    temp_dir = Path(tempfile.mkdtemp(prefix=f"{pdf_path.stem}-", dir=str(SEED_DIR)))
    output = temp_dir / "page"
    command = [
        str(PDFTOPPM),
        "-png",
        "-r",
        str(dpi),
        "-f",
        str(from_page),
    ]
    if to_page is not None:
        command.extend(["-l", str(to_page)])

    command.extend([str(pdf_path), str(output)])
    subprocess.run(
        command,
        cwd=str(REPO_ROOT),
        check=True,
        capture_output=True,
    )
    return sorted(temp_dir.glob("page-*.png"))


def read_cached_ocr(program: ProgramMeta) -> list[dict[str, Any]] | None:
    cache_path = OCR_DEBUG_DIR / f"{program.id}.ocr.json"
    if not cache_path.exists():
        return None

    return json.loads(cache_path.read_text(encoding="utf-8"))


def ocr_pdf(
    program: ProgramMeta,
    pdf_path: Path,
    *,
    from_page: int,
    to_page: int | None,
    dpi: int,
    use_cached_ocr: bool,
) -> list[dict[str, Any]]:
    if use_cached_ocr:
        cached = read_cached_ocr(program)
        if cached is not None:
            print(f"[seed] using cached OCR for {program.id}")
            return cached

    from rapidocr_onnxruntime import RapidOCR

    ocr = RapidOCR()
    pages = []
    image_paths = render_pages(pdf_path, from_page=from_page, to_page=to_page, dpi=dpi)
    print(f"[seed] OCR {program.id}: {len(image_paths)} rasterized pages")

    for index, image_path in enumerate(image_paths, start=1):
        page_number = int(image_path.stem.split("-")[1])
        print(
            f"[seed] {program.id}: page {page_number} ({index}/{len(image_paths)})",
            flush=True,
        )
        result, _ = ocr(str(image_path))
        lines = [clean_display_text(item[1]) for item in result if clean_display_text(item[1])]
        pages.append(
            {
                "page": page_number,
                "lines": lines,
            }
        )

    if image_paths:
        shutil.rmtree(image_paths[0].parent, ignore_errors=True)

    return pages


def parse_catalog_pages(program: ProgramMeta, pages: list[dict[str, Any]]) -> tuple[list[dict[str, Any]], dict[str, int], list[str]]:
    current_category: str | None = None
    courses: dict[str, dict[str, Any]] = {}
    suggested_terms: dict[str, int] = {}
    anomalies: list[str] = []

    for page in pages:
        lines = page["lines"]
        page_no = page["page"]

        for line in lines:
            current_category = detect_category(line, current_category)

        current_term = None
        for line in lines:
            term_match = TERM_PATTERN.search(normalize_text(line))
            if term_match:
                current_term = int(term_match.group(1))
                continue

            if current_term is not None and CODE_PATTERN.match(normalize_text(line).upper()):
                suggested_terms.setdefault(normalize_text(line).upper(), current_term)

        if current_category is None:
            continue

        i = 0
        while i < len(lines):
            token = normalize_text(lines[i]).upper()

            if not CODE_PATTERN.match(token):
                i += 1
                continue

            code = token
            j = i + 1
            title_parts: list[str] = []
            numbers: list[int] = []
            kind: str | None = None

            while j < len(lines):
                current = clean_display_text(lines[j])
                normalized = normalize_text(current)
                upper = normalized.upper()

                if CODE_PATTERN.match(upper) and kind is not None:
                    break

                if looks_like_noise(current):
                    j += 1
                    continue

                parsed_kind = parse_kind(current)
                if parsed_kind is not None:
                    kind = parsed_kind
                    j += 1
                    break

                if INTEGER_PATTERN.match(normalized):
                    numbers.append(int(normalized))
                    j += 1
                    continue

                if len(numbers) == 0:
                    title_parts.append(current)
                    j += 1
                    continue

                if CODE_PATTERN.match(upper):
                    break

                # Trailing OCR junk after numeric columns.
                if kind is None and len(numbers) >= 4:
                    j += 1
                    continue

                title_parts.append(current)
                j += 1

            if not title_parts or not numbers:
                anomalies.append(f"{program.id}: page {page_no} could not parse course row for {code}")
                i += 1
                continue

            credits = numbers[0]
            lecture = numbers[1] if len(numbers) > 1 else 0
            practice = numbers[2] if len(numbers) > 2 else 0
            lab = numbers[3] if len(numbers) > 3 else 0

            if credits <= 0 or credits > 10:
                anomalies.append(f"{program.id}: page {page_no} invalid credits for {code}: {numbers}")
                i = j
                continue

            existing = courses.get(code)
            parsed = {
                "code": code,
                "title": clean_display_text(" ".join(title_parts)),
                "credits": credits,
                "lectureHours": lecture,
                "practiceHours": practice,
                "labHours": lab,
                "kind": kind or ("graduation" if current_category == "graduation" else "required"),
                "category": current_category,
                "notes": f"OCR extracted from {program.pdf_name} page {page_no}.",
            }

            if existing is None or len(parsed["title"]) > len(existing["title"]):
                courses[code] = parsed

            i = max(i + 1, j)

    return list(courses.values()), suggested_terms, anomalies


def load_canonical_catalog() -> dict[str, Any]:
    if not CATALOG_PATH.exists():
        raise FileNotFoundError(
            f"Missing canonical catalog at {CATALOG_PATH}. Run scripts/bootstrap_canonical_catalog.py first."
        )
    return json.loads(CATALOG_PATH.read_text(encoding="utf-8"))


def merge_with_canonical_catalog(
    program: ProgramMeta,
    courses: list[dict[str, Any]],
    suggested_terms: dict[str, int],
    catalog: dict[str, Any],
) -> tuple[list[dict[str, Any]], list[str]]:
    by_code = {course["code"]: course for course in courses}
    program_catalog = catalog["courses"].get(program.id, {})
    canonicalization_gaps: list[str] = []
    merged_courses: list[dict[str, Any]] = []

    for code, canonical in sorted(program_catalog.items()):
        parsed = by_code.get(code)
        course = {
            "code": code,
            "title": canonical["titleVi"],
            "credits": int((parsed or canonical)["credits"]),
            "lectureHours": int((parsed or canonical)["lectureHours"]),
            "practiceHours": int((parsed or canonical)["practiceHours"]),
            "labHours": int((parsed or canonical)["labHours"]),
            "kind": canonical["kind"],
            "category": canonical["category"],
            "notes": canonical.get("notesVi"),
        }
        course["prerequisites"] = PROGRAM_PREREQUISITES.get(program.id, {}).get(code, [])
        course["suggestedTerm"] = (
            suggested_terms.get(code)
            or (parsed or canonical).get("suggestedTerm")
            or infer_term(course)
        )
        course["groupKey"] = group_key_from_category(course["category"])

        title_issue = suspicious_title_reason(course["title"])
        if course["title"] == code or title_issue:
            canonicalization_gaps.append(
                f"{program.id}:{code} invalid canonical title '{course['title']}'"
                f"{f' ({title_issue})' if title_issue else ''}"
            )

        merged_courses.append(course)

    for code in sorted(by_code):
        if code not in program_catalog:
            canonicalization_gaps.append(f"{program.id}:{code} parsed from OCR but missing canonical catalog entry")

    available_codes = {course["code"] for course in merged_courses}
    for course in merged_courses:
        valid_prerequisites = []
        for prerequisite in course["prerequisites"]:
            if prerequisite not in available_codes:
                canonicalization_gaps.append(
                    f"{program.id}:{course['code']} prerequisite {prerequisite} missing from canonical program catalog"
                )
                continue
            valid_prerequisites.append(prerequisite)
        course["prerequisites"] = valid_prerequisites

    return sorted(merged_courses, key=lambda item: (item["suggestedTerm"], item["code"])), canonicalization_gaps


def infer_term(course: dict[str, Any]) -> int:
    category = course["category"]
    if category == "general-education":
        return 1
    if category == "foundation":
        return 2
    if category == "major-core":
        return 5
    if category == "major-elective":
        return 6
    return 8


def group_key_from_category(category: str) -> str:
    return category


def infer_grading_metadata(course: dict[str, Any]) -> dict[str, Any]:
    code = str(course["code"]).upper()
    is_non_gpa_completion_course = code in CONDITION_COURSE_CODES

    if is_non_gpa_completion_course:
        return {
            "countsTowardGpa": False,
            "countsTowardProgress": False,
            "gradingMode": "numeric_or_pass_fail",
        }

    return {
        "countsTowardGpa": True,
        "countsTowardProgress": True,
        "gradingMode": "numeric",
    }


def build_program_payload(
    program: ProgramMeta,
    pages: list[dict[str, Any]],
    catalog: dict[str, Any],
) -> tuple[dict[str, Any], list[str], list[str]]:
    courses, suggested_terms, anomalies = parse_catalog_pages(program, pages)
    courses, canonicalization_gaps = merge_with_canonical_catalog(program, courses, suggested_terms, catalog)
    program_text = catalog["programs"][program.id]
    group_text = catalog["courseGroups"]

    payload = {
        "id": program.id,
        "code": program.code,
        "name": program_text["nameVi"],
        "englishName": program_text["englishName"],
        "degree": program_text["degreeVi"],
        "durationYears": 4,
        "totalCredits": 138,
        "sourceNote": program_text["sourceNote"],
        "curriculumCoverageNote": program_text["curriculumCoverageNote"],
        "groups": [
            {
                "id": f"{program.id}-{group['key']}",
                "programId": program.id,
                "title": group_text[group["key"]]["titleVi"],
                "category": group["key"],
                "requiredCredits": group["required_credits"],
                "description": group_text[group["key"]]["descriptionVi"],
                "order": group["order"],
            }
            for group in GROUPS
        ],
        "requirementSections": [
            {
                "id": f"{program.id}-{section['key']}",
                "programId": program.id,
                "title": section["title"],
                "category": section["category"],
                "requiredCredits": section["requiredCredits"],
                "electiveCredits": section["electiveCredits"],
                "freeElectiveCredits": section["freeElectiveCredits"],
                "totalCredits": section["totalCredits"],
                "countsTowardProgramTotal": True,
                "sourceNote": section["sourceNote"],
                "order": section["order"],
            }
            for section in REQUIREMENT_SECTIONS
        ],
        "courses": [],
    }

    for course in courses:
        grading_metadata = infer_grading_metadata(course)
        payload["courses"].append(
            {
                "id": f"{program.id}-{course['code'].lower()}",
                "programId": program.id,
                "groupId": f"{program.id}-{course['groupKey']}",
                "category": course["category"],
                "code": course["code"],
                "title": course["title"],
                "credits": int(course["credits"]),
                "lectureHours": int(course["lectureHours"]),
                "practiceHours": int(course["practiceHours"]),
                "labHours": int(course["labHours"]),
                "kind": course["kind"],
                "suggestedTerm": int(course["suggestedTerm"]),
                "prerequisites": [
                    f"{program.id}-{item.lower()}"
                    for item in course.get("prerequisites", [])
                ],
                "notes": course.get("notes"),
                **grading_metadata,
            }
        )

    return payload, anomalies, canonicalization_gaps


def write_json(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")


def sql_quote(value: str | None) -> str:
    if value is None:
        return "null"
    return "'" + value.replace("'", "''") + "'"


def choose_catalog_value(
    code: str,
    field: str,
    values_by_program: list[tuple[str, Any]],
    conflict_log: list[str] | None,
) -> Any:
    variants: dict[str, dict[str, Any]] = {}

    for program_id, value in values_by_program:
        key = json.dumps(value, ensure_ascii=False, sort_keys=True)
        variant = variants.setdefault(key, {"value": value, "programs": []})
        variant["programs"].append(program_id)

    if len(variants) == 1:
        return next(iter(variants.values()))["value"]

    ranked = sorted(
        variants.values(),
        key=lambda item: (-len(item["programs"]), json.dumps(item["value"], ensure_ascii=False, sort_keys=True)),
    )
    top_count = len(ranked[0]["programs"])
    tied = [item for item in ranked if len(item["programs"]) == top_count]
    chosen = ranked[0]["value"]

    if len(tied) > 1 and all(isinstance(item["value"], (int, float, bool)) for item in tied):
        chosen = max(item["value"] for item in tied)

    if conflict_log is not None:
        detail = "; ".join(
            f"{item['value']} ({', '.join(item['programs'])})"
            for item in ranked
        )
        conflict_log.append(f"{code}.{field}: chose {chosen}; variants: {detail}")

    return chosen


def build_course_catalog_entries(
    programs: list[dict[str, Any]],
    conflict_log: list[str] | None = None,
) -> list[dict[str, Any]]:
    courses_by_code: dict[str, list[tuple[str, dict[str, Any]]]] = {}
    shared_fields = [
        "title",
        "credits",
        "lectureHours",
        "practiceHours",
        "labHours",
        "countsTowardGpa",
        "countsTowardProgress",
        "gradingMode",
    ]

    for program in programs:
        for course in program["courses"]:
            courses_by_code.setdefault(course["code"], []).append((program["id"], course))

    catalog_entries: list[dict[str, Any]] = []

    for code, rows in courses_by_code.items():
        resolved = {
            field: choose_catalog_value(
                code,
                field,
                [(program_id, course[field]) for program_id, course in rows],
                conflict_log,
            )
            for field in shared_fields
        }
        catalog_entries.append(
            {
                "id": code,
                "code": code,
                "title": resolved["title"],
                "credits": resolved["credits"],
                "lectureHours": resolved["lectureHours"],
                "practiceHours": resolved["practiceHours"],
                "labHours": resolved["labHours"],
                "countsTowardGpa": resolved["countsTowardGpa"],
                "countsTowardProgress": resolved["countsTowardProgress"],
                "gradingMode": resolved["gradingMode"],
            }
        )

    return sorted(catalog_entries, key=lambda item: item["code"])


def build_program_curriculum_payload(programs: list[dict[str, Any]]) -> dict[str, Any]:
    return {
        "programs": [
            {
                "id": program["id"],
                "code": program["code"],
                "name": program["name"],
                "englishName": program["englishName"],
                "degree": program["degree"],
                "durationYears": program["durationYears"],
                "totalCredits": program["totalCredits"],
                "sourceNote": program["sourceNote"],
                "curriculumCoverageNote": program["curriculumCoverageNote"],
                "groups": program["groups"],
                "requirementSections": program["requirementSections"],
                "programCourses": [
                    {
                        "id": course["id"],
                        "programId": course["programId"],
                        "courseCode": course["code"],
                        "groupId": course["groupId"],
                        "category": course["category"],
                        "kind": course["kind"],
                        "suggestedTerm": course["suggestedTerm"],
                        "prerequisites": [
                            prerequisite.split("-", 2)[-1].upper()
                            if prerequisite.startswith(f"{program['id']}-")
                            else prerequisite
                            for prerequisite in course["prerequisites"]
                        ],
                        "notes": course["notes"],
                        "countsTowardGpa": course["countsTowardGpa"],
                        "countsTowardProgress": course["countsTowardProgress"],
                        "gradingMode": course["gradingMode"],
                    }
                    for course in program["courses"]
                ],
            }
            for program in programs
        ]
    }


def build_seed_sql(programs: list[dict[str, Any]]) -> str:
    catalog_entries = build_course_catalog_entries(programs)
    lines = [
        "-- Auto-generated by scripts/build_curriculum_seed.py",
        "begin;",
        "",
    ]

    for course in catalog_entries:
        lines.append(
            "insert into public.course_catalog (id, code, title, credits, lecture_hours, practice_hours, lab_hours, default_counts_toward_gpa, default_counts_toward_progress, default_grading_mode)\n"
            f"values ({sql_quote(course['id'])}, {sql_quote(course['code'])}, {sql_quote(course['title'])}, "
            f"{course['credits']}, {course['lectureHours']}, {course['practiceHours']}, {course['labHours']}, "
            f"{str(course['countsTowardGpa']).lower()}, {str(course['countsTowardProgress']).lower()}, {sql_quote(course['gradingMode'])})\n"
            "on conflict (id) do update set\n"
            "  code = excluded.code,\n"
            "  title = excluded.title,\n"
            "  credits = excluded.credits,\n"
            "  lecture_hours = excluded.lecture_hours,\n"
            "  practice_hours = excluded.practice_hours,\n"
            "  lab_hours = excluded.lab_hours,\n"
            "  default_counts_toward_gpa = excluded.default_counts_toward_gpa,\n"
            "  default_counts_toward_progress = excluded.default_counts_toward_progress,\n"
            "  default_grading_mode = excluded.default_grading_mode;\n"
        )

    for program in programs:
        lines.append(
            "insert into public.programs (id, code, name, english_name, degree, duration_years, total_credits, source_note, curriculum_coverage_note)\n"
            f"values ({sql_quote(program['id'])}, {sql_quote(program['code'])}, {sql_quote(program['name'])}, {sql_quote(program['englishName'])}, "
            f"{sql_quote(program['degree'])}, {program['durationYears']}, {program['totalCredits']}, {sql_quote(program['sourceNote'])}, {sql_quote(program['curriculumCoverageNote'])})\n"
            "on conflict (id) do update set\n"
            "  code = excluded.code,\n"
            "  name = excluded.name,\n"
            "  english_name = excluded.english_name,\n"
            "  degree = excluded.degree,\n"
            "  duration_years = excluded.duration_years,\n"
            "  total_credits = excluded.total_credits,\n"
            "  source_note = excluded.source_note,\n"
            "  curriculum_coverage_note = excluded.curriculum_coverage_note;\n"
        )

        for group in program["groups"]:
            lines.append(
                "insert into public.course_groups (id, program_id, title, category, required_credits, description, display_order)\n"
                f"values ({sql_quote(group['id'])}, {sql_quote(group['programId'])}, {sql_quote(group['title'])}, {sql_quote(group['category'])}, "
                f"{group['requiredCredits']}, {sql_quote(group['description'])}, {group['order']})\n"
                "on conflict (id) do update set\n"
                "  title = excluded.title,\n"
                "  category = excluded.category,\n"
                "  required_credits = excluded.required_credits,\n"
                "  description = excluded.description,\n"
                "  display_order = excluded.display_order;\n"
            )

        for section in program["requirementSections"]:
            lines.append(
                "insert into public.program_requirement_sections (id, program_id, title, category, required_credits, elective_credits, free_elective_credits, total_credits, counts_toward_program_total, source_note, display_order)\n"
                f"values ({sql_quote(section['id'])}, {sql_quote(section['programId'])}, {sql_quote(section['title'])}, {sql_quote(section['category'])}, "
                f"{section['requiredCredits']}, {section['electiveCredits']}, {section['freeElectiveCredits']}, {section['totalCredits']}, "
                f"{str(section['countsTowardProgramTotal']).lower()}, {sql_quote(section['sourceNote'])}, {section['order']})\n"
                "on conflict (id) do update set\n"
                "  title = excluded.title,\n"
                "  category = excluded.category,\n"
                "  required_credits = excluded.required_credits,\n"
                "  elective_credits = excluded.elective_credits,\n"
                "  free_elective_credits = excluded.free_elective_credits,\n"
                "  total_credits = excluded.total_credits,\n"
                "  counts_toward_program_total = excluded.counts_toward_program_total,\n"
                "  source_note = excluded.source_note,\n"
                "  display_order = excluded.display_order;\n"
            )

        for display_order, course in enumerate(program["courses"], start=1):
            lines.append(
                "insert into public.program_courses (id, program_id, catalog_course_id, group_id, category, kind, suggested_term, notes, counts_toward_gpa, counts_toward_progress, grading_mode, display_order)\n"
                f"values ({sql_quote(course['id'])}, {sql_quote(course['programId'])}, {sql_quote(course['code'])}, {sql_quote(course['groupId'])}, "
                f"{sql_quote(course['category'])}, {sql_quote(course['kind'])}, {course['suggestedTerm']}, {sql_quote(course['notes'])}, "
                f"{str(course['countsTowardGpa']).lower()}, {str(course['countsTowardProgress']).lower()}, {sql_quote(course['gradingMode'])}, {display_order})\n"
                "on conflict (id) do update set\n"
                "  program_id = excluded.program_id,\n"
                "  catalog_course_id = excluded.catalog_course_id,\n"
                "  group_id = excluded.group_id,\n"
                "  category = excluded.category,\n"
                "  kind = excluded.kind,\n"
                "  suggested_term = excluded.suggested_term,\n"
                "  notes = excluded.notes,\n"
                "  counts_toward_gpa = excluded.counts_toward_gpa,\n"
                "  counts_toward_progress = excluded.counts_toward_progress,\n"
                "  grading_mode = excluded.grading_mode,\n"
                "  display_order = excluded.display_order;\n"
            )

            lines.append(
                "insert into public.courses (id, program_id, group_id, category, code, title, credits, lecture_hours, practice_hours, lab_hours, kind, suggested_term, notes, counts_toward_gpa, counts_toward_progress, grading_mode)\n"
                f"values ({sql_quote(course['id'])}, {sql_quote(course['programId'])}, {sql_quote(course['groupId'])}, {sql_quote(course['category'])}, "
                f"{sql_quote(course['code'])}, {sql_quote(course['title'])}, {course['credits']}, {course['lectureHours']}, {course['practiceHours']}, "
                f"{course['labHours']}, {sql_quote(course['kind'])}, {course['suggestedTerm']}, {sql_quote(course['notes'])}, "
                f"{str(course['countsTowardGpa']).lower()}, {str(course['countsTowardProgress']).lower()}, {sql_quote(course['gradingMode'])})\n"
                "on conflict (id) do update set\n"
                "  group_id = excluded.group_id,\n"
                "  category = excluded.category,\n"
                "  code = excluded.code,\n"
                "  title = excluded.title,\n"
                "  credits = excluded.credits,\n"
                "  lecture_hours = excluded.lecture_hours,\n"
                "  practice_hours = excluded.practice_hours,\n"
                "  lab_hours = excluded.lab_hours,\n"
                "  kind = excluded.kind,\n"
                "  suggested_term = excluded.suggested_term,\n"
                "  notes = excluded.notes,\n"
                "  counts_toward_gpa = excluded.counts_toward_gpa,\n"
                "  counts_toward_progress = excluded.counts_toward_progress,\n"
                "  grading_mode = excluded.grading_mode;\n"
            )

    lines.append("delete from public.course_prerequisites;")
    lines.append("delete from public.program_course_prerequisites;")
    for program in programs:
        for course in program["courses"]:
            for prerequisite in course["prerequisites"]:
                lines.append(
                    "insert into public.program_course_prerequisites (program_course_id, prerequisite_program_course_id)\n"
                    f"values ({sql_quote(course['id'])}, {sql_quote(prerequisite)})\n"
                    "on conflict (program_course_id, prerequisite_program_course_id) do nothing;\n"
                )
                lines.append(
                    "insert into public.course_prerequisites (course_id, prerequisite_course_id)\n"
                    f"values ({sql_quote(course['id'])}, {sql_quote(prerequisite)})\n"
                    "on conflict (course_id, prerequisite_course_id) do nothing;\n"
                )

    lines.extend(
        [
            "insert into public.program_term_templates (",
            "  id,",
            "  program_id,",
            "  term_number,",
            "  term_label,",
            "  recommended_credits,",
            "  source_note,",
            "  display_order",
            ")",
            "select",
            "  courses.program_id || '-term-' || courses.suggested_term,",
            "  courses.program_id,",
            "  courses.suggested_term,",
            "  'Học kỳ ' || courses.suggested_term,",
            "  sum(course_catalog.credits)::integer,",
            "  'Chuẩn hóa từ kế hoạch học tập trong PDF CTĐT khóa 2024 và trường suggested_term của seed curriculum.',",
            "  courses.suggested_term",
            "from public.program_courses courses",
            "join public.course_catalog on course_catalog.id = courses.catalog_course_id",
            "group by courses.program_id, courses.suggested_term",
            "on conflict (program_id, term_number) do update set",
            "  recommended_credits = excluded.recommended_credits,",
            "  source_note = excluded.source_note,",
            "  display_order = excluded.display_order,",
            "  updated_at = now();",
            "",
            "insert into public.program_term_template_courses (",
            "  template_id,",
            "  course_id,",
            "  program_course_id,",
            "  display_order,",
            "  is_required_in_template,",
            "  note",
            ")",
            "select",
            "  ranked.program_id || '-term-' || ranked.suggested_term,",
            "  ranked.id,",
            "  ranked.id,",
            "  ranked.template_display_order,",
            "  ranked.kind in ('required', 'graduation'),",
            "  null",
            "from (",
            "  select",
            "    courses.*,",
            "    course_catalog.code,",
            "    row_number() over (",
            "      partition by courses.program_id, courses.suggested_term",
            "      order by",
            "        case when courses.kind in ('required', 'graduation') then 0 else 1 end,",
            "        course_catalog.code",
            "    ) as template_display_order",
            "  from public.program_courses courses",
            "  join public.course_catalog on course_catalog.id = courses.catalog_course_id",
            ") ranked",
            "on conflict (template_id, course_id) do update set",
            "  program_course_id = excluded.program_course_id,",
            "  display_order = excluded.display_order,",
            "  is_required_in_template = excluded.is_required_in_template;",
            "",
        ]
    )

    lines.append("commit;")
    lines.append("")
    return "\n".join(lines)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Build Supabase curriculum seed data from HCMUS docs."
    )
    parser.add_argument(
        "--program",
        dest="program_ids",
        action="append",
        choices=sorted(PROGRAM_BY_ID),
        help="Only process the selected program id. Repeat to process multiple programs.",
    )
    parser.add_argument(
        "--from-page",
        type=int,
        default=8,
        help="First PDF page to rasterize for OCR.",
    )
    parser.add_argument(
        "--to-page",
        type=int,
        default=None,
        help="Last PDF page to rasterize for OCR.",
    )
    parser.add_argument(
        "--dpi",
        type=int,
        default=144,
        help="Raster DPI for OCR.",
    )
    parser.add_argument(
        "--use-cached-ocr",
        action="store_true",
        help="Reuse existing OCR JSON in supabase/seed/ocr-debug when available.",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    OCR_DEBUG_DIR.mkdir(parents=True, exist_ok=True)
    SEED_DIR.mkdir(parents=True, exist_ok=True)
    catalog = load_canonical_catalog()

    selected_programs = (
        [PROGRAM_BY_ID[program_id] for program_id in args.program_ids]
        if args.program_ids
        else PROGRAMS
    )

    normalized_programs: list[dict[str, Any]] = []
    parse_anomaly_log: list[str] = []
    canonicalization_gap_log: list[str] = []
    catalog_conflict_log: list[str] = []
    started_at = time.perf_counter()

    for program in selected_programs:
        pdf_path = DOCS_DIR / program.pdf_name
        print(f"[seed] processing {program.id} from {pdf_path.name}", flush=True)
        pages = ocr_pdf(
            program,
            pdf_path,
            from_page=args.from_page,
            to_page=args.to_page,
            dpi=args.dpi,
            use_cached_ocr=args.use_cached_ocr,
        )
        write_json(OCR_DEBUG_DIR / f"{program.id}.ocr.json", pages)

        payload, anomalies, canonicalization_gaps = build_program_payload(program, pages, catalog)
        normalized_programs.append(payload)
        parse_anomaly_log.extend(anomalies)
        canonicalization_gap_log.extend(canonicalization_gaps)

    catalog_entries = build_course_catalog_entries(normalized_programs, catalog_conflict_log)
    seed_sql = build_seed_sql(normalized_programs)
    write_json(SEED_DIR / "curriculum.seed.json", {"programs": normalized_programs})
    write_json(SEED_DIR / "course_catalog.seed.json", {"courses": catalog_entries})
    write_json(SEED_DIR / "program_curriculum.seed.json", build_program_curriculum_payload(normalized_programs))
    (SEED_DIR / "seed.sql").write_text(seed_sql, encoding="utf-8")
    SEED_SQL_PATH.write_text(seed_sql, encoding="utf-8")
    (SEED_DIR / "parse-anomalies.log").write_text("\n".join(parse_anomaly_log), encoding="utf-8")
    (SEED_DIR / "canonicalization-gaps.log").write_text("\n".join(canonicalization_gap_log), encoding="utf-8")
    (SEED_DIR / "catalog-conflicts.log").write_text("\n".join(catalog_conflict_log), encoding="utf-8")

    elapsed_seconds = time.perf_counter() - started_at
    print(
        f"[seed] wrote payload for {len(normalized_programs)} program(s) to {SEED_DIR}",
        flush=True,
    )
    print(f"[seed] wrote SQL seed to {SEED_SQL_PATH}", flush=True)
    print(f"[seed] detected {len(parse_anomaly_log)} OCR anomalies", flush=True)
    print(f"[seed] detected {len(canonicalization_gap_log)} canonicalization gaps", flush=True)
    print(f"[seed] resolved {len(catalog_conflict_log)} catalog metadata conflicts", flush=True)
    print(f"[seed] completed in {elapsed_seconds:.1f}s", flush=True)

    if canonicalization_gap_log:
        raise SystemExit(
            "Blocking canonicalization gaps detected. Review supabase/seed/canonicalization-gaps.log."
        )


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("[seed] interrupted", file=sys.stderr)
        raise
