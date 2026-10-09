import { Injectable, ServiceUnavailableException } from '@nestjs/common';

import type { ClassificationProvider } from './classification-provider';

@Injectable()
export class UnconfiguredClassificationProvider implements ClassificationProvider {
  classify(): Promise<unknown> {
    throw new ServiceUnavailableException(
      'Classification provider is not configured',
    );
  }
}
