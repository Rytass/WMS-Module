import { Field, ID, Int, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class ShipInventoryOrderReferenceDto {
  @Field(() => ID)
  id!: string;

  @Field(() => Int)
  serialId!: number;

  @Field(() => String, { nullable: true })
  saleId!: string | null;

  @Field(() => String, { nullable: true })
  saleSerialId!: string | null;

  @Field(() => ID, { nullable: true })
  unitId!: string | null;

  @Field(() => Int)
  targetShippedQuantity!: number;

  orderId!: string;

  materialId!: string;

  batchId!: string | null;
}
