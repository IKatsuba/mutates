import type { Classified } from './classifier';
import { emitSchema } from './emit-schema';

function make(
  overrides: Partial<Classified> &
    Pick<Classified, 'verb' | 'category' | 'coreName' | 'targetShape'>,
): Classified {
  return { signatureText: '', ...overrides };
}

describe('emitSchema', () => {
  it('requires target.file for pattern shape', () => {
    const s = emitSchema(
      make({ verb: 'add', category: 'classes', coreName: 'addClasses', targetShape: 'pattern' }),
    );
    expect(s.op).toBe('addClasses');
    expect(s.schema['type']).toBe('object');
    const props = s.schema['properties'] as Record<string, Record<string, unknown>>;
    expect(props['target']['required'] as string[]).toContain('file');
    expect(s.schema['required']).toContain('data');
  });

  it('allows ref or file for nodes/editor shapes', () => {
    const s = emitSchema(
      make({
        verb: 'edit',
        category: 'classes',
        coreName: 'editClasses',
        targetShape: 'declarations-editor',
      }),
    );
    const props = s.schema['properties'] as Record<string, Record<string, unknown>>;
    expect(props['target']['anyOf']).toBeDefined();
  });

  it('produces Draft 2020-12 envelopes', () => {
    const s = emitSchema(
      make({ verb: 'add', category: 'classes', coreName: 'addClasses', targetShape: 'pattern' }),
    );
    expect(s.schema['$schema']).toBe('https://json-schema.org/draft/2020-12/schema');
  });

  it('marks `add` data as object-or-array', () => {
    const s = emitSchema(
      make({ verb: 'add', category: 'classes', coreName: 'addClasses', targetShape: 'pattern' }),
    );
    const props = s.schema['properties'] as Record<string, Record<string, unknown>>;
    expect(props['data']['oneOf']).toBeDefined();
  });

  it('marks query-shaped ops as not requiring data', () => {
    const s = emitSchema(
      make({ verb: 'get', category: 'classes', coreName: 'getClasses', targetShape: 'query' }),
    );
    expect(s.schema['required']).not.toContain('data');
  });
});
