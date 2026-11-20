// 基础计算器逻辑
(function () {
  "use strict";

  var current = "0";      // 当前输入数字（字符串）
  var previous = null;    // 上一次的操作数（number）
  var operator = null;    // 待执行的运算符
  var overwrite = false;  // 下一次输入是否覆盖当前值
  var errorState = false; // 除零等非法运算后的错误态
  var mode = "normal";    // "normal" | "scientific"
  var angleMode = "DEG";  // "DEG" | "RAD"（科学模式角度/弧度约定，默认角度）

  var exprEl = document.getElementById("expr");
  var resultEl = document.getElementById("result");
  var calcEl = document.getElementById("calc");
  var angleBtn = document.getElementById("angleBtn");

  function render() {
    resultEl.textContent = current;
    if (previous !== null && operator !== null) {
      exprEl.textContent = previous + " " + symbolOf(operator);
    } else {
      exprEl.textContent = "";
    }
  }

  function symbolOf(op) {
    return { "+": "+", "-": "−", "*": "×", "/": "÷", "^": "^" }[op] || op;
  }

  function inputNumber(d) {
    if (errorState) {
      // 错误态下输入数字：解除错误态并作为新数字开始（等同 overwrite 行为）
      errorState = false;
      overwrite = true;
    }
    if (overwrite) {
      current = d === "." ? "0." : d;
      overwrite = false;
    } else {
      if (d === ".") {
        if (current.indexOf(".") !== -1) return;
        current += ".";
      } else if (current === "0") {
        current = d;
      } else {
        current += d;
      }
    }
    render();
  }

  function toNumber(s) {
    var n = parseFloat(s);
    return isNaN(n) ? 0 : n;
  }

  function compute(a, b, op) {
    switch (op) {
      case "+": return a + b;
      case "-": return a - b;
      case "*": return a * b;
      case "/": return b === 0 ? NaN : a / b;
      case "^": return Math.pow(a, b);
      default: return b;
    }
  }

  function setError() {
    errorState = true;
    current = "错误";
    previous = null;
    operator = null;
    overwrite = true; // 防止继续追加数字；数字/AC 输入负责解除错误态
    render();
  }

  function chooseOperator(op) {
    if (errorState) return; // 错误态下运算符无效，等待 AC 或数字输入
    if (operator !== null && previous !== null && !overwrite) {
      var r = compute(previous, toNumber(current), operator);
      if (!isFinite(r)) {
        setError();
        return;
      }
      current = format(r);
      previous = r;
    } else {
      previous = toNumber(current);
    }
    operator = op;
    overwrite = true;
    render();
  }

  function format(n) {
    if (!isFinite(n)) return "错误";
    // 避免浮点过长，最多 12 位有效数字
    var s = String(parseFloat(n.toPrecision(12)));
    return s;
  }

  function equal() {
    if (errorState) return; // 错误态下等号无效
    if (operator !== null && previous !== null) {
      var r = compute(previous, toNumber(current), operator);
      if (!isFinite(r)) {
        setError();
        return;
      }
      current = format(r);
      previous = null;
      operator = null;
      overwrite = true;
      render();
    }
  }

  function clearAll() {
    current = "0";
    previous = null;
    operator = null;
    overwrite = false;
    errorState = false;
    render();
  }

  function toggleSign() {
    if (errorState) return; // 错误态下正负号无效
    if (current === "0") return;
    current = current.charAt(0) === "-" ? current.slice(1) : "-" + current;
    render();
  }

  function percent() {
    if (errorState) return; // 错误态下百分号无效
    var r = toNumber(current) / 100;
    if (!isFinite(r)) {
      setError(); // 与除零/溢出一致，真正锁定错误态
      return;
    }
    current = format(r);
    overwrite = true;
    render();
  }

  // ---- 科学计算（普通模式行为不受影响，全部入口遵守错误态守卫） ----

  function toRadians(x) {
    return angleMode === "DEG" ? x * Math.PI / 180 : x;
  }

  function factorial(n) {
    // 非负整数阶乘；负数/非整数 → NaN（统一走非有限值错误路径）
    if (n < 0 || n % 1 !== 0) return NaN;
    var r = 1;
    for (var i = 2; i <= n; i++) r *= i;
    return r;
  }

  // 一元即时求值：作用于当前显示值，结果立即替换 current
  function applyUnary(kind) {
    if (errorState) return; // 错误态下科学函数无效，等待 AC 或数字输入
    var x = toNumber(current);
    var r;
    switch (kind) {
      case "sin": r = Math.sin(toRadians(x)); break;
      case "cos": r = Math.cos(toRadians(x)); break;
      case "tan": r = Math.tan(toRadians(x)); break;
      case "sqrt": r = Math.sqrt(x); break;
      case "log": r = Math.log10(x); break;
      case "ln": r = Math.log(x); break;
      case "fact": r = factorial(x); break;
      default: return;
    }
    // 与 equal/chooseOperator/percent 溢出路径同构：非有限值必须锁定错误态
    if (!isFinite(r)) {
      setError();
      return;
    }
    current = format(r);
    overwrite = true;
    render();
  }

  function piAction() {
    if (errorState) return; // 错误态下常量输入无效
    current = format(Math.PI); // π 作为输入常量：后续数字覆盖（overwrite=true），运算符正常衔接
    overwrite = true;
    render();
  }

  function toggleAngle() {
    if (errorState) return; // 错误态下角度切换无效（守卫一致）
    angleMode = angleMode === "DEG" ? "RAD" : "DEG";
    angleBtn.textContent = angleMode; // 即时生效，不触发求值、不清 current
  }

  // 模式切换：只切显隐，计算状态（current/previous/operator/errorState）完整保留
  function setMode(m) {
    mode = m;
    calcEl.classList.toggle("scientific", m === "scientific");
  }

  // 事件绑定
  document.querySelectorAll("[data-num]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      inputNumber(btn.getAttribute("data-num"));
    });
  });

  document.querySelectorAll("[data-op]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      chooseOperator(btn.getAttribute("data-op"));
    });
  });

  document.querySelectorAll("[data-action]").forEach(function (btn) {
    var action = btn.getAttribute("data-action");
    btn.addEventListener("click", function () {
      if (action === "clear") clearAll();
      else if (action === "equals") equal();
      else if (action === "sign") toggleSign();
      else if (action === "percent") percent();
    });
  });

  document.querySelectorAll("[data-fn]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var fn = btn.getAttribute("data-fn");
      if (fn === "pi") piAction();
      else if (fn === "angle") toggleAngle();
      else applyUnary(fn);
    });
  });

  document.querySelectorAll("[data-mode-btn]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      setMode(btn.getAttribute("data-mode-btn"));
    });
  });

  render();
})();
