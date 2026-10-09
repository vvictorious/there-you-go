import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { ClassificationModule } from './classification/classification.module';
import { validateEnvironment } from './config/environment';
import { HealthModule } from './health/health.module';
import { PlacesModule } from './places/places.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      cache: true,
      isGlobal: true,
      validate: validateEnvironment,
    }),
    ClassificationModule,
    HealthModule,
    PlacesModule,
  ],
})
export class AppModule {}
