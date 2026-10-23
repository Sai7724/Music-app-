/**
 * Filesystem abstraction — replaces @tauri-apps/plugin-fs.
 * Used for playlist import/export on mobile.
 * Uses @capacitor/filesystem which works on iOS and Android.
 */
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';

export async function readTextFile(path: string): Promise<string> {
  const result = await Filesystem.readFile({
    path,
    directory: Directory.Documents,
    encoding: Encoding.UTF8,
  });
  return result.data as string;
}

export async function writeTextFile(
  path: string,
  contents: string,
): Promise<void> {
  await Filesystem.writeFile({
    path,
    data: contents,
    directory: Directory.Documents,
    encoding: Encoding.UTF8,
    recursive: true,
  });
}

export async function removeFile(path: string): Promise<void> {
  await Filesystem.deleteFile({
    path,
    directory: Directory.Documents,
  });
}

export async function readDir(path: string): Promise<string[]> {
  const result = await Filesystem.readdir({
    path,
    directory: Directory.Documents,
  });
  return result.files.map((f) => f.name);
}

export async function createDir(path: string): Promise<void> {
  await Filesystem.mkdir({
    path,
    directory: Directory.Documents,
    recursive: true,
  });
}

export async function exists(path: string): Promise<boolean> {
  try {
    await Filesystem.stat({
      path,
      directory: Directory.Documents,
    });
    return true;
  } catch {
    return false;
  }
}
