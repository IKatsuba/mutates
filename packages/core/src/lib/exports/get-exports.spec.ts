import { resetActiveProject } from '../project';
import { createSourceFile } from '../source-file';
import { createTestingProject } from '../testing';
import { getExports } from './get-exports';

describe('getExports', () => {
  beforeEach(() => {
    createTestingProject();

    createSourceFile(
      'some/path/file.ts',
      `
export { a } from 'b';
`,
    );

    createSourceFile(
      'some/path/one-more-file.ts',
      `
export { c } from 'd';
`,
    );
  });

  it('should find two exports', () => {
    const exports = getExports();

    expect(exports.length).toBe(2);
  });

  it('should find one export', () => {
    const exports = getExports({ pattern: 'some/path/file.ts' });

    expect(exports.length).toBe(1);
  });

  it('should find one export by name', () => {
    const exports = getExports({
      moduleSpecifier: 'd',
    });

    expect(exports.length).toBe(1);
  });

  afterEach(() => {
    resetActiveProject();
  });
});
