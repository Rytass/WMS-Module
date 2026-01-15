import { Context, Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { LocationDto } from '../dto/location.dto';
import { MapDataDto } from '../dto/warehouse-map.dto';
import { type LoaderType } from '../helpers';
import { WarehouseMapEntity } from '@rytass/wms-base-nestjs-module/models/warehouse-map.entity';

@Resolver(() => LocationDto)
export class LocationResolver {
  @ResolveField(() => MapDataDto, { nullable: true })
  async mapData(
    @Parent() { id }: LocationDto,
    @Context() { loaders }: LoaderType<WarehouseMapEntity>,
  ): Promise<MapDataDto | null> {
    const map = await loaders.batchSingle.load({
      __entity: WarehouseMapEntity,
      __from: { id },
    });
    return map?.mapData || null;
  }
}
