import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import _ from 'lodash';

interface GraphQLLayer {
  prev: GraphQLLayer;
  key: string;
}
export const QueryPath = createParamDecorator(
  (data: unknown, context: ExecutionContext): string | null => {
    if (context.getType().toString() === 'graphql') {
      const ctx = GqlExecutionContext.create(context).getInfo();
      const extractPath = (
        { prev, key }: GraphQLLayer,
        paths: string[],
      ): string[] => {
        if (key && _.isString(key)) paths.unshift(key);

        if (prev) return extractPath(prev, paths);

        return paths;
      };

      const paths = extractPath(ctx.path, []);

      return paths.join('/');
    }

    return null;
  },
);
