// 验证 calc.js 科学计算器功能（最小 DOM 模拟，无依赖，沿用 test-percent-error-state.js 模式）
"use strict";
const path = require("path");

const registry = [];
function reg(attrs) {
  const e = {
    attrs,
    textContent: "",
    classes: new Set(),
    handlers: {},
    getAttribute(k) { return attrs[k]; },
    addEventListener(t, f) { (e.handlers[t] ||= []).push(f); },
    classList: {
      toggle(name, force) {
        if (force === undefined) { e.classes.has(name) ? e.classes.delete(name) : e.classes.add(name); }
        else { force ? e.classes.add(name) : e.classes.delete(name); }
      },
      contains(name) { return e.classes.has(name); },
    },
  };
  registry.push(e);
  return e;
}

global.document = {
  getElementById: (id) => (byId[id] ||= reg({ id })),
  querySelectorAll: (sel) => groups[sel] || [],
};

const byId = {};

// calc.js 加载时对每个选择器调用 querySelectorAll —— 预先按选择器分组注册全部元素
const groups = { "[data-num]": [], "[data-op]": [], "[data-action]": [], "[data-fn]": [], "[data-mode-btn]": [] };

const NUMS = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "."];
for (const d of NUMS) groups["[data-num]"].push(reg({ "data-num": d }));
for (const op of ["+", "-", "*", "/", "^"]) groups["[data-op]"].push(reg({ "data-op": op }));
for (const a of ["clear", "equals", "sign", "percent"]) groups["[data-action]"].push(reg({ "data-action": a }));
for (const f of ["sin", "cos", "tan", "sqrt", "log", "ln", "fact", "pi", "angle"]) groups["[data-fn]"].push(reg({ "data-fn": f }));
groups["[data-mode-btn]"].push(reg({ "data-mode-btn": "normal" }));
groups["[data-mode-btn]"].push(reg({ "data-mode-btn": "scientific" }));
const exprEl = reg({ id: "expr" });
const resultEl = reg({ id: "result" });
const calcEl = reg({ id: "calc" });
const angleBtn = reg({ "data-fn": "angle" });
byId.expr = exprEl;
byId.result = resultEl;
byId.calc = calcEl;
byId.angleBtn = angleBtn;
// angleBtn 同时是 data-fn 按钮（DEG/RAD 键）
groups["[data-fn]"].push(angleBtn);

require(path.join(__dirname, "calc.js"));

function click(kind, value) {
  const e = registry.find((r) => r.attrs["data-" + kind] === value);
  if (!e) throw new Error("no element for " + kind + "=" + value);
  (e.handlers.click || []).forEach((f) => f());
}
const result = () => resultEl.textContent;
const expr = () => exprEl.textContent;
const press = (s) => { for (const c of s) click("num", c); };
const inSci = () => calcEl.classes.has("scientific");

let pass = 0, fail = 0;
function check(name, got, want) {
  if (got === want) { pass++; console.log("PASS " + name); }
  else { fail++; console.log("FAIL " + name + " => got " + JSON.stringify(got) + ", want " + JSON.stringify(want)); }
}
function checkNum(name, got, want, eps) {
  const g = parseFloat(got);
  if (Math.abs(g - want) <= (eps || 1e-9)) { pass++; console.log("PASS " + name); }
  else { fail++; console.log("FAIL " + name + " => got " + JSON.stringify(got) + ", want ≈" + want); }
}

// ---- 1. DEG 默认：三角函数 ----
press("30"); click("fn", "sin");
checkNum("sin30° DEG = 0.5", result(), 0.5);
click("action", "clear");
press("60"); click("fn", "cos");
checkNum("cos60° DEG = 0.5", result(), 0.5);
click("action", "clear");
press("45"); click("fn", "tan");
checkNum("tan45° DEG = 1", result(), 1);
click("action", "clear");

// ---- 2. RAD 切换 ----
click("fn", "angle");
check("angleBtn 显示 RAD", angleBtn.textContent, "RAD");
press("3.141592653589793"); click("fn", "sin");
checkNum("sin(π rad) ≈ 0", result(), 0, 1e-11);
click("fn", "angle");
check("切回 DEG", angleBtn.textContent, "DEG");
click("action", "clear");

// ---- 3. 对数 ----
press("100"); click("fn", "log");
checkNum("log100 = 2", result(), 2);
click("action", "clear");
press("1"); click("fn", "ln");
checkNum("ln1 = 0", result(), 0);
click("action", "clear");

// ---- 4. 幂运算 x^y（二元流） ----
press("2"); click("op", "^");
check("expr 显示 ^ 符号（运算中）", expr(), "2 ^");
press("10"); click("action", "equals");
check("2^10 = 1024", result(), "1024");
click("action", "clear");
press("2"); click("op", "^"); press("0.5"); click("action", "equals");
checkNum("2^0.5 = √2 ≈ 1.41421356237", result(), Math.SQRT2, 1e-10);
click("action", "clear");
press("8"); click("action", "sign"); click("op", "^"); press("2"); click("action", "equals");
check("(-8)^2 = 64", result(), "64");
click("action", "clear");

// ---- 5. 平方根 ----
press("9"); click("fn", "sqrt");
check("√9 = 3", result(), "3");
click("fn", "sqrt");
checkNum("√3 再开方（连续一元）", result(), Math.sqrt(3), 1e-10);
click("action", "clear");
press("2"); click("action", "sign"); click("fn", "sqrt");
check("√(-2) 进错误态", result(), "错误");
click("num", "4");
check("错误态输数字解除", result(), "4");
click("action", "clear");

// ---- 6. π 常量 ----
click("fn", "pi");
checkNum("π = 3.14159265359（12 位有效）", result(), Math.PI, 1e-11);
press("2");
check("π 后输数字覆盖（overwrite）", result(), "2");
click("action", "clear");
click("fn", "pi"); click("op", "*"); press("2"); click("action", "equals");
checkNum("π×2 = 6.28318530718", result(), Math.PI * 2, 1e-11);
click("action", "clear");

// ---- 7. 阶乘 ----
press("5"); click("fn", "fact");
check("5! = 120", result(), "120");
click("action", "clear");
press("0"); click("fn", "fact");
check("0! = 1", result(), "1");
click("action", "clear");
press("2.5"); click("fn", "fact");
check("2.5! 进错误态", result(), "错误");
click("action", "clear");
press("200"); click("fn", "fact");
check("200! 溢出进错误态", result(), "错误");
click("num", "7");
check("错误态解除", result(), "7");
click("action", "clear");

// ---- 8. 错误态下科学键全无效 ----
press("5"); click("op", "/"); press("0"); click("action", "equals");
check("除零错误态", result(), "错误");
click("fn", "sin");
check("错误态 sin 无效", result(), "错误");
click("fn", "pi");
check("错误态 π 无效", result(), "错误");
click("fn", "fact");
check("错误态 ! 无效", result(), "错误");
click("fn", "angle");
check("错误态 DEG/RAD 切换无效", angleBtn.textContent, "DEG");
click("op", "^");
check("错误态 x^y 无效", result(), "错误");
click("action", "clear");
check("AC 恢复", result(), "0");

// ---- 9. 模式切换：状态完整保留 ----
click("mode-btn", "scientific");
check("切到科学模式", inSci(), true);
press("2"); click("op", "+"); press("3");
click("mode-btn", "normal");
check("切回普通模式", inSci(), false);
check("运算中状态保留（current=3）", result(), "3");
click("action", "equals");
check("切回普通模式后等号继续运算 2+3=5", result(), "5");
click("mode-btn", "scientific");
check("再切科学，结果 5 保留", result(), "5");
click("fn", "sqrt");
check("科学函数作用于保留状态 √5 ≈ 2.2360679…", true, Math.abs(parseFloat(result()) - Math.sqrt(5)) < 1e-10);
click("mode-btn", "normal");

// ---- 10. 错误态跨模式保留 ----
press("9".repeat(320)); click("action", "percent");
check("320 个 9 → % 错误态（TD-8 回归）", result(), "错误");
click("mode-btn", "scientific");
click("fn", "sin");
check("切换后错误态仍锁定科学键", result(), "错误");
click("mode-btn", "normal");
click("action", "clear");
check("AC 解除", result(), "0");

// ---- 11. 普通模式回归（抽核心路径，全量回归由 test-percent-error-state.js 守护）----
press("12"); click("op", "*"); press("3"); click("action", "equals");
check("12×3=36", result(), "36");
press("50"); click("action", "percent");
check("50% = 0.5", result(), "0.5");
click("action", "clear");

console.log("\n结果: " + pass + " pass, " + fail + " fail");
process.exit(fail ? 1 : 0);
