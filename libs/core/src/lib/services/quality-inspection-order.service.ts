import { Inject, Injectable } from '@nestjs/common';
import {
  QualityInspectionOrderEntity,
  QualityInspectionOrderEntityClass,
  QualityInspectionOrderItemEntity,
  QualityInspectionOrderItemEntityClass,
} from '../models';
import { DataSource } from 'typeorm';

@Injectable()
export class QualityInspectionOrderService<
  T extends
    QualityInspectionOrderEntityClass = QualityInspectionOrderEntityClass,
  K extends
    QualityInspectionOrderItemEntityClass = QualityInspectionOrderItemEntityClass,
> {
  constructor(
    private readonly dataSource: DataSource,
    @Inject(QualityInspectionOrderEntity)
    readonly qualityInspectionOrderEntity: T,
    @Inject(QualityInspectionOrderItemEntity)
    readonly qualityInspectionOrderItemEntity: K,
  ) {}
}
