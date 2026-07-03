import React, { useState } from "react";
import { View, Text, TouchableOpacity, ScrollView, Image } from "react-native";
import {
  Building, Users, HardHat, TrendingUp, DollarSign, Activity,
  AlertCircle, TriangleAlert, ShieldCheck, Clock, CalendarDays, MapPin,
  Phone, Mail, ChevronRight, Wrench, Zap,
  Camera, XCircle, FileText
} from "lucide-react-native";
import { ScreenWrapper } from "../../shared/layout/ScreenWrapper";
import { Badge } from "../../shared/components/Badge";
import { ProgressBar } from "../../shared/components/ProgressBar";
import { DatePickerDropdown } from "../../shared/components/DatePickerDropdown";
import { useApp } from "../../context/AppContext";
import { colors, fontSize, spacing, borderRadius } from "../../theme/theme";
import { formatPct, formatMoney } from "../../utils/helpers";
import { Branch, User, Task, Complaint, Appliance, AttendanceLog } from "../../types/domain";
import { StaffDetailScreen } from "../../shared/components/detail/StaffDetailScreen";

interface Props {
  branch: Branch;
  onBack: () => void;
}

type TabKey = "overview" | "staff" | "appliances" | "issues" | "info";

const getRenderableImageUri = (value?: string | null) => {
  const uri = typeof value === "string" ? value.trim() : "";
  if (!uri || uri === "null" || uri.startsWith("blob:")) return null;
  return /^(https?:|data:image\/|file:)/i.test(uri) ? uri : null;
};

const TABS: { key: TabKey; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "staff", label: "Staff" },
  { key: "appliances", label: "Appliances" },
  { key: "issues", label: "Issues" },
  { key: "info", label: "Info" },
];

export function BranchDeepDiveScreen({ branch, onBack }: Props) {
  const { scopedUsers, scopedTasks, scopedComplaints, scopedAppliances, scopedAttendance, openApplianceDetail, openTaskDetail, users } = useApp();
  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const [selectedUserId, setSelectedUserId] = useState<string | number | null>(null);
  const [applianceFromDate, setApplianceFromDate] = useState("");
  const [applianceToDate, setApplianceToDate] = useState("");

  if (selectedUserId) {
    return (
      <StaffDetailScreen
        userId={selectedUserId}
        onBack={() => setSelectedUserId(null)}
      />
    );
  }

  const branchUsers = scopedUsers.filter((u: User) => u.branchId === branch.id);
  const branchTasks = scopedTasks.filter((t: Task) => t.branchId === branch.id);
  const branchComplaints = scopedComplaints.filter((c: Complaint) => c.branchId === branch.id);
  const branchAppliances = scopedAppliances.filter((a: Appliance) => a.branchId === branch.id);
  const branchAttendance = scopedAttendance.filter((a: AttendanceLog) => {
    const user = scopedUsers.find((u: User) => u.id === a.userId);
    return user?.branchId === branch.id;
  });

  const budgetPct = Math.round((branch.usedBudget / branch.monthlyBudget) * 100);
  const workers = branchUsers.filter((u: User) => u.role === "lc");
  const employees = branchUsers.filter((u: User) => u.role !== "lc" && u.role !== "rm" && u.role !== "branchManager");
  const pendingTasks = branchTasks.filter((t) => t.status === "Pending").length;
  const openComplaints = branchComplaints.filter((c) => c.status !== "Resolved").length;
  const criticalAppliances = branchAppliances.filter((a) => a.status === "Critical" || a.status === "Down").length;
  const todayPresent = branchAttendance.filter((a) => a.status === "Present").length;
  const todayTotal = branchAttendance.length || 1;

  return (
    <ScreenWrapper>
      <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md, marginBottom: spacing.xl }}>
        <TouchableOpacity onPress={onBack} style={{ width: 36, height: 36, borderRadius: borderRadius.md, backgroundColor: colors.slate100, alignItems: "center", justifyContent: "center" }}>
          <ChevronRight size={18} color={colors.text} strokeWidth={2} style={{ transform: [{ rotate: "180deg" }] }} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: fontSize.xs, fontWeight: "400", color: colors.textSecondary, textTransform: "uppercase", letterSpacing: 1 }}>{branch.code}</Text>
          <Text style={{ fontSize: fontSize["2xl"], fontWeight: "400", color: colors.text }}>{branch.name}</Text>
        </View>
        <Badge label={branch.health >= 90 ? "Healthy" : "Watch"} type={branch.health >= 90 ? "Completed" : "High"} />
      </View>

      <View style={{ flexDirection: "row", backgroundColor: colors.slate100, borderRadius: borderRadius["2xl"], padding: 3, marginBottom: spacing.xl }}>
        {TABS.map((tab) => {
          const active = activeTab === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              onPress={() => setActiveTab(tab.key)}
              style={{ flex: 1, borderRadius: borderRadius["2xl"], paddingVertical: spacing.sm, alignItems: "center", backgroundColor: active ? colors.card : "transparent", ...(active ? { shadowColor: "rgba(0,0,0,0.06)", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 1, shadowRadius: 4, elevation: 2 } : {}) }}
            >
              <Text style={{ fontSize: fontSize.xs, fontWeight: "400", color: active ? colors.text : colors.textSecondary }}>{tab.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: spacing.xl, paddingBottom: 40 }}>
        {activeTab === "overview" && renderOverview()}
        {activeTab === "staff" && renderStaff()}
        {activeTab === "appliances" && renderAppliances()}
        {activeTab === "issues" && renderIssues()}
        {activeTab === "info" && renderInfo()}
      </ScrollView>
    </ScreenWrapper>
  );

  function renderOverview() {
    return (
      <>
        <View style={{ backgroundColor: colors.text, borderRadius: borderRadius["4xl"], padding: spacing["2xl"] }}>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.md }}>
            {[
              { label: "Health", value: formatPct(branch.health), icon: Activity, color: colors.success },
              { label: "Attendance", value: formatPct(branch.todayAttendance), icon: Users, color: colors.brandSecondary },
              { label: "SLA", value: formatPct(branch.sla), icon: Clock, color: colors.info },
              { label: "Performance", value: formatPct(branch.performance), icon: TrendingUp, color: colors.success },
            ].map((s) => (
              <View key={s.label} style={{ flex: 1, minWidth: 70, backgroundColor: "rgba(255,255,255,0.1)", borderRadius: borderRadius["2xl"], padding: spacing.md, alignItems: "center" }}>
                <s.icon size={14} color={s.color} strokeWidth={2} />
                <Text style={{ fontSize: fontSize.xs, color: colors.slate300, marginTop: spacing.xs }}>{s.label}</Text>
                <Text style={{ fontSize: fontSize.lg, fontWeight: "400", color: s.color, marginTop: spacing.xs }}>{s.value}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.md }}>
          {[
            { label: "Staff", value: String(branch.staffCount), meta: `${branch.staffCount} total`, accent: colors.brandSecondary, icon: Users },
            { label: "Open Issues", value: String(openComplaints), meta: `${branch.criticalAlerts} critical`, accent: colors.error, icon: AlertCircle },
            { label: "Pending Tasks", value: String(pendingTasks), meta: `of ${branchTasks.length} total`, accent: colors.warning, icon: FileText },
            { label: "Budget Used", value: formatPct(budgetPct), meta: `of ${formatMoney(branch.monthlyBudget)}`, accent: colors.brand, icon: DollarSign },
          ].map((s) => (
            <View key={s.label} style={{ flex: 1, minWidth: 100, backgroundColor: colors.card, borderRadius: borderRadius["2xl"], padding: spacing.lg, borderWidth: 1, borderColor: colors.border }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
                <View style={{ width: 28, height: 28, borderRadius: borderRadius.md, backgroundColor: s.accent + "15", alignItems: "center", justifyContent: "center" }}>
                  <s.icon size={14} color={s.accent} strokeWidth={2} />
                </View>
                <Text style={{ fontSize: fontSize.xs, fontWeight: "400", color: colors.textSecondary, textTransform: "uppercase", letterSpacing: 1 }}>{s.label}</Text>
              </View>
              <Text style={{ fontSize: fontSize["3xl"], fontWeight: "400", color: colors.text, marginTop: spacing.sm }}>{s.value}</Text>
              <Text style={{ fontSize: fontSize.xs, color: colors.textSecondary, marginTop: spacing.xs }}>{s.meta}</Text>
            </View>
          ))}
        </View>

        <View style={{ backgroundColor: colors.card, borderRadius: borderRadius["4xl"], padding: spacing["2xl"], borderWidth: 1, borderColor: colors.border }}>
          <Text style={{ fontSize: fontSize.lg, fontWeight: "600", color: colors.text, marginBottom: spacing.lg }}>Revenue & Footfall</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.md }}>
            {[
              { label: "Revenue Index", value: String(branch.revenueIndex), meta: "vs regional avg", icon: TrendingUp, color: colors.success },
              { label: "Customer Footfall", value: String(branch.customerFootfall), meta: "Daily average", icon: Users, color: colors.brandSecondary },
              { label: "Audit Score", value: formatPct(branch.auditScore), meta: "Compliance rating", icon: ShieldCheck, color: colors.info },
              { label: "Present Today", value: `${todayPresent}/${todayTotal}`, meta: "Staff on floor", icon: Camera, color: colors.brand },
            ].map((s) => (
              <View key={s.label} style={{ flex: 1, minWidth: 100, backgroundColor: colors.slate50, borderRadius: borderRadius["2xl"], padding: spacing.lg }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
                  <s.icon size={14} color={s.color} strokeWidth={2} />
                  <Text style={{ fontSize: fontSize.xs, color: colors.textSecondary }}>{s.label}</Text>
                </View>
                <Text style={{ fontSize: fontSize["2xl"], fontWeight: "400", color: colors.text, marginTop: spacing.sm }}>{s.value}</Text>
                <Text style={{ fontSize: fontSize.xs, color: colors.textSecondary, marginTop: spacing.xs }}>{s.meta}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={{ backgroundColor: colors.card, borderRadius: borderRadius["4xl"], padding: spacing["2xl"], borderWidth: 1, borderColor: colors.border }}>
          <Text style={{ fontSize: fontSize.lg, fontWeight: "600", color: colors.text, marginBottom: spacing.lg }}>Budget Tracker</Text>
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: spacing.sm }}>
            <Text style={{ fontSize: fontSize.sm, color: colors.textSecondary }}>Used: {formatMoney(branch.usedBudget)}</Text>
            <Text style={{ fontSize: fontSize.sm, fontWeight: "400", color: colors.text }}>{formatMoney(branch.monthlyBudget)}</Text>
          </View>
          <ProgressBar value={budgetPct} color={budgetPct > 85 ? colors.error : budgetPct > 70 ? colors.warning : colors.success} height={12} />
          <Text style={{ fontSize: fontSize.xs, color: colors.textSecondary, marginTop: spacing.sm }}>{budgetPct}% utilised · {formatMoney(branch.monthlyBudget - branch.usedBudget)} remaining</Text>
        </View>
      </>
    );
  }

  function renderStaff() {
    const allStaff = [...workers, ...employees];
    return (
      <>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.md, marginBottom: spacing.md }}>
          <View style={{ flex: 1, minWidth: 80, backgroundColor: colors.card, borderRadius: borderRadius["2xl"], padding: spacing.lg, alignItems: "center", borderWidth: 1, borderColor: colors.border }}>
            <HardHat size={18} color={colors.brandSecondary} strokeWidth={2} />
            <Text style={{ fontSize: fontSize["2xl"], fontWeight: "400", color: colors.text, marginTop: spacing.xs }}>{branch.workerCount}</Text>
            <Text style={{ fontSize: fontSize.xs, color: colors.textSecondary }}>Workers</Text>
          </View>
          <View style={{ flex: 1, minWidth: 80, backgroundColor: colors.card, borderRadius: borderRadius["2xl"], padding: spacing.lg, alignItems: "center", borderWidth: 1, borderColor: colors.border }}>
            <Users size={18} color={colors.brand} strokeWidth={2} />
            <Text style={{ fontSize: fontSize["2xl"], fontWeight: "400", color: colors.text, marginTop: spacing.xs }}>{branch.staffCount}</Text>
            <Text style={{ fontSize: fontSize.xs, color: colors.textSecondary }}>Total staff</Text>
          </View>
          <View style={{ flex: 1, minWidth: 80, backgroundColor: colors.card, borderRadius: borderRadius["2xl"], padding: spacing.lg, alignItems: "center", borderWidth: 1, borderColor: colors.border }}>
            <Users size={18} color={colors.success} strokeWidth={2} />
            <Text style={{ fontSize: fontSize["2xl"], fontWeight: "400", color: colors.text, marginTop: spacing.xs }}>{todayPresent}</Text>
            <Text style={{ fontSize: fontSize.xs, color: colors.textSecondary }}>Present</Text>
          </View>
          <View style={{ flex: 1, minWidth: 80, backgroundColor: colors.card, borderRadius: borderRadius["2xl"], padding: spacing.lg, alignItems: "center", borderWidth: 1, borderColor: colors.border }}>
            <Clock size={18} color={colors.warning} strokeWidth={2} />
            <Text style={{ fontSize: fontSize["2xl"], fontWeight: "400", color: colors.text, marginTop: spacing.xs }}>{todayTotal - todayPresent}</Text>
            <Text style={{ fontSize: fontSize.xs, color: colors.textSecondary }}>Away</Text>
          </View>
        </View>

        <View style={{ gap: spacing.md }}>
          {allStaff.length === 0 ? (
            <Text style={{ fontSize: fontSize.sm, color: colors.textSecondary, textAlign: "center", paddingVertical: spacing["4xl"] }}>No staff data</Text>
          ) : allStaff.map((user: User) => {
            return (
              <TouchableOpacity key={user.id} onPress={() => setSelectedUserId(user.id)} activeOpacity={0.7} style={{ backgroundColor: colors.card, borderRadius: borderRadius["2xl"], padding: spacing.xl, borderWidth: 1, borderColor: colors.border }}>
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md, flex: 1 }}>
                    <View style={{ width: 40, height: 40, borderRadius: borderRadius["2xl"], backgroundColor: colors.slate100, alignItems: "center", justifyContent: "center" }}>
                      <Text style={{ fontSize: fontSize.base, fontWeight: "400", color: colors.text }}>{user.name.charAt(0)}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: fontSize.md, fontWeight: "400", color: colors.text }}>{user.name}</Text>
                      <Text style={{ fontSize: fontSize.xs, color: colors.textSecondary }}>{user.position}</Text>
                    </View>
                    <Badge label={user.status} type={user.status} />
                  </View>
                </View>
                <View style={{ flexDirection: "row", gap: spacing.lg, marginTop: spacing.md }}>
                  <View style={{ flex: 1, backgroundColor: colors.slate50, borderRadius: borderRadius.lg, padding: spacing.sm, alignItems: "center" }}>
                    <Text style={{ fontSize: fontSize.xs, color: colors.textSecondary }}>Attendance</Text>
                    <Text style={{ fontSize: fontSize.md, fontWeight: "400", color: colors.text }}>{formatPct(user.attendancePct)}</Text>
                  </View>
                  <View style={{ flex: 1, backgroundColor: colors.slate50, borderRadius: borderRadius.lg, padding: spacing.sm, alignItems: "center" }}>
                    <Text style={{ fontSize: fontSize.xs, color: colors.textSecondary }}>Tasks</Text>
                    <Text style={{ fontSize: fontSize.md, fontWeight: "400", color: colors.text }}>{user.tasksClosed}</Text>
                  </View>
                  <View style={{ flex: 1, backgroundColor: colors.slate50, borderRadius: borderRadius.lg, padding: spacing.sm, alignItems: "center" }}>
                    <Text style={{ fontSize: fontSize.xs, color: colors.textSecondary }}>Proof</Text>
                    <Text style={{ fontSize: fontSize.md, fontWeight: "400", color: colors.text }}>{formatPct(user.proofRate)}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </>
    );
  }

  function renderAppliances() {
    const applianceTasks = (id: string | number) => scopedTasks.filter(t => String(t.applianceId) === String(id) && getRenderableImageUri(t.proofUrl));
    const filteredApplianceTasks = (id: string | number) => {
      let tasks = applianceTasks(id);
      if (applianceFromDate) tasks = tasks.filter(t => String(t.deadline).slice(0, 10) >= applianceFromDate);
      if (applianceToDate) tasks = tasks.filter(t => String(t.deadline).slice(0, 10) <= applianceToDate);
      return tasks;
    };
    return (
      <View style={{ gap: spacing.md }}>
        {criticalAppliances > 0 && (
          <View style={{ backgroundColor: colors.rose50, borderRadius: borderRadius["2xl"], padding: spacing.xl, flexDirection: "row", alignItems: "center", gap: spacing.md }}>
            <TriangleAlert size={18} color={colors.rose700} strokeWidth={2} />
            <Text style={{ fontSize: fontSize.sm, fontWeight: "400", color: colors.rose700, flex: 1 }}>{criticalAppliances} appliance(s) need immediate attention</Text>
          </View>
        )}

        <View style={{ flexDirection: "row", gap: spacing.md, marginBottom: spacing.md }}>
          <View style={{ flex: 1, backgroundColor: colors.white, borderRadius: borderRadius.lg, paddingHorizontal: spacing.md, borderWidth: 1, borderColor: colors.border }}>
            <DatePickerDropdown value={applianceFromDate} onChange={setApplianceFromDate} placeholder="From date" />
          </View>
          <View style={{ flex: 1, backgroundColor: colors.white, borderRadius: borderRadius.lg, paddingHorizontal: spacing.md, borderWidth: 1, borderColor: colors.border }}>
            <DatePickerDropdown value={applianceToDate} onChange={setApplianceToDate} placeholder="To date" />
          </View>
        </View>

        {branchAppliances.length === 0 ? (
          <Text style={{ fontSize: fontSize.sm, color: colors.textSecondary, textAlign: "center", paddingVertical: spacing["4xl"] }}>No appliances registered</Text>
        ) : branchAppliances.map((app) => {
          const relatedTasks = filteredApplianceTasks(app.id);
          const appImageUri = getRenderableImageUri(app.imageUrl);
          return (
          <TouchableOpacity 
            key={app.id} 
            onPress={() => openApplianceDetail(app.id)}
            activeOpacity={0.7}
            style={{ backgroundColor: colors.card, borderRadius: borderRadius["2xl"], padding: spacing.xl, borderWidth: 1, borderColor: colors.border }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: spacing.md }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md, flex: 1 }}>
                <View style={{ width: 36, height: 36, borderRadius: borderRadius["2xl"], backgroundColor: app.status === "Operational" ? colors.emerald50 : app.status === "At Risk" ? colors.amber50 : colors.rose50, alignItems: "center", justifyContent: "center" }}>
                  {app.status === "Operational" ? <Zap size={16} color={colors.emerald700} strokeWidth={2} /> : app.status === "At Risk" ? <TriangleAlert size={16} color={colors.amber700} strokeWidth={2} /> : <XCircle size={16} color={colors.rose700} strokeWidth={2} />}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: fontSize.md, fontWeight: "400", color: colors.text }}>{app.name}</Text>
                  <Text style={{ fontSize: fontSize.xs, color: colors.textSecondary }}>{app.category} · {app.zone}</Text>
                </View>
              </View>
              <Badge label={app.status} type={app.status} />
            </View>
            {appImageUri ? (
              <View style={{ marginBottom: spacing.md }}>
                <Image source={{ uri: appImageUri }} style={{ width: "100%", height: 140, borderRadius: borderRadius.lg }} resizeMode="cover" />
              </View>
            ) : null}
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.md }}>
              <View style={{ flex: 1, minWidth: 60, backgroundColor: colors.slate50, borderRadius: borderRadius.lg, padding: spacing.sm, alignItems: "center" }}>
                <Text style={{ fontSize: fontSize.xs, color: colors.textSecondary }}>Health</Text>
                <Text style={{ fontSize: fontSize.md, fontWeight: "400", color: app.healthScore >= 80 ? colors.success : app.healthScore >= 60 ? colors.warning : colors.error }}>{formatPct(app.healthScore)}</Text>
              </View>
              <View style={{ flex: 1, minWidth: 60, backgroundColor: colors.slate50, borderRadius: borderRadius.lg, padding: spacing.sm, alignItems: "center" }}>
                <Text style={{ fontSize: fontSize.xs, color: colors.textSecondary }}>Brand</Text>
                <Text style={{ fontSize: fontSize.md, fontWeight: "400", color: colors.text }}>{app.brand}</Text>
              </View>
              <View style={{ flex: 1, minWidth: 60, backgroundColor: colors.slate50, borderRadius: borderRadius.lg, padding: spacing.sm, alignItems: "center" }}>
                <Text style={{ fontSize: fontSize.xs, color: colors.textSecondary }}>Service</Text>
                <Text style={{ fontSize: fontSize.md, fontWeight: "400", color: colors.text }}>{app.nextService}</Text>
              </View>
              <View style={{ flex: 1, minWidth: 60, backgroundColor: colors.slate50, borderRadius: borderRadius.lg, padding: spacing.sm, alignItems: "center" }}>
                <Text style={{ fontSize: fontSize.xs, color: colors.textSecondary }}>Parts</Text>
                <Text style={{ fontSize: fontSize.md, fontWeight: "400", color: colors.text }}>{app.pendingParts === "None" ? "—" : app.pendingParts}</Text>
              </View>
            </View>

            {relatedTasks.length > 0 ? (
              <View style={{ marginTop: spacing.md, borderTopWidth: 1, borderColor: colors.slate100, paddingTop: spacing.md }}>
                <Text style={{ fontSize: fontSize.xs, color: colors.textSecondary, marginBottom: spacing.sm }}>Task Images ({relatedTasks.length})</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm }}>
                  {relatedTasks.map(rt => {
                    const proofUri = getRenderableImageUri(rt.proofUrl);
                    if (!proofUri) return null;
                    return (
                    <TouchableOpacity key={rt.id} onPress={() => openTaskDetail(rt.id)} style={{ width: 80, height: 64, borderRadius: borderRadius.md, overflow: "hidden", borderWidth: 1, borderColor: colors.border }}>
                      <Image source={{ uri: proofUri }} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
                    </TouchableOpacity>
                  );
                  })}
                </ScrollView>
              </View>
            ) : null}
          </TouchableOpacity>
        )})}
      </View>
    );
  }

  function renderIssues() {
    return (
      <View style={{ gap: spacing.md }}>
        {openComplaints === 0 ? (
          <Text style={{ fontSize: fontSize.sm, color: colors.textSecondary, textAlign: "center", paddingVertical: spacing["4xl"] }}>No open issues</Text>
        ) : branchComplaints.filter((c) => c.status !== "Resolved").map((c) => (
          <View key={c.id} style={{ backgroundColor: colors.card, borderRadius: borderRadius["2xl"], padding: spacing.xl, borderWidth: 1, borderColor: colors.border }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: spacing.md }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm, flex: 1 }}>
                <View style={{ width: 32, height: 32, borderRadius: borderRadius["2xl"], backgroundColor: c.status === "Escalated" ? colors.rose50 : colors.amber50, alignItems: "center", justifyContent: "center" }}>
                  {c.status === "Escalated" ? <TriangleAlert size={14} color={colors.rose700} strokeWidth={2} /> : <AlertCircle size={14} color={colors.amber700} strokeWidth={2} />}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: fontSize.md, fontWeight: "400", color: colors.text }}>{c.title}</Text>
                  <Text style={{ fontSize: fontSize.xs, color: colors.textSecondary }}>{c.type} · {c.assignedVendor}</Text>
                </View>
              </View>
              <Badge label={c.status} type={c.status} />
            </View>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.md }}>
              <View style={{ flex: 1, minWidth: 60, backgroundColor: colors.slate50, borderRadius: borderRadius.lg, padding: spacing.sm, alignItems: "center" }}>
                <Text style={{ fontSize: fontSize.xs, color: colors.textSecondary }}>Est. Cost</Text>
                <Text style={{ fontSize: fontSize.md, fontWeight: "400", color: colors.text }}>{formatMoney(c.estimatedCost)}</Text>
              </View>
              <View style={{ flex: 1, minWidth: 60, backgroundColor: colors.slate50, borderRadius: borderRadius.lg, padding: spacing.sm, alignItems: "center" }}>
                <Text style={{ fontSize: fontSize.xs, color: colors.textSecondary }}>Escalation</Text>
                <Text style={{ fontSize: fontSize.md, fontWeight: "400", color: colors.text }}>{c.escalationStage}</Text>
              </View>
              <View style={{ flex: 1, minWidth: 60, backgroundColor: colors.slate50, borderRadius: borderRadius.lg, padding: spacing.sm, alignItems: "center" }}>
                <Text style={{ fontSize: fontSize.xs, color: colors.textSecondary }}>Priority</Text>
                <Badge label={c.priority} type={c.priority} />
              </View>
            </View>
            <View style={{ marginTop: spacing.md }}>
              <ProgressBar value={c.status === "Pending" ? 30 : c.status === "Escalated" ? 60 : 100} color={c.status === "Escalated" ? colors.error : colors.warning} height={6} />
            </View>
          </View>
        ))}
      </View>
    );
  }

  function renderInfo() {
    const branchLc = (users || []).find(u => u.role === "lc" && String(u.branchId) === String(branch.id));
    const branchAa = (users || []).find(u => u.role === "aa" && u.branchScope?.map(String).includes(String(branch.id)));
    const branchAm = (users || []).find(u => u.role === "branchManager" && u.branchScope?.map(String).includes(String(branch.id)));

    return (
      <View style={{ gap: spacing.md }}>
        <View style={{ backgroundColor: colors.card, borderRadius: borderRadius["4xl"], padding: spacing["2xl"], borderWidth: 1, borderColor: colors.border }}>
          <Text style={{ fontSize: fontSize.lg, fontWeight: "600", color: colors.text, marginBottom: spacing.lg }}>Branch Details</Text>
          <View style={{ gap: spacing.md }}>
            {[
              { label: "Code", value: branch.code, icon: Building },
              { label: "Address", value: branch.address, icon: MapPin },
              { label: "Phone", value: branch.phone, icon: Phone },
              { label: "Email", value: branch.email, icon: Mail },
              { label: "City", value: branch.city, icon: MapPin },
            ].map((row) => (
              <View key={row.label} style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: colors.slate50, borderRadius: borderRadius.lg, paddingHorizontal: spacing.xl, paddingVertical: spacing.md }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md }}>
                  <row.icon size={14} color={colors.textSecondary} strokeWidth={2} />
                  <Text style={{ fontSize: fontSize.sm, color: colors.textSecondary }}>{row.label}</Text>
                </View>
                <Text numberOfLines={1} style={{ fontSize: fontSize.sm, fontWeight: "400", color: colors.text, maxWidth: 200 }}>{row.value}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={{ backgroundColor: colors.card, borderRadius: borderRadius["4xl"], padding: spacing["2xl"], borderWidth: 1, borderColor: colors.border }}>
          <Text style={{ fontSize: fontSize.lg, fontWeight: "600", color: colors.text, marginBottom: spacing.lg }}>Key Staff Assignments</Text>
          <View style={{ gap: spacing.md }}>
            {[
              { label: "Branch Manager (AM)", value: branchAm ? `${branchAm.name} (${branchAm.email || "No email"})` : "Unassigned", icon: Users },
              { label: "Admin Assistant (AA)", value: branchAa ? `${branchAa.name} (${branchAa.email || "No email"})` : "Unassigned", icon: Users },
              { label: "Local Coordinator (LC)", value: branchLc ? `${branchLc.name} (${branchLc.email || "No email"})` : "Unassigned", icon: Users },
            ].map((row) => (
              <View key={row.label} style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: colors.slate50, borderRadius: borderRadius.lg, paddingHorizontal: spacing.xl, paddingVertical: spacing.md }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md }}>
                  <row.icon size={14} color={colors.textSecondary} strokeWidth={2} />
                  <Text style={{ fontSize: fontSize.sm, color: colors.textSecondary }}>{row.label}</Text>
                </View>
                <Text style={{ fontSize: fontSize.sm, fontWeight: "400", color: colors.text }}>{row.value}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={{ backgroundColor: colors.card, borderRadius: borderRadius["4xl"], padding: spacing["2xl"], borderWidth: 1, borderColor: colors.border }}>
          <Text style={{ fontSize: fontSize.lg, fontWeight: "600", color: colors.text, marginBottom: spacing.lg }}>Operations</Text>
          <View style={{ gap: spacing.md }}>
            {[
              { label: "Shift Window", value: branch.shiftWindow, icon: Clock },
              { label: "Geo Radius", value: `${branch.geoRadius}m`, icon: MapPin },
              { label: "Last Visit", value: branch.lastVisit, icon: CalendarDays },
              { label: "Next Visit", value: branch.nextVisit, icon: CalendarDays },
              { label: "Staff Count", value: String(branch.staffCount), icon: Users },
              { label: "Open Issues", value: String(branch.openIssues), icon: AlertCircle },
              { label: "Critical Alerts", value: String(branch.criticalAlerts), icon: TriangleAlert },
              { label: "Appliance Risk", value: String(branch.applianceRisk), icon: Wrench },
            ].map((row) => (
              <View key={row.label} style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: colors.slate50, borderRadius: borderRadius.lg, paddingHorizontal: spacing.xl, paddingVertical: spacing.md }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md }}>
                  <row.icon size={14} color={colors.textSecondary} strokeWidth={2} />
                  <Text style={{ fontSize: fontSize.sm, color: colors.textSecondary }}>{row.label}</Text>
                </View>
                <Text style={{ fontSize: fontSize.sm, fontWeight: "400", color: colors.text }}>{row.value}</Text>
              </View>
            ))}
          </View>
        </View>

        {branchComplaints.filter((c) => c.timeline.length > 0).length > 0 && (
          <View style={{ backgroundColor: colors.card, borderRadius: borderRadius["4xl"], padding: spacing["2xl"], borderWidth: 1, borderColor: colors.border }}>
            <Text style={{ fontSize: fontSize.lg, fontWeight: "600", color: colors.text, marginBottom: spacing.lg }}>Recent Activity</Text>
            {branchComplaints.slice(0, 3).map((c) => c.timeline.slice(-2).map((entry, i) => (
              <View key={`${c.id}-${i}`} style={{ flexDirection: "row", gap: spacing.sm, marginBottom: spacing.md }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.brand, marginTop: 4 }} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: fontSize.xs, color: colors.textSecondary }}>{c.title}</Text>
                  <Text style={{ fontSize: fontSize.sm, color: colors.text }}>{entry}</Text>
                </View>
              </View>
            )))}
          </View>
        )}
      </View>
    );
  }
}
