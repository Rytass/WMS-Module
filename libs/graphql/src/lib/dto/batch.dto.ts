import { Field, ID, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class BatchDto {
  @Field(() => ID)
  id!: string;
}
