import React, { useMemo, useState } from "react";
import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import {
  HeartPulse, MapPin, TriangleAlert, Stamp,
  FileText, Route, ShieldCheck, UserPlus, ChartColumn, Users,
  Bell, AlertTriangle, Briefcase, Building, Layers, ChevronDown, ChevronUp,
} from "lucide-react-native";
import { ScreenWrapper } from "../../shared/layout/ScreenWrapper";
import { SectionHeader } from "../../shared/components/SectionHeader";
import { AlertStrip } from "../../shared/components/AlertStrip";
import { StatCard } from "../../shared/components/StatCard";
import { Card } from "../../shared/components/Card";
import { QuickButton } from "../../shared/components/QuickButton";
import { useApp } from "../../context/AppContext";
import { colors, fontSize, spacing, borderRadius } from "../../theme/theme";

export function RmDashboardScreen() {
  const {
    scopedBranches, scopedUsers, scopedTasks, scopedComplaints,
    scopedApprovals, scopedNotifications, scopedAppliances,
    currentUser, showToast, setPage, openBranchDetail, openAuditTrail,
  } = useApp();

  const [showFilters, setShowFilters] = useState(false);
  const [selectedRegion, setSelectedRegion] = useState("all");
  const [selectedBranchId, setSelectedBranchId] = useState<string | number>("all");

  const uniqueRegions = useMemo(() => {
    const regions = scopedBranches.map((b) => {
      let r = b.city || "";
      if (r.toLowerCase() === "chhatisgarh") return "Chhattisgarh";
      return r;
    }).filter((c) => c && c !== "Pending");
    return Array.from(new Set(regions)).sort();
  }, [scopedBranches]);

  const activeBranchIds = useMemo(() => {
    if (selectedBranchId === "all") return scopedBranches.map(b => b.id);
    return [selectedBranchId];
  }, [scopedBranches, selectedBranchId]);

  const activeBranches = useMemo(() => {
    if (selectedBranchId === "all") return scopedBranches;
    return scopedBranches.filter(b => b.id === selectedBranchId);
  }, [scopedBranches, selectedBranchId]);

  const totalBranches = scopedBranches.length;
  const avgHealth = Math.round(scopedBranches.reduce((s, b) => s + b.health, 0) / (totalBranches || 1));
  const avgAttendance = Math.round(scopedBranches.reduce((s, b) => s + b.todayAttendance, 0) / (totalBranches || 1));
  const criticalAlerts = scopedBranches.reduce((s, b) => s + b.criticalAlerts, 0);
  const pendingApprovals = scopedApprovals.filter((a) => a.status === "Pending").length;

  const lowHealthBranches = scopedBranches.filter((b) => b.health < 80).length;
  const lcCount = scopedUsers.filter((u) => u.role === "lc").length;
  const aaCount = scopedUsers.filter((u) => u.role === "aa").length;
  const amCount = scopedUsers.filter((u) => u.role === "branchManager").length;

  return (
    <ScreenWrapper>
      <ScrollView contentContainerStyle={{ paddingBottom: spacing["5xl"] }}>
        <SectionHeader
          title="Regional Dashboard"
          subtitle={`${totalBranches} branches · ${amCount} AM · ${aaCount} AA · ${lcCount} LC`}
        />

        <AlertStrip onReviewAlerts={() => setPage("notifications")} onOpenAudit={openAuditTrail} />

        {/* ── Quick Actions — prominent top row ── */}
        <View style={{ marginTop: spacing.xl }}>
          <Text style={{ fontSize: fontSize.xs, color: colors.slate400, marginBottom: spacing.md, fontWeight: "600" }}>
            QUICK ACTIONS
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.md }}>
            <QuickButton label="Add User" icon={UserPlus} onPress={() => setPage("users")} variant="primary" />
            <QuickButton label="View Users" icon={Users} onPress={() => setPage("users")} variant="secondary" />
            <QuickButton label="Analytics" icon={ChartColumn} onPress={() => setPage("analytics")} variant="secondary" />
            <QuickButton label="Alerts" icon={Bell} onPress={() => setPage("notifications")} variant="warning" />
            <QuickButton label="Attendance" icon={Users} onPress={() => setPage("attendance")} variant="secondary" />
          </View>
        </View>

        {/* ── KPI Stats — always visible ── */}
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.lg, marginTop: spacing.xl }}>
          <View style={{ flex: 1, minWidth: 160 }}>
            <StatCard label="Branch Health" value={`${avgHealth}%`} meta={`${lowHealthBranches} below 80%`} icon={HeartPulse} accent={colors.emerald600} />
          </View>
          <View style={{ flex: 1, minWidth: 160 }}>
            <StatCard label="Attendance Avg" value={`${avgAttendance}%`} meta="Across all offices" icon={MapPin} accent={colors.brandSecondary} />
          </View>
          <View style={{ flex: 1, minWidth: 160 }}>
            <StatCard label="Critical Alerts" value={String(criticalAlerts)} meta="Immediate attention" icon={TriangleAlert} accent={colors.error} />
          </View>
          <View style={{ flex: 1, minWidth: 160 }}>
            <StatCard label="Open Approvals" value={String(pendingApprovals)} meta="Awaiting decision" icon={Stamp} accent={colors.slate900} />
          </View>
        </View>

        {/* ── Quick filter toggle ── */}
        <TouchableOpacity onPress={() => setShowFilters(!showFilters)}
          style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm, marginTop: spacing.xl, paddingVertical: spacing.sm }}>
          {showFilters ? (
            <ChevronUp size={14} color={colors.textSecondary} />
          ) : (
            <ChevronDown size={14} color={colors.textSecondary} />
          )}
          <Text style={{ fontSize: fontSize.xs, color: colors.textSecondary, fontWeight: "600" }}>
            {showFilters ? "HIDE FILTERS" : "FILTER BY REGION / BRANCH"}
          </Text>
        </TouchableOpacity>

        {showFilters && (
          <View style={{ marginTop: spacing.md }}>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
              <TouchableOpacity onPress={() => { setSelectedRegion("all"); setSelectedBranchId("all"); }}
                style={{ paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: borderRadius.full, borderWidth: 1, backgroundColor: selectedRegion === "all" ? colors.brand : colors.white, borderColor: selectedRegion === "all" ? colors.brand : colors.border }}>
                <Text style={{ fontSize: fontSize.sm, fontWeight: "500", color: selectedRegion === "all" ? colors.white : colors.slate700 }}>All Regions</Text>
              </TouchableOpacity>
              {uniqueRegions.map((region) => (
                <TouchableOpacity key={region} onPress={() => { setSelectedRegion(region); setSelectedBranchId("all"); }}
                  style={{ paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: borderRadius.full, borderWidth: 1, backgroundColor: selectedRegion === region ? colors.brand : colors.white, borderColor: selectedRegion === region ? colors.brand : colors.border }}>
                  <Text style={{ fontSize: fontSize.sm, fontWeight: "500", color: selectedRegion === region ? colors.white : colors.slate700 }}>{region}</Text>
                </TouchableOpacity>
              ))}
            </View>
            {selectedRegion !== "all" && (
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginTop: spacing.md }}>
                <TouchableOpacity onPress={() => setSelectedBranchId("all")}
                  style={{ paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: borderRadius.full, borderWidth: 1, backgroundColor: selectedBranchId === "all" ? colors.brand : colors.white, borderColor: selectedBranchId === "all" ? colors.brand : colors.border }}>
                  <Text style={{ fontSize: fontSize.sm, fontWeight: "500", color: selectedBranchId === "all" ? colors.white : colors.slate700 }}>All Branches</Text>
                </TouchableOpacity>
                {scopedBranches.filter((b) => {
                  let r = b.city || "";
                  if (r.toLowerCase() === "chhatisgarh") r = "Chhattisgarh";
                  return r === selectedRegion;
                }).map((b) => (
                  <TouchableOpacity key={b.id} onPress={() => setSelectedBranchId(b.id)}
                    style={{ paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: borderRadius.full, borderWidth: 1, backgroundColor: selectedBranchId === b.id ? colors.brand : colors.white, borderColor: selectedBranchId === b.id ? colors.brand : colors.border }}>
                    <Text style={{ fontSize: fontSize.sm, fontWeight: "500", color: selectedBranchId === b.id ? colors.white : colors.slate700 }}>{b.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        )}

        {/* ── Watchlist + Decision Feed ── */}
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.xl, marginTop: spacing.xl }}>
          <View style={{ flex: 1, minWidth: 280 }}>
            <View style={{ backgroundColor: colors.slate900, borderRadius: borderRadius["5xl"], padding: spacing["2xl"], borderWidth: 1, borderColor: "rgba(255,255,255,0.1)" }}>
              <Text style={{ fontSize: fontSize.xl, fontWeight: "800", color: colors.white, letterSpacing: -0.3 }}>Watchlist</Text>
              <View style={{ marginTop: spacing.xl, gap: spacing.md }}>
                {(() => {
                  const items: string[] = [];
                  scopedApprovals.filter((a) => a.status === "Pending" && a.priority === "Critical" && activeBranchIds.includes(a.branchId)).forEach((a) => {
                    const b = scopedBranches.find((br) => br.id === a.branchId);
                    items.push(`${b?.name || "Branch"}: ${a.title} needs approval now.`);
                  });
                  scopedBranches.filter((b) => b.usedBudget / b.monthlyBudget > 0.75).forEach((b) => {
                    items.push(`${b.name} crossed ${Math.round((b.usedBudget / b.monthlyBudget) * 100)}% monthly budget.`);
                  });
                  scopedComplaints.filter((c) => c.status === "VENDOR_PENDING" && activeBranchIds.includes(c.branchId)).forEach((c) => {
                    const b = scopedBranches.find((br) => br.id === c.branchId);
                    items.push(`${b?.name || "Branch"}: ${c.complaintId} is waiting for vendor.`);
                  });
                  scopedBranches.filter((b) => b.health < 80).forEach((b) => {
                    items.push(`${b.name} health at ${b.health}% — review needed.`);
                  });
                  const list = items.slice(0, 5);
                  return list.length > 0 ? list.map((item, idx) => (
                    <View key={idx} style={{ backgroundColor: "rgba(255,255,255,0.1)", borderRadius: borderRadius["2xl"], padding: spacing.xl }}>
                      <Text style={{ fontSize: fontSize.sm, color: "rgba(255,255,255,0.9)", lineHeight: 18 }}>{item}</Text>
                    </View>
                  )) : (
                    <View style={{ backgroundColor: "rgba(255,255,255,0.1)", borderRadius: borderRadius["2xl"], padding: spacing.xl }}>
                      <Text style={{ fontSize: fontSize.sm, color: "rgba(255,255,255,0.6)" }}>All clear — no watchlist items.</Text>
                    </View>
                  );
                })()}
              </View>
            </View>
          </View>
          <View style={{ flex: 1, minWidth: 280 }}>
            <Card variant="glass">
              <Text style={{ fontSize: fontSize.xl, fontWeight: "800", color: colors.slate900, letterSpacing: -0.3 }}>Decision Feed</Text>
              <View style={{ marginTop: spacing.xl, gap: spacing.md }}>
                {(() => {
                  const items: { text: string; priority: string }[] = [];
                  scopedComplaints.filter((c) => c.priority === "Critical" && c.status !== "RESOLVED" && activeBranchIds.includes(c.branchId)).forEach((c) => {
                    const b = scopedBranches.find((br) => br.id === c.branchId);
                    items.push({ text: `Critical issue at ${b?.name || "branch"} — ${c.complaintId}.`, priority: c.priority });
                  });
                  scopedApprovals.filter((a) => a.status === "Pending" && a.stage === "RM" && activeBranchIds.includes(a.branchId)).forEach((a) => {
                    const b = scopedBranches.find((br) => br.id === a.branchId);
                    items.push({ text: `${a.title} at ${b?.name || "branch"} awaiting RM approval.`, priority: a.priority });
                  });

                  const list = items.slice(0, 4);
                  return list.length > 0 ? list.map((item, idx) => (
                    <View key={idx} style={{ backgroundColor: colors.slate50, borderRadius: borderRadius["2xl"], padding: spacing.xl, borderLeftWidth: 3, borderLeftColor: item.priority === "Critical" ? colors.error : item.priority === "High" ? colors.warning : colors.brand }}>
                      <Text style={{ fontSize: fontSize.sm, color: colors.slate600, lineHeight: 18 }}>{item.text}</Text>
                    </View>
                  )) : (
                    <View style={{ backgroundColor: colors.slate50, borderRadius: borderRadius["2xl"], padding: spacing.xl }}>
                      <Text style={{ fontSize: fontSize.sm, color: colors.slate500 }}>No pending decisions.</Text>
                    </View>
                  );
                })()}
              </View>
            </Card>
          </View>
        </View>
      </ScrollView>
    </ScreenWrapper>
  );
}
