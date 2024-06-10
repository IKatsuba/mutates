import { HostTree } from '@angular-devkit/schematics';
import { UnitTestTree } from '@angular-devkit/schematics/testing';

export function createTestingTree() {
  return new UnitTestTree(new HostTree());
}
