import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class DateRangeArgs {
  @Field(() => Date)
  from!: Date;

  @Field(() => Date)
  to!: Date;
}
