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
