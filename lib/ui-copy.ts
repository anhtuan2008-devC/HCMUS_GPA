import type { CourseCategory, CourseKind, CurriculumStatus, RecordStatus, ViewKey } from "@/lib/types";

export const navigationLabels: Record<ViewKey, string> = {
  dashboard: "Tổng quan",
  curriculum: "Chương trình học",
  grades: "Kết quả học tập",
  planner: "Kế hoạch học kỳ",
  insights: "Dự báo & phân tích",
};

export const viewDescriptions: Record<ViewKey, string> = {
  dashboard: "Bức tranh tổng quan về hành trình học tập hiện tại.",
  curriculum: "Theo dõi từng nhóm kiến thức và trạng thái các học phần.",
  grades: "Ghi lại điểm số để GPA và tiến độ luôn được cập nhật.",
  planner: "Chọn học phần phù hợp cho học kỳ tiếp theo.",
  insights: "Mô phỏng mục tiêu điểm và nhìn trước khả năng cải thiện GPA.",
};

export const curriculumStatusLabels: Record<CurriculumStatus, string> = {
  "not-started": "Chưa học",
  planned: "Đã lên kế hoạch",
  passed: "Đã đạt",
  failed: "Chưa đạt",
};

export const recordStatusLabels: Record<RecordStatus, string> = {
  planned: "Đã lên kế hoạch",
  passed: "Đã đạt",
  failed: "Chưa đạt",
};

export const courseKindLabels: Record<CourseKind, string> = {
  required: "Bắt buộc",
  elective: "Tự chọn",
  graduation: "Tốt nghiệp",
};

export const courseCategoryLabels: Record<CourseCategory, string> = {
  "general-education": "Giáo dục đại cương",
  foundation: "Cơ sở ngành",
  "major-core": "Chuyên ngành bắt buộc",
  "major-elective": "Tự chọn chuyên ngành",
  graduation: "Tốt nghiệp",
};

export function getAcademicRank(gpa10: number) {
  if (gpa10 >= 9) {
    return "Xuất sắc";
  }

  if (gpa10 >= 8) {
    return "Giỏi";
  }

  if (gpa10 >= 7) {
    return "Khá";
  }

  if (gpa10 >= 5) {
    return "Đạt";
  }

  return "Cần cố gắng";
}
