import { Field, ArgsType } from '@nestjs/graphql';
import { PaginationArgs } from './pagination.args';

@ArgsType()
export class FindMaterialArgs extends PaginationArgs {
  @Field(() => String, { nullable: true })
  key?: string;

  @Field(() => String, { nullable: true })
  description?: string;
}
