import { getClasses } from '../classes';
import { resetActiveProject } from '../project';
import { createSourceFile } from '../source-file';
import { createTestingProject } from '../testing';
import { getAllDecorators, getDecorators } from './get-decorators';

describe('getDecorators', () => {
  beforeEach(() => {
    createTestingProject();

    createSourceFile(
      'some/path/file.ts',
      `
@Component({template: ''})
class A {
  constructor(value, @Optional() param){}

  @Required()
    method(@Pure() param){
  }

  @ContentChild(SomeComponent)
    property = 'someProperty'

  @AnotherDecorator(SomeComponent, ['string'])
    get getAccessor(){return null}

  @SetDecorator([1, 3])
    set setAccessor(value){}
}
    `,
    );

    createSourceFile(
      'some/path/one-more-file.ts',
      `
@Directive({})
class B {
  constructor(@Inject(TOKEN) value){}
}
    `,
    );
  });

  it('should find two decorators', () => {
    const declarations = getDecorators(getClasses('some/path/**.ts'));

    expect(declarations.length).toBe(2);
  });

  it('should find one decorator', () => {
    const declarations = getDecorators(getClasses('some/path/file.ts'));

    expect(declarations.length).toBe(1);
  });

  it('should find one decorator by name', () => {
    const declarations = getAllDecorators('some/path/**.ts');

    expect(declarations.length).toBe(9);
  });

  it('should find one decorator by name for Inject', () => {
    const declarations = getAllDecorators('some/path/**.ts', {
      name: 'Inject',
    });

    expect(declarations.length).toBe(1);
  });

  afterEach(() => {
    resetActiveProject();
  });
});
