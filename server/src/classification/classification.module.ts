import { Module } from '@nestjs/common';

import { CLASSIFICATION_PROVIDER } from './classification-provider';
import { ClassificationController } from './classification.controller';
import { ClassificationService } from './classification.service';
import { GeminiClassificationProvider } from './gemini-classification.provider';

@Module({
  controllers: [ClassificationController],
  providers: [
    ClassificationService,
    GeminiClassificationProvider,
    {
      provide: CLASSIFICATION_PROVIDER,
      useExisting: GeminiClassificationProvider,
    },
  ],
})
export class ClassificationModule {}
