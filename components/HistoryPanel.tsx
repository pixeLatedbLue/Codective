'use client';

import { Clock, Trash2, ChevronRight } from 'lucide-react';
import type { HistoryEntry } from '@/lib/useHistory';

interface Props {
  entries: HistoryEntry[];
  onSelect: (entry: HistoryEntry) => void;
  onClear: () => void;
}

const RISK_COLOR = { Low: '#22c55e', Medium: '#f59e0b', High: '#ef4444' };
const SCORE_COLOR = (s: number) => s >= 75 ? '#22c55e' : s >= 50 ? '#f59e0b' : '#ef4444';

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function HistoryPanel({ entries, onSelect, onClear }: Props) {
  if (entries.length === 0) return null;

  return (
    <div style={{
      position: 'fixed', right: '24px', top: '88px', width: '260px',
      background: 'var(--bg-card)', border: '1px solid var(--border)',
      borderRadius: '12px', overflow: 'hidden', zIndex: 50,
      boxShadow: '0 8px 40px rgba(0,0,0,0.4)',
    }}>
      <div style={{
        padding: '12px 16px',
        borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          <Clock size={12} /> Recent
        </div>
        <button
          onClick={onClear}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '2px' }}
          title="Clear history"
        >
          <Trash2 size={12} />
        </button>
      </div>

      <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
        {entries.map((e, i) => (
          <button
            key={e.id}
            onClick={() => onSelect(e)}
            style={{
              width: '100%', padding: '12px 16px', border: 'none',
              background: 'transparent', cursor: 'pointer', textAlign: 'left',
              borderBottom: i < entries.length - 1 ? '1px solid var(--border)' : 'none',
              display: 'flex', alignItems: 'center', gap: '10px',
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-elevated)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            {/* Score dot */}
            <div style={{
              width: 32, height: 32, borderRadius: '8px', flexShrink: 0,
              background: `${SCORE_COLOR(e.qualityScore)}18`,
              border: `1px solid ${SCORE_COLOR(e.qualityScore)}33`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'var(--font-display)', fontSize: '12px', fontWeight: 700,
              color: SCORE_COLOR(e.qualityScore),
            }}>
              {e.qualityScore}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: '13px', color: 'var(--text-primary)', fontWeight: 500,
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                marginBottom: '2px',
              }}>
                {e.label}
              </div>
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                  {e.language}
                </span>
                <span style={{ fontSize: '10px', color: RISK_COLOR[e.bugRisk] }}>
                  {e.bugRisk} Risk
                </span>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
              <ChevronRight size={12} color="var(--text-muted)" />
              <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{timeAgo(e.timestamp)}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
