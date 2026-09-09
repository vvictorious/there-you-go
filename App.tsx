import { useCallback, useEffect, useState } from 'react';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import { StatusBar } from 'expo-status-bar';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import LocationNotificationModule, {
  type ScheduledLocationNotification,
} from './modules/there-you-go-location-notification/src/ThereYouGoLocationNotificationModule';

const TEST_NOTIFICATION_ID = 'ups-mar-vista-arrival';
const TEST_LOCATION = {
  name: 'The UPS Store — Mar Vista',
  address: '12405 Venice Blvd, Mar Vista, CA 90066',
  latitude: 34.0038427,
  longitude: -118.434097,
  radius: 150,
} as const;

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

function notificationStatusLabel(
  permissions: Notifications.NotificationPermissionsStatus | null,
) {
  if (!permissions?.ios) {
    return 'Not checked';
  }

  switch (permissions.ios.status) {
    case Notifications.IosAuthorizationStatus.AUTHORIZED:
      return 'Authorized';
    case Notifications.IosAuthorizationStatus.DENIED:
      return 'Denied';
    case Notifications.IosAuthorizationStatus.PROVISIONAL:
      return 'Provisional';
    case Notifications.IosAuthorizationStatus.EPHEMERAL:
      return 'Ephemeral';
    default:
      return 'Not determined';
  }
}

function locationStatusLabel(
  permissions: Location.LocationPermissionResponse | null,
) {
  if (!permissions) {
    return 'Not checked';
  }
  if (!permissions.granted) {
    return permissions.status === 'denied' ? 'Denied' : 'Not determined';
  }

  const scope = permissions.ios?.scope === 'always' ? 'Always' : 'When In Use';
  const accuracy =
    permissions.ios?.accuracy === 'reduced' ? 'reduced accuracy' : 'full accuracy';
  return `${scope}, ${accuracy}`;
}

export default function App() {
  const [notificationPermissions, setNotificationPermissions] =
    useState<Notifications.NotificationPermissionsStatus | null>(null);
  const [locationPermissions, setLocationPermissions] =
    useState<Location.LocationPermissionResponse | null>(null);
  const [scheduled, setScheduled] =
    useState<ScheduledLocationNotification | null>(null);
  const [isWorking, setIsWorking] = useState(false);
  const [result, setResult] = useState('Ready to configure the test.');

  const refreshStatus = useCallback(async () => {
    const [notificationStatus, locationStatus, scheduledNotification] =
      await Promise.all([
        Notifications.getPermissionsAsync(),
        Location.getForegroundPermissionsAsync(),
        LocationNotificationModule.getScheduledAsync(TEST_NOTIFICATION_ID),
      ]);

    setNotificationPermissions(notificationStatus);
    setLocationPermissions(locationStatus);
    setScheduled(scheduledNotification);
  }, []);

  useEffect(() => {
    refreshStatus().catch((error: unknown) => {
      setResult(
        `Unable to read current status: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    });
  }, [refreshStatus]);

  const requestNotificationPermission = async () => {
    setIsWorking(true);
    try {
      const permissions = await Notifications.requestPermissionsAsync({
        ios: {
          allowAlert: true,
          allowBadge: false,
          allowSound: true,
        },
      });
      setNotificationPermissions(permissions);
      setResult(
        permissions.ios?.status === Notifications.IosAuthorizationStatus.AUTHORIZED
          ? 'Notification permission authorized.'
          : 'Notification alerts are not authorized.',
      );
    } catch (error) {
      setResult(
        `Notification permission failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    } finally {
      setIsWorking(false);
    }
  };

  const requestLocationPermission = async () => {
    setIsWorking(true);
    try {
      const permissions = await Location.requestForegroundPermissionsAsync();
      setLocationPermissions(permissions);

      if (!permissions.granted) {
        setResult('Location permission was not granted.');
      } else if (permissions.ios?.accuracy === 'reduced') {
        setResult('Enable Precise Location in Settings before scheduling.');
      } else {
        setResult('When In Use location permission granted with full accuracy.');
      }
    } catch (error) {
      setResult(
        `Location permission failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    } finally {
      setIsWorking(false);
    }
  };

  const scheduleLocationNotification = async () => {
    setIsWorking(true);
    try {
      const [notificationStatus, locationStatus] = await Promise.all([
        Notifications.getPermissionsAsync(),
        Location.getForegroundPermissionsAsync(),
      ]);
      setNotificationPermissions(notificationStatus);
      setLocationPermissions(locationStatus);

      if (
        notificationStatus.ios?.status !==
        Notifications.IosAuthorizationStatus.AUTHORIZED
      ) {
        throw new Error('Authorize notification alerts first.');
      }
      if (!locationStatus.granted) {
        throw new Error('Grant location permission first.');
      }
      if (locationStatus.ios?.accuracy === 'reduced') {
        throw new Error('Enable Precise Location in iOS Settings first.');
      }

      await LocationNotificationModule.cancelAsync(TEST_NOTIFICATION_ID);
      const identifier = await LocationNotificationModule.scheduleAsync({
        identifier: TEST_NOTIFICATION_ID,
        title: 'There you go 👀',
        body: "Don't forget to drop off your package.",
        latitude: TEST_LOCATION.latitude,
        longitude: TEST_LOCATION.longitude,
        radius: TEST_LOCATION.radius,
      });
      const accepted =
        await LocationNotificationModule.getScheduledAsync(identifier);

      setScheduled(accepted);
      setResult(
        accepted
          ? `iOS accepted reminder “${identifier}”.`
          : 'The scheduling call returned, but the reminder was not found.',
      );
    } catch (error) {
      setScheduled(null);
      setResult(
        `Scheduling failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    } finally {
      setIsWorking(false);
    }
  };

  const cancelLocationNotification = async () => {
    setIsWorking(true);
    try {
      const cancelled =
        await LocationNotificationModule.cancelAsync(TEST_NOTIFICATION_ID);
      setScheduled(null);
      setResult(
        cancelled
          ? 'The UPS arrival reminder is no longer scheduled.'
          : 'iOS still reports the reminder as scheduled.',
      );
    } catch (error) {
      setResult(
        `Cancellation failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    } finally {
      setIsWorking(false);
    }
  };

  return (
    <View style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.container}
        contentInsetAdjustmentBehavior="automatic"
      >
        <Text style={styles.title}>ThereYouGo</Text>
        <Text style={styles.subtitle}>iOS location-notification spike</Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>{TEST_LOCATION.name}</Text>
          <Text style={styles.detail}>{TEST_LOCATION.address}</Text>
          <Text style={styles.detail}>
            {TEST_LOCATION.latitude}, {TEST_LOCATION.longitude}
          </Text>
          <Text style={styles.detail}>{TEST_LOCATION.radius} m entry radius</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.statusLabel}>Notification permission</Text>
          <Text style={styles.statusValue}>
            {notificationStatusLabel(notificationPermissions)}
          </Text>
          <Text style={styles.statusLabel}>Location permission</Text>
          <Text style={styles.statusValue}>
            {locationStatusLabel(locationPermissions)}
          </Text>
          <Text style={styles.statusLabel}>Scheduled with iOS</Text>
          <Text style={styles.statusValue}>{scheduled ? 'Yes' : 'No'}</Text>
          {scheduled ? (
            <Text style={styles.scheduledDetail}>
              Entry: {scheduled.notifyOnEntry ? 'on' : 'off'} · Exit:{' '}
              {scheduled.notifyOnExit ? 'on' : 'off'} · Repeats:{' '}
              {scheduled.repeats ? 'yes' : 'no'}
            </Text>
          ) : null}
        </View>

        <Pressable
          disabled={isWorking}
          onPress={requestNotificationPermission}
          style={({ pressed }) => [
            styles.button,
            (pressed || isWorking) && styles.buttonPressed,
          ]}
        >
          <Text style={styles.buttonText}>1. Request notification permission</Text>
        </Pressable>

        <Pressable
          disabled={isWorking}
          onPress={requestLocationPermission}
          style={({ pressed }) => [
            styles.button,
            (pressed || isWorking) && styles.buttonPressed,
          ]}
        >
          <Text style={styles.buttonText}>2. Request location permission</Text>
        </Pressable>

        <Pressable
          disabled={isWorking}
          onPress={scheduleLocationNotification}
          style={({ pressed }) => [
            styles.button,
            styles.primaryButton,
            (pressed || isWorking) && styles.buttonPressed,
          ]}
        >
          <Text style={[styles.buttonText, styles.primaryButtonText]}>
            3. Schedule UPS arrival reminder
          </Text>
        </Pressable>

        {scheduled ? (
          <Pressable
            disabled={isWorking}
            onPress={cancelLocationNotification}
            style={({ pressed }) => [
              styles.button,
              (pressed || isWorking) && styles.buttonPressed,
            ]}
          >
            <Text style={styles.buttonText}>Cancel scheduled reminder</Text>
          </Pressable>
        ) : null}

        <View style={styles.result}>
          <Text style={styles.resultText}>{isWorking ? 'Working…' : result}</Text>
        </View>

        <Text style={styles.note}>
          This one-shot test uses an iOS system location trigger. After it is
          scheduled, background or lock the phone and leave the app closed.
        </Text>
      </ScrollView>
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  container: {
    padding: 24,
    paddingBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: '600',
  },
  subtitle: {
    marginBottom: 24,
    marginTop: 4,
    color: '#666',
    fontSize: 16,
  },
  card: {
    marginBottom: 16,
    padding: 16,
    borderColor: '#ddd',
    borderRadius: 12,
    borderWidth: 1,
    backgroundColor: '#fff',
  },
  cardTitle: {
    marginBottom: 6,
    fontSize: 18,
    fontWeight: '600',
  },
  detail: {
    marginTop: 2,
    color: '#444',
    fontSize: 14,
  },
  statusLabel: {
    color: '#666',
    fontSize: 13,
  },
  statusValue: {
    marginBottom: 12,
    marginTop: 2,
    fontSize: 16,
    fontWeight: '500',
  },
  scheduledDetail: {
    color: '#444',
    fontSize: 13,
  },
  button: {
    minHeight: 48,
    marginBottom: 12,
    paddingHorizontal: 16,
    borderColor: '#222',
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  primaryButton: {
    backgroundColor: '#111',
  },
  buttonPressed: {
    opacity: 0.55,
  },
  buttonText: {
    color: '#111',
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
  },
  primaryButtonText: {
    color: '#fff',
  },
  result: {
    marginTop: 4,
    padding: 14,
    borderRadius: 10,
    backgroundColor: '#e8eef8',
  },
  resultText: {
    color: '#183153',
    fontSize: 14,
  },
  note: {
    marginTop: 18,
    color: '#666',
    fontSize: 13,
    lineHeight: 19,
  },
});
