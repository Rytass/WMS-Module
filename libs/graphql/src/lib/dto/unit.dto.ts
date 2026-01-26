import { Field, ID, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class UnitDto {
  @Field(() => ID)
  id!: string;

  @Field(() => String)
  key!: string;
}
