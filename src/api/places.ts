export type PlaceCandidatesRequest = {
  reminders: string[];
  location: {
    latitude: number;
    longitude: number;
  };
};

export type PlaceCandidate = {
  id: string;
  name: string;
  location: {
    latitude: number;
    longitude: number;
  };
};

export type PlaceCandidatesResponse = {
  candidates: PlaceCandidate[];
  unsupportedReminders: string[];
};

type RequestOptions = {
  signal?: AbortSignal;
};

function getServerBaseUrl() {
  const baseUrl = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();

  if (!baseUrl) {
    throw new Error(
      'EXPO_PUBLIC_API_BASE_URL is not configured. Add it to the app .env.local file.',
    );
  }

  return baseUrl.replace(/\/+$/, '');
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function parseCandidate(value: unknown): PlaceCandidate {
  if (!value || typeof value !== 'object') {
    throw new Error('The server returned an invalid place candidate.');
  }

  const candidate = value as Record<string, unknown>;
  const location = candidate.location;

  if (
    typeof candidate.id !== 'string' ||
    typeof candidate.name !== 'string' ||
    !location ||
    typeof location !== 'object'
  ) {
    throw new Error('The server returned an invalid place candidate.');
  }

  const coordinates = location as Record<string, unknown>;
  if (
    !isFiniteNumber(coordinates.latitude) ||
    !isFiniteNumber(coordinates.longitude)
  ) {
    throw new Error('The server returned invalid candidate coordinates.');
  }

  return {
    id: candidate.id,
    name: candidate.name,
    location: {
      latitude: coordinates.latitude,
      longitude: coordinates.longitude,
    },
  };
}

export function parsePlaceCandidatesResponse(
  value: unknown,
): PlaceCandidatesResponse {
  if (!value || typeof value !== 'object') {
    throw new Error('The server returned an invalid place candidates response.');
  }

  const response = value as Record<string, unknown>;
  if (
    !Array.isArray(response.candidates) ||
    !Array.isArray(response.unsupportedReminders) ||
    !response.unsupportedReminders.every(
      (reminder) => typeof reminder === 'string',
    )
  ) {
    throw new Error('The server returned an invalid place candidates response.');
  }

  return {
    candidates: response.candidates.map(parseCandidate),
    unsupportedReminders: response.unsupportedReminders,
  };
}

export async function findPlaceCandidates(
  request: PlaceCandidatesRequest,
  options: RequestOptions = {},
): Promise<PlaceCandidatesResponse> {
  const response = await fetch(`${getServerBaseUrl()}/places/candidates`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
    signal: options.signal,
  });

  if (!response.ok) {
    throw new Error(
      `The places server request failed with status ${response.status}.`,
    );
  }

  const body: unknown = await response.json();
  return parsePlaceCandidatesResponse(body);
}
