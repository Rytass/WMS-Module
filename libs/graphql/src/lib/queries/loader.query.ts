import { Injectable } from '@nestjs/common';
import { Args, ID, Query } from '@nestjs/graphql';
import { LoaderService } from '@wms-module/core';
import { LoaderDto, Loaders } from '../dto';
import { FindLoaderArgs } from '../inputs/find-loader.args';

@Injectable()
export class LoaderQuery {
  constructor(private readonly loaderService: LoaderService) {}

  @Query(() => LoaderDto)
  loader(@Args('id', { type: () => ID }) id: string): Promise<LoaderDto> {
    return this.loaderService.loaderRepository.findOneByOrFail({ id });
  }

  @Query(() => Loaders)
  async loaders(@Args() args: FindLoaderArgs): Promise<Loaders> {
    const [items, total] = await this.loaderService.findMany(args);
    return { items, total };
  }
}
