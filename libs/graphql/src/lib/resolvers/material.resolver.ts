import { Context, Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { MaterialDto, MaterialUnitDto, StockDto } from '../dto';
import {
  MaterialEntityClass,
  MaterialUnitEntityClass,
  StockEntityClass,
} from '@wms-module/core';
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

  @ResolveField(() => [MaterialUnitDto])
  materialUnits(
    @Parent() { id }: MaterialEntityClass,
    @Context() { loaders }: LoaderType<MaterialUnitEntityClass>,
  ) {
    return loaders.batchMany.load({
      __entity: MaterialUnitEntityClass,
      __from: { materialId: id },
    });
  }
}
