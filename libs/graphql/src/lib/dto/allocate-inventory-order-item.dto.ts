import { Field, ID, Int, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class AllocateInventoryOrderItemDto {
  @Field(() => ID)
  id!: string;

  materialId!: string;

  batchId!: string;

  locationId!: string | null;

  loaderId!: string | null;

  orderId!: string;

  unitId!: string | null;

  @Field(() => Int)
  targetAllocatedQuantity!: number;

  @Field(() => String)
  saleId!: string;

  @Field(() => String)
  saleSerialId!: string;
}
