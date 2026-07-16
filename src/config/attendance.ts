const rawLatitude = process.env.EXPO_PUBLIC_ATTENDANCE_LATITUDE?.trim();
const rawLongitude = process.env.EXPO_PUBLIC_ATTENDANCE_LONGITUDE?.trim();
const rawRadius = process.env.EXPO_PUBLIC_ATTENDANCE_RADIUS_METERS?.trim();
const rawLocationName = process.env.EXPO_PUBLIC_ATTENDANCE_LOCATION_NAME?.trim();

const parsedLatitude = rawLatitude ? Number(rawLatitude) : NaN;
const parsedLongitude = rawLongitude ? Number(rawLongitude) : NaN;
const parsedRadius = rawRadius ? Number(rawRadius) : NaN;

export const ATTENDANCE_LOCATION_NAME = rawLocationName || 'Office Location';
export const ATTENDANCE_RADIUS_METERS = Number.isFinite(parsedRadius)
  ? parsedRadius
  : 50;

export const ATTENDANCE_OFFICE_LOCATION =
  Number.isFinite(parsedLatitude) && Number.isFinite(parsedLongitude)
    ? {
        latitude: parsedLatitude,
        longitude: parsedLongitude,
      }
    : null;

