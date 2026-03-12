import { ArgsType, Field } from '@nestjs/graphql';
import { PaginationArgs } from './pagination.args';

@ArgsType()
export class FindSaleOrderArgs extends PaginationArgs {
  @Field({ nullable: true })
  key?: string;
}
