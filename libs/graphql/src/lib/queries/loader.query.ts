import { Injectable } from '@nestjs/common';
import { Args, ID, Query } from '@nestjs/graphql';
import { LoaderService } from '@wms-module/core';
import { LoaderDto, Loaders, LoaderTypeDto, LoaderTypes } from '../dto';
import { FindLoaderArgs } from '../inputs/find-loader.args';
import { FindLoaderTypeArgs } from '../inputs/find-loader-type.args';

@Injectable()
export class LoaderQuery {
  constructor(private readonly loaderService: LoaderService) {}

  @Query(() => LoaderDto)
  loader(@Args('id', { type: () => ID }) id: string): Promise<LoaderDto> {
    return this.loaderService.loaderRepository.findOneByOrFail({ id });
  }

  @Query(() => Loaders)
  async loaders(@Args() args: FindLoaderArgs): Promise<Loaders> {
    const [items, total] = await this.loaderService.findManyLoaders(args);
    return { items, total };
  }

  @Query(() => LoaderTypeDto)
  async loaderType(
    @Args('id', { type: () => ID }) id: string,
  ): Promise<LoaderTypeDto> {
    return this.loaderService.loaderTypeRepository.findOneByOrFail({ id });
  }

  @Query(() => LoaderTypes)
  async loaderTypes(@Args() args: FindLoaderTypeArgs): Promise<LoaderTypes> {
    const [items, total] = await this.loaderService.findManyLoaderTypes({
      ...args,
      wildcard: args.serial ? { key: 'key', value: args.serial } : undefined,
    });
    return { items, total };
  }
}
