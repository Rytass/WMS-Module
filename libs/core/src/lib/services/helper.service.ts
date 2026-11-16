import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { DateTime } from 'luxon';
import { WmsSequenceService } from './sequence.service';

@Injectable()
export class HelperService {
  constructor(private readonly sequenceService: WmsSequenceService) {}

  /**
   * The next order key for `prefix` today: `yyyyMMdd` and a four-digit daily
   * serial. Counted by `WmsSequenceService` under `<prefix>_<yyyyMMdd>`, the
   * name the sequence has always had, so an existing deployment carries on.
   */
  async getSeq(prefix: string, manager?: EntityManager): Promise<string> {
    const dateStr = DateTime.now().toFormat('yyyyMMdd');
    const serial = await this.sequenceService.reserve(
      `${prefix}_${dateStr}`,
      1,
      manager,
    );

    return `${dateStr}${String(serial).padStart(4, '0')}`;
  }
}
