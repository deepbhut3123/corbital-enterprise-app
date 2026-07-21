import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import type { UserRecord } from '../../services/auth';
import { downloadSalaryReport } from '../../services/reports';

type ReportsTabScreenProps = {
  token: string;
  users: UserRecord[];
};

const getCurrentMonthYear = () => {
  const date = new Date();

  return {
    month: date.getMonth() + 1,
    year: date.getFullYear(),
  };
};

const monthLabels = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

export default function ReportsTabScreen({ token, users }: ReportsTabScreenProps) {
  const currentMonthYear = useMemo(getCurrentMonthYear, []);
  const [selectedUserId, setSelectedUserId] = useState(users[0]?.id || '');
  const [month, setMonth] = useState(String(currentMonthYear.month));
  const [year, setYear] = useState(String(currentMonthYear.year));
  const [isDownloading, setIsDownloading] = useState(false);
  const [isMonthPickerVisible, setIsMonthPickerVisible] = useState(false);
  const [isYearPickerVisible, setIsYearPickerVisible] = useState(false);
  const [reportError, setReportError] = useState('');

  const selectedUser = users.find(user => user.id === selectedUserId) || null;
  const yearOptions = useMemo(
    () =>
      Array.from({ length: 7 }, (_, index) => String(currentMonthYear.year - 3 + index)),
    [currentMonthYear.year],
  );

  useEffect(() => {
    if (!selectedUserId && users.length) {
      setSelectedUserId(users[0].id);
    }
  }, [selectedUserId, users]);

  const handleDownload = async () => {
    const parsedMonth = Number(month);
    const parsedYear = Number(year);

    if (!selectedUser) {
      setReportError('Select a user for the report.');
      return;
    }

    if (!Number.isInteger(parsedMonth) || parsedMonth < 1 || parsedMonth > 12) {
      setReportError('Month must be between 1 and 12.');
      return;
    }

    if (!Number.isInteger(parsedYear) || parsedYear < 2000) {
      setReportError('Year must be a valid 4 digit year.');
      return;
    }

    try {
      setIsDownloading(true);
      setReportError('');
      const fileUri = await downloadSalaryReport(
        {
          month: parsedMonth,
          user: selectedUser,
          year: parsedYear,
        },
        token,
      );

      Alert.alert('Report saved', `Salary report saved successfully.\n${fileUri}`);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unable to download salary report.';
      setReportError(message);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <View style={styles.panel}>
      <View style={styles.header}>
        <View style={styles.headerIcon}>
          <Ionicons color="#ffffff" name="document-text-outline" size={20} />
        </View>
        <View style={styles.headerTextWrap}>
          <Text style={styles.title}>Salary Reports</Text>
          <Text style={styles.caption}>Generate one private monthly PDF per employee.</Text>
        </View>
      </View>

      <View style={styles.filterCard}>
        <Text style={styles.fieldLabel}>Month And Year</Text>
        <View style={styles.inputRow}>
          <Pressable
            onPress={() => setIsMonthPickerVisible(true)}
            style={styles.selectButton}>
            <Text style={styles.selectButtonText}>
              {monthLabels[Number(month) - 1] || 'Month'}
            </Text>
            <Ionicons color="#7f1d1d" name="chevron-down" size={18} />
          </Pressable>
          <Pressable
            onPress={() => setIsYearPickerVisible(true)}
            style={styles.selectButton}>
            <Text style={styles.selectButtonText}>{year || 'Year'}</Text>
            <Ionicons color="#7f1d1d" name="chevron-down" size={18} />
          </Pressable>
        </View>

        <Text style={styles.selectedMonth}>
          {monthLabels[Number(month) - 1] || 'Month'} {year || 'Year'}
        </Text>

        <Text style={styles.fieldLabel}>Employee</Text>
        <View style={styles.userList}>
          {users.length ? (
            users.map(user => {
              const isSelected = selectedUserId === user.id;

              return (
                <Pressable
                  key={user.id}
                  onPress={() => setSelectedUserId(user.id)}
                  style={[styles.userOption, isSelected && styles.userOptionActive]}>
                  <View style={styles.avatarBadge}>
                    <Text style={styles.avatarLetter}>
                      {user.username.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.userInfo}>
                    <Text
                      style={[styles.userName, isSelected && styles.userNameActive]}>
                      {user.username}
                    </Text>
                    <Text
                      style={[styles.userEmail, isSelected && styles.userEmailActive]}>
                      {user.email}
                    </Text>
                  </View>
                  {isSelected ? (
                    <Ionicons color="#ffffff" name="checkmark-circle" size={20} />
                  ) : null}
                </Pressable>
              );
            })
          ) : (
            <Text style={styles.emptyText}>No users available for reports.</Text>
          )}
        </View>

        {reportError ? <Text style={styles.errorText}>{reportError}</Text> : null}

        <Pressable
          disabled={isDownloading || !users.length}
          onPress={handleDownload}
          style={[
            styles.downloadButton,
            (isDownloading || !users.length) && styles.disabledButton,
          ]}>
          {isDownloading ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <>
              <Ionicons color="#ffffff" name="download-outline" size={18} />
              <Text style={styles.downloadButtonText}>Download PDF</Text>
            </>
          )}
        </Pressable>
      </View>

      <Modal
        animationType="fade"
        onRequestClose={() => setIsMonthPickerVisible(false)}
        transparent
        visible={isMonthPickerVisible}>
        <Pressable
          onPress={() => setIsMonthPickerVisible(false)}
          style={styles.modalOverlay}>
          <Pressable onPress={() => {}} style={styles.pickerCard}>
            <Text style={styles.pickerTitle}>Select Month</Text>
            <View style={styles.monthGrid}>
              {monthLabels.map((monthLabel, index) => {
                const monthValue = String(index + 1);
                const isSelected = month === monthValue;

                return (
                  <Pressable
                    key={monthValue}
                    onPress={() => {
                      setMonth(monthValue);
                      setIsMonthPickerVisible(false);
                    }}
                    style={[
                      styles.pickerOption,
                      isSelected && styles.pickerOptionActive,
                    ]}>
                    <Text
                      style={[
                        styles.pickerOptionText,
                        isSelected && styles.pickerOptionTextActive,
                      ]}>
                      {monthLabel}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        animationType="fade"
        onRequestClose={() => setIsYearPickerVisible(false)}
        transparent
        visible={isYearPickerVisible}>
        <Pressable
          onPress={() => setIsYearPickerVisible(false)}
          style={styles.modalOverlay}>
          <Pressable onPress={() => {}} style={styles.pickerCard}>
            <Text style={styles.pickerTitle}>Select Year</Text>
            <View style={styles.yearGrid}>
              {yearOptions.map(yearOption => {
                const isSelected = year === yearOption;

                return (
                  <Pressable
                    key={yearOption}
                    onPress={() => {
                      setYear(yearOption);
                      setIsYearPickerVisible(false);
                    }}
                    style={[
                      styles.pickerOption,
                      isSelected && styles.pickerOptionActive,
                    ]}>
                    <Text
                      style={[
                        styles.pickerOptionText,
                        isSelected && styles.pickerOptionTextActive,
                      ]}>
                      {yearOption}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    backgroundColor: '#ffffff',
    borderColor: '#fecaca',
    borderRadius: 22,
    borderWidth: 1,
    padding: 20,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    marginBottom: 16,
  },
  headerIcon: {
    alignItems: 'center',
    backgroundColor: '#111827',
    borderRadius: 18,
    height: 40,
    justifyContent: 'center',
    marginRight: 12,
    width: 40,
  },
  headerTextWrap: {
    flex: 1,
  },
  title: {
    color: '#111827',
    fontSize: 22,
    fontWeight: '700',
  },
  caption: {
    color: '#6b7280',
    fontSize: 13,
    lineHeight: 18,
    marginTop: 3,
  },
  filterCard: {
    backgroundColor: '#fff7f5',
    borderColor: '#fee2e2',
    borderRadius: 18,
    borderWidth: 1,
    padding: 12,
  },
  fieldLabel: {
    color: '#7f1d1d',
    fontSize: 11,
    fontWeight: '800',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  inputRow: {
    flexDirection: 'row',
    gap: 10,
  },
  selectButton: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderColor: '#fca5a5',
    borderRadius: 14,
    borderWidth: 1,
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  selectButtonText: {
    color: '#111827',
    fontSize: 15,
    fontWeight: '700',
  },
  selectedMonth: {
    color: '#6b7280',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 16,
    marginTop: 8,
  },
  userList: {
    gap: 8,
  },
  userOption: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderColor: '#fecaca',
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    padding: 10,
  },
  userOptionActive: {
    backgroundColor: '#dc2626',
    borderColor: '#dc2626',
  },
  avatarBadge: {
    alignItems: 'center',
    backgroundColor: '#ef4444',
    borderRadius: 18,
    height: 36,
    justifyContent: 'center',
    marginRight: 10,
    width: 36,
  },
  avatarLetter: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
  },
  userInfo: {
    flex: 1,
    paddingRight: 8,
  },
  userName: {
    color: '#111827',
    fontSize: 15,
    fontWeight: '700',
  },
  userNameActive: {
    color: '#ffffff',
  },
  userEmail: {
    color: '#6b7280',
    fontSize: 12,
    marginTop: 2,
  },
  userEmailActive: {
    color: '#fee2e2',
  },
  emptyText: {
    color: '#6b7280',
    fontSize: 15,
  },
  errorText: {
    color: '#b91c1c',
    fontSize: 14,
    marginTop: 12,
  },
  downloadButton: {
    alignItems: 'center',
    backgroundColor: '#dc2626',
    borderRadius: 14,
    flexDirection: 'row',
    height: 48,
    justifyContent: 'center',
    marginTop: 16,
  },
  disabledButton: {
    backgroundColor: '#fca5a5',
  },
  downloadButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
    marginLeft: 8,
  },
  modalOverlay: {
    alignItems: 'center',
    backgroundColor: 'rgba(17, 24, 39, 0.45)',
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  pickerCard: {
    backgroundColor: '#ffffff',
    borderRadius: 22,
    padding: 18,
    width: '100%',
  },
  pickerTitle: {
    color: '#111827',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 14,
  },
  monthGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  yearGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pickerOption: {
    alignItems: 'center',
    backgroundColor: '#fff7f5',
    borderColor: '#fecaca',
    borderRadius: 14,
    borderWidth: 1,
    minWidth: '30%',
    paddingVertical: 12,
  },
  pickerOptionActive: {
    backgroundColor: '#dc2626',
    borderColor: '#dc2626',
  },
  pickerOptionText: {
    color: '#7f1d1d',
    fontSize: 14,
    fontWeight: '800',
  },
  pickerOptionTextActive: {
    color: '#ffffff',
  },
});
