import { resetActiveProject } from '../project';
import { createSourceFile } from '../source-file';
import { createTestingProject } from '../testing';
import { getTypeAliases } from './get-type-aliases';

describe('getTypeAliases', () => {
  beforeEach(() => {
    createTestingProject();

    createSourceFile('some/path/file.ts', 'type A = string[];');

    createSourceFile('some/path/one-more-file.ts', 'type B = number | string;');
  });

  it('should find two type aliases', () => {
    const declarations = getTypeAliases('some/path/**.ts');

    expect(declarations.length).toBe(2);
  });

  it('should find one type aliases', () => {
    const declarations = getTypeAliases('some/path/file.ts');

    expect(declarations.length).toBe(1);
  });

  it('should find one type alias by name', () => {
    const declarations = getTypeAliases('some/path/**.ts', {
      name: 'B',
    });

    expect(declarations.length).toBe(1);
  });

  afterEach(() => {
    resetActiveProject();
  });
});
