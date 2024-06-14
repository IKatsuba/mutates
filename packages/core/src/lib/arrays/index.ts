import { ArrayLiteralExpression } from 'ts-morph';

export function pushToArray(array: ArrayLiteralExpression, ...items: string[]) {
  array.addElements(items);
}

export function pushToArrayIfNotExists(array: ArrayLiteralExpression, ...items: string[]) {
  array.addElements(items.filter((item) => !arrayIncludes(array, item)));
}

export function arrayIncludes(array: ArrayLiteralExpression, item: string): boolean {
  return !!array.getElements().find((exp) => exp.getText() === item);
}

export function removeFromArray(array: ArrayLiteralExpression, ...items: string[]) {
  for (const item of items) {
    const index = array.getElements().findIndex((exp) => exp.getText() === item);

    if (index !== -1) {
      array.removeElement(index);
    }
  }
}
