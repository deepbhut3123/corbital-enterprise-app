import Ionicons from '@expo/vector-icons/Ionicons';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import type { UserRecord } from '../../services/auth';
import {
  fetchTargets,
  saveTarget,
  type TargetRecord,
} from '../../services/targets';
import { fetchValueEntries, type ValueEntryRecord } from '../../services/valueEntries';

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

type TargetsTabScreenProps = {
  refreshSignal: number;
  token: string;
  users: UserRecord[];
};

const getInitialMonthYear = () => {
  const now = new Date();

  return {
    month: now.getMonth() + 1,
    year: now.getFullYear(),
  };
};

export default function TargetsTabScreen({
  refreshSignal,
  token,
  users,
}: TargetsTabScreenProps) {
  const initialMonthYear = useMemo(() => getInitialMonthYear(), []);
  const [amount, setAmount] = useState('');
  const [isLoadingTargets, setIsLoadingTargets] = useState(false);
  const [isLoadingTargetDetails, setIsLoadingTargetDetails] = useState(false);
  const [isTargetDetailsVisible, setIsTargetDetailsVisible] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [pickerType, setPickerType] = useState<'month' | 'user' | 'year' | null>(null);
  const [isSavingTarget, setIsSavingTarget] = useState(false);
  const [month, setMonth] = useState(initialMonthYear.month);
  const [selectedTarget, setSelectedTarget] = useState<TargetRecord | null>(null);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [targets, setTargets] = useState<TargetRecord[]>([]);
  const [targetsError, setTargetsError] = useState('');
  const [targetEntries, setTargetEntries] = useState<ValueEntryRecord[]>([]);
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
  const yearOptions = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 7 }, (_, index) => currentYear - 3 + index);
  }, []);
  const selectedUser = useMemo(
    () => userOptions.find(option => option.id === selectedUserId) ?? null,
    [selectedUserId, userOptions],
  );
  const selectedTargetAchievedAmount = useMemo(() => {
    if (!selectedTarget) {
      return 0;
    }

    return targetEntries
      .filter(entry => {
        const entryDate = new Date(`${entry.entryDate}T00:00:00`);
        return (
          entry.userId === selectedTarget.userId &&
          entryDate.getMonth() + 1 === selectedTarget.month &&
          entryDate.getFullYear() === selectedTarget.year
        );
      })
      .reduce((sum, entry) => sum + entry.netProfit, 0);
  }, [selectedTarget, targetEntries]);
  const selectedTargetCompletionPercent = useMemo(() => {
    if (!selectedTarget || selectedTarget.amount <= 0) {
      return 0;
    }

    return Math.round(
      Math.min(selectedTargetAchievedAmount / selectedTarget.amount, 1) * 100,
    );
  }, [selectedTarget, selectedTargetAchievedAmount]);

  useEffect(() => {
    if (!selectedUserId && userOptions.length) {
      setSelectedUserId(userOptions[0].id);
    }
  }, [selectedUserId, userOptions]);

  const loadTargets = useCallback(async () => {
    try {
      setIsLoadingTargets(true);
      setTargetsError('');
      const [targetData, valueEntryData] = await Promise.all([
        fetchTargets(token),
        fetchValueEntries(token),
      ]);
      setTargets(targetData);
      setTargetEntries(valueEntryData);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unable to load targets.';
      setTargetsError(message);
    } finally {
      setIsLoadingTargets(false);
    }
  }, [token]);

  useEffect(() => {
    loadTargets().catch(() => {
      // loadTargets already stores a user-facing error message in state.
    });
  }, [loadTargets, refreshSignal]);

  const resetFormState = () => {
    setAmount('');
    setMonth(initialMonthYear.month);
    setYear(initialMonthYear.year);
    setPickerType(null);
    setTargetsError('');
  };

  const openTargetModal = () => {
    resetFormState();
    setIsModalVisible(true);
  };

  const handleSaveTarget = async () => {
    if (!selectedUserId) {
      setTargetsError('Please select a user.');
      return;
    }

    if (!amount.trim()) {
      setTargetsError('Please enter a target amount.');
      return;
    }

    try {
      setIsSavingTarget(true);
      setTargetsError('');
      const savedTarget = await saveTarget(
        {
          amount,
          month,
          userId: selectedUserId,
          year,
        },
        token,
      );

      setTargets(current => {
        const existingIndex = current.findIndex(
          target =>
            target.userId === savedTarget.userId &&
            target.month === savedTarget.month &&
            target.year === savedTarget.year,
        );

        if (existingIndex === -1) {
          return [savedTarget, ...current];
        }

        return current.map(target =>
          target.id === current[existingIndex].id ? savedTarget : target,
        );
      });
      setIsModalVisible(false);
      resetFormState();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unable to save target.';
      setTargetsError(message);
    } finally {
      setIsSavingTarget(false);
    }
  };

  const openTargetDetails = (target: TargetRecord) => {
    setIsLoadingTargetDetails(true);
    setSelectedTarget(target);
    setIsTargetDetailsVisible(true);
    setIsLoadingTargetDetails(false);
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
      <View style={styles.listCard}>
        <View style={styles.listHeader}>
          <View style={styles.listHeaderContent}>
            <Text style={styles.sectionTitle}>Target List</Text>
            <Text style={styles.sectionCaption}>
              All saved user targets are listed here.
            </Text>
          </View>
          <Pressable onPress={openTargetModal} style={styles.openModalButton}>
            <Ionicons color="#ffffff" name="add" size={18} />
            <Text style={styles.openModalButtonText}>Set Target</Text>
          </Pressable>
        </View>

        {isLoadingTargets ? (
          <View style={styles.loadingState}>
            <ActivityIndicator color="#dc2626" />
            <Text style={styles.loadingText}>Loading targets...</Text>
          </View>
        ) : targets.length ? (
          targets.map(target => (
            <Pressable
              key={target.id}
              onPress={() => openTargetDetails(target)}
              style={styles.targetRow}>
              <View style={styles.targetHeader}>
                <View>
                  <Text style={styles.targetName}>{target.username}</Text>
                  <Text style={styles.targetEmail}>{target.userEmail}</Text>
                </View>
                <View style={styles.targetMonthBadge}>
                  <Text style={styles.targetMonthBadgeText}>
                    {monthLabels[target.month - 1]} {target.year}
                  </Text>
                </View>
              </View>
              <Text style={styles.targetAmount}>
                Rs. {target.amount.toLocaleString('en-IN')}
              </Text>
              <Text style={styles.targetSetter}>
                Set by {target.setByName || 'Admin'}
              </Text>
            </Pressable>
          ))
        ) : (
          <Text style={styles.emptyText}>No targets saved yet.</Text>
        )}
      </View>

      <Modal
        animationType="slide"
        onRequestClose={() => setIsModalVisible(false)}
        transparent
        visible={isModalVisible}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.sectionTitle}>Set Monthly Target</Text>
            <Text style={styles.sectionCaption}>
              Select a user, choose month and year, then save the target amount.
            </Text>

            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.modalScrollContent}>
              <Text style={styles.fieldLabel}>User</Text>
              <Pressable
                onPress={() => setPickerType('user')}
                style={styles.selectField}>
                <View>
                  <Text style={styles.selectFieldValue}>
                    {selectedUser?.label || 'Select User'}
                  </Text>
                  <Text style={styles.selectFieldSubValue}>
                    {selectedUser?.subLabel || 'Choose one user'}
                  </Text>
                </View>
                <Ionicons color="#7f1d1d" name="chevron-down" size={18} />
              </Pressable>

              <View style={styles.filterRow}>
                <View style={styles.filterControl}>
                  <Text style={styles.fieldLabel}>Month</Text>
                  <Pressable
                    onPress={() => setPickerType('month')}
                    style={styles.selectField}>
                    <Text style={styles.selectFieldValue}>
                      {monthLabels[month - 1]}
                    </Text>
                    <Ionicons color="#7f1d1d" name="chevron-down" size={18} />
                  </Pressable>
                </View>

                <View style={styles.filterControl}>
                  <Text style={styles.fieldLabel}>Year</Text>
                  <Pressable
                    onPress={() => setPickerType('year')}
                    style={styles.selectField}>
                    <Text style={styles.selectFieldValue}>{year}</Text>
                    <Ionicons color="#7f1d1d" name="chevron-down" size={18} />
                  </Pressable>
                </View>
              </View>

              <TextInput
                keyboardType="numeric"
                onChangeText={setAmount}
                placeholder="Target Amount"
                placeholderTextColor="#94a3b8"
                style={styles.amountInput}
                value={amount}
              />

              {targetsError ? <Text style={styles.errorText}>{targetsError}</Text> : null}

              <View style={styles.modalActions}>
                <Pressable
                  onPress={() => {
                    setIsModalVisible(false);
                    resetFormState();
                  }}
                  style={styles.secondaryButton}>
                  <Text style={styles.secondaryButtonText}>Cancel</Text>
                </Pressable>
                <Pressable
                  disabled={isSavingTarget}
                  onPress={handleSaveTarget}
                  style={styles.saveButton}>
                  {isSavingTarget ? (
                    <ActivityIndicator color="#ffffff" />
                  ) : (
                    <Text style={styles.saveButtonText}>Save Target</Text>
                  )}
                </Pressable>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal
        animationType="fade"
        onRequestClose={() => setPickerType(null)}
        transparent
        visible={pickerType !== null}>
        <View style={styles.pickerOverlay}>
          <Pressable style={styles.pickerBackdrop} onPress={() => setPickerType(null)} />
          <View style={styles.pickerCard}>
            <View style={styles.pickerHeader}>
              <Text style={styles.pickerTitle}>{pickerTitle}</Text>
              <Pressable onPress={() => setPickerType(null)} style={styles.pickerClose}>
                <Ionicons color="#7f1d1d" name="close" size={18} />
              </Pressable>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              style={styles.pickerScroll}
              contentContainerStyle={styles.pickerScrollContent}>
              {pickerType === 'user'
                ? userOptions.map(option => {
                    const isSelected = option.id === selectedUserId;

                    return (
                      <Pressable
                        key={option.id}
                        onPress={() => {
                          setSelectedUserId(option.id);
                          setPickerType(null);
                        }}
                        style={[
                          styles.optionRow,
                          isSelected && styles.optionRowActive,
                        ]}>
                        <Text
                          style={[
                            styles.optionLabel,
                            isSelected && styles.optionLabelActive,
                          ]}>
                          {option.label}
                        </Text>
                        <Text
                          style={[
                            styles.optionSubLabel,
                            isSelected && styles.optionSubLabelActive,
                          ]}>
                          {option.subLabel}
                        </Text>
                      </Pressable>
                    );
                  })
                : null}

              {pickerType === 'month'
                ? monthLabels.map((label, index) => {
                    const optionMonth = index + 1;
                    const isSelected = optionMonth === month;

                    return (
                      <Pressable
                        key={label}
                        onPress={() => {
                          setMonth(optionMonth);
                          setPickerType(null);
                        }}
                        style={[
                          styles.optionRowCompact,
                          isSelected && styles.optionRowActive,
                        ]}>
                        <Text
                          style={[
                            styles.optionLabel,
                            isSelected && styles.optionLabelActive,
                          ]}>
                          {label}
                        </Text>
                      </Pressable>
                    );
                  })
                : null}

              {pickerType === 'year'
                ? yearOptions.map(optionYear => {
                    const isSelected = optionYear === year;

                    return (
                      <Pressable
                        key={optionYear}
                        onPress={() => {
                          setYear(optionYear);
                          setPickerType(null);
                        }}
                        style={[
                          styles.optionRowCompact,
                          isSelected && styles.optionRowActive,
                        ]}>
                        <Text
                          style={[
                            styles.optionLabel,
                            isSelected && styles.optionLabelActive,
                          ]}>
                          {optionYear}
                        </Text>
                      </Pressable>
                    );
                  })
                : null}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal
        animationType="slide"
        onRequestClose={() => {
          setIsTargetDetailsVisible(false);
          setSelectedTarget(null);
        }}
        transparent
        visible={isTargetDetailsVisible}>
        <View style={styles.modalOverlay}>
          <Pressable
            style={styles.modalBackdrop}
            onPress={() => {
              setIsTargetDetailsVisible(false);
              setSelectedTarget(null);
            }}
          />
          <View style={styles.modalCard}>
            {selectedTarget ? (
              <>
                <Text style={styles.sectionTitle}>Target Details</Text>
                <Text style={styles.sectionCaption}>
                  Achievement summary for {selectedTarget.username} in{' '}
                  {monthLabels[selectedTarget.month - 1]} {selectedTarget.year}.
                </Text>

                {isLoadingTargetDetails ? (
                  <View style={styles.loadingState}>
                    <ActivityIndicator color="#dc2626" />
                    <Text style={styles.loadingText}>Loading target details...</Text>
                  </View>
                ) : (
                  <View style={styles.targetDetailsWrap}>
                    <View style={styles.targetDetailCard}>
                      <Text style={styles.targetDetailLabel}>Target Amount</Text>
                      <Text style={styles.targetDetailValue}>
                        Rs. {selectedTarget.amount.toLocaleString('en-IN')}
                      </Text>
                    </View>
                    <View style={styles.targetDetailCard}>
                      <Text style={styles.targetDetailLabel}>Achieved Amount</Text>
                      <Text style={styles.targetDetailValue}>
                        Rs. {Math.round(selectedTargetAchievedAmount).toLocaleString('en-IN')}
                      </Text>
                    </View>
                    <View style={styles.targetDetailCard}>
                      <Text style={styles.targetDetailLabel}>Completion</Text>
                      <Text style={styles.targetDetailValue}>
                        {selectedTargetCompletionPercent}%
                      </Text>
                    </View>
                  </View>
                )}

                <View style={styles.modalActions}>
                  <Pressable
                    onPress={() => {
                      setIsTargetDetailsVisible(false);
                      setSelectedTarget(null);
                    }}
                    style={styles.saveButton}>
                    <Text style={styles.saveButtonText}>Close</Text>
                  </Pressable>
                </View>
              </>
            ) : null}
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  sectionTitle: {
    color: '#111827',
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 6,
  },
  sectionCaption: {
    color: '#6b7280',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  listHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  listHeaderContent: {
    flex: 1,
    paddingRight: 12,
  },
  openModalButton: {
    alignItems: 'center',
    backgroundColor: '#dc2626',
    borderRadius: 16,
    flexDirection: 'row',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  openModalButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
    marginLeft: 6,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 14,
    marginBottom: 16,
  },
  filterControl: {
    flex: 1,
  },
  fieldLabel: {
    color: '#6b7280',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 8,
    marginLeft: 2,
    textTransform: 'uppercase',
  },
  selectField: {
    backgroundColor: '#fff7f5',
    borderColor: '#fca5a5',
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  selectFieldValue: {
    color: '#111827',
    fontSize: 14,
    fontWeight: '700',
  },
  selectFieldSubValue: {
    color: '#6b7280',
    fontSize: 12,
    marginTop: 2,
  },
  optionsCard: {
    marginTop: 8,
  },
  optionRow: {
    borderBottomColor: '#fee2e2',
    borderBottomWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  optionRowCompact: {
    borderBottomColor: '#fee2e2',
    borderBottomWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  optionRowActive: {
    backgroundColor: '#fff1ee',
  },
  optionLabel: {
    color: '#111827',
    fontSize: 14,
    fontWeight: '700',
  },
  optionLabelActive: {
    color: '#b91c1c',
  },
  optionSubLabel: {
    color: '#6b7280',
    fontSize: 12,
    marginTop: 2,
  },
  optionSubLabelActive: {
    color: '#b91c1c',
  },
  amountInput: {
    backgroundColor: '#fff7f5',
    borderColor: '#fca5a5',
    borderRadius: 16,
    borderWidth: 1,
    color: '#111827',
    fontSize: 15,
    marginBottom: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  listCard: {
    backgroundColor: '#ffffff',
    borderColor: '#fecaca',
    borderRadius: 28,
    borderWidth: 1,
    padding: 20,
  },
  modalOverlay: {
    backgroundColor: 'rgba(17, 24, 39, 0.45)',
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    flex: 1,
  },
  modalCard: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '85%',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 14,
  },
  modalScrollContent: {
    paddingBottom: 10,
  },
  pickerOverlay: {
    backgroundColor: 'rgba(17, 24, 39, 0.35)',
    flex: 1,
    justifyContent: 'flex-end',
  },
  pickerBackdrop: {
    flex: 1,
  },
  pickerCard: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '62%',
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 12,
  },
  pickerHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  pickerTitle: {
    color: '#111827',
    fontSize: 18,
    fontWeight: '700',
  },
  pickerClose: {
    alignItems: 'center',
    backgroundColor: '#fff1ee',
    borderRadius: 12,
    height: 30,
    justifyContent: 'center',
    width: 30,
  },
  pickerScroll: {
    maxHeight: 320,
  },
  pickerScrollContent: {
    paddingBottom: 10,
  },
  loadingState: {
    alignItems: 'center',
    paddingVertical: 28,
  },
  loadingText: {
    color: '#6b7280',
    marginTop: 10,
  },
  targetRow: {
    backgroundColor: '#fff7f5',
    borderColor: '#fee2e2',
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 12,
    padding: 14,
  },
  targetHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  targetName: {
    color: '#111827',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  targetEmail: {
    color: '#6b7280',
    fontSize: 12,
  },
  targetMonthBadge: {
    backgroundColor: '#fff1ee',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  targetMonthBadgeText: {
    color: '#7f1d1d',
    fontSize: 11,
    fontWeight: '700',
  },
  targetAmount: {
    color: '#111827',
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 6,
  },
  targetSetter: {
    color: '#6b7280',
    fontSize: 12,
  },
  targetDetailsWrap: {
    gap: 12,
    paddingBottom: 10,
  },
  targetDetailCard: {
    backgroundColor: '#fff7f5',
    borderColor: '#fee2e2',
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
  },
  targetDetailLabel: {
    color: '#9a3412',
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  targetDetailValue: {
    color: '#111827',
    fontSize: 20,
    fontWeight: '800',
  },
  targetDetailHint: {
    color: '#6b7280',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 6,
  },
  emptyText: {
    color: '#6b7280',
    fontSize: 15,
  },
  errorText: {
    color: '#b91c1c',
    fontSize: 14,
    marginBottom: 10,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 14,
    paddingTop: 8,
  },
  secondaryButton: {
    alignItems: 'center',
    borderRadius: 14,
    justifyContent: 'center',
    marginRight: 12,
    minHeight: 46,
    paddingHorizontal: 18,
  },
  secondaryButtonText: {
    color: '#6b7280',
    fontSize: 15,
    fontWeight: '600',
  },
  saveButton: {
    alignItems: 'center',
    backgroundColor: '#dc2626',
    borderRadius: 16,
    justifyContent: 'center',
    minHeight: 46,
    minWidth: 128,
    paddingHorizontal: 18,
    paddingVertical: 13,
  },
});
