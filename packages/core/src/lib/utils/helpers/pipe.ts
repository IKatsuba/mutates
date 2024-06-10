export function pipe<T, U>(fn1: (arg: T) => U): (arg: T) => U;
export function pipe<T, U, V>(fn1: (arg: T) => U, fn2: (arg: U) => V): (arg: T) => V;
export function pipe<T, U, V, W>(
  fn1: (arg: T) => U,
  fn2: (arg: U) => V,
  fn3: (arg: V) => W,
): (arg: T) => W;
export function pipe<T, U, V, W, X>(
  fn1: (arg: T) => U,
  fn2: (arg: U) => V,
  fn3: (arg: V) => W,
  fn4: (arg: W) => X,
): (arg: T) => X;
export function pipe<T, U, V, W, X, Y>(
  fn1: (arg: T) => U,
  fn2: (arg: U) => V,
  fn3: (arg: V) => W,
  fn4: (arg: W) => X,
  fn5: (arg: X) => Y,
): (arg: T) => Y;
export function pipe<T, U, V, W, X, Y, Z>(
  fn1: (arg: T) => U,
  fn2: (arg: U) => V,
  fn3: (arg: V) => W,
  fn4: (arg: W) => X,
  fn5: (arg: X) => Y,
  fn6: (arg: Y) => Z,
): (arg: T) => Z;
export function pipe<T, U, V, W, X, Y, Z, A>(
  fn1: (arg: T) => U,
  fn2: (arg: U) => V,
  fn3: (arg: V) => W,
  fn4: (arg: W) => X,
  fn5: (arg: X) => Y,
  fn6: (arg: Y) => Z,
  fn7: (arg: Z) => A,
): (arg: T) => A;
export function pipe<T, U, V, W, X, Y, Z, A, B>(
  fn1: (arg: T) => U,
  fn2: (arg: U) => V,
  fn3: (arg: V) => W,
  fn4: (arg: W) => X,
  fn5: (arg: X) => Y,
  fn6: (arg: Y) => Z,
  fn7: (arg: Z) => A,
  fn8: (arg: A) => B,
): (arg: T) => B;
export function pipe<T, U, V, W, X, Y, Z, A, B, C>(
  fn1: (arg: T) => U,
  fn2: (arg: U) => V,
  fn3: (arg: V) => W,
  fn4: (arg: W) => X,
  fn5: (arg: X) => Y,
  fn6: (arg: Y) => Z,
  fn7: (arg: Z) => A,
  fn8: (arg: A) => B,
  fn9: (arg: B) => C,
): (arg: T) => C;
export function pipe<T, U, V, W, X, Y, Z, A, B, C, D>(
  fn1: (arg: T) => U,
  fn2: (arg: U) => V,
  fn3: (arg: V) => W,
  fn4: (arg: W) => X,
  fn5: (arg: X) => Y,
  fn6: (arg: Y) => Z,
  fn7: (arg: Z) => A,
  fn8: (arg: A) => B,
  fn9: (arg: B) => C,
  fn10: (arg: C) => D,
): (arg: T) => D;
export function pipe<T, U, V, W, X, Y, Z, A, B, C, D, E>(
  fn1: (arg: T) => U,
  fn2: (arg: U) => V,
  fn3: (arg: V) => W,
  fn4: (arg: W) => X,
  fn5: (arg: X) => Y,
  fn6: (arg: Y) => Z,
  fn7: (arg: Z) => A,
  fn8: (arg: A) => B,
  fn9: (arg: B) => C,
  fn10: (arg: C) => D,
  fn11: (arg: D) => E,
): (arg: T) => E;
export function pipe<T, U, V, W, X, Y, Z, A, B, C, D, E, F>(
  fn1: (arg: T) => U,
  fn2: (arg: U) => V,
  fn3: (arg: V) => W,
  fn4: (arg: W) => X,
  fn5: (arg: X) => Y,
  fn6: (arg: Y) => Z,
  fn7: (arg: Z) => A,
  fn8: (arg: A) => B,
  fn9: (arg: B) => C,
  fn10: (arg: C) => D,
  fn11: (arg: D) => E,
  fn12: (arg: E) => F,
): (arg: T) => F;
export function pipe<T, U, V, W, X, Y, Z, A, B, C, D, E, F, G>(
  fn1: (arg: T) => U,
  fn2: (arg: U) => V,
  fn3: (arg: V) => W,
  fn4: (arg: W) => X,
  fn5: (arg: X) => Y,
  fn6: (arg: Y) => Z,
  fn7: (arg: Z) => A,
  fn8: (arg: A) => B,
  fn9: (arg: B) => C,
  fn10: (arg: C) => D,
  fn11: (arg: D) => E,
  fn12: (arg: E) => F,
  fn13: (arg: F) => G,
): (arg: T) => G;
export function pipe<T, U, V, W, X, Y, Z, A, B, C, D, E, F, G, H>(
  fn1: (arg: T) => U,
  fn2: (arg: U) => V,
  fn3: (arg: V) => W,
  fn4: (arg: W) => X,
  fn5: (arg: X) => Y,
  fn6: (arg: Y) => Z,
  fn7: (arg: Z) => A,
  fn8: (arg: A) => B,
  fn9: (arg: B) => C,
  fn10: (arg: C) => D,
  fn11: (arg: D) => E,
  fn12: (arg: E) => F,
  fn13: (arg: F) => G,
  fn14: (arg: G) => H,
): (arg: T) => H;
export function pipe(...fns: Array<(arg: any) => any>) {
  return (arg: any) => fns.reduce((acc, fn) => fn(acc), arg);
}
