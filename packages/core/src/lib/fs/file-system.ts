import { RuntimeDirEntry } from 'ts-morph';

import { getActiveProject } from '../project';
import { coerceArray } from '../utils';

export function fileSystem() {
  return getActiveProject().getFileSystem();
}

export function deleteFile(filePath: string): Promise<void> {
  return fileSystem().delete(filePath);
}

export function deleteFileSync(filePath: string): void {
  return fileSystem().deleteSync(filePath);
}

export async function readDir(dirPath: string): Promise<RuntimeDirEntry[]> {
  return fileSystem().readDirSync(dirPath);
}

export function readDirSync(dirPath: string): RuntimeDirEntry[] {
  return fileSystem().readDirSync(dirPath);
}

export function readFile(filePath: string, encoding?: string): Promise<string> {
  return fileSystem().readFile(filePath, encoding);
}

export function readFileSync(filePath: string, encoding?: string): string {
  return fileSystem().readFileSync(filePath, encoding);
}

export function writeFile(filePath: string, text: string): Promise<void> {
  return fileSystem().writeFile(filePath, text);
}

export function writeFileSync(filePath: string, text: string): void {
  return fileSystem().writeFileSync(filePath, text);
}

export function mkdir(dirPath: string): Promise<void> {
  return fileSystem().mkdir(dirPath);
}

export function mkdirSync(dirPath: string): void {
  return fileSystem().mkdirSync(dirPath);
}

export function move(oldFilePath: string, newFilePath: string): Promise<void> {
  return fileSystem().move(oldFilePath, newFilePath);
}

export function moveSync(oldFilePath: string, newFilePath: string): void {
  return fileSystem().moveSync(oldFilePath, newFilePath);
}

export function copy(oldFilePath: string, newFilePath: string): Promise<void> {
  return fileSystem().copy(oldFilePath, newFilePath);
}

export function copySync(oldFilePath: string, newFilePath: string): void {
  return fileSystem().copySync(oldFilePath, newFilePath);
}

export function fileExists(filePath: string): Promise<boolean> {
  return fileSystem().fileExists(filePath);
}

export function fileExistsSync(filePath: string): boolean {
  return fileSystem().fileExistsSync(filePath);
}

export function directoryExists(dirPath: string): Promise<boolean> {
  return fileSystem().directoryExists(dirPath);
}

export function directoryExistsSync(dirPath: string): boolean {
  return fileSystem().directoryExistsSync(dirPath);
}

export function glob(pattern: string | string[]): Promise<string[]> {
  return fileSystem().glob(coerceArray(pattern));
}

export function globSync(pattern: string | string[]): string[] {
  return fileSystem().globSync(coerceArray(pattern));
}
