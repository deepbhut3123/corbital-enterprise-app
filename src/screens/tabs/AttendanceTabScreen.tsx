import Ionicons from '@expo/vector-icons/Ionicons';
import * as Location from 'expo-location';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  ATTENDANCE_LOCATION_NAME,
  ATTENDANCE_OFFICE_LOCATION,
  ATTENDANCE_RADIUS_METERS,
} from '../../config/attendance';
import type { UserRecord } from '../../services/auth';
import {
  createAttendanceAction,
  fetchAttendance,
  fetchMyAttendance,
  type AttendanceActionType,
  type AttendanceRecord,
} from '../../services/attendance';

const monthLabels = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

type PickerType = 'month' | 'user' | 'year' | null;

type AttendanceTabScreenProps = {
  isAdmin: boolean;
  refreshSignal: number;
  token: string;
  users: UserRecord[];
};

type AttendanceActionButton = {
  action: AttendanceActionType;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  tint: string;
};

const actionButtons: AttendanceActionButton[] = [
  {
    action: 'check_in',
    icon: 'log-in-outline',
    label: 'Check In',
    tint: '#15803d',
  },
  {
    action: 'break_start',
    icon: 'cafe-outline',
    label: 'Break Start',
    tint: '#b45309',
  },
  {
    action: 'break_end',
    icon: 'play-outline',
    label: 'Break End',
    tint: '#2563eb',
  },
  {
    action: 'check_out',
    icon: 'log-out-outline',
    label: 'Check Out',
    tint: '#dc2626',
  },
];

const getInitialMonthYear = () => {
  const now = new Date();

  return {
    month: now.getMonth() + 1,
    year: now.getFullYear(),
  };
};

const calculateWorkedMilliseconds = (
  record: Pick<AttendanceRecord, 'logs' | 'totalMinutes'>,
  nowTimestamp = Date.now(),
) => {
  const sortedLogs = [...record.logs].sort(
    (left, right) =>
      new Date(left.recordedAt).getTime() - new Date(right.recordedAt).getTime(),
  );

  if (!sortedLogs.length) {
    return Math.max(record.totalMinutes, 0) * 60000;
  }

  let activeStartTimestamp: number | null = null;
  let totalMilliseconds = 0;

  sortedLogs.forEach(log => {
    const logTimestamp = new Date(log.recordedAt).getTime();

    if (log.action === 'check_in' || log.action === 'break_end') {
      activeStartTimestamp = logTimestamp;
      return;
    }

    if (
      (log.action === 'break_start' || log.action === 'check_out') &&
      activeStartTimestamp
    ) {
      totalMilliseconds += Math.max(logTimestamp - activeStartTimestamp, 0);
      activeStartTimestamp = null;
    }
  });

  if (activeStartTimestamp) {
    totalMilliseconds += Math.max(nowTimestamp - activeStartTimestamp, 0);
  }

  return totalMilliseconds;
};

const isAttendanceRecordActive = (record: Pick<AttendanceRecord, 'logs'>) => {
  const lastLog = record.logs[record.logs.length - 1];

  return lastLog?.action === 'check_in' || lastLog?.action === 'break_end';
};

const formatDuration = (durationMilliseconds: number) => {
  if (!Number.isFinite(durationMilliseconds) || durationMilliseconds <= 0) {
    return '0h 0m';
  }

  const totalMinutes = Math.max(Math.floor(durationMilliseconds / 60000), 0);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return `${hours}h ${minutes}m`;
};

const formatDateLabel = (attendanceDate: string) => {
  const date = new Date(`${attendanceDate}T00:00:00`);

  return `${date.getDate()} ${monthLabels[date.getMonth()]} ${date.getFullYear()}`;
};

const formatTimeLabel = (value: string) => {
  const date = new Date(value);

  return date.toLocaleTimeString('en-IN', {
    hour: 'numeric',
    minute: '2-digit',
  });
};

const formatDistanceLabel = (distanceMeters: number) => {
  if (!Number.isFinite(distanceMeters)) {
    return '0 m';
  }

  if (distanceMeters < 1000) {
    return `${Math.round(distanceMeters)} m`;
  }

  return `${(distanceMeters / 1000).toFixed(distanceMeters >= 10000 ? 0 : 2)} km`;
};

const actionLabelMap: Record<AttendanceActionType, string> = {
  break_end: 'Break End',
  break_start: 'Break Start',
  check_in: 'Check In',
  check_out: 'Check Out',
};

const getTodayAttendanceDate = () => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).formatToParts(new Date());

  const day = parts.find(part => part.type === 'day')?.value || '01';
  const month = parts.find(part => part.type === 'month')?.value || '01';
  const year = parts.find(part => part.type === 'year')?.value || '1970';

  return `${year}-${month}-${day}`;
};

const getAllowedNextActions = (
  record: Pick<AttendanceRecord, 'logs'> | null,
): AttendanceActionType[] => {
  if (!record || !record.logs.length) {
    return ['check_in'];
  }

  const lastAction = record.logs[record.logs.length - 1]?.action;

  switch (lastAction) {
    case 'check_in':
      return ['break_start', 'check_out'];
    case 'break_start':
      return ['break_end'];
    case 'break_end':
      return ['break_start', 'check_out'];
    case 'check_out':
      return [];
    default:
      return [];
  }
};

const getActionStatusLabel = (
  action: AttendanceActionType,
  isAllowed: boolean,
  isLoading: boolean,
) => {
  if (isLoading) {
    return 'Saving...';
  }

  if (isAllowed) {
    return 'Available';
  }

  if (action === 'check_in') {
    return 'Already started';
  }

  if (action === 'break_start') {
    return 'Not active now';
  }

  if (action === 'break_end') {
    return 'Break not started';
  }

  return 'Not available';
};

const getDistanceInMeters = (
  latitudeA: number,
  longitudeA: number,
  latitudeB: number,
  longitudeB: number,
) => {
  const earthRadius = 6371000;
  const latitudeDelta = ((latitudeB - latitudeA) * Math.PI) / 180;
  const longitudeDelta = ((longitudeB - longitudeA) * Math.PI) / 180;
  const latitudeARadians = (latitudeA * Math.PI) / 180;
  const latitudeBRadians = (latitudeB * Math.PI) / 180;

  const haversine =
    Math.sin(latitudeDelta / 2) * Math.sin(latitudeDelta / 2) +
    Math.cos(latitudeARadians) *
      Math.cos(latitudeBRadians) *
      Math.sin(longitudeDelta / 2) *
      Math.sin(longitudeDelta / 2);

  return 2 * earthRadius * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
};

export default function AttendanceTabScreen({
  isAdmin,
  refreshSignal,
  token,
  users,
}: AttendanceTabScreenProps) {
  const initialMonthYear = useMemo(() => getInitialMonthYear(), []);
  const [currentTimestamp, setCurrentTimestamp] = useState(() => Date.now());
  const [detailRecord, setDetailRecord] = useState<AttendanceRecord | null>(null);
  const [draftMonth, setDraftMonth] = useState(initialMonthYear.month);
  const [draftSelectedUserId, setDraftSelectedUserId] = useState('');
  const [draftYear, setDraftYear] = useState(initialMonthYear.year);
  const [isActionLoading, setIsActionLoading] = useState<AttendanceActionType | null>(null);
  const [isFilterModalVisible, setIsFilterModalVisible] = useState(false);
  const [isLoadingRecords, setIsLoadingRecords] = useState(false);
  const [month, setMonth] = useState(initialMonthYear.month);
  const [pickerType, setPickerType] = useState<PickerType>(null);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [recordsError, setRecordsError] = useState('');
  const [selectedUserId, setSelectedUserId] = useState('');
  const [year, setYear] = useState(initialMonthYear.year);

  const userOptions = useMemo(
    () =>
      users.map(listUser => ({
        id: listUser.id,
        label: listUser.username,
        subLabel: listUser.email,
      })),
    [users],
  );
  const selectedUser = useMemo(
    () => userOptions.find(option => option.id === selectedUserId) ?? null,
    [selectedUserId, userOptions],
  );
  const draftSelectedUser = useMemo(
    () => userOptions.find(option => option.id === draftSelectedUserId) ?? null,
    [draftSelectedUserId, userOptions],
  );
  const todayAttendanceRecord = useMemo(() => {
    const todayAttendanceDate = getTodayAttendanceDate();

    return records.find(record => record.attendanceDate === todayAttendanceDate) ?? null;
  }, [records]);
  const allowedActions = useMemo(
    () => getAllowedNextActions(todayAttendanceRecord),
    [todayAttendanceRecord],
  );
  const yearOptions = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 7 }, (_, index) => currentYear - 3 + index);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTimestamp(Date.now());
    }, 1000);

    return () => {
      clearInterval(timer);
    };
  }, []);
  useEffect(() => {
    if (!isAdmin) {
      return;
    }

    if (!selectedUserId && userOptions.length) {
      setSelectedUserId(userOptions[0].id);
      setDraftSelectedUserId(userOptions[0].id);
    }
  }, [isAdmin, selectedUserId, userOptions]);

  const openFilterModal = () => {
    setDraftMonth(month);
    setDraftYear(year);
    setDraftSelectedUserId(selectedUserId);
    setIsFilterModalVisible(true);
  };

  const applyFilters = () => {
    setMonth(draftMonth);
    setYear(draftYear);
    if (isAdmin) {
      setSelectedUserId(draftSelectedUserId);
    }
    setIsFilterModalVisible(false);
  };

  const loadRecords = useCallback(async () => {
    try {
      if (isAdmin && !selectedUserId) {
        return;
      }

      setIsLoadingRecords(true);
      setRecordsError('');

      const data = isAdmin
        ? await fetchAttendance(token, {
            month,
            userId: selectedUserId,
            year,
          })
        : await fetchMyAttendance(token, {
            month,
            year,
          });

      setRecords(data);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unable to load attendance records.';
      setRecordsError(message);
    } finally {
      setIsLoadingRecords(false);
    }
  }, [isAdmin, month, selectedUserId, token, year]);

  useEffect(() => {
    loadRecords().catch(() => {
      // loadRecords already stores a user-facing error message in state.
    });
  }, [loadRecords, refreshSignal]);

  const handleAttendanceAction = async (action: AttendanceActionType) => {
    if (!ATTENDANCE_OFFICE_LOCATION) {
      setRecordsError(
        'Attendance location is not configured yet. Please add office coordinates in env.',
      );
      return;
    }

    try {
      setIsActionLoading(action);
      setRecordsError('');

      const permission = await Location.requestForegroundPermissionsAsync();

      if (permission.status !== 'granted') {
        throw new Error('Location permission is required to mark attendance.');
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Highest,
      });

      const distance = getDistanceInMeters(
        position.coords.latitude,
        position.coords.longitude,
        ATTENDANCE_OFFICE_LOCATION.latitude,
        ATTENDANCE_OFFICE_LOCATION.longitude,
      );

      if (distance > ATTENDANCE_RADIUS_METERS) {
        throw new Error(
          `You must be within ${ATTENDANCE_RADIUS_METERS}m of ${ATTENDANCE_LOCATION_NAME}. Current distance is ${formatDistanceLabel(distance)}.`,
        );
      }

      const savedRecord = await createAttendanceAction(token, {
        action,
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      });

      setRecords(current => {
        const existingIndex = current.findIndex(record => record.id === savedRecord.id);

        if (existingIndex === -1) {
          return [savedRecord, ...current];
        }

        return current.map(record =>
          record.id === savedRecord.id ? savedRecord : record,
        );
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unable to save attendance action.';
      setRecordsError(message);
    } finally {
      setIsActionLoading(null);
    }
  };

  const pickerTitle =
    pickerType === 'user'
      ? 'Select User'
      : pickerType === 'month'
        ? 'Select Month'
        : pickerType === 'year'
          ? 'Select Year'
          : '';

  return (
    <>
      <View style={styles.screenSection}>
        <View style={styles.headerCard}>
          <View style={styles.headerTextWrap}>
            <Text style={styles.sectionTitle}>
              {isAdmin ? 'Attendance Records' : 'Attendance'}
            </Text>
            <Text style={styles.sectionCaption}>
              {isAdmin
                ? 'Check current attendance records user by user with month and year filters.'
                : 'Track your attendance actions and review your monthly records.'}
            </Text>
          </View>
        </View>

        <View style={styles.filterSummaryCard}>
          <View style={styles.filterSummaryTextWrap}>
            <Text style={styles.filterSummaryTitle}>Filters</Text>
            <Text style={styles.filterSummaryText}>
              {isAdmin
                ? `${selectedUser?.label || 'Select User'} • ${monthLabels[month - 1]} ${year}`
                : `${monthLabels[month - 1]} ${year}`}
            </Text>
          </View>
          <Pressable onPress={openFilterModal} style={styles.filterOpenButton}>
            <Ionicons color="#ffffff" name="options-outline" size={16} />
            <Text style={styles.filterOpenButtonText}>Filters</Text>
          </Pressable>
        </View>

        {!isAdmin ? (
          <View style={styles.actionGrid}>
            {actionButtons.map(button => {
              const isLoading = isActionLoading === button.action;
              const isAllowed = allowedActions.includes(button.action);
              const isDisabled = Boolean(isActionLoading) || !isAllowed;

              return (
                <Pressable
                  key={button.action}
                  disabled={isDisabled}
                  onPress={() => handleAttendanceAction(button.action)}
                  style={[
                    styles.actionCard,
                    isDisabled ? styles.actionCardDisabled : styles.actionCardEnabled,
                  ]}>
                  <View style={styles.actionCardTopRow}>
                    <View
                      style={[
                        styles.actionIconWrap,
                        isDisabled
                          ? styles.actionIconWrapDisabled
                          : { backgroundColor: `${button.tint}18` },
                      ]}>
                      {isLoading ? (
                        <ActivityIndicator color={button.tint} />
                      ) : (
                        <Ionicons
                          color={isDisabled ? '#9ca3af' : button.tint}
                          name={button.icon}
                          size={20}
                        />
                      )}
                    </View>
                    <View
                      style={[
                        styles.actionStatusBadge,
                        isDisabled
                          ? styles.actionStatusBadgeDisabled
                          : styles.actionStatusBadgeEnabled,
                      ]}>
                      <Text
                        style={[
                          styles.actionStatusText,
                          isDisabled
                            ? styles.actionStatusTextDisabled
                            : styles.actionStatusTextEnabled,
                        ]}>
                        {getActionStatusLabel(button.action, isAllowed, isLoading)}
                      </Text>
                    </View>
                  </View>
                  <Text
                    style={[
                      styles.actionCardText,
                      isDisabled && styles.actionCardTextDisabled,
                    ]}>
                    {button.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        ) : null}

        <View style={styles.recordsCard}>
          <Text style={styles.recordsTitle}>
            {monthLabels[month - 1]} {year} Records
          </Text>

          {isLoadingRecords ? (
            <View style={styles.loadingState}>
              <ActivityIndicator color="#dc2626" />
              <Text style={styles.loadingText}>Loading attendance...</Text>
            </View>
          ) : recordsError ? (
            <Text style={styles.errorText}>{recordsError}</Text>
          ) : records.length ? (
            records.map(record => (
              <Pressable
                key={record.id}
                onPress={() => setDetailRecord(record)}
                style={styles.recordRow}>
                <View style={styles.recordRowLeft}>
                  <Text style={styles.recordPrimary}>
                    {isAdmin ? record.username : formatDateLabel(record.attendanceDate)}
                  </Text>
                  <Text style={styles.recordSecondary}>
                    {isAdmin
                      ? `${formatDateLabel(record.attendanceDate)} • ${record.userEmail}`
                      : `${record.logs.length} updates`}
                  </Text>
                  {isAttendanceRecordActive(record) ? (
                    <Text style={styles.liveStatusText}>Running</Text>
                  ) : null}
                </View>
                <View style={styles.recordRowRight}>
                  {!isAdmin ? null : (
                    <Text style={styles.recordDateLabel}>
                      {formatDateLabel(record.attendanceDate)}
                    </Text>
                  )}
                  <Text style={styles.recordDuration}>
                    {formatDuration(calculateWorkedMilliseconds(record, currentTimestamp))}
                  </Text>
                </View>
              </Pressable>
            ))
          ) : (
            <Text style={styles.emptyText}>No attendance records found for this period.</Text>
          )}
        </View>
      </View>

      <Modal
        animationType="slide"
        onRequestClose={() => setDetailRecord(null)}
        transparent
        visible={Boolean(detailRecord)}>
        <Pressable onPress={() => setDetailRecord(null)} style={styles.modalOverlay}>
          <Pressable onPress={() => {}} style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>
                  {detailRecord
                    ? isAdmin
                      ? detailRecord.username
                      : formatDateLabel(detailRecord.attendanceDate)
                    : ''}
                </Text>
                {detailRecord ? (
                  <Text style={styles.modalSubtitle}>
                    {isAdmin
                      ? `${formatDateLabel(detailRecord.attendanceDate)} • ${detailRecord.userEmail}`
                      : `${detailRecord.logs.length} updates • ${formatDuration(calculateWorkedMilliseconds(detailRecord, currentTimestamp))}`}
                  </Text>
                ) : null}
              </View>
              <Pressable
                hitSlop={10}
                onPress={() => setDetailRecord(null)}
                style={styles.closeButton}>
                <Ionicons color="#6b7280" name="close" size={22} />
              </Pressable>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.modalScrollContent}>
              {detailRecord ? (
                <>
                  <View style={styles.detailSummaryCard}>
                    <Text style={styles.detailSummaryLabel}>Total Time</Text>
                    <Text style={styles.detailSummaryValue}>
                      {formatDuration(
                        calculateWorkedMilliseconds(detailRecord, currentTimestamp),
                      )}
                    </Text>
                  </View>

                  {detailRecord.logs.length ? (
                    detailRecord.logs.map(log => (
                      <View key={log.id} style={styles.logCard}>
                        <View style={styles.logHeader}>
                          <Text style={styles.logAction}>{actionLabelMap[log.action]}</Text>
                          <Text style={styles.logTime}>{formatTimeLabel(log.recordedAt)}</Text>
                        </View>
                        <Text style={styles.logMeta}>
                          Coordinates:{' '}
                          {log.latitude && log.longitude
                            ? `${log.latitude.toFixed(6)}, ${log.longitude.toFixed(6)}`
                            : 'Not available'}
                        </Text>
                        {typeof log.distanceMeters === 'number' ? (
                          <Text style={styles.logMeta}>
                            Distance from office: {formatDistanceLabel(log.distanceMeters)}
                          </Text>
                        ) : null}
                        {log.address ? (
                          <Text style={styles.logMeta}>Address: {log.address}</Text>
                        ) : null}
                        {log.notes ? <Text style={styles.logMeta}>Notes: {log.notes}</Text> : null}
                      </View>
                    ))
                  ) : (
                    <Text style={styles.emptyText}>No attendance actions available.</Text>
                  )}
                </>
              ) : null}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        animationType="slide"
        onRequestClose={() => setIsFilterModalVisible(false)}
        transparent
        visible={isFilterModalVisible}>
        <Pressable
          onPress={() => setIsFilterModalVisible(false)}
          style={styles.modalOverlay}>
          <Pressable onPress={() => {}} style={styles.modalCard}>
            <Text style={styles.modalTitle}>Attendance Filters</Text>
            <Text style={styles.modalSubtitle}>
              Choose filters and press Apply.
            </Text>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.modalScrollContent}>
              <View style={styles.filtersCard}>
                {isAdmin ? (
                  <>
                    <Text style={styles.fieldLabel}>User</Text>
                    <Pressable
                      onPress={() => setPickerType('user')}
                      style={styles.selectField}>
                      <View>
                        <Text style={styles.selectFieldValue}>
                          {draftSelectedUser?.label || 'Select User'}
                        </Text>
                        <Text style={styles.selectFieldSubValue}>
                          {draftSelectedUser?.subLabel || 'Choose one user'}
                        </Text>
                      </View>
                      <Ionicons color="#7f1d1d" name="chevron-down" size={18} />
                    </Pressable>
                  </>
                ) : null}

                <View style={styles.filterRow}>
                  <View style={styles.filterColumn}>
                    <Text style={styles.fieldLabel}>Month</Text>
                    <Pressable
                      onPress={() => setPickerType('month')}
                      style={styles.selectFieldCompact}>
                      <Text style={styles.selectFieldValue}>
                        {monthLabels[draftMonth - 1]}
                      </Text>
                      <Ionicons color="#7f1d1d" name="chevron-down" size={18} />
                    </Pressable>
                  </View>
                  <View style={styles.filterColumn}>
                    <Text style={styles.fieldLabel}>Year</Text>
                    <Pressable
                      onPress={() => setPickerType('year')}
                      style={styles.selectFieldCompact}>
                      <Text style={styles.selectFieldValue}>{draftYear}</Text>
                      <Ionicons color="#7f1d1d" name="chevron-down" size={18} />
                    </Pressable>
                  </View>
                </View>
              </View>

              <View style={styles.filterActions}>
                <Pressable
                  onPress={() => setIsFilterModalVisible(false)}
                  style={styles.secondaryButton}>
                  <Text style={styles.secondaryButtonText}>Cancel</Text>
                </Pressable>
                <Pressable onPress={applyFilters} style={styles.primaryButton}>
                  <Text style={styles.primaryButtonText}>Apply</Text>
                </Pressable>
              </View>
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        animationType="fade"
        onRequestClose={() => setPickerType(null)}
        transparent
        visible={Boolean(pickerType)}>
        <Pressable onPress={() => setPickerType(null)} style={styles.modalOverlay}>
          <Pressable onPress={() => {}} style={styles.pickerCard}>
            <Text style={styles.modalTitle}>{pickerTitle}</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              {pickerType === 'month'
                ? monthLabels.map((monthLabel, index) => {
                    const optionMonth = index + 1;
                    const isSelected = optionMonth === draftMonth;

                    return (
                      <Pressable
                        key={monthLabel}
                        onPress={() => {
                          setDraftMonth(optionMonth);
                          setPickerType(null);
                        }}
                        style={[styles.optionRow, isSelected && styles.optionRowSelected]}>
                        <Text
                          style={[
                            styles.optionRowText,
                            isSelected && styles.optionRowTextSelected,
                          ]}>
                          {monthLabel}
                        </Text>
                      </Pressable>
                    );
                  })
                : null}
              {pickerType === 'year'
                ? yearOptions.map(optionYear => {
                    const isSelected = optionYear === draftYear;

                    return (
                      <Pressable
                        key={optionYear}
                        onPress={() => {
                          setDraftYear(optionYear);
                          setPickerType(null);
                        }}
                        style={[styles.optionRow, isSelected && styles.optionRowSelected]}>
                        <Text
                          style={[
                            styles.optionRowText,
                            isSelected && styles.optionRowTextSelected,
                          ]}>
                          {optionYear}
                        </Text>
                      </Pressable>
                    );
                  })
                : null}
              {pickerType === 'user'
                ? userOptions.map(option => {
                    const isSelected = option.id === draftSelectedUserId;

                    return (
                      <Pressable
                        key={option.id}
                        onPress={() => {
                          setDraftSelectedUserId(option.id);
                          setPickerType(null);
                        }}
                        style={[styles.optionRow, isSelected && styles.optionRowSelected]}>
                        <Text
                          style={[
                            styles.optionRowText,
                            isSelected && styles.optionRowTextSelected,
                          ]}>
                          {option.label}
                        </Text>
                        <Text
                          style={[
                            styles.optionRowSubText,
                            isSelected && styles.optionRowSubTextSelected,
                          ]}>
                          {option.subLabel}
                        </Text>
                      </Pressable>
                    );
                  })
                : null}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  screenSection: {
    gap: 14,
  },
  headerCard: {
    alignItems: 'flex-start',
    backgroundColor: '#ffffff',
    borderColor: '#fecaca',
    borderRadius: 24,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 18,
  },
  headerTextWrap: {
    flex: 1,
    paddingRight: 14,
  },
  sectionTitle: {
    color: '#111827',
    fontSize: 22,
    fontWeight: '700',
  },
  sectionCaption: {
    color: '#6b7280',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 6,
  },
  summaryPill: {
    alignItems: 'flex-end',
    backgroundColor: '#fff1ee',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  summaryPillLabel: {
    color: '#9a3412',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  summaryPillValue: {
    color: '#b91c1c',
    fontSize: 18,
    fontWeight: '800',
    marginTop: 2,
  },
  actionInfoCard: {
    backgroundColor: '#fff7f5',
    borderColor: '#fee2e2',
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
  },
  actionInfoHeader: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  actionInfoTitle: {
    color: '#111827',
    fontSize: 15,
    fontWeight: '700',
    marginLeft: 8,
  },
  actionInfoText: {
    color: '#6b7280',
    fontSize: 13,
    lineHeight: 18,
    marginTop: 8,
  },
  filtersCard: {
    backgroundColor: '#ffffff',
    borderColor: '#fecaca',
    borderRadius: 24,
    borderWidth: 1,
    padding: 18,
  },
  filterSummaryCard: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderColor: '#fecaca',
    borderRadius: 24,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 18,
  },
  filterSummaryTextWrap: {
    flex: 1,
    paddingRight: 12,
  },
  filterSummaryTitle: {
    color: '#111827',
    fontSize: 16,
    fontWeight: '700',
  },
  filterSummaryText: {
    color: '#6b7280',
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
  },
  filterOpenButton: {
    alignItems: 'center',
    backgroundColor: '#dc2626',
    borderRadius: 14,
    flexDirection: 'row',
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  filterOpenButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
    marginLeft: 6,
  },
  fieldLabel: {
    color: '#6b7280',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  selectField: {
    alignItems: 'center',
    backgroundColor: '#fff7f5',
    borderColor: '#fee2e2',
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  selectFieldCompact: {
    alignItems: 'center',
    backgroundColor: '#fff7f5',
    borderColor: '#fee2e2',
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  selectFieldValue: {
    color: '#111827',
    fontSize: 15,
    fontWeight: '700',
  },
  selectFieldSubValue: {
    color: '#6b7280',
    fontSize: 12,
    marginTop: 3,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 12,
  },
  filterColumn: {
    flex: 1,
  },
  filterActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 14,
  },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  actionCard: {
    borderRadius: 24,
    borderWidth: 1,
    minHeight: 108,
    paddingHorizontal: 14,
    paddingVertical: 14,
    width: '48%',
  },
  actionCardEnabled: {
    backgroundColor: '#fffdfc',
    borderColor: '#fecaca',
    shadowColor: '#7f1d1d',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  actionCardDisabled: {
    backgroundColor: '#f8fafc',
    borderColor: '#e5e7eb',
  },
  actionIconWrap: {
    alignItems: 'center',
    borderRadius: 18,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  actionIconWrapDisabled: {
    backgroundColor: '#e5e7eb',
  },
  actionCardTopRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  actionCardText: {
    color: '#111827',
    fontSize: 14,
    fontWeight: '700',
  },
  actionCardTextDisabled: {
    color: '#6b7280',
  },
  actionStatusBadge: {
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  actionStatusBadgeEnabled: {
    backgroundColor: '#ecfdf3',
  },
  actionStatusBadgeDisabled: {
    backgroundColor: '#eef2f7',
  },
  actionStatusText: {
    fontSize: 10,
    fontWeight: '700',
  },
  actionStatusTextEnabled: {
    color: '#15803d',
  },
  actionStatusTextDisabled: {
    color: '#64748b',
  },
  recordsCard: {
    backgroundColor: '#ffffff',
    borderColor: '#fecaca',
    borderRadius: 24,
    borderWidth: 1,
    padding: 18,
  },
  recordsTitle: {
    color: '#111827',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 14,
  },
  loadingState: {
    alignItems: 'center',
    paddingVertical: 28,
  },
  loadingText: {
    color: '#6b7280',
    marginTop: 10,
  },
  errorText: {
    color: '#b91c1c',
    fontSize: 14,
    lineHeight: 20,
  },
  emptyText: {
    color: '#6b7280',
    fontSize: 14,
    lineHeight: 20,
  },
  recordRow: {
    alignItems: 'center',
    backgroundColor: '#fffdfc',
    borderColor: '#fee2e2',
    borderRadius: 20,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
    padding: 14,
  },
  recordRowLeft: {
    flex: 1,
    paddingRight: 12,
  },
  recordPrimary: {
    color: '#111827',
    fontSize: 15,
    fontWeight: '700',
  },
  recordSecondary: {
    color: '#6b7280',
    fontSize: 12,
    marginTop: 4,
  },
  liveStatusText: {
    color: '#15803d',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 6,
  },
  recordRowRight: {
    alignItems: 'flex-end',
  },
  recordDateLabel: {
    color: '#9a3412',
    fontSize: 12,
    marginBottom: 4,
  },
  recordDuration: {
    color: '#b91c1c',
    fontSize: 15,
    fontWeight: '800',
  },
  modalOverlay: {
    alignItems: 'center',
    backgroundColor: 'rgba(17, 24, 39, 0.45)',
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    maxHeight: '84%',
    padding: 20,
    width: '100%',
  },
  modalHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  modalTitle: {
    color: '#111827',
    fontSize: 22,
    fontWeight: '700',
  },
  modalSubtitle: {
    color: '#6b7280',
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
  },
  closeButton: {
    paddingLeft: 12,
  },
  modalScrollContent: {
    paddingBottom: 8,
  },
  secondaryButton: {
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    paddingHorizontal: 16,
  },
  secondaryButtonText: {
    color: '#6b7280',
    fontSize: 15,
    fontWeight: '600',
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: '#dc2626',
    borderRadius: 14,
    minWidth: 110,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  detailSummaryCard: {
    alignItems: 'center',
    backgroundColor: '#fff1ee',
    borderRadius: 18,
    marginBottom: 14,
    padding: 14,
  },
  detailSummaryLabel: {
    color: '#9a3412',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  detailSummaryValue: {
    color: '#b91c1c',
    fontSize: 20,
    fontWeight: '800',
    marginTop: 4,
  },
  logCard: {
    backgroundColor: '#fffdfc',
    borderColor: '#fee2e2',
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: 10,
    padding: 14,
  },
  logHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  logAction: {
    color: '#111827',
    fontSize: 15,
    fontWeight: '700',
  },
  logTime: {
    color: '#b91c1c',
    fontSize: 14,
    fontWeight: '700',
  },
  logMeta: {
    color: '#6b7280',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 3,
  },
  pickerCard: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    maxHeight: '78%',
    padding: 20,
    width: '100%',
  },
  optionRow: {
    backgroundColor: '#fff7f5',
    borderRadius: 16,
    marginBottom: 10,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  optionRowSelected: {
    backgroundColor: '#dc2626',
  },
  optionRowText: {
    color: '#111827',
    fontSize: 15,
    fontWeight: '700',
  },
  optionRowTextSelected: {
    color: '#ffffff',
  },
  optionRowSubText: {
    color: '#6b7280',
    fontSize: 12,
    marginTop: 3,
  },
  optionRowSubTextSelected: {
    color: '#fee2e2',
  },
});
