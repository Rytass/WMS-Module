import DataLoader from 'dataloader';
import { LoaderOptions, LoaderOptionsWithPagination } from './loader.service';

export interface LoaderType<T> {
  loaders: {
    batchMany: DataLoader<LoaderOptions<T>, T[]>;
    batchSingle: DataLoader<LoaderOptions<T>, T>;
    batchManyWithPagination: DataLoader<
      LoaderOptionsWithPagination<T>,
      { items: T[]; total: number }
    >;
  };
}
