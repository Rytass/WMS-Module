import { ObjectLiteral, Repository } from 'typeorm';
import { StockEntityClass } from '../models';
import { OrderEntity } from '@rytass/wms-base-nestjs-module';
import { MaterialService } from './material.service';
import { StockService } from './stock.service';

export interface StockEntryParams {
  materialId: string;
  batchId: string;
  quantity: number;
  locationId?: string;
  loaderId?: string;
  unitId?: string;
}

export interface Repositories {
  order: Repository<OrderEntity>;
  stock: Repository<StockEntityClass>;
  [key: string]: Repository<ObjectLiteral>;
}

/**
 * Base service for order operations that create/deduct stock entries.
 * Provides common methods for adding and deducting inventory across different
 * order types.
 *
 * Public API, with one precondition that is easy to miss.
 *
 * `add` and `deduct` write an `orders` row and `stocks` rows — and nothing else.
 * They do **not** write a `*_order_changes` row, and both `StockChangeSubscriber`
 * and `InventoryCountLockSubscriber` hook the insert of that row. So a host that
 * extends this and registers `customChangeTables`, but leaves its own change row
 * unwritten, gets neither the `stock.*` event nor the inventory count lock: its
 * movements pass a running count in silence. Writing the change row is the
 * host's job, exactly as it is for every service in this package.
 *
 * What extending it does buy is unit conversion and
 * `StockService.validateStockAvailability` around the stock write. See
 * {@link WmsCustomChangeTable} for the rest of what a custom family inherits.
 */
export abstract class BaseOrderService {
  protected abstract materialService: MaterialService;
  protected abstract stockService: StockService;

  /**
   * Creates a new order and saves a positive quantity stock entry
   * @param repos Repository map containing order and stock repositories
   * @param params Stock entry parameters (materialId, batchId, quantity, locationId?, loaderId?, unitId?)
   * @returns Created order ID
   */
  protected async add(
    repos: Repositories,
    params: StockEntryParams,
  ): Promise<string> {
    const { materialId, batchId, quantity, locationId, loaderId, unitId } =
      params;

    // Create new order
    const order = await repos.order.save({});

    // Get conversion factor if unitId is provided
    const conversionFactor = await this.materialService.getConversionFactor(
      materialId,
      unitId,
    );

    // Create positive stock entry linked to this order
    await repos.stock.save(
      repos.stock.create({
        orderId: order.id,
        materialId,
        batchId,
        locationId: this.stockService.resolveLocationId(locationId),
        loaderId: this.stockService.resolveLoaderId(loaderId),
        quantity: quantity * conversionFactor,
      }),
    );

    return order.id;
  }

  /**
   * Creates a negative quantity stock entry linked to a source order
   * Used to deduct stock from an existing status (FREE, ALLOCATED, IN_TRANSFER, etc.)
   * @param repos Repository map containing order and stock repositories
   * @param sourceOrderId The order ID to link the deduction to (typically an existing allocated/transferred order)
   * @param params Stock entry parameters (materialId, batchId, quantity, locationId?, loaderId?, unitId?)
   */
  protected async deduct(
    repos: Repositories,
    params: StockEntryParams,
  ): Promise<void> {
    const { materialId, batchId, quantity, locationId, loaderId, unitId } =
      params;

    const order = await repos.order.save({});

    // Get conversion factor if unitId is provided
    const conversionFactor = await this.materialService.getConversionFactor(
      materialId,
      unitId,
    );

    // Create negative stock entry linked to source order
    // This allows the status calculation to determine what status is being deducted from
    await this.stockService.validateStockAvailability(
      {
        materialId,
        batchId,
        locationId: this.stockService.resolveLocationId(locationId),
        loaderId: this.stockService.resolveLoaderId(loaderId),
        quantity: quantity * conversionFactor,
      },
      repos.stock.manager,
    );

    await repos.stock.save(
      repos.stock.create({
        orderId: order.id,
        materialId,
        batchId,
        locationId: this.stockService.resolveLocationId(locationId),
        loaderId: this.stockService.resolveLoaderId(loaderId),
        quantity: -1 * quantity * conversionFactor,
      }),
    );
  }
}
