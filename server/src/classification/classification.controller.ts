import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';

import type { ItemClassificationResponse } from './classification-response';
import { ClassificationService } from './classification.service';
import { ClassifyItemDto } from './dto/classify-item.dto';

@Controller('classification')
export class ClassificationController {
  constructor(private readonly classificationService: ClassificationService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  classify(
    @Body() request: ClassifyItemDto,
  ): Promise<ItemClassificationResponse> {
    return this.classificationService.classify(request.text);
  }
}
