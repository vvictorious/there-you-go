import { Module } from '@nestjs/common';

import { CLASSIFICATION_PROVIDER } from './classification-provider';
import { ClassificationController } from './classification.controller';
import { ClassificationService } from './classification.service';
import { UnconfiguredClassificationProvider } from './unconfigured-classification.provider';

@Module({
  controllers: [ClassificationController],
  providers: [
    ClassificationService,
    UnconfiguredClassificationProvider,
    {
      provide: CLASSIFICATION_PROVIDER,
      useExisting: UnconfiguredClassificationProvider,
    },
  ],
})
export class ClassificationModule {}
