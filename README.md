# Mutates

Mutates is a fork of [ng-morph](https://github.com/taiga-family/ng-morph) that is focused on
mutating the AST of Angular components.

The biggest difference is that this fork is not focused on Angular specific transformations.
`Mutates` is a set of tools that can be used to mutate the AST of any TypeScript file.

All framework-specific transformations have been moved to separate packages (e.g.
`@mutates/angular`).

The main package is `@mutates/core` which provides the core functionality for mutating the AST of
TypeScript files.
