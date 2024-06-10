import { resetActiveProject } from '../project';
import { createSourceFile } from '../source-file';
import { createTestingProject } from '../testing';
import { getInterfaces } from './get-interfaces';

describe('getInterfaces', () => {
  beforeEach(() => {
    createTestingProject();

    createSourceFile(
      'some/path/file.ts',
      `
interface A {}
`,
    );

    createSourceFile(
      'some/path/one-more-file.ts',
      `
interface B {}
`,
    );
  });

  it('should find two Interfaces', () => {
    const declarations = getInterfaces('some/path/**.ts');

    expect(declarations.length).toBe(2);
  });

  it('should find one interface', () => {
    const declarations = getInterfaces('some/path/file.ts');

    expect(declarations.length).toBe(1);
  });

  it('should find one interface by name', () => {
    const declarations = getInterfaces('some/path/**.ts', {
      name: 'B',
    });

    expect(declarations.length).toBe(1);
  });

  afterEach(() => {
    resetActiveProject();
  });
});
