import { Field, ID, Float, ObjectType } from '@nestjs/graphql';

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

  @Field(() => Float)
  targetAllocatedQuantity!: number;

  @Field(() => String)
  saleId!: string;

  @Field(() => String)
  saleSerialId!: string;
}
