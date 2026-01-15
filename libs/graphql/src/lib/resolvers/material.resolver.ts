import { Context, Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { MaterialDto, StockDto } from '../dto';
import { MaterialEntityClass, StockEntityClass } from '@wms-module/core';
import { type LoaderType } from '../helpers';

@Resolver(() => MaterialDto)
export class MaterialResolver {
  @ResolveField(() => [StockDto])
  stocks(
    @Parent() { id }: MaterialEntityClass,
    @Context() { loaders }: LoaderType<StockEntityClass>,
  ) {
    return loaders.batchMany.load({
      __entity: StockEntityClass,
      __from: { materialId: id },
    });
  }
}
