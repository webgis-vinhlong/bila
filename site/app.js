import { compile, check, VERSION } from './compiler.mjs';

const examples = {
  basic: `---bila:strict---

haml_sob tong(a: Sob, b: Sob): Sob {
  trov_ved a + b;
}

bilb day_so: Magz<Sob> = [1, 2];
day_so.dayq(3);

vil (bilb i = 0; i < day_so.dof_zail; i++) {
  neub (day_so[i] > 1) {
    console.log(day_so[i]);
  }
}

console.log("Tổng:", tong(4, 5));`,
  collection: `---bila:strict---

bilb diem = [4, 7, 8, 9, 5];
bilb dat = diem.locr((x) => x >= 7);
bilb binh_phuong = dat.ahj_xar((x) => x * x);

console.log("Đạt:", dat);
console.log("Bình phương:", binh_phuong);`,
  class: `---bila:strict---

lopx MayTinh {
  cong(a: Sob, b: Sob): Sob {
    trov_ved a + b;
  }
}

bilb may = moix MayTinh();
thuv {
  console.log("2 + 3 =", may.cong(2, 3));
} chupr_layb (loi) {
  console.log("Lỗi:", loi.message);
} cujb_cugl {
  console.log("Hoàn tất");
}`
};

const messages = {
  vi: {
    navArchitecture:'Kiến trúc', preview:'DEVKIT PREVIEW · MÃ NGUỒN MỞ', heroTitle:'Viết bằng BilaScript.<br><em>Chạy như JavaScript.</em>', heroLead:'Một toolchain AST-first có thể kiểm thử: lexer Unicode, parser, code generator, Source Map v3, CLI, playground và công cụ VS Code.', tryNow:'Thử ngay', viewSource:'Xem mã nguồn', tests:'Kiểm thử 14/14', compiled:'Biên dịch thành JavaScript thuần', metricAst:'Pipeline có cấu trúc', metricVsix:'Công cụ VS Code', underHood:'BÊN TRONG HỆ THỐNG', architectureTitle:'Từ mã nguồn đến chương trình chạy được', architectureLead:'Mỗi giai đoạn có đầu vào, đầu ra rõ ràng và được kiểm thử hồi quy—không phải một chuỗi thay thế từ khóa bằng regex.', lexerText:'Tách token Unicode và giữ vị trí dòng/cột.', parserText:'Dựng AST kiểu ESTree bằng recursive descent.', astText:'Sở hữu cấu trúc câu lệnh, biểu thức, class và module.', codegenText:'Sinh JavaScript và ánh xạ Source Map v3.', playgroundTitle:'Biên dịch ngay trong trình duyệt', compile:'Biên dịch', run:'Chạy ▶', clear:'Xóa', safetyNote:'Mã chạy trong Web Worker ngắn hạn và bị dừng sau 2 giây. Đây không phải sandbox bảo mật cho mã không tin cậy.', tooling:'BỘ CÔNG CỤ', toolsTitle:'Từ học tập đến workflow lập trình', cliText:'Kiểm tra, xem AST, biên dịch và chạy tệp .bila bằng Node.js.', vscodeText:'Tô màu, snippets, diagnostics, compile, run và debug với source map.', downloadVsix:'Tải VSIX ↓', labText:'Bốn mươi bài thực hành offline, từ biến và vòng lặp đến phương trình.', openLab:'Mở phòng lab →', honestTitle:'Tuyên bố kỹ thuật trung thực', honestText:'DevKit hỗ trợ một tập con thực dụng cho ứng dụng Web/Node cơ bản. Chưa tuyên bố JSX, decorators, private fields, toàn bộ TypeScript hay ECMAScript/Test262 đầy đủ.'
  },
  en: {
    navArchitecture:'Architecture', preview:'DEVKIT PREVIEW · OPEN SOURCE', heroTitle:'Write BilaScript.<br><em>Run JavaScript.</em>', heroLead:'A testable AST-first toolchain: Unicode lexer, parser, code generator, Source Map v3, CLI, playground and VS Code tooling.', tryNow:'Try it now', viewSource:'View source', tests:'Tests 14/14', compiled:'Compiles to plain JavaScript', metricAst:'Structured pipeline', metricVsix:'VS Code tooling', underHood:'UNDER THE HOOD', architectureTitle:'From source to an executable program', architectureLead:'Every stage has explicit inputs and outputs backed by regression tests—not a chain of regex keyword replacements.', lexerText:'Tokenizes Unicode source and preserves line/column locations.', parserText:'Builds an ESTree-like AST with recursive descent.', astText:'Owns statement, expression, class and module structure.', codegenText:'Emits JavaScript and Source Map v3 mappings.', playgroundTitle:'Compile directly in your browser', compile:'Compile', run:'Run ▶', clear:'Clear', safetyNote:'Code runs in a short-lived Web Worker and stops after 2 seconds. This is not a security sandbox for untrusted code.', tooling:'TOOLCHAIN', toolsTitle:'From learning to a developer workflow', cliText:'Check, inspect the AST, compile and run .bila files with Node.js.', vscodeText:'Highlighting, snippets, diagnostics, compile, run and source-map debugging.', downloadVsix:'Download VSIX ↓', labText:'Forty offline exercises covering variables, loops and equations.', openLab:'Open the lab →', honestTitle:'An honest technical scope', honestText:'The DevKit supports a practical subset for basic Web and Node apps. It does not claim JSX, decorators, private fields, full TypeScript or complete ECMAScript/Test262 conformance.'
  },
  zh: {
    navArchitecture:'架构', preview:'DEVKIT 预览版 · 开源', heroTitle:'使用 BilaScript 编写。<br><em>像 JavaScript 一样运行。</em>', heroLead:'可测试的 AST 优先工具链：Unicode 词法分析器、语法分析器、代码生成器、Source Map v3、CLI、Playground 与 VS Code 工具。', tryNow:'立即体验', viewSource:'查看源码', tests:'测试 14/14', compiled:'编译为纯 JavaScript', metricAst:'结构化流程', metricVsix:'VS Code 工具', underHood:'系统内部', architectureTitle:'从源代码到可运行程序', architectureLead:'每个阶段都有明确的输入与输出并经过回归测试，而不是正则关键字替换链。', lexerText:'分解 Unicode Token，并保留行列位置。', parserText:'使用递归下降构建类似 ESTree 的 AST。', astText:'表示语句、表达式、类与模块结构。', codegenText:'生成 JavaScript 与 Source Map v3 映射。', playgroundTitle:'直接在浏览器中编译', compile:'编译', run:'运行 ▶', clear:'清除', safetyNote:'代码在短生命周期 Web Worker 中运行，并在 2 秒后终止。这不是运行不可信代码的安全沙箱。', tooling:'工具链', toolsTitle:'从学习到开发工作流', cliText:'使用 Node.js 检查、查看 AST、编译并运行 .bila 文件。', vscodeText:'语法高亮、代码片段、诊断、编译、运行与 Source Map 调试。', downloadVsix:'下载 VSIX ↓', labText:'四十个离线练习，涵盖变量、循环与方程。', openLab:'打开实验室 →', honestTitle:'真实的技术范围', honestText:'DevKit 支持基础 Web/Node 应用的实用子集，不声称支持 JSX、装饰器、私有字段、完整 TypeScript 或完整 ECMAScript/Test262。'
  }
};

const $ = (selector) => document.querySelector(selector);
const source = $('#source');
const jsOutput = $('#jsOutput');
const astOutput = $('#astOutput');
const diagPanel = $('#diagPanel');
const consoleOutput = $('#consoleOutput');
const compileTime = $('#compileTime');
let lastResult = null;
let compileTimer = null;

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, character => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[character]));
}

function setLanguage(language) {
  const dictionary = messages[language] || messages.vi;
  document.documentElement.lang = language === 'zh' ? 'zh-CN' : language;
  document.querySelectorAll('[data-i18n]').forEach(element => {
    const value = dictionary[element.dataset.i18n];
    if (value === undefined) return;
    if (value.includes('<br>') || value.includes('<em>')) element.innerHTML = value;
    else element.textContent = value;
  });
  document.querySelectorAll('[data-lang]').forEach(button => button.classList.toggle('active', button.dataset.lang === language));
  localStorage.setItem('bilascript-language', language);
}

function updateMeta() {
  const lines = source.value.split('\n').length;
  $('#sourceMeta').textContent = `${lines} lines · ${source.value.length} chars`;
}

function showDiagnostics(diagnostics = []) {
  $('#diagCount').textContent = String(diagnostics.length);
  if (!diagnostics.length) {
    diagPanel.innerHTML = '<span class="ok">✓ No diagnostics</span>';
    return;
  }
  diagPanel.innerHTML = diagnostics.map(item => `<span class="error"><b>${escapeHtml(item.code || 'BILA')}</b> · ${escapeHtml(item.line || '?')}:${escapeHtml(item.column || '?')}<br>${escapeHtml(item.message)}</span>`).join('');
}

function compileSource({quiet = false} = {}) {
  const start = performance.now();
  try {
    const diagnostics = check(source.value);
    showDiagnostics(diagnostics.diagnostics);
    if (!diagnostics.ok) throw Object.assign(new Error(diagnostics.diagnostics[0]?.message || 'Compilation failed'), { shown: true });
    lastResult = compile(source.value, { sourceMap: true, sourceName: 'playground.bila', fileName: 'playground.js' });
    jsOutput.textContent = lastResult.code;
    astOutput.textContent = JSON.stringify(lastResult.ast, null, 2);
    if (!quiet) consoleOutput.innerHTML = '<span class="console-muted">› Compilation succeeded.</span>';
    $('#compilerStatus').textContent = `BilaScript ${VERSION} · OK`;
    return lastResult;
  } catch (error) {
    lastResult = null;
    jsOutput.textContent = `// ${error.message}`;
    astOutput.textContent = '{}';
    if (!error.shown) showDiagnostics(error.diagnostics || [{code:'BILA-P001', message:error.message, line:error.line, column:error.column}]);
    consoleOutput.textContent = `Compilation error: ${error.message}`;
    $('#compilerStatus').textContent = `BilaScript ${VERSION} · ERROR`;
    return null;
  } finally {
    compileTime.textContent = `${(performance.now() - start).toFixed(1)} ms`;
    updateMeta();
  }
}

function runSource() {
  const result = compileSource({quiet:true});
  if (!result) return;
  if (/^\s*(?:import|export)\b/m.test(result.code)) {
    consoleOutput.textContent = 'Run is disabled for module syntax in the browser playground.';
    return;
  }
  consoleOutput.innerHTML = '<span class="console-muted">› Running in isolated worker…</span>';
  const workerText = `self.onmessage = ({data}) => {
    const logs = [];
    const print = (...values) => logs.push(values.map(value => {
      if (typeof value === 'string') return value;
      try { return JSON.stringify(value); } catch { return String(value); }
    }).join(' '));
    const console = { log: print, info: print, warn: print, error: print };
    try {
      new Function('console', data.code)(console);
      self.postMessage({ok:true, logs});
    } catch (error) {
      self.postMessage({ok:false, logs, error:error.name + ': ' + error.message});
    }
  };`;
  const url = URL.createObjectURL(new Blob([workerText], {type:'text/javascript'}));
  const worker = new Worker(url);
  const timeout = setTimeout(() => {
    worker.terminate();
    URL.revokeObjectURL(url);
    consoleOutput.textContent = 'Execution stopped: 2 second time limit exceeded.';
  }, 2000);
  worker.onmessage = ({data}) => {
    clearTimeout(timeout);
    worker.terminate();
    URL.revokeObjectURL(url);
    const lines = data.logs || [];
    if (!data.ok) lines.push(data.error);
    consoleOutput.textContent = lines.length ? lines.join('\n') : '✓ Program completed without console output.';
  };
}

document.querySelectorAll('[data-lang]').forEach(button => button.addEventListener('click', () => setLanguage(button.dataset.lang)));
document.querySelectorAll('.tab').forEach(tab => tab.addEventListener('click', () => {
  document.querySelectorAll('.tab').forEach(item => item.classList.toggle('active', item === tab));
  document.querySelectorAll('.panel').forEach(panel => panel.classList.toggle('active', panel.id === tab.dataset.panel));
}));
$('#exampleSelect').addEventListener('change', event => { source.value = examples[event.target.value]; compileSource(); });
$('#compileBtn').addEventListener('click', () => compileSource());
$('#runBtn').addEventListener('click', runSource);
$('#clearBtn').addEventListener('click', () => { consoleOutput.innerHTML = '<span class="console-muted">› Console cleared.</span>'; });
source.addEventListener('input', () => {
  updateMeta();
  clearTimeout(compileTimer);
  compileTimer = setTimeout(() => compileSource({quiet:true}), 350);
});
source.addEventListener('keydown', event => {
  if (event.key !== 'Tab') return;
  event.preventDefault();
  const start = source.selectionStart;
  source.setRangeText('  ', start, source.selectionEnd, 'end');
});

source.value = examples.basic;
setLanguage(localStorage.getItem('bilascript-language') || 'vi');
compileSource({quiet:true});
