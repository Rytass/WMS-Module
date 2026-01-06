import { Module } from '@nestjs/common';
import { LoaderService } from './services/loader.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WMSBaseModule } from '@rytass/wms-base-nestjs-module';

@Module({
  imports: [WMSBaseModule.forRoot({}), TypeOrmModule.forFeature([])],
  providers: [LoaderService],
  exports: [LoaderService],
})
export class WmsModuleCoreModule {}
