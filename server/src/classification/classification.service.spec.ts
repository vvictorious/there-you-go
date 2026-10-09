import { BadGatewayException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { describe, expect, it, vi } from 'vitest';

import {
  CLASSIFICATION_PROVIDER,
  type ClassificationProvider,
} from './classification-provider';
import {
  DESTINATION_TAXONOMY_VERSION,
  type ItemClassificationResponse,
} from './classification-response';
import { ClassificationService } from './classification.service';

describe('ClassificationService', () => {
  async function createService() {
    const classify = vi.fn<ClassificationProvider['classify']>();
    const module = await Test.createTestingModule({
      providers: [
        ClassificationService,
        {
          provide: CLASSIFICATION_PROVIDER,
          useValue: { classify } satisfies ClassificationProvider,
        },
      ],
    }).compile();

    return { classify, service: module.get(ClassificationService) };
  }

  it.each([
    {
      outcome: 'classified',
      categories: ['grocery-store'],
      taxonomyVersion: DESTINATION_TAXONOMY_VERSION,
    },
    {
      outcome: 'no-destination',
      categories: [],
      taxonomyVersion: DESTINATION_TAXONOMY_VERSION,
    },
    {
      outcome: 'needs-clarification',
      categories: [],
      clarificationQuestion: 'What item do you need?',
      taxonomyVersion: DESTINATION_TAXONOMY_VERSION,
    },
    {
      outcome: 'unsupported-destination',
      categories: [],
      taxonomyVersion: DESTINATION_TAXONOMY_VERSION,
    },
  ] satisfies ItemClassificationResponse[])(
    'returns a validated $outcome provider response',
    async (response) => {
      const { classify, service } = await createService();
      classify.mockResolvedValue(response);

      await expect(service.classify('Milk')).resolves.toEqual(response);
      expect(classify).toHaveBeenCalledWith('Milk');
    },
  );

  it('rejects a malformed provider response', async () => {
    const { classify, service } = await createService();
    classify.mockResolvedValue({
      outcome: 'classified',
      categories: [],
      taxonomyVersion: DESTINATION_TAXONOMY_VERSION,
    });

    await expect(service.classify('Milk')).rejects.toEqual(
      new BadGatewayException(
        'Classification provider returned an invalid response',
      ),
    );
  });
});
