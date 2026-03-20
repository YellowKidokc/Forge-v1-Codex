import { invoke } from '@tauri-apps/api/core';
import { FileEntry } from './types';

export async function ensureMirror(): Promise<string> {
  return invoke<string>('ensure_mirror');
}

export async function getMirrorFiles(): Promise<FileEntry[]> {
  return invoke<FileEntry[]>('get_mirror_files');
}

export async function writeMirrorFile(relativePath: string, content: string): Promise<string> {
  return invoke<string>('write_mirror_file', { relativePath, content });
}

export async function readMirrorFile(relativePath: string): Promise<string> {
  return invoke<string>('read_mirror_file', { relativePath });
}
