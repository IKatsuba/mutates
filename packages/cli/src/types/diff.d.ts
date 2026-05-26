declare module 'diff' {
  /**
   * Minimal surface used by the CLI. `diff` v4 ships without types; we
   * declare only what we consume to keep the dependency footprint small.
   */
  export function createPatch(
    fileName: string,
    oldStr: string,
    newStr: string,
    oldHeader?: string,
    newHeader?: string,
  ): string;
}
