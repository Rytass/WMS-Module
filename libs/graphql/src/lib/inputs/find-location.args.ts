import { ArgsType, Field } from '@nestjs/graphql';
import { PaginationArgs } from './pagination.args';

@ArgsType()
export class FindLocationArgs extends PaginationArgs {
  @Field(() => String, { nullable: true })
  description?: string;

  @Field(() => String, { nullable: true })
  key?: string;
}
