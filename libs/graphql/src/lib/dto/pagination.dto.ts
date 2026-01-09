import {
  FieldMiddleware,
  MiddlewareContext,
  NextFn,
  Field,
  ID,
  Int,
  ObjectType,
} from '@nestjs/graphql';
import { createHash } from 'crypto';

export const IdGenFunction = (input: string) => {
  const hash = createHash('sha256');
  hash.update(input);
  return hash.digest('hex');
};
export const IdGenMiddleware: FieldMiddleware = async (
  { source }: MiddlewareContext,
  next: NextFn
) => {
  const value = await next();

  if (value) return value;
  let cache: any = [];
  const inputString = JSON.stringify(source, (key, value) => {
    if (typeof value === 'object' && value != null) {
      if (cache.indexOf(value) !== -1) {
        return;
      }
      cache.push(value);
    }
    return value;
  });
  cache = null;
  return IdGenFunction(inputString);
};

export interface PaginatedType<T> {
  id?: string;

  items: T[];

  total: number;
}
export function PaginatedResponse<T>(
  TItemClass: new () => T
): new () => PaginatedType<T> {
  @ObjectType()
  abstract class PaginatedResponseClass {
    @Field(() => ID, { middleware: [IdGenMiddleware] })
    id!: string;

    @Field(() => [TItemClass])
    items!: T[];

    @Field(() => Int)
    total!: number;
  }

  return PaginatedResponseClass as new () => PaginatedType<T>;
}
