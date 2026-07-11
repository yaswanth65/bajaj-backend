import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, ScrollView, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Home, ListChecks, Wrench, MapPin, Bell, IdCard, BarChart3, AlertCircle, Building, LineChart, Stamp, Route, TriangleAlert, Wallet, ChartColumn, Users, Circle } from "lucide-react-native";
import { useApp } from "../context/AppContext";
import { ROLES } from "../data/mockData";
import { colors, fontSize } from "../theme/theme";
import { pageIcon, roleAccent } from "../theme/styleMaps";
import { TopBar } from "../shared/layout/TopBar";
import { ResponsiveShell } from "../shared/layout/ResponsiveShell";
import { Toast } from "../shared/components/Toast";
import { FormModal } from "../modals/forms/FormModal";
import { AuditTrailModal } from "../modals/forms/AuditTrailModal";
import { DetailModal } from "../modals/detail/DetailModal";
import { SearchModal } from "../modals/forms/SearchModal";
import { PlaceholderScreen } from "./PlaceholderScreen";
import { LoginScreen } from "./LoginScreen";
import { RmResolveComplaintModal } from "../modals/forms/RmResolveComplaintModal";
import { AcknowledgeComplaintModal } from "../modals/forms/AcknowledgeComplaintModal";

import { LcHomeScreen } from "../roles/lc/LcHomeScreen";
import { LcTasksScreen } from "../roles/lc/LcTasksScreen";
import { LcComplaintsScreen } from "../roles/lc/LcComplaintsScreen";
import { LcBranchScreen } from "../roles/lc/LcBranchScreen";
import { LcAttendanceScreen } from "../roles/lc/LcAttendanceScreen";
import { LcNotificationsScreen } from "../roles/lc/LcNotificationsScreen";
import { LcProfileScreen } from "../roles/lc/LcProfileScreen";

import { BranchManagerHomeScreen } from "../roles/branchManager/BranchManagerHomeScreen";
import { BranchManagerBranchesScreen } from "../roles/branchManager/BranchManagerBranchesScreen";
import { BranchManagerMonitoringScreen } from "../roles/branchManager/BranchManagerMonitoringScreen";
import { BranchManagerComplaintsScreen } from "../roles/branchManager/BranchManagerComplaintsScreen";
import { BranchManagerNotificationsScreen } from "../roles/branchManager/BranchManagerNotificationsScreen";
import { BranchManagerProfileScreen } from "../roles/branchManager/BranchManagerProfileScreen";
import { BranchManagerAttendanceScreen } from "../roles/branchManager/BranchManagerAttendanceScreen";

import { RmDashboardScreen } from "../roles/rm/RmDashboardScreen";

import { RmAnalyticsScreen } from "../roles/rm/RmAnalyticsScreen";
import { UserManagementScreen } from "../roles/rm/UserManagementScreen";
import { RmUsersScreen } from "../roles/rm/RmUsersScreen";
import { RmAlertsScreen } from "../roles/rm/RmAlertsScreen";
import { RmProfileScreen } from "../roles/rm/RmProfileScreen";
import { RmAttendanceScreen } from "../roles/rm/RmAttendanceScreen";
import { RmFinanceScreen } from "../roles/rm/RmFinanceScreen";
import { RmMonitoringScreen } from "../roles/rm/RmMonitoringScreen";
import { RmComplaintCommandCenter } from "../roles/rm/RmComplaintCommandCenter";

const screenRegistry: Record<string, React.ComponentType> = {};

export function registerScreen(roleId: string, pageId: string, component: React.ComponentType) {
  screenRegistry[roleId + "_" + pageId] = component;
}

registerScreen("lc", "home", LcHomeScreen);
registerScreen("lc", "tasks", LcTasksScreen);
registerScreen("lc", "complaints", LcComplaintsScreen);
registerScreen("lc", "branch", LcBranchScreen);
registerScreen("lc", "attendance", LcAttendanceScreen);
registerScreen("lc", "notifications", LcNotificationsScreen);
registerScreen("lc", "profile", LcProfileScreen);

registerScreen("branchManager", "home", BranchManagerHomeScreen);
registerScreen("branchManager", "branches", BranchManagerBranchesScreen);
registerScreen("branchManager", "monitoring", BranchManagerMonitoringScreen);
registerScreen("branchManager", "complaints", BranchManagerComplaintsScreen);
registerScreen("branchManager", "users", RmUsersScreen);
registerScreen("branchManager", "attendance", BranchManagerAttendanceScreen);
registerScreen("branchManager", "notifications", BranchManagerNotificationsScreen);
registerScreen("branchManager", "profile", BranchManagerProfileScreen);

registerScreen("aa", "home", BranchManagerHomeScreen);
registerScreen("aa", "branches", BranchManagerBranchesScreen);
registerScreen("aa", "monitoring", BranchManagerMonitoringScreen);
registerScreen("aa", "complaints", BranchManagerComplaintsScreen);
registerScreen("aa", "attendance", BranchManagerAttendanceScreen);
registerScreen("aa", "notifications", BranchManagerNotificationsScreen);
registerScreen("aa", "profile", BranchManagerProfileScreen);

registerScreen("rm", "dashboard", RmDashboardScreen);
registerScreen("rm", "monitoring", RmMonitoringScreen);

registerScreen("rm", "finance", RmFinanceScreen);
registerScreen("rm", "complaints", RmComplaintCommandCenter);
registerScreen("rm", "analytics", RmAnalyticsScreen);
registerScreen("rm", "users", UserManagementScreen);
registerScreen("rm", "attendance", RmAttendanceScreen);
registerScreen("rm", "notifications", RmAlertsScreen);
registerScreen("rm", "profile", RmProfileScreen);
registerScreen("rm", "branches", BranchManagerBranchesScreen);


// AM mapping
registerScreen("am", "dashboard", RmDashboardScreen);
registerScreen("am", "branches", BranchManagerBranchesScreen);
registerScreen("am", "monitoring", RmMonitoringScreen);

registerScreen("am", "finance", RmFinanceScreen);
registerScreen("am", "complaints", BranchManagerComplaintsScreen);
registerScreen("am", "analytics", RmAnalyticsScreen);
registerScreen("am", "users", RmUsersScreen);
registerScreen("am", "attendance", RmAttendanceScreen);
registerScreen("am", "notifications", RmAlertsScreen);
registerScreen("am", "profile", RmProfileScreen);

// RRM mapping
registerScreen("rrm", "dashboard", RmDashboardScreen);
registerScreen("rrm", "branches", BranchManagerBranchesScreen);
registerScreen("rrm", "monitoring", RmMonitoringScreen);

registerScreen("rrm", "finance", RmFinanceScreen);
registerScreen("rrm", "complaints", RmComplaintCommandCenter);
registerScreen("rrm", "analytics", RmAnalyticsScreen);
registerScreen("rrm", "users", UserManagementScreen);
registerScreen("rrm", "attendance", RmAttendanceScreen);
registerScreen("rrm", "notifications", RmAlertsScreen);
registerScreen("rrm", "profile", RmProfileScreen);
function getScreen(roleId: string, pageId: string): React.ComponentType {
  return screenRegistry[roleId + "_" + pageId] || PlaceholderScreen;
}

const iconMap: Record<string, React.ComponentType<any>> = {
  Home, ListChecks, Wrench, MapPin, Bell, IdCard,
  BarChart3, AlertCircle, Building, LineChart, Stamp,
  Route, TriangleAlert, Wallet, ChartColumn,
  Users, Circle,
};

function GlassTabBar({ pages }: { pages: Array<{ id: string; label: string }> }) {
  const { state, setPage } = useApp();
  const insets = useSafeAreaInsets();
  const accent = roleAccent(state.role).bg;

  const compactLabel = (label: string, pageId: string) => {
    const map: Record<string, string> = {
      complaints: "Issues",
      attendance: "Attend",
      notifications: "Alerts",
      monitoring: "Monitor",
      approvals: "Approve",
    };
    return map[pageId] || label;
  };

  return (
    <View
      style={{
        position: "absolute",
        bottom: 14 + insets.bottom,
        left: 16,
        right: 16,
        alignItems: "center",
      }}
      pointerEvents="box-none"
    >
      <View
        style={{
          width: "100%",
          maxWidth: 520,
          borderRadius: 30,
          overflow: "hidden",
          borderWidth: 1,
          borderColor: "rgba(226,232,240,0.95)",
          backgroundColor: "rgba(255,255,255,0.96)",
          shadowColor: colors.slate900,
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.08,
          shadowRadius: 14,
          elevation: 6,
        }}
      >
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{
            flexDirection: "row",
            height: 66,
            alignItems: "center",
            justifyContent: "space-between",
            paddingHorizontal: 8,
            paddingVertical: 7,
            gap: 2,
          }}
        >
          {pages.map((route) => {
            const isFocused = state.page === route.id;
            const iconName = pageIcon(route.id);
            const Icon = iconMap[iconName] || Circle;
            const label = compactLabel(route.label, route.id);

            return (
              <TouchableOpacity
                key={route.id}
                onPress={() => {
                  if (!isFocused) {
                    setPage(route.id);
                  }
                }}
                activeOpacity={0.7}
                style={{
                  minWidth: isFocused ? 84 : 56,
                  alignItems: "center",
                  justifyContent: "center",
                  height: 50,
                  paddingHorizontal: isFocused ? 10 : 6,
                  borderRadius: 24,
                  backgroundColor: isFocused ? "rgba(15,23,42,0.96)" : "transparent",
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                  }}
                >
                  <View style={{ alignItems: "center", justifyContent: "center" }}>
                    <Icon
                      size={20}
                      color={isFocused ? colors.white : colors.slate500}
                      strokeWidth={isFocused ? 2.25 : 1.85}
                    />
                    {!isFocused ? (
                      <View
                        style={{
                          width: 4,
                          height: 4,
                          borderRadius: 2,
                          backgroundColor: "transparent",
                          marginTop: 3,
                        }}
                      />
                    ) : null}
                  </View>
                  {isFocused ? (
                    <View style={{ maxWidth: 74 }}>
                      <Text
                        style={{
                          fontSize: 10,
                          fontWeight: "800",
                          color: colors.white,
                          letterSpacing: 0.1,
                        }}
                        numberOfLines={1}
                      >
                        {label}
                      </Text>
                      <View
                        style={{
                          width: 18,
                          height: 3,
                          borderRadius: 99,
                          backgroundColor: accent,
                          marginTop: 4,
                        }}
                      />
                    </View>
                  ) : null}
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    </View>
  );
}

function MainTabs({ isTablet }: { isTablet: boolean }) {
  const { state, setPage } = useApp();
  const roleDef = ROLES[state.role];
  const pages = roleDef.pages;
  const currentPage = pages.some((page) => page.id === state.page) ? state.page : pages[0]?.id;
  const Screen = getScreen(state.role, currentPage);

  useEffect(() => {
    if (currentPage && currentPage !== state.page) {
      setPage(currentPage);
    }
  }, [currentPage, state.page, setPage]);

  return (
    <View style={{ flex: 1 }}>
      <Screen />
      {!isTablet ? <GlassTabBar pages={pages} /> : null}
    </View>
  );
}

export function RootNavigator() {
  const { token, state, setPage, dispatch, logout } = useApp();
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;

  const [searchModalVisible, setSearchModalVisible] = useState(false);
  const [formModalVisible, setFormModalVisible] = useState(false);
  const [auditModalVisible, setAuditModalVisible] = useState(false);
  const [resolveModal, setResolveModal] = useState<{ complaintId: string | number } | null>(null);
  const [acknowledgeModal, setAcknowledgeModal] = useState<{ complaintId: string | number } | null>(null);
  const [detailModal, setDetailModal] = useState<{ entityType: string; entityId: string } | null>(null);

  useEffect(() => {
    const type = state.modalType;
    if (!type) return;
    if (type === "form") {
      setFormModalVisible(true);
      dispatch({ type: "CLOSE_MODAL" });
    } else if (type === "audit") {
      setAuditModalVisible(true);
      dispatch({ type: "CLOSE_MODAL" });
    } else if (type === "resolveComplaint") {
      setResolveModal({ complaintId: state.modalData?.id });
      dispatch({ type: "CLOSE_MODAL" });
    } else if (type === "acknowledgeComplaint") {
      setAcknowledgeModal({ complaintId: state.modalData?.id });
      dispatch({ type: "CLOSE_MODAL" });
    } else if (["task", "complaint", "branch", "user", "appliance"].includes(type)) {
      setDetailModal({ entityType: type, entityId: state.modalData?.id });
    }
  }, [state.modalType, state.modalData]);

  if (!token) {
    return <LoginScreen />;
  }

  return (
    <View style={{ flex: 1, backgroundColor: isTablet ? "#EEF2F7" : colors.bg }}>
      <ResponsiveShell isTablet={isTablet}>
        <TopBar
          onLogoutPress={logout}
          onSearchPress={() => setSearchModalVisible(true)}
          onFormPress={() => setFormModalVisible(true)}
          onNotificationPress={() => setPage("notifications")}
          onProfilePress={() => setPage("profile")}
          onUsersPress={() => setPage("users")}
        />
        <MainTabs isTablet={isTablet} />
        <Toast />
        <FormModal visible={formModalVisible} onClose={() => setFormModalVisible(false)} />
        <AuditTrailModal visible={auditModalVisible} onClose={() => setAuditModalVisible(false)} />
        <SearchModal
          visible={searchModalVisible}
          onClose={() => setSearchModalVisible(false)}
          onSelectResult={(entityType, entityId) => setDetailModal({ entityType, entityId })}
        />
        {resolveModal ? (
          <RmResolveComplaintModal
            visible={!!resolveModal}
            onClose={() => setResolveModal(null)}
            complaintId={resolveModal.complaintId}
          />
        ) : null}
        {acknowledgeModal ? (
          <AcknowledgeComplaintModal
            visible={!!acknowledgeModal}
            onClose={() => setAcknowledgeModal(null)}
            complaintId={acknowledgeModal.complaintId}
          />
        ) : null}
        {detailModal ? (
          <DetailModal
            visible={!!detailModal}
            onClose={() => { setDetailModal(null); dispatch({ type: "CLOSE_MODAL" }); }}
            entityType={detailModal.entityType}
            entityId={detailModal.entityId}
          />
        ) : null}
      </ResponsiveShell>
    </View>
  );
}
