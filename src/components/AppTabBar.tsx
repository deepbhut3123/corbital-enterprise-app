import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

export type TabKey = 'attendance' | 'home' | 'manage' | 'profile' | 'sales' | 'targets';
export type TabIconName =
  | 'calendar'
  | 'calendar-outline'
  | 'home'
  | 'home-outline'
  | 'people'
  | 'people-outline'
  | 'flag'
  | 'flag-outline'
  | 'cash'
  | 'cash-outline'
  | 'layers'
  | 'layers-outline'
  | 'person-circle'
  | 'person-circle-outline';

export type TabItem = {
  icon: TabIconName;
  key: TabKey;
  label: string;
};

type AppTabBarProps = {
  activeTab: TabKey;
  items: TabItem[];
  onTabPress: (tab: TabKey) => void;
  paddingBottom: number;
};

export default function AppTabBar({
  activeTab,
  items,
  onTabPress,
  paddingBottom,
}: AppTabBarProps) {
  return (
    <View style={[styles.bottomTabWrap, { paddingBottom: Math.max(paddingBottom - 6, 10) }]}>
      <View style={styles.bottomTabBar}>
        {items.map(tabItem => {
          const isActive = activeTab === tabItem.key;

          return (
            <Pressable
              key={tabItem.key}
              onPress={() => onTabPress(tabItem.key)}
              style={[styles.bottomTabButton, isActive && styles.bottomTabButtonActive]}>
              <View style={[styles.iconShell, isActive && styles.iconShellActive]}>
                <Ionicons
                  color={isActive ? '#ffffff' : '#b42318'}
                  name={tabItem.icon}
                  size={18}
                />
              </View>
              <Text
                style={[styles.bottomTabLabel, isActive && styles.bottomTabLabelActive]}>
                {tabItem.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bottomTabWrap: {
    backgroundColor: 'transparent',
    paddingHorizontal: 18,
    paddingTop: 8,
  },
  bottomTabBar: {
    backgroundColor: '#fffaf9',
    borderColor: '#fecaca',
    borderRadius: 28,
    borderTopWidth: 1,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingVertical: 8,
    shadowColor: '#7f1d1d',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
  },
  bottomTabButton: {
    alignItems: 'center',
    borderRadius: 22,
    flex: 1,
    gap: 4,
    justifyContent: 'center',
    minHeight: 50,
    paddingVertical: 6,
  },
  bottomTabButtonActive: {
    backgroundColor: '#fff1ee',
  },
  iconShell: {
    alignItems: 'center',
    backgroundColor: '#ffe4e6',
    borderRadius: 14,
    height: 28,
    justifyContent: 'center',
    width: 28,
  },
  iconShellActive: {
    backgroundColor: '#dc2626',
  },
  bottomTabLabel: {
    color: '#8f1d1d',
    fontSize: 12,
    fontWeight: '600',
  },
  bottomTabLabelActive: {
    color: '#b91c1c',
    fontWeight: '700',
  },
});
