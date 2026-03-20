import { Context, Parent, ResolveField, Resolver } from '@nestjs/graphql';
import {
  MergeBatchOrderDto,
  MergeBatchOrderItemDto,
} from '../dto/merge-batch-order.dto';
import { MergeBatchOrderItemEntityClass } from '@wms-module/core';
import { type LoaderType } from '../helpers';

@Resolver(() => MergeBatchOrderDto)
export class MergeBatchOrderResolver {
  @ResolveField(() => [MergeBatchOrderItemDto])
  items(
    @Parent() { id }: MergeBatchOrderDto,
    @Context() { loaders }: LoaderType<MergeBatchOrderItemEntityClass>,
  ): Promise<MergeBatchOrderItemDto[]> {
    return loaders.batchMany.load({
      __entity: MergeBatchOrderItemEntityClass,
      __from: { orderId: id },
    });
  }
}
