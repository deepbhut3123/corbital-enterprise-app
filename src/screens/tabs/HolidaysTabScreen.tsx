import Ionicons from '@expo/vector-icons/Ionicons';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import type { HolidayInput, HolidayRecord } from '../../services/holidays';

type HolidaysTabScreenProps = {
  form: HolidayInput;
  holidays: HolidayRecord[];
  holidaysError: string;
  isDeletingHolidayId: string | null;
  isLoadingHolidays: boolean;
  isSavingHoliday: boolean;
  onDeleteHoliday: (holiday: HolidayRecord) => void;
  onSaveHoliday: () => void;
  onUpdateForm: (key: keyof HolidayInput, value: string) => void;
};

const formatDateLabel = (dateValue: string) => {
  const date = new Date(`${dateValue}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return dateValue;
  }

  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    weekday: 'short',
    year: 'numeric',
  });
};

const formatDateValue = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
};

const getInitialPickerDate = (dateValue: string) => {
  const parsedDate = dateValue ? new Date(`${dateValue}T00:00:00`) : new Date();

  if (Number.isNaN(parsedDate.getTime())) {
    return new Date();
  }

  return parsedDate;
};

const weekDayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function HolidaysTabScreen({
  form,
  holidays,
  holidaysError,
  isDeletingHolidayId,
  isLoadingHolidays,
  isSavingHoliday,
  onDeleteHoliday,
  onSaveHoliday,
  onUpdateForm,
}: HolidaysTabScreenProps) {
  const [isDatePickerVisible, setIsDatePickerVisible] = useState(false);
  const [pickerMonthDate, setPickerMonthDate] = useState(() =>
    getInitialPickerDate(form.holidayDate),
  );
  const calendarDays = useMemo(() => {
    const year = pickerMonthDate.getFullYear();
    const month = pickerMonthDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const leadingBlankDays = firstDay.getDay();

    return [
      ...Array.from({ length: leadingBlankDays }, () => null),
      ...Array.from({ length: daysInMonth }, (_, index) => new Date(year, month, index + 1)),
    ];
  }, [pickerMonthDate]);
  const pickerMonthLabel = pickerMonthDate.toLocaleDateString('en-IN', {
    month: 'long',
    year: 'numeric',
  });

  const openDatePicker = () => {
    setPickerMonthDate(getInitialPickerDate(form.holidayDate));
    setIsDatePickerVisible(true);
  };

  const movePickerMonth = (direction: -1 | 1) => {
    setPickerMonthDate(
      current => new Date(current.getFullYear(), current.getMonth() + direction, 1),
    );
  };

  return (
    <View style={styles.panel}>
      <View style={styles.header}>
        <View style={styles.headerIcon}>
          <Ionicons color="#ffffff" name="calendar-number-outline" size={20} />
        </View>
        <View style={styles.headerTextWrap}>
          <Text style={styles.title}>Holiday Setup</Text>
          <Text style={styles.caption}>Cron marks attendance only for dates saved here.</Text>
        </View>
      </View>

      <View style={styles.formCard}>
        <Pressable onPress={openDatePicker} style={styles.dateSelectButton}>
          <View>
            <Text style={styles.dateSelectLabel}>Holiday Date</Text>
            <Text style={styles.dateSelectValue}>
              {form.holidayDate ? formatDateLabel(form.holidayDate) : 'Select date'}
            </Text>
          </View>
          <Ionicons color="#7f1d1d" name="calendar-outline" size={20} />
        </Pressable>
        <TextInput
          onChangeText={value => onUpdateForm('name', value)}
          placeholder="Holiday name"
          placeholderTextColor="#94a3b8"
          style={styles.input}
          value={form.name}
        />
        <Pressable
          disabled={isSavingHoliday}
          onPress={onSaveHoliday}
          style={[styles.saveButton, isSavingHoliday && styles.disabledButton]}>
          {isSavingHoliday ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <>
              <Ionicons color="#ffffff" name="save-outline" size={17} />
              <Text style={styles.saveButtonText}>Save Holiday</Text>
            </>
          )}
        </Pressable>
      </View>

      <Modal
        animationType="fade"
        onRequestClose={() => setIsDatePickerVisible(false)}
        transparent
        visible={isDatePickerVisible}>
        <Pressable
          onPress={() => setIsDatePickerVisible(false)}
          style={styles.modalOverlay}>
          <Pressable onPress={() => {}} style={styles.calendarCard}>
            <View style={styles.calendarHeader}>
              <Pressable
                hitSlop={10}
                onPress={() => movePickerMonth(-1)}
                style={styles.calendarNavButton}>
                <Ionicons color="#7f1d1d" name="chevron-back" size={20} />
              </Pressable>
              <Text style={styles.calendarTitle}>{pickerMonthLabel}</Text>
              <Pressable
                hitSlop={10}
                onPress={() => movePickerMonth(1)}
                style={styles.calendarNavButton}>
                <Ionicons color="#7f1d1d" name="chevron-forward" size={20} />
              </Pressable>
            </View>

            <View style={styles.weekDayRow}>
              {weekDayLabels.map(label => (
                <Text key={label} style={styles.weekDayText}>
                  {label}
                </Text>
              ))}
            </View>

            <View style={styles.calendarGrid}>
              {calendarDays.map((calendarDate, index) => {
                if (!calendarDate) {
                  return <View key={`blank-${index}`} style={styles.calendarDayBlank} />;
                }

                const dateValue = formatDateValue(calendarDate);
                const isSelected = form.holidayDate === dateValue;

                return (
                  <Pressable
                    key={dateValue}
                    onPress={() => {
                      onUpdateForm('holidayDate', dateValue);
                      setIsDatePickerVisible(false);
                    }}
                    style={[
                      styles.calendarDayButton,
                      isSelected && styles.calendarDayButtonActive,
                    ]}>
                    <Text
                      style={[
                        styles.calendarDayText,
                        isSelected && styles.calendarDayTextActive,
                      ]}>
                      {calendarDate.getDate()}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {holidaysError ? <Text style={styles.errorText}>{holidaysError}</Text> : null}

      <View style={styles.listHeader}>
        <Text style={styles.listTitle}>Saved Holidays</Text>
        <Text style={styles.listCount}>{holidays.length}</Text>
      </View>

      {isLoadingHolidays ? (
        <View style={styles.loadingState}>
          <ActivityIndicator color="#dc2626" />
          <Text style={styles.loadingText}>Loading holidays...</Text>
        </View>
      ) : holidays.length ? (
        holidays.map(holiday => (
          <View key={holiday.id} style={styles.holidayCard}>
            <View style={styles.holidayInfo}>
              <Text style={styles.holidayName}>{holiday.name}</Text>
              <Text style={styles.holidayDate}>{formatDateLabel(holiday.holidayDate)}</Text>
            </View>
            <Pressable
              disabled={isDeletingHolidayId === holiday.id}
              onPress={() => onDeleteHoliday(holiday)}
              style={[styles.deleteButton, isDeletingHolidayId === holiday.id && styles.disabledButton]}>
              {isDeletingHolidayId === holiday.id ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <Ionicons color="#ffffff" name="trash-outline" size={17} />
              )}
            </Pressable>
          </View>
        ))
      ) : (
        <Text style={styles.emptyText}>No holidays saved yet.</Text>
      )}
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
    backgroundColor: '#dc2626',
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
  formCard: {
    backgroundColor: '#fff7f5',
    borderColor: '#fee2e2',
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: 16,
    padding: 12,
  },
  input: {
    backgroundColor: '#ffffff',
    borderColor: '#fca5a5',
    borderRadius: 14,
    borderWidth: 1,
    color: '#111827',
    fontSize: 15,
    marginBottom: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  dateSelectButton: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderColor: '#fca5a5',
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  dateSelectLabel: {
    color: '#7f1d1d',
    fontSize: 11,
    fontWeight: '800',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  dateSelectValue: {
    color: '#111827',
    fontSize: 15,
    fontWeight: '700',
  },
  saveButton: {
    alignItems: 'center',
    backgroundColor: '#dc2626',
    borderRadius: 14,
    flexDirection: 'row',
    height: 46,
    justifyContent: 'center',
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
    marginLeft: 8,
  },
  disabledButton: {
    backgroundColor: '#fca5a5',
  },
  errorText: {
    color: '#b91c1c',
    fontSize: 14,
    marginBottom: 12,
  },
  listHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  listTitle: {
    color: '#111827',
    fontSize: 16,
    fontWeight: '700',
  },
  listCount: {
    color: '#7f1d1d',
    fontSize: 13,
    fontWeight: '700',
  },
  loadingState: {
    alignItems: 'center',
    paddingVertical: 28,
  },
  loadingText: {
    color: '#6b7280',
    marginTop: 10,
  },
  holidayCard: {
    alignItems: 'center',
    backgroundColor: '#fffdfc',
    borderColor: '#fecaca',
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    marginBottom: 10,
    padding: 12,
  },
  holidayInfo: {
    flex: 1,
    paddingRight: 10,
  },
  holidayName: {
    color: '#111827',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 3,
  },
  holidayDate: {
    color: '#6b7280',
    fontSize: 13,
  },
  deleteButton: {
    alignItems: 'center',
    backgroundColor: '#dc2626',
    borderRadius: 14,
    height: 40,
    justifyContent: 'center',
    width: 44,
  },
  emptyText: {
    color: '#6b7280',
    fontSize: 15,
  },
  modalOverlay: {
    alignItems: 'center',
    backgroundColor: 'rgba(17, 24, 39, 0.45)',
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  calendarCard: {
    backgroundColor: '#ffffff',
    borderRadius: 22,
    padding: 18,
    width: '100%',
  },
  calendarHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  calendarNavButton: {
    alignItems: 'center',
    backgroundColor: '#fff1ee',
    borderRadius: 14,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  calendarTitle: {
    color: '#111827',
    fontSize: 18,
    fontWeight: '800',
  },
  weekDayRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  weekDayText: {
    color: '#7f1d1d',
    flex: 1,
    fontSize: 11,
    fontWeight: '800',
    textAlign: 'center',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  calendarDayBlank: {
    aspectRatio: 1,
    width: '14.2857%',
  },
  calendarDayButton: {
    alignItems: 'center',
    aspectRatio: 1,
    borderRadius: 12,
    justifyContent: 'center',
    width: '14.2857%',
  },
  calendarDayButtonActive: {
    backgroundColor: '#dc2626',
  },
  calendarDayText: {
    color: '#111827',
    fontSize: 14,
    fontWeight: '700',
  },
  calendarDayTextActive: {
    color: '#ffffff',
  },
});
