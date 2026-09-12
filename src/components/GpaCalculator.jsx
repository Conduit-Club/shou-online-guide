import React, { useCallback, useMemo, useRef, useState } from "react";

import { gradeOptions, summarizeCourses } from "./gpa.mjs";

function createCourse(id) {
  return { id, name: "", credits: "", mode: "percent", value: "", include: true };
}

function valueLabel(mode) {
  if (mode === "point") return "绩点（0–4）";
  if (mode === "percent") return "分数（0–100）";
  return "成绩等级";
}

export default function GpaCalculator() {
  const nextId = useRef(1);
  const newCourse = useCallback(() => createCourse(nextId.current++), []);
  const [courses, setCourses] = useState(() => [newCourse()]);
  const summary = useMemo(() => summarizeCourses(courses), [courses]);

  const updateCourse = useCallback((index, field, value) => {
    setCourses((previous) =>
      previous.map((course, courseIndex) => (courseIndex === index ? { ...course, [field]: value } : course)),
    );
  }, []);

  const changeMode = useCallback((index, mode) => {
    setCourses((previous) =>
      previous.map((course, courseIndex) => (courseIndex === index ? { ...course, mode, value: "" } : course)),
    );
  }, []);

  const removeCourse = useCallback(
    (index) => {
      setCourses((previous) => {
        const remaining = previous.filter((_, courseIndex) => courseIndex !== index);
        return remaining.length > 0 ? remaining : [newCourse()];
      });
    },
    [newCourse],
  );

  return (
    <section className="gpa-calculator" aria-label="海大 4.0 GPA 计算器">
      <p className="gpa-intro">填完学分和成绩，GPA 会自动更新。数据只在本页计算，刷新就会清空。</p>
      <form onSubmit={(event) => event.preventDefault()}>
        {courses.map((course, index) => {
          const row = summary.rows[index];
          const options = gradeOptions[course.mode];
          return (
            <fieldset key={course.id} className="gpa-course">
              <legend>课程 {index + 1}</legend>
              <div className="gpa-fields">
                <label className="gpa-name">
                  课程名（可选）
                  <input
                    type="text"
                    value={course.name}
                    placeholder="如：数据结构"
                    maxLength={100}
                    onChange={(event) => updateCourse(index, "name", event.target.value)}
                  />
                </label>
                <label>
                  学分
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={course.credits}
                    placeholder="如：3.5"
                    onChange={(event) => updateCourse(index, "credits", event.target.value)}
                  />
                </label>
                <label>
                  成绩类型
                  <select value={course.mode} onChange={(event) => changeMode(index, event.target.value)}>
                    <option value="percent">百分制成绩</option>
                    <option value="point">已有 4.0 制绩点</option>
                    <option value="pass">通过 / 不通过</option>
                    <option value="level">等级成绩</option>
                  </select>
                </label>
                <label>
                  {valueLabel(course.mode)}
                  {options ? (
                    <select value={course.value} onChange={(event) => updateCourse(index, "value", event.target.value)}>
                      <option value="" disabled>
                        请选择
                      </option>
                      {options.map((grade) => (
                        <option key={grade} value={grade}>
                          {grade}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="number"
                      min="0"
                      max={course.mode === "percent" ? 100 : 4}
                      step="any"
                      value={course.value}
                      placeholder={course.mode === "percent" ? "如：85" : "如：3.5"}
                      onChange={(event) => updateCourse(index, "value", event.target.value)}
                    />
                  )}
                </label>
              </div>
              <div className="gpa-row-actions">
                <label className="gpa-checkbox">
                  <input
                    type="checkbox"
                    checked={course.include}
                    onChange={(event) => updateCourse(index, "include", event.target.checked)}
                  />
                  计入 GPA
                </label>
                {row.point !== undefined ? <span>单科绩点：{row.point.toFixed(4)}</span> : null}
                <button type="button" aria-label={`删除课程 ${index + 1}`} onClick={() => removeCourse(index)}>
                  删除
                </button>
              </div>
              {row.error ? (
                <p className="gpa-error" role="status">
                  {row.error}
                </p>
              ) : null}
            </fieldset>
          );
        })}
        <button type="button" className="gpa-add" onClick={() => setCourses((previous) => [...previous, newCourse()])}>
          ＋ 添加课程
        </button>
      </form>
      <div className="gpa-result" role="status" aria-live="polite" aria-atomic="true">
        <p className="gpa-method">计算口径：海大本科生 4.0 分段制</p>
        <strong>GPA：{summary.gpa === null ? "—" : summary.gpa.toFixed(4)} / 4.0000</strong>
        {summary.invalid ? <p>还有课程没填完整，或数值超出范围，改好后就能看到总 GPA。</p> : null}
        {!summary.invalid && summary.gpa === null ? <p>还没有能计入 GPA 的课程，先填一门试试。</p> : null}
        {!summary.invalid ? (
          <p>
            计入 GPA 的学分：{Number(summary.credits.toFixed(4))}；学分 × 绩点合计：{summary.weightedPoints.toFixed(4)}
            ； 已排除 {summary.excluded} 门。
          </p>
        ) : null}
      </div>
      <p className="gpa-note">
        百分制成绩按学校规定四舍五入取整后换算；通过／不通过和五级制成绩也按海大对应表计入。已有绩点请用同一种 4.0
        制。挂科的百分制课程也算在分母里，所以上面的学分不是“已修过的学分”。如果某门课程或教学环节不应计入你的统计范围，可以取消“计入
        GPA”。
      </p>
    </section>
  );
}
