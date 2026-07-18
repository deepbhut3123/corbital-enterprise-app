import { buildApiUrl } from '../config/api';

export type ValueEntryRecord = {
  createdAt: string;
  createdById: string | null;
  createdByName: string | null;
  entryDate: string;
  id: string;
  netProfit: number;
  purchaseAmount: number;
  sellAmount: number;
  userEmail: string;
  userId: string;
  username: string;
};

type ValueEntryListResponse = {
  success: boolean;
  message: string;
  data?: ValueEntryRecord[];
};

type ValueEntryResponse = {
  success: boolean;
  message: string;
  data?: ValueEntryRecord;
};

type DeleteValueEntryResponse = {
  success: boolean;
  message: string;
};

export type CreateValueEntryInput = {
  entryDate: string;
  purchaseAmount: string;
  sellAmount: string;
  userId?: string;
};

export async function fetchValueEntries(token: string) {
  const response = await fetch(buildApiUrl('/value-entries'), {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const payload = (await response.json()) as ValueEntryListResponse;

  if (!response.ok || !payload.success || !payload.data) {
    throw new Error(payload.message || 'Failed to load value entries');
  }

  return payload.data;
}

export async function createValueEntry(
  input: CreateValueEntryInput,
  token: string,
) {
  const response = await fetch(buildApiUrl('/value-entries'), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      entryDate: input.entryDate,
      purchaseAmount: Number(input.purchaseAmount || 0),
      sellAmount: Number(input.sellAmount || 0),
      userId: input.userId,
    }),
  });

  const payload = (await response.json()) as ValueEntryResponse;

  if (!response.ok || !payload.success || !payload.data) {
    throw new Error(payload.message || 'Failed to save value entry');
  }

  return payload.data;
}

export async function updateValueEntry(
  entryId: string,
  input: CreateValueEntryInput,
  token: string,
) {
  const response = await fetch(buildApiUrl(`/value-entries/${entryId}`), {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      entryDate: input.entryDate,
      purchaseAmount: Number(input.purchaseAmount || 0),
      sellAmount: Number(input.sellAmount || 0),
      userId: input.userId,
    }),
  });

  const payload = (await response.json()) as ValueEntryResponse;

  if (!response.ok || !payload.success || !payload.data) {
    throw new Error(payload.message || 'Failed to update value entry');
  }

  return payload.data;
}

export async function deleteValueEntry(entryId: string, token: string) {
  const response = await fetch(buildApiUrl(`/value-entries/${entryId}`), {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const payload = (await response.json()) as DeleteValueEntryResponse;

  if (!response.ok || !payload.success) {
    throw new Error(payload.message || 'Failed to delete value entry');
  }
}
