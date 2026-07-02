import {
  Course,
  CourseGroup,
  GpaBreakdown,
  GpaBreakdownRow,
  GpaSummary,
  GraduationProgress,
  ProgramCurriculum,
  StudentCourseRecord,
  SuggestedPlan,
  TermPlan,
  TimelinePoint,
} from "@/lib/types";

export function calculateGradePoint10To4(score10: number): number {
  if (score10 >= 9) {
    return 4;
  }

  if (score10 < 3) {
    return 0;
  }

  return Number((1 + (score10 - 3) * 0.5).toFixed(2));
}

export function deriveRecordStatus(score10: number): "passed" | "failed" {
  return score10 >= 5 ? "passed" : "failed";
}

export function clampScore(score: number) {
  return Math.min(10, Math.max(0, Number(score.toFixed(3))));
}

export function calculateGpa(
  records: StudentCourseRecord[],
  courses: Course[],
): GpaSummary {
  const courseMap = new Map(courses.map((course) => [course.id, course]));

  let totalWeighted10 = 0;
  let totalWeighted4 = 0;
  let attemptedCredits = 0;
  let earnedCredits = 0;
  let passedCourseCount = 0;
  let failedCourseCount = 0;

  for (const record of records) {
    const course = courseMap.get(record.courseId);

    if (!course) {
      continue;
    }

    if (record.status === "passed") {
      if (course.countsTowardProgress) {
        earnedCredits += course.credits;
      }
      passedCourseCount += 1;
    } else if (record.status === "failed") {
      failedCourseCount += 1;
    }

    if (
      !course.countsTowardGpa ||
      record.score10 === null ||
      record.score4 === null ||
      record.score10 < 5
    ) {
      continue;
    }

    attemptedCredits += course.credits;
    totalWeighted10 += record.score10 * course.credits;
    totalWeighted4 += record.score4 * course.credits;
  }

  return {
    gpa10: attemptedCredits ? Number((totalWeighted10 / attemptedCredits).toFixed(3)) : 0,
    gpa4: attemptedCredits ? Number((totalWeighted4 / attemptedCredits).toFixed(2)) : 0,
    attemptedCredits,
    earnedCredits,
    passedCourseCount,
    failedCourseCount,
  };
}

function getGpaExclusionReason(
  record: StudentCourseRecord,
  course: Course,
) {
  if (!course.countsTowardGpa) {
    return "Học phần không tính GPA";
  }

  if (record.gradeInputMode === "pass_fail" || record.score10 === null || record.score4 === null) {
    return "Học phần ghi nhận Đạt/Không đạt";
  }

  if (record.status !== "passed" || record.score10 < 5) {
    return "Chưa đạt nên không tính GPA";
  }

  return null;
}

type GpaBreakdownOptions = {
  termLabel?: string | null;
  includedCourseIdsOverride?: Set<string>;
  mode?: "official" | "simulation";
};

type GpaAccumulator = {
  gpa10: number;
  gpa4: number;
  gpaCredits: number;
  gpaCourseCount: number;
  weightedScore10Total: number;
  weightedScore4Total: number;
  studyAverage10: number;
  studiedCredits: number;
  studiedCourseCount: number;
  earnedCredits: number;
};

function compareRecordsByTerm(left: StudentCourseRecord, right: StudentCourseRecord) {
  if (left.academicYearStart !== right.academicYearStart) {
    return left.academicYearStart - right.academicYearStart;
  }

  if (left.semester !== right.semester) {
    return left.semester - right.semester;
  }

  return left.termLabel.localeCompare(right.termLabel);
}

function compareRowsByTerm(left: GpaBreakdownRow, right: GpaBreakdownRow) {
  if (left.academicYearStart !== right.academicYearStart) {
    return left.academicYearStart - right.academicYearStart;
  }

  if (left.semester !== right.semester) {
    return left.semester - right.semester;
  }

  if (left.termLabel !== right.termLabel) {
    return left.termLabel.localeCompare(right.termLabel);
  }

  return left.courseCode.localeCompare(right.courseCode);
}

function summarizeGpaRows(
  rows: GpaBreakdownRow[],
  includePredicate: (row: GpaBreakdownRow) => boolean,
): GpaAccumulator {
  let weightedScore10Total = 0;
  let weightedScore4Total = 0;
  let gpaCredits = 0;
  let gpaCourseCount = 0;
  let studiedWeighted10Total = 0;
  let studiedCredits = 0;
  let studiedCourseCount = 0;
  let earnedCredits = 0;

  for (const row of rows) {
    if (row.status === "passed" && row.countsTowardProgress) {
      earnedCredits += row.credits;
    }

    if (row.score10 !== null) {
      studiedCourseCount += 1;
      studiedCredits += row.credits;
      studiedWeighted10Total += row.score10 * row.credits;
    }

    if (includePredicate(row) && row.score10 !== null && row.score4 !== null) {
      gpaCourseCount += 1;
      gpaCredits += row.credits;
      weightedScore10Total += row.score10 * row.credits;
      weightedScore4Total += row.score4 * row.credits;
    }
  }

  return {
    gpa10: gpaCredits ? Number((weightedScore10Total / gpaCredits).toFixed(3)) : 0,
    gpa4: gpaCredits ? Number((weightedScore4Total / gpaCredits).toFixed(2)) : 0,
    gpaCredits,
    gpaCourseCount,
    weightedScore10Total: Number(weightedScore10Total.toFixed(3)),
    weightedScore4Total: Number(weightedScore4Total.toFixed(2)),
    studyAverage10: studiedCredits ? Number((studiedWeighted10Total / studiedCredits).toFixed(3)) : 0,
    studiedCredits,
    studiedCourseCount,
    earnedCredits,
  };
}

export function calculateGpaBreakdown(
  records: StudentCourseRecord[],
  courses: Course[],
  options: GpaBreakdownOptions = {},
): GpaBreakdown {
  const courseMap = new Map(courses.map((course) => [course.id, course]));
  const rows: GpaBreakdownRow[] = [];
  const sortedRecords = [...records].sort(compareRecordsByTerm);

  for (const record of sortedRecords) {
    const course = courseMap.get(record.courseId);

    if (!course) {
      continue;
    }

    const exclusionReason = getGpaExclusionReason(record, course);
    const officiallyIncludedInGpa = exclusionReason === null;
    const score10 = record.score10;
    const score4 = record.score4;
    const canSimulateInGpa = score10 !== null && score4 !== null;
    const simulatedIncluded =
      options.mode === "simulation" && options.includedCourseIdsOverride
        ? options.includedCourseIdsOverride.has(course.id) && canSimulateInGpa
        : officiallyIncludedInGpa;

    rows.push({
      courseId: course.id,
      courseCode: course.code,
      courseTitle: course.title,
      termLabel: record.termLabel,
      semester: record.semester,
      academicYearStart: record.academicYearStart,
      credits: course.credits,
      score10,
      score4,
      status: record.status,
      gradeInputMode: record.gradeInputMode,
      notes: record.notes,
      countsTowardGpa: course.countsTowardGpa,
      countsTowardProgress: course.countsTowardProgress,
      officiallyIncludedInGpa,
      includedInGpa: simulatedIncluded,
      canSimulateInGpa,
      isSimulationOverride: simulatedIncluded !== officiallyIncludedInGpa,
      exclusionReason,
      weightedScore10: simulatedIncluded && score10 !== null ? score10 * course.credits : null,
      weightedScore4: simulatedIncluded && score4 !== null ? score4 * course.credits : null,
    });
  }

  rows.sort(compareRowsByTerm);

  const availableTerms = Array.from(
    rows
      .reduce((terms, row) => {
        if (!terms.has(row.termLabel)) {
          terms.set(row.termLabel, {
            termLabel: row.termLabel,
            semester: row.semester,
            academicYearStart: row.academicYearStart,
          });
        }

        return terms;
      }, new Map<string, { termLabel: string; semester: number; academicYearStart: number }>())
      .values(),
  ).sort((left, right) => {
    if (left.academicYearStart !== right.academicYearStart) {
      return left.academicYearStart - right.academicYearStart;
    }

    if (left.semester !== right.semester) {
      return left.semester - right.semester;
    }

    return left.termLabel.localeCompare(right.termLabel);
  });

  const selectedTerm = options.termLabel ?? null;
  const scopeRows = selectedTerm ? rows.filter((row) => row.termLabel === selectedTerm) : rows;
  const selectedTermMeta = selectedTerm
    ? availableTerms.find((term) => term.termLabel === selectedTerm)
    : null;
  const cumulativeRows = selectedTermMeta
    ? rows.filter((row) => {
        if (row.academicYearStart !== selectedTermMeta.academicYearStart) {
          return row.academicYearStart < selectedTermMeta.academicYearStart;
        }

        return row.semester <= selectedTermMeta.semester;
      })
    : rows;
  const officialScope = summarizeGpaRows(scopeRows, (row) => row.officiallyIncludedInGpa);
  const simulatedScope = summarizeGpaRows(scopeRows, (row) => row.includedInGpa);
  const cumulativeOfficial = summarizeGpaRows(cumulativeRows, (row) => row.officiallyIncludedInGpa);
  const cumulativeSimulated = summarizeGpaRows(cumulativeRows, (row) => row.includedInGpa);
  const cumulativeScope = options.mode === "simulation" ? cumulativeSimulated : cumulativeOfficial;
  const finalScope = options.mode === "simulation" ? simulatedScope : officialScope;

  return {
    gpa10: finalScope.gpa10,
    gpa4: finalScope.gpa4,
    officialGpa10: officialScope.gpa10,
    officialGpa4: officialScope.gpa4,
    simulatedGpa10: simulatedScope.gpa10,
    simulatedGpa4: simulatedScope.gpa4,
    termGpa10: officialScope.gpa10,
    termGpa4: officialScope.gpa4,
    cumulativeThroughTermGpa10: cumulativeScope.gpa10,
    cumulativeThroughTermGpa4: cumulativeScope.gpa4,
    studyAverage10: finalScope.studyAverage10,
    earnedCredits: finalScope.earnedCredits,
    gpaCredits: officialScope.gpaCredits,
    simulatedGpaCredits: simulatedScope.gpaCredits,
    studiedCredits: finalScope.studiedCredits,
    weightedScore10Total: officialScope.weightedScore10Total,
    weightedScore4Total: officialScope.weightedScore4Total,
    simulatedWeightedScore10Total: simulatedScope.weightedScore10Total,
    simulatedWeightedScore4Total: simulatedScope.weightedScore4Total,
    studiedCourseCount: scopeRows.length,
    gpaCourseCount: officialScope.gpaCourseCount,
    simulatedGpaCourseCount: simulatedScope.gpaCourseCount,
    availableTerms,
    rows: scopeRows,
  };
}

function buildPassedCourseSet(records: StudentCourseRecord[]) {
  return new Set(
    records.filter((record) => record.status === "passed").map((record) => record.courseId),
  );
}

function calculateEarnedProgressCredits(courses: Course[], passedSet: Set<string>) {
  return courses
    .filter((course) => course.countsTowardProgress && passedSet.has(course.id))
    .reduce((sum, course) => sum + course.credits, 0);
}

function calculateConditionProgress(courses: Course[], passedSet: Set<string>) {
  const conditionCourses = courses.filter(
    (course) => !course.countsTowardGpa && !course.countsTowardProgress,
  );
  const completedCourses = conditionCourses.filter((course) => passedSet.has(course.id));

  return {
    totalCourses: conditionCourses.length,
    completedCourses: completedCourses.length,
    pendingCourses: Math.max(conditionCourses.length - completedCourses.length, 0),
    totalCredits: conditionCourses.reduce((sum, course) => sum + course.credits, 0),
    completedCredits: completedCourses.reduce((sum, course) => sum + course.credits, 0),
  };
}

export function calculateGraduationProgress(
  program: ProgramCurriculum,
  records: StudentCourseRecord[],
): GraduationProgress {
  const passedSet = buildPassedCourseSet(records);
  const earnedCredits = calculateEarnedProgressCredits(program.courses, passedSet);
  const conditionProgress = calculateConditionProgress(program.courses, passedSet);
  const groupProgress = program.courseGroups.map((group) =>
    calculateGroupProgress(group, program.courses, passedSet),
  );
  const missingRequiredCourses = program.courses.filter(
    (course) => course.kind === "required" && course.countsTowardProgress && !passedSet.has(course.id),
  ).length;

  return {
    totalCredits: program.totalCredits,
    earnedCredits,
    remainingCredits: Math.max(program.totalCredits - earnedCredits, 0),
    completionRate: program.totalCredits
      ? Number(((earnedCredits / program.totalCredits) * 100).toFixed(1))
      : 0,
    missingRequiredCourses,
    conditionProgress,
    groupProgress,
  };
}

function calculateGroupProgress(
  group: CourseGroup,
  courses: Course[],
  passedSet: Set<string>,
) {
  const earnedCredits = courses
    .filter(
      (course) =>
        course.groupId === group.id &&
        course.countsTowardProgress &&
        passedSet.has(course.id),
    )
    .reduce((sum, course) => sum + course.credits, 0);

  return {
    groupId: group.id,
    title: group.title,
    requiredCredits: group.requiredCredits,
    earnedCredits,
    completionRate: Number(
      ((Math.min(earnedCredits, group.requiredCredits) / group.requiredCredits) * 100).toFixed(1),
    ),
  };
}

export function buildSuggestedPlan(
  program: ProgramCurriculum,
  records: StudentCourseRecord[],
  plans: TermPlan[],
  targetTerm: string,
): SuggestedPlan {
  const passedSet = buildPassedCourseSet(records);
  const plannedSet = new Set(plans.flatMap((plan) => plan.courseIds));
  const available: Course[] = [];
  const blockedCourses: Course[] = [];

  for (const course of program.courses) {
    if (passedSet.has(course.id) || plannedSet.has(course.id)) {
      continue;
    }

    const unlocked = course.prerequisites.every((prerequisite) => passedSet.has(prerequisite));

    if (unlocked) {
      available.push(course);
    } else {
      blockedCourses.push(course);
    }
  }

  const courses = available
    .sort((left, right) => {
      if (left.suggestedTerm === right.suggestedTerm) {
        if (left.kind === right.kind) {
          return left.code.localeCompare(right.code);
        }

        return left.kind === "required" ? -1 : 1;
      }

      return left.suggestedTerm - right.suggestedTerm;
    })
    .reduce<Course[]>((selected, course) => {
      const currentCredits = selected.reduce((sum, item) => sum + item.credits, 0);

      if (currentCredits + course.credits > 18 || selected.length >= 6) {
        return selected;
      }

      selected.push(course);
      return selected;
    }, []);

  return {
    targetTerm,
    recommendedCredits: courses.reduce((sum, course) => sum + course.credits, 0),
    courses,
    blockedCourses: blockedCourses.slice(0, 8),
  };
}

function sortRecordsByTerm(records: StudentCourseRecord[]) {
  return [...records].sort((left, right) => {
    if (left.academicYearStart !== right.academicYearStart) {
      return left.academicYearStart - right.academicYearStart;
    }

    if (left.semester !== right.semester) {
      return left.semester - right.semester;
    }

    return left.termLabel.localeCompare(right.termLabel);
  });
}

function groupRecordsByTerm(records: StudentCourseRecord[]) {
  const grouped = new Map<string, StudentCourseRecord[]>();

  for (const record of sortRecordsByTerm(records)) {
    if (!grouped.has(record.termLabel)) {
      grouped.set(record.termLabel, []);
    }

    grouped.get(record.termLabel)?.push(record);
  }

  return grouped;
}

export function buildCumulativeTimeline(
  records: StudentCourseRecord[],
  courses: Course[],
): TimelinePoint[] {
  const grouped = groupRecordsByTerm(records);
  const cumulative: StudentCourseRecord[] = [];
  const points: TimelinePoint[] = [];

  for (const [termLabel, termRecords] of grouped) {
    cumulative.push(...termRecords);
    const summary = calculateGpa(cumulative, courses);

    points.push({
      termLabel,
      gpa10: summary.gpa10,
      gpa4: summary.gpa4,
      earnedCredits: summary.earnedCredits,
    });
  }

  if (!points.length) {
    return [
      {
        termLabel: "Bắt đầu",
        gpa10: 0,
        gpa4: 0,
        earnedCredits: 0,
      },
    ];
  }

  return points;
}

export function buildTermTimeline(
  records: StudentCourseRecord[],
  courses: Course[],
): TimelinePoint[] {
  const grouped = groupRecordsByTerm(records);
  const points: TimelinePoint[] = [];

  for (const [termLabel, termRecords] of grouped) {
    const summary = calculateGpa(termRecords, courses);

    points.push({
      termLabel,
      gpa10: summary.gpa10,
      gpa4: summary.gpa4,
      earnedCredits: summary.earnedCredits,
    });
  }

  if (!points.length) {
    return [
      {
        termLabel: "Bắt đầu",
        gpa10: 0,
        gpa4: 0,
        earnedCredits: 0,
      },
    ];
  }

  return points;
}

export function buildTimeline(
  records: StudentCourseRecord[],
  courses: Course[],
): TimelinePoint[] {
  return buildCumulativeTimeline(records, courses);
}

export function computeProjectedGpa(
  program: ProgramCurriculum,
  records: StudentCourseRecord[],
  targetAverage10: number,
) {
  const current = calculateGpa(records, program.courses);
  const passedSet = buildPassedCourseSet(records);
  const remainingCredits = program.courses
    .filter((course) => course.countsTowardGpa && !passedSet.has(course.id))
    .reduce((sum, course) => sum + course.credits, 0);
  const projectedWeighted10 =
    current.gpa10 * current.attemptedCredits + targetAverage10 * remainingCredits;
  const projectedWeighted4 =
    current.gpa4 * current.attemptedCredits +
    calculateGradePoint10To4(targetAverage10) * remainingCredits;
  const projectedAttempted = current.attemptedCredits + remainingCredits;

  if (!projectedAttempted) {
    return {
      projectedGpa10: 0,
      projectedGpa4: 0,
    };
  }

  return {
    projectedGpa10: Number((projectedWeighted10 / projectedAttempted).toFixed(3)),
    projectedGpa4: Number((projectedWeighted4 / projectedAttempted).toFixed(2)),
  };
}
