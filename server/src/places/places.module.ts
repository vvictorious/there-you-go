import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { GooglePlacesProvider } from './google-places.provider';
import { PLACES_PROVIDER } from './places-provider';
import { PlacesController } from './places.controller';
import { PlacesService } from './places.service';
import { UnconfiguredPlacesProvider } from './unconfigured-places.provider';

@Module({
  controllers: [PlacesController],
  providers: [
    PlacesService,
    GooglePlacesProvider,
    UnconfiguredPlacesProvider,
    {
      provide: PLACES_PROVIDER,
      inject: [ConfigService, GooglePlacesProvider, UnconfiguredPlacesProvider],
      useFactory: (
        config: ConfigService,
        googleProvider: GooglePlacesProvider,
        unconfiguredProvider: UnconfiguredPlacesProvider,
      ) =>
        config.get<string>('GOOGLE_PLACES_API_KEY')
          ? googleProvider
          : unconfiguredProvider,
    },
  ],
  exports: [PlacesService],
})
export class PlacesModule {}
