import { Field, ID, ObjectType } from '@nestjs/graphql';
import { PaginatedResponse } from './pagination.dto';

@ObjectType()
export class StockDto {
  @Field(() => ID)
  id!: string;

  @Field(() => ID)
  loaderId!: string;

  @Field(() => String)
  description!: string;
}

@ObjectType()
export class Stocks extends PaginatedResponse(StockDto) {}
