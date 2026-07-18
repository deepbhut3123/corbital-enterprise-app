import { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';

import AppTabBar, { type TabItem, type TabKey } from '../components/AppTabBar';
import { fetchCurrentUser } from '../services/auth';
import type { LoggedInUser, UserRecord } from '../services/auth';
import {
  createUser,
  deleteUser,
  fetchUsers,
  type CreateUserInput,
  updateUser,
} from '../services/users';
import AdminHubTabScreen from './tabs/AdminHubTabScreen';
import AttendanceTabScreen from './tabs/AttendanceTabScreen';
import HomeTabScreen from './tabs/HomeTabScreen';
import ProfileTabScreen from './tabs/ProfileTabScreen';
import TargetsTabScreen from './tabs/TargetsTabScreen';
import ValueEntriesTabScreen from './tabs/ValueEntriesTabScreen';

function isSameUser(left: LoggedInUser, right: LoggedInUser) {
  return left.id === right.id || left.email.toLowerCase() === right.email.toLowerCase();
}

function hasProfileChanged(left: LoggedInUser, right: LoggedInUser) {
  return (
    left.id !== right.id ||
    left.username !== right.username ||
    left.email !== right.email ||
    left.phone !== right.phone ||
    left.fixedSalary !== right.fixedSalary ||
    left.variableSalary !== right.variableSalary ||
    left.roleId !== right.roleId ||
    left.authenticatorEnabled !== right.authenticatorEnabled
  );
}

type MainTabsScreenProps = {
  onLogout: () => void;
  onUpdateLoggedInUser: (updatedUser: LoggedInUser) => Promise<void>;
  paddingBottom: number;
  paddingTop: number;
  token: string;
  user: LoggedInUser;
};

export default function MainTabsScreen({
  onLogout,
  onUpdateLoggedInUser,
  paddingBottom,
  paddingTop,
  token,
  user,
}: MainTabsScreenProps) {
  const [activeTab, setActiveTab] = useState<TabKey>('home');
  const [adminSection, setAdminSection] = useState<'profile' | 'users'>('users');
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [isDeletingUserId, setIsDeletingUserId] = useState<string | null>(null);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshSignal, setRefreshSignal] = useState(0);
  const [isUpdatingUser, setIsUpdatingUser] = useState(false);
  const [modalError, setModalError] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserRecord | null>(null);
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [usersError, setUsersError] = useState('');
  const [form, setForm] = useState<CreateUserInput>({
    email: '',
    fixedSalary: '',
    password: '',
    phone: '',
    roleId: '2',
    username: '',
    variableSalary: '',
  });

  const currentUser = useMemo(
    () => users.find(listUser => isSameUser(listUser, user)) ?? user,
    [user, users],
  );

  const normalizedRoleId = currentUser.roleId.trim().toLowerCase();
  const isAdmin = normalizedRoleId === '1' || normalizedRoleId === 'admin';

  const summaryCards = useMemo(
    () => [
      { label: 'Email', value: currentUser.email },
      { label: 'Phone', value: currentUser.phone || '-' },
      { label: 'Role', value: currentUser.roleId === '1' ? 'Admin' : 'User' },
      {
        label: 'Fixed Salary',
        value: currentUser.fixedSalary.toLocaleString('en-IN'),
      },
      {
        label: 'Variable Salary',
        value: currentUser.variableSalary.toLocaleString('en-IN'),
      },
    ],
    [
      currentUser.email,
      currentUser.fixedSalary,
      currentUser.phone,
      currentUser.roleId,
      currentUser.variableSalary,
    ],
  );

  const adminCount = useMemo(
    () =>
      users.filter(listUser => {
        const normalizedUserRole = listUser.roleId.trim().toLowerCase();
        return normalizedUserRole === '1' || normalizedUserRole === 'admin';
      }).length,
    [users],
  );

  const roleOptions = useMemo(
    () => [
      { label: 'Admin', value: '1' },
      { label: 'User', value: '2' },
    ],
    [],
  );

  const loadUsers = useCallback(async () => {
    try {
      setIsLoadingUsers(true);
      setUsersError('');
      const data = await fetchUsers(token);
      setUsers(data);

      const updatedCurrentUser = data.find(listUser => isSameUser(listUser, user));

      if (updatedCurrentUser && hasProfileChanged(updatedCurrentUser, user)) {
        await onUpdateLoggedInUser(updatedCurrentUser);
      }

      return data;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unable to load users.';
      setUsersError(message);
      return null;
    } finally {
      setIsLoadingUsers(false);
    }
  }, [onUpdateLoggedInUser, token, user]);

  useEffect(() => {
    if (!isAdmin) {
      return;
    }

    loadUsers().catch(() => {
      // loadUsers already stores a user-facing error message in state.
    });
  }, [isAdmin, loadUsers]);

  const updateForm = (key: keyof CreateUserInput, value: string) => {
    setForm(current => ({
      ...current,
      [key]: value,
    }));
  };

  const resetForm = () => {
    setForm({
      email: '',
      fixedSalary: '',
      password: '',
      phone: '',
      roleId: '2',
      username: '',
      variableSalary: '',
    });
    setModalError('');
    setSelectedUser(null);
  };

  const openCreateModal = () => {
    resetForm();
    setIsModalVisible(true);
  };

  const openEditModal = (selectedListUser: UserRecord) => {
    setSelectedUser(selectedListUser);
    setForm({
      email: selectedListUser.email,
      fixedSalary: String(selectedListUser.fixedSalary),
      password: '',
      phone: selectedListUser.phone || '',
      roleId: selectedListUser.roleId,
      username: selectedListUser.username,
      variableSalary: String(selectedListUser.variableSalary),
    });
    setModalError('');
    setIsModalVisible(true);
  };

  const handleSaveUser = async () => {
    if (!form.username.trim() || !form.email.trim() || !form.phone.trim()) {
      setModalError('Username, email, and phone are required.');
      return;
    }

    if (!selectedUser && !form.password.trim()) {
      setModalError('Password is required for a new user.');
      return;
    }

    try {
      setModalError('');

      if (selectedUser) {
        setIsUpdatingUser(true);
        const updatedUser = await updateUser(selectedUser.id, form, token);
        setUsers(current =>
          current.map(listUser =>
            listUser.id === updatedUser.id ? updatedUser : listUser,
          ),
        );

        if (isSameUser(updatedUser, currentUser)) {
          await onUpdateLoggedInUser(updatedUser);
        }

        const refreshedUsers = await loadUsers();
        const refreshedCurrentUser = refreshedUsers?.find(listUser =>
          isSameUser(listUser, currentUser),
        );

        if (refreshedCurrentUser && hasProfileChanged(refreshedCurrentUser, currentUser)) {
          await onUpdateLoggedInUser(refreshedCurrentUser);
        }
      } else {
        setIsCreatingUser(true);
        const createdUser = await createUser(form, token);
        setUsers(current => [createdUser, ...current]);
      }

      setIsModalVisible(false);
      resetForm();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unable to save user.';
      setModalError(message);
    } finally {
      setIsCreatingUser(false);
      setIsUpdatingUser(false);
    }
  };

  const handleDeleteUser = async (selectedListUser: UserRecord) => {
    try {
      setIsDeletingUserId(selectedListUser.id);
      setUsersError('');
      await deleteUser(selectedListUser.id, token);
      setUsers(current =>
        current.filter(listUser => listUser.id !== selectedListUser.id),
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unable to delete user.';
      setUsersError(message);
    } finally {
      setIsDeletingUserId(null);
    }
  };

  const handleRefresh = useCallback(async () => {
    try {
      setIsRefreshing(true);
      setRefreshSignal(current => current + 1);

      const refreshedCurrentUser = await fetchCurrentUser(token);
      await onUpdateLoggedInUser(refreshedCurrentUser);

      if (isAdmin) {
        await loadUsers();
      }
      await new Promise(resolve => setTimeout(resolve, 300));
    } catch (error) {
      setUsersError(
        error instanceof Error ? error.message : 'Unable to refresh data.',
      );
    } finally {
      setIsRefreshing(false);
    }
  }, [isAdmin, loadUsers, onUpdateLoggedInUser, token]);

  const tabItems: TabItem[] = isAdmin
    ? [
        { icon: activeTab === 'home' ? 'home' : 'home-outline', key: 'home', label: 'Home' },
        {
          icon: activeTab === 'attendance' ? 'calendar' : 'calendar-outline',
          key: 'attendance',
          label: 'Attendance',
        },
        {
          icon: activeTab === 'targets' ? 'flag' : 'flag-outline',
          key: 'targets',
          label: 'Targets',
        },
        {
          icon: activeTab === 'sales' ? 'cash' : 'cash-outline',
          key: 'sales',
          label: 'Values',
        },
        {
          icon: activeTab === 'manage' ? 'layers' : 'layers-outline',
          key: 'manage',
          label: 'Account',
        },
      ]
    : [
        { icon: activeTab === 'home' ? 'home' : 'home-outline', key: 'home', label: 'Home' },
        {
          icon: activeTab === 'attendance' ? 'calendar' : 'calendar-outline',
          key: 'attendance',
          label: 'Attendance',
        },
        {
          icon: activeTab === 'sales' ? 'cash' : 'cash-outline',
          key: 'sales',
          label: 'Values',
        },
        {
          icon: activeTab === 'targets' ? 'flag' : 'flag-outline',
          key: 'targets',
          label: 'Targets',
        },
        {
          icon:
            activeTab === 'profile' ? 'person-circle' : 'person-circle-outline',
          key: 'profile',
          label: 'Profile',
        },
      ];

  return (
    <View style={styles.container}>
      <ScrollView
        alwaysBounceVertical={false}
        bounces={false}
        overScrollMode="never"
        refreshControl={
          <RefreshControl
            colors={['#dc2626']}
            onRefresh={() => {
              handleRefresh().catch(() => {
                // Refresh errors are already handled in state where applicable.
              });
            }}
            progressBackgroundColor="#fff1ee"
            progressViewOffset={paddingTop}
            refreshing={isRefreshing}
            tintColor="#dc2626"
          />
        }
        showsVerticalScrollIndicator={false}
        style={styles.contentScroll}
        contentContainerStyle={[
          styles.contentPadding,
          activeTab === 'profile' && styles.contentPaddingFill,
          { paddingTop, paddingBottom },
        ]}>
        {activeTab === 'home' ? (
          <HomeTabScreen
            isActive={activeTab === 'home'}
            isAdmin={isAdmin}
            refreshSignal={refreshSignal}
            token={token}
            user={currentUser}
          />
        ) : activeTab === 'profile' ? (
          <View style={styles.profileTabContent}>
            <ProfileTabScreen
              isAdmin={isAdmin}
              onLogout={onLogout}
              summaryCards={summaryCards}
              user={currentUser}
            />
          </View>
        ) : activeTab === 'manage' ? (
          <AdminHubTabScreen
            activeSection={adminSection}
            adminCount={adminCount}
            form={form}
            isCreatingUser={isCreatingUser}
            isDeletingUserId={isDeletingUserId}
            isLoadingUsers={isLoadingUsers}
            isModalVisible={isModalVisible}
            isUpdatingUser={isUpdatingUser}
            modalError={modalError}
            onChangeSection={setAdminSection}
            onCloseModal={() => setIsModalVisible(false)}
            onDeleteUser={handleDeleteUser}
            onEditUser={openEditModal}
            onLogout={onLogout}
            onOpenModal={openCreateModal}
            onResetForm={resetForm}
            onSaveUser={handleSaveUser}
            onUpdateForm={updateForm}
            roleOptions={roleOptions}
            selectedUser={selectedUser}
            summaryCards={summaryCards}
            user={currentUser}
            users={users}
            usersError={usersError}
          />
        ) : activeTab === 'attendance' ? (
          <AttendanceTabScreen
            isAdmin={isAdmin}
            refreshSignal={refreshSignal}
            token={token}
            users={users}
          />
        ) : activeTab === 'sales' ? (
          <ValueEntriesTabScreen
            isAdmin={isAdmin}
            refreshSignal={refreshSignal}
            token={token}
            user={currentUser}
            users={users}
          />
        ) : activeTab === 'targets' ? (
          <TargetsTabScreen
            isAdmin={isAdmin}
            refreshSignal={refreshSignal}
            token={token}
            user={currentUser}
            users={users}
          />
        ) : (
          <View />
        )}
      </ScrollView>

      <AppTabBar
        activeTab={activeTab}
        items={tabItems}
        onTabPress={setActiveTab}
        paddingBottom={paddingBottom}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff7f5',
    flex: 1,
  },
  contentScroll: {
    flex: 1,
  },
  contentPadding: {
    paddingLeft: 24,
    paddingRight: 24,
  },
  contentPaddingFill: {
    flexGrow: 1,
  },
  profileTabContent: {
    flex: 1,
  },
});
