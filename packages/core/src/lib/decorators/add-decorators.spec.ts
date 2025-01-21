import { getAccessors } from '../accessors';
import { getClasses } from '../classes';
import { getConstructors } from '../constructors';
import { readFileSync } from '../fs/file-system';
import { getMethods } from '../methods';
import { getParams } from '../params';
import { resetActiveProject, saveProject } from '../project';
import { getClassProperties } from '../properties';
import { createSourceFile } from '../source-file';
import { createTestingProject } from '../testing';
import { addDecorators } from './add-decorators';

describe('addDecorators', () => {
  beforeEach(() => {
    createTestingProject();

    createSourceFile(
      'some/path/file.ts',
      `
class A {
  constructor(value, param){}

  method(param){
  }

  property = 'someProperty'

  get getAccessor(){return null}

  set setAccessor(value){}
}
    `,
    );
  });

  it('should add decorators', () => {
    const classes = getClasses({ pattern: 'some/path/file.ts' });
    const methods = getMethods(classes, { name: 'method' });
    const constructorParams = getParams(getConstructors(classes), {
      name: 'param',
    });
    const methodParams = getParams(methods);
    const properties = getClassProperties(classes, { name: 'property' });
    const getAccessorss = getAccessors(classes, { name: 'getAccessor' });
    const setAccessors = getAccessors(classes, { name: 'setAccessor' });

    addDecorators(classes, {
      name: 'Component',
      arguments: ["{template: ''}"],
    });

    addDecorators(methods, {
      name: 'Required',
      arguments: [],
    });

    addDecorators(constructorParams, {
      name: 'Optional',
      arguments: [],
    });

    addDecorators(methodParams, {
      name: 'Pure',
      arguments: [],
    });

    addDecorators(properties, {
      name: 'ContentChild',
      arguments: ['SomeComponent'],
    });

    addDecorators(getAccessorss, {
      name: 'AnotherDecorator',
      arguments: ['SomeComponent', "['string']"],
    });

    addDecorators(setAccessors, {
      name: 'SetDecorator',
      arguments: ['[1, 3]'],
    });

    saveProject();

    expect(readFileSync('some/path/file.ts')).toBe(`
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
    `);
  });

  afterEach(() => {
    resetActiveProject();
  });
});
