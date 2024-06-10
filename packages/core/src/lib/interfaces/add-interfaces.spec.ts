import { readFileSync } from '../fs/file-system';
import { resetActiveProject, saveProject } from '../project';
import { createSourceFile } from '../source-file';
import { createTestingProject } from '../testing';
import { addInterfaces } from './add-interfaces';

describe('addInterfaces', () => {
  beforeEach(() => {
    createTestingProject();

    createSourceFile('some/path/file.ts', '');
  });

  it('should add Interfaces', () => {
    addInterfaces('some/path/file.ts', {
      name: 'A',
      properties: [{ name: 's', type: 'string' }],
      methods: [{ name: 'method', returnType: 'number' }],
    });

    saveProject();

    expect(readFileSync('some/path/file.ts')).toBe(`interface A {
    s: string;
    method(): number;
}
`);
  });

  afterEach(() => {
    resetActiveProject();
  });
});
