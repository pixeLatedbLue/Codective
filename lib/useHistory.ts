'use client';

import { useState, useEffect, useCallback } from 'react';
import type { AnalysisResult } from '@/lib/analyzer';

export interface HistoryEntry {
  id: string;
  timestamp: number;
  label: string;
  language: string;
  qualityScore: number;
  bugRisk: 'Low' | 'Medium' | 'High';
  result: AnalysisResult;
}

const KEY = 'codelens_history';
const MAX_ENTRIES = 10;

function load(): HistoryEntry[] {
  if (typeof window === 'undefined') return [];
  try { return JSON.parse(sessionStorage.getItem(KEY) || '[]'); }
  catch { return []; }
}

function save(entries: HistoryEntry[]) {
  if (typeof window === 'undefined') return;
  try { sessionStorage.setItem(KEY, JSON.stringify(entries)); } catch {}
}

export function useHistory() {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  useEffect(() => { setEntries(load()); }, []);
  const add = useCallback((result: AnalysisResult, label: string) => {
    const entry: HistoryEntry = {
      id: Math.random().toString(36).slice(2),
      timestamp: Date.now(),
      label: label.slice(0, 60),
      language: result.languageLabel,
      qualityScore: result.qualityScore,
      bugRisk: result.bugRisk,
      result,
    };
    setEntries(prev => {
      const next = [entry, ...prev].slice(0, MAX_ENTRIES);
      save(next);
      return next;
    });
    return entry.id;
  }, []);
  const clear = useCallback(() => { setEntries([]); save([]); }, []);
  return { entries, add, clear };
}