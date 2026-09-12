import test from "node:test";
import assert from "node:assert/strict";
import { shouGradePoint, summarizeCourses } from "../src/components/gpa.mjs";

const course = (credits, value, mode = "percent", include = true) => ({
  name: "测试课程",
  credits,
  value,
  mode,
  include,
});

test("海大分段制：边界、小数四舍五入与满分", () => {
  for (const [score, point] of [
    [100, 4.0],
    [90, 4.0],
    [89, 3.7],
    [85, 3.7],
    [84, 3.3],
    [82, 3.3],
    [81, 3.0],
    [78, 3.0],
    [77, 2.7],
    [75, 2.7],
    [74, 2.3],
    [72, 2.3],
    [71, 2.0],
    [68, 2.0],
    [67, 1.7],
    [66, 1.7],
    [65, 1.5],
    [64, 1.5],
    [63, 1.0],
    [60, 1.0],
    [59, 0],
    [0, 0],
  ]) {
    assert.equal(shouGradePoint(score), point);
  }
  assert.equal(shouGradePoint(89.4), 3.7);
  assert.equal(shouGradePoint(89.5), 4.0);
  assert.equal(shouGradePoint(59.4), 0);
  assert.equal(shouGradePoint(59.5), 1.0);
  for (const value of [-1, 101, NaN, Infinity]) assert.throws(() => shouGradePoint(value), RangeError);
});

test("按学分加权，不能先平均分数再转换；计算途中不舍入", () => {
  const result = summarizeCourses([course(3, 90), course(1, 60)]);
  assert.equal(result.gpa, 3.25);
  assert.equal(result.credits, 4);
  assert.equal(result.weightedPoints, 13);
});

test("不及格保留分母，通过／等级按海大表计入，手动排除课程不进入分母", () => {
  const result = summarizeCourses([
    course(2, 100),
    course(2, 59),
    course(8, "通过", "pass"),
    course(8, "不通过", "pass"),
    course(8, "优秀", "level"),
    course(8, 100, "percent", false),
  ]);
  assert.equal(result.gpa, 66.4 / 28);
  assert.equal(result.credits, 28);
  assert.equal(result.weightedPoints, 66.4);
  assert.equal(result.excluded, 1);
});

test("通过／不通过与五级制成绩使用海大对应绩点", () => {
  const result = summarizeCourses([
    course(1, "通过", "pass"),
    course(1, "优秀", "level"),
    course(1, "良好", "level"),
    course(1, "不通过", "pass"),
  ]);
  assert.equal(result.gpa, 2.65);
  assert.equal(result.weightedPoints, 10.6);
});

test("已有绩点直接加权，支持小数学分和零绩点", () => {
  const result = summarizeCourses([course("1.5", "3.5", "point"), course(0.5, 0, "point")]);
  assert.equal(result.gpa, 2.625);
});

test("无有效课程时不显示虚假的零 GPA", () => {
  for (const courses of [
    [],
    [course(2, "不通过", "pass", false)],
    [{ name: "", credits: "", value: "", mode: "percent" }],
  ]) {
    const result = summarizeCourses(courses);
    assert.equal(result.gpa, null);
    assert.equal(result.invalid, false);
  }
});

test("不完整、越界、非法等级均阻止总 GPA；有效的零分允许计算", () => {
  for (const invalid of [
    course("", 90),
    course(0, 90),
    course(-1, 90),
    course(Infinity, 90),
    course(1, ""),
    course(1, -1),
    course(1, 101),
    course(1, NaN),
    course(1, 4.1, "point"),
    course(1, "", "pass"),
    course(1, "未知", "level"),
    course(1, "普通", "level"),
  ]) {
    const result = summarizeCourses([course(3, 90), invalid]);
    assert.equal(result.invalid, true);
    assert.equal(result.gpa, null);
  }
  assert.equal(summarizeCourses([course(1, 0)]).gpa, 0);
});
