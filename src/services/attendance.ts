import { buildApiUrl } from '../config/api';

export type AttendanceActionType = 'check_in' | 'check_out';

export type AttendanceLog = {
  action: AttendanceActionType;
  address?: string | null;
  distanceMeters?: number | null;
  id: string;
  latitude: number | null;
  longitude: number | null;
  notes?: string | null;
  recordedAt: string;
};

export type AttendanceRecord = {
  attendanceDate: string;
  createdAt?: string;
  id: string;
  logs: AttendanceLog[];
  status?: 'absent' | 'half_day' | 'holiday' | 'present' | 'sunday';
  statusLabel?: string;
  totalMinutes: number;
  userEmail: string;
  userId: string;
  username: string;
};

type AttendanceListResponse = {
  success: boolean;
  message: string;
  data?: AttendanceRecord[];
};

type AttendanceRecordResponse = {
  success: boolean;
  message: string;
  data?: AttendanceRecord;
};

export type AttendanceFilterInput = {
  month: number;
  userId?: string;
  year: number;
};

export type SaveAttendanceActionInput = {
  action: AttendanceActionType;
  latitude: number;
  longitude: number;
};

export type UpdateAttendanceLogInput = {
  action: AttendanceActionType;
  address?: string | null;
  distanceMeters?: number | null;
  latitude?: number | null;
  longitude?: number | null;
  notes?: string | null;
  time: string;
};

export type UpdateAttendanceRecordInput = {
  attendanceDate: string;
  logs: UpdateAttendanceLogInput[];
  userId: string;
};

function buildAttendanceQuery({ month, userId, year }: AttendanceFilterInput) {
  const query = new URLSearchParams({
    month: String(month),
    year: String(year),
  });

  if (userId) {
    query.set('userId', userId);
  }

  return query.toString();
}

export async function fetchAttendance(
  token: string,
  filters: AttendanceFilterInput,
) {
  const response = await fetch(
    buildApiUrl(`/attendance?${buildAttendanceQuery(filters)}`),
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );

  const payload = (await response.json()) as AttendanceListResponse;

  if (!response.ok || !payload.success || !payload.data) {
    throw new Error(payload.message || 'Failed to load attendance records');
  }

  return payload.data;
}

export async function fetchMyAttendance(
  token: string,
  filters: Omit<AttendanceFilterInput, 'userId'>,
) {
  const response = await fetch(
    buildApiUrl(`/attendance/me?${buildAttendanceQuery(filters)}`),
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );

  const payload = (await response.json()) as AttendanceListResponse;

  if (!response.ok || !payload.success || !payload.data) {
    throw new Error(payload.message || 'Failed to load attendance records');
  }

  return payload.data;
}

export async function createAttendanceAction(
  token: string,
  input: SaveAttendanceActionInput,
) {
  const response = await fetch(buildApiUrl('/attendance'), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  });

  const payload = (await response.json()) as AttendanceRecordResponse;

  if (!response.ok || !payload.success || !payload.data) {
    throw new Error(payload.message || 'Failed to save attendance action');
  }

  return payload.data;
}

export async function updateAttendanceRecord(
  token: string,
  recordId: string,
  input: UpdateAttendanceRecordInput,
) {
  const response = await fetch(buildApiUrl(`/attendance/${recordId}`), {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  });

  const payload = (await response.json()) as AttendanceRecordResponse;

  if (!response.ok || !payload.success || !payload.data) {
    throw new Error(payload.message || 'Failed to update attendance record');
  }

  return payload.data;
}
