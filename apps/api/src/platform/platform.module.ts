import { Module } from '@nestjs/common';
import { StoresModule } from '../stores/stores.module';
import { PlatformController } from './platform.controller';
import { PlatformService } from './platform.service';

@Module({ imports: [StoresModule], controllers: [PlatformController], providers: [PlatformService] })
export class PlatformModule {}
