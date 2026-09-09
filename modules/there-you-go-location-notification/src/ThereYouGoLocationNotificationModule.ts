import { NativeModule, requireNativeModule } from 'expo';

export type LocationNotificationRequest = {
  identifier: string;
  title: string;
  body: string;
  latitude: number;
  longitude: number;
  radius: number;
};

export type ScheduledLocationNotification = LocationNotificationRequest & {
  notifyOnEntry: boolean;
  notifyOnExit: boolean;
  repeats: boolean;
};

declare class ThereYouGoLocationNotificationModule extends NativeModule {
  scheduleAsync(request: LocationNotificationRequest): Promise<string>;
  getScheduledAsync(
    identifier: string,
  ): Promise<ScheduledLocationNotification | null>;
  cancelAsync(identifier: string): Promise<boolean>;
}

export default requireNativeModule<ThereYouGoLocationNotificationModule>(
  'ThereYouGoLocationNotification',
);
