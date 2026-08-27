import { Inject, Injectable, type OnModuleInit } from '@nestjs/common';
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
import { FindMaterialInput } from '../typings/find-material.input';
import { UnitEntityClass } from '../models';

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
> implements OnModuleInit
{
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

  /**
   * Fail at boot if the configured `materialEntity` was never registered with
   * TypeORM.
   *
   * The module cannot register it: `TypeOrmModule.forFeature()` runs while the
   * module graph is assembled, and the entity is only known once the options
   * resolve. Registering the base class does bring the override's *columns* into
   * the `materials` schema (TypeORM copies a single-table child's columns into
   * its parent), which makes the omission easy to miss — everything looks right
   * until the first query fails with a bare `EntityMetadataNotFoundError` from
   * somewhere deep in a resolver.
   */
  onModuleInit(): void {
    if (this.dataSource.hasMetadata(this.materialEntity)) return;

    const name =
      typeof this.materialEntity === 'function'
        ? this.materialEntity.name
        : String(this.materialEntity);

    throw new Error(
      `WmsModuleCoreModule: the configured materialEntity "${name}" is not registered with TypeORM. Add it to your DataSource "entities", or import TypeOrmModule.forFeature([${name}]) somewhere in your app when using autoLoadEntities.`,
    );
  }

  async getConversionFactor(materialId: string, unitId?: string) {
    const materialUnitRepository =
      this.dataSource.getRepository<MaterialUnitEntityClass>(
        this.materialUnitEntity,
      );

    if (!unitId) return 1;

    const materialUnit = await materialUnitRepository.findOneByOrFail({
      materialId,
      id: unitId,
    });

    return materialUnit.conversionFactor;
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

    const updated = await materialRepository.save(
      materialRepository.create({
        ...material,
        ...options,
      }),
    );

    if (options.units?.length) {
      const newUnits: Partial<MaterialUnitEntityClass>[] = [];
      const existingUnits: Partial<MaterialUnitEntityClass>[] = [];

      await materialUnitRepository
        .find({ where: { materialId: options.id } })
        .then((units) => {
          const unitSet = new Set(units.map((u) => u.unit));
          options.units?.forEach((unit) => {
            if (unitSet.has(unit.unit)) existingUnits.push(unit);
            else newUnits.push(unit);
          });
        });

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
    }

    return updated as T;
  }

  findMany(options: FindMaterialInput<T>): Promise<[T[], number]> {
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

    if (options.offset !== undefined && options.offset >= 0)
      queryBuilder.skip(options.offset);

    if (options.limit !== undefined && options.limit > 0)
      queryBuilder.take(options.limit);

    return queryBuilder.getManyAndCount();
  }
}
