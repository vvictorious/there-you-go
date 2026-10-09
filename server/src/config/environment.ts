const DEFAULT_PORT = 3000;

type Environment = Record<string, unknown> & {
  PORT: number;
  GEMINI_API_KEY?: string;
  GOOGLE_PLACES_API_KEY?: string;
};

export function validateEnvironment(
  config: Record<string, unknown>,
): Environment {
  const rawPort =
    typeof config.PORT === 'string' ? config.PORT.trim() : config.PORT;
  const port = rawPort ? Number(rawPort) : DEFAULT_PORT;

  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error('PORT must be an integer between 1 and 65535');
  }

  if (
    config.GEMINI_API_KEY !== undefined &&
    typeof config.GEMINI_API_KEY !== 'string'
  ) {
    throw new Error('GEMINI_API_KEY must be a string');
  }

  if (
    config.GOOGLE_PLACES_API_KEY !== undefined &&
    typeof config.GOOGLE_PLACES_API_KEY !== 'string'
  ) {
    throw new Error('GOOGLE_PLACES_API_KEY must be a string');
  }

  const geminiApiKey = config.GEMINI_API_KEY?.trim() || undefined;
  const googlePlacesApiKey = config.GOOGLE_PLACES_API_KEY?.trim() || undefined;

  return {
    ...config,
    PORT: port,
    GEMINI_API_KEY: geminiApiKey,
    GOOGLE_PLACES_API_KEY: googlePlacesApiKey,
  };
}
