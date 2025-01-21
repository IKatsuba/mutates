import { resetActiveProject } from '../project';
import { createSourceFile } from '../source-file';
import { createTestingProject } from '../testing';
import { getEnums } from './get-enums';

describe('getEnums', () => {
  beforeEach(() => {
    createTestingProject();

    createSourceFile(
      'some/path/file.ts',
      `
enum A { }
      `,
    );

    createSourceFile(
      'some/path/one-more-file.ts',
      `
enum B {
  Wow
}
      `,
    );
  });

  it('should find two enums', () => {
    const declarations = getEnums();

    expect(declarations.length).toBe(2);
  });

  it('should find one enum', () => {
    const declarations = getEnums({ pattern: 'some/path/file.ts' });

    expect(declarations.length).toBe(1);
  });

  it('should find one enum by name', () => {
    const declarations = getEnums({
      name: 'B',
    });

    expect(declarations.length).toBe(1);
  });

  afterEach(() => {
    resetActiveProject();
  });
});
