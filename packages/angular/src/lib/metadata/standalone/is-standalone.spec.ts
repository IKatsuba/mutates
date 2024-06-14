import { createSourceFile } from '@mutates/core';

import { createAngularProject } from '../../create-angular-project';
import { createTestingTree } from '../../testing';
import { isStandalone } from './is-standalone';

describe('isStandalone', () => {
  beforeEach(() => {
    const host = createTestingTree();

    createAngularProject(host);
  });

  it('should return true if standalone is true', () => {
    // Arrange
    const ngEntity = createSourceFile(
      'src/main.ts',
      `
@Component({standalone: true}) class AppComponent {}
`,
    ).getClasses()[0];

    const result = isStandalone(ngEntity);

    expect(result).toBe(true);
  });

  it('should return false if standalone is false', () => {
    const ngEntity = createSourceFile(
      'src/main.ts',
      `
@Component({standalone: false}) class AppComponent {}
`,
    ).getClasses()[0];

    const result = isStandalone(ngEntity);

    expect(result).toBe(false);
  });
});
