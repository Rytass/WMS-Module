import { Field, ID, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class SaleOrderDto {
  @Field(() => ID)
  id!: string;

  @Field(() => String)
  serialId!: string;
}
