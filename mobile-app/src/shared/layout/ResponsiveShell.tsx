import React, { ReactNode } from "react";
import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Home,
  ListChecks,
  Wrench,
  MapPin,
  Bell,
  IdCard,
  BarChart3,
  AlertCircle,
  Building,
  LineChart,
  Stamp,
  Route,
  Satellite,
  TriangleAlert,
  Wallet,
  ChartColumn,
  Users,
  Sliders,
  Circle,
  UserCog,
  Briefcase,
  Crown,
} from "lucide-react-native";
import { useApp } from "../../context/AppContext";
import { ROLES } from "../../data/mockData";
import { pageIcon } from "../../theme/styleMaps";
import { colors, fontSize, spacing } from "../../theme/theme";

const TABLET_BREAKPOINT = 768;

const iconMap: Record<string, React.ComponentType<any>> = {
  Home, ListChecks, Wrench, MapPin, Bell, IdCard,
  BarChart3, AlertCircle, Building, LineChart, Stamp,
  Route, Satellite, TriangleAlert, Wallet, ChartColumn,
  Users, Sliders, Circle,
};

const roleIconMap: Record<string, React.ComponentType<any>> = {
  UserCog, Briefcase, Crown,
};

interface Props {
  children: ReactNode;
  isTablet: boolean;
}

export function ResponsiveShell({ children, isTablet }: Props) {
  if (!isTablet) {
    return <View style={{ flex: 1 }}>{children}</View>;
  }

  return <TabletLayout>{children}</TabletLayout>;
}

function TabletLayout({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();
  const { state, currentUser, getBranch, setPage, openFormModal } = useApp();
  const role = ROLES[state.role];
  const branch = getBranch(currentUser.branchId);

  const roleIconName = (() => {
    const map: Record<string, string> = { lc: "UserCog", branchManager: "Briefcase", rm: "Crown" };
    return map[state.role] || "Circle";
  })();
  const RoleIcon = roleIconMap[roleIconName] || Circle;

  return (
    <View style={{ flex: 1, flexDirection: "row", backgroundColor: "#EEF2F7" }}>
      {/* Sidebar */}
      <View
        style={{
          width: 260,
          paddingTop: insets.top,
          paddingBottom: insets.bottom,
          paddingHorizontal: spacing.lg,
        }}
      >
        <View
          style={{
            flex: 1,
            borderRadius: 32,
            backgroundColor: "rgba(255,255,255,0.94)",
            borderWidth: 1,
            borderColor: "rgba(255,255,255,0.6)",
            padding: spacing["3xl"],
            shadowColor: "rgba(0,91,172,0.06)",
            shadowOffset: { width: 0, height: 20 },
            shadowOpacity: 1,
            shadowRadius: 60,
            elevation: 8,
          }}
        >
          {/* Profile card */}
          <View
            style={{
              borderRadius: 28,
              backgroundColor: colors.slate900,
              padding: spacing["3xl"],
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <View
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 16,
                  backgroundColor: "rgba(255,255,255,0.1)",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <RoleIcon size={20} color={colors.white} strokeWidth={1.8} />
              </View>
              <View
                style={{
                  borderRadius: 999,
                  backgroundColor: "rgba(255,255,255,0.1)",
                  paddingHorizontal: spacing.md,
                  paddingVertical: spacing.xs,
                }}
              >
                <Text style={{ fontSize: fontSize.xs, fontWeight: "600", color: colors.white }}>
                  {role.name}
                </Text>
              </View>
            </View>

            <Text
              style={{
                marginTop: spacing["3xl"],
                fontSize: fontSize.xl,
                fontWeight: "800",
                color: colors.white,
                letterSpacing: -0.3,
              }}
            >
              {currentUser.name}
            </Text>
            <Text style={{ marginTop: spacing.xs, fontSize: fontSize.sm, color: colors.slate300 }}>
              {currentUser.position}
            </Text>

            {branch ? (
              <View
                style={{
                  marginTop: spacing["3xl"],
                  borderRadius: 16,
                  backgroundColor: "rgba(255,255,255,0.1)",
                  paddingHorizontal: spacing.xl,
                  paddingVertical: spacing.lg,
                }}
              >
                <Text style={{ fontSize: fontSize.sm, color: colors.slate200 }}>{branch.name}</Text>
                <Text style={{ fontSize: fontSize.xs, color: colors.slate300, marginTop: spacing.xs }}>
                  Geo radius {branch.geoRadius}m | Shift {branch.shiftWindow}
                </Text>
              </View>
            ) : null}
          </View>

          {/* Nav items */}
          <ScrollView
            showsVerticalScrollIndicator={false}
            style={{ marginTop: spacing["3xl"] }}
            contentContainerStyle={{ gap: spacing.xs }}
          >
            {role.pages.map((page) => {
              const isActive = state.page === page.id;
              const iconName = pageIcon(page.id);
              const Icon = iconMap[iconName] || Circle;

              return (
                <TouchableOpacity
                  key={page.id}
                  onPress={() => setPage(page.id)}
                  activeOpacity={0.7}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: spacing.md,
                    paddingHorizontal: spacing.xl,
                    paddingVertical: spacing.lg,
                    borderRadius: 16,
                    backgroundColor: isActive ? colors.slate900 : colors.white,
                    borderWidth: isActive ? 0 : 1,
                    borderColor: isActive ? "transparent" : "rgba(255,255,255,0.7)",
                    ...(isActive
                      ? {
                          shadowColor: colors.slate900,
                          shadowOffset: { width: 0, height: 4 },
                          shadowOpacity: 0.3,
                          shadowRadius: 8,
                          elevation: 4,
                        }
                      : {}),
                  }}
                >
                  <Icon size={18} color={isActive ? colors.white : colors.slate500} strokeWidth={1.8} />
                  <Text
                    style={{
                      fontSize: fontSize.sm,
                      fontWeight: "600",
                      color: isActive ? colors.white : colors.slate600,
                    }}
                  >
                    {page.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

        
        </View>
      </View>

      {/* Content area */}
      <View style={{ flex: 1 }}>{children}</View>
    </View>
  );
}
