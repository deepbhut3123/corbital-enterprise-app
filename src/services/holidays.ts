import { buildApiUrl } from '../config/api';

export type HolidayRecord = {
  createdAt?: string;
  holidayDate: string;
  id: string;
  name: string;
};

export type HolidayInput = {
  holidayDate: string;
  name: string;
};

type HolidayListResponse = {
  success: boolean;
  message: string;
  data?: HolidayRecord[];
};

type HolidayResponse = {
  success: boolean;
  message: string;
  data?: HolidayRecord;
};

type DeleteHolidayResponse = {
  success: boolean;
  message: string;
};

export async function fetchHolidays(token: string) {
  const response = await fetch(buildApiUrl('/holidays'), {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const payload = (await response.json()) as HolidayListResponse;

  if (!response.ok || !payload.success || !payload.data) {
    throw new Error(payload.message || 'Failed to load holidays');
  }

  return payload.data;
}

export async function saveHoliday(input: HolidayInput, token: string) {
  const response = await fetch(buildApiUrl('/holidays'), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      holidayDate: input.holidayDate.trim(),
      name: input.name.trim(),
    }),
  });

  const payload = (await response.json()) as HolidayResponse;

  if (!response.ok || !payload.success || !payload.data) {
    throw new Error(payload.message || 'Failed to save holiday');
  }

  return payload.data;
}

export async function deleteHoliday(holidayId: string, token: string) {
  const response = await fetch(buildApiUrl(`/holidays/${holidayId}`), {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const payload = (await response.json()) as DeleteHolidayResponse;

  if (!response.ok || !payload.success) {
    throw new Error(payload.message || 'Failed to delete holiday');
  }
}
