import { Inject, Injectable } from '@nestjs/common';
import {
  CreateMaterialInput,
  UpdateMaterialInput,
} from '../typings/create-material.input';
import {
  MaterialEntity,
  MaterialEntityClass,
} from '../models/metadata/material.entity';
import {
  MaterialUnitEntity,
  MaterialUnitEntityClass,
} from '../models/metadata/material-unit.entity';
import {
  DataSource,
  EntityManager,
  Repository,
  type EntityTarget,
} from 'typeorm';
import {
  FindMaterialInput,
  MaterialSortField,
} from '../typings/find-material.input';
import { SortOrder } from '../typings/list-sort';
import { UnitEntityClass } from '../models';
import { applyListSort } from '../utils/list-sort';
import { assertPositiveConversionFactor } from '../utils/assert-positive-conversion-factor';

/** ORDER BY expressions per sort field; `baseUnit` is joined on demand. */
const MATERIAL_SORT_FIELDS: Readonly<Record<MaterialSortField, string>> = {
  [MaterialSortField.KEY]: 'material.key',
  [MaterialSortField.DESCRIPTION]: 'material.description',
  [MaterialSortField.BASE_UNIT]: 'baseUnit.key',
  [MaterialSortField.IS_ACTIVE]: 'material.isActive',
  [MaterialSortField.CREATED_AT]: 'material.createdAt',
};

/**
 * Service for managing materials and their units
 * Supports dynamic entity injection for customization
 * T - Material entity type
 * K - Material Unit entity type
 */
@Injectable()
export class MaterialService<
  T extends MaterialEntityClass = MaterialEntityClass,
  K extends MaterialUnitEntityClass = MaterialUnitEntityClass,
> {
  readonly materialRepository: Repository<T>;
  readonly materialUnitRepository: Repository<K>;
  constructor(
    private readonly dataSource: DataSource,
    @Inject(MaterialEntity) readonly materialEntity: EntityTarget<T>,
    @Inject(MaterialUnitEntity) readonly materialUnitEntity: EntityTarget<K>,
  ) {
    this.materialRepository = this.dataSource.getRepository<T>(
      this.materialEntity,
    );
    this.materialUnitRepository = this.dataSource.getRepository<K>(
      this.materialUnitEntity,
    );
  }

  async getConversionFactor(
    materialId: string,
    unitId?: string,
    manager: EntityManager = this.dataSource.manager,
  ): Promise<number> {
    const materialUnitRepository =
      manager.getRepository<MaterialUnitEntityClass>(this.materialUnitEntity);

    if (!unitId) return 1;

    const materialUnit = await materialUnitRepository.findOneByOrFail({
      materialId,
      id: unitId,
    });

    // `numeric` comes back from pg as a string; a stored 0, negative, NaN or
    // Infinity must stop the movement rather than be multiplied in.
    return assertPositiveConversionFactor(
      materialUnit.conversionFactor,
      materialUnit.unit,
    );
  }

  async createMaterial({
    manager = this.dataSource.manager,
    ...options
  }: CreateMaterialInput & { manager?: EntityManager }): Promise<T> {
    const materialRepository = manager.getRepository<MaterialEntityClass>(
      this.materialEntity,
    );
    const materialUnitRepository =
      manager.getRepository<MaterialUnitEntityClass>(this.materialUnitEntity);

    const unitRepository =
      manager.getRepository<UnitEntityClass>(UnitEntityClass);

    options.units?.forEach((unit) =>
      assertPositiveConversionFactor(unit.conversionFactor, unit.unit),
    );

    const baseUnit = await unitRepository
      .findOneBy({ key: options.baseUnit })
      .then((unit) => {
        return unit
          ? unit
          : unitRepository.save(
              unitRepository.create({ key: options.baseUnit }),
            );
      });
    options.baseUnit = baseUnit.id;

    const material = materialRepository.create(options);
    const { id } = await materialRepository.save(material);

    if (options.units && options.units.length > 0) {
      const units = materialUnitRepository.create(
        options.units.map((unit) => ({
          ...unit,
          materialId: id,
        })),
      );
      await materialUnitRepository.save(units);
    }

    return material as T;
  }

  async updateMaterial({
    manager = this.dataSource.manager,
    ...options
  }: UpdateMaterialInput & { manager?: EntityManager }): Promise<T> {
    const materialRepository = manager.getRepository<MaterialEntityClass>(
      this.materialEntity,
    );
    const materialUnitRepository =
      manager.getRepository<MaterialUnitEntityClass>(this.materialUnitEntity);

    const material = await materialRepository.findOneByOrFail({
      id: options.id,
    });

    const newUnits: Partial<MaterialUnitEntityClass>[] = [];
    const existingUnits: Partial<MaterialUnitEntityClass>[] = [];

    if (options.units?.length) {
      const known = new Set(
        (
          await materialUnitRepository.find({
            where: { materialId: options.id },
          })
        ).map((u) => u.unit),
      );

      // Checked before anything is written. An existing unit may be re-sent
      // without a factor; any value given, and every new unit's, must be usable.
      options.units.forEach((unit) => {
        if (known.has(unit.unit)) {
          if (unit.conversionFactor !== undefined)
            assertPositiveConversionFactor(unit.conversionFactor, unit.unit);
          existingUnits.push(unit);
        } else {
          assertPositiveConversionFactor(unit.conversionFactor, unit.unit);
          newUnits.push(unit);
        }
      });
    }

    const updated = await materialRepository.save(
      materialRepository.create({
        ...material,
        ...options,
      }),
    );

    if (newUnits.length)
      await materialUnitRepository.save(
        materialUnitRepository.create(
          newUnits.map((unit) => ({ ...unit, materialId: options.id })),
        ),
      );
    if (existingUnits.length)
      await Promise.all(
        existingUnits.map((unit) =>
          materialUnitRepository.update(
            { materialId: options.id, unit: unit.unit },
            unit,
          ),
        ),
      );

    return updated as T;
  }

  async findMany(options: FindMaterialInput<T>): Promise<[T[], number]> {
    const queryBuilder = this.dataSource
      .getRepository<T>(this.materialEntity)
      .createQueryBuilder('material');

    if (options.materialId)
      queryBuilder.andWhere('material.id = :materialId', {
        materialId: options.materialId,
      });

    if (options.materialIds?.length)
      queryBuilder.andWhere('material.id IN (:...materialIds)', {
        materialIds: options.materialIds,
      });

    if (options.description)
      queryBuilder.andWhere('material.description ILIKE :description', {
        description: `%${options.description}%`,
      });

    if (options.wildcard) {
      const { key, value } = options.wildcard;
      queryBuilder.andWhere(`material."${String(key)}" ILIKE :value`, {
        value: `%${value}%`,
      });
    }

    // `materials.baseUnit` holds the unit's id; sorting by it would order by
    // uuid. Join the unit (by class, so the table prefix and the paginated
    // DISTINCT subquery both resolve it) and select its key, only when asked —
    // the join is one row per material (`units.id` is the primary key).
    if (options.sort?.field === MaterialSortField.BASE_UNIT) {
      queryBuilder
        .leftJoin(
          UnitEntityClass,
          'baseUnit',
          // `CAST(...)`, not `::text`: TypeORM only rewrites `alias.property`
          // when a space, `=`, `)` or `,` follows it.
          'CAST(baseUnit.id AS text) = material.baseUnit',
        )
        .addSelect('baseUnit.key');
    }

    applyListSort(queryBuilder, {
      sort: options.sort,
      fields: MATERIAL_SORT_FIELDS,
      defaultOrder: {
        field: MaterialSortField.CREATED_AT,
        order: SortOrder.DESC,
      },
      tiebreaker: 'material.id',
    });

    if (options.offset !== undefined && options.offset >= 0)
      queryBuilder.skip(options.offset);

    if (options.limit !== undefined && options.limit > 0)
      queryBuilder.take(options.limit);

    return queryBuilder.getManyAndCount();
  }
}
