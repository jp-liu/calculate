// 验证 calc.js percent() 错误态修复（最小 DOM 模拟，无依赖）
"use strict";
const path = require("path");

const registry = [];
function reg(attrs) {
  const e = {
    attrs,
    textContent: "",
    handlers: {},
    getAttribute(k) { return attrs[k]; },
    addEventListener(t, f) { (e.handlers[t] ||= []).push(f); },
  };
  registry.push(e);
  return e;
}

global.document = {
  getElementById: (id) => (byId[id] ||= reg({ id })),
  querySelectorAll: (sel) => groups[sel] || [],
};

const byId = {};

// calc.js 在加载时对每个选择器调用 querySelectorAll —— 我们预先按选择器分组注册元素
const groups = { "[data-num]": [], "[data-op]": [], "[data-action]": [] };

const NUMS = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "."];
for (const d of NUMS) groups["[data-num]"].push(reg({ "data-num": d }));
for (const op of ["+", "-", "*", "/"]) groups["[data-op]"].push(reg({ "data-op": op }));
for (const a of ["clear", "equals", "sign", "percent"]) groups["[data-action]"].push(reg({ "data-action": a }));
const exprEl = reg({ id: "expr" });
const resultEl = reg({ id: "result" });
byId.expr = exprEl;
byId.result = resultEl;

require(path.join(__dirname, "calc.js"));

function click(kind, value) {
  const e = registry.find((r) => r.attrs["data-" + kind] === value);
  if (!e) throw new Error("no element for " + kind + "=" + value);
  (e.handlers.click || []).forEach((f) => f());
}
const result = () => resultEl.textContent;
const expr = () => exprEl.textContent;

let pass = 0, fail = 0;
function check(name, got, want) {
  if (got === want) { pass++; console.log("PASS " + name); }
  else { fail++; console.log("FAIL " + name + " => got " + JSON.stringify(got) + ", want " + JSON.stringify(want)); }
}
const press = (s) => { for (const c of s) click("num", c); };

// ---- 验收 1：连输 320 个 9 → % → 错误态锁定 ----
press("9".repeat(320));
check("320个9 已输入", result().length, 320);
click("action", "percent");
check("percent 后显示错误", result(), "错误");
click("op", "+");
check("错误态 + 无效", result(), "错误");
check("错误态 + 不产生 expr", expr(), "");
click("action", "equals");
check("错误态 = 无效", result(), "错误");
click("action", "sign");
check("错误态 ± 无效", result(), "错误");
click("action", "percent");
check("错误态 % 无效", result(), "错误");
click("op", "+");
click("action", "equals");
check("错误态下 +5= 不再把错误当 0", result(), "错误");

// ---- 验收 2：错误态下输入数字作为新数、AC 恢复 ----
click("num", "7");
check("错误态输 7 解除并作为新数", result(), "7");
click("op", "+"); press("1"); click("action", "equals");
check("7+1 = 8", result(), "8");
press("9".repeat(320)); click("action", "percent");
check("再次进入错误态", result(), "错误");
click("action", "clear");
check("AC 恢复正常", result(), "0");

// ---- 验收 3：回归 ----
press("100"); click("action", "percent");
check("100% = 1", result(), "1");
click("action", "clear");
press("50"); click("action", "percent");
check("50% = 0.5", result(), "0.5");
click("op", "*"); press("4"); click("action", "equals");
check("50%×4 = 2", result(), "2");
click("action", "clear");
press("0.1"); click("op", "+"); press("0.2"); click("action", "equals");
check("0.1+0.2 = 0.3", result(), "0.3");
click("action", "clear");
press("5"); click("op", "/"); press("0"); click("action", "equals");
check("除零进错误态", result(), "错误");
click("op", "+");
check("除零错误态 + 无效", result(), "错误");
click("action", "clear");
press("9".repeat(320)); click("op", "*"); press("9".repeat(320)); click("action", "equals");
check("溢出等号进错误态（行为不变）", result(), "错误");
click("action", "clear");
// 负数百分号回归
press("25"); click("action", "sign"); click("action", "percent");
check("-25% = -0.25", result(), "-0.25");

console.log("\n结果: " + pass + " pass, " + fail + " fail");
process.exit(fail ? 1 : 0);
