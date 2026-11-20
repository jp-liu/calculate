// 验证 calc.js 运算符优先级修复（TD-10）：标准先 ^ 后 ×÷ 再 +−，expr 完整表达式，连续等号
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

// ---- 验收标准 1-3（任务正文） ----
press("12"); click("op", "+"); press("3"); click("op", "*"); press("4"); click("action", "equals");
check("验收1: 12+3×4=24", result(), "24");
check("验收1: expr 完整表达式", expr(), "");
click("action", "clear");
press("2"); click("op", "+"); press("3"); click("op", "*"); press("4"); click("op", "-"); press("6"); click("op", "/"); press("2"); click("action", "equals");
check("验收2: 2+3×4-6÷2=11", result(), "11");
click("action", "clear");
press("1"); click("op", "+"); press("2"); click("op", "*"); press("3"); click("action", "equals");
check("验收3: 1+2×3=7", result(), "7");
click("action", "clear");

// ---- Q1=B：^ 高于乘除 ----
press("2"); click("op", "*"); press("3"); click("op", "^"); press("2"); click("action", "equals");
check("2×3^2=18（^ 优先）", result(), "18");
click("action", "clear");
press("2"); click("op", "^"); press("3"); click("op", "*"); press("2"); click("action", "equals");
check("2^3×2=16（^ 优先）", result(), "16");
click("action", "clear");
press("2"); click("op", "^"); press("3"); click("op", "^"); press("2"); click("action", "equals");
check("2^3^2=64（同级左结合）", result(), "64");
click("action", "clear");

// ---- 乘除同级左结合 ----
press("8"); click("op", "/"); press("4"); click("op", "*"); press("3"); click("action", "equals");
check("8÷4×3=6（同级左结合）", result(), "6");
click("action", "clear");
press("10"); click("op", "-"); press("4"); click("op", "-"); press("3"); click("action", "equals");
check("10-4-3=3（减法左结合）", result(), "3");
click("action", "clear");

// ---- expr 完整表达式（Q2=A） ----
press("12"); click("op", "+"); press("3"); click("op", "*");
check("expr 运算中显示 12 + 3 ×（尾操作数未完）", expr(), "12 + 3 ×");
press("4");
check("expr 显示 12 + 3 × 4（含尾操作数后）", expr(), "12 + 3 ×");
click("action", "equals");
check("等号后 expr 清空", expr(), "");
click("action", "clear");

// ---- 连续运算符替换（尾 op 替换） ----
press("2"); click("op", "+"); click("op", "*"); press("3"); click("action", "equals");
check("2+*3 → 2×3=6（尾 op 替换）", result(), "6");
check("expr 显示 2 × 3", expr(), "");
click("action", "clear");

// ---- 连续等号：重复最后一步（Q3） ----
press("12"); click("op", "+"); press("3"); click("action", "equals");
check("12+3=15", result(), "15");
click("action", "equals");
check("再 = 重复 +3 → 18", result(), "18");
click("action", "equals");
check("再 = → 21", result(), "21");
click("action", "clear");
press("2"); click("op", "*"); press("3"); click("action", "equals");
check("2×3=6", result(), "6");
click("action", "equals");
check("× 重复：6×3=18", result(), "18");
click("action", "clear");
press("5");
click("action", "equals");
check("无表达式且无 lastOp 时 = 无操作", result(), "5");
click("action", "clear");

// ---- 错误态守卫在新模型下不变 ----
press("1"); click("op", "+"); press("2"); click("op", "/"); press("0"); click("action", "equals");
check("1+2÷0= 表达式中间除零 → 错误态", result(), "错误");
click("op", "+");
check("错误态 + 无效", result(), "错误");
click("action", "equals");
check("错误态 = 无效", result(), "错误");
click("num", "7");
check("错误态输数字解除", result(), "7");
click("action", "clear");
press("9".repeat(320)); click("op", "*"); press("9".repeat(320)); click("action", "equals");
check("大数相乘溢出 → 错误态", result(), "错误");
click("action", "clear");
press("9".repeat(320)); click("op", "+"); press("9".repeat(320)); click("action", "equals");
check("大数相加溢出 → 错误态", result(), "错误");
click("action", "clear");

// ---- 浮点格式化回归 ----
press("0.1"); click("op", "+"); press("0.2"); click("action", "equals");
check("0.1+0.2=0.3", result(), "0.3");
click("action", "equals");
check("0.3 再 = 重复 +0.2 → 0.5", result(), "0.5");
click("action", "clear");

// ---- 结果接续运算（= 后按运算符） ----
press("2"); click("op", "+"); press("3"); click("action", "equals");
checkNum("2+3=5", result(), 5);
click("op", "*"); press("4"); click("action", "equals");
check("5×4=20（结果接续）", result(), "20");
click("action", "clear");

// ---- 一元函数在表达式中间（即时求值 → 数值 token） ----
press("2"); click("op", "*"); press("9"); click("fn", "sqrt"); click("op", "+"); press("1"); click("action", "equals");
check("2×√9+1=7", result(), "7");
click("action", "clear");

// ---- 正负号在表达式中间 ----
press("5"); click("op", "*"); press("3"); click("action", "sign");
check("5×-3 中间翻转显示 -3", result(), "-3");
click("action", "equals");
check("5×(-3)=-15", result(), "-15");
click("action", "clear");

// ---- 模式切换保留表达式缓冲 ----
click("mode-btn", "scientific");
press("2"); click("op", "+"); press("3"); click("op", "*"); press("4");
click("mode-btn", "normal");
click("action", "equals");
check("跨模式保留缓冲 2+3×4=14", result(), "14");
click("action", "clear");

console.log("\n结果: " + pass + " pass, " + fail + " fail");
process.exit(fail ? 1 : 0);
