import { buildApiUrl } from '../config/api';

export type TargetRecord = {
  amount: number;
  id: string;
  month: number;
  setById: string | null;
  setByName: string | null;
  userEmail: string;
  userId: string;
  username: string;
  year: number;
};

type TargetListResponse = {
  success: boolean;
  message: string;
  data?: TargetRecord[];
};

type TargetResponse = {
  success: boolean;
  message: string;
  data?: TargetRecord | null;
};

type DeleteTargetResponse = {
  success: boolean;
  message: string;
};

export type SaveTargetInput = {
  amount: string;
  month: number;
  userId: string;
  year: number;
};

export async function fetchMyTarget(
  token: string,
  month: number,
  year: number,
) {
  const response = await fetch(
    buildApiUrl(`/targets/me?month=${month}&year=${year}`),
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );

  const payload = (await response.json()) as TargetResponse;

  if (!response.ok || !payload.success) {
    throw new Error(payload.message || 'Failed to load target');
  }

  return payload.data ?? null;
}

export async function fetchTargets(token: string) {
  const response = await fetch(buildApiUrl('/targets'), {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const payload = (await response.json()) as TargetListResponse;

  if (!response.ok || !payload.success || !payload.data) {
    throw new Error(payload.message || 'Failed to load targets');
  }

  return payload.data;
}

export async function saveTarget(input: SaveTargetInput, token: string) {
  const response = await fetch(buildApiUrl('/targets'), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      amount: Number(input.amount || 0),
      month: input.month,
      userId: input.userId,
      year: input.year,
    }),
  });

  const payload = (await response.json()) as TargetResponse;

  if (!response.ok || !payload.success || !payload.data) {
    throw new Error(payload.message || 'Failed to save target');
  }

  return payload.data;
}

export async function deleteTarget(targetId: string, token: string) {
  const response = await fetch(buildApiUrl(`/targets/${targetId}`), {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const payload = (await response.json()) as DeleteTargetResponse;

  if (!response.ok || !payload.success) {
    throw new Error(payload.message || 'Failed to delete target');
  }
}
