import type { LoaderType } from './dataloader.type';
import type { LoaderService } from './loader.service';

export type WmsLoaders = LoaderType<unknown>['loaders'];

export function createWmsLoaders(
  loaderService: LoaderService,
): { loaders: WmsLoaders } {
  return {
    loaders: {
      batchSingle: loaderService.batchEntity(),
      batchMany: loaderService.batchEntities(),
      batchManyWithPagination: loaderService.batchEntitiesWithPagination(),
    },
  };
}
