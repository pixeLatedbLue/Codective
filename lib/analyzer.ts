// ============================================================
// CODE ANALYSIS ENGINE
// Supports: JS, TS, Python, C, C++, Java, Go, Rust, Ruby,
//           PHP, Swift, Kotlin, C#, HTML, CSS, Bash, Lua, R
// ============================================================

export type Language =
  | 'javascript' | 'typescript' | 'python' | 'c' | 'cpp'
  | 'java' | 'go' | 'rust' | 'ruby' | 'php' | 'swift'
  | 'kotlin' | 'csharp' | 'html' | 'css' | 'bash' | 'lua'
  | 'r' | 'unknown';

export interface Metrics {
  linesOfCode: number;
  blankLines: number;
  commentLines: number;
  cyclomaticComplexity: number;
  maxNestingDepth: number;
  avgFunctionLength: number;
  maxFunctionLength: number;
  functionCount: number;
  longFunctions: number;
  deeplyNestedBlocks: number;
  conditionalCount: number;
  loopCount: number;
  returnCount: number;
  duplicateLineRatio: number;
  magicNumbers: number;
  todoCount: number;
  errorHandlingCount: number;
  globalVariables: number;
  longLines: number;
}

export interface Insight {
  severity: 'info' | 'warning' | 'critical';
  category: 'complexity' | 'maintainability' | 'style' | 'bugRisk' | 'performance';
  message: string;
  detail: string;
}

export interface AnalysisResult {
  language: Language;
  languageLabel: string;
  metrics: Metrics;
  qualityScore: number;
  bugRisk: 'Low' | 'Medium' | 'High';
  insights: Insight[];
  breakdown: {
    complexity: number;
    maintainability: number;
    style: number;
    bugRisk: number;
  };
}

// ─── Language Detection ───────────────────────────────────────

const LANG_SIGNATURES: Record<Language, RegExp[]> = {
  python: [/^\s*def\s+\w+\s*\(/, /^\s*import\s+\w/, /^\s*from\s+\w+\s+import/, /:\s*$/, /^\s*class\s+\w+.*:/],
  typescript: [/:\s*(string|number|boolean|void|any|never|unknown)\b/, /interface\s+\w+/, /type\s+\w+\s*=/, /as\s+(const|unknown|any)/, /<[A-Z]\w*>/],
  javascript: [/\bconst\b|\blet\b|\bvar\b/, /=>\s*{/, /require\(/, /module\.exports/, /\bconsole\.\w+/],
  java: [/public\s+class\s+\w+/, /System\.out\.print/, /import\s+java\./, /\bvoid\b.*\{/, /new\s+\w+\(/],
  cpp: [/#include\s*<\w+>/, /std::/, /cout\s*<</, /cin\s*>>/, /namespace\s+\w+/, /\btemplate\s*</],
  c: [/#include\s*<stdio\.h>/, /printf\s*\(/, /scanf\s*\(/, /int\s+main\s*\(/, /malloc\s*\(/],
  go: [/package\s+\w+/, /func\s+\w+\s*\(/, /import\s*\(/, /\bfmt\.\w+/, /\bgo\s+func/],
  rust: [/fn\s+\w+\s*\(/, /let\s+mut\s+/, /impl\s+\w+/, /use\s+std::/, /\bpub\s+fn\b/],
  csharp: [/using\s+System/, /namespace\s+\w+/, /Console\.Write/, /public\s+class\s+\w+/, /\.NET/],
  ruby: [/def\s+\w+/, /require\s+'/, /puts\s+/, /\.each\s*do/, /end\s*$/m],
  php: [/<\?php/, /\$\w+\s*=/, /echo\s+/, /function\s+\w+\s*\(/],
  swift: [/import\s+Foundation/, /var\s+\w+\s*:/, /func\s+\w+\s*\(/, /guard\s+let/, /print\s*\(/],
  kotlin: [/fun\s+\w+\s*\(/, /val\s+\w+/, /var\s+\w+/, /data\s+class/, /companion\s+object/],
  html: [/<!DOCTYPE\s+html/i, /<html/, /<body/, /<div/, /<head/],
  css: [/\w+\s*\{[^}]*\}/, /:\s*(px|em|rem|%|vh|vw)/, /@media\s*\(/, /\.([\w-]+)\s*{/, /#[\w-]+\s*{/],
  bash: [/^#!/, /\$\{?\w+\}?/, /\bfi\b/, /\becho\b/, /\bif\s+\[/],
  lua: [/function\s+\w+\s*\(/, /local\s+\w+/, /require\s*\(/, /end\s*$/, /\bthen\b/],
  r: [/<-\s*/, /library\s*\(/, /data\.frame\s*\(/, /ggplot\s*\(/, /c\s*\(/],
  unknown: [],
};

const LANG_LABELS: Record<Language, string> = {
  javascript: 'JavaScript', typescript: 'TypeScript', python: 'Python',
  c: 'C', cpp: 'C++', java: 'Java', go: 'Go', rust: 'Rust',
  csharp: 'C#', ruby: 'Ruby', php: 'PHP', swift: 'Swift',
  kotlin: 'Kotlin', html: 'HTML', css: 'CSS', bash: 'Bash/Shell',
  lua: 'Lua', r: 'R', unknown: 'Unknown',
};

export function detectLanguage(code: string): Language {
  const scores: Partial<Record<Language, number>> = {};
  for (const [lang, patterns] of Object.entries(LANG_SIGNATURES) as [Language, RegExp[]][]) {
    if (lang === 'unknown') continue;
    let score = 0;
    for (const p of patterns) {
      const matches = code.match(new RegExp(p.source, p.flags + 'gm'));
      if (matches) score += matches.length;
    }
    if (score > 0) scores[lang] = score;
  }
  if (Object.keys(scores).length === 0) return 'unknown';
  return Object.entries(scores).sort((a, b) => b[1]! - a[1]!)[0][0] as Language;
}

// ─── Metrics Extraction ──────────────────────────────────────

function getNestingDepth(code: string, lang: Language): number {
  const lines = code.split('\n');
  let maxDepth = 0;
  let depth = 0;

  if (['python'].includes(lang)) {
    // Python uses indentation
    for (const line of lines) {
      if (!line.trim()) continue;
      const indent = line.match(/^(\s*)/)?.[1].length || 0;
      const currentDepth = Math.floor(indent / 4);
      maxDepth = Math.max(maxDepth, currentDepth);
    }
  } else {
    for (const char of code) {
      if (char === '{') { depth++; maxDepth = Math.max(maxDepth, depth); }
      else if (char === '}') depth = Math.max(0, depth - 1);
    }
  }
  return maxDepth;
}

function getCyclomaticComplexity(code: string, lang: Language): number {
  // Count decision points + 1
  const decisionPatterns = [
    /\bif\b/g, /\belse\s+if\b/gi, /\belif\b/g,
    /\bwhile\b/g, /\bfor\b/g,
    /\bcase\b/g, /\bcatch\b/g, /\b\?\s*\S/g, // ternary
    /&&|\|\|/g,
  ];
  let complexity = 1;
  for (const pat of decisionPatterns) {
    const matches = code.match(pat);
    if (matches) complexity += matches.length;
  }
  return complexity;
}

function getFunctionLengths(code: string, lang: Language): number[] {
  const lines = code.split('\n');
  const lengths: number[] = [];

  if (lang === 'python') {
    let inFunc = false;
    let funcIndent = 0;
    let funcLines = 0;
    for (const line of lines) {
      if (/^\s*def\s+/.test(line)) {
        if (inFunc) lengths.push(funcLines);
        inFunc = true;
        funcIndent = line.match(/^(\s*)/)?.[1].length || 0;
        funcLines = 1;
      } else if (inFunc) {
        if (!line.trim()) { funcLines++; continue; }
        const indent = line.match(/^(\s*)/)?.[1].length || 0;
        if (indent <= funcIndent && line.trim()) {
          lengths.push(funcLines);
          inFunc = false;
          funcLines = 0;
        } else funcLines++;
      }
    }
    if (inFunc) lengths.push(funcLines);
  } else {
    // Brace-based languages
    let depth = 0;
    let funcStart = -1;
    let inFunc = false;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const isFuncLine = /\b(function|def|func|fn|sub|method)\b.*\{/.test(line) ||
        /\w+\s*\([^)]*\)\s*(:\s*\w+)?\s*\{/.test(line) ||
        /=>\s*\{/.test(line);
      for (const ch of line) {
        if (ch === '{') {
          if (!inFunc && depth === 0 && isFuncLine) { inFunc = true; funcStart = i; }
          depth++;
        } else if (ch === '}') {
          depth = Math.max(0, depth - 1);
          if (inFunc && depth === 0) {
            lengths.push(i - funcStart + 1);
            inFunc = false;
            funcStart = -1;
          }
        }
      }
    }
  }

  return lengths.length ? lengths : [lines.length]; // fallback: treat whole code as one unit
}

function countMagicNumbers(code: string): number {
  // Numbers that aren't 0 or 1 and aren't in array/config contexts
  const matches = code.match(/\b(?!0\b|1\b)\d{2,}\b/g);
  return matches ? matches.length : 0;
}

function countTODOs(code: string): number {
  const matches = code.match(/\b(TODO|FIXME|HACK|XXX|BUG|TEMP)\b/gi);
  return matches ? matches.length : 0;
}

function getDuplicateLineRatio(code: string): number {
  const lines = code.split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 10); // only non-trivial lines
  if (!lines.length) return 0;
  const seen = new Set<string>();
  let dupes = 0;
  for (const line of lines) {
    if (seen.has(line)) dupes++;
    else seen.add(line);
  }
  return dupes / lines.length;
}

export function extractMetrics(code: string, lang: Language): Metrics {
  const lines = code.split('\n');
  const blankLines = lines.filter(l => !l.trim()).length;

  const commentPatterns: Record<string, RegExp> = {
    python: /^\s*#/,
    html: /<!--.*-->/,
    css: /\/\*/,
    bash: /^\s*#/,
    lua: /^\s*--/,
    r: /^\s*#/,
  };
  const defaultComment = /^\s*(\/\/|\/\*|\*)/;
  const commentPat = commentPatterns[lang] || defaultComment;
  const commentLines = lines.filter(l => commentPat.test(l)).length;
  const linesOfCode = lines.length - blankLines - commentLines;

  const conditionalCount = (code.match(/\b(if|else\s+if|elif|unless|switch|when)\b/g) || []).length;
  const loopCount = (code.match(/\b(for|while|do|foreach|loop|each)\b/g) || []).length;
  const returnCount = (code.match(/\b(return|yield)\b/g) || []).length;

  const errorHandlingCount = (
    code.match(/\b(try|catch|except|rescue|finally|raise|throw|panic|unwrap|expect)\b/g) || []
  ).length;

  const globalVarPatterns: Record<string, RegExp> = {
    python: /^[A-Z_]{2,}\s*=/gm,
    javascript: /^var\s+\w+/gm,
    typescript: /^var\s+\w+/gm,
    php: /\$GLOBALS\[/g,
  };
  const globalMatches = code.match(globalVarPatterns[lang] || /^(global|extern)\s+/gm);
  const globalVariables = globalMatches ? globalMatches.length : 0;

  const longLines = lines.filter(l => l.length > 100).length;

  const funcLengths = getFunctionLengths(code, lang);
  const avgFunctionLength = funcLengths.length
    ? Math.round(funcLengths.reduce((a, b) => a + b, 0) / funcLengths.length)
    : 0;
  const maxFunctionLength = funcLengths.length ? Math.max(...funcLengths) : 0;
  const longFunctions = funcLengths.filter(l => l > 50).length;

  const functionCount = funcLengths.length;

  return {
    linesOfCode,
    blankLines,
    commentLines,
    cyclomaticComplexity: getCyclomaticComplexity(code, lang),
    maxNestingDepth: getNestingDepth(code, lang),
    avgFunctionLength,
    maxFunctionLength,
    functionCount,
    longFunctions,
    deeplyNestedBlocks: Math.max(0, getNestingDepth(code, lang) - 3),
    conditionalCount,
    loopCount,
    returnCount,
    duplicateLineRatio: getDuplicateLineRatio(code),
    magicNumbers: countMagicNumbers(code),
    todoCount: countTODOs(code),
    errorHandlingCount,
    globalVariables,
    longLines,
  };
}

// ─── Scoring ─────────────────────────────────────────────────

function clamp(val: number, min = 0, max = 100) {
  return Math.min(max, Math.max(min, val));
}

function scoreComplexity(m: Metrics): number {
  let score = 100;
  if (m.cyclomaticComplexity > 50) score -= 40;
  else if (m.cyclomaticComplexity > 30) score -= 25;
  else if (m.cyclomaticComplexity > 15) score -= 15;
  else if (m.cyclomaticComplexity > 10) score -= 8;

  if (m.maxNestingDepth > 7) score -= 25;
  else if (m.maxNestingDepth > 5) score -= 15;
  else if (m.maxNestingDepth > 3) score -= 8;

  if (m.conditionalCount > 30) score -= 15;
  else if (m.conditionalCount > 15) score -= 8;

  return clamp(score);
}

function scoreMaintainability(m: Metrics): number {
  let score = 100;
  if (m.maxFunctionLength > 200) score -= 35;
  else if (m.maxFunctionLength > 100) score -= 20;
  else if (m.maxFunctionLength > 50) score -= 10;

  if (m.longFunctions > 5) score -= 20;
  else if (m.longFunctions > 2) score -= 10;
  else if (m.longFunctions > 0) score -= 5;

  if (m.duplicateLineRatio > 0.3) score -= 20;
  else if (m.duplicateLineRatio > 0.15) score -= 10;
  else if (m.duplicateLineRatio > 0.05) score -= 5;

  if (m.todoCount > 5) score -= 10;
  else if (m.todoCount > 2) score -= 5;

  if (m.commentLines < m.linesOfCode * 0.03 && m.linesOfCode > 50) score -= 10;

  return clamp(score);
}

function scoreStyle(m: Metrics): number {
  let score = 100;
  if (m.longLines > 20) score -= 20;
  else if (m.longLines > 10) score -= 10;
  else if (m.longLines > 5) score -= 5;

  if (m.magicNumbers > 10) score -= 15;
  else if (m.magicNumbers > 5) score -= 8;

  if (m.globalVariables > 5) score -= 15;
  else if (m.globalVariables > 2) score -= 8;

  return clamp(score);
}

function scoreBugRisk(m: Metrics): number {
  let score = 100;
  // Lack of error handling is a risk
  if (m.errorHandlingCount === 0 && m.functionCount > 2) score -= 25;
  else if (m.errorHandlingCount < m.functionCount * 0.1) score -= 15;

  if (m.cyclomaticComplexity > 30) score -= 20;
  else if (m.cyclomaticComplexity > 15) score -= 10;

  if (m.maxNestingDepth > 6) score -= 20;
  else if (m.maxNestingDepth > 4) score -= 10;

  if (m.globalVariables > 3) score -= 10;

  return clamp(score);
}

export function computeScores(m: Metrics): AnalysisResult['breakdown'] & { overall: number } {
  const complexity = scoreComplexity(m);
  const maintainability = scoreMaintainability(m);
  const style = scoreStyle(m);
  const bugRisk = scoreBugRisk(m);

  const overall = Math.round(complexity * 0.3 + maintainability * 0.3 + style * 0.2 + bugRisk * 0.2);

  return { complexity, maintainability, style, bugRisk, overall };
}

export function getBugRisk(scores: ReturnType<typeof computeScores>): 'Low' | 'Medium' | 'High' {
  const riskScore = (100 - scores.bugRisk) * 0.5 +
    (100 - scores.complexity) * 0.3 +
    (100 - scores.maintainability) * 0.2;

  if (riskScore > 45) return 'High';
  if (riskScore > 22) return 'Medium';
  return 'Low';
}

// ─── Smart Insights ──────────────────────────────────────────

export function generateInsights(m: Metrics, lang: Language): Insight[] {
  const insights: Insight[] = [];

  // Complexity insights
  if (m.cyclomaticComplexity > 50) {
    insights.push({
      severity: 'critical', category: 'complexity',
      message: `Cyclomatic complexity is extremely high (${m.cyclomaticComplexity})`,
      detail: 'Scores above 50 indicate code that is extremely difficult to test and maintain. Consider splitting into smaller, focused functions.',
    });
  } else if (m.cyclomaticComplexity > 20) {
    insights.push({
      severity: 'warning', category: 'complexity',
      message: `High cyclomatic complexity detected (${m.cyclomaticComplexity})`,
      detail: 'Complexity above 20 significantly increases the likelihood of bugs. Each branching path is another case to test and maintain.',
    });
  } else if (m.cyclomaticComplexity > 10) {
    insights.push({
      severity: 'info', category: 'complexity',
      message: `Moderate complexity (${m.cyclomaticComplexity})`,
      detail: 'Code has acceptable complexity, but watch for growth. Aim to keep it under 10 for maximum maintainability.',
    });
  }

  // Nesting depth insights
  if (m.maxNestingDepth > 6) {
    insights.push({
      severity: 'critical', category: 'maintainability',
      message: `Nesting depth of ${m.maxNestingDepth} levels detected`,
      detail: 'Deep nesting (>6) makes code extremely hard to read and reason about. Use early returns, guard clauses, or extract nested logic into functions.',
    });
  } else if (m.maxNestingDepth > 4) {
    insights.push({
      severity: 'warning', category: 'maintainability',
      message: `High nesting depth (${m.maxNestingDepth} levels) → harder to maintain`,
      detail: 'Nesting beyond 3-4 levels hurts readability. Consider flattening logic with early returns or helper functions.',
    });
  } else if (m.maxNestingDepth > 3) {
    insights.push({
      severity: 'info', category: 'maintainability',
      message: `Nesting reaches ${m.maxNestingDepth} levels in some places`,
      detail: 'Minor nesting issues. Keeping nesting ≤3 is ideal for long-term maintainability.',
    });
  }

  // Function length insights
  if (m.maxFunctionLength > 150) {
    insights.push({
      severity: 'critical', category: 'bugRisk',
      message: `A function is ${m.maxFunctionLength} lines long — very high bug risk`,
      detail: 'Functions exceeding 150 lines are notoriously hard to test and debug. Break it into smaller single-purpose functions.',
    });
  } else if (m.maxFunctionLength > 50) {
    insights.push({
      severity: 'warning', category: 'bugRisk',
      message: `Function exceeds 50 lines → potential bug risk`,
      detail: `Longest function is ${m.maxFunctionLength} lines. Functions over 50 lines tend to do too many things. Aim for 20-30 lines max.`,
    });
  }

  if (m.longFunctions > 3) {
    insights.push({
      severity: 'warning', category: 'maintainability',
      message: `${m.longFunctions} functions exceed recommended length`,
      detail: 'Multiple long functions suggest systematic design issues. Apply the Single Responsibility Principle.',
    });
  }

  // Conditionals
  if (m.conditionalCount > 25) {
    insights.push({
      severity: 'critical', category: 'complexity',
      message: `Too many conditionals (${m.conditionalCount}) → complexity spike`,
      detail: 'Excessive conditional statements make code hard to follow and test. Consider state machines, polymorphism, or lookup tables.',
    });
  } else if (m.conditionalCount > 15) {
    insights.push({
      severity: 'warning', category: 'complexity',
      message: `High conditional count (${m.conditionalCount}) adds cognitive load`,
      detail: 'Many branches increase test surface area. Look for opportunities to simplify or consolidate conditions.',
    });
  }

  // Error handling
  if (m.errorHandlingCount === 0 && m.functionCount > 2) {
    insights.push({
      severity: 'critical', category: 'bugRisk',
      message: 'No error handling detected — runtime failures may crash silently',
      detail: 'Missing try/catch, exceptions, or error returns means failures go unhandled. Add defensive error handling for robustness.',
    });
  } else if (m.errorHandlingCount < m.functionCount * 0.15 && m.functionCount > 5) {
    insights.push({
      severity: 'warning', category: 'bugRisk',
      message: 'Sparse error handling relative to code size',
      detail: `Only ${m.errorHandlingCount} error handling constructs for ${m.functionCount} functions. Consider adding more defensive patterns.`,
    });
  }

  // Duplicate code
  if (m.duplicateLineRatio > 0.25) {
    insights.push({
      severity: 'critical', category: 'maintainability',
      message: `${Math.round(m.duplicateLineRatio * 100)}% code duplication detected`,
      detail: 'Significant duplication means bug fixes must be applied in multiple places. Extract into shared functions or utilities.',
    });
  } else if (m.duplicateLineRatio > 0.1) {
    insights.push({
      severity: 'warning', category: 'maintainability',
      message: `~${Math.round(m.duplicateLineRatio * 100)}% duplicate lines found`,
      detail: 'Moderate duplication. Refactoring repeated patterns into reusable functions improves consistency.',
    });
  }

  // TODOs
  if (m.todoCount > 5) {
    insights.push({
      severity: 'warning', category: 'maintainability',
      message: `${m.todoCount} TODO/FIXME comments indicate unfinished work`,
      detail: 'High TODO density suggests incomplete implementation. Address these before production deployment.',
    });
  } else if (m.todoCount > 0) {
    insights.push({
      severity: 'info', category: 'maintainability',
      message: `${m.todoCount} TODO/FIXME comment${m.todoCount > 1 ? 's' : ''} found`,
      detail: 'Minor: remember to address these before shipping.',
    });
  }

  // Magic numbers
  if (m.magicNumbers > 8) {
    insights.push({
      severity: 'warning', category: 'style',
      message: `${m.magicNumbers} magic numbers found — reduce with named constants`,
      detail: "Unexplained numbers make code hard to understand. Replace with named constants like MAX_RETRIES = 3.",
    });
  }

  // Long lines
  if (m.longLines > 15) {
    insights.push({
      severity: 'info', category: 'style',
      message: `${m.longLines} lines exceed 100 characters`,
      detail: 'Long lines hurt readability on standard screens. Break up complex expressions or enable line wrapping.',
    });
  }

  // Global variables
  if (m.globalVariables > 4) {
    insights.push({
      severity: 'warning', category: 'bugRisk',
      message: `${m.globalVariables} global variables detected → state management risk`,
      detail: 'Globals make behavior hard to predict and test. Prefer encapsulated state or dependency injection.',
    });
  }

  // Documentation
  const commentRatio = m.linesOfCode > 0 ? m.commentLines / m.linesOfCode : 0;
  if (commentRatio < 0.03 && m.linesOfCode > 60) {
    insights.push({
      severity: 'info', category: 'style',
      message: 'Low comment density — consider adding documentation',
      detail: `Only ${Math.round(commentRatio * 100)}% of lines are comments. Public functions and complex logic benefit from documentation.`,
    });
  } else if (commentRatio > 0.4) {
    insights.push({
      severity: 'info', category: 'style',
      message: 'Very high comment ratio — ensure comments add value',
      detail: 'Overly commented code can be a sign of unclear naming. Good variable/function names can replace many comments.',
    });
  }

  // Positive signals
  if (
    m.cyclomaticComplexity <= 10 &&
    m.maxNestingDepth <= 3 &&
    m.maxFunctionLength <= 40 &&
    m.errorHandlingCount > 0
  ) {
    insights.push({
      severity: 'info', category: 'style',
      message: '✓ Well-structured code with good practices',
      detail: 'Low complexity, shallow nesting, concise functions, and error handling are hallmarks of maintainable code.',
    });
  }

  // Sort: critical first, then warning, then info
  const order = { critical: 0, warning: 1, info: 2 };
  return insights.sort((a, b) => order[a.severity] - order[b.severity]);
}

// ─── Main Entry ──────────────────────────────────────────────

export function analyzeCode(code: string, hintLang?: string): AnalysisResult {
  const lang = (hintLang as Language) || detectLanguage(code);
  const metrics = extractMetrics(code, lang);
  const scores = computeScores(metrics);
  const bugRisk = getBugRisk(scores);
  const insights = generateInsights(metrics, lang);

  return {
    language: lang,
    languageLabel: LANG_LABELS[lang],
    metrics,
    qualityScore: scores.overall,
    bugRisk,
    insights,
    breakdown: {
      complexity: scores.complexity,
      maintainability: scores.maintainability,
      style: scores.style,
      bugRisk: scores.bugRisk,
    },
  };
}
