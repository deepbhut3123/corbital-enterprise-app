import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

import { buildApiUrl } from '../config/api';
import type { UserRecord } from './auth';

type SalaryReportInput = {
  month: number;
  user: UserRecord;
  year: number;
};

const sanitizeFileName = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'employee';

export async function downloadSalaryReport(
  input: SalaryReportInput,
  token: string,
) {
  const query = new URLSearchParams({
    month: String(input.month),
    userId: input.user.id,
    year: String(input.year),
  });
  const fileName = `${sanitizeFileName(input.user.username)}-salary-${input.year}-${String(
    input.month,
  ).padStart(2, '0')}.pdf`;
  const temporaryFileUri = `${FileSystem.cacheDirectory}${fileName}`;
  const result = await FileSystem.downloadAsync(
    buildApiUrl(`/reports/salary?${query.toString()}`),
    temporaryFileUri,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );

  if (result.status < 200 || result.status >= 300) {
    throw new Error('Failed to download salary report.');
  }

  const isSharingAvailable = await Sharing.isAvailableAsync();

  if (isSharingAvailable) {
    await Sharing.shareAsync(result.uri, {
      UTI: 'com.adobe.pdf',
      dialogTitle: 'Share salary report',
      mimeType: 'application/pdf',
    });
  }

  return result.uri;
}
