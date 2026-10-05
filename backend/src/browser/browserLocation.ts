export interface BrowserLocationConfig {
  timezoneId: string;
  locale: string;
  acceptLanguage: string;
  latitude: number;
  longitude: number;
  accuracy: number;
}

function readNumber(
  value: string | undefined,
  fallback: number,
): number {
  if (!value) {
    return fallback;
  }

  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return parsed;
}

export function getBrowserLocationConfig():
  BrowserLocationConfig {
  return {
    timezoneId:
      process.env.BROWSER_TEST_TIMEZONE ??
      'Asia/Kolkata',

    locale:
      process.env.BROWSER_TEST_LOCALE ??
      'en-IN',

    acceptLanguage:
      process.env.BROWSER_TEST_LANGUAGE ??
      'en-IN,en;q=0.9',

    latitude: readNumber(
      process.env.BROWSER_TEST_LATITUDE,
      25.5941,
    ),

    longitude: readNumber(
      process.env.BROWSER_TEST_LONGITUDE,
      85.1376,
    ),

    accuracy: readNumber(
      process.env.BROWSER_TEST_LOCATION_ACCURACY,
      100,
    ),
  };
}
