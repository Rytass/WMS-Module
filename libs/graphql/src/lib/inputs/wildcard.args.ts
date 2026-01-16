import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class WildcardArgs {
  @Field(() => String)
  key: keyof object;

  @Field(() => String)
  value: string;
}
