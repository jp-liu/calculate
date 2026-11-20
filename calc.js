// 基础计算器逻辑
(function () {
  "use strict";

  var current = "0";      // 当前输入数字（字符串）
  var tokens = [];        // 表达式缓冲：{num:"12"} 或 {op:"+"}（标准优先级求值，TD-10）
  var overwrite = false;  // 下一次输入是否覆盖当前值
  var errorState = false; // 除零等非法运算后的错误态
  var lastOp = null;      // 最后一次等号运算 {a, op, b}，供连续等号重复
  var pendingOp = false;  // 尾部运算符之后是否还没有输入操作数（运算符替换判据）
  var angleMode = "DEG";  // "DEG" | "RAD"（科学模式角度/弧度约定，默认角度）

  var exprEl = document.getElementById("expr");
  var resultEl = document.getElementById("result");
  var calcEl = document.getElementById("calc");
  var angleBtn = document.getElementById("angleBtn");

  function render() {
    resultEl.textContent = current;
    var parts = [];
    for (var i = 0; i < tokens.length; i++) {
      var t = tokens[i];
      if (t.num !== undefined) {
        if (i > 0) parts.push(" ");
        parts.push(t.num);
      } else {
        parts.push(" " + symbolOf(t.op));
      }
    }
    exprEl.textContent = parts.join("");
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
    pendingOp = false; // 已开始输入操作数，尾部运算符不再是"悬空待替换"
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

  // 标准优先级求值：先 ^，再 ×÷，后 +−；同级左结合；任一步非有限值返回 NaN
  function evaluateTokens(list) {
    var nums = [];
    var ops = [];
    for (var i = 0; i < list.length; i++) {
      if (list[i].num !== undefined) nums.push(toNumber(list[i].num));
      else ops.push(list[i].op);
    }
    if (nums.length === 0) return NaN;
    var a = nums[0];
    var bi = 0;
    // 第一遍：^ （高于乘除，TD-10 Q1=B）
    var n2 = [a];
    var o2 = [];
    for (bi = 0; bi < ops.length; bi++) {
      var b1 = nums[bi + 1];
      if (ops[bi] === "^") {
        n2[n2.length - 1] = compute(n2[n2.length - 1], b1, "^");
        if (!isFinite(n2[n2.length - 1])) return NaN;
      } else {
        o2.push(ops[bi]);
        n2.push(b1);
      }
    }
    // 第二遍：×÷（降为加减序列）
    var n3 = [n2[0]];
    var o3 = [];
    for (bi = 0; bi < o2.length; bi++) {
      if (o2[bi] === "*" || o2[bi] === "/") {
        n3[n3.length - 1] = compute(n3[n3.length - 1], n2[bi + 1], o2[bi]);
        if (!isFinite(n3[n3.length - 1])) return NaN;
      } else {
        o3.push(o2[bi]);
        n3.push(n2[bi + 1]);
      }
    }
    // 第三遍：+− 左结合
    var r = n3[0];
    for (bi = 0; bi < o3.length; bi++) {
      r = compute(r, n3[bi + 1], o3[bi]);
      if (!isFinite(r)) return NaN;
    }
    return r;
  }

  function setError() {
    errorState = true;
    current = "错误";
    tokens = [];
    lastOp = null; // 错误后连续等号失效（对齐旧版：错误态解除后 = 无操作）
    overwrite = true; // 防止继续追加数字；数字/AC 输入负责解除错误态
    render();
  }

  function chooseOperator(op) {
    if (errorState) return; // 错误态下运算符无效，等待 AC 或数字输入
    if (tokens.length && tokens[tokens.length - 1].op !== undefined && pendingOp) {
      // 刚按完运算符（未输入任何新内容）：尾部运算符替换（2+×3 → 2×3）
      tokens[tokens.length - 1] = { op: op };
    } else {
      // 已输入左操作数（原始输入或一元/正负号即时结果）：压入并挂新运算符
      tokens.push({ num: current });
      tokens.push({ op: op });
    }
    pendingOp = true;
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
    if (tokens.length >= 2) {
      if (tokens[tokens.length - 1].op !== undefined) {
        tokens.push({ num: current }); // 尾部悬空运算符：以当前显示值补全右操作数（对齐旧版语义）
      } else {
        tokens[tokens.length - 1].num = current; // 输入中的尾操作数落盘（含一元/正负号即时结果）
      }
      var lastNum = tokens[tokens.length - 1];
      var lastSym = tokens[tokens.length - 2];
      var r = evaluateTokens(tokens);
      if (!isFinite(r)) {
        setError();
        return;
      }
      // 记录最后一步供连续等号重复（TD-10 Q3：重复最后一次运算）
      lastOp = { op: lastSym.op, b: toNumber(lastNum.num) };
      tokens = [];
      current = format(r);
      overwrite = true;
      render();
    } else if (lastOp) {
      // 连续等号：当前值 ⊕ 最后一步的右操作数（12+3=15，= → 18）
      var r2 = compute(toNumber(current), lastOp.b, lastOp.op);
      if (!isFinite(r2)) {
        setError();
        return;
      }
      current = format(r2);
      overwrite = true;
      render();
    }
  }

  function clearAll() {
    current = "0";
    tokens = [];
    lastOp = null;
    overwrite = false;
    errorState = false;
    render();
  }

  function toggleSign() {
    if (errorState) return; // 错误态下正负号无效
    if (current === "0") return;
    current = current.charAt(0) === "-" ? current.slice(1) : "-" + current;
    pendingOp = false; // 翻转后的值是有效操作数（5×-3 场景）
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
    pendingOp = false; // 百分号结果成为有效操作数
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
    pendingOp = false; // 一元结果成为有效操作数
    overwrite = true;
    render();
  }

  function piAction() {
    if (errorState) return; // 错误态下常量输入无效
    current = format(Math.PI); // π 作为输入常量：后续数字覆盖（overwrite=true），运算符正常衔接
    pendingOp = false; // π 是有效操作数
    overwrite = true;
    render();
  }

  function toggleAngle() {
    if (errorState) return; // 错误态下角度切换无效（守卫一致）
    angleMode = angleMode === "DEG" ? "RAD" : "DEG";
    angleBtn.textContent = angleMode; // 即时生效，不触发求值、不清 current
  }

  // 模式切换：只切显隐，计算状态（current/tokens/errorState）完整保留
  function setMode(m) {
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
