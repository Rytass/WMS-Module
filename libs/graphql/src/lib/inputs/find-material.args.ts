import { Field, ID, ArgsType } from '@nestjs/graphql';
import { PaginationArgs } from './pagination.args';

@ArgsType()
export class FindMaterialArgs extends PaginationArgs {
  @Field(() => ID, { nullable: true })
  materialId?: string;

  @Field(() => [ID], { nullable: true })
  materialIds?: string[];

  @Field(() => String, { nullable: true })
  description?: string;
}
