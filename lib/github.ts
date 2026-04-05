export interface GitHubFile {
  path: string;
  content: string;
  language?: string;
}

export interface RepoInfo {
  owner: string;
  repo: string;
  branch?: string;
}

const CODE_EXTENSIONS = new Set([
  'js', 'ts', 'jsx', 'tsx', 'py', 'c', 'cpp', 'cc', 'cxx', 'h', 'hpp',
  'java', 'go', 'rs', 'cs', 'rb', 'php', 'swift', 'kt', 'lua', 'r',
  'sh', 'bash', 'html', 'css', 'scss', 'less',
]);

const MAX_FILES = 20;
const MAX_FILE_SIZE = 50_000;

export function parseGitHubUrl(url: string): RepoInfo | null {
  try {
    const cleaned = url.trim().replace(/\.git$/, '');
    const patterns = [
      /github\.com\/([^/]+)\/([^/\s?#]+)(?:\/tree\/([^/\s?#]+))?/,
      /^([^/]+)\/([^/\s]+)$/,
    ];
    for (const pattern of patterns) {
      const match = cleaned.match(pattern);
      if (match) return { owner: match[1], repo: match[2], branch: match[3] };
    }
    return null;
  } catch { return null; }
}

export async function fetchRepoFiles(info: RepoInfo): Promise<GitHubFile[]> {
  const { owner, repo, branch } = info;
  let defaultBranch = branch;
  if (!defaultBranch) {
    const repoRes = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
      headers: { Accept: 'application/vnd.github.v3+json' },
    });
    if (!repoRes.ok) throw new Error(`Repository not found: ${owner}/${repo}`);
    const repoData = await repoRes.json();
    defaultBranch = repoData.default_branch;
  }
  const treeRes = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/git/trees/${defaultBranch}?recursive=1`,
    { headers: { Accept: 'application/vnd.github.v3+json' } }
  );
  if (!treeRes.ok) throw new Error('Could not fetch repository tree');
  const treeData = await treeRes.json();
  const skipDirs = ['node_modules', 'vendor', '.git', 'dist', 'build', '__pycache__', '.next'];
  const codeFiles = (treeData.tree as { path: string; type: string; size?: number }[])
    .filter(f => {
      if (f.type !== 'blob') return false;
      const parts = f.path.split('/');
      if (parts.some(p => skipDirs.includes(p))) return false;
      const ext = f.path.split('.').pop()?.toLowerCase();
      return ext && CODE_EXTENSIONS.has(ext);
    })
    .filter(f => !f.size || f.size < MAX_FILE_SIZE)
    .slice(0, MAX_FILES);
  const files: GitHubFile[] = [];
  await Promise.allSettled(
    codeFiles.map(async (f) => {
      const raw = await fetch(`https://raw.githubusercontent.com/${owner}/${repo}/${defaultBranch}/${f.path}`);
      if (raw.ok) {
        const content = await raw.text();
        const ext = f.path.split('.').pop()?.toLowerCase();
        files.push({ path: f.path, content, language: ext });
      }
    })
  );
  return files;
}

export function aggregateFilesForAnalysis(files: GitHubFile[]): string {
  return files.map(f => `// File: ${f.path}\n${f.content}`).join('\n\n');
}