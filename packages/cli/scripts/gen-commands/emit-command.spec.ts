import type { Classified } from './classifier';
import { emitCommand } from './emit-command';

function make(
  overrides: Partial<Classified> &
    Pick<Classified, 'verb' | 'category' | 'coreName' | 'targetShape'>,
): Classified {
  return { signatureText: '', ...overrides };
}

describe('emitCommand', () => {
  it('marks --file required for pattern shape', () => {
    const src = emitCommand(
      make({ verb: 'add', category: 'classes', coreName: 'addClasses', targetShape: 'pattern' }),
    );
    expect(src).toContain("name: 'add-classes'");
    expect(src).toContain('description:');
    // --file required for pattern shape
    expect(src).toMatch(/file:\s*\{[^}]*required: true[^}]*\}/);
  });

  it('does not require --json for query shape', () => {
    const src = emitCommand(
      make({ verb: 'get', category: 'classes', coreName: 'getClasses', targetShape: 'query' }),
    );
    expect(src).toContain("name: 'get-classes'");
    // json should not be marked required
    expect(src).not.toMatch(/json:\s*\{[^}]*required: true[^}]*\}/);
  });

  it('encodes the op name passed to the daemon', () => {
    const src = emitCommand(
      make({
        verb: 'edit',
        category: 'methods',
        coreName: 'editMethods',
        targetShape: 'declarations-editor',
      }),
    );
    expect(src).toContain("op: 'editMethods'");
  });
});
