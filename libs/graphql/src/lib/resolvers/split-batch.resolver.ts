import { Context, Parent, ResolveField, Resolver } from '@nestjs/graphql';
import {
  SplitBatchOrderDto,
  SplitBatchOrderItemDto,
} from '../dto/split-batch-order.dto';
import { type LoaderType } from '../helpers';
import { SplitBatchOrderItemEntityClass } from '@rytass/wms-module-core';

@Resolver(() => SplitBatchOrderDto)
export class SplitBatchResolver {
  @ResolveField(() => [SplitBatchOrderItemDto])
  items(
    @Parent() { id }: SplitBatchOrderDto,
    @Context() { loaders }: LoaderType<SplitBatchOrderItemEntityClass>,
  ): Promise<SplitBatchOrderItemDto[]> {
    return loaders.batchMany.load({
      __entity: SplitBatchOrderItemEntityClass,
      __from: { orderId: id },
    });
  }
}
