import { Inject, Injectable } from '@nestjs/common';

import {
  CLASSIFICATION_PROVIDER,
  type ClassificationProvider,
} from './classification-provider';
import {
  type ItemClassificationResponse,
  parseItemClassificationResponse,
} from './classification-response';

@Injectable()
export class ClassificationService {
  constructor(
    @Inject(CLASSIFICATION_PROVIDER)
    private readonly provider: ClassificationProvider,
  ) {}

  async classify(text: string): Promise<ItemClassificationResponse> {
    const response = await this.provider.classify(text);

    return parseItemClassificationResponse(response);
  }
}
