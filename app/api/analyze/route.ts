import { NextRequest, NextResponse } from 'next/server';
import { analyzeCode } from '@/lib/analyzer';

export async function POST(req: NextRequest) {
  try {
    const { code, language } = await req.json();
    if (!code || typeof code !== 'string') {
      return NextResponse.json({ error: 'No code provided' }, { status: 400 });
    }
    if (code.trim().length < 5) {
      return NextResponse.json({ error: 'Code is too short to analyze' }, { status: 400 });
    }
    const result = analyzeCode(code, language);
    return NextResponse.json(result);
  } catch (err) {
    console.error('Analysis error:', err);
    return NextResponse.json({ error: 'Analysis failed' }, { status: 500 });
  }
}