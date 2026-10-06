import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';

import { FindPlaceCandidatesDto } from './dto/find-place-candidates.dto';
import { FindPlaceCandidatesResult, PlacesService } from './places.service';

@Controller('places')
export class PlacesController {
  constructor(private readonly placesService: PlacesService) {}

  @Post('candidates')
  @HttpCode(HttpStatus.OK)
  findCandidates(
    @Body() request: FindPlaceCandidatesDto,
  ): Promise<FindPlaceCandidatesResult> {
    return this.placesService.findCandidates(request);
  }
}
