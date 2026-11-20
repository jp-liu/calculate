// 基础计算器逻辑
(function () {
  "use strict";

  var current = "0";      // 当前输入数字（字符串）
  var previous = null;    // 上一次的操作数（number）
  var operator = null;    // 待执行的运算符
  var overwrite = false;  // 下一次输入是否覆盖当前值
  var errorState = false; // 除零等非法运算后的错误态

  var exprEl = document.getElementById("expr");
  var resultEl = document.getElementById("result");

  function render() {
    resultEl.textContent = current;
    if (previous !== null && operator !== null) {
      exprEl.textContent = previous + " " + symbolOf(operator);
    } else {
      exprEl.textContent = "";
    }
  }

  function symbolOf(op) {
    return { "+": "+", "-": "−", "*": "×", "/": "÷" }[op] || op;
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
    current = format(toNumber(current) / 100);
    overwrite = true;
    render();
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

  render();
})();
