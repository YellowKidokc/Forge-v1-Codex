import { invoke } from '@tauri-apps/api/core';

export interface VersionSnapshot {
  id: string;
  file_path: string;
  timestamp: number;
  size_bytes: number;
  summary: string;
}

export interface DiffLine {
  type: 'added' | 'removed' | 'unchanged';
  content: string;
  lineNumber: number;
}

export async function createSnapshot(filePath: string, content: string): Promise<VersionSnapshot> {
  return invoke<VersionSnapshot>('create_snapshot', { filePath, content });
}

export async function listSnapshots(filePath: string): Promise<VersionSnapshot[]> {
  return invoke<VersionSnapshot[]>('list_snapshots', { filePath });
}

export async function readSnapshot(filePath: string, snapshotId: string): Promise<string> {
  return invoke<string>('read_snapshot', { filePath, snapshotId });
}

export async function rollbackToSnapshot(filePath: string, snapshotId: string): Promise<void> {
  return invoke<void>('rollback_to_snapshot', { filePath, snapshotId });
}

export function computeDiff(oldText: string, newText: string): DiffLine[] {
  const oldLines = oldText.split('\n');
  const newLines = newText.split('\n');
  const result: DiffLine[] = [];

  // Simple LCS-based diff
  const lcs = lcsMatrix(oldLines, newLines);
  let i = oldLines.length;
  let j = newLines.length;
  const ops: Array<{ type: 'added' | 'removed' | 'unchanged'; line: string }> = [];

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldLines[i - 1] === newLines[j - 1]) {
      ops.push({ type: 'unchanged', line: oldLines[i - 1] });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || lcs[i][j - 1] >= lcs[i - 1][j])) {
      ops.push({ type: 'added', line: newLines[j - 1] });
      j--;
    } else {
      ops.push({ type: 'removed', line: oldLines[i - 1] });
      i--;
    }
  }

  ops.reverse();

  let lineNum = 0;
  for (const op of ops) {
    if (op.type !== 'removed') lineNum++;
    result.push({
      type: op.type,
      content: op.line,
      lineNumber: op.type === 'removed' ? 0 : lineNum,
    });
  }

  return result;
}

function lcsMatrix(a: string[], b: string[]): number[][] {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1]);
    }
  }
  return dp;
}

export function formatTimestamp(ms: number): string {
  const date = new Date(ms);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHour = Math.floor(diffMs / 3600000);
  const diffDay = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString();
}
