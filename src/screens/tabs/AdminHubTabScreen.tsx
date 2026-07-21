import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { LoggedInUser, UserRecord } from '../../services/auth';
import type { HolidayInput, HolidayRecord } from '../../services/holidays';
import type { CreateUserInput } from '../../services/users';
import HolidaysTabScreen from './HolidaysTabScreen';
import ProfileTabScreen from './ProfileTabScreen';
import ReportsTabScreen from './ReportsTabScreen';
import UsersTabScreen from './UsersTabScreen';

type RoleOption = {
  label: string;
  value: string;
};

type AdminHubTabScreenProps = {
  activeSection: 'holidays' | 'profile' | 'reports' | 'users';
  adminCount: number;
  form: CreateUserInput;
  holidayForm: HolidayInput;
  holidays: HolidayRecord[];
  holidaysError: string;
  isCreatingUser: boolean;
  isDeletingUserId: string | null;
  isDeletingHolidayId: string | null;
  isLoadingHolidays: boolean;
  isLoadingUsers: boolean;
  isModalVisible: boolean;
  isSavingHoliday: boolean;
  isUpdatingUser: boolean;
  modalError: string;
  onChangeSection: (section: 'holidays' | 'profile' | 'reports' | 'users') => void;
  onCloseModal: () => void;
  onDeleteHoliday: (holiday: HolidayRecord) => void;
  onDeleteUser: (user: UserRecord) => void;
  onEditUser: (user: UserRecord) => void;
  onLogout: () => void;
  onOpenModal: () => void;
  onResetForm: () => void;
  onSaveHoliday: () => void;
  onUpdateHolidayForm: (key: keyof HolidayInput, value: string) => void;
  onSaveUser: () => void;
  onUpdateForm: (key: keyof CreateUserInput, value: string) => void;
  roleOptions: RoleOption[];
  selectedUser: UserRecord | null;
  summaryCards: Array<{
    label: string;
    value: string;
  }>;
  token: string;
  user: LoggedInUser;
  users: UserRecord[];
  usersError: string;
};

export default function AdminHubTabScreen({
  activeSection,
  adminCount,
  form,
  holidayForm,
  holidays,
  holidaysError,
  isCreatingUser,
  isDeletingUserId,
  isDeletingHolidayId,
  isLoadingHolidays,
  isLoadingUsers,
  isModalVisible,
  isSavingHoliday,
  isUpdatingUser,
  modalError,
  onChangeSection,
  onCloseModal,
  onDeleteHoliday,
  onDeleteUser,
  onEditUser,
  onLogout,
  onOpenModal,
  onResetForm,
  onSaveHoliday,
  onUpdateHolidayForm,
  onSaveUser,
  onUpdateForm,
  roleOptions,
  selectedUser,
  summaryCards,
  token,
  user,
  users,
  usersError,
}: AdminHubTabScreenProps) {
  return (
    <>
      <View style={styles.sectionTabs}>
        <Pressable
          onPress={() => onChangeSection('profile')}
          style={[
            styles.sectionTabButton,
            activeSection === 'profile' && styles.sectionTabButtonActive,
          ]}>
          <Text
            style={[
              styles.sectionTabText,
              activeSection === 'profile' && styles.sectionTabTextActive,
            ]}>
            Profile
          </Text>
        </Pressable>
        <Pressable
          onPress={() => onChangeSection('users')}
          style={[
            styles.sectionTabButton,
            activeSection === 'users' && styles.sectionTabButtonActive,
          ]}>
          <Text
            style={[
              styles.sectionTabText,
              activeSection === 'users' && styles.sectionTabTextActive,
            ]}>
            Users
          </Text>
        </Pressable>
        <Pressable
          onPress={() => onChangeSection('holidays')}
          style={[
            styles.sectionTabButton,
            activeSection === 'holidays' && styles.sectionTabButtonActive,
          ]}>
          <Text
            style={[
              styles.sectionTabText,
              activeSection === 'holidays' && styles.sectionTabTextActive,
            ]}>
            Holidays
          </Text>
        </Pressable>
        <Pressable
          onPress={() => onChangeSection('reports')}
          style={[
            styles.sectionTabButton,
            activeSection === 'reports' && styles.sectionTabButtonActive,
          ]}>
          <Text
            style={[
              styles.sectionTabText,
              activeSection === 'reports' && styles.sectionTabTextActive,
            ]}>
            Reports
          </Text>
        </Pressable>
      </View>

      {activeSection === 'profile' ? (
        <ProfileTabScreen
          isAdmin
          onLogout={onLogout}
          summaryCards={summaryCards}
          user={user}
        />
      ) : activeSection === 'holidays' ? (
        <HolidaysTabScreen
          form={holidayForm}
          holidays={holidays}
          holidaysError={holidaysError}
          isDeletingHolidayId={isDeletingHolidayId}
          isLoadingHolidays={isLoadingHolidays}
          isSavingHoliday={isSavingHoliday}
          onDeleteHoliday={onDeleteHoliday}
          onSaveHoliday={onSaveHoliday}
          onUpdateForm={onUpdateHolidayForm}
        />
      ) : activeSection === 'reports' ? (
        <ReportsTabScreen token={token} users={users} />
      ) : (
        <UsersTabScreen
          adminCount={adminCount}
          form={form}
          isCreatingUser={isCreatingUser}
          isDeletingUserId={isDeletingUserId}
          isLoadingUsers={isLoadingUsers}
          isModalVisible={isModalVisible}
          isUpdatingUser={isUpdatingUser}
          modalError={modalError}
          onCloseModal={onCloseModal}
          onDeleteUser={onDeleteUser}
          onEditUser={onEditUser}
          onOpenModal={onOpenModal}
          onResetForm={onResetForm}
          onSaveUser={onSaveUser}
          onUpdateForm={onUpdateForm}
          roleOptions={roleOptions}
          selectedUser={selectedUser}
          users={users}
          usersError={usersError}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  sectionTabs: {
    backgroundColor: '#ffffff',
    borderColor: '#fecaca',
    borderRadius: 22,
    borderWidth: 1,
    flexDirection: 'row',
    marginBottom: 16,
    padding: 6,
  },
  sectionTabButton: {
    alignItems: 'center',
    borderRadius: 16,
    flex: 1,
    paddingVertical: 11,
  },
  sectionTabButtonActive: {
    backgroundColor: '#dc2626',
  },
  sectionTabText: {
    color: '#7f1d1d',
    fontSize: 14,
    fontWeight: '700',
  },
  sectionTabTextActive: {
    color: '#ffffff',
  },
});
