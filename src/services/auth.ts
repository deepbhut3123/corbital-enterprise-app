import { buildApiUrl } from '../config/api';

export type LoggedInUser = {
  authenticatorEnabled?: boolean;
  id: string;
  email: string;
  fixedSalary: number;
  phone: string;
  roleId: string;
  username: string;
  variableSalary: number;
};

export type AuthSession = {
  token: string;
  tokenExpiresIn: string | null;
  user: LoggedInUser;
};

export type TwoFactorChallenge = {
  requiresTwoFactor: true;
  user: LoggedInUser;
};

type LoginResponse = {
  success: boolean;
  message: string;
  data?: AuthSession | TwoFactorChallenge;
};

type CurrentUserResponse = {
  success: boolean;
  message: string;
  data?: LoggedInUser;
};

export async function loginUser(email: string, password: string, otp?: string) {
  const response = await fetch(buildApiUrl('/auth/login'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password, otp }),
  });

  const payload = (await response.json()) as LoginResponse;

  if (!response.ok || !payload.success || !payload.data) {
    throw new Error(payload.message || 'Login failed');
  }

  if ('requiresTwoFactor' in payload.data && payload.data.requiresTwoFactor) {
    return payload.data;
  }

  if (!payload.data.token || !payload.data.user) {
    throw new Error(payload.message || 'Login failed');
  }

  return payload.data;
}

export async function fetchCurrentUser(token: string) {
  const response = await fetch(buildApiUrl('/auth/me'), {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const payload = (await response.json()) as CurrentUserResponse;

  if (!response.ok || !payload.success || !payload.data) {
    throw new Error(payload.message || 'Failed to load current user');
  }

  return payload.data;
}

export type UserRecord = LoggedInUser;
