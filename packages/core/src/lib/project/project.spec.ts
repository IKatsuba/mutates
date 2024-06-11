import { getSourceFiles } from '../source-file';
import { addSourceFiles, createProject } from './project';

describe('Project', () => {
  beforeEach(() => {
    createProject();

    addSourceFiles('./package.json');
  });

  it('should not add files from node_modules', () => {
    expect(getSourceFiles('./**/*.json').at(0)?.getFilePath()).contain('package.json');
  });
});
