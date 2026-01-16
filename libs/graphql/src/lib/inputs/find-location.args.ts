import { ArgsType, Field } from '@nestjs/graphql';
import { PaginationArgs } from './pagination.args';
import { WildcardArgs } from './wildcard.args';

@ArgsType()
export class FindLocationArgs extends PaginationArgs {
  @Field(() => String, { nullable: true })
  description?: string;

  @Field(() => WildcardArgs, { nullable: true })
  wildcard?: WildcardArgs;
}
