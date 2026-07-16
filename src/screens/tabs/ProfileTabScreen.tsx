import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { LoggedInUser } from '../../services/auth';

type ProfileTabScreenProps = {
  isAdmin: boolean;
  onLogout: () => void;
  summaryCards: Array<{
    label: string;
    value: string;
  }>;
  user: LoggedInUser;
};

export default function ProfileTabScreen({
  isAdmin,
  onLogout,
  summaryCards,
  user,
}: ProfileTabScreenProps) {
  const primaryDetails = summaryCards.filter(
    card => card.label === 'Email' || card.label === 'Phone',
  );
  const salaryDetails = summaryCards.filter(
    card => card.label === 'Fixed Salary' || card.label === 'Variable Salary',
  );
  const userInitial = user.username.charAt(0).toUpperCase();
  const totalSalary = user.fixedSalary + user.variableSalary;

  return (
    <View style={styles.profileScreen}>
      <View style={styles.heroCard}>
        <View style={styles.heroGlowLarge} />
        <View style={styles.heroGlowSmall} />
        <View style={styles.heroGlowAccent} />

        <View style={styles.heroTopRow}>
          <View style={styles.identityWrap}>
            <View style={styles.avatarBadge}>
              <Text style={styles.avatarLetter}>{userInitial}</Text>
            </View>
            <View>
              <Text style={styles.identityEyebrow}>Personal Profile</Text>
              <Text style={styles.identityName}>{user.username}</Text>
            </View>
          </View>
          <View style={styles.heroStatusPill}>
            <Text style={styles.heroStatusText}>{isAdmin ? 'Admin' : 'Team Member'}</Text>
          </View>
        </View>

        <Text style={styles.profileTitle}>Profile Overview</Text>
        <Text style={styles.profileSubtitle}>
          {isAdmin
            ? 'Review your admin identity, contact details, and compensation information in one place.'
            : 'View your personal details, contact information, and compensation summary in one place.'}
        </Text>

        <View style={styles.heroStatsRow}>
          <View style={styles.heroStatCard}>
            <Text style={styles.heroStatLabel}>Profile Type</Text>
            <Text style={styles.heroStatValue}>{isAdmin ? 'Admin' : 'User'}</Text>
          </View>
          {!isAdmin ? (
            <View style={styles.heroStatCard}>
              <Text style={styles.heroStatLabel}>Total Package</Text>
              <Text style={styles.heroStatValue}>
                Rs. {Math.round(totalSalary).toLocaleString('en-IN')}
              </Text>
            </View>
          ) : null}
        </View>
      </View>

      <View style={styles.sectionCard}>
        <View style={styles.sectionHeaderRow}>
          <View>
            <Text style={styles.sectionTitle}>Account Details</Text>
            <Text style={styles.sectionSubtitle}>
              Contact information linked to your profile.
            </Text>
          </View>
          <View style={styles.sectionIconShell}>
            <Ionicons color="#0f172a" name="person-outline" size={18} />
          </View>
        </View>

        <View style={styles.detailGrid}>
          {primaryDetails.map(card => (
            <View key={card.label} style={styles.detailTile}>
              <View style={styles.detailTileHeader}>
                <View style={styles.detailIconShell}>
                  <Ionicons
                    color="#b91c1c"
                    name={card.label === 'Email' ? 'mail-outline' : 'call-outline'}
                    size={16}
                  />
                </View>
                <Text style={styles.detailLabel}>{card.label}</Text>
              </View>
              <Text
                numberOfLines={card.label === 'Email' ? 1 : undefined}
                style={styles.detailValue}>
                {card.value}
              </Text>
            </View>
          ))}
        </View>
      </View>

      {!isAdmin ? (
        <View style={styles.sectionCardAlt}>
          <View style={styles.salaryAccentBar} />
          <View style={styles.sectionHeaderRow}>
            <View>
              <Text style={[styles.sectionTitle, styles.sectionTitleAlt]}>Compensation</Text>
              <Text style={[styles.sectionSubtitle, styles.sectionSubtitleAlt]}>
                Salary values currently assigned to your account.
              </Text>
            </View>
            <View style={styles.sectionIconShellAlt}>
              <Ionicons color="#fff7ed" name="wallet-outline" size={18} />
            </View>
          </View>

          <View style={styles.salaryGrid}>
            {salaryDetails.map(card => (
              <View key={card.label} style={styles.salaryTile}>
                <View style={styles.salaryTileHeader}>
                  <View style={styles.salaryTileDot} />
                  <Text style={styles.salaryLabel}>{card.label}</Text>
                </View>
                <Text style={styles.salaryValue}>Rs. {card.value}</Text>
              </View>
            ))}
          </View>

          <View style={styles.compensationHighlight}>
            <Text style={styles.compensationHighlightLabel}>Combined Compensation</Text>
            <Text style={styles.compensationHighlightValue}>
              Rs. {Math.round(totalSalary).toLocaleString('en-IN')}
            </Text>
          </View>
        </View>
      ) : null}

      <View style={styles.logoutCard}>
        <View style={styles.logoutGlow} />
        <View style={styles.logoutCopyWrap}>
          <Text style={styles.logoutEyebrow}>Session Control</Text>
          <Text style={styles.logoutTitle}>Secure Sign Out</Text>
          <Text style={styles.logoutDescription}>
            End your current session securely on this device whenever you are done.
          </Text>
        </View>
        <Pressable onPress={onLogout} style={styles.logoutButton}>
          <Ionicons color="#ffffff" name="log-out-outline" size={18} />
          <Text style={styles.logoutButtonText}>Logout</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  profileScreen: {
    gap: 16,
    marginBottom: 20,
  },
  heroCard: {
    backgroundColor: '#fff7f5',
    borderColor: '#fecaca',
    borderRadius: 32,
    borderWidth: 1,
    overflow: 'hidden',
    padding: 22,
    position: 'relative',
  },
  heroGlowLarge: {
    backgroundColor: 'rgba(220, 38, 38, 0.12)',
    borderRadius: 999,
    height: 220,
    position: 'absolute',
    right: -50,
    top: -80,
    width: 220,
  },
  heroGlowSmall: {
    backgroundColor: 'rgba(251, 113, 133, 0.16)',
    borderRadius: 999,
    height: 110,
    left: -20,
    position: 'absolute',
    top: 170,
    width: 110,
  },
  heroGlowAccent: {
    backgroundColor: 'rgba(17, 24, 39, 0.04)',
    borderRadius: 999,
    height: 180,
    position: 'absolute',
    right: 40,
    top: 90,
    width: 180,
  },
  heroTopRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 22,
    width: '100%',
  },
  identityWrap: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    flex: 1,
    paddingRight: 12,
  },
  avatarBadge: {
    alignItems: 'center',
    backgroundColor: '#dc2626',
    borderRadius: 24,
    height: 56,
    justifyContent: 'center',
    shadowColor: '#b91c1c',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    width: 56,
  },
  avatarLetter: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '800',
  },
  identityEyebrow: {
    color: '#b91c1c',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  identityName: {
    color: '#111827',
    fontSize: 22,
    fontWeight: '800',
  },
  heroStatusPill: {
    backgroundColor: '#111827',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  heroStatusText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  profileTitle: {
    color: '#111827',
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: -0.6,
    marginBottom: 8,
    maxWidth: 260,
  },
  profileSubtitle: {
    color: '#6b7280',
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 18,
    maxWidth: 310,
  },
  heroStatsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  heroStatCard: {
    backgroundColor: '#fffdfc',
    borderColor: '#fbd5cf',
    borderRadius: 20,
    borderWidth: 1,
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 15,
  },
  heroStatLabel: {
    color: '#9a3412',
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  heroStatValue: {
    color: '#111827',
    fontSize: 16,
    fontWeight: '800',
  },
  sectionCard: {
    backgroundColor: '#ffffff',
    borderColor: '#fecaca',
    borderRadius: 28,
    borderWidth: 1,
    padding: 18,
  },
  sectionCardAlt: {
    backgroundColor: '#111827',
    borderColor: '#1f2937',
    borderRadius: 28,
    borderWidth: 1,
    overflow: 'hidden',
    padding: 18,
    position: 'relative',
  },
  salaryAccentBar: {
    backgroundColor: '#dc2626',
    borderRadius: 999,
    height: 180,
    opacity: 0.14,
    position: 'absolute',
    right: -40,
    top: -30,
    width: 180,
  },
  sectionHeaderRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  sectionTitle: {
    color: '#111827',
    fontSize: 18,
    fontWeight: '700',
  },
  sectionSubtitle: {
    color: '#6b7280',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 4,
  },
  sectionTitleAlt: {
    color: '#ffffff',
  },
  sectionSubtitleAlt: {
    color: '#cbd5e1',
  },
  sectionIconShell: {
    alignItems: 'center',
    backgroundColor: '#fff1ee',
    borderRadius: 14,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  sectionIconShellAlt: {
    alignItems: 'center',
    backgroundColor: '#dc2626',
    borderRadius: 14,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  detailGrid: {
    gap: 10,
  },
  detailTile: {
    backgroundColor: '#fff8f6',
    borderColor: '#fee2e2',
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  detailTileHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    marginBottom: 10,
  },
  detailIconShell: {
    alignItems: 'center',
    backgroundColor: '#fff1ee',
    borderRadius: 12,
    height: 28,
    justifyContent: 'center',
    marginRight: 10,
    width: 28,
  },
  detailLabel: {
    color: '#6b7280',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  detailValue: {
    color: '#111827',
    fontSize: 16,
    fontWeight: '700',
  },
  salaryGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  salaryTile: {
    backgroundColor: '#1f2937',
    borderColor: '#374151',
    borderRadius: 20,
    borderWidth: 1,
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 16,
  },
  salaryTileHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    marginBottom: 10,
  },
  salaryTileDot: {
    backgroundColor: '#ef4444',
    borderRadius: 999,
    height: 10,
    marginRight: 8,
    width: 10,
  },
  salaryLabel: {
    color: '#fecaca',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  salaryValue: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '800',
  },
  compensationHighlight: {
    backgroundColor: '#0f172a',
    borderColor: '#334155',
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  compensationHighlightLabel: {
    color: '#cbd5e1',
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  compensationHighlightValue: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '800',
  },
  logoutCard: {
    backgroundColor: '#fff1ee',
    borderColor: '#fecaca',
    borderRadius: 28,
    borderWidth: 1,
    overflow: 'hidden',
    padding: 18,
    position: 'relative',
  },
  logoutGlow: {
    backgroundColor: 'rgba(220, 38, 38, 0.12)',
    borderRadius: 999,
    height: 140,
    position: 'absolute',
    right: -20,
    top: -20,
    width: 140,
  },
  logoutCopyWrap: {
    marginBottom: 16,
    paddingRight: 36,
  },
  logoutEyebrow: {
    color: '#b91c1c',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  logoutTitle: {
    color: '#111827',
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 4,
  },
  logoutDescription: {
    color: '#6b7280',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 4,
  },
  logoutButton: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#dc2626',
    borderRadius: 14,
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 18,
    paddingVertical: 13,
  },
  logoutButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
});
