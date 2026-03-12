import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { SaleOrderEntityClass } from '../models/metadata/sale-order.entity';

@Injectable()
export class SaleOrderService {
  readonly saleOrderRepository: Repository<SaleOrderEntityClass>;

  constructor(private readonly dataSource: DataSource) {
    this.saleOrderRepository =
      this.dataSource.getRepository<SaleOrderEntityClass>(SaleOrderEntityClass);
  }
}
