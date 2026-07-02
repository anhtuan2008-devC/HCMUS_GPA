from __future__ import annotations

import json
import re
import unicodedata
from collections import defaultdict
from pathlib import Path
from typing import Any


REPO_ROOT = Path(__file__).resolve().parents[1]
SEED_PATH = REPO_ROOT / "supabase" / "seed" / "curriculum.seed.json"
CATALOG_PATH = REPO_ROOT / "supabase" / "seed" / "catalog" / "canonical.curriculum.catalog.json"
FALLBACK_NOTE = "Added from manual prerequisite fallback."


PROGRAM_TEXT = {
    "cntt-2024": {
        "nameVi": "Công nghệ thông tin",
        "englishName": "Information Technology",
        "degreeVi": "Cử nhân Công nghệ thông tin",
        "sourceNote": "Dữ liệu curriculum được chuẩn hóa từ bộ docs HCMUS khóa tuyển 2024.",
        "curriculumCoverageNote": "Bao phủ đầy đủ phần chương trình đào tạo chính của CTĐT CNTT khóa 2024; runtime chỉ dùng dữ liệu seed đã chuẩn hóa, không parse PDF.",
    },
    "khmt-2024": {
        "nameVi": "Khoa học máy tính",
        "englishName": "Computer Science",
        "degreeVi": "Cử nhân Khoa học máy tính",
        "sourceNote": "Dữ liệu curriculum được chuẩn hóa từ bộ docs HCMUS khóa tuyển 2024.",
        "curriculumCoverageNote": "Bao phủ đầy đủ phần chương trình đào tạo chính của CTĐT KHMT khóa 2024; runtime chỉ dùng dữ liệu seed đã chuẩn hóa, không parse PDF.",
    },
    "ktpm-2024": {
        "nameVi": "Kỹ thuật phần mềm",
        "englishName": "Software Engineering",
        "degreeVi": "Cử nhân Kỹ thuật phần mềm",
        "sourceNote": "Dữ liệu curriculum được chuẩn hóa từ bộ docs HCMUS khóa tuyển 2024.",
        "curriculumCoverageNote": "Bao phủ đầy đủ phần chương trình đào tạo chính của CTĐT KTPM khóa 2024; runtime chỉ dùng dữ liệu seed đã chuẩn hóa, không parse PDF.",
    },
    "httt-2024": {
        "nameVi": "Hệ thống thông tin",
        "englishName": "Information Systems",
        "degreeVi": "Cử nhân Hệ thống thông tin",
        "sourceNote": "Dữ liệu curriculum được chuẩn hóa từ bộ docs HCMUS khóa tuyển 2024.",
        "curriculumCoverageNote": "Bao phủ đầy đủ phần chương trình đào tạo chính của CTĐT HTTT khóa 2024; runtime chỉ dùng dữ liệu seed đã chuẩn hóa, không parse PDF.",
    },
}


GROUP_TEXT = {
    "general-education": {
        "titleVi": "Giáo dục đại cương",
        "descriptionVi": "Khối kiến thức đại cương, lý luận chính trị, khoa học tự nhiên, xã hội, ngoại ngữ, GDTC và GDQPAN.",
    },
    "foundation": {
        "titleVi": "Cơ sở ngành",
        "descriptionVi": "Khối kiến thức nền tảng và cơ sở của ngành công nghệ thông tin.",
    },
    "major-core": {
        "titleVi": "Ngành chuyên ngành",
        "descriptionVi": "Các học phần chuyên ngành bắt buộc theo định hướng chương trình.",
    },
    "major-elective": {
        "titleVi": "Tự chọn chuyên ngành",
        "descriptionVi": "Các học phần tự chọn ngành, chuyên ngành và học phần mở rộng theo CTĐT.",
    },
    "graduation": {
        "titleVi": "Tốt nghiệp",
        "descriptionVi": "Thực tập, đồ án, khóa luận và các học phần tốt nghiệp.",
    },
}


EXCLUDED_CODES = {
    "CNTT9001",
    "KHMT9001",
    "KTPM9001",
    "HTTT9001",
    "CSC11001",
    "CSC11005",
    "CSC15015",
    "CSC15017",
    "CSC13109",
    "CSC13113",
    "CSC12110",
    "CSC12118",
    "CSC12120",
}


GENERAL_EDUCATION_PREFIXES = ("ADD", "BAA", "BIO", "CHE", "ENV", "GEO", "MTH", "PHY")
FOUNDATION_CODES = {
    "CSC00004",
    "CSC10003",
    "CSC10004",
    "CSC10006",
    "CSC10007",
    "CSC10008",
    "CSC10009",
    "CSC10012",
    "CSC10014",
}
GRADUATION_CODES = {"CSC10204", "CSC10251", "CSC10252"}


COURSE_OVERRIDES = {
    "ADD00031": "Anh văn 1",
    "ADD00032": "Anh văn 2",
    "ADD00033": "Anh văn 3",
    "ADD00034": "Anh văn 4",
    "BAA00003": "Tư tưởng Hồ Chí Minh",
    "BAA00004": "Pháp luật đại cương",
    "BAA00005": "Kinh tế đại cương",
    "BAA00006": "Tâm lý đại cương",
    "BAA00007": "Phương pháp luận sáng tạo",
    "BAA00021": "Thể dục 1",
    "BAA00022": "Thể dục 2",
    "BAA00030": "Giáo dục quốc phòng - an ninh",
    "BAA00101": "Triết học Mác - Lênin",
    "BAA00102": "Kinh tế chính trị Mác - Lênin",
    "BAA00103": "Chủ nghĩa xã hội khoa học",
    "BAA00104": "Lịch sử Đảng Cộng sản Việt Nam",
    "BIO00001": "Sinh đại cương 1",
    "BIO00002": "Sinh đại cương 2",
    "BIO00081": "Thực tập Sinh đại cương 1",
    "BIO00082": "Thực tập Sinh đại cương 2",
    "CHE00001": "Hóa đại cương 1",
    "CHE00002": "Hóa đại cương 2",
    "CHE00081": "Thực hành Hóa đại cương 1",
    "CHE00082": "Thực hành Hóa đại cương 2",
    "CSC00004": "Nhập môn công nghệ thông tin",
    "CSC10003": "Phương pháp lập trình hướng đối tượng",
    "CSC10004": "Cấu trúc dữ liệu và giải thuật",
    "CSC10006": "Cơ sở dữ liệu",
    "CSC10007": "Hệ điều hành",
    "CSC10008": "Mạng máy tính",
    "CSC10009": "Hệ thống máy tính",
    "CSC10012": "Cơ sở lập trình",
    "CSC10014": "Tư duy tính toán",
    "CSC10103": "Khởi nghiệp",
    "CSC10104": "Quy hoạch tuyến tính",
    "CSC10105": "Nhập môn tư duy thuật toán",
    "CSC10106": "Thuật toán tổ hợp và ứng dụng",
    "CSC10107": "Thực tập thực tế",
    "CSC10108": "Trực quan hóa dữ liệu",
    "CSC10204": "Thực tập dự án tốt nghiệp",
    "CSC10251": "Khóa luận tốt nghiệp",
    "CSC10252": "Thực tập tốt nghiệp",
    "CSC11002": "Hệ thống viễn thông",
    "CSC11003": "Mạng máy tính nâng cao",
    "CSC11004": "Lập trình mạng",
    "CSC11007": "An ninh mạng",
    "CSC11106": "Truyền thông không dây",
    "CSC11114": "Ứng dụng dịch vụ điện toán đám mây cho doanh nghiệp",
    "CSC11115": "An ninh mạng nâng cao",
    "CSC11116": "DevOps nâng cao",
    "CSC11117": "Hệ điều hành Linux và ứng dụng",
    "CSC11120": "An toàn và bảo mật dữ liệu",
    "CSC12004": "Phân tích thiết kế hệ thống thông tin",
    "CSC12005": "Phát triển ứng dụng hệ thống thông tin hiện đại",
    "CSC12105": "Thương mại điện tử",
    "CSC12107": "Hệ thống thông tin phục vụ trí tuệ kinh doanh",
    "CSC12108": "Ứng dụng phân tán",
    "CSC13002": "Nhập môn công nghệ phần mềm",
    "CSC13001": "Lập trình Windows",
    "CSC13003": "Kiểm thử phần mềm",
    "CSC13005": "Thiết kế phần mềm",
    "CSC13006": "Quản lý dự án phần mềm",
    "CSC13008": "Phát triển ứng dụng web",
    "CSC13009": "Phát triển phần mềm cho thiết bị di động",
    "CSC13101": "Các chủ đề nâng cao trong Công nghệ phần mềm",
    "CSC13102": "Lập trình ứng dụng Java",
    "CSC13103": "Nhập môn hệ thống phân tán",
    "CSC13106": "Kiến trúc phần mềm",
    "CSC13107": "Mẫu thiết kế hướng đối tượng và ứng dụng",
    "CSC13112": "Thiết kế giao diện",
    "CSC13114": "Phát triển ứng dụng web nâng cao",
    "CSC13118": "Phát triển ứng dụng cho thiết bị di động nâng cao",
    "CSC13121": "Lập trình ứng dụng quản lý 1",
    "CSC13122": "Lập trình ứng dụng quản lý 2",
    "CSC14001": "Automata và ngôn ngữ hình thức",
    "CSC14002": "Các hệ cơ sở tri thức",
    "CSC14003": "Cơ sở trí tuệ nhân tạo",
    "CSC14004": "Khai thác dữ liệu và ứng dụng",
    "CSC14005": "Nhập môn học máy",
    "CSC14006": "Nhận dạng",
    "CSC14007": "Nhập môn phân tích độ phức tạp thuật toán",
    "CSC14008": "Phương pháp nghiên cứu khoa học",
    "CSC14101": "Ẩn dữ liệu và chia sẻ thông tin",
    "CSC14105": "Khoa học về web",
    "CSC14111": "Nhập môn thiết kế và phân tích giải thuật",
    "CSC14112": "Sinh trắc học",
    "CSC14113": "Trình biên dịch",
    "CSC14114": "Ứng dụng dữ liệu lớn",
    "CSC14115": "Khoa học dữ liệu ứng dụng",
    "CSC14116": "Lập trình song song ứng dụng",
    "CSC14117": "Nhập môn lập trình kết nối vạn vật",
    "CSC14118": "Nhập môn dữ liệu lớn",
    "CSC14120": "Lập trình song song",
    "CSC15001": "An ninh máy tính",
    "CSC15002": "Bảo mật cơ sở dữ liệu",
    "CSC15003": "Mã hóa ứng dụng",
    "CSC15004": "Học thống kê",
    "CSC15005": "Nhập môn mã hóa - mật mã",
    "CSC15006": "Nhập môn xử lý ngôn ngữ tự nhiên",
    "CSC15007": "Thống kê máy tính và ứng dụng",
    "CSC15010": "Blockchain và ứng dụng",
    "CSC15011": "Nhập môn ngôn ngữ học thống kê và ứng dụng",
    "CSC15012": "Ứng dụng xử lý ngôn ngữ tự nhiên trong doanh nghiệp",
    "CSC15102": "Phân tích mạng xã hội",
    "CSC15104": "An toàn và phục hồi dữ liệu",
    "CSC15105": "Khai thác dữ liệu văn bản và ứng dụng",
    "CSC15106": "Seminar công nghệ tri thức",
    "CSC15107": "Phân tích dữ liệu bảo toàn tính riêng tư",
    "CSC15108": "Pháp chứng cho dữ liệu số",
    "CSC15109": "Nhập môn tính toán lượng tử",
    "CSC15202": "Ứng dụng xử lý ngôn ngữ tự nhiên",
    "CSC16001": "Đồ họa máy tính",
    "CSC16002": "Phương pháp toán trong phân tích dữ liệu thị giác",
    "CSC16004": "Thị giác máy tính",
    "CSC16005": "Xử lý ảnh số và video số",
    "CSC16101": "Đồ họa ứng dụng",
    "CSC16102": "Kỹ thuật lập trình xử lý ảnh số và video số",
    "CSC16105": "Truy vấn thông tin thị giác",
    "CSC16106": "Nhập môn lập trình điều khiển thiết bị thông minh",
    "CSC16107": "Ứng dụng thị giác máy tính",
    "CSC16109": "Ứng dụng xử lý ảnh số và video số",
    "CSC16110": "Chuyên đề Đồ họa máy tính",
    "CSC16111": "Chuyên đề Thị giác máy tính",
    "CSC16112": "Chuyên đề Xử lý ảnh số và video số",
    "CSC16113": "Thị giác máy tính ba chiều",
    "CSC16114": "Học sâu trong Thị giác máy tính",
    "CSC17001": "Phân tích dữ liệu thông minh",
    "CSC17101": "Hệ thống tư vấn",
    "CSC17103": "Khai thác dữ liệu đồ thị",
    "CSC17104": "Lập trình cho khoa học dữ liệu",
    "CSC17106": "Xử lý phân tích dữ liệu trực tuyến",
    "CSC17107": "Ứng dụng phân tích dữ liệu thông minh",
    "CSC18001": "Nhập môn học sâu",
    "CSC18101": "Trí tuệ nhân tạo cho an ninh thông tin",
    "CSC18102": "Phương pháp toán cho tối ưu hóa",
    "CSC18103": "Trí tuệ bầy đàn",
    "CSC18104": "Nhập môn hệ thống đa tác nhân",
    "CSC18105": "Trí tuệ nhân tạo ứng dụng",
    "CSCI11117": "Hệ điều hành Linux và ứng dụng",
    "ENV00001": "Môi trường đại cương",
    "ENV00003": "Con người và môi trường",
    "GEO00002": "Khoa học Trái đất",
    "MTH00021": "Vi tích phân 1",
    "MTH00022": "Vi tích phân 2",
    "MTH00035": "Đại số tuyến tính",
    "MTH00044": "Xác suất thống kê",
    "MTH00045": "Toán rời rạc",
    "MTH00050": "Toán học tổ hợp",
    "MTH00051": "Toán ứng dụng và thống kê",
    "MTH00052": "Phương pháp tính",
    "MTH00053": "Lý thuyết số",
    "PHY00001": "Vật lý đại cương 1 (Cơ - Nhiệt)",
    "PHY00081": "Thực hành Vật lý đại cương",
}


PROGRAM_COURSE_FALLBACKS = {
    "cntt-2024": {
        "CSC12112": {
            "titleVi": "Môi trường và công cụ cho tiếp thị số",
            "notesVi": None,
            "category": "major-elective",
            "kind": "elective",
            "credits": 4,
            "lectureHours": 45,
            "practiceHours": 30,
            "labHours": 0,
            "suggestedTerm": 7,
            "aliasesNoAccent": [
                "moi truong va cong cu cho tiep thi so",
            ],
        }
    }
}


PHRASE_REPLACEMENTS = [
    ("phuong phap lap trinh huong doi tuong", "phương pháp lập trình hướng đối tượng"),
    ("nhap mon cong nghe phan mem", "nhập môn công nghệ phần mềm"),
    ("co so tri tue nhan tao", "cơ sở trí tuệ nhân tạo"),
    ("phuong phap nghien cuu khoa hoc", "phương pháp nghiên cứu khoa học"),
    ("phan tich thiet ke he thong thong tin", "phân tích thiết kế hệ thống thông tin"),
    ("he thong thong tin phuc vu tri tue kinh doanh", "hệ thống thông tin phục vụ trí tuệ kinh doanh"),
    ("phat trien ung dung he thong thong tin hien dai", "phát triển ứng dụng hệ thống thông tin hiện đại"),
    ("quan tri co so du lieu hien dai", "quản trị cơ sở dữ liệu hiện đại"),
    ("he quan tri co so du lieu", "hệ quản trị cơ sở dữ liệu"),
    ("co so du lieu nang cao", "cơ sở dữ liệu nâng cao"),
    ("co so du lieu", "cơ sở dữ liệu"),
    ("thiet ke giao dien", "thiết kế giao diện"),
    ("thiet ke phan mem", "thiết kế phần mềm"),
    ("phan tich va quan ly yeu cau phan mem", "phân tích và quản lý yêu cầu phần mềm"),
    ("quan ly du an phan mem", "quản lý dự án phần mềm"),
    ("phat trien phan mem cho thiet bi di dong", "phát triển phần mềm cho thiết bị di động"),
    ("mau thiet ke huong doi tuong va ung dung", "mẫu thiết kế hướng đối tượng và ứng dụng"),
    ("tuong tac nguoi - may", "tương tác người - máy"),
    ("thuong mai dien tu", "thương mại điện tử"),
    ("moi truong va cong cu cho tiep thi so", "môi trường và công cụ cho tiếp thị số"),
    ("nhap mon quan tri moi quan he khach hang - san pham", "nhập môn quản trị mối quan hệ khách hàng - sản phẩm"),
    ("nhap mon dien toan dam may", "nhập môn điện toán đám mây"),
    ("trien khai va van hanh dien toan dam may", "triển khai và vận hành điện toán đám mây"),
    ("ung dung dich vu dien toan dam may cho doanh nghiep", "ứng dụng dịch vụ điện toán đám mây cho doanh nghiệp"),
    ("he thong thong tin", "hệ thống thông tin"),
    ("he thong may tinh", "hệ thống máy tính"),
    ("mang may tinh", "mạng máy tính"),
    ("lap trinh mang", "lập trình mạng"),
    ("he thong vien thong", "hệ thống viễn thông"),
    ("mang may tinh nang cao", "mạng máy tính nâng cao"),
    ("an ninh mang", "an ninh mạng"),
    ("bao mat web va thiet bi di dong", "bảo mật web và thiết bị di động"),
    ("lap trinh ung dung java", "lập trình ứng dụng Java"),
    ("lap trinh windows", "lập trình Windows"),
    ("lap trinh web 1", "lập trình Web 1"),
    ("lap trinh web 2", "lập trình Web 2"),
    ("lap trinh ung dung quan ly 1", "lập trình ứng dụng quản lý 1"),
    ("lap trinh ung dung quan ly 2", "lập trình ứng dụng quản lý 2"),
    ("phat trien ung dung web", "phát triển ứng dụng web"),
    ("phat trien ung dung web nang cao", "phát triển ứng dụng web nâng cao"),
    ("phat trien game", "phát triển game"),
    ("phat trien game nang cao", "phát triển game nâng cao"),
    ("nhap mon devops", "nhập môn DevOps"),
    ("ky nang mem", "kỹ năng mềm"),
    ("kien tap nghe nghiep", "kiến tập nghề nghiệp"),
    ("thuc tap thuc te", "thực tập thực tế"),
    ("thuat toan to hop va ung dung", "thuật toán tổ hợp và ứng dụng"),
    ("truc quan hoa du lieu", "trực quan hóa dữ liệu"),
    ("khai thac du lieu va ung dung", "khai thác dữ liệu và ứng dụng"),
    ("khoa hoc du lieu ung dung", "khoa học dữ liệu ứng dụng"),
    ("nhap mon du lieu lon", "nhập môn dữ liệu lớn"),
    ("nhap mon khoa hoc du lieu", "nhập môn khoa học dữ liệu"),
    ("ung dung du lieu lon", "ứng dụng dữ liệu lớn"),
    ("phan tich du lieu thong minh", "phân tích dữ liệu thông minh"),
    ("ung dung phan tich du lieu thong minh", "ứng dụng phân tích dữ liệu thông minh"),
    ("khai thac du lieu do thi", "khai thác dữ liệu đồ thị"),
    ("lap trinh cho khoa hoc du lieu", "lập trình cho khoa học dữ liệu"),
    ("hoc sau cho khoa hoc du lieu", "học sâu cho khoa học dữ liệu"),
    ("nhap mon hoc sau", "nhập môn học sâu"),
    ("nhap mon hoc may", "nhập môn học máy"),
    ("thi giac may tinh", "thị giác máy tính"),
    ("xu ly anh so va video so", "xử lý ảnh số và video số"),
    ("ung dung thi giac may tinh", "ứng dụng thị giác máy tính"),
    ("do hoa may tinh", "đồ họa máy tính"),
    ("do hoa ung dung", "đồ họa ứng dụng"),
    ("phan tich thong ke du lieu nhieu bien", "phân tích thống kê dữ liệu nhiều biến"),
    ("bao mat co so du lieu", "bảo mật cơ sở dữ liệu"),
    ("ma hoa ung dung", "mã hóa ứng dụng"),
    ("nhap mon ma hoa - mat ma", "nhập môn mã hóa - mật mã"),
    ("nhap mon xu ly ngon ngu tu nhien", "nhập môn xử lý ngôn ngữ tự nhiên"),
    ("ung dung xu ly ngon ngu tu nhien trong doanh nghiep", "ứng dụng xử lý ngôn ngữ tự nhiên trong doanh nghiệp"),
    ("blockchain va ung dung", "blockchain và ứng dụng"),
    ("nhap mon ngon ngu hoc thong ke va ung dung", "nhập môn ngôn ngữ học thống kê và ứng dụng"),
    ("thong ke may tinh va ung dung", "thống kê máy tính và ứng dụng"),
    ("xu ly tin hieu so", "xử lý tín hiệu số"),
    ("phan tich mang xa hoi", "phân tích mạng xã hội"),
    ("khai thac du lieu van ban va ung dung", "khai thác dữ liệu văn bản và ứng dụng"),
    ("phan tich du lieu bao toan tinh rieng tu", "phân tích dữ liệu bảo toàn tính riêng tư"),
    ("phap chung cho du lieu so", "pháp chứng cho dữ liệu số"),
    ("nhap mon tinh toan luong tu", "nhập môn tính toán lượng tử"),
    ("phuong phap toan trong phan tich du lieu thi giac", "phương pháp toán trong phân tích dữ liệu thị giác"),
    ("he thong tu van", "hệ thống tư vấn"),
    ("xu ly phan tich du lieu truc tuyen", "xử lý phân tích dữ liệu trực tuyến"),
    ("triet hoc mac - lenin", "triết học Mác - Lênin"),
    ("kinh te chinh tri mac - lenin", "kinh tế chính trị Mác - Lênin"),
    ("chu nghia xa hoi khoa hoc", "chủ nghĩa xã hội khoa học"),
    ("lich su dang cong san viet nam", "lịch sử Đảng Cộng sản Việt Nam"),
    ("tu tuong ho chi minh", "tư tưởng Hồ Chí Minh"),
    ("phap luat dai cuong", "pháp luật đại cương"),
    ("kinh te dai cuong", "kinh tế đại cương"),
    ("tam ly dai cuong", "tâm lý đại cương"),
    ("phuong phap luan sang tao", "phương pháp luận sáng tạo"),
    ("sinh dai cuong 1", "sinh đại cương 1"),
    ("sinh dai cuong 2", "sinh đại cương 2"),
    ("thuc tap sinh dai cuong 1", "thực tập Sinh đại cương 1"),
    ("thuc tap sinh dai cuong 2", "thực tập Sinh đại cương 2"),
    ("hoa dai cuong 1", "hóa đại cương 1"),
    ("hoa dai cuong 2", "hóa đại cương 2"),
    ("thuc hanh hoa dai cuong 1", "thực hành Hóa đại cương 1"),
    ("thuc hanh hoa dai cuong 2", "thực hành Hóa đại cương 2"),
    ("moi truong dai cuong", "môi trường đại cương"),
    ("con nguoi va moi truong", "con người và môi trường"),
    ("khoa hoc trai dat", "khoa học Trái đất"),
    ("vi tich phan 1", "vi tích phân 1"),
    ("vi tich phan 2", "vi tích phân 2"),
    ("dai so tuyen tinh", "đại số tuyến tính"),
    ("xac suat thong ke", "xác suất thống kê"),
    ("toan roi rac", "toán rời rạc"),
    ("toan hoc to hop", "toán học tổ hợp"),
    ("toan ung dung va thong ke", "toán ứng dụng và thống kê"),
    ("phuong phap tinh", "phương pháp tính"),
    ("ly thuyet so", "lý thuyết số"),
    ("vat ly dai cuong 1 (co - nhiet)", "vật lý đại cương 1 (Cơ - Nhiệt)"),
    ("thuc hanh vat ly dai cuong", "thực hành Vật lý đại cương"),
]


OCR_NORMALIZATIONS = [
    ("ng dung", "ung dung"),
    ("irng dung", "ung dung"),
    ("urng dung", "ung dung"),
    ("rng dung", "ung dung"),
    ("umg dung", "ung dung"),
    ("trurc quan hoa", "truc quan hoa"),
    ("tryc quan hoa", "truc quan hoa"),
    ("xir ly", "xu ly"),
    ("xiu ly", "xu ly"),
    ("xur ly", "xu ly"),
    ("xiur ly", "xu ly"),
    ("thurc", "thuc"),
    ("thyrc", "thuc"),
    ("thyc", "thuc"),
    ("phurong", "phuong"),
    ("dur lieu", "du lieu"),
    ("dir lieu", "du lieu"),
    ("dor lieu", "du lieu"),
    ("dtr lieu", "du lieu"),
    ("diur lieu", "du lieu"),
    ("ditr lieu", "du lieu"),
    ("dorlieu", "du lieu"),
    ("do lieu", "du lieu"),
    ("ing dung", "ung dung"),
    ("ngir", "ngu"),
    ("ngtr", "ngu"),
    ("ngr", "ngu"),
    ("ciu", "cuu"),
    ("ciru", "cuu"),
    ("curu", "cuu"),
    ("phurc", "phuc"),
    ("kh6i", "khoi"),
    ("u ng dung", "ung dung"),
    ("ket noi van vat", "ket noi van vat"),
]


SUFFIX_PATTERNS = [
    re.compile(r"\bmth\d{3}\b.*", re.IGNORECASE),
    re.compile(r"\bmnc\b.*", re.IGNORECASE),
    re.compile(r"\bluu y:.*", re.IGNORECASE),
    re.compile(r"\bsv dat chuan nn\b.*", re.IGNORECASE),
    re.compile(r"\bhoc ky\s*\d+\b.*", re.IGNORECASE),
    re.compile(r"\bchuong trinh.*", re.IGNORECASE),
    re.compile(r"\btruong khoa.*", re.IGNORECASE),
    re.compile(r"\btrang\s*\d+.*", re.IGNORECASE),
]


def normalize_ascii(value: str) -> str:
    value = unicodedata.normalize("NFKD", value)
    value = "".join(ch for ch in value if not unicodedata.combining(ch))
    value = value.replace("đ", "d").replace("Đ", "D")
    value = value.replace("★", " ")
    value = re.sub(r"[^0-9A-Za-z()+\-\/ ]+", " ", value)
    value = re.sub(r"\s+", " ", value)
    return value.strip()


def clean_source_title(value: str) -> str:
    cleaned = normalize_ascii(value).lower()
    cleaned = re.sub(r"^\d[\d\.,\s()tc-]{8,}", "", cleaned)

    for wrong, right in OCR_NORMALIZATIONS:
        cleaned = cleaned.replace(wrong, right)

    for pattern in SUFFIX_PATTERNS:
        cleaned = pattern.sub("", cleaned)

    cleaned = re.sub(r"\b[0-9](?:\.[0-9])+.*", "", cleaned)
    cleaned = cleaned.replace(" + ", " va ")
    cleaned = cleaned.replace(" o ", " ")
    cleaned = cleaned.replace("  ", " ")
    cleaned = re.sub(r"\biai\b", "", cleaned)
    cleaned = re.sub(r"\bttong cong\b.*", "", cleaned)
    cleaned = re.sub(r"\s+", " ", cleaned)
    return cleaned.strip(" -/")


def restore_title(cleaned: str) -> str:
    restored = cleaned

    for source, target in sorted(PHRASE_REPLACEMENTS, key=lambda item: len(item[0]), reverse=True):
        restored = restored.replace(source, target)

    restored = restored.replace(" web ", " Web ")
    restored = restored.replace(" java", " Java")
    restored = restored.replace(" windows", " Windows")
    restored = restored.replace(" linux", " Linux")
    restored = restored.replace(" devops", " DevOps")
    restored = restored.replace(" mac - lenin", " Mác - Lênin")
    restored = re.sub(r"\s+", " ", restored).strip()

    if not restored:
        return restored

    return restored[0].upper() + restored[1:]


def score_record(record: dict[str, Any]) -> tuple[int, int]:
    title = record["title"]
    note = record.get("notes")
    cleaned = clean_source_title(title)

    penalties = 0
    if note == FALLBACK_NOTE:
        penalties += 100
    if title == record["code"]:
        penalties += 50
    if "mth" in cleaned or "hoc ky" in cleaned or "chuong trinh" in cleaned:
        penalties += 20
    if re.search(r"\b[0-9](?:\.[0-9])+?\b", cleaned):
        penalties += 20
    if len(cleaned) < 6:
        penalties += 30
    if cleaned in {"mem", "ninh"}:
        penalties += 30

    return penalties, -len(cleaned)


def best_record(records: list[dict[str, Any]]) -> dict[str, Any] | None:
    usable = [record for record in records if record["code"] not in EXCLUDED_CODES]
    if not usable:
        return None
    return min(usable, key=score_record)


def preferred_source_record(
    program_record: dict[str, Any] | None,
    template_record: dict[str, Any] | None,
) -> dict[str, Any] | None:
    candidates = [record for record in (program_record, template_record) if record is not None]
    if not candidates:
        return None
    return min(candidates, key=score_record)


def alias_values(*values: str) -> list[str]:
    seen: set[str] = set()
    aliases: list[str] = []
    for value in values:
        alias = normalize_ascii(value).lower()
        if alias and alias not in seen:
            seen.add(alias)
            aliases.append(alias)
    return aliases


def resolve_category(code: str, fallback: str) -> str:
    if code.startswith(GENERAL_EDUCATION_PREFIXES):
        return "general-education"
    if code in FOUNDATION_CODES:
        return "foundation"
    if code in GRADUATION_CODES:
        return "graduation"
    return fallback


def resolve_kind(code: str, fallback: str) -> str:
    if code in GRADUATION_CODES:
        return "graduation"
    return fallback


def load_seed() -> dict[str, Any]:
    return json.loads(SEED_PATH.read_text(encoding="utf-8"))


def build_catalog(seed: dict[str, Any]) -> tuple[dict[str, Any], list[str]]:
    catalog: dict[str, Any] = {
        "programs": PROGRAM_TEXT,
        "courseGroups": GROUP_TEXT,
        "courses": {},
    }
    errors: list[str] = []

    records_by_code: dict[str, list[dict[str, Any]]] = defaultdict(list)
    records_by_program: dict[str, dict[str, list[dict[str, Any]]]] = defaultdict(lambda: defaultdict(list))

    for program in seed["programs"]:
        for course in program["courses"]:
            if course["code"] in EXCLUDED_CODES:
                continue
            annotated = {"programId": program["id"], **course}
            records_by_code[course["code"]].append(annotated)
            records_by_program[program["id"]][course["code"]].append(annotated)

    template_by_code = {
        code: best_record(records)
        for code, records in records_by_code.items()
    }

    for program in seed["programs"]:
        program_id = program["id"]
        program_courses: dict[str, Any] = {}
        catalog["courses"][program_id] = program_courses

        for code, program_records in sorted(records_by_program[program_id].items()):
            program_record = best_record(program_records)
            template_record = template_by_code.get(code)
            source_record = preferred_source_record(program_record, template_record)

            if source_record is None:
                errors.append(f"{program_id}:{code} missing source record")
                continue

            cleaned_title = clean_source_title(source_record["title"])
            title = COURSE_OVERRIDES.get(code) or restore_title(cleaned_title)

            if not title or title == code:
                errors.append(f"{program_id}:{code} unresolved canonical title from '{source_record['title']}'")
                continue

            category = resolve_category(code, (program_record or source_record)["category"])
            kind = resolve_kind(code, (program_record or source_record)["kind"])

            program_courses[code] = {
                "programId": program_id,
                "courseCode": code,
                "titleVi": title,
                "notesVi": None,
                "category": category,
                "kind": kind,
                "credits": int(source_record["credits"]),
                "lectureHours": int(source_record["lectureHours"]),
                "practiceHours": int(source_record["practiceHours"]),
                "labHours": int(source_record["labHours"]),
                "suggestedTerm": int(source_record["suggestedTerm"]),
                "aliasesNoAccent": alias_values(title, cleaned_title, source_record["title"]),
            }

        for code, fallback in PROGRAM_COURSE_FALLBACKS.get(program_id, {}).items():
            if code in program_courses:
                continue
            program_courses[code] = {
                "programId": program_id,
                "courseCode": code,
                **fallback,
            }

    return catalog, errors


def main() -> None:
    seed = load_seed()
    catalog, errors = build_catalog(seed)
    CATALOG_PATH.parent.mkdir(parents=True, exist_ok=True)
    CATALOG_PATH.write_text(json.dumps(catalog, ensure_ascii=False, indent=2), encoding="utf-8")

    if errors:
        raise SystemExit("Canonical catalog generated with blocking errors:\n" + "\n".join(errors))

    print(f"[catalog] wrote {CATALOG_PATH}")


if __name__ == "__main__":
    main()
