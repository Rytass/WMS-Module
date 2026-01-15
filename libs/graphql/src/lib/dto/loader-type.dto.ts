import { Field, ID, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class LoaderTypeDto {
  @Field(() => ID)
  id!: string;

  @Field(() => String)
  description!: string;

  @Field(() => Boolean)
  isActive!: boolean;

  @Field(() => String)
  serial!: string;

  @Field(() => Date)
  createdAt!: Date;

  @Field(() => Date)
  updatedAt!: Date;
}
