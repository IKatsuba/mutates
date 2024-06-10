import type {
  FunctionLikeDeclaration,
  ParameterDeclaration,
  ParameterDeclarationStructure,
} from 'ts-morph';

import type { Query } from '../utils';
import { coerceArray, matchQuery } from '../utils';

export function getParams(
  functionsLike: FunctionLikeDeclaration | FunctionLikeDeclaration[],
  query?: Query<ParameterDeclarationStructure>,
): ParameterDeclaration[] {
  return coerceArray(functionsLike)
    .map((functionLike) => functionLike.getParameters())
    .flat()
    .filter((param) => matchQuery(param.getStructure(), query));
}
