import { getClasses } from '../classes';
import { resetActiveProject } from '../project';
import { createSourceFile } from '../source-file';
import { createTestingProject } from '../testing';
import { getProperties } from './get-properties';

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
    const declarations = getProperties(getClasses('some/path/**.ts'));

    expect(declarations.length).toBe(3);
  });

  it('should find one property', () => {
    const declarations = getProperties(getClasses('some/path/file.ts'));

    expect(declarations.length).toBe(1);
  });

  it('should find one property by name pattern **', () => {
    const declarations = getProperties(getClasses('some/path/**.ts'), {
      name: 'd',
      isStatic: true,
    });

    expect(declarations.length).toBe(1);
  });

  it('should find one property by blob pattern **/*', () => {
    const declarations = getProperties(getClasses('**/*.ts'), {
      name: 'hello*',
      isStatic: true,
    });

    expect(declarations.length).toBe(1);
  });

  afterEach(() => {
    resetActiveProject();
  });
});
