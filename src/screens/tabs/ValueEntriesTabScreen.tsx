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
  createValueEntry,
  deleteValueEntry,
  fetchValueEntries,
  type ValueEntryRecord,
  updateValueEntry,
} from '../../services/valueEntries';

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

type PickerType = 'day' | 'filterMonth' | 'filterYear' | 'month' | 'user' | 'year' | null;

type ValueEntriesTabScreenProps = {
  isAdmin: boolean;
  refreshSignal: number;
  token: string;
  user: LoggedInUser;
  users: UserRecord[];
};

const getInitialDateParts = () => {
  const now = new Date();

  return {
    day: now.getDate(),
    month: now.getMonth() + 1,
    year: now.getFullYear(),
  };
};

const formatEntryDate = (entryDate: string) => {
  const date = new Date(`${entryDate}T00:00:00`);

  return `${date.getDate()} ${monthLabels[date.getMonth()]} ${date.getFullYear()}`;
};

export default function ValueEntriesTabScreen({
  isAdmin,
  refreshSignal,
  token,
  user,
  users,
}: ValueEntriesTabScreenProps) {
  const initialDate = useMemo(() => getInitialDateParts(), []);
  const [day, setDay] = useState(initialDate.day);
  const [detailEntry, setDetailEntry] = useState<ValueEntryRecord | null>(null);
  const [entries, setEntries] = useState<ValueEntryRecord[]>([]);
  const [entriesError, setEntriesError] = useState('');
  const [isLoadingEntries, setIsLoadingEntries] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isDeletingEntryId, setIsDeletingEntryId] = useState<string | null>(null);
  const [isSavingEntry, setIsSavingEntry] = useState(false);
  const [filterMonth, setFilterMonth] = useState(initialDate.month);
  const [filterYear, setFilterYear] = useState(initialDate.year);
  const [month, setMonth] = useState(initialDate.month);
  const [pickerType, setPickerType] = useState<PickerType>(null);
  const [purchaseAmount, setPurchaseAmount] = useState('');
  const [selectedUserId, setSelectedUserId] = useState('');
  const [sellAmount, setSellAmount] = useState('');
  const [selectedEntry, setSelectedEntry] = useState<ValueEntryRecord | null>(null);
  const [year, setYear] = useState(initialDate.year);

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
  const yearOptions = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 7 }, (_, index) => currentYear - 3 + index);
  }, []);
  const dayOptions = useMemo(
    () =>
      Array.from(
        {
          length: new Date(year, month, 0).getDate(),
        },
        (_, index) => index + 1,
      ),
    [month, year],
  );
  const filteredEntries = useMemo(
    () =>
      entries.filter(entry => {
        const entryDate = new Date(`${entry.entryDate}T00:00:00`);

        return (
          entryDate.getMonth() + 1 === filterMonth &&
          entryDate.getFullYear() === filterYear
        );
      }),
    [entries, filterMonth, filterYear],
  );

  const loadEntries = useCallback(async () => {
    try {
      setIsLoadingEntries(true);
      setEntriesError('');
      const data = await fetchValueEntries(token);
      setEntries(data);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unable to load value entries.';
      setEntriesError(message);
    } finally {
      setIsLoadingEntries(false);
    }
  }, [token]);

  useEffect(() => {
    loadEntries().catch(() => {
      // loadEntries already stores a user-facing error message in state.
    });
  }, [loadEntries, refreshSignal]);

  useEffect(() => {
    if (!isAdmin) {
      return;
    }

    if (!selectedUserId && userOptions.length) {
      setSelectedUserId(userOptions[0].id);
    }
  }, [isAdmin, selectedUserId, userOptions]);

  useEffect(() => {
    if (dayOptions.includes(day)) {
      return;
    }

    setDay(dayOptions[dayOptions.length - 1] || 1);
  }, [day, dayOptions]);

  const resetFormState = () => {
    setDay(initialDate.day);
    setMonth(initialDate.month);
    setYear(initialDate.year);
    setPickerType(null);
    setPurchaseAmount('');
    setSellAmount('');
    setSelectedEntry(null);
    setEntriesError('');

    if (!isAdmin) {
      setSelectedUserId('');
    }
  };

  const openEntryModal = () => {
    resetFormState();
    setIsModalVisible(true);
  };

  const openEditEntryModal = (entry: ValueEntryRecord) => {
    const entryDate = new Date(`${entry.entryDate}T00:00:00`);

    setSelectedEntry(entry);
    setDay(entryDate.getDate());
    setMonth(entryDate.getMonth() + 1);
    setYear(entryDate.getFullYear());
    setSelectedUserId(isAdmin ? entry.userId : '');
    setPurchaseAmount(String(entry.purchaseAmount));
    setSellAmount(String(entry.sellAmount));
    setEntriesError('');
    setPickerType(null);
    setIsModalVisible(true);
  };

  const handleSaveEntry = async () => {
    if (isAdmin && !selectedUserId) {
      setEntriesError('Please select a user.');
      return;
    }

    if (!purchaseAmount.trim() || !sellAmount.trim()) {
      setEntriesError('Purchase amount and sell amount are required.');
      return;
    }

    try {
      setIsSavingEntry(true);
      setEntriesError('');

      const entryInput = {
        entryDate: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
        purchaseAmount,
        sellAmount,
        userId: isAdmin ? selectedUserId : undefined,
      };
      const savedEntry = selectedEntry
        ? await updateValueEntry(selectedEntry.id, entryInput, token)
        : await createValueEntry(entryInput, token);

      setEntries(current =>
        selectedEntry
          ? current.map(entry => (entry.id === savedEntry.id ? savedEntry : entry))
          : [savedEntry, ...current],
      );
      setDetailEntry(current =>
        current?.id === savedEntry.id ? savedEntry : current,
      );
      setIsModalVisible(false);
      resetFormState();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unable to save value entry.';
      setEntriesError(message);
    } finally {
      setIsSavingEntry(false);
    }
  };

  const handleDeleteEntry = (entry: ValueEntryRecord) => {
    Alert.alert(
      'Delete Entry',
      'Are you sure you want to delete this value entry?',
      [
        { style: 'cancel', text: 'Cancel' },
        {
          style: 'destructive',
          text: 'Delete',
          onPress: () => {
            setIsDeletingEntryId(entry.id);
            setEntriesError('');
            deleteValueEntry(entry.id, token)
              .then(() => {
                setEntries(current =>
                  current.filter(listEntry => listEntry.id !== entry.id),
                );
                setDetailEntry(current => (current?.id === entry.id ? null : current));
              })
              .catch(error => {
                const message =
                  error instanceof Error
                    ? error.message
                    : 'Unable to delete value entry.';
                setEntriesError(message);
              })
              .finally(() => {
                setIsDeletingEntryId(null);
              });
          },
        },
      ],
    );
  };

  const pickerTitle =
    pickerType === 'user'
      ? 'Select User'
      : pickerType === 'day'
        ? 'Select Day'
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
            <Text style={styles.sectionTitle}>
              {isAdmin ? 'Profit Entries' : 'My Entries'}
            </Text>
            <Text style={styles.sectionCaption}>
              {isAdmin
                ? 'Review team entries and check profit for each saved record.'
                : 'Add your purchase and sell amounts and keep your daily entries updated.'}
            </Text>
          </View>
          <Pressable onPress={openEntryModal} style={styles.openModalButton}>
            <Ionicons color="#ffffff" name="add" size={18} />
            <Text style={styles.openModalButtonText}>Add Entry</Text>
          </Pressable>
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

        {isLoadingEntries ? (
          <View style={styles.loadingState}>
            <ActivityIndicator color="#dc2626" />
            <Text style={styles.loadingText}>Loading entries...</Text>
          </View>
        ) : entriesError ? (
          <Text style={styles.errorText}>{entriesError}</Text>
        ) : filteredEntries.length ? (
          filteredEntries.map(entry => (
            <Pressable
              key={entry.id}
              disabled={!isAdmin}
              onPress={() => {
                if (isAdmin) {
                  setDetailEntry(entry);
                }
              }}
              style={styles.entryCard}>
              <View style={styles.entryHeader}>
                <View style={styles.entryHeaderContent}>
                  <Text style={styles.entryDate}>{formatEntryDate(entry.entryDate)}</Text>
                  <Text style={styles.entrySubLabel}>
                    {isAdmin ? entry.username : `${user.username} • ${user.email}`}
                  </Text>
                </View>
                {isAdmin ? (
                  <View
                    style={[
                      styles.profitBadge,
                      entry.netProfit >= 0
                        ? styles.profitBadgePositive
                        : styles.profitBadgeNegative,
                    ]}>
                    <Text
                      style={[
                        styles.profitBadgeText,
                        entry.netProfit >= 0
                          ? styles.profitBadgeTextPositive
                          : styles.profitBadgeTextNegative,
                      ]}>
                      Rs. {entry.netProfit.toLocaleString('en-IN')}
                    </Text>
                  </View>
                ) : null}
              </View>

              <View style={styles.amountRow}>
                <View style={styles.amountBox}>
                  <Text style={styles.amountLabel}>Purchase</Text>
                  <Text style={styles.amountValue}>
                    Rs. {entry.purchaseAmount.toLocaleString('en-IN')}
                  </Text>
                </View>
                <View style={[styles.amountBox, styles.sellAmountBox]}>
                  <Text style={styles.amountLabel}>Sell</Text>
                  <Text style={styles.amountValue}>
                    Rs. {entry.sellAmount.toLocaleString('en-IN')}
                  </Text>
                </View>
              </View>
              <View style={styles.cardActions}>
                <Pressable
                  onPress={() => openEditEntryModal(entry)}
                  style={[styles.iconActionButton, styles.editActionButton]}>
                  <Ionicons color="#7f1d1d" name="pencil" size={15} />
                  <Text style={styles.editActionText}>Edit</Text>
                </Pressable>
                <Pressable
                  disabled={isDeletingEntryId === entry.id}
                  onPress={() => handleDeleteEntry(entry)}
                  style={[styles.iconActionButton, styles.deleteActionButton]}>
                  {isDeletingEntryId === entry.id ? (
                    <ActivityIndicator color="#ffffff" size="small" />
                  ) : (
                    <>
                      <Ionicons color="#ffffff" name="trash-outline" size={15} />
                      <Text style={styles.deleteActionText}>Delete</Text>
                    </>
                  )}
                </Pressable>
              </View>
            </Pressable>
          ))
        ) : (
          <Text style={styles.emptyText}>No entries found for this month.</Text>
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
          <Pressable onPress={() => undefined} style={styles.modalCard}>
            <Text style={styles.sectionTitle}>
              {selectedEntry
                ? 'Edit Value Entry'
                : isAdmin
                  ? 'Add Profit Entry'
                  : 'Add My Entry'}
            </Text>
            <Text style={styles.sectionCaption}>
              {isAdmin
                ? 'Select a user, set the date, and save purchase and sell values.'
                : 'Select the date and save your purchase and sell values.'}
            </Text>

            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.modalScrollContent}>
              {isAdmin ? (
                <>
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
                </>
              ) : null}

              <Text style={[styles.fieldLabel, styles.fieldLabelDate]}>Date</Text>
              <View style={styles.filterRow}>
                <View style={styles.filterControl}>
                  <Text style={styles.fieldLabelInline}>Day</Text>
                  <Pressable
                    onPress={() => setPickerType('day')}
                    style={styles.selectField}>
                    <Text style={styles.selectFieldValue}>{day}</Text>
                    <Ionicons color="#7f1d1d" name="chevron-down" size={18} />
                  </Pressable>
                </View>

                <View style={styles.filterControl}>
                  <Text style={styles.fieldLabelInline}>Month</Text>
                  <Pressable
                    onPress={() => setPickerType('month')}
                    style={styles.selectField}>
                    <Text style={styles.selectFieldValue}>{monthLabels[month - 1]}</Text>
                    <Ionicons color="#7f1d1d" name="chevron-down" size={18} />
                  </Pressable>
                </View>

                <View style={styles.filterControl}>
                  <Text style={styles.fieldLabelInline}>Year</Text>
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
                onChangeText={setPurchaseAmount}
                placeholder="Purchase Amount"
                placeholderTextColor="#94a3b8"
                style={styles.amountInput}
                value={purchaseAmount}
              />

              <TextInput
                keyboardType="numeric"
                onChangeText={setSellAmount}
                placeholder="Sell Amount"
                placeholderTextColor="#94a3b8"
                style={styles.amountInput}
                value={sellAmount}
              />

              {entriesError ? <Text style={styles.errorText}>{entriesError}</Text> : null}

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
                  disabled={isSavingEntry}
                  onPress={handleSaveEntry}
                  style={styles.saveButton}>
                  {isSavingEntry ? (
                    <ActivityIndicator color="#ffffff" />
                  ) : (
                    <Text style={styles.saveButtonText}>
                      {selectedEntry ? 'Edit Entry' : 'Save Entry'}
                    </Text>
                  )}
                </Pressable>
              </View>
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        animationType="slide"
        onRequestClose={() => setDetailEntry(null)}
        transparent
        visible={isAdmin && detailEntry !== null}>
        <Pressable onPress={() => setDetailEntry(null)} style={styles.modalOverlay}>
          <Pressable onPress={() => undefined} style={styles.modalCard}>
            <Text style={styles.sectionTitle}>Entry Details</Text>
            <Text style={styles.sectionCaption}>
              Complete details for the selected value entry.
            </Text>

            {detailEntry ? (
              <View style={styles.detailCard}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Date</Text>
                  <Text style={styles.detailValue}>
                    {formatEntryDate(detailEntry.entryDate)}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Purchase Amount</Text>
                  <Text style={styles.detailValue}>
                    Rs. {detailEntry.purchaseAmount.toLocaleString('en-IN')}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Sell Amount</Text>
                  <Text style={styles.detailValue}>
                    Rs. {detailEntry.sellAmount.toLocaleString('en-IN')}
                  </Text>
                </View>
                {isAdmin ? (
                  <>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Net Profit</Text>
                      <Text
                        style={[
                          styles.detailValue,
                          detailEntry.netProfit >= 0
                            ? styles.positiveValue
                            : styles.negativeValue,
                        ]}>
                        Rs. {detailEntry.netProfit.toLocaleString('en-IN')}
                      </Text>
                    </View>
                    <View style={[styles.detailRow, styles.detailRowLast]}>
                      <Text style={styles.detailLabel}>Added By</Text>
                      <Text style={styles.detailValue}>
                        {detailEntry.createdByName || detailEntry.username}
                      </Text>
                    </View>
                  </>
                ) : null}
              </View>
            ) : null}

            <Pressable onPress={() => setDetailEntry(null)} style={styles.fullWidthButton}>
              <Text style={styles.fullWidthButtonText}>Close</Text>
            </Pressable>
            {detailEntry ? (
              <View style={styles.detailActions}>
                <Pressable
                  onPress={() => openEditEntryModal(detailEntry)}
                  style={[styles.iconActionButton, styles.editActionButton]}>
                  <Ionicons color="#7f1d1d" name="pencil" size={15} />
                  <Text style={styles.editActionText}>Edit</Text>
                </Pressable>
                <Pressable
                  disabled={isDeletingEntryId === detailEntry.id}
                  onPress={() => handleDeleteEntry(detailEntry)}
                  style={[styles.iconActionButton, styles.deleteActionButton]}>
                  {isDeletingEntryId === detailEntry.id ? (
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

              {pickerType === 'day'
                ? dayOptions.map(optionDay => {
                    const isSelected = optionDay === day;

                    return (
                      <Pressable
                        key={optionDay}
                        onPress={() => {
                          setDay(optionDay);
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
                          {optionDay}
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
  listCard: {
    backgroundColor: '#ffffff',
    borderColor: '#fecaca',
    borderRadius: 22,
    borderWidth: 1,
    marginBottom: 20,
    padding: 20,
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
  loadingState: {
    alignItems: 'center',
    paddingVertical: 28,
  },
  loadingText: {
    color: '#6b7280',
    marginTop: 10,
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
  entryCard: {
    backgroundColor: '#ffffff',
    borderColor: '#fecaca',
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: 12,
    overflow: 'hidden',
    padding: 0,
  },
  entryHeader: {
    alignItems: 'center',
    backgroundColor: '#fff7f5',
    borderBottomColor: '#fee2e2',
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  entryHeaderContent: {
    flex: 1,
    paddingRight: 12,
  },
  entryDate: {
    color: '#111827',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  entrySubLabel: {
    color: '#6b7280',
    fontSize: 12,
  },
  profitBadge: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  profitBadgePositive: {
    backgroundColor: '#ecfdf3',
  },
  profitBadgeNegative: {
    backgroundColor: '#fff1f2',
  },
  profitBadgeText: {
    fontSize: 12,
    fontWeight: '800',
  },
  profitBadgeTextPositive: {
    color: '#15803d',
  },
  profitBadgeTextNegative: {
    color: '#be123c',
  },
  entryMeta: {
    color: '#7f1d1d',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 12,
    textTransform: 'uppercase',
  },
  amountRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 14,
    paddingTop: 14,
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
  amountBox: {
    backgroundColor: '#fff8f6',
    borderColor: '#fee2e2',
    borderRadius: 16,
    borderWidth: 1,
    flex: 1,
    padding: 12,
  },
  sellAmountBox: {
    backgroundColor: '#f8fafc',
    borderColor: '#e2e8f0',
  },
  amountLabel: {
    color: '#6b7280',
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  amountValue: {
    color: '#111827',
    fontSize: 15,
    fontWeight: '700',
  },
  modalOverlay: {
    backgroundColor: 'rgba(17, 24, 39, 0.45)',
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    maxHeight: '86%',
    paddingBottom: 16,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  modalScrollContent: {
    paddingBottom: 10,
  },
  fieldLabel: {
    color: '#6b7280',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 8,
    marginLeft: 2,
    textTransform: 'uppercase',
  },
  fieldLabelDate: {
    marginTop: 14,
  },
  fieldLabelInline: {
    color: '#6b7280',
    fontSize: 11,
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
  filterRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  filterControl: {
    flex: 1,
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
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 6,
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
    minWidth: 126,
    paddingHorizontal: 18,
    paddingVertical: 13,
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  detailCard: {
    backgroundColor: '#fff7f5',
    borderColor: '#fee2e2',
    borderRadius: 22,
    borderWidth: 1,
    marginBottom: 16,
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  detailRow: {
    borderBottomColor: '#fee2e2',
    borderBottomWidth: 1,
    paddingVertical: 12,
  },
  detailRowLast: {
    borderBottomWidth: 0,
  },
  detailLabel: {
    color: '#6b7280',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  detailValue: {
    color: '#111827',
    fontSize: 16,
    fontWeight: '700',
  },
  positiveValue: {
    color: '#15803d',
  },
  negativeValue: {
    color: '#be123c',
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
    paddingBottom: 12,
    paddingHorizontal: 18,
    paddingTop: 16,
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
});
