import { Field, ID, ObjectType } from '@nestjs/graphql';
import { ScrapeOrderItemDto } from './scrape-order-item.dto';
import { PaginatedResponse } from './pagination.dto';

@ObjectType()
export class ScrapeOrderDto {
  @Field(() => ID)
  id!: string;

  @Field(() => String)
  key!: string;

  @Field(() => Date)
  createdAt!: Date;

  @Field(() => [ScrapeOrderItemDto])
  items!: ScrapeOrderItemDto[];
}

@ObjectType()
export class ScrapeOrders extends PaginatedResponse(ScrapeOrderDto) {}
