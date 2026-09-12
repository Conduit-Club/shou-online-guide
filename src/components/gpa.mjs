export const gradeOptions = {
  pass: ["通过", "不通过"],
  level: ["优秀", "良好", "中等", "及格", "不及格"],
};

const gradePointOptions = {
  pass: { 通过: 3.3, 不通过: 0 },
  level: { 优秀: 4.0, 良好: 3.3, 中等: 2.3, 及格: 1.0, 不及格: 0 },
};

const percentGradePointRanges = [
  { minimum: 90, point: 4.0 },
  { minimum: 85, point: 3.7 },
  { minimum: 82, point: 3.3 },
  { minimum: 78, point: 3.0 },
  { minimum: 75, point: 2.7 },
  { minimum: 72, point: 2.3 },
  { minimum: 68, point: 2.0 },
  { minimum: 66, point: 1.7 },
  { minimum: 64, point: 1.5 },
  { minimum: 60, point: 1.0 },
];

export function shouGradePoint(score) {
  if (!Number.isFinite(score) || score < 0 || score > 100) {
    throw new RangeError("百分制成绩须在 0–100 之间");
  }
  const roundedScore = Math.round(score);
  return percentGradePointRanges.find(({ minimum }) => roundedScore >= minimum)?.point ?? 0;
}

export function evaluateCourse(course) {
  const empty = (value) => value === "" || value === null || value === undefined;
  if (!course.name.trim() && empty(course.credits) && empty(course.value)) {
    return { empty: true };
  }
  const credits = Number(course.credits);
  if (empty(course.credits) || !Number.isFinite(credits) || credits <= 0) {
    return { error: "请填写大于 0 的学分。" };
  }
  if (gradeOptions[course.mode]) {
    if (!gradeOptions[course.mode].includes(course.value)) {
      return { error: "请选择成绩等级。" };
    }
    return { credits, point: gradePointOptions[course.mode][course.value], excluded: !course.include };
  }
  if (!["percent", "point"].includes(course.mode)) {
    return { error: "请选择有效的成绩类型。" };
  }
  const value = Number(course.value);
  const max = course.mode === "percent" ? 100 : 4;
  if (empty(course.value) || !Number.isFinite(value) || value < 0 || value > max) {
    return { error: `请填写 0–${max} 之间的${course.mode === "percent" ? "分数" : "绩点"}。` };
  }
  const point = course.mode === "percent" ? shouGradePoint(value) : value;
  return { credits, point, excluded: !course.include };
}

export function summarizeCourses(courses) {
  const rows = courses.map(evaluateCourse);
  const invalid = rows.some((row) => row.error);
  let credits = 0;
  let weightedPoints = 0;
  let excluded = 0;
  for (const row of rows) {
    if (row.error || row.empty) continue;
    if (row.excluded) {
      excluded += 1;
      continue;
    }
    credits += row.credits;
    weightedPoints += row.credits * row.point;
  }
  return {
    rows,
    invalid,
    credits,
    weightedPoints,
    excluded,
    gpa: !invalid && credits > 0 ? weightedPoints / credits : null,
  };
}
