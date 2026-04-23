import { ArgsType, Field, ID } from '@nestjs/graphql';

@ArgsType()
export class CreateLocationArgs {
  @Field(() => String)
  key: string;

  @Field(() => String)
  description: string;

  @Field(() => ID, { nullable: true })
  parentId?: string;
}

@ArgsType()
export class UpdateLocationArgs {
  @Field(() => ID)
  id!: string;

  @Field(() => String, { nullable: true })
  description?: string | null;

  @Field(() => Boolean, { nullable: true })
  isActive?: boolean | null;

  @Field(() => ID, { nullable: true })
  parentId?: string | null;
}
