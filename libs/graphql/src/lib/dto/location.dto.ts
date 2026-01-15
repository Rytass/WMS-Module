import { Field, ID, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class LocationDto {
  @Field(() => ID)
  id!: string;

  @Field(() => String)
  description!: string;
}
