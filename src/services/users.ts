import { buildApiUrl } from '../config/api';
import type { UserRecord } from './auth';

type UsersResponse = {
  success: boolean;
  message: string;
  data?: UserRecord[];
};

type CreateUserResponse = {
  success: boolean;
  message: string;
  data?: UserRecord;
};

type DeleteUserResponse = {
  success: boolean;
  message: string;
};

type UpdateUserResponse = {
  success: boolean;
  message: string;
  data?: UserRecord;
};

export type CreateUserInput = {
  email: string;
  fixedSalary: string;
  password: string;
  phone: string;
  roleId: string;
  username: string;
  variableSalary: string;
};

export async function fetchUsers(token: string) {
  const response = await fetch(buildApiUrl('/auth/users'), {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const payload = (await response.json()) as UsersResponse;

  if (!response.ok || !payload.success || !payload.data) {
    throw new Error(payload.message || 'Failed to load users');
  }

  return payload.data;
}

export async function createUser(input: CreateUserInput, token: string) {
  const response = await fetch(buildApiUrl('/auth/register'), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: input.email.trim(),
      fixedSalary: Number(input.fixedSalary || 0),
      password: input.password,
      phone: input.phone.trim(),
      roleId: input.roleId.trim(),
      username: input.username.trim(),
      variableSalary: Number(input.variableSalary || 0),
    }),
  });

  const payload = (await response.json()) as CreateUserResponse;

  if (!response.ok || !payload.success || !payload.data) {
    throw new Error(payload.message || 'Failed to create user');
  }

  return payload.data;
}

export async function updateUser(
  userId: string,
  input: CreateUserInput,
  token: string,
) {
  const response = await fetch(buildApiUrl(`/auth/users/${userId}`), {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: input.email.trim(),
      fixedSalary: Number(input.fixedSalary || 0),
      password: input.password.trim(),
      phone: input.phone.trim(),
      roleId: input.roleId.trim(),
      username: input.username.trim(),
      variableSalary: Number(input.variableSalary || 0),
    }),
  });

  const payload = (await response.json()) as UpdateUserResponse;

  if (!response.ok || !payload.success || !payload.data) {
    throw new Error(payload.message || 'Failed to update user');
  }

  return payload.data;
}

export async function deleteUser(userId: string, token: string) {
  const response = await fetch(buildApiUrl(`/auth/users/${userId}`), {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const payload = (await response.json()) as DeleteUserResponse;

  if (!response.ok || !payload.success) {
    throw new Error(payload.message || 'Failed to delete user');
  }
}
