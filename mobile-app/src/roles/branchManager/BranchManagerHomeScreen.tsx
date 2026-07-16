import React, { useState } from "react";
import { View, Text, TouchableOpacity, TextInput } from "react-native";
import {
  Building,
  TriangleAlert,
  Wallet,
  Route,
  CalendarPlus,
  Stamp,
  Users,
  ChevronRight,
  MapPin,
  Calendar
} from "lucide-react-native";
import { ScreenWrapper } from "../../shared/layout/ScreenWrapper";
import { SectionHeader } from "../../shared/components/SectionHeader";
import { AlertStrip } from "../../shared/components/AlertStrip";
import { StatCard } from "../../shared/components/StatCard";
import { Card } from "../../shared/components/Card";
import { Badge } from "../../shared/components/Badge";
import { QuickButton } from "../../shared/components/QuickButton";
import { useApp } from "../../context/AppContext";
import { colors, fontSize, spacing, borderRadius } from "../../theme/theme";

export function BranchManagerHomeScreen() {
  const {
    scopedBranches,
    scopedApprovals,
    scopedNotifications,
    visits,
    scopedBranchIds,
    currentUser,
    getBranch,
    setPage,
    showToast,
    approveRequest,
    rejectRequest,
    openBranchDetail,
    openAuditTrail,
    scopedComplaints,
    state,
    scopedAttendance
  } = useApp();

  const todayAttendanceLog = scopedAttendance.find(
    (entry) => String(entry.userId) === String(currentUser.id) && entry.date === state.today
  );

  const getPastDateStr = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() - days);
    try {
      const options = { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" } as const;
      const formatter = new Intl.DateTimeFormat("en-CA", options);
      return formatter.format(d);
    } catch (e) {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    }
  };
  const getFutureDateStr = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    try {
      const options = { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" } as const;
      const formatter = new Intl.DateTimeFormat("en-CA", options);
      return formatter.format(d);
    } catch (e) {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    }
  };

  const [incidentFromDate, setIncidentFromDate] = useState(getPastDateStr(7));
  const [incidentToDate, setIncidentToDate] = useState(getFutureDateStr(7));

  // --- Derived data (same computations as before) ---
  const totalStaff = scopedBranches.reduce((s, b) => s + b.staffCount, 0);
  const totalIssues = scopedBranches.reduce((s, b) => s + b.openIssues, 0);
  const totalCriticalAlerts = scopedBranches.reduce((s, b) => s + b.criticalAlerts, 0);
  const totalBudget = scopedBranches.reduce((s, b) => s + b.monthlyBudget, 0);
  const totalUsed = scopedBranches.reduce((s, b) => s + b.usedBudget, 0);

  const pendingApprovals = scopedApprovals.filter((a) => a.status === "Pending");

  // Visits scoped to this manager's branches
  const scopedVisits = visits.filter(
    (v) => scopedBranchIds.map(String).includes(String(v.branchId))
  );
  const incompleteVisits = scopedVisits.filter((v) => v.status !== "Completed");

  // Critical notifications for alert strip
  const criticalAlerts = scopedNotifications.filter(
    (n) => n.priority === "Critical" && !n.read
  );

  // --- Watchlist items derived from branch data ---
  const watchlistItems = scopedBranches
    .flatMap((b) => {
      const items: { title: string; detail: string; tone: "error" | "warning" | "info"; badgeLabel: string; badgeType: string }[] = [];
      if (b.criticalAlerts > 0) {
        items.push({
          title: b.name,
          detail: `${b.criticalAlerts} critical alert${b.criticalAlerts > 1 ? "s" : ""} need immediate attention`,
          tone: "error",
          badgeLabel: "At Risk",
          badgeType: "At Risk",
        });
      }
      if (b.usedBudget / b.monthlyBudget > 0.75) {
        const pct = Math.round((b.usedBudget / b.monthlyBudget) * 100);
        items.push({
          title: `${b.name} budget burn`,
          detail: `Already at ${pct}% of monthly budget`,
          tone: "warning",
          badgeLabel: "Warning",
          badgeType: "Warning",
        });
      }
      if (b.sla < 90) {
        items.push({
          title: `${b.name} SLA drop`,
          detail: `SLA at ${b.sla}%, below 90% threshold`,
          tone: "info",
          badgeLabel: "Monitor",
          badgeType: "Info",
        });
      }
      return items;
    })
    .slice(0, 4);

  return (
    <ScreenWrapper>
      {/* Section Header with Quick Actions */}
      <SectionHeader
        title="Multi-branch overview"
        subtitle={`Critical alerts, branch comparison and upcoming visits across your territory`}
        action={
          <View style={{ flexDirection: "row", gap: spacing.sm }}>
            <QuickButton
              label="View Users"
              icon={Users}
              variant="secondary"
              onPress={() => setPage("users")}
            />
            <QuickButton
              label="Attendance Monitor"
              icon={Users}
              variant="secondary"
              onPress={() => setPage("monitoring")}
            />
            <QuickButton
              label={todayAttendanceLog ? "Checked In" : "Give Attendance"}
              icon={todayAttendanceLog ? Stamp : Stamp}
              variant={todayAttendanceLog ? "secondary" : "primary"}
              onPress={() => setPage("attendance")}
            />

          </View>
        }
      />

      {/* Alert Strip */}
      <AlertStrip
        onReviewAlerts={() => setPage("notifications")}
        onOpenAudit={openAuditTrail}
      />

      {/* Stat Cards Row 1 */}
      <View style={{ flexDirection: "row", gap: spacing.md, marginTop: spacing.xl, flexWrap: "wrap" }}>
        <View style={{ flex: 1, minWidth: 160 }}>
          <StatCard
            label="Branches in scope"
            value={String(scopedBranches.length)}
            meta={`Coverage under ${currentUser.name}`}
            icon={Building}
            accent={colors.warning}
          />
        </View>
        <View style={{ flex: 1, minWidth: 160 }}>
          <StatCard
            label="Critical issues"
            value={String(totalCriticalAlerts)}
            meta="Safety, appliance and SLA exceptions"
            icon={TriangleAlert}
            accent={colors.error}
          />
        </View>
      </View>
      <View style={{ flexDirection: "row", gap: spacing.md, marginTop: spacing.md, flexWrap: "wrap" }}>
        <View style={{ flex: 1, minWidth: 160 }}>
          <StatCard
            label="Budget used"
            value={"Rs " + totalUsed.toLocaleString("en-IN")}
            meta={"of Rs " + totalBudget.toLocaleString("en-IN")}
            icon={Wallet}
            accent={colors.slate900}
          />
        </View>
        <View style={{ flex: 1, minWidth: 160 }}>
          <StatCard
            label="Visit queue"
            value={String(incompleteVisits.length)}
            meta={pendingApprovals.length > 0 ? `${pendingApprovals.length} approval(s) pending` : "Reports pending"}
            icon={Route}
            accent={colors.brandSecondary}
          />
        </View>
      </View>

      {/* Branch Comparison Snapshot */}
      <SectionHeader title="Branch comparison snapshot" subtitle="Tap any branch for deeper operational, financial and staffing detail" />
      <Card variant="glass">
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.lg }}>
          <View>
            <Text style={{ fontSize: fontSize.xl, fontWeight: "800", color: colors.slate900 }}>
              Your branches
            </Text>
            <Text style={{ fontSize: fontSize.sm, color: colors.slate500, marginTop: spacing.xs }}>
              {scopedBranches.length} branches across your territory
            </Text>
          </View>
          <QuickButton
            label="View All"
            icon={ChevronRight}
            variant="primary"
            onPress={() => setPage("branches")}
          />
        </View>
        <View style={{ gap: spacing.md }}>
          {scopedBranches.map((branch) => (
            <TouchableOpacity
              key={branch.id}
              onPress={() => openBranchDetail(branch.id)}
              activeOpacity={0.7}
              style={{
                backgroundColor: colors.bg,
                borderRadius: borderRadius["2xl"],
                padding: spacing.xl,
              }}
            >
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md }}>
                  <View
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 12,
                      backgroundColor: branch.criticalAlerts > 0 ? "rgba(239,68,68,0.1)" : "rgba(18,183,106,0.1)",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <MapPin
                      size={20}
                      color={branch.criticalAlerts > 0 ? colors.error : colors.success}
                      strokeWidth={2.2}
                    />
                  </View>
                  <View>
                    <Text style={{ fontSize: fontSize.xs, fontWeight: "600", color: colors.slate400, textTransform: "uppercase", letterSpacing: 1.8 }}>
                      {branch.code}
                    </Text>
                    <Text style={{ fontSize: fontSize.md, fontWeight: "700", color: colors.slate900, marginTop: 2 }}>
                      {branch.name}
                    </Text>
                    <Text style={{ fontSize: fontSize.xs, color: colors.slate500, marginTop: 2 }}>
                      {branch.city} | {branch.staffCount} staff
                    </Text>
                  </View>
                </View>
                <Badge
                  label={branch.criticalAlerts > 0 ? `${branch.criticalAlerts} alerts` : "Stable"}
                  type={branch.criticalAlerts > 0 ? "Critical" : "Completed"}
                />
              </View>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.xl, marginTop: spacing.lg }}>
                <View style={{ minWidth: 70 }}>
                  <Text style={{ fontSize: fontSize.xs, color: colors.slate400 }}>Attendance</Text>
                  <Text style={{ fontSize: fontSize.sm, fontWeight: "700", color: colors.slate900, marginTop: 2 }}>
                    {branch.todayAttendance}%
                  </Text>
                </View>
                <View style={{ minWidth: 70 }}>
                  <Text style={{ fontSize: fontSize.xs, color: colors.slate400 }}>SLA</Text>
                  <Text style={{ fontSize: fontSize.sm, fontWeight: "700", color: branch.sla < 90 ? colors.warning : colors.slate900, marginTop: 2 }}>
                    {branch.sla}%
                  </Text>
                </View>
                <View style={{ minWidth: 70 }}>
                  <Text style={{ fontSize: fontSize.xs, color: colors.slate400 }}>Open issues</Text>
                  <Text style={{ fontSize: fontSize.sm, fontWeight: "700", color: colors.slate900, marginTop: 2 }}>
                    {branch.openIssues}
                  </Text>
                </View>
                <View style={{ minWidth: 70 }}>
                  <Text style={{ fontSize: fontSize.xs, color: colors.slate400 }}>Next visit</Text>
                  <Text style={{ fontSize: fontSize.sm, fontWeight: "700", color: colors.slate900, marginTop: 2 }}>
                    {branch.nextVisit}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </Card>

      {/* Manager Watchlist */}
      <SectionHeader title="Manager watchlist" />
      <Card>
        {watchlistItems.length > 0 ? (
          watchlistItems.map((item, i) => {
            const accentColor =
              item.tone === "error"
                ? colors.error
                : item.tone === "warning"
                  ? colors.warning
                  : colors.brandSecondary;
            const bgColor =
              item.tone === "error"
                ? colors.rose50
                : item.tone === "warning"
                  ? colors.amber50
                  : colors.sky50;
            const textColor =
              item.tone === "error"
                ? colors.rose700
                : item.tone === "warning"
                  ? colors.amber700
                  : colors.sky700;

            return (
              <React.Fragment key={i}>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "flex-start",
                    gap: spacing.md,
                    paddingVertical: spacing.md,
                  }}
                >
                  <View
                    style={{
                      width: 3,
                      height: 40,
                      backgroundColor: accentColor,
                      borderRadius: 2,
                    }}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: fontSize.sm, fontWeight: "600", color: colors.slate900 }}>
                      {item.title}
                    </Text>
                    <Text style={{ fontSize: fontSize.xs, color: colors.slate500, marginTop: 2 }}>
                      {item.detail}
                    </Text>
                  </View>
                  <Badge label={item.badgeLabel} type={item.badgeType} />
                </View>
                {i < watchlistItems.length - 1 ? (
                  <View style={{ height: 1, backgroundColor: colors.slate100 }} />
                ) : null}
              </React.Fragment>
            );
          })
        ) : (
          <View
            style={{
              backgroundColor: colors.emerald50,
              borderRadius: borderRadius["2xl"],
              padding: spacing.xl,
            }}
          >
            <Text style={{ fontSize: fontSize.sm, color: colors.emerald700 }}>
              All branches stable — no watchlist items right now.
            </Text>
          </View>
        )}
      </Card>





      {/* Improvement 2: Date-to-Date SLA Incident Timeline */}
      <SectionHeader title="Territory Incident Timeline" subtitle="Track escalations and SLA exceptions from date to date" />
      <Card variant="glass" style={{ marginBottom: spacing.xl }}>
        <View style={{ flexDirection: "row", gap: spacing.sm, marginBottom: spacing.md }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: fontSize.xs, color: colors.slate400, marginBottom: 2 }}>From Date</Text>
            <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: colors.white, borderRadius: borderRadius.md, borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.sm }}>
              <TextInput
                value={incidentFromDate}
                onChangeText={setIncidentFromDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.slate400}
                style={{ flex: 1, paddingVertical: spacing.sm, fontSize: fontSize.xs, color: colors.slate900 }}
              />
            </View>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: fontSize.xs, color: colors.slate400, marginBottom: 2 }}>To Date</Text>
            <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: colors.white, borderRadius: borderRadius.md, borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.sm }}>
              <TextInput
                value={incidentToDate}
                onChangeText={setIncidentToDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.slate400}
                style={{ flex: 1, paddingVertical: spacing.sm, fontSize: fontSize.xs, color: colors.slate900 }}
              />
            </View>
          </View>
        </View>

        <View style={{ gap: spacing.md }}>
          {scopedComplaints.filter((c) => {
            const cDate = c.createdAt ? String(c.createdAt).slice(0, 10) : "";
            if (incidentFromDate && cDate < incidentFromDate) return false;
            if (incidentToDate && cDate > incidentToDate) return false;
            return true;
          }).map((incident) => {
            const branch = getBranch(incident.branchId);
            return (
              <View
                key={incident.id}
                style={{
                  backgroundColor: colors.bg,
                  borderRadius: borderRadius.lg,
                  padding: spacing.lg,
                  borderLeftWidth: 3,
                  borderLeftColor: incident.priority === "Critical" ? colors.error : colors.brand
                }}
              >
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: fontSize.sm, fontWeight: "700", color: colors.slate900 }}>
                      {incident.complaintId}
                    </Text>
                    <Text style={{ fontSize: fontSize.xs, color: colors.slate500, marginTop: 2 }}>
                      {branch?.name || "Territory"} · {incident.priority} · {incident.createdAt ? String(incident.createdAt).slice(0, 10) : "—"}
                    </Text>
                    <Text style={{ fontSize: fontSize.xs, color: colors.slate600, marginTop: spacing.sm }} numberOfLines={2}>
                      {incident.description}
                    </Text>
                  </View>
                  <Badge label={incident.status} type={incident.status as any} />
                </View>
              </View>
            );
          })}
          {scopedComplaints.filter((c) => {
            const cDate = c.createdAt ? String(c.createdAt).slice(0, 10) : "";
            if (incidentFromDate && cDate < incidentFromDate) return false;
            if (incidentToDate && cDate > incidentToDate) return false;
            return true;
          }).length === 0 && (
              <Text style={{ fontSize: fontSize.xs, color: colors.slate500, fontStyle: "italic", textAlign: "center", paddingVertical: spacing.md }}>
                No critical incidents or complaints in this period.
              </Text>
            )}
        </View>
      </Card>
    </ScreenWrapper>
  );
}
