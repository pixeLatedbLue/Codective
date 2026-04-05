import { NextRequest, NextResponse } from 'next/server';
import { parseGitHubUrl, fetchRepoFiles, aggregateFilesForAnalysis } from '@/lib/github';
import { analyzeCode } from '@/lib/analyzer';

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();
    if (!url) {
      return NextResponse.json({ error: 'No URL provided' }, { status: 400 });
    }
    const info = parseGitHubUrl(url);
    if (!info) {
      return NextResponse.json(
        { error: 'Invalid GitHub URL. Use format: https://github.com/owner/repo' },
        { status: 400 }
      );
    }
    const files = await fetchRepoFiles(info);
    if (files.length === 0) {
      return NextResponse.json({ error: 'No code files found in repository' }, { status: 404 });
    }
    const code = aggregateFilesForAnalysis(files);
    const result = analyzeCode(code);
    return NextResponse.json({
      ...result,
      repoInfo: {
        owner: info.owner,
        repo: info.repo,
        filesAnalyzed: files.length,
        filePaths: files.map(f => f.path),
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to fetch repository';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}