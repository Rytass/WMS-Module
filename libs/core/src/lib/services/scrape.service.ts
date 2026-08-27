import { Inject, Injectable } from '@nestjs/common';
import {
  ScrapeOrderEntity,
  ScrapeOrderEntityClass,
  ScrapeOrderItemEntityClass,
  ScrapeOrderChangeEntityClass,
  StockEntity,
  StockEntityClass,
} from '../models';
import { DataSource, DeepPartial, EntityManager, EntityTarget } from 'typeorm';
import { OrderEntity } from '@rytass/wms-base-nestjs-module';
import { ScrapeInput } from '../typings/scrape.input';
import { HelperService } from './helper.service';
import { MaterialService } from './material.service';
import { StockService } from './stock.service';
import { WmsEntities } from '../models/wms-entities';

@Injectable()
export class ScrapeService<
  T extends ScrapeOrderEntityClass = ScrapeOrderEntityClass,
> {
  private readonly seqPrefix = 'SCR';

  constructor(
    private readonly dataSource: DataSource,
    private readonly entities: WmsEntities,
    private readonly helperService: HelperService,
    private readonly materialService: MaterialService,
    private readonly stockService: StockService,
    @Inject(ScrapeOrderEntity)
    readonly scrapeOrderEntity: EntityTarget<T>,
    @Inject(StockEntity) readonly stockEntity: EntityTarget<StockEntityClass>,
  ) {}

  private getRepositories(manager: EntityManager) {
    return {
      scrapeOrder: manager.getRepository<ScrapeOrderEntityClass>(
        this.scrapeOrderEntity,
      ),
      scrapeOrderItem: manager.getRepository<ScrapeOrderItemEntityClass>(
        ScrapeOrderItemEntityClass,
      ),
      scrapeOrderChange: manager.getRepository(ScrapeOrderChangeEntityClass),
      order: manager.getRepository<OrderEntity>(this.entities.order),
      stock: manager.getRepository<StockEntityClass>(this.stockEntity),
    };
  }

  async scrape(
    items: ScrapeInput[],
    manager = this.dataSource.manager,
  ): Promise<T> {
    const repos = this.getRepositories(manager);
    const key = await this.helperService.getSeq(this.seqPrefix);

    // Create order
    const order = await repos.scrapeOrder.save(
      repos.scrapeOrder.create({
        key,
      }),
    );

    // Process each item
    await Promise.all(
      items.map(async (data) => {
        if (!data.materialId || !data.batchId) return;

        // Create order item
        const item = await repos.scrapeOrderItem.save(
          repos.scrapeOrderItem.create({
            ...data,
            orderId: order.id,
            targetScrapedQuantity: data.quantity,
          }),
        );

        // Create base order for the change
        const baseOrder = await repos.order.save({});

        // Get conversion factor to convert to base unit
        const conversionFactor = await this.materialService.getConversionFactor(
          item.materialId,
          item.unitId || undefined,
        );

        // Create change record
        await repos.scrapeOrderChange.save(
          repos.scrapeOrderChange.create({
            item,
            order: baseOrder,
            quantityChanged: item.targetScrapedQuantity * conversionFactor,
          }),
        );

        // Deduct stock from original batch (only deduction, no transfer)
        await this.stockService.validateStockAvailability(
          {
            materialId: item.materialId,
            batchId: item.batchId,
            locationId: this.stockService.resolveLocationId(item.locationId),
            loaderId: this.stockService.resolveLoaderId(item.loaderId),
            quantity: item.targetScrapedQuantity * conversionFactor,
          },
          manager,
        );

        await repos.stock.save(
          repos.stock.create({
            orderId: baseOrder.id,
            materialId: item.materialId,
            batchId: item.batchId,
            locationId: this.stockService.resolveLocationId(item.locationId),
            loaderId: this.stockService.resolveLoaderId(item.loaderId),
            quantity: -1 * item.targetScrapedQuantity * conversionFactor,
          } as DeepPartial<StockEntityClass>),
        );
      }),
    );

    return order as T;
  }
}
