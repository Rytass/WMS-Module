import { Global, Module } from '@nestjs/common';
import { LoaderService } from './loader.service';

@Global()
@Module({
  providers: [LoaderService],
  exports: [LoaderService],
})
export class HelperModule {}
