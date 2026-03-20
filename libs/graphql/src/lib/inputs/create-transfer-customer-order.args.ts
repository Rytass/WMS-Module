import { ArgsType, Field, ID, OmitType, PartialType } from '@nestjs/graphql';
import {
  CreateTransferCustomerOrderItemArgs,
  UpdateTransferCustomerOrderItemArgs,
} from './create-transfer-customer-order-item.args';

@ArgsType()
export class CreateTransferCustomerOrderArgs {
  @Field(() => String, { nullable: true })
  description?: string;

  @Field(() => String)
  customerId!: string;

  @Field(() => String, { nullable: true })
  createdBy?: string;

  @Field(() => [CreateTransferCustomerOrderItemArgs])
  items!: CreateTransferCustomerOrderItemArgs[];
}

@ArgsType()
export class UpdateTransferCustomerOrderArgs extends PartialType(
  OmitType(CreateTransferCustomerOrderArgs, ['items']),
) {
  @Field(() => ID)
  id!: string;

  @Field(() => Date, { nullable: true })
  removedAt?: Date;

  @Field(() => [UpdateTransferCustomerOrderItemArgs], { nullable: true })
  items?: UpdateTransferCustomerOrderItemArgs[];
}
