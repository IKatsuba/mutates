import type { Classified } from './classifier';
import { emitHandler } from './emit-handler';

function make(
  overrides: Partial<Classified> &
    Pick<Classified, 'verb' | 'category' | 'coreName' | 'targetShape'>,
): Classified {
  return { signatureText: '', ...overrides };
}

describe('emitHandler', () => {
  it('emits a pattern-shaped handler', () => {
    const src = emitHandler(
      make({ verb: 'add', category: 'classes', coreName: 'addClasses', targetShape: 'pattern' }),
    );
    expect(src).toContain('import { addClasses }');
    expect(src).toContain('export const addClassesHandler');
    expect(src).toContain('target.file (glob) required');
    expect(src).toContain('addClasses(file, p.data');
  });

  it('emits a nodes-shaped handler', () => {
    const src = emitHandler(
      make({ verb: 'add', category: 'methods', coreName: 'addMethods', targetShape: 'nodes' }),
    );
    expect(src).toContain('resolveDeclarations(session');
    expect(src).toContain('addMethods(declarations as never');
  });

  it('emits a query-shaped handler that mints refs', () => {
    const src = emitHandler(
      make({ verb: 'get', category: 'classes', coreName: 'getClasses', targetShape: 'query' }),
    );
    expect(src).toContain('mintNodeRefs(session, result as unknown)');
    expect(src).toContain('getClasses(query)');
  });

  it('emits an editor-shaped handler', () => {
    const src = emitHandler(
      make({
        verb: 'edit',
        category: 'classes',
        coreName: 'editClasses',
        targetShape: 'declarations-editor',
      }),
    );
    expect(src).toContain('const editor = (structure');
    expect(src).toContain('editClasses(declarations as never, editor as never)');
  });

  it('emits a no-params handler', () => {
    const src = emitHandler(
      make({
        verb: 'get',
        category: 'source-files',
        coreName: 'getSourceFiles',
        targetShape: 'no-params',
      }),
    );
    expect(src).toContain('(getSourceFiles as () => unknown)()');
  });
});
