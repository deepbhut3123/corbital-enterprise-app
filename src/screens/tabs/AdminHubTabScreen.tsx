import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { LoggedInUser, UserRecord } from '../../services/auth';
import type { CreateUserInput } from '../../services/users';
import ProfileTabScreen from './ProfileTabScreen';
import UsersTabScreen from './UsersTabScreen';

type RoleOption = {
  label: string;
  value: string;
};

type AdminHubTabScreenProps = {
  activeSection: 'profile' | 'users';
  adminCount: number;
  form: CreateUserInput;
  isCreatingUser: boolean;
  isDeletingUserId: string | null;
  isLoadingUsers: boolean;
  isModalVisible: boolean;
  isUpdatingUser: boolean;
  modalError: string;
  onChangeSection: (section: 'profile' | 'users') => void;
  onCloseModal: () => void;
  onDeleteUser: (user: UserRecord) => void;
  onEditUser: (user: UserRecord) => void;
  onLogout: () => void;
  onOpenModal: () => void;
  onResetForm: () => void;
  onSaveUser: () => void;
  onUpdateForm: (key: keyof CreateUserInput, value: string) => void;
  roleOptions: RoleOption[];
  selectedUser: UserRecord | null;
  summaryCards: Array<{
    label: string;
    value: string;
  }>;
  user: LoggedInUser;
  users: UserRecord[];
  usersError: string;
};

export default function AdminHubTabScreen({
  activeSection,
  adminCount,
  form,
  isCreatingUser,
  isDeletingUserId,
  isLoadingUsers,
  isModalVisible,
  isUpdatingUser,
  modalError,
  onChangeSection,
  onCloseModal,
  onDeleteUser,
  onEditUser,
  onLogout,
  onOpenModal,
  onResetForm,
  onSaveUser,
  onUpdateForm,
  roleOptions,
  selectedUser,
  summaryCards,
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
      </View>

      {activeSection === 'profile' ? (
        <ProfileTabScreen
          isAdmin
          onLogout={onLogout}
          summaryCards={summaryCards}
          user={user}
        />
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
