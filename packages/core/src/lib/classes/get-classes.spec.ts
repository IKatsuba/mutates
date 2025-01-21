import { resetActiveProject } from '../project';
import { createSourceFile } from '../source-file';
import { createTestingProject } from '../testing';
import { getClasses } from './get-classes';

describe('getClasses', () => {
  beforeEach(() => {
    createTestingProject();

    createSourceFile(
      'some/path/file.ts',
      `
class A { }
`,
    );

    createSourceFile(
      'some/path/one-more-file.ts',
      `
class B { }
`,
    );
  });

  it('should find two classes', () => {
    const exports = getClasses();

    expect(exports.length).toBe(2);
  });

  it('should find one class', () => {
    const exports = getClasses({ pattern: 'some/path/file.ts' });

    expect(exports.length).toBe(1);
  });

  it('should find one export by class name', () => {
    const exports = getClasses({
      name: 'B',
    });

    expect(exports.length).toBe(1);
  });

  afterEach(() => {
    resetActiveProject();
  });
});
