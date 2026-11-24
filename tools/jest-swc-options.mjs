// Shared by every jest config that transforms WMS TypeScript (core, graphql, and
// the root coverage config), so the three cannot drift apart.
export const swcOptions = {
  jsc: {
    target: 'es2022',
    // TypeORM/NestJS rely on class names at runtime (STI discriminators, DI
    // tokens), so they must survive minification-free transpilation.
    keepClassNames: true,
    parser: {
      syntax: 'typescript',
      decorators: true,
    },
    transform: {
      legacyDecorator: true,
      decoratorMetadata: true,
    },
  },
  module: {
    type: 'commonjs',
  },
};
