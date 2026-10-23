/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable @typescript-eslint/explicit-function-return-type */
/* eslint-disable  @typescript-eslint/no-explicit-any */
import { Injectable } from '@nestjs/common';
import { createHash } from 'crypto';
import _ from 'lodash';
import { LRUCache } from 'lru-cache';
import {
  Brackets,
  DataSource,
  EntityMetadata,
  EntityTarget,
  FindOptionsWhere,
  In,
  ObjectLiteral,
  SelectQueryBuilder,
} from 'typeorm';
import DataLoader from 'dataloader';

export interface LoaderOptions<K> {
  /**
   * Widened from `ObjectLiteral` so a resolver can pass the entity it had
   * injected from the `MaterialEntity` / `…Entity` Symbols — those are typed as
   * `EntityTarget`, which is also exactly what `core()` hands to
   * `getRepository()`.
   */
  __entity: EntityTarget<ObjectLiteral>;
  __from: FindOptionsWhere<K>;
  __conditions?: (
    qb: SelectQueryBuilder<ObjectLiteral>,
  ) => SelectQueryBuilder<ObjectLiteral>;
  __seed?: string;
  __pagination?: {
    offset: number;
    limit: number;
  };
}
export interface LoaderOptionsWithPagination<K> extends LoaderOptions<K> {
  __pagination: {
    offset: number;
    limit: number;
  };
}
@Injectable()
export class LoaderService {
  private readonly cache: LRUCache<any, any>;
  constructor(private dataSource: DataSource) {
    this.cache = new LRUCache({
      max: 10000,
      ttlAutopurge: true,
      ttl: 500,
    });
  }

  /**
   * create hash from `__entity` in loader option, and return option with `__hash` set with hash value.
   * @param LoaderOptions
   * @returns LoaderOptions
   */
  private useHash<T, F extends LoaderOptions<T>>(
    options: F,
  ): F & { __hash: string } {
    const algorithm = createHash('sha1');
    algorithm.update(options.__entity.toString());
    algorithm.update(_(Object.keys(options.__from)).sort().join(''));
    if (options.__seed) algorithm.update(options.__seed);

    if (options.__conditions) algorithm.update(options.__conditions.toString());

    return { ...options, __hash: algorithm.digest('hex') };
  }
  /**
   * generate index by queried data primary keys, which is defined in loader option `__from`
   * @param object
   * @param LoaderOptions
   * @returns Map<string, data>
   */
  private useIndex<T>(
    data: ObjectLiteral,
    { __hash, __from }: LoaderOptions<T> & { __hash: string },
  ): string {
    const fields = _(Object.keys(__from)).sort();

    return `${__hash}_${fields.map((field) => data[field]).join('_')}`;
  }

  /**
   * resolve a `__from` property name to the physical column it is stored in.
   *
   * TypeORM's `FindOptionsWhere` only accepts real column properties. A
   * `@RelationId()` property — e.g. `LocationEntityClass.parentId`, which mirrors
   * the `parent` tree relation — is virtual and is rejected with
   * `EntityPropertyNotFoundError`, even though it is backed by the relation's
   * join column. Map those back to their join column so they stay batchable.
   * @param EntityMetadata
   * @param string
   * @returns string | null
   */
  private resolveColumnName(
    metadata: EntityMetadata,
    propertyName: string,
  ): string | null {
    const column = metadata.findColumnWithPropertyName(propertyName);

    if (column) return column.databaseName;

    const relationId = metadata.relationIds.find(
      (candidate) => candidate.propertyName === propertyName,
    );
    const joinColumns = relationId?.relation.joinColumns ?? [];

    return joinColumns.length === 1 ? joinColumns[0].databaseName : null;
  }

  /**
   * build the where clause for `__from` keys that TypeORM's find options cannot
   * express (see {@link resolveColumnName}), by addressing the columns directly.
   * @param SelectQueryBuilder
   * @param EntityMetadata
   * @param LoaderOptions[]
   * @param (keyof T)[]
   */
  private applyColumnWhere<T>(
    qb: SelectQueryBuilder<ObjectLiteral>,
    metadata: EntityMetadata,
    options: LoaderOptions<T>[],
    primaryKeys: (keyof T)[],
  ): void {
    const columns = primaryKeys.map((primaryKey) => {
      const columnName = this.resolveColumnName(metadata, String(primaryKey));

      if (!columnName)
        throw new Error(
          `Loader cannot resolve property "${String(primaryKey)}" to a column of "${metadata.name}".`,
        );

      return {
        primaryKey,
        column: `entity.${this.dataSource.driver.escape(columnName)}`,
      };
    });

    if (columns.length === 1) {
      const [{ primaryKey, column }] = columns;

      qb.andWhere(`${column} IN (:...wmsLoaderValues)`, {
        wmsLoaderValues: options.map(({ __from }) => __from[primaryKey]),
      });

      return;
    }

    qb.andWhere(
      new Brackets((where) => {
        options.forEach(({ __from }, optionIndex) => {
          const parameters: ObjectLiteral = {};
          const predicate = columns
            .map(({ primaryKey, column }, columnIndex) => {
              const parameter = `wmsLoaderValue_${optionIndex}_${columnIndex}`;

              parameters[parameter] = __from[primaryKey];

              return `${column} = :${parameter}`;
            })
            .join(' AND ');

          where.orWhere(`(${predicate})`, parameters);
        });
      }),
    );
  }

  /**
   * query data by collecting primary keys from options with same `__entity`
   * @param LoaderOptions[]
   * @returns object[]
   */
  async core<T>(options: LoaderOptions<T>[]) {
    const [{ __entity, __from, __conditions }] = options;
    const repo = this.dataSource.getRepository(__entity);
    let qb = repo.createQueryBuilder('entity');
    const primaryKeys = Object.keys(__from) as [keyof T];
    const hasVirtualKey = primaryKeys.some(
      (primaryKey) =>
        !repo.metadata.findColumnWithPropertyName(String(primaryKey)),
    );

    if (hasVirtualKey)
      this.applyColumnWhere(qb, repo.metadata, options, primaryKeys);
    else if (primaryKeys.length > 1)
      qb.setFindOptions({ where: options.map(({ __from }) => __from) });
    else {
      const [primaryKey] = primaryKeys;
      qb.setFindOptions({
        where: {
          [primaryKey]: In(options.map(({ __from }) => __from[primaryKey])),
        },
      });
    }

    if (__conditions) qb = __conditions(qb);

    return qb.getMany();
  }

  /**
   * batch single entity to load function calls.
   * @returns object
   */
  public batchEntity<T>() {
    return new DataLoader<LoaderOptions<T>, T>(
      async (inputs): Promise<T[]> => {
        const options = inputs.map((input) => this.useHash(input));
        const dataMap = new Map();
        const processMap = _(options)
          .groupBy((x) => x.__hash)
          .value();
        await Promise.all(
          Object.keys(processMap).map(async (entityHash) => {
            const options = processMap[entityHash];
            const [option] = options;
            const entities = await this.core(options);
            entities.map((entity) =>
              dataMap.set(this.useIndex(entity, option), entity),
            );
          }),
        );

        return options.map((option) =>
          dataMap.get(this.useIndex(option.__from, option)),
        );
      },
      {
        batchScheduleFn: (callback) => setTimeout(callback, 50),
        cacheKeyFn: (option) =>
          this.useIndex(option.__from, this.useHash(option)) as any,
        cacheMap: this.cache,
      },
    );
  }

  /**
   * batch many entities to load function calls.
   * @returns object[]
   */
  public batchEntities<T>() {
    return new DataLoader<LoaderOptions<T>, T[]>(
      async (inputs): Promise<T[][]> => {
        const options = inputs.map((input) => this.useHash(input));
        const dataMap = new Map();
        const processMap = _(options)
          .groupBy((x) => x.__hash)
          .value();
        await Promise.all(
          Object.keys(processMap).map(async (entityHash) => {
            const options = processMap[entityHash];
            const [option] = options;
            const entities = await this.core(options);
            entities.map((entity) => {
              const index = this.useIndex(entity, option);
              const entities = dataMap.get(index) ?? [];
              entities.push(entity);
              dataMap.set(index, entities);
            });
          }),
        );

        return options.map((option) => {
          const result =
            dataMap.get(this.useIndex(option.__from, option)) ?? [];

          return option.__pagination
            ? result.slice(
                option.__pagination.offset,
                option.__pagination.offset + option.__pagination.limit,
              )
            : result;
        });
      },
      {
        batchScheduleFn: (callback) => setTimeout(callback, 100),
        cacheKeyFn: (option) =>
          this.useIndex(option.__from, this.useHash(option)) as any,
        cacheMap: this.cache,
      },
    );
  }

  public batchEntitiesWithPagination<T>() {
    return new DataLoader<
      LoaderOptionsWithPagination<T>,
      { items: T[]; total: number }
    >(
      async (inputs): Promise<{ items: T[]; total: number }[]> => {
        const options = inputs.map((input) => this.useHash(input));
        const dataMap = new Map();
        const processMap = _(options)
          .groupBy((x) => x.__hash)
          .value();
        await Promise.all(
          Object.keys(processMap).map(async (entityHash) => {
            const options = processMap[entityHash];
            const [option] = options;
            const entities = await this.core(options);
            entities.map((entity) => {
              const index = this.useIndex(entity, option);
              const entities = dataMap.get(index) ?? [];
              entities.push(entity);
              dataMap.set(index, entities);
            });
          }),
        );

        return options.map((option) => {
          const result = dataMap.get(this.useIndex(option.__from, option));
          if (!result) return { items: [], total: 0 };

          return {
            items: option.__pagination
              ? result.slice(
                  option.__pagination.offset,
                  option.__pagination.offset + option.__pagination.limit,
                )
              : result,
            total: result.length,
          };
        });
      },
      {
        batchScheduleFn: (callback) => setTimeout(callback, 100),
        cacheKeyFn: (option) =>
          this.useIndex(option.__from, this.useHash(option)) as any,
        cacheMap: this.cache,
      },
    );
  }
}
