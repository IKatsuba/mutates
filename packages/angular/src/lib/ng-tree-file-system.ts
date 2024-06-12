import { basename, join } from 'node:path';
import type { Tree } from '@angular-devkit/schematics';
import { FileSystemHost, RuntimeDirEntry } from 'ts-morph';

import { match } from './helpers';

export class NgTreeFileSystem implements FileSystemHost {
  constructor(private readonly tree: Tree) {}

  isCaseSensitive(): boolean {
    return true;
  }

  async delete(path: string): Promise<void> {
    return this.tree.delete(path);
  }

  deleteSync(path: string): void {
    return this.tree.delete(path);
  }

  readDirSync(dirPath: string): RuntimeDirEntry[] {
    const { subdirs: directories, subfiles: files } = this.tree.getDir(dirPath);

    return directories
      .map((name) => ({
        name,
        isFile: false,
        isDirectory: true,
        isSymlink: false,
      }))
      .concat(
        files.map((name) => ({
          name,
          isFile: true,
          isDirectory: false,
          isSymlink: false,
        })),
      );
  }

  async readFile(filePath: string, encoding?: string | undefined): Promise<string> {
    return this.tree.readText(filePath);
  }

  readFileSync(filePath: string, encoding?: string | undefined): string {
    return this.tree.readText(filePath);
  }

  async writeFile(filePath: string, fileText: string): Promise<void> {
    this.writeFileSync(filePath, fileText);
  }

  writeFileSync(filePath: string, fileText: string): void {
    if (this.fileExistsSync(filePath)) {
      this.tree.overwrite(filePath, fileText);
    } else {
      this.tree.create(filePath, fileText);
    }
  }

  mkdir(dirPath: string): Promise<void> {
    return Promise.resolve(undefined);
  }

  mkdirSync(dirPath: string): void {
    // empty
  }

  async move(srcPath: string, destPath: string): Promise<void> {
    return this.moveSync(srcPath, destPath);
  }

  moveSync(srcPath: string, destPath: string): void {
    this.copySync(srcPath, destPath);

    this.deleteSync(srcPath);
  }

  async copy(srcPath: string, destPath: string): Promise<void> {
    return this.copySync(srcPath, destPath);
  }

  copySync(srcPath: string, destPath: string): void {
    if (this.fileExistsSync(srcPath)) {
      this.writeFileSync(destPath, this.readFileSync(srcPath));
    } else if (this.directoryExistsSync(srcPath)) {
      const paths = this.readDirSync(srcPath);

      paths.forEach((path) => this.copySync(path.name, join(destPath, basename(path.name))));
    }
  }

  async fileExists(filePath: string): Promise<boolean> {
    return this.fileExistsSync(filePath);
  }

  fileExistsSync(filePath: string): boolean {
    return this.tree.exists(filePath);
  }

  async directoryExists(dirPath: string): Promise<boolean> {
    return this.directoryExistsSync(dirPath);
  }

  directoryExistsSync(dirPath: string): boolean {
    return this.tree.exists(dirPath);
  }

  realpathSync(path: string): string {
    return path;
  }

  getCurrentDirectory(): string {
    return '/';
  }

  async glob(patterns: readonly string[]): Promise<string[]> {
    return this.globSync(patterns);
  }

  globSync(patterns: readonly string[]): string[] {
    return match(
      this.readDirSync('/')
        .filter((entry) => entry.isFile)
        .map((entry) => entry.name),
      patterns as string[],
    );
  }
}
