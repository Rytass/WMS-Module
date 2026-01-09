import { Context, Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { LoaderDto, LoaderTypeDto } from '../dto';
import { LoadersEntityClass, LoaderTypeEntityClass } from '@wms-module/core';
import { type LoaderType } from '../helpers';

@Resolver(() => LoaderDto)
export class LoaderResolver {
  @ResolveField(() => LoaderTypeDto)
  type(
    @Parent() { typeId }: LoadersEntityClass,
    @Context() { loaders }: LoaderType<LoaderTypeEntityClass>
  ) {
    return loaders.batchSingle.load({
      __entity: LoaderTypeEntityClass,
      __from: { id: typeId },
    });
  }
}
