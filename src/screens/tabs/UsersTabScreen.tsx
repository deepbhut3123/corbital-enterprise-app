import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
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
import type { CreateUserInput } from '../../services/users';

type RoleOption = {
  label: string;
  value: string;
};

type UsersTabScreenProps = {
  adminCount: number;
  form: CreateUserInput;
  isCreatingUser: boolean;
  isDeletingUserId: string | null;
  isLoadingUsers: boolean;
  isModalVisible: boolean;
  isUpdatingUser: boolean;
  modalError: string;
  onCloseModal: () => void;
  onDeleteUser: (user: UserRecord) => void;
  onEditUser: (user: UserRecord) => void;
  onOpenModal: () => void;
  onResetForm: () => void;
  onSaveUser: () => void;
  onUpdateForm: (key: keyof CreateUserInput, value: string) => void;
  roleOptions: RoleOption[];
  selectedUser: UserRecord | null;
  users: UserRecord[];
  usersError: string;
};

export default function UsersTabScreen({
  adminCount,
  form,
  isCreatingUser,
  isDeletingUserId,
  isLoadingUsers,
  isModalVisible,
  isUpdatingUser,
  modalError,
  onCloseModal,
  onDeleteUser,
  onEditUser,
  onOpenModal,
  onResetForm,
  onSaveUser,
  onUpdateForm,
  roleOptions,
  selectedUser,
  users,
  usersError,
}: UsersTabScreenProps) {
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const selectedRoleLabel =
    roleOptions.find(option => option.value === form.roleId)?.label || 'Select Role';
  const isAdminRoleSelected =
    form.roleId.trim().toLowerCase() === '1' || form.roleId.trim().toLowerCase() === 'admin';

  const handleRoleSelect = (roleValue: string) => {
    onUpdateForm('roleId', roleValue);

    const normalizedRole = roleValue.trim().toLowerCase();
    if (normalizedRole === '1' || normalizedRole === 'admin') {
      onUpdateForm('fixedSalary', '');
      onUpdateForm('variableSalary', '');
    }
  };

  return (
    <>
      <View style={styles.adminPanel}>
        <View style={styles.adminHeader}>
          <View>
            <Text style={styles.adminTitle}>User List</Text>
            <Text style={styles.adminCaption}>
              Only admin can view and create users.
            </Text>
          </View>
          <Pressable onPress={onOpenModal} style={styles.addButton}>
            <Text style={styles.addButtonText}>Add User</Text>
          </Pressable>
        </View>

        {isLoadingUsers ? (
          <View style={styles.loadingState}>
            <ActivityIndicator color="#dc2626" />
            <Text style={styles.loadingText}>Loading users...</Text>
          </View>
        ) : usersError ? (
          <Text style={styles.errorText}>{usersError}</Text>
        ) : users.length ? (
          users.map(listUser => (
            <View key={listUser.id} style={styles.userCard}>
              <View style={styles.userCardHeader}>
                <View style={styles.userCardInfo}>
                  <View style={styles.userIdentityRow}>
                    <View style={styles.avatarBadge}>
                      <Text style={styles.avatarLetter}>
                        {listUser.username.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.identityContent}>
                      <Text style={styles.userName}>{listUser.username}</Text>
                      <Text style={styles.userMeta}>{listUser.email}</Text>
                    </View>
                  </View>
                </View>
              </View>

              <View style={styles.userDetailsSection}>
                <View style={[styles.detailPill, styles.contactPill]}>
                  <Ionicons color="#dc2626" name="call-outline" size={14} />
                  <Text style={styles.detailPillText}>{listUser.phone || '-'}</Text>
                </View>
                <View
                  style={[
                    styles.roleBadge,
                    (listUser.roleId === '1' || listUser.roleId === 'admin') &&
                      styles.roleBadgeAdmin,
                  ]}>
                  <Ionicons
                    color={
                      listUser.roleId === '1' || listUser.roleId === 'admin'
                        ? '#ffffff'
                        : '#7f1d1d'
                    }
                    name={
                      listUser.roleId === '1' || listUser.roleId === 'admin'
                        ? 'shield-checkmark-outline'
                        : 'person-outline'
                    }
                    size={13}
                  />
                  <Text
                    style={[
                      styles.roleBadgeText,
                      (listUser.roleId === '1' || listUser.roleId === 'admin') &&
                        styles.roleBadgeTextAdmin,
                    ]}>
                    {listUser.roleId === '1' || listUser.roleId === 'admin'
                      ? 'Admin'
                      : 'User'}
                  </Text>
                </View>
              </View>

              <View style={styles.salaryGrid}>
                <View style={styles.salaryCard}>
                  <Text style={styles.salaryLabel}>Fixed Salary</Text>
                  <Text style={styles.salaryValue}>
                    Rs. {listUser.fixedSalary.toLocaleString('en-IN')}
                  </Text>
                </View>
                <View style={styles.salaryCard}>
                  <Text style={styles.salaryLabel}>Variable Salary</Text>
                  <Text style={styles.salaryValue}>
                    Rs. {listUser.variableSalary.toLocaleString('en-IN')}
                  </Text>
                </View>
              </View>

              <View style={styles.userActions}>
                <Pressable
                  onPress={() => onEditUser(listUser)}
                  style={[styles.actionButton, styles.editButton]}>
                  <Ionicons color="#7f1d1d" name="pencil" size={15} />
                  <Text style={styles.editActionText}>Update</Text>
                </Pressable>
                <Pressable
                  disabled={
                    isDeletingUserId === listUser.id ||
                    ((listUser.roleId === '1' || listUser.roleId === 'admin') &&
                      adminCount < 2)
                  }
                  onPress={() => onDeleteUser(listUser)}
                  style={[
                    styles.actionButton,
                    styles.deleteButton,
                    (((listUser.roleId === '1' || listUser.roleId === 'admin') &&
                      adminCount < 2) ||
                      isDeletingUserId === listUser.id) &&
                      styles.disabledButton,
                  ]}>
                  {isDeletingUserId === listUser.id ? (
                    <ActivityIndicator color="#ffffff" size="small" />
                  ) : (
                    <>
                      <Ionicons color="#ffffff" name="trash-outline" size={15} />
                      <Text style={styles.deleteActionText}>Delete</Text>
                    </>
                  )}
                </Pressable>
              </View>

              {((listUser.roleId === '1' || listUser.roleId === 'admin') &&
                adminCount < 2) ? (
                <Text style={styles.helperText}>
                  Keep at least two admins before deleting an admin user.
                </Text>
              ) : null}
            </View>
          ))
        ) : (
          <Text style={styles.emptyText}>No users available yet.</Text>
        )}
      </View>

      <Modal
        animationType="slide"
        onRequestClose={onCloseModal}
        transparent
        visible={isModalVisible}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              {selectedUser ? 'Update User' : 'Add User'}
            </Text>
            <Text style={styles.modalSubtitle}>
              {selectedUser
                ? 'Update user details from the admin panel.'
                : 'Create a new employee account from the admin panel.'}
            </Text>

            <ScrollView showsVerticalScrollIndicator={false}>
              <TextInput
                onChangeText={value => onUpdateForm('username', value)}
                placeholder="Username"
                placeholderTextColor="#94a3b8"
                style={styles.modalInput}
                value={form.username}
              />
              <TextInput
                autoCapitalize="none"
                keyboardType="email-address"
                onChangeText={value => onUpdateForm('email', value)}
                placeholder="Email"
                placeholderTextColor="#94a3b8"
                style={styles.modalInput}
                value={form.email}
              />
              <TextInput
                keyboardType="phone-pad"
                onChangeText={value => onUpdateForm('phone', value)}
                placeholder="Phone"
                placeholderTextColor="#94a3b8"
                style={styles.modalInput}
                value={form.phone}
              />
              <View style={styles.passwordInputWrap}>
                <TextInput
                  onChangeText={value => onUpdateForm('password', value)}
                  placeholder={
                    selectedUser ? 'Password (leave blank to keep same)' : 'Password'
                  }
                  placeholderTextColor="#94a3b8"
                  secureTextEntry={!isPasswordVisible}
                  style={styles.modalPasswordInput}
                  value={form.password}
                />
                <Pressable
                  hitSlop={10}
                  onPress={() => setIsPasswordVisible(current => !current)}
                  style={styles.eyeButton}>
                  <Ionicons
                    color="#9ca3af"
                    name={isPasswordVisible ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                  />
                </Pressable>
              </View>
              <View style={styles.roleSelector}>
                <Text style={styles.roleSelectorLabel}>Role</Text>
                <View style={styles.roleOptionsRow}>
                  {roleOptions.map(roleOption => {
                    const isSelected = form.roleId === roleOption.value;

                    return (
                      <Pressable
                        key={roleOption.value}
                        onPress={() => handleRoleSelect(roleOption.value)}
                        style={[
                          styles.roleOptionButton,
                          isSelected && styles.roleOptionButtonActive,
                        ]}>
                        <Text
                          style={[
                            styles.roleOptionText,
                            isSelected && styles.roleOptionTextActive,
                          ]}>
                          {roleOption.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
                <Text style={styles.helperText}>Selected role: {selectedRoleLabel}</Text>
              </View>

              {!isAdminRoleSelected ? (
                <>
                  <TextInput
                    keyboardType="numeric"
                    onChangeText={value => onUpdateForm('fixedSalary', value)}
                    placeholder="Fixed Salary"
                    placeholderTextColor="#94a3b8"
                    style={styles.modalInput}
                    value={form.fixedSalary}
                  />
                  <TextInput
                    keyboardType="numeric"
                    onChangeText={value => onUpdateForm('variableSalary', value)}
                    placeholder="Variable Salary"
                    placeholderTextColor="#94a3b8"
                    style={styles.modalInput}
                    value={form.variableSalary}
                  />
                </>
              ) : null}

              {modalError ? <Text style={styles.errorText}>{modalError}</Text> : null}

              <View style={styles.modalActions}>
                <Pressable
                  onPress={() => {
                    onCloseModal();
                    onResetForm();
                  }}
                  style={styles.secondaryButton}>
                  <Text style={styles.secondaryButtonText}>Cancel</Text>
                </Pressable>
                <Pressable
                  disabled={isCreatingUser || isUpdatingUser}
                  onPress={onSaveUser}
                  style={styles.primaryButton}>
                  {isCreatingUser || isUpdatingUser ? (
                    <ActivityIndicator color="#ffffff" />
                  ) : (
                    <Text style={styles.primaryButtonText}>
                      {selectedUser ? 'Update User' : 'Save User'}
                    </Text>
                  )}
                </Pressable>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  adminPanel: {
    backgroundColor: '#ffffff',
    borderColor: '#fecaca',
    borderRadius: 28,
    borderWidth: 1,
    padding: 20,
  },
  adminHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  adminTitle: {
    color: '#111827',
    fontSize: 22,
    fontWeight: '700',
  },
  adminCaption: {
    color: '#6b7280',
    fontSize: 14,
    marginTop: 4,
  },
  addButton: {
    backgroundColor: '#dc2626',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  addButtonText: {
    color: '#ffffff',
    fontSize: 14,
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
  userCard: {
    backgroundColor: '#fffdfc',
    borderColor: '#fecaca',
    borderRadius: 22,
    borderWidth: 1,
    marginBottom: 10,
    padding: 14,
    shadowColor: '#7f1d1d',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 14,
  },
  userCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  userCardInfo: {
    flex: 1,
    paddingRight: 10,
  },
  userIdentityRow: {
    alignItems: 'center',
    flexDirection: 'row',
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
  identityContent: {
    flex: 1,
  },
  userName: {
    color: '#111827',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  userMeta: {
    color: '#4b5563',
    fontSize: 12,
  },
  userActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  actionButton: {
    alignItems: 'center',
    borderRadius: 14,
    flex: 1,
    flexDirection: 'row',
    height: 38,
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  editButton: {
    backgroundColor: '#fff1ee',
    borderColor: '#fee2e2',
    borderWidth: 1,
  },
  deleteButton: {
    backgroundColor: '#dc2626',
  },
  editActionText: {
    color: '#7f1d1d',
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 6,
  },
  deleteActionText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 6,
  },
  disabledButton: {
    backgroundColor: '#fca5a5',
  },
  userDetailsSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  detailPill: {
    alignItems: 'center',
    backgroundColor: '#fff7f5',
    borderRadius: 999,
    flexDirection: 'row',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  contactPill: {
    flex: 1,
    marginRight: 8,
  },
  detailPillText: {
    color: '#7f1d1d',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 6,
  },
  roleBadge: {
    alignItems: 'center',
    backgroundColor: '#fff1ee',
    borderRadius: 999,
    flexDirection: 'row',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  roleBadgeAdmin: {
    backgroundColor: '#111827',
  },
  roleBadgeText: {
    color: '#7f1d1d',
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 5,
  },
  roleBadgeTextAdmin: {
    color: '#ffffff',
  },
  salaryGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  salaryCard: {
    backgroundColor: '#fff7f5',
    borderColor: '#fee2e2',
    borderRadius: 16,
    borderWidth: 1,
    flex: 1,
    padding: 10,
  },
  salaryLabel: {
    color: '#9a3412',
    fontSize: 10,
    fontWeight: '700',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  salaryValue: {
    color: '#111827',
    fontSize: 13,
    fontWeight: '700',
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
  modalCard: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    maxHeight: '84%',
    padding: 20,
    width: '100%',
  },
  modalTitle: {
    color: '#111827',
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
  },
  modalSubtitle: {
    color: '#6b7280',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  modalInput: {
    backgroundColor: '#fff7f5',
    borderColor: '#fca5a5',
    borderRadius: 14,
    borderWidth: 1,
    color: '#111827',
    fontSize: 15,
    marginBottom: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  passwordInputWrap: {
    alignItems: 'center',
    backgroundColor: '#fff7f5',
    borderColor: '#fca5a5',
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    marginBottom: 12,
    paddingLeft: 14,
    paddingRight: 12,
  },
  modalPasswordInput: {
    color: '#111827',
    flex: 1,
    fontSize: 15,
    paddingVertical: 12,
  },
  eyeButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingLeft: 12,
  },
  roleSelector: {
    marginBottom: 12,
  },
  roleSelectorLabel: {
    color: '#6b7280',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  roleOptionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  roleOptionButton: {
    backgroundColor: '#fff7f5',
    borderColor: '#fca5a5',
    borderRadius: 14,
    borderWidth: 1,
    flex: 1,
    paddingVertical: 12,
  },
  roleOptionButtonActive: {
    backgroundColor: '#dc2626',
    borderColor: '#dc2626',
  },
  roleOptionText: {
    color: '#7f1d1d',
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  roleOptionTextActive: {
    color: '#ffffff',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
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
    minWidth: 120,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  errorText: {
    color: '#b91c1c',
    fontSize: 14,
    marginTop: 4,
  },
  helperText: {
    color: '#6b7280',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 6,
  },
});
