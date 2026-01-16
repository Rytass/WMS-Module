import { Field, ID, ArgsType } from '@nestjs/graphql';
import { PaginationArgs } from './pagination.args';
import { WildcardArgs } from './wildcard.args';

@ArgsType()
export class FindStockArgs extends PaginationArgs {
  @Field(() => ID, { nullable: true })
  materialId?: string;

  @Field(() => ID, { nullable: true })
  batchId?: string;

  @Field(() => ID, { nullable: true })
  locationId?: string;

  @Field(() => ID, { nullable: true })
  loaderId?: string;

  @Field(() => String, { nullable: true })
  description?: string;

  @Field(() => WildcardArgs, { nullable: true })
  wildcard?: WildcardArgs;
}
