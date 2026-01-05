import { Module } from '@nestjs/common';
import { LoaderService } from './services/loader.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoadersEntity } from './models/metadata/loader.entity';
import { LoaderTypeEntity } from './models/metadata/loader-type.entity';

@Module({
  imports: [TypeOrmModule.forFeature([LoadersEntity, LoaderTypeEntity])],
  providers: [LoaderService],
  exports: [LoaderService],
})
export class WmsModuleCoreModule {}
