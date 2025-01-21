import { getClasses } from '../classes';
import { readFileSync } from '../fs/file-system';
import { resetActiveProject, saveProject } from '../project';
import { createSourceFile } from '../source-file';
import { createTestingProject } from '../testing';
import { editDecorators } from './edit-decorators';
import { getDecorators } from './get-decorators';

describe('editDecorators', () => {
  beforeEach(() => {
    createTestingProject();

    createSourceFile(
      'some/path/file.ts',
      `
@Component({
  selector: 'a'
})
class A{

}
    `,
    );
  });

  it('should edit decorators', () => {
    const declarations = getDecorators(getClasses({ pattern: 'some/path/file.ts' }));

    editDecorators(declarations, () => ({
      name: 'Directive',
    }));

    saveProject();

    expect(readFileSync('some/path/file.ts')).toBe(`
@Directive({
      selector: 'a'
    })
class A{

}
    `);
  });

  afterEach(() => {
    resetActiveProject();
  });
});
