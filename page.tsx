'use client';

import { useState, useCallback, useRef } from 'react';
import type { AnalysisResult } from '@/lib/analyzer';
import { useHistory } from '@/lib/useHistory';
import type { HistoryEntry } from '@/lib/useHistory';
import HistoryPanel from '@/components/HistoryPanel';
import AnalysisSkeleton from '@/components/AnalysisSkeleton';
import {
  Code2, Github, Zap, AlertTriangle, CheckCircle, XCircle,
  ChevronDown, RotateCcw, Copy, Activity,
  Layers, GitBranch, Hash, FileCode, Info, AlertCircle,
  TrendingUp, Loader2, Check, Download,
} from 'lucide-react';

type Mode = 'code' | 'github';

interface RepoResult extends AnalysisResult {
  repoInfo?: {
    owner: string;
    repo: string;
    filesAnalyzed: number;
    filePaths: string[];
  };
}

const SAMPLE_CODES: Record<string, { label: string; lang: string; code: string }> = {
  js_bad: {
    label: 'Messy JS',
    lang: 'javascript',
    code: `function processUserData(users) {
  let result = [];
  for (let i = 0; i < users.length; i++) {
    if (users[i].age > 18) {
      if (users[i].status === 'active') {
        if (users[i].role === 'admin') {
          if (users[i].permissions.includes('write')) {
            try {
              result.push({
                id: users[i].id,
                name: users[i].name,
                score: users[i].age * 1.5 + 22.7
              });
            } catch(e) {}
          }
        }
      }
    }
  }
  // TODO: fix this later
  // TODO: add validation
  return result;
}

function processUserData2(users) {
  let result = [];
  for (let i = 0; i < users.length; i++) {
    if (users[i].age > 18) {
      if (users[i].status === 'active') {
        result.push(users[i]);
      }
    }
  }
  return result;
}`,
  },
  py_clean: {
    label: 'Clean Python',
    lang: 'python',
    code: `"""User data processing module."""
from typing import List
from dataclasses import dataclass


@dataclass
class User:
    """Represents an application user."""
    id: int
    name: str
    age: int
    role: str
    status: str

    @property
    def is_adult(self) -> bool:
        return self.age >= 18

    @property
    def is_active(self) -> bool:
        return self.status == "active"


def filter_active_adults(users: List[User]) -> List[User]:
    """Return only active adult users."""
    return [u for u in users if u.is_adult and u.is_active]


def get_admin_users(users: List[User]) -> List[User]:
    """Return users with admin role."""
    active = filter_active_adults(users)
    return [u for u in active if u.role == "admin"]`,
  },
  go_medium: {
    label: 'Go snippet',
    lang: 'go',
    code: `package main

import (
    "fmt"
    "errors"
)

type User struct {
    ID    int
    Name  string
    Age   int
    Admin bool
}

var ErrNotFound = errors.New("user not found")
var ErrUnauthorized = errors.New("unauthorized")

func FindAdminByID(users []User, id int) (*User, error) {
    for _, u := range users {
        if u.ID == id {
            if !u.Admin {
                return nil, ErrUnauthorized
            }
            return &u, nil
        }
    }
    return nil, ErrNotFound
}

func main() {
    users := []User{
        {1, "Alice", 30, true},
        {2, "Bob", 25, false},
    }
    user, err := FindAdminByID(users, 1)
    if err != nil {
        fmt.Println("Error:", err)
        return
    }
    fmt.Println("Found admin:", user.Name)
}`,
  },
};

const LANGUAGES = [
  { value: '', label: 'Auto Detect' },
  { value: 'javascript', label: 'JavaScript' },
  { value: 'typescript', label: 'TypeScript' },
  { value: 'python', label: 'Python' },
  { value: 'c', label: 'C' },
  { value: 'cpp', label: 'C++' },
  { value: 'java', label: 'Java' },
  { value: 'go', label: 'Go' },
  { value: 'rust', label: 'Rust' },
  { value: 'csharp', label: 'C#' },
  { value: 'ruby', label: 'Ruby' },
  { value: 'php', label: 'PHP' },
  { value: 'swift', label: 'Swift' },
  { value: 'kotlin', label: 'Kotlin' },
  { value: 'html', label: 'HTML' },
  { value: 'css', label: 'CSS' },
  { value: 'bash', label: 'Bash' },
  { value: 'lua', label: 'Lua' },
  { value: 'r', label: 'R' },
];

function exportMarkdown(result: RepoResult): string {
  const date = new Date().toISOString().slice(0, 10);
  return `# CodeLens Report — ${date}

## Summary
- **Language**: ${result.languageLabel}
- **Quality Score**: ${result.qualityScore}/100
- **Bug Risk**: ${result.bugRisk}
${result.repoInfo ? `- **Repository**: ${result.repoInfo.owner}/${result.repoInfo.repo} (${result.repoInfo.filesAnalyzed} files)\n` : ''}
## Score Breakdown
| Dimension | Score |
|---|---|
| Complexity | ${result.breakdown.complexity}/100 |
| Maintainability | ${result.breakdown.maintainability}/100 |
| Code Style | ${result.breakdown.style}/100 |
| Bug Safety | ${result.breakdown.bugRisk}/100 |

## Metrics
| Metric | Value |
|---|---|
| Lines of Code | ${result.metrics.linesOfCode} |
| Cyclomatic Complexity | ${result.metrics.cyclomaticComplexity} |
| Max Nesting Depth | ${result.metrics.maxNestingDepth} |
| Function Count | ${result.metrics.functionCount} |
| Avg Function Length | ${result.metrics.avgFunctionLength} lines |
| Max Function Length | ${result.metrics.maxFunctionLength} lines |
| Conditionals | ${result.metrics.conditionalCount} |
| Error Handling | ${result.metrics.errorHandlingCount} |
| TODOs/FIXMEs | ${result.metrics.todoCount} |
| Magic Numbers | ${result.metrics.magicNumbers} |
| Long Lines (>100ch) | ${result.metrics.longLines} |
| Duplicate Line Ratio | ${Math.round(result.metrics.duplicateLineRatio * 100)}% |

## Insights
${result.insights.map(i => `### [${i.severity.toUpperCase()}] ${i.message}\n_Category: ${i.category}_\n\n${i.detail}`).join('\n\n')}
`;
}

function downloadText(text: string, filename: string) {
  const blob = new Blob([text], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

// ── Sub-components ──────────────────────────────────────────

function ScoreRing({ score }: { score: number }) {
  const r = 52;
  const circ = 2 * Math.PI * r;
  const color = score >= 75 ? '#22c55e' : score >= 50 ? '#f59e0b' : '#ef4444';
  const label = score >= 75 ? 'Excellent' : score >= 60 ? 'Good' : score >= 40 ? 'Fair' : 'Poor';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg width="136" height="136" viewBox="0 0 136 136" style={{ transform: 'rotate(-90deg)' }}>
          <circle cx="68" cy="68" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="10" />
          <circle
            cx="68" cy="68" r={r} fill="none" stroke={color}
            strokeWidth="10" strokeLinecap="round"
            strokeDasharray={`${(score / 100) * circ} ${circ}`}
            style={{ filter: `drop-shadow(0 0 8px ${color}88)`, transition: 'stroke-dasharray 1.2s cubic-bezier(0.4,0,0.2,1)' }}
          />
        </svg>
        <div style={{ position: 'absolute', textAlign: 'center' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '2.2rem', fontWeight: 800, color, lineHeight: 1, filter: `drop-shadow(0 0 12px ${color}66)` }}>
            {score}
          </div>
          <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px', letterSpacing: '0.1em' }}>/ 100</div>
        </div>
      </div>
      <span style={{ fontSize: '12px', fontWeight: 600, color, padding: '3px 11px', borderRadius: '20px', background: `${color}14`, border: `1px solid ${color}28` }}>
        {label}
      </span>
    </div>
  );
}

function RiskBadge({ risk }: { risk: 'Low' | 'Medium' | 'High' }) {
  const cfg = {
    Low: { color: '#22c55e', bg: 'rgba(34,197,94,0.1)', border: 'rgba(34,197,94,0.2)', icon: CheckCircle, desc: 'Code is stable and production-ready.' },
    Medium: { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.2)', icon: AlertTriangle, desc: 'Some patterns may cause bugs. Review insights.' },
    High: { color: '#ef4444', bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.2)', icon: XCircle, desc: 'High-risk patterns found. Refactoring recommended.' },
  }[risk];
  const Icon = cfg.icon;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '9px 16px',
        borderRadius: '9px', background: cfg.bg, border: `1px solid ${cfg.border}`,
        color: cfg.color, fontFamily: 'var(--font-display)', fontSize: '15px', fontWeight: 700,
        filter: `drop-shadow(0 0 10px ${cfg.color}44)`, width: 'fit-content',
      }}>
        <Icon size={17} /> {risk} Risk
      </div>
      <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.55 }}>{cfg.desc}</p>
    </div>
  );
}

function MetricCard({ label, value, unit = '', icon: Icon, note, highlight }: {
  label: string; value: string | number; unit?: string;
  icon: React.ElementType; note?: string; highlight?: 'good' | 'warn' | 'bad';
}) {
  const hColor = highlight === 'good' ? '#22c55e' : highlight === 'warn' ? '#f59e0b' : highlight === 'bad' ? '#ef4444' : undefined;
  return (
    <div className="card-elevated" style={{ padding: '15px', display: 'flex', flexDirection: 'column', gap: '7px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '7px', color: 'var(--text-muted)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
        <Icon size={11} />{label}
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', fontWeight: 700, color: hColor || 'var(--text-primary)' }}>{value}</span>
        {unit && <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{unit}</span>}
      </div>
      {note && <div style={{ fontSize: '11px', color: hColor || 'var(--text-muted)' }}>{note}</div>}
    </div>
  );
}

function ScoreBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
        <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
        <span style={{ color, fontWeight: 600, fontFamily: 'var(--font-mono)', fontSize: '11px' }}>{value}</span>
      </div>
      <div style={{ height: '5px', background: 'rgba(255,255,255,0.06)', borderRadius: '3px', overflow: 'hidden' }}>
        <div style={{ height: '100%', borderRadius: '3px', background: `linear-gradient(90deg,${color}66,${color})`, width: `${value}%`, transition: 'width 1.2s cubic-bezier(0.4,0,0.2,1)', boxShadow: `0 0 6px ${color}66` }} />
      </div>
    </div>
  );
}

function InsightCard({ insight, index }: { insight: AnalysisResult['insights'][0]; index: number }) {
  const cfg = {
    critical: { color: '#ef4444', bg: 'rgba(239,68,68,0.06)', border: 'rgba(239,68,68,0.15)', icon: XCircle },
    warning:  { color: '#f59e0b', bg: 'rgba(245,158,11,0.06)', border: 'rgba(245,158,11,0.15)', icon: AlertCircle },
    info:     { color: '#6c63ff', bg: 'rgba(108,99,255,0.06)', border: 'rgba(108,99,255,0.15)', icon: Info },
  }[insight.severity];
  const Icon = cfg.icon;
  const catColors: Record<string, string> = { complexity: '#6c63ff', maintainability: '#3b82f6', bugRisk: '#ef4444', style: '#f59e0b', performance: '#22c55e' };
  return (
    <div className="animate-fade-up" style={{ animationDelay: `${index * 45}ms`, opacity: 0, padding: '13px 15px', borderRadius: '9px', background: cfg.bg, border: `1px solid ${cfg.border}`, display: 'flex', gap: '11px' }}>
      <div style={{ paddingTop: '2px', flexShrink: 0 }}><Icon size={14} color={cfg.color} /></div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '4px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>{insight.message}</span>
          <span style={{ fontSize: '10px', padding: '2px 7px', borderRadius: '999px', background: `${catColors[insight.category]}18`, color: catColors[insight.category], border: `1px solid ${catColors[insight.category]}28`, textTransform: 'capitalize', letterSpacing: '0.04em', flexShrink: 0 }}>
            {insight.category}
          </span>
        </div>
        <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.55 }}>{insight.detail}</p>
      </div>
    </div>
  );
}

function CopyButton({ text, label = 'Copy' }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 15px', borderRadius: '7px', border: '1px solid var(--border)', background: 'transparent', color: copied ? '#22c55e' : 'var(--text-secondary)', cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: '12px', transition: 'color 0.2s' }}
    >
      {copied ? <Check size={12} /> : <Copy size={12} />}
      {copied ? 'Copied!' : label}
    </button>
  );
}

// ── Main ────────────────────────────────────────────────────

export default function Home() {
  const [mode, setMode] = useState<Mode>('code');
  const [code, setCode] = useState('');
  const [language, setLanguage] = useState('');
  const [githubUrl, setGithubUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<RepoResult | null>(null);
  const [showAllFiles, setShowAllFiles] = useState(false);
  const [filterSeverity, setFilterSeverity] = useState<'all' | 'critical' | 'warning' | 'info'>('all');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  const { entries, add, clear } = useHistory();

  const analyze = useCallback(async () => {
    setError(''); setLoading(true); setResult(null); setFilterSeverity('all');
    try {
      let data: RepoResult;
      if (mode === 'code') {
        if (!code.trim()) { setError('Please paste some code first.'); setLoading(false); return; }
        const res = await fetch('/api/analyze', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code, language: language || undefined }) });
        data = await res.json();
        if (!res.ok) throw new Error((data as unknown as { error: string }).error || 'Analysis failed');
        add(data, code.trim().split('\n')[0].slice(0, 55) || 'Code snippet');
      } else {
        if (!githubUrl.trim()) { setError('Please enter a GitHub URL.'); setLoading(false); return; }
        const res = await fetch('/api/github', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url: githubUrl }) });
        data = await res.json();
        if (!res.ok) throw new Error((data as unknown as { error: string }).error || 'Failed to fetch repository');
        add(data, data.repoInfo ? `${data.repoInfo.owner}/${data.repoInfo.repo}` : githubUrl);
      }
      setResult(data);
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }, [mode, code, language, githubUrl, add]);

  const reset = () => { setResult(null); setError(''); setCode(''); setGithubUrl(''); setFilterSeverity('all'); window.scrollTo({ top: 0, behavior: 'smooth' }); };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); analyze(); }
    if (e.key === 'Tab' && e.target === textareaRef.current) {
      e.preventDefault();
      const ta = textareaRef.current;
      const s = ta.selectionStart;
      setCode(ta.value.substring(0, s) + '  ' + ta.value.substring(ta.selectionEnd));
      setTimeout(() => { ta.selectionStart = ta.selectionEnd = s + 2; }, 0);
    }
  };

  const filteredInsights = result?.insights.filter(i => filterSeverity === 'all' || i.severity === filterSeverity) ?? [];
  const mh = (val: number, good: number, warn: number): 'good' | 'warn' | 'bad' => val <= good ? 'good' : val <= warn ? 'warn' : 'bad';

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {entries.length > 0 && <HistoryPanel entries={entries} onSelect={(e: HistoryEntry) => { setResult(e.result as RepoResult); setFilterSeverity('all'); setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100); }} onClear={clear} />}

      {/* Header */}
      <header style={{ padding: '16px 28px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', backdropFilter: 'blur(12px)', position: 'sticky', top: 0, zIndex: 100, background: 'rgba(10,10,15,0.9)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '11px' }}>
          <div style={{ width: 33, height: 33, borderRadius: '8px', background: 'linear-gradient(135deg,#6c63ff,#a78bfa)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 18px rgba(108,99,255,0.35)' }}>
            <Activity size={16} color="white" />
          </div>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '15px', fontWeight: 700, letterSpacing: '-0.02em' }}>CodeLens</div>
            <div style={{ fontSize: '9px', color: 'var(--text-muted)', letterSpacing: '0.07em' }}>CODE QUALITY ANALYZER</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexWrap: 'wrap' }}>
          {['JS', 'TS', 'PY', 'Go', 'Rust', 'C++', 'Java', '+11'].map(l => (
            <span key={l} style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '4px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{l}</span>
          ))}
        </div>
      </header>

      <main style={{ flex: 1, maxWidth: 1040, width: '100%', margin: '0 auto', padding: '44px 20px' }}>

        {/* Hero */}
        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', padding: '4px 13px', borderRadius: '20px', marginBottom: '18px', background: 'var(--accent-dim)', border: '1px solid rgba(108,99,255,0.2)', fontSize: '11px', color: 'var(--accent)', letterSpacing: '0.06em' }}>
            <Zap size={10} /> STATIC ANALYSIS · 18 LANGUAGES · INSTANT
          </div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.8rem,5vw,3rem)', fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.1, margin: '0 0 14px', background: 'linear-gradient(135deg,#f0f0f5 40%,#7070a0)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Analyze Code Quality<br />at a Glance
          </h1>
          <p style={{ fontSize: '15px', color: 'var(--text-secondary)', maxWidth: '480px', margin: '0 auto', lineHeight: 1.6 }}>
            Paste code or link a GitHub repo. Get quality scores, bug risk, and actionable insights instantly.
          </p>
        </div>

        {/* Mode Toggle */}
        <div style={{ display: 'flex', gap: '5px', marginBottom: '18px', padding: '4px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '10px', width: 'fit-content' }}>
          {([{ id: 'code' as const, label: 'Paste Code', icon: Code2 }, { id: 'github' as const, label: 'GitHub Repo', icon: Github }]).map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => { setMode(id); setError(''); }}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', borderRadius: '7px', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: '13px', fontWeight: 500, transition: 'all 0.2s', background: mode === id ? 'var(--accent)' : 'transparent', color: mode === id ? 'white' : 'var(--text-secondary)', boxShadow: mode === id ? '0 0 16px rgba(108,99,255,0.35)' : 'none' }}>
              <Icon size={13} />{label}
            </button>
          ))}
        </div>

        {/* Input */}
        <div className="card" style={{ marginBottom: '24px', overflow: 'hidden' }}>
          {mode === 'code' ? (
            <>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 13px', borderBottom: '1px solid var(--border)', background: 'var(--bg-elevated)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {['#ef4444','#f59e0b','#22c55e'].map(c => <div key={c} style={{ width: 9, height: 9, borderRadius: '50%', background: c, opacity: 0.7 }} />)}
                  <span style={{ marginLeft: '7px', fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>editor.{language || 'auto'}</span>
                </div>
                <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                  {Object.entries(SAMPLE_CODES).map(([key, s]) => (
                    <button key={key} onClick={() => { setCode(s.code); setLanguage(s.lang); }} style={{ fontSize: '10px', padding: '2px 7px', borderRadius: '4px', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer' }}>{s.label}</button>
                  ))}
                  <select value={language} onChange={e => setLanguage(e.target.value)} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-secondary)', fontSize: '11px', padding: '3px 7px', borderRadius: '5px', cursor: 'pointer' }}>
                    {LANGUAGES.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
                  </select>
                </div>
              </div>
              <textarea ref={textareaRef} className="code-editor" value={code} onChange={e => setCode(e.target.value)} onKeyDown={handleKeyDown}
                placeholder={"// Paste your code here\n// ⌘+Enter to analyze"}
                style={{ width: '100%', height: '290px', padding: '16px', border: 'none', display: 'block' }}
                spellCheck={false} autoComplete="off" autoCorrect="off" autoCapitalize="off" />
              <div style={{ padding: '7px 13px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', background: 'var(--bg-elevated)' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{code.split('\n').length} lines · {code.length} chars</span>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>⌘+Enter to analyze</span>
              </div>
            </>
          ) : (
            <div style={{ padding: '26px' }}>
              <label style={{ display: 'block', marginBottom: '9px', fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 500 }}>GitHub Repository URL</label>
              <div style={{ position: 'relative' }}>
                <Github size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                <input value={githubUrl} onChange={e => setGithubUrl(e.target.value)} onKeyDown={e => e.key === 'Enter' && analyze()}
                  placeholder="https://github.com/owner/repository"
                  style={{ width: '100%', padding: '10px 12px 10px 36px', background: 'var(--bg-elevated)', border: '1px solid var(--border-strong)', borderRadius: '8px', color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', fontSize: '13px', outline: 'none' }} />
              </div>
              <div style={{ display: 'flex', gap: '6px', marginTop: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Try:</span>
                {['vercel/next.js','pallets/flask','tiangolo/fastapi','golang/go'].map(eg => (
                  <button key={eg} onClick={() => setGithubUrl(`https://github.com/${eg}`)}
                    style={{ fontSize: '11px', padding: '3px 9px', borderRadius: '5px', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', fontFamily: 'var(--font-mono)' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color='var(--accent)'; (e.currentTarget as HTMLElement).style.borderColor='var(--accent)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color='var(--text-muted)'; (e.currentTarget as HTMLElement).style.borderColor='var(--border)'; }}>
                    {eg}
                  </button>
                ))}
              </div>
              <p style={{ marginTop: '10px', fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.5 }}>Analyzes up to 20 code files. Skips <code style={{ fontFamily: 'var(--font-mono)' }}>node_modules</code>, build artifacts. Public repos only.</p>
            </div>
          )}
        </div>

        {/* CTA */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '44px' }}>
          <button onClick={analyze} disabled={loading}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 34px', borderRadius: '9px', border: 'none', background: loading ? 'var(--bg-elevated)' : 'linear-gradient(135deg,#6c63ff,#8b5cf6)', color: loading ? 'var(--text-muted)' : 'white', fontFamily: 'var(--font-display)', fontSize: '14px', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', boxShadow: loading ? 'none' : '0 0 26px rgba(108,99,255,0.35)', transition: 'all 0.2s' }}
            onMouseEnter={e => { if (!loading) { (e.currentTarget as HTMLElement).style.transform='translateY(-2px)'; (e.currentTarget as HTMLElement).style.boxShadow='0 0 38px rgba(108,99,255,0.5)'; }}}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform=''; (e.currentTarget as HTMLElement).style.boxShadow=loading?'none':'0 0 26px rgba(108,99,255,0.35)'; }}>
            {loading ? <><Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> Analyzing…</> : <><Zap size={15} /> Analyze Code</>}
          </button>
        </div>

        {/* Error */}
        {error && (
          <div style={{ padding: '12px 15px', borderRadius: '8px', marginBottom: '24px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '9px' }}>
            <XCircle size={14} />{error}
          </div>
        )}

        {loading && <AnalysisSkeleton />}

        {/* Results */}
        {result && !loading && (
          <div ref={resultRef} style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>

            {/* Repo banner */}
            {result.repoInfo && (
              <div className="card animate-fade-up" style={{ padding: '13px 17px', display: 'flex', alignItems: 'center', gap: '9px', flexWrap: 'wrap', opacity: 0 }}>
                <Github size={14} color="var(--text-muted)" />
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', color: 'var(--text-secondary)' }}>{result.repoInfo.owner}/{result.repoInfo.repo}</span>
                <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '5px', background: 'var(--accent-dim)', color: 'var(--accent)', border: '1px solid rgba(108,99,255,0.18)' }}>{result.repoInfo.filesAnalyzed} files</span>
                <button onClick={() => setShowAllFiles(v => !v)} style={{ marginLeft: 'auto', fontSize: '11px', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  {showAllFiles ? 'Hide' : 'Show'} files <ChevronDown size={10} style={{ transform: showAllFiles ? 'rotate(180deg)' : 'none', transition: '0.2s' }} />
                </button>
                {showAllFiles && (
                  <div style={{ width: '100%', display: 'flex', flexWrap: 'wrap', gap: '5px', marginTop: '6px' }}>
                    {result.repoInfo.filePaths.map(p => (
                      <span key={p} style={{ fontSize: '10px', padding: '2px 7px', borderRadius: '4px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{p}</span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Top cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: '16px' }}>
              <div className="card animate-fade-up" style={{ padding: '26px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', animationDelay: '0ms', opacity: 0 }}>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', alignSelf: 'flex-start' }}>Quality Score</div>
                <ScoreRing score={result.qualityScore} />
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Detected: <span style={{ color: 'var(--accent)', fontFamily: 'var(--font-mono)' }}>{result.languageLabel}</span></div>
              </div>

              <div className="card animate-fade-up" style={{ padding: '26px', display: 'flex', flexDirection: 'column', gap: '16px', animationDelay: '70ms', opacity: 0 }}>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Bug Risk</div>
                <RiskBadge risk={result.bugRisk} />
                <div style={{ display: 'flex', gap: '14px', fontSize: '12px' }}>
                  {(['critical','warning','info'] as const).map(sev => {
                    const count = result.insights.filter(i => i.severity === sev).length;
                    const c = { critical: '#ef4444', warning: '#f59e0b', info: '#6c63ff' }[sev];
                    return <div key={sev} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><div style={{ width: 6, height: 6, borderRadius: '50%', background: c }} /><span style={{ color: 'var(--text-muted)' }}>{count} {sev}</span></div>;
                  })}
                </div>
              </div>

              <div className="card animate-fade-up" style={{ padding: '26px', display: 'flex', flexDirection: 'column', gap: '16px', animationDelay: '140ms', opacity: 0 }}>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Score Breakdown</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <ScoreBar label="Complexity" value={result.breakdown.complexity} color="#6c63ff" />
                  <ScoreBar label="Maintainability" value={result.breakdown.maintainability} color="#3b82f6" />
                  <ScoreBar label="Code Style" value={result.breakdown.style} color="#f59e0b" />
                  <ScoreBar label="Bug Safety" value={result.breakdown.bugRisk} color="#22c55e" />
                </div>
              </div>
            </div>

            {/* Metrics */}
            <div>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '12px', fontWeight: 700, marginBottom: '12px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                <TrendingUp size={12} /> Metrics
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(148px,1fr))', gap: '9px' }}>
                <MetricCard label="Lines of Code" value={result.metrics.linesOfCode} icon={FileCode} />
                <MetricCard label="Complexity" value={result.metrics.cyclomaticComplexity} icon={GitBranch} highlight={mh(result.metrics.cyclomaticComplexity,10,20)} note={result.metrics.cyclomaticComplexity>20?'High':result.metrics.cyclomaticComplexity>10?'Moderate':'Good ✓'} />
                <MetricCard label="Nesting Depth" value={result.metrics.maxNestingDepth} unit="lvls" icon={Layers} highlight={mh(result.metrics.maxNestingDepth,3,5)} note={result.metrics.maxNestingDepth>5?'Too deep':result.metrics.maxNestingDepth>3?'Watch':'Shallow ✓'} />
                <MetricCard label="Functions" value={result.metrics.functionCount} icon={Code2} />
                <MetricCard label="Avg Fn Length" value={result.metrics.avgFunctionLength} unit="ln" icon={Activity} highlight={mh(result.metrics.avgFunctionLength,30,60)} />
                <MetricCard label="Max Fn Length" value={result.metrics.maxFunctionLength} unit="ln" icon={Activity} highlight={mh(result.metrics.maxFunctionLength,50,100)} />
                <MetricCard label="Conditionals" value={result.metrics.conditionalCount} icon={GitBranch} highlight={mh(result.metrics.conditionalCount,15,25)} />
                <MetricCard label="Error Handling" value={result.metrics.errorHandlingCount} icon={AlertTriangle} highlight={result.metrics.errorHandlingCount===0&&result.metrics.functionCount>2?'bad':'good'} note={result.metrics.errorHandlingCount===0&&result.metrics.functionCount>2?'None found!':undefined} />
                <MetricCard label="Comment Lines" value={result.metrics.commentLines} icon={Hash} note={`${Math.round(result.metrics.commentLines/Math.max(result.metrics.linesOfCode,1)*100)}% ratio`} />
                <MetricCard label="Magic Numbers" value={result.metrics.magicNumbers} icon={Hash} highlight={mh(result.metrics.magicNumbers,5,10)} />
                <MetricCard label="TODOs/FIXMEs" value={result.metrics.todoCount} icon={AlertCircle} highlight={result.metrics.todoCount>5?'warn':result.metrics.todoCount>0?undefined:'good'} />
                <MetricCard label="Long Lines" value={result.metrics.longLines} unit=">100ch" icon={FileCode} highlight={mh(result.metrics.longLines,5,15)} />
              </div>
            </div>

            {/* Insights */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px', textTransform: 'uppercase', letterSpacing: '0.08em', margin: 0 }}>
                  <Zap size={12} /> Insights
                </h2>
                <span style={{ fontSize: '10px', padding: '2px 7px', borderRadius: '5px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>{result.insights.length} total</span>
                <div style={{ marginLeft: 'auto', display: 'flex', gap: '4px' }}>
                  {(['all','critical','warning','info'] as const).map(sev => {
                    const counts: Record<string,number> = { all: result.insights.length, critical: result.insights.filter(i=>i.severity==='critical').length, warning: result.insights.filter(i=>i.severity==='warning').length, info: result.insights.filter(i=>i.severity==='info').length };
                    const c: Record<string,string> = { all:'var(--accent)', critical:'#ef4444', warning:'#f59e0b', info:'#6c63ff' };
                    const active = filterSeverity === sev;
                    return (
                      <button key={sev} onClick={() => setFilterSeverity(sev)} style={{ fontSize: '10px', padding: '3px 9px', borderRadius: '5px', border: `1px solid ${active?c[sev]:'var(--border)'}`, background: active?`${c[sev]}18`:'transparent', color: active?c[sev]:'var(--text-muted)', cursor: 'pointer', textTransform: 'capitalize' }}>
                        {sev === 'all' ? 'All' : `${counts[sev]} ${sev}`}
                      </button>
                    );
                  })}
                </div>
              </div>
              {filteredInsights.length === 0 ? (
                <div className="card" style={{ padding: '28px', textAlign: 'center' }}>
                  <CheckCircle size={26} style={{ margin: '0 auto 9px', color: '#22c55e' }} />
                  <div style={{ fontSize: '14px', fontWeight: 600, color: '#22c55e', marginBottom: '5px' }}>{filterSeverity === 'all' ? 'No issues found!' : `No ${filterSeverity} issues`}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{filterSeverity === 'all' ? 'Excellent code quality.' : 'Try another filter.'}</div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                  {filteredInsights.map((insight, i) => <InsightCard key={i} insight={insight} index={i} />)}
                </div>
              )}
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '8px', paddingTop: '16px', flexWrap: 'wrap', borderTop: '1px solid var(--border)' }}>
              <button onClick={reset} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 15px', borderRadius: '7px', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: '12px' }}>
                <RotateCcw size={12} /> Analyze New
              </button>
              <CopyButton text={exportMarkdown(result)} label="Copy Report" />
              <button onClick={() => downloadText(exportMarkdown(result), 'codelens-report.md')} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 15px', borderRadius: '7px', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: '12px' }}>
                <Download size={12} /> Export .md
              </button>
              <CopyButton text={JSON.stringify(result, null, 2)} label="Copy JSON" />
            </div>
          </div>
        )}
      </main>

      <footer style={{ padding: '18px 20px', textAlign: 'center', borderTop: '1px solid var(--border)', color: 'var(--text-muted)', fontSize: '11px' }}>
        CodeLens — Static analysis for 18 languages · Code never leaves your browser
      </footer>

      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
