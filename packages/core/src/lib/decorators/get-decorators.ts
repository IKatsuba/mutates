import type { DecoratableNode, Decorator, DecoratorStructure } from 'ts-morph';

import { getAccessors } from '../accessors';
import { getClasses } from '../classes';
import { getConstructors } from '../constructors';
import { getMethods } from '../methods';
import { getParams } from '../params';
import { getClassProperties } from '../properties';
import type { Query } from '../utils';
import { coerceArray, getDeclarationGetter, matchQuery } from '../utils';

export function getDecorators(
  declarations: DecoratableNode | DecoratableNode[],
  query?: Query<DecoratorStructure>,
): Decorator[] {
  return coerceArray(declarations)
    .map((declaration) => declaration.getDecorators())
    .flat()
    .filter((decorator) => matchQuery(decorator.getStructure(), query));
}

export const getAllDecorators = getDeclarationGetter<Decorator>((pattern) => {
  const classes = getClasses(pattern);
  const methods = getMethods(classes);
  const constructors = getConstructors(classes);
  const properties = getClassProperties(classes);
  const constructorParams = getParams(constructors);
  const methodParams = getParams(methods);
  const accessors = getAccessors(classes);

  return [classes, methods, properties, constructorParams, methodParams, accessors]
    .map((declarations) => getDecorators(declarations))
    .flat();
});
