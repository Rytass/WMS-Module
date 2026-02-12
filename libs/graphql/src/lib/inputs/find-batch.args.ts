import { ArgsType, Field } from '@nestjs/graphql';
import { PaginationArgs } from './pagination.args';

@ArgsType()
export class FindBatchArgs extends PaginationArgs {
  @Field(() => String, { nullable: true })
  key?: string;
}
