import { Kind, GraphQLScalarType, GraphQLError } from 'graphql';
import type { ObjectValueNode, ValueNode } from 'graphql';

/**
 * A JSON object scalar, defined here rather than pulled from `graphql-type-json`
 * so the package keeps its peer dependency list as it is — `graphql` is already
 * required, and this is the whole of what we need from such a library.
 *
 * Deliberately narrower than "any JSON": the values it guards (a batch's
 * host-defined `attributes`) are always a keyed record, and refusing a bare
 * scalar or array at the edge means every consumer downstream can rely on that
 * without re-checking.
 */

function parseLiteralValue(node: ValueNode): unknown {
  switch (node.kind) {
    case Kind.STRING:
    case Kind.BOOLEAN:
      return node.value;
    case Kind.INT:
    case Kind.FLOAT:
      return Number(node.value);
    case Kind.NULL:
      return null;
    case Kind.LIST:
      return node.values.map(parseLiteralValue);
    case Kind.OBJECT:
      return parseObjectLiteral(node);
    default:
      throw new GraphQLError(
        `JSONObject cannot represent a ${node.kind} literal`,
        { nodes: node },
      );
  }
}

function parseObjectLiteral(node: ObjectValueNode): Record<string, unknown> {
  return node.fields.reduce<Record<string, unknown>>((carry, field) => {
    return { ...carry, [field.name.value]: parseLiteralValue(field.value) };
  }, {});
}

function assertPlainObject(value: unknown): Record<string, unknown> {
  if (
    typeof value !== 'object' ||
    value === null ||
    Array.isArray(value) ||
    // A Date or any other class instance serializes to something the host did
    // not write; reject it here rather than let it reach the column.
    Object.getPrototypeOf(value) !== Object.prototype
  ) {
    throw new GraphQLError('JSONObject must be a plain JSON object');
  }

  return value as Record<string, unknown>;
}

export const GraphQLJSONObject = new GraphQLScalarType({
  name: 'JSONObject',
  description:
    'An arbitrary JSON object supplied by the host. Its keys and values are stored verbatim and are never interpreted by this module.',
  serialize: (value: unknown): Record<string, unknown> =>
    assertPlainObject(value),
  parseValue: (value: unknown): Record<string, unknown> =>
    assertPlainObject(value),
  parseLiteral: (node: ValueNode): Record<string, unknown> => {
    if (node.kind !== Kind.OBJECT) {
      throw new GraphQLError('JSONObject must be an object literal', {
        nodes: node,
      });
    }

    return parseObjectLiteral(node);
  },
});
