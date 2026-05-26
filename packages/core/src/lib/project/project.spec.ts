import { Project } from 'ts-morph';

import { getSourceFiles } from '../source-file';
import {
  addSourceFiles,
  createProject,
  getActiveProject,
  resetActiveProject,
  setActiveProject,
} from './project';

describe('Project', () => {
  beforeEach(() => {
    createProject();

    addSourceFiles('./package.json');
  });

  it('should not add files from node_modules', () => {
    expect(getSourceFiles('./**/*.json').at(0)?.getFilePath()).contain('package.json');
  });

  describe('setActiveProject', () => {
    afterEach(() => {
      resetActiveProject();
    });

    it('swaps the active project and returns the previous one', () => {
      const a = new Project({ useInMemoryFileSystem: true });
      const b = new Project({ useInMemoryFileSystem: true });

      const prev = setActiveProject(a);
      expect(getActiveProject()).toBe(a);

      const restored = setActiveProject(b);
      expect(restored).toBe(a);
      expect(getActiveProject()).toBe(b);

      // restore via the returned previous
      setActiveProject(prev);
    });

    it('throws when no project is active', () => {
      resetActiveProject();
      expect(() => getActiveProject()).toThrow('No active project');
    });
  });
});
