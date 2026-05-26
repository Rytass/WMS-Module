import { Context, Int, Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { LoaderTypeDto } from '../dto';
import { LoadersEntityClass, LoaderTypeEntityClass } from '@rytass/wms-module-core';
import { type LoaderType } from '../helpers';

@Resolver(() => LoaderTypeDto)
export class LoaderTypeResolver {
  @ResolveField(() => Int)
  async referencedQuantity(
    @Parent() { id }: LoaderTypeEntityClass,
    @Context() { loaders }: LoaderType<LoadersEntityClass>,
  ): Promise<number> {
    const referenced = await loaders.batchMany.load({
      __entity: LoadersEntityClass,
      __from: { typeId: id },
    });
    return referenced.length;
  }
}
