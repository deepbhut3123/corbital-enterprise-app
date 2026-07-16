import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import type { LoggedInUser } from '../../services/auth';
import { fetchMyTarget, type TargetRecord } from '../../services/targets';
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

type HomeTabScreenProps = {
  isActive: boolean;
  isAdmin: boolean;
  refreshSignal: number;
  token: string;
  user: LoggedInUser;
};

type ProfitSlice = {
  color: string;
  label: string;
  percentage: number;
  value: number;
};

type SalarySlice = {
  color: string;
  label: string;
  value: number;
};

const getInitialMonthYear = () => {
  const now = new Date();

  return {
    month: now.getMonth() + 1,
    year: now.getFullYear(),
  };
};

const chartColors = ['#dc2626', '#fb7185', '#f97316', '#f59e0b', '#0f766e', '#2563eb'];

const polarToCartesian = (
  centerX: number,
  centerY: number,
  radius: number,
  angleInDegrees: number,
) => {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;

  return {
    x: centerX + radius * Math.cos(angleInRadians),
    y: centerY + radius * Math.sin(angleInRadians),
  };
};

const buildSlicePath = (
  centerX: number,
  centerY: number,
  radius: number,
  startAngle: number,
  endAngle: number,
) => {
  const start = polarToCartesian(centerX, centerY, radius, endAngle);
  const end = polarToCartesian(centerX, centerY, radius, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';

  return `M ${centerX} ${centerY} L ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} 0 ${end.x} ${end.y} Z`;
};

export default function HomeTabScreen({
  isActive,
  isAdmin,
  refreshSignal,
  token,
  user,
}: HomeTabScreenProps) {
  const initialMonthYear = useMemo(() => getInitialMonthYear(), []);
  const entranceAnimation = useRef(new Animated.Value(0)).current;
  const progressAnimation = useRef(new Animated.Value(0)).current;
  const [adminError, setAdminError] = useState('');
  const [adminEntryCount, setAdminEntryCount] = useState(0);
  const [adminPositiveEntryCount, setAdminPositiveEntryCount] = useState(0);
  const [adminSlices, setAdminSlices] = useState<ProfitSlice[]>([]);
  const [isLoadingAdminChart, setIsLoadingAdminChart] = useState(false);
  const [isLoadingUserProgress, setIsLoadingUserProgress] = useState(false);
  const [isLoadingTarget, setIsLoadingTarget] = useState(false);
  const [month, setMonth] = useState(initialMonthYear.month);
  const [pickerType, setPickerType] = useState<'month' | 'year' | null>(null);
  const [target, setTarget] = useState<TargetRecord | null>(null);
  const [targetError, setTargetError] = useState('');
  const [userEntries, setUserEntries] = useState<ValueEntryRecord[]>([]);
  const [userProgressError, setUserProgressError] = useState('');
  const [year, setYear] = useState(initialMonthYear.year);
  const yearOptions = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 7 }, (_, index) => currentYear - 3 + index);
  }, []);
  const totalProfit = useMemo(
    () => adminSlices.reduce((sum, slice) => sum + slice.value, 0),
    [adminSlices],
  );
  const filteredUserEntries = useMemo(
    () =>
      userEntries.filter(entry => {
        const entryDate = new Date(`${entry.entryDate}T00:00:00`);
        return (
          entryDate.getMonth() + 1 === month &&
          entryDate.getFullYear() === year
        );
      }),
    [month, userEntries, year],
  );
  const currentNetProfit = useMemo(
    () =>
      filteredUserEntries.reduce((sum, entry) => sum + entry.netProfit, 0),
    [filteredUserEntries],
  );
  const targetAmount = target?.amount ?? 0;
  const normalizedNetProfit = Math.max(currentNetProfit, 0);
  const targetCompletionRatio =
    targetAmount > 0 ? Math.min(normalizedNetProfit / targetAmount, 1) : 0;
  const targetCompletionPercent = Math.round(targetCompletionRatio * 100);
  const earnedVariableSalary = Math.round(user.variableSalary * targetCompletionRatio);
  const remainingVariableSalary = Math.max(user.variableSalary - earnedVariableSalary, 0);
  const currentSalary = user.fixedSalary + earnedVariableSalary;
  const salaryChartTotal =
    user.fixedSalary + earnedVariableSalary + remainingVariableSalary > 0
      ? user.fixedSalary + earnedVariableSalary + remainingVariableSalary
      : 1;
  const salarySlices = useMemo<SalarySlice[]>(
    () =>
      [
        {
          color: '#111827',
          label: 'Fixed Pay',
          value: user.fixedSalary,
        },
        {
          color: '#dc2626',
          label: 'Unlocked Variable',
          value: earnedVariableSalary,
        },
        {
          color: '#fda4af',
          label: 'Remaining Variable',
          value: remainingVariableSalary,
        },
      ].filter(slice => slice.value > 0),
    [earnedVariableSalary, remainingVariableSalary, user.fixedSalary],
  );
  const milestonePercents = [20, 40, 60, 80, 100];
  const animatedProgressWidth = progressAnimation.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  });
  const progressFillAnimatedStyle = {
    width: targetAmount > 0 ? animatedProgressWidth : '0%',
  };
  const chartCardAnimatedStyle = {
    opacity: entranceAnimation.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 1],
    }),
    transform: [
      {
        translateY: entranceAnimation.interpolate({
          inputRange: [0, 1],
          outputRange: [26, 0],
        }),
      },
      {
        scale: entranceAnimation.interpolate({
          inputRange: [0, 1],
          outputRange: [0.92, 1],
        }),
      },
    ],
  };
  const progressCardAnimatedStyle = {
    opacity: entranceAnimation,
    transform: [
      {
        translateY: entranceAnimation.interpolate({
          inputRange: [0, 1],
          outputRange: [34, 0],
        }),
      },
    ],
  };
  const filterCardAnimatedStyle = {
    opacity: entranceAnimation.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 1],
    }),
    transform: [
      {
        translateY: entranceAnimation.interpolate({
          inputRange: [0, 1],
          outputRange: [18, 0],
        }),
      },
    ],
  };

  const loadAdminChart = useCallback(async () => {
    if (!isAdmin) {
      return;
    }

    try {
      setIsLoadingAdminChart(true);
      setAdminError('');
      const entries = await fetchValueEntries(token);
      setAdminEntryCount(entries.length);
      setAdminPositiveEntryCount(entries.filter(entry => entry.netProfit > 0).length);
      const totals = new Map<string, number>();

      entries.forEach(entry => {
        if (entry.netProfit <= 0) {
          return;
        }

        const currentProfit = totals.get(entry.username) ?? 0;
        totals.set(entry.username, currentProfit + entry.netProfit);
      });

      const sortedSlices = Array.from(totals.entries())
        .sort((first, second) => second[1] - first[1])
        .map(([label, value], index, source) => ({
          color: chartColors[index % chartColors.length],
          label,
          percentage: source.length
            ? Number(((value / source.reduce((sum, [, amount]) => sum + amount, 0)) * 100).toFixed(1))
            : 0,
          value,
        }));

      setAdminSlices(sortedSlices);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unable to load profit chart.';
      setAdminError(message);
    } finally {
      setIsLoadingAdminChart(false);
    }
  }, [isAdmin, token]);

  const loadTarget = useCallback(async () => {
    if (isAdmin) {
      return;
    }

    try {
      setIsLoadingTarget(true);
      setTargetError('');
      const data = await fetchMyTarget(token, month, year);
      setTarget(data);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unable to load target.';
      setTargetError(message);
    } finally {
      setIsLoadingTarget(false);
    }
  }, [isAdmin, month, token, year]);

  const loadUserProgress = useCallback(async () => {
    if (isAdmin) {
      return;
    }

    try {
      setIsLoadingUserProgress(true);
      setUserProgressError('');
      const entries = await fetchValueEntries(token);
      setUserEntries(entries);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unable to load salary progress.';
      setUserProgressError(message);
    } finally {
      setIsLoadingUserProgress(false);
    }
  }, [isAdmin, token]);

  useEffect(() => {
    if (!isActive) {
      return;
    }

    loadTarget().catch(() => {
      // loadTarget already stores a user-facing error message in state.
    });
  }, [isActive, loadTarget, refreshSignal]);

  useEffect(() => {
    if (!isActive) {
      return;
    }

    loadUserProgress().catch(() => {
      // loadUserProgress already stores a user-facing error message in state.
    });
  }, [isActive, loadUserProgress, refreshSignal]);

  useEffect(() => {
    if (!isActive) {
      return;
    }

    loadAdminChart().catch(() => {
      // loadAdminChart already stores a user-facing error message in state.
    });
  }, [isActive, loadAdminChart, refreshSignal]);

  useEffect(() => {
    if (isAdmin || !isActive) {
      return;
    }

    entranceAnimation.setValue(0);
    Animated.timing(entranceAnimation, {
      duration: 700,
      easing: Easing.out(Easing.cubic),
      toValue: 1,
      useNativeDriver: true,
    }).start();
  }, [entranceAnimation, isActive, isAdmin, month, year]);

  useEffect(() => {
    if (isAdmin) {
      return;
    }

    Animated.timing(progressAnimation, {
      duration: 850,
      easing: Easing.out(Easing.cubic),
      toValue: targetCompletionPercent,
      useNativeDriver: false,
    }).start();
  }, [isAdmin, progressAnimation, targetCompletionPercent]);

  const pickerTitle = pickerType === 'month' ? 'Select Month' : 'Select Year';

  if (isAdmin) {
    let currentAngle = 0;

    return (
      <View style={styles.adminWrap}>
        <View style={styles.adminOverviewCard}>
          <Text style={styles.adminOverviewEyebrow}>Admin Home</Text>
          <Text style={styles.adminOverviewTitle}>Business Snapshot</Text>
          <Text style={styles.adminOverviewSubtitle}>
            A cleaner summary of profit movement and contributor activity.
          </Text>

          <View style={styles.adminStatGrid}>
            <View style={styles.adminStatCard}>
              <Text style={styles.adminStatLabel}>Net Profit</Text>
              <Text style={styles.adminStatValue}>
                Rs. {Math.round(totalProfit).toLocaleString('en-IN')}
              </Text>
            </View>
            <View style={styles.adminStatCard}>
              <Text style={styles.adminStatLabel}>Total Entries</Text>
              <Text style={styles.adminStatValue}>{adminEntryCount}</Text>
            </View>
            <View style={styles.adminStatCard}>
              <Text style={styles.adminStatLabel}>Positive Entries</Text>
              <Text style={styles.adminStatValue}>{adminPositiveEntryCount}</Text>
            </View>
          </View>
        </View>

        <View style={styles.adminProfitCard}>
          <View style={styles.adminSectionHeader}>
            <View>
              <Text style={styles.homeTitle}>Profit Overview</Text>
              <Text style={styles.homeSubtitle}>
                Contribution share across all users.
              </Text>
            </View>
            <View style={styles.adminUsersPill}>
              <Text style={styles.adminUsersPillText}>{adminSlices.length} users</Text>
            </View>
          </View>

          {isLoadingAdminChart ? (
            <View style={styles.loadingState}>
              <ActivityIndicator color="#dc2626" />
              <Text style={styles.loadingText}>Loading chart...</Text>
            </View>
          ) : adminError ? (
            <Text style={styles.errorText}>{adminError}</Text>
          ) : adminSlices.length ? (
            <>
              <View style={styles.adminProfitLayout}>
                <View style={styles.adminPiePanel}>
                  <Svg height={220} width={220} viewBox="0 0 220 220">
                    <Circle cx="110" cy="110" fill="#fff4f2" r="84" />
                    {adminSlices.map(slice => {
                      const sweepAngle = (slice.percentage / 100) * 360;
                      const path = buildSlicePath(110, 110, 84, currentAngle, currentAngle + sweepAngle);
                      currentAngle += sweepAngle;

                      return <Path key={slice.label} d={path} fill={slice.color} />;
                    })}
                    <Circle cx="110" cy="110" fill="#ffffff" r="44" />
                  </Svg>
                  <View style={styles.adminChartCenter}>
                    <Text style={styles.adminChartCenterCurrency}>Rs.</Text>
                    <Text style={styles.adminChartCenterValue}>
                      {Math.round(totalProfit).toLocaleString('en-IN')}
                    </Text>
                    <Text style={styles.adminChartCenterLabel}>Net Profit</Text>
                  </View>
                </View>
              </View>

              <View style={styles.adminLegendList}>
                {adminSlices.map(slice => (
                  <View key={slice.label} style={styles.adminLegendRow}>
                    <View style={styles.legendUserWrap}>
                      <View style={[styles.adminLegendDot, { backgroundColor: slice.color }]} />
                      <Text style={styles.adminLegendLabel}>{slice.label}</Text>
                    </View>
                    <View style={styles.legendValues}>
                      <Text style={styles.adminLegendPercentage}>{slice.percentage}%</Text>
                      <Text style={styles.adminLegendAmount}>
                        Rs. {Math.round(slice.value).toLocaleString('en-IN')}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            </>
          ) : (
            <View style={styles.homePlaceholder}>
              <Text style={styles.homePlaceholderText}>
                No positive net profit entries available yet
              </Text>
            </View>
          )}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.userHomeScreen}>
      <Animated.View style={[styles.executiveHeroCard, filterCardAnimatedStyle]}>
        <View style={styles.executiveHeroGlowPrimary} />
        <View style={styles.executiveHeroGlowSecondary} />

        <View style={styles.executiveHeroHeader}>
          <View style={styles.executiveEyebrowWrap}>
            <Text style={styles.executiveEyebrow}>Performance Deck</Text>
          </View>
          <Text style={styles.executiveMonthLabel}>
            {monthLabels[month - 1]} {year}
          </Text>
        </View>

        <Text style={styles.executiveHeroTitle}>Salary Overview</Text>
        <Text style={styles.executiveHeroSubtitle}>
          Track your monthly target, net profit, and compensation snapshot in one clean view.
        </Text>

        <View style={styles.executiveTopMetricRow}>
          <View style={styles.executiveSalaryCard}>
            <Text style={styles.executiveSalaryValue}>
              Rs. {Math.round(currentSalary).toLocaleString('en-IN')}
            </Text>
            <Text style={styles.executiveSalaryLabel}>Current Salary</Text>
          </View>

          <View style={styles.executiveMetricCard}>
            <Text style={styles.executiveMetricLabel}>Target Amount</Text>
            <Text style={styles.executiveMetricValue}>
              Rs. {Math.round(targetAmount).toLocaleString('en-IN')}
            </Text>
          </View>
        </View>

        <View style={styles.executiveFilterPanel}>
          <View style={styles.filterControl}>
            <Text style={[styles.filterLabel, styles.executiveFilterLabel]}>Month</Text>
            <Pressable
              onPress={() => setPickerType('month')}
              style={[styles.selectField, styles.executiveSelectField]}>
              <Text style={[styles.selectFieldValue, styles.executiveSelectFieldValue]}>
                {monthLabels[month - 1]}
              </Text>
              <Text style={[styles.selectFieldChevron, styles.executiveSelectFieldChevron]}>v</Text>
            </Pressable>
          </View>

          <View style={styles.filterControl}>
            <Text style={[styles.filterLabel, styles.executiveFilterLabel]}>Year</Text>
            <Pressable
              onPress={() => setPickerType('year')}
              style={[styles.selectField, styles.executiveSelectField]}>
              <Text style={[styles.selectFieldValue, styles.executiveSelectFieldValue]}>{year}</Text>
              <Text style={[styles.selectFieldChevron, styles.executiveSelectFieldChevron]}>v</Text>
            </Pressable>
          </View>
        </View>
      </Animated.View>

      {isLoadingTarget || isLoadingUserProgress ? (
        <View style={styles.loadingState}>
          <ActivityIndicator color="#dc2626" />
          <Text style={styles.loadingText}>Loading your salary progress...</Text>
        </View>
      ) : targetError || userProgressError ? (
        <Text style={styles.errorText}>{targetError || userProgressError}</Text>
      ) : (
        <>
          <Animated.View style={[styles.userDashboardCard, chartCardAnimatedStyle]}>
            <View style={styles.salarySpotlightGlowLarge} />
            <View style={styles.salarySpotlightGlowSmall} />

            <View style={styles.userDashboardHeader}>
              <View>
                <Text style={styles.salarySpotlightEyebrow}>Compensation Breakdown</Text>
                <Text style={styles.salarySpotlightTitle}>Monthly Salary Parts</Text>
                <Text style={styles.salarySpotlightSubtitle}>
                  Each amount is shown once here so the page stays clear and easy to read.
                </Text>
              </View>
            </View>

            <View style={styles.userDashboardContent}>
              <View style={styles.chartWrap}>
                <View style={styles.chartHalo} />
                <Svg height={220} width={220} viewBox="0 0 220 220">
                  <Circle cx="110" cy="110" fill="#fff1ee" r="86" />
                  {(() => {
                    let currentAngle = 0;

                    return salarySlices.map(slice => {
                      const sweepAngle = (slice.value / salaryChartTotal) * 360;
                      const path = buildSlicePath(
                        110,
                        110,
                        84,
                        currentAngle,
                        currentAngle + sweepAngle,
                      );
                      currentAngle += sweepAngle;

                      return <Path key={slice.label} d={path} fill={slice.color} />;
                    });
                  })()}
                  <Circle cx="110" cy="110" fill="#ffffff" r="48" />
                </Svg>
                <View style={styles.chartCenter}>
                  <Text style={styles.chartCenterTitle}>Salary</Text>
                  <Text style={styles.chartCenterSubtitle}>Mix</Text>
                </View>
              </View>

              <View style={styles.salaryLegendList}>
                {salarySlices.map(slice => (
                  <View key={slice.label} style={styles.legendRow}>
                    <View style={styles.legendUserWrap}>
                      <View style={[styles.legendDot, { backgroundColor: slice.color }]} />
                      <Text style={styles.legendLabel}>{slice.label}</Text>
                    </View>
                    <Text style={styles.legendAmount}>
                      Rs. {Math.round(slice.value).toLocaleString('en-IN')}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          </Animated.View>

          <Animated.View style={[styles.userProgressCard, progressCardAnimatedStyle]}>
            <View style={styles.userProgressHeader}>
              <View>
                <Text style={styles.userProgressTitle}>Target Progress</Text>
                <Text style={styles.userProgressSubtitle}>
                  Monthly progress against your assigned target.
                </Text>
              </View>
              <View style={styles.progressPercentBadge}>
                <Text style={styles.progressPercentValue}>{targetCompletionPercent}%</Text>
              </View>
            </View>

            <View style={styles.progressBarTrack}>
              <Animated.View
                style={[
                  styles.progressBarFill,
                  progressFillAnimatedStyle,
                ]}
              />
            </View>

            <View style={styles.milestoneRow}>
              {milestonePercents.map(percent => {
                const isReached = targetCompletionPercent >= percent;

                return (
                  <View
                    key={percent}
                    style={[
                      styles.milestonePill,
                      isReached && styles.milestonePillActive,
                    ]}>
                    <Text
                      style={[
                        styles.milestonePillText,
                        isReached && styles.milestonePillTextActive,
                      ]}>
                      {percent}%
                    </Text>
                  </View>
                );
              })}
            </View>

            <View style={styles.insightGrid}>
              <View style={styles.insightTile}>
                <Text style={styles.insightTileLabel}>Target Left</Text>
                <Text style={styles.insightTileValue}>
                  Rs. {Math.max(targetAmount - normalizedNetProfit, 0).toLocaleString('en-IN')}
                </Text>
              </View>
              <View style={styles.insightTile}>
                <Text style={styles.insightTileLabel}>Target Amount</Text>
                <Text style={styles.insightTileValue}>
                  Rs. {Math.round(targetAmount).toLocaleString('en-IN')}
                </Text>
              </View>
            </View>
          </Animated.View>
        </>
      )}

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
                <Text style={styles.pickerCloseText}>x</Text>
              </Pressable>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              style={styles.pickerScroll}
              contentContainerStyle={styles.pickerScrollContent}>
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
                          styles.optionRow,
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
                : yearOptions.map(optionYear => {
                    const isSelected = optionYear === year;

                    return (
                      <Pressable
                        key={optionYear}
                        onPress={() => {
                          setYear(optionYear);
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
                          {optionYear}
                        </Text>
                      </Pressable>
                    );
                  })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  adminWrap: {
    gap: 18,
  },
  adminOverviewCard: {
    backgroundColor: '#ffffff',
    borderColor: '#fecaca',
    borderRadius: 30,
    borderWidth: 1,
    padding: 20,
  },
  adminOverviewEyebrow: {
    color: '#b91c1c',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  adminOverviewTitle: {
    color: '#111827',
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: -0.6,
    marginBottom: 8,
  },
  adminOverviewSubtitle: {
    color: '#6b7280',
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 18,
    maxWidth: 280,
  },
  adminStatGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  adminStatCard: {
    backgroundColor: '#fff7f5',
    borderColor: '#fee2e2',
    borderRadius: 20,
    borderWidth: 1,
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 14,
  },
  adminStatLabel: {
    color: '#9a3412',
    fontSize: 10,
    fontWeight: '700',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  adminStatValue: {
    color: '#111827',
    fontSize: 16,
    fontWeight: '800',
  },
  userHomeScreen: {
    gap: 18,
    marginBottom: 20,
  },
  homeCard: {
    backgroundColor: '#ffffff',
    borderColor: '#fecaca',
    borderRadius: 28,
    borderWidth: 1,
    padding: 24,
  },
  adminProfitCard: {
    backgroundColor: '#ffffff',
    borderColor: '#fecaca',
    borderRadius: 30,
    borderWidth: 1,
    padding: 20,
  },
  adminSectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  adminUsersPill: {
    backgroundColor: '#fff1ee',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  adminUsersPillText: {
    color: '#b91c1c',
    fontSize: 12,
    fontWeight: '700',
  },
  userHomeCard: {
    backgroundColor: '#fff7f2',
    borderColor: '#fbd5cf',
    overflow: 'hidden',
    padding: 18,
  },
  executiveHeroCard: {
    backgroundColor: '#fff7f5',
    borderColor: '#fecaca',
    borderRadius: 32,
    borderWidth: 1,
    overflow: 'hidden',
    padding: 20,
    position: 'relative',
  },
  executiveHeroGlowPrimary: {
    backgroundColor: 'rgba(220, 38, 38, 0.12)',
    borderRadius: 999,
    height: 220,
    position: 'absolute',
    right: -50,
    top: -70,
    width: 220,
  },
  executiveHeroGlowSecondary: {
    backgroundColor: 'rgba(251, 113, 133, 0.16)',
    borderRadius: 999,
    height: 140,
    left: -30,
    position: 'absolute',
    top: 140,
    width: 140,
  },
  executiveHeroHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  executiveEyebrowWrap: {
    backgroundColor: '#fff1ee',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  executiveEyebrow: {
    color: '#b91c1c',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.7,
    textTransform: 'uppercase',
  },
  executiveMonthLabel: {
    color: '#7c2d12',
    fontSize: 13,
    fontWeight: '600',
  },
  executiveHeroTitle: {
    color: '#111827',
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: -0.7,
    marginBottom: 8,
    maxWidth: 220,
  },
  executiveHeroSubtitle: {
    color: '#6b7280',
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 14,
    maxWidth: 300,
  },
  executiveTopMetricRow: {
    alignItems: 'stretch',
    flexDirection: 'row',
    gap: 12,
    marginBottom: 18,
  },
  executiveSalaryCard: {
    flex: 1.15,
  },
  executiveSalaryValue: {
    color: '#dc2626',
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -0.8,
    marginBottom: 4,
  },
  executiveSalaryLabel: {
    color: '#7c2d12',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 18,
    textTransform: 'uppercase',
  },
  executiveMetricRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 18,
  },
  executiveMetricCard: {
    backgroundColor: '#fffdfc',
    borderColor: '#fbd5cf',
    borderRadius: 22,
    borderWidth: 1,
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 14,
    paddingVertical: 15,
  },
  executiveMetricLabel: {
    color: '#9a3412',
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  executiveMetricValue: {
    color: '#111827',
    fontSize: 18,
    fontWeight: '800',
  },
  executiveFilterPanel: {
    backgroundColor: '#ffffff',
    borderColor: '#fbd5cf',
    borderRadius: 24,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    padding: 14,
  },
  userHomeHeader: {
    marginBottom: 14,
  },
  homeTitle: {
    color: '#111827',
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  homeSubtitle: {
    color: '#7c2d12',
    fontSize: 13,
    fontWeight: '600',
  },
  filterRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 18,
  },
  userFilterRow: {
    backgroundColor: '#fffdfc',
    borderColor: '#fbd5cf',
    borderRadius: 22,
    borderWidth: 1,
    marginBottom: 18,
    padding: 14,
  },
  filterControl: {
    flex: 1,
  },
  filterLabel: {
    color: '#9a3412',
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 7,
    textTransform: 'uppercase',
  },
  selectField: {
    backgroundColor: '#fff7f5',
    borderColor: '#fcd8d1',
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingVertical: 13,
  },
  selectFieldValue: {
    color: '#111827',
    fontSize: 14,
    fontWeight: '800',
  },
  selectFieldChevron: {
    color: '#b91c1c',
    fontSize: 14,
    fontWeight: '700',
  },
  executiveFilterLabel: {
    color: '#9a3412',
  },
  executiveSelectField: {
    backgroundColor: '#fff7f5',
    borderColor: '#fcd8d1',
  },
  executiveSelectFieldValue: {
    color: '#111827',
  },
  executiveSelectFieldChevron: {
    color: '#b91c1c',
  },
  loadingState: {
    alignItems: 'center',
    paddingVertical: 28,
  },
  loadingText: {
    color: '#6b7280',
    marginTop: 10,
  },
  targetCard: {
    alignItems: 'center',
    backgroundColor: '#fff7f5',
    borderColor: '#fee2e2',
    borderRadius: 22,
    borderWidth: 1,
    paddingHorizontal: 20,
    paddingVertical: 30,
  },
  targetMonthLabel: {
    color: '#b91c1c',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  targetAmount: {
    color: '#111827',
    fontSize: 30,
    fontWeight: '800',
    marginBottom: 10,
  },
  targetUserText: {
    color: '#6b7280',
    fontSize: 14,
    fontWeight: '600',
  },
  homePlaceholder: {
    alignItems: 'center',
    backgroundColor: '#fff7f5',
    borderColor: '#fee2e2',
    borderRadius: 22,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 220,
  },
  homePlaceholderText: {
    color: '#6b7280',
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
  },
  errorText: {
    color: '#b91c1c',
    fontSize: 14,
  },
  chartSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  adminProfitLayout: {
    gap: 16,
    marginBottom: 18,
  },
  adminPiePanel: {
    alignItems: 'center',
    backgroundColor: '#fff8f6',
    borderColor: '#fee2e2',
    borderRadius: 28,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 252,
    paddingVertical: 16,
    position: 'relative',
  },
  adminChartCenter: {
    alignItems: 'center',
    position: 'absolute',
  },
  adminChartCenterValue: {
    color: '#111827',
    fontSize: 18,
    fontWeight: '800',
    maxWidth: 92,
    textAlign: 'center',
  },
  adminChartCenterCurrency: {
    color: '#b91c1c',
    fontSize: 11,
    fontWeight: '800',
    marginBottom: 2,
    textTransform: 'uppercase',
  },
  adminChartCenterLabel: {
    color: '#b91c1c',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 4,
    textTransform: 'uppercase',
  },
  adminLegendList: {
    borderTopColor: '#fee2e2',
    borderTopWidth: 1,
    marginTop: 2,
    paddingTop: 10,
  },
  adminLegendRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  adminLegendDot: {
    borderRadius: 999,
    height: 12,
    marginRight: 10,
    width: 12,
  },
  adminLegendLabel: {
    color: '#111827',
    fontSize: 14,
    fontWeight: '700',
  },
  adminLegendPercentage: {
    color: '#b91c1c',
    fontSize: 14,
    fontWeight: '800',
  },
  adminLegendAmount: {
    color: '#6b7280',
    fontSize: 12,
    marginTop: 2,
  },
  userDashboardCard: {
    backgroundColor: '#ffffff',
    borderColor: '#fecaca',
    borderRadius: 34,
    borderWidth: 1,
    overflow: 'hidden',
    paddingHorizontal: 18,
    paddingVertical: 20,
    position: 'relative',
    shadowColor: '#b91c1c',
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.08,
    shadowRadius: 28,
  },
  userDashboardHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  userDashboardContent: {
    gap: 18,
  },
  salarySpotlightGlowLarge: {
    backgroundColor: 'rgba(220, 38, 38, 0.09)',
    borderRadius: 999,
    height: 220,
    position: 'absolute',
    right: -30,
    top: -70,
    width: 220,
  },
  salarySpotlightGlowSmall: {
    backgroundColor: 'rgba(251, 113, 133, 0.14)',
    borderRadius: 999,
    height: 120,
    left: -36,
    position: 'absolute',
    top: 156,
    width: 120,
  },
  salarySpotlightEyebrow: {
    color: '#b91c1c',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  salarySpotlightTitle: {
    color: '#111827',
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.6,
  },
  salarySpotlightSubtitle: {
    color: '#6b7280',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 8,
    maxWidth: 240,
  },
  userSummaryRow: {
    flexDirection: 'row',
    gap: 10,
  },
  executiveStatsGrid: {
    gap: 10,
  },
  compensationGrid: {
    gap: 10,
  },
  chartWrap: {
    alignItems: 'center',
    backgroundColor: '#fff8f6',
    borderColor: '#fee2e2',
    borderRadius: 28,
    borderWidth: 1,
    justifyContent: 'center',
    paddingVertical: 16,
    position: 'relative',
  },
  chartHalo: {
    backgroundColor: '#ffffff',
    borderRadius: 999,
    height: 186,
    position: 'absolute',
    width: 186,
  },
  chartCenter: {
    alignItems: 'center',
    position: 'absolute',
  },
  chartCenterTitle: {
    color: '#111827',
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
  },
  chartCenterSubtitle: {
    color: '#b91c1c',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 4,
    textTransform: 'uppercase',
  },
  userProgressCard: {
    backgroundColor: '#fffdfc',
    borderColor: '#fecaca',
    borderRadius: 24,
    borderWidth: 1,
    padding: 18,
  },
  dashboardDivider: {
    backgroundColor: '#fcd8d1',
    height: 1,
  },
  userProgressHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  userProgressTitle: {
    color: '#111827',
    fontSize: 18,
    fontWeight: '800',
  },
  userProgressSubtitle: {
    color: '#6b7280',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
    maxWidth: 220,
  },
  targetAmountInline: {
    color: '#8b5e34',
    fontSize: 17,
    fontWeight: '800',
  },
  progressPercentBadge: {
    alignItems: 'center',
    backgroundColor: '#111827',
    borderRadius: 18,
    justifyContent: 'center',
    minWidth: 72,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  progressPercentValue: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '800',
  },
  progressBarTrack: {
    backgroundColor: '#fee2e2',
    borderRadius: 999,
    height: 14,
    marginBottom: 14,
    overflow: 'hidden',
  },
  progressBarFill: {
    backgroundColor: '#dc2626',
    borderRadius: 999,
    height: '100%',
  },
  milestoneRow: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  milestonePill: {
    backgroundColor: '#ffffff',
    borderColor: '#f1d3cc',
    borderRadius: 999,
    borderWidth: 1,
    flex: 1,
    paddingVertical: 8,
  },
  milestonePillActive: {
    backgroundColor: '#dc2626',
    borderColor: '#dc2626',
  },
  milestonePillText: {
    color: '#6b7280',
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
  },
  milestonePillTextActive: {
    color: '#ffffff',
  },
  salaryLegendList: {
    borderTopColor: '#22314c',
    borderTopWidth: 1,
    marginTop: 2,
    paddingTop: 8,
  },
  insightGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  insightTile: {
    backgroundColor: '#fff8f6',
    borderColor: '#fee2e2',
    borderRadius: 18,
    borderWidth: 1,
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  insightTileLabel: {
    color: '#9a3412',
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  insightTileValue: {
    color: '#111827',
    fontSize: 15,
    fontWeight: '800',
  },
  legendList: {
    borderTopColor: '#fee2e2',
    borderTopWidth: 1,
    marginTop: 2,
    paddingTop: 10,
  },
  legendRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  legendUserWrap: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    paddingRight: 12,
  },
  legendDot: {
    borderRadius: 999,
    height: 12,
    marginRight: 10,
    width: 12,
  },
  legendLabel: {
    color: '#111827',
    fontSize: 14,
    fontWeight: '700',
  },
  legendValues: {
    alignItems: 'flex-end',
  },
  legendPercentage: {
    color: '#b91c1c',
    fontSize: 14,
    fontWeight: '800',
  },
  legendAmount: {
    color: '#6b7280',
    fontSize: 12,
    marginTop: 2,
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
  pickerCloseText: {
    color: '#7f1d1d',
    fontSize: 14,
    fontWeight: '700',
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
});
