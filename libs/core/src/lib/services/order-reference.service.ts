import { Inject, Injectable } from '@nestjs/common';
import {
  DataSource,
  EntityManager,
  EntityTarget,
  In,
  Repository,
} from 'typeorm';
import {
  OrderReferenceEntity,
  OrderReferenceEntityClass,
} from '../models/extensions/order-reference/order-reference.entity';
import { WmsOrderType } from '../constants/order-type';
import {
  AttachOrderReferencesInput,
  FindOrderReferenceInput,
} from '../typings/order-reference.input';

/**
 * Reads and writes the link between an order in this package and the host
 * document it was opened for.
 *
 * Deliberately a service of its own rather than an argument threaded through
 * thirteen `create*` signatures: the link is the same shape for every family,
 * including families added later, and a host driving the warehouse from its own
 * transaction can attach references in that transaction by passing `manager`.
 */
@Injectable()
export class OrderReferenceService {
  readonly orderReferenceRepository: Repository<OrderReferenceEntityClass>;

  constructor(
    private readonly dataSource: DataSource,
    @Inject(OrderReferenceEntity)
    readonly orderReferenceEntity: EntityTarget<OrderReferenceEntityClass>,
  ) {
    this.orderReferenceRepository =
      this.dataSource.getRepository<OrderReferenceEntityClass>(
        this.orderReferenceEntity,
      );
  }

  private repository(
    manager?: EntityManager,
  ): Repository<OrderReferenceEntityClass> {
    return manager
      ? manager.getRepository<OrderReferenceEntityClass>(
          this.orderReferenceEntity,
        )
      : this.orderReferenceRepository;
  }

  /**
   * Record why an order was opened.
   *
   * Additive: calling it twice adds two sets of references rather than
   * replacing the first. Pass `manager` to join the caller's transaction, so a
   * host that creates an order and attaches its references sees both rows land
   * together or neither.
   */
  async attach({
    manager,
    ...options
  }: AttachOrderReferencesInput & {
    manager?: EntityManager;
  }): Promise<OrderReferenceEntityClass[]> {
    if (!options.references.length) return [];

    const repository = this.repository(manager);

    return repository.save(
      options.references.map((reference) =>
        repository.create({
          orderType: options.orderType,
          orderId: options.orderId,
          itemId: reference.itemId ?? null,
          referenceType: reference.referenceType,
          referenceId: reference.referenceId,
          referenceLine: reference.referenceLine ?? null,
          metadata: reference.metadata ?? null,
        }),
      ),
    );
  }

  /**
   * Replace every reference on an order with the given set. An empty
   * `references` clears them.
   */
  async replace({
    manager,
    ...options
  }: AttachOrderReferencesInput & {
    manager?: EntityManager;
  }): Promise<OrderReferenceEntityClass[]> {
    const repository = this.repository(manager);

    await repository.delete({
      orderType: options.orderType,
      orderId: options.orderId,
    });

    return this.attach({ ...options, manager });
  }

  async detach(id: string, manager?: EntityManager): Promise<void> {
    await this.repository(manager).delete({ id });
  }

  /**
   * Both directions of the link in one query: give it an order to list what
   * that order was for, or a `referenceType` / `referenceId` to list every
   * order opened for that document.
   */
  async findMany(
    options: FindOrderReferenceInput,
  ): Promise<[OrderReferenceEntityClass[], number]> {
    /*
     * A lowercase alias on purpose: the conditions below are raw SQL fragments,
     * and Postgres folds an unquoted identifier to lowercase — a camelCase
     * alias would compile to `orderreference."orderType"` and fail with
     * `missing FROM-clause entry`.
     */
    const queryBuilder =
      this.orderReferenceRepository.createQueryBuilder('reference');

    if (options.orderType)
      queryBuilder.andWhere('reference."orderType" = :orderType', {
        orderType: options.orderType,
      });

    if (options.orderId)
      queryBuilder.andWhere('reference."orderId" = :orderId', {
        orderId: options.orderId,
      });

    if (options.itemId)
      queryBuilder.andWhere('reference."itemId" = :itemId', {
        itemId: options.itemId,
      });

    /*
     * Matched exactly, never with ILIKE. These are identifiers the host system
     * owns, and a substring match on 「WO-1」 would quietly return 「WO-10」 as
     * well — the same reasoning that governs the batch commercial attributes on
     * the stock queries.
     */
    if (options.referenceType)
      queryBuilder.andWhere('reference."referenceType" = :referenceType', {
        referenceType: options.referenceType,
      });

    if (options.referenceId)
      queryBuilder.andWhere('reference."referenceId" = :referenceId', {
        referenceId: options.referenceId,
      });

    if (options.referenceLine)
      queryBuilder.andWhere('reference."referenceLine" = :referenceLine', {
        referenceLine: options.referenceLine,
      });

    queryBuilder.orderBy('reference."createdAt"', 'ASC');

    if (options.offset !== undefined && options.offset >= 0)
      queryBuilder.skip(options.offset);

    if (options.limit !== undefined && options.limit > 0)
      queryBuilder.take(options.limit);

    return queryBuilder.getManyAndCount();
  }

  /**
   * Every reference on each of the given orders, for a DataLoader batching one
   * round trip across a page of orders.
   */
  async findByOrders(
    orderType: WmsOrderType,
    orderIds: readonly string[],
  ): Promise<OrderReferenceEntityClass[]> {
    if (!orderIds.length) return [];

    return this.orderReferenceRepository.find({
      where: { orderType, orderId: In([...orderIds]) },
      order: { createdAt: 'ASC' },
    });
  }
}
