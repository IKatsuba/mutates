import { getClasses } from '../classes';
import { resetActiveProject } from '../project';
import { createSourceFile } from '../source-file';
import { createTestingProject } from '../testing';
import { getClassProperties } from './get-class-properties';

describe('getProperties', () => {
  beforeEach(() => {
    createTestingProject();

    createSourceFile(
      'some/path/file.ts',
      `
class A {
  b = 1;
}
`,
    );

    createSourceFile(
      'some/path/one-more-file.ts',
      `
class B {
  static d = 's';

  static hello2 = 'hello';
}
`,
    );
  });

  it('should find two properties', () => {
    const declarations = getClassProperties(getClasses());

    expect(declarations.length).toBe(3);
  });

  it('should find one property', () => {
    const declarations = getClassProperties(getClasses({ pattern: 'some/path/file.ts' }));

    expect(declarations.length).toBe(1);
  });

  it('should find one property by name pattern **', () => {
    const declarations = getClassProperties(getClasses(), {
      name: 'd',
      isStatic: true,
    });

    expect(declarations.length).toBe(1);
  });

  it('should find one property by blob pattern **/*', () => {
    const declarations = getClassProperties(getClasses(), {
      name: 'hello*',
      isStatic: true,
    });

    expect(declarations.length).toBe(1);
  });

  afterEach(() => {
    resetActiveProject();
  });
});
