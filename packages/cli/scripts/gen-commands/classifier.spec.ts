import { resolve } from 'node:path';
import { Project } from 'ts-morph';

import { classify, toKebab } from './classifier';

const REPO_ROOT = resolve(__dirname, '../../../..');

function loadCoreProject(): Project {
  const project = new Project({
    tsConfigFilePath: resolve(REPO_ROOT, 'packages/core/tsconfig.lib.json'),
    skipAddingFilesFromTsConfig: false,
  });
  return project;
}

describe('classify', () => {
  let classified: ReturnType<typeof classify>;

  beforeAll(() => {
    classified = classify(loadCoreProject());
  });

  it('discovers at least 40 core operations', () => {
    expect(classified.length).toBeGreaterThan(40);
  });

  it('classifies addClasses as pattern shape', () => {
    const c = classified.find((x) => x.coreName === 'addClasses');
    expect(c).toBeDefined();
    expect(c?.verb).toBe('add');
    expect(c?.category).toBe('classes');
    expect(c?.targetShape).toBe('pattern');
  });

  it('classifies addMethods as nodes shape', () => {
    const c = classified.find((x) => x.coreName === 'addMethods');
    expect(c).toBeDefined();
    expect(c?.targetShape).toBe('nodes');
  });

  it('classifies getClasses as query shape', () => {
    const c = classified.find((x) => x.coreName === 'getClasses');
    expect(c).toBeDefined();
    expect(c?.targetShape).toBe('query');
  });

  it('classifies editClasses as declarations-editor shape', () => {
    const c = classified.find((x) => x.coreName === 'editClasses');
    expect(c).toBeDefined();
    expect(c?.targetShape).toBe('declarations-editor');
  });

  it('classifies removeClasses as nodes shape', () => {
    const c = classified.find((x) => x.coreName === 'removeClasses');
    expect(c).toBeDefined();
    expect(c?.targetShape).toBe('nodes');
  });

  it('uses kebab-case categories', () => {
    // `type-aliases` re-export is out of scope (see tasks.md) — when it
    // lands the existing transform should already produce `type-aliases`.
    expect(toKebab('TypeAliases')).toBe('type-aliases');
    const ms = classified.find((x) => x.coreName === 'getSourceFiles');
    expect(ms?.category).toBe('source-files');
  });

  it('filters out the getDeclaration* factory helpers', () => {
    expect(classified.find((x) => x.coreName === 'getDeclarationCreator')).toBeUndefined();
    expect(classified.find((x) => x.coreName === 'getDeclarationGetter')).toBeUndefined();
    expect(classified.find((x) => x.coreName === 'getDeclarationEditor')).toBeUndefined();
    expect(classified.find((x) => x.coreName === 'getDeclarationRemover')).toBeUndefined();
  });
});

describe('toKebab', () => {
  it('converts CamelCase to kebab-case', () => {
    expect(toKebab('Classes')).toBe('classes');
    expect(toKebab('TypeAliases')).toBe('type-aliases');
    expect(toKebab('MethodSignatures')).toBe('method-signatures');
    expect(toKebab('NamedImports')).toBe('named-imports');
    expect(toKebab('SourceFiles')).toBe('source-files');
  });
});
