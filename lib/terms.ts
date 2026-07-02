export interface AcademicTermOption {
  termNumber: number;
  label: string;
  templateLabel: string;
  academicYear: string;
  semester: number;
  academicYearStart: number;
}

export interface ParsedAcademicTerm {
  semester: number;
  academicYearStart: number;
  academicYearLabel: string;
  termLabel: string;
}

export function formatAcademicYearLabel(academicYearStart: number) {
  return `${academicYearStart}-${academicYearStart + 1}`;
}

export function formatTermLabel(semester: number, academicYearStart: number) {
  return `HK${semester} - Năm học ${formatAcademicYearLabel(academicYearStart)}`;
}

export function parseAcademicTermLabel(
  label: string,
  fallbackAcademicYearStart = 2026,
): ParsedAcademicTerm {
  const semesterMatch = label.match(/(?:HK|Học kỳ)\s*([123])/i);
  const yearMatch = label.match(/(20\d{2})\s*-\s*20\d{2}/);
  const semester = semesterMatch ? Number(semesterMatch[1]) : 1;
  const academicYearStart = yearMatch ? Number(yearMatch[1]) : fallbackAcademicYearStart;

  return {
    semester: [1, 2, 3].includes(semester) ? semester : 1,
    academicYearStart,
    academicYearLabel: formatAcademicYearLabel(academicYearStart),
    termLabel: formatTermLabel([1, 2, 3].includes(semester) ? semester : 1, academicYearStart),
  };
}

export function buildAcademicTermOptions(startYear: number, totalYears = 4): AcademicTermOption[] {
  return Array.from({ length: totalYears * 3 }, (_, index) => {
    const termNumber = index + 1;
    const yearOffset = Math.floor(index / 3);
    const academicYearStart = startYear + yearOffset;
    const semester = (index % 3) + 1;
    const academicYear = formatAcademicYearLabel(academicYearStart);
    const curriculumTermNumber = semester === 3 ? null : yearOffset * 2 + semester;

    return {
      termNumber,
      label: formatTermLabel(semester, academicYearStart),
      templateLabel: curriculumTermNumber ? `Học kỳ ${curriculumTermNumber}` : `HK3 ${academicYear}`,
      academicYear,
      semester,
      academicYearStart,
    };
  });
}

export function findTermNumberByLabel(label: string, startYear: number) {
  const normalized = label.trim().toLowerCase();
  const templateMatch = normalized.match(/^học kỳ\s+(\d+)$/i);

  if (templateMatch) {
    return Number(templateMatch[1]);
  }

  const parsed = parseAcademicTermLabel(label, startYear);
  const yearOffset = parsed.academicYearStart - startYear;

  if (yearOffset < 0 || parsed.semester === 3) {
    return null;
  }

  const termNumber = yearOffset * 2 + parsed.semester;
  return termNumber >= 1 && termNumber <= 8 ? termNumber : null;
}

export function defaultCurrentTermLabel(startYear: number) {
  return buildAcademicTermOptions(startYear)[0]?.label ?? formatTermLabel(1, 2026);
}
