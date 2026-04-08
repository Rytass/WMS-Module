import { Field, ID, ObjectType } from '@nestjs/graphql';
import { QualityInspectionOrderItemDto } from './quality-inspection-order-item.dto';
import { PaginatedResponse } from './pagination.dto';

@ObjectType()
export class QualityInspectionOrderDto {
  @Field(() => ID)
  id!: string;

  @Field(() => String)
  key!: string;

  @Field(() => String)
  note!: string;

  @Field(() => Date)
  createdAt!: Date;

  @Field(() => [QualityInspectionOrderItemDto])
  items!: QualityInspectionOrderItemDto[];
}

@ObjectType()
export class QualityInspectionOrders extends PaginatedResponse(
  QualityInspectionOrderDto,
) {}
