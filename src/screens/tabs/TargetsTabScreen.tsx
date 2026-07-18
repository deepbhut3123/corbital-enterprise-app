import Ionicons from '@expo/vector-icons/Ionicons';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import type { LoggedInUser, UserRecord } from '../../services/auth';
import {
  deleteTarget,
  fetchMyTarget,
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
  isAdmin: boolean;
  refreshSignal: number;
  token: string;
  user: LoggedInUser;
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
  isAdmin,
  refreshSignal,
  token,
  user,
  users,
}: TargetsTabScreenProps) {
  const initialMonthYear = useMemo(() => getInitialMonthYear(), []);
  const [amount, setAmount] = useState('');
  const [isLoadingTargets, setIsLoadingTargets] = useState(false);
  const [isLoadingTargetDetails, setIsLoadingTargetDetails] = useState(false);
  const [isTargetDetailsVisible, setIsTargetDetailsVisible] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isDeletingTargetId, setIsDeletingTargetId] = useState<string | null>(null);
  const [pickerType, setPickerType] = useState<
    'filterMonth' | 'filterYear' | 'month' | 'user' | 'year' | null
  >(null);
  const [isSavingTarget, setIsSavingTarget] = useState(false);
  const [filterMonth, setFilterMonth] = useState(initialMonthYear.month);
  const [filterYear, setFilterYear] = useState(initialMonthYear.year);
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
  const filteredTargets = useMemo(
    () =>
      targets.filter(
        target => target.month === filterMonth && target.year === filterYear,
      ),
    [filterMonth, filterYear, targets],
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
      .reduce((sum, entry) => sum + entry.sellAmount, 0);
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
    if (!isAdmin) {
      return;
    }

    if (!selectedUserId && userOptions.length) {
      setSelectedUserId(userOptions[0].id);
    }
  }, [isAdmin, selectedUserId, userOptions]);

  const loadTargets = useCallback(async () => {
    try {
      setIsLoadingTargets(true);
      setTargetsError('');
      const [targetData, valueEntryData] = await Promise.all([
        isAdmin
          ? fetchTargets(token)
          : fetchMyTarget(token, filterMonth, filterYear).then(target =>
              target ? [target] : [],
            ),
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
  }, [filterMonth, filterYear, isAdmin, token]);

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
    setSelectedTarget(null);
    setTargetsError('');
  };

  const openTargetModal = () => {
    resetFormState();
    setIsModalVisible(true);
  };

  const openEditTargetModal = (target: TargetRecord) => {
    setSelectedTarget(target);
    setSelectedUserId(target.userId);
    setMonth(target.month);
    setYear(target.year);
    setAmount(String(target.amount));
    setTargetsError('');
    setPickerType(null);
    setIsTargetDetailsVisible(false);
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

  const handleDeleteTarget = (target: TargetRecord) => {
    Alert.alert(
      'Delete Target',
      'Are you sure you want to delete this target?',
      [
        { style: 'cancel', text: 'Cancel' },
        {
          style: 'destructive',
          text: 'Delete',
          onPress: () => {
            setIsDeletingTargetId(target.id);
            setTargetsError('');
            deleteTarget(target.id, token)
              .then(() => {
                setTargets(current =>
                  current.filter(listTarget => listTarget.id !== target.id),
                );
                setSelectedTarget(current =>
                  current?.id === target.id ? null : current,
                );
                setIsTargetDetailsVisible(false);
              })
              .catch(error => {
                const message =
                  error instanceof Error ? error.message : 'Unable to delete target.';
                setTargetsError(message);
              })
              .finally(() => {
                setIsDeletingTargetId(null);
              });
          },
        },
      ],
    );
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
      : pickerType === 'filterMonth' || pickerType === 'month'
        ? 'Select Month'
        : pickerType === 'filterYear' || pickerType === 'year'
          ? 'Select Year'
          : '';

  return (
    <>
      <View style={styles.listCard}>
        <View style={styles.listHeader}>
          <View style={styles.listHeaderContent}>
            <Text style={styles.sectionTitle}>Target List</Text>
            <Text style={styles.sectionCaption}>
              {isAdmin
                ? 'All saved user targets are listed here.'
                : 'Your target summary for the selected month is listed here.'}
            </Text>
          </View>
          {isAdmin ? (
            <Pressable onPress={openTargetModal} style={styles.openModalButton}>
              <Ionicons color="#ffffff" name="add" size={18} />
              <Text style={styles.openModalButtonText}>Set Target</Text>
            </Pressable>
          ) : null}
        </View>

        <View style={styles.topFilterRow}>
          <Pressable
            onPress={() => setPickerType('filterMonth')}
            style={styles.topFilterControl}>
            <Text style={styles.topFilterLabel}>Month</Text>
            <View style={styles.topFilterValueRow}>
              <Text style={styles.topFilterValue}>{monthLabels[filterMonth - 1]}</Text>
              <Ionicons color="#7f1d1d" name="chevron-down" size={16} />
            </View>
          </Pressable>
          <Pressable
            onPress={() => setPickerType('filterYear')}
            style={styles.topFilterControl}>
            <Text style={styles.topFilterLabel}>Year</Text>
            <View style={styles.topFilterValueRow}>
              <Text style={styles.topFilterValue}>{filterYear}</Text>
              <Ionicons color="#7f1d1d" name="chevron-down" size={16} />
            </View>
          </Pressable>
        </View>

        {isLoadingTargets ? (
          <View style={styles.loadingState}>
            <ActivityIndicator color="#dc2626" />
            <Text style={styles.loadingText}>Loading targets...</Text>
          </View>
        ) : filteredTargets.length ? (
          filteredTargets.map(target => (
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
              <View style={styles.targetSummaryRow}>
                <View style={styles.targetAmountPanel}>
                  <Text style={styles.targetSummaryLabel}>Target Amount</Text>
                  <Text style={styles.targetAmount}>
                    Rs. {target.amount.toLocaleString('en-IN')}
                  </Text>
                </View>
                <View style={styles.targetSetterPanel}>
                  <Text style={styles.targetSummaryLabel}>Set By</Text>
                  <Text style={styles.targetSetter}>
                    {target.setByName || (isAdmin ? 'Admin' : user.username)}
                  </Text>
                </View>
              </View>
              {isAdmin ? (
                <View style={styles.cardActions}>
                  <Pressable
                    onPress={() => openEditTargetModal(target)}
                    style={[styles.iconActionButton, styles.editActionButton]}>
                    <Ionicons color="#7f1d1d" name="pencil" size={15} />
                    <Text style={styles.editActionText}>Edit</Text>
                  </Pressable>
                  <Pressable
                    disabled={isDeletingTargetId === target.id}
                    onPress={() => handleDeleteTarget(target)}
                    style={[styles.iconActionButton, styles.deleteActionButton]}>
                    {isDeletingTargetId === target.id ? (
                      <ActivityIndicator color="#ffffff" size="small" />
                    ) : (
                      <>
                        <Ionicons color="#ffffff" name="trash-outline" size={15} />
                        <Text style={styles.deleteActionText}>Delete</Text>
                      </>
                    )}
                  </Pressable>
                </View>
              ) : null}
            </Pressable>
          ))
        ) : (
          <Text style={styles.emptyText}>No targets found for this month.</Text>
        )}
      </View>

      <Modal
        animationType="slide"
        onRequestClose={() => setIsModalVisible(false)}
        transparent
        visible={isModalVisible}>
        <Pressable
          onPress={() => {
            setIsModalVisible(false);
            resetFormState();
          }}
          style={styles.modalOverlay}>
          <Pressable onPress={() => {}} style={styles.modalCard}>
            <Text style={styles.sectionTitle}>
              {selectedTarget ? 'Edit Monthly Target' : 'Set Monthly Target'}
            </Text>
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
                    <Text style={styles.saveButtonText}>
                      {selectedTarget ? 'Edit Target' : 'Save Target'}
                    </Text>
                  )}
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

              {pickerType === 'filterMonth' || pickerType === 'month'
                ? monthLabels.map((label, index) => {
                    const optionMonth = index + 1;
                    const isSelected =
                      pickerType === 'filterMonth'
                        ? optionMonth === filterMonth
                        : optionMonth === month;

                    return (
                      <Pressable
                        key={label}
                        onPress={() => {
                          if (pickerType === 'filterMonth') {
                            setFilterMonth(optionMonth);
                          } else {
                            setMonth(optionMonth);
                          }
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

              {pickerType === 'filterYear' || pickerType === 'year'
                ? yearOptions.map(optionYear => {
                    const isSelected =
                      pickerType === 'filterYear'
                        ? optionYear === filterYear
                        : optionYear === year;

                    return (
                      <Pressable
                        key={optionYear}
                        onPress={() => {
                          if (pickerType === 'filterYear') {
                            setFilterYear(optionYear);
                          } else {
                            setYear(optionYear);
                          }
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

                <Pressable
                  onPress={() => {
                    setIsTargetDetailsVisible(false);
                    setSelectedTarget(null);
                  }}
                  style={styles.fullWidthButton}>
                  <Text style={styles.fullWidthButtonText}>Close</Text>
                </Pressable>
                {isAdmin ? (
                  <View style={styles.detailActions}>
                    <Pressable
                      onPress={() => openEditTargetModal(selectedTarget)}
                      style={[styles.iconActionButton, styles.editActionButton]}>
                      <Ionicons color="#7f1d1d" name="pencil" size={15} />
                      <Text style={styles.editActionText}>Edit</Text>
                    </Pressable>
                    <Pressable
                      disabled={isDeletingTargetId === selectedTarget.id}
                      onPress={() => handleDeleteTarget(selectedTarget)}
                      style={[styles.iconActionButton, styles.deleteActionButton]}>
                      {isDeletingTargetId === selectedTarget.id ? (
                        <ActivityIndicator color="#ffffff" size="small" />
                      ) : (
                        <>
                          <Ionicons color="#ffffff" name="trash-outline" size={15} />
                          <Text style={styles.deleteActionText}>Delete</Text>
                        </>
                      )}
                    </Pressable>
                  </View>
                ) : null}
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
  topFilterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 14,
  },
  topFilterControl: {
    backgroundColor: '#fff7f5',
    borderColor: '#fecaca',
    borderRadius: 14,
    borderWidth: 1,
    flex: 1,
    minWidth: 130,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  topFilterLabel: {
    color: '#9a3412',
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  topFilterValueRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  topFilterValue: {
    color: '#111827',
    fontSize: 14,
    fontWeight: '800',
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
    borderRadius: 22,
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
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
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
    backgroundColor: '#ffffff',
    borderColor: '#fecaca',
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: 12,
    overflow: 'hidden',
    padding: 0,
  },
  targetHeader: {
    alignItems: 'center',
    backgroundColor: '#fff7f5',
    borderBottomColor: '#fee2e2',
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 14,
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
  targetSummaryRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 14,
    paddingTop: 14,
  },
  targetAmountPanel: {
    backgroundColor: '#fff8f6',
    borderColor: '#fee2e2',
    borderRadius: 16,
    borderWidth: 1,
    flex: 1.2,
    padding: 12,
  },
  targetSetterPanel: {
    backgroundColor: '#f8fafc',
    borderColor: '#e2e8f0',
    borderRadius: 16,
    borderWidth: 1,
    flex: 0.8,
    padding: 12,
  },
  targetSummaryLabel: {
    color: '#6b7280',
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 5,
    textTransform: 'uppercase',
  },
  targetAmount: {
    color: '#111827',
    fontSize: 18,
    fontWeight: '800',
  },
  targetSetter: {
    color: '#111827',
    fontSize: 13,
    fontWeight: '700',
  },
  cardActions: {
    backgroundColor: '#fffafa',
    borderTopColor: '#fee2e2',
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
    marginTop: 14,
    padding: 12,
  },
  iconActionButton: {
    alignItems: 'center',
    borderRadius: 14,
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    minHeight: 42,
    paddingHorizontal: 12,
  },
  editActionButton: {
    backgroundColor: '#fff1ee',
    borderColor: '#fecaca',
    borderWidth: 1,
  },
  deleteActionButton: {
    backgroundColor: '#dc2626',
  },
  editActionText: {
    color: '#7f1d1d',
    fontSize: 13,
    fontWeight: '700',
    marginLeft: 6,
  },
  deleteActionText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
    marginLeft: 6,
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
  fullWidthButton: {
    alignItems: 'center',
    backgroundColor: '#111827',
    borderRadius: 16,
    justifyContent: 'center',
    minHeight: 48,
  },
  fullWidthButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  detailActions: {
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'flex-end',
    marginTop: 12,
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
