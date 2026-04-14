import { ArgsType, Field, ID } from '@nestjs/graphql';
import { PaginationArgs } from './pagination.args';

@ArgsType()
export class FindBatchArgs extends PaginationArgs {
  @Field(() => String, { nullable: true })
  key?: string;

  @Field(() => ID, { nullable: true })
  materialId?: string;
}
