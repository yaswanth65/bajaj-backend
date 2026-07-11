import React, { useState, useMemo, useEffect } from "react";
import { View, Text, TouchableOpacity, TextInput } from "react-native";
import { TriangleAlert, AlertCircle, Info, Bell, CheckCircle, Shield, Layers, Building, Users, Wrench, Route } from "lucide-react-native";
import { ScreenWrapper } from "../../shared/layout/ScreenWrapper";
import { SectionHeader } from "../../shared/components/SectionHeader";
import { SegmentedControl } from "../../shared/components/SegmentedControl";
import { Card } from "../../shared/components/Card";
import { Badge } from "../../shared/components/Badge";
import { useApp } from "../../context/AppContext";
import { colors, fontSize, spacing, borderRadius } from "../../theme/theme";

function TouchableChip({ label, isSelected, onPress }: { label: string; isSelected: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: borderRadius.full, borderWidth: 1 },
        isSelected
          ? { backgroundColor: colors.brand, borderColor: colors.brand }
          : { backgroundColor: colors.white, borderColor: colors.border },
      ]}
    >
      <Text
        style={[
          { fontSize: fontSize.sm, fontWeight: "500" },
          isSelected ? { color: colors.white } : { color: colors.slate700 },
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function SubsectionHeader({ title, count, icon: Icon, color }: { title: string; count: number; icon: any; color: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderBottomWidth: 1, borderBottomColor: colors.border, paddingBottom: spacing.sm, marginTop: spacing.xl, marginBottom: spacing.md }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md }}>
        <Icon size={18} color={color} strokeWidth={2} />
        <Text style={{ fontSize: fontSize.md, fontWeight: "700", color: colors.text }}>{title}</Text>
      </View>
      <Badge label={String(count)} type={count > 0 ? "Critical" : "Completed"} />
    </View>
  );
}

export function RmAlertsScreen() {
  const { 
    state, setTab, setPage, scopedNotifications, scopedBranches, scopedComplaints, 
    alertStates, acknowledgeAlert, escalateAlert, openBranchDetail, openComplaintDetail,
    operationalAlerts, operationalAlertsLoading, getOperationalAlerts 
  } = useApp();

  const filter = state.tabs.rmAlerts || "critical";

  const [alertMode, setAlertMode] = useState<"system" | "operational">("system");
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
  const [selectedRegion, setSelectedRegion] = useState("all");
  const [selectedBranchId, setSelectedBranchId] = useState<string | number>("all");
  const [selectedExceptionSection, setSelectedExceptionSection] = useState<string | null>(null);

  useEffect(() => {
    setSelectedBranchId("all");
  }, [selectedRegion]);

  useEffect(() => {
    if (alertMode === "operational") {
      getOperationalAlerts(selectedDate);
    }
  }, [alertMode, selectedDate, getOperationalAlerts]);

  const todayStr = new Date().toISOString().slice(0, 10);
  
  const getYesterdayStr = () => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().slice(0, 10);
  };
  
  const getDayBeforeStr = () => {
    const d = new Date();
    d.setDate(d.getDate() - 2);
    return d.toISOString().slice(0, 10);
  };

  const yesterdayStr = getYesterdayStr();
  const dayBeforeStr = getDayBeforeStr();

  const uniqueRegions = useMemo(() => {
    const regions = scopedBranches.map((b) => {
      let r = b.city || "";
      if (r.toLowerCase() === "chhatisgarh") return "Chhattisgarh";
      return r;
    }).filter((c) => c && c !== "Pending");
    return Array.from(new Set(regions)).sort();
  }, [scopedBranches]);

  const branchesInRegion = useMemo(() => {
    if (!selectedRegion) return [];
    if (selectedRegion === "all") return scopedBranches;
    return scopedBranches.filter((b) => {
      let r = b.city || "";
      if (r.toLowerCase() === "chhatisgarh") r = "Chhattisgarh";
      return r === selectedRegion;
    });
  }, [scopedBranches, selectedRegion]);

  const filtered = scopedNotifications.filter((item) => {
    if (filter !== "all" && item.priority.toLowerCase() !== filter) return false;
    if (selectedRegion === "all" && selectedBranchId === "all") return true;
    if (selectedBranchId === "all") {
      const regionBranchIds = branchesInRegion.map(b => b.id);
      if (!regionBranchIds.includes(item.branchId)) return false;
    } else if (selectedBranchId !== "") {
      if (item.branchId !== selectedBranchId) return false;
    }
    return true;
  });

  const filteredOperational = useMemo(() => {
    return operationalAlerts.filter((item) => {
      if (selectedRegion === "all" && selectedBranchId === "all") return true;
      if (selectedBranchId === "all") {
        const regionBranchIds = branchesInRegion.map(b => b.id);
        if (!regionBranchIds.includes(item.branchId)) return false;
      } else if (selectedBranchId !== "") {
        if (item.branchId !== selectedBranchId) return false;
      }
      return true;
    });
  }, [operationalAlerts, selectedRegion, selectedBranchId, branchesInRegion]);

  const branchOpeningAlerts = useMemo(() => filteredOperational.filter(a => a.type === "branch_not_opened"), [filteredOperational]);
  const missingAttendanceAlerts = useMemo(() => filteredOperational.filter(a => a.type === "missing_attendance"), [filteredOperational]);
  const slaBreachAlerts = useMemo(() => filteredOperational.filter(a => a.type === "unresolved_complaint"), [filteredOperational]);
  const deviationAlerts = useMemo(() => filteredOperational.filter(a => a.type === "attendance_deviation"), [filteredOperational]);

  const renderAlertCard = (item: any) => {
    const isCritical = item.priority === "Critical";
    const isHigh = item.priority === "High";
    const isWarning = item.priority === "Warning";
    
    let iconColor = colors.info;
    if (isCritical) iconColor = colors.error;
    else if (isHigh) iconColor = colors.warning;
    else if (isWarning) iconColor = "#EAB308";

    return (
      <Card variant="glass" key={item.id} style={{ borderLeftWidth: 4, borderLeftColor: iconColor, marginBottom: spacing.md }}>
        <View style={{ flexDirection: "row", alignItems: "flex-start", gap: spacing.lg }}>
          <View style={{ width: 40, height: 40, borderRadius: borderRadius.lg, backgroundColor: isCritical ? colors.rose50 : isHigh ? colors.amber50 : colors.sky50, alignItems: "center", justifyContent: "center" }}>
            {isCritical ? <TriangleAlert size={18} color={colors.error} strokeWidth={2} /> : isHigh ? <AlertCircle size={18} color={colors.warning} strokeWidth={2} /> : <Info size={18} color={colors.info} strokeWidth={2} />}
          </View>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, alignItems: "center" }}>
              <Badge label={item.priority} type={item.priority} />
              <Badge label={item.type.replace(/_/g, " ").toUpperCase()} type="Info" />
            </View>
            <Text style={{ fontSize: fontSize.lg, fontWeight: "800", color: colors.text, marginTop: spacing.md }}>{item.title}</Text>
            <Text style={{ fontSize: fontSize.sm, color: colors.textSecondary, marginTop: spacing.xs }}>{item.detail}</Text>
            <Text style={{ fontSize: fontSize.xs, color: colors.slate400, marginTop: spacing.lg }}>Date: {item.time}</Text>

            <TouchableOpacity
              onPress={() => {
                if (item.type === "branch_not_opened" && item.branchId) {
                  openBranchDetail(item.branchId);
                } else if (item.type === "unresolved_complaint" && item.entityId) {
                  openComplaintDetail(item.entityId);
                } else if ((item.type === "missing_attendance" || item.type === "attendance_deviation") && item.branchId) {
                  setPage("attendance");
                }
              }}
              style={{
                alignSelf: "flex-start",
                marginTop: spacing.lg,
                backgroundColor: colors.slate100,
                borderRadius: borderRadius.md,
                paddingHorizontal: spacing.lg,
                paddingVertical: spacing.sm,
              }}
            >
              <Text style={{ fontSize: fontSize.xs, fontWeight: "700", color: colors.brand }}>
                {item.type === "branch_not_opened" ? "View Branch Details" : item.type === "unresolved_complaint" ? "Go to Complaint" : "Check Attendance"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Card>
    );
  };


  return (
    <ScreenWrapper>
      <SectionHeader
        title="Alert Center"
        action={
          alertMode === "system" ? (
            <SegmentedControl tabs={[{ label: "Critical", value: "critical" }, { label: "Warning", value: "warning" }, { label: "Info", value: "info" }, { label: "All", value: "all" }]} activeKey={filter} onChange={(v) => setTab("rmAlerts", v)} />
          ) : null
        }
      />

      {/* Shared Filters for Region & Branch */}
      <View style={{ marginBottom: spacing.xl, gap: spacing.md }}>
        <View>
          <Text style={{ fontSize: fontSize.xs, color: colors.slate400, marginBottom: spacing.xs, fontWeight: "600" }}>
            1. CHOOSE REGION
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
            <TouchableChip label="All Regions" isSelected={selectedRegion === "all"} onPress={() => setSelectedRegion("all")} />
            {uniqueRegions.map((region) => (
              <TouchableChip key={region} label={region} isSelected={selectedRegion === region} onPress={() => setSelectedRegion(region)} />
            ))}
          </View>
        </View>

        {selectedRegion !== "" && (
          <View>
            <Text style={{ fontSize: fontSize.xs, color: colors.slate400, marginBottom: spacing.xs, fontWeight: "600" }}>
              2. CHOOSE BRANCH
            </Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
              <TouchableChip label="All Branches" isSelected={selectedBranchId === "all"} onPress={() => setSelectedBranchId("all")} />
              {branchesInRegion.map((b) => (
                <TouchableChip key={b.id} label={b.name} isSelected={selectedBranchId === b.id} onPress={() => setSelectedBranchId(b.id)} />
              ))}
            </View>
          </View>
        )}
      </View>

      <View style={{ flexDirection: "row", backgroundColor: colors.slate100, borderRadius: borderRadius.xl, padding: 4, marginBottom: spacing.xl }}>
        <TouchableOpacity
          onPress={() => setAlertMode("system")}
          style={{ flex: 1, paddingVertical: spacing.md, alignItems: "center", backgroundColor: alertMode === "system" ? colors.white : "transparent", borderRadius: borderRadius.lg }}
        >
          <Text style={{ fontSize: fontSize.sm, fontWeight: "800", color: alertMode === "system" ? colors.brand : colors.slate500 }}>System Alerts</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setAlertMode("operational")}
          style={{ flex: 1, paddingVertical: spacing.md, alignItems: "center", backgroundColor: alertMode === "operational" ? colors.white : "transparent", borderRadius: borderRadius.lg }}
        >
          <Text style={{ fontSize: fontSize.sm, fontWeight: "800", color: alertMode === "operational" ? colors.brand : colors.slate500 }}>Operational Exceptions</Text>
        </TouchableOpacity>
      </View>

      {alertMode === "system" ? (
        <>
          {selectedRegion !== "" && selectedBranchId !== "" ? (
            <View style={{ gap: spacing.xl }}>
              {filtered.map((item) => {
                const alertState = alertStates[item.id];
                const isAcknowledged = alertState?.acknowledged || false;
                const isEscalated = alertState?.escalated || false;

                return (
                  <Card variant="glass" key={item.id}>
                    <View style={{ flexDirection: "row", alignItems: "flex-start", gap: spacing.lg }}>
                      <View style={{ width: 40, height: 40, borderRadius: borderRadius.lg, backgroundColor: item.priority === "Critical" ? colors.rose50 : item.priority === "High" ? colors.amber50 : colors.sky50, alignItems: "center", justifyContent: "center" }}>
                        {item.priority === "Critical" ? <TriangleAlert size={18} color={colors.error} strokeWidth={2} /> : item.priority === "High" ? <AlertCircle size={18} color={colors.warning} strokeWidth={2} /> : <Info size={18} color={colors.info} strokeWidth={2} />}
                      </View>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, alignItems: "center" }}>
                          <Badge label={item.priority} type={item.priority} />
                          <Badge label={item.read ? "Read" : "Unread"} type={item.read ? "Completed" : "Pending"} />
                          {isAcknowledged && <Badge label="Acknowledged" type="Completed" />}
                          {isEscalated && <Badge label="Escalated" type="Critical" />}
                        </View>
                        <TouchableOpacity onPress={() => { 
                          const cmpMatch = item.detail.match(/(CMP-\d+-\d+)/i) || item.title.match(/(CMP-\d+-\d+)/i);
                          if (cmpMatch) {
                            const complaint = scopedComplaints.find(c => c.complaintId === cmpMatch[1]);
                            if (complaint) {
                              openComplaintDetail(complaint.id);
                              return;
                            }
                          }

                          const complaintMatch = item.detail.match(/complaint\s*#?(\d+)/i) || item.title.match(/complaint\s*#?(\d+)/i);
                          if (complaintMatch) {
                            const complaint = scopedComplaints.find(c => String(c.id) === complaintMatch[1]);
                            if (complaint) {
                              openComplaintDetail(complaint.id);
                              return;
                            }
                          }

                          const isComplaintRelated = item.title.toLowerCase().includes("complaint") || item.detail.toLowerCase().includes("complaint") || item.title.toLowerCase().includes("issue") || item.detail.toLowerCase().includes("issue");
                          if (isComplaintRelated) {
                            setPage("complaints");
                            return;
                          }

                          const b = scopedBranches.find((br) => br.id === item.branchId); 
                          if (b) openBranchDetail(b.id); 
                        }}>
                          <Text style={{ fontSize: fontSize.lg, fontWeight: "400", color: colors.text, marginTop: spacing.md }}>{item.title}</Text>
                        </TouchableOpacity>
                        <Text style={{ fontSize: fontSize.sm, color: colors.textSecondary, marginTop: spacing.xs }}>{item.detail}</Text>
                        <Text style={{ fontSize: fontSize.xs, color: colors.textSecondary, marginTop: spacing.lg }}>{item.time}</Text>

                        {isAcknowledged && alertState?.acknowledgedAt && (
                          <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm, marginTop: spacing.sm, backgroundColor: colors.emerald50, borderRadius: borderRadius.lg, paddingHorizontal: spacing.md, paddingVertical: spacing.sm }}>
                            <CheckCircle size={12} color={colors.success} strokeWidth={2} />
                            <Text style={{ fontSize: fontSize.xs, color: colors.success }}>Acknowledged at {alertState.acknowledgedAt}</Text>
                          </View>
                        )}
                        {isEscalated && alertState?.escalatedAt && (
                          <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm, marginTop: spacing.sm, backgroundColor: colors.rose50, borderRadius: borderRadius.lg, paddingHorizontal: spacing.md, paddingVertical: spacing.sm }}>
                            <TriangleAlert size={12} color={colors.error} strokeWidth={2} />
                            <Text style={{ fontSize: fontSize.xs, color: colors.error }}>Escalated at {alertState.escalatedAt}</Text>
                          </View>
                        )}
                      </View>
                    </View>
                    <View style={{ flexDirection: "row", gap: spacing.sm, marginTop: spacing.lg }}>
                      {!isAcknowledged ? (
                        <TouchableOpacity onPress={() => acknowledgeAlert(item.id)} style={{ backgroundColor: colors.brand, borderRadius: borderRadius.lg, paddingHorizontal: spacing.xl, paddingVertical: spacing.md, flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
                          <CheckCircle size={14} color={colors.white} strokeWidth={2} />
                          <Text style={{ fontSize: fontSize.sm, fontWeight: "400", color: colors.white }}>Acknowledge</Text>
                        </TouchableOpacity>
                      ) : (
                        <View style={{ backgroundColor: colors.success + "15", borderRadius: borderRadius.lg, paddingHorizontal: spacing.xl, paddingVertical: spacing.md, flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
                          <CheckCircle size={14} color={colors.success} strokeWidth={2} />
                          <Text style={{ fontSize: fontSize.sm, fontWeight: "400", color: colors.success }}>Acknowledged</Text>
                        </View>
                      )}
                      {!isEscalated ? (
                        <TouchableOpacity onPress={() => escalateAlert(item.id)} style={{ backgroundColor: colors.card, borderRadius: borderRadius.lg, paddingHorizontal: spacing.xl, paddingVertical: spacing.md, borderWidth: 1, borderColor: colors.border, flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
                          <TriangleAlert size={14} color={colors.textSecondary} strokeWidth={2} />
                          <Text style={{ fontSize: fontSize.sm, fontWeight: "400", color: colors.text }}>Escalate</Text>
                        </TouchableOpacity>
                      ) : (
                        <View style={{ backgroundColor: colors.rose50, borderRadius: borderRadius.lg, paddingHorizontal: spacing.xl, paddingVertical: spacing.md, flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
                          <Shield size={14} color={colors.error} strokeWidth={2} />
                          <Text style={{ fontSize: fontSize.sm, fontWeight: "400", color: colors.error }}>Escalated</Text>
                        </View>
                      )}
                    </View>
                  </Card>
                );
              })}

              {filtered.length === 0 && (
                <Card variant="glass">
                  <View style={{ alignItems: "center", padding: spacing["4xl"] }}>
                    <Bell size={32} color={colors.textSecondary} strokeWidth={1.5} />
                    <Text style={{ fontSize: fontSize.lg, fontWeight: "400", color: colors.text, marginTop: spacing.lg }}>No alerts</Text>
                    <Text style={{ fontSize: fontSize.sm, color: colors.textSecondary, marginTop: spacing.sm }}>No {filter} alerts for the selected filter</Text>
                  </View>
                </Card>
              )}
            </View>
          ) : null}
        </>
      ) : (
        <>
          <View style={{ marginBottom: spacing.xl }}>
            <Text style={{ fontSize: fontSize.xs, color: colors.slate400, marginBottom: spacing.sm, fontWeight: "600" }}>
              CHOOSE DATE
            </Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginBottom: spacing.md }}>
              <TouchableChip label="Today" isSelected={selectedDate === todayStr} onPress={() => setSelectedDate(todayStr)} />
              <TouchableChip label="Yesterday" isSelected={selectedDate === yesterdayStr} onPress={() => setSelectedDate(yesterdayStr)} />
              <TouchableChip label="2 Days Ago" isSelected={selectedDate === dayBeforeStr} onPress={() => setSelectedDate(dayBeforeStr)} />
            </View>

            <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: colors.slate50, borderWidth: 1, borderColor: colors.border, borderRadius: borderRadius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, gap: spacing.md, maxWidth: 300 }}>
              <Text style={{ fontSize: fontSize.xs, fontWeight: "800", color: colors.slate400 }}>DATE (YYYY-MM-DD):</Text>
              <TextInput
                value={selectedDate}
                onChangeText={setSelectedDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.slate400}
                style={{ flex: 1, fontSize: fontSize.sm, color: colors.text, fontWeight: "600", padding: 0 }}
              />
            </View>
          </View>

          <View style={{ gap: spacing.md }}>
            {operationalAlertsLoading ? (
              <Card variant="glass">
                <View style={{ alignItems: "center", padding: spacing["4xl"] }}>
                  <Text style={{ fontSize: fontSize.sm, color: colors.textSecondary }}>Generating operational exceptions...</Text>
                </View>
              </Card>
            ) : (
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.lg, marginVertical: spacing.md }}>
                {/* 1. Branch Openings */}
                <TouchableOpacity 
                  onPress={() => setSelectedExceptionSection("branch_not_opened")}
                  style={{ flex: 1, minWidth: 250 }}
                >
                  <Card variant="glass" style={{ padding: spacing.xl, borderLeftWidth: 4, borderLeftColor: colors.brand, height: 160, justifyContent: "space-between" }}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                      <View style={{ width: 44, height: 44, borderRadius: borderRadius.lg, backgroundColor: colors.sky50, alignItems: "center", justifyContent: "center" }}>
                        <Building size={20} color={colors.brand} />
                      </View>
                      <Badge label="Operational" type="Info" />
                    </View>
                    <View style={{ marginTop: spacing.md }}>
                      <Text style={{ fontSize: fontSize["3xl"], fontWeight: "800", color: colors.text }}>{branchOpeningAlerts.length}</Text>
                      <Text style={{ fontSize: fontSize.sm, fontWeight: "600", color: colors.textSecondary }}>Branches Unopened</Text>
                      <Text style={{ fontSize: fontSize.xs, color: colors.slate400, marginTop: 4 }}>Click to view all unopened branches</Text>
                    </View>
                  </Card>
                </TouchableOpacity>

                {/* 2. Staff Attendance */}
                <TouchableOpacity 
                  onPress={() => setSelectedExceptionSection("missing_attendance")}
                  style={{ flex: 1, minWidth: 250 }}
                >
                  <Card variant="glass" style={{ padding: spacing.xl, borderLeftWidth: 4, borderLeftColor: colors.warning, height: 160, justifyContent: "space-between" }}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                      <View style={{ width: 44, height: 44, borderRadius: borderRadius.lg, backgroundColor: colors.amber50, alignItems: "center", justifyContent: "center" }}>
                        <Users size={20} color={colors.warning} />
                      </View>
                      <Badge label="Attendance" type="Warning" />
                    </View>
                    <View style={{ marginTop: spacing.md }}>
                      <Text style={{ fontSize: fontSize["3xl"], fontWeight: "800", color: colors.text }}>{missingAttendanceAlerts.length}</Text>
                      <Text style={{ fontSize: fontSize.sm, fontWeight: "600", color: colors.textSecondary }}>Staff Attendance Missing</Text>
                      <Text style={{ fontSize: fontSize.xs, color: colors.slate400, marginTop: 4 }}>Click to view missing check-ins</Text>
                    </View>
                  </Card>
                </TouchableOpacity>

                {/* 3. SLA Breach Complaints */}
                <TouchableOpacity 
                  onPress={() => setSelectedExceptionSection("unresolved_complaint")}
                  style={{ flex: 1, minWidth: 250 }}
                >
                  <Card variant="glass" style={{ padding: spacing.xl, borderLeftWidth: 4, borderLeftColor: colors.error, height: 160, justifyContent: "space-between" }}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                      <View style={{ width: 44, height: 44, borderRadius: borderRadius.lg, backgroundColor: colors.rose50, alignItems: "center", justifyContent: "center" }}>
                        <Wrench size={20} color={colors.error} />
                      </View>
                      <Badge label="SLA Breach" type="Critical" />
                    </View>
                    <View style={{ marginTop: spacing.md }}>
                      <Text style={{ fontSize: fontSize["3xl"], fontWeight: "800", color: colors.text }}>{slaBreachAlerts.length}</Text>
                      <Text style={{ fontSize: fontSize.sm, fontWeight: "600", color: colors.textSecondary }}>SLA Breach Complaints</Text>
                      <Text style={{ fontSize: fontSize.xs, color: colors.slate400, marginTop: 4 }}>Click to view past-24h breaches</Text>
                    </View>
                  </Card>
                </TouchableOpacity>

                {/* 4. Deviations & Half-Days */}
                <TouchableOpacity 
                  onPress={() => setSelectedExceptionSection("attendance_deviation")}
                  style={{ flex: 1, minWidth: 250 }}
                >
                  <Card variant="glass" style={{ padding: spacing.xl, borderLeftWidth: 4, borderLeftColor: colors.info, height: 160, justifyContent: "space-between" }}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                      <View style={{ width: 44, height: 44, borderRadius: borderRadius.lg, backgroundColor: colors.sky50, alignItems: "center", justifyContent: "center" }}>
                        <Route size={20} color={colors.info} />
                      </View>
                      <Badge label="Deviations" type="Info" />
                    </View>
                    <View style={{ marginTop: spacing.md }}>
                      <Text style={{ fontSize: fontSize["3xl"], fontWeight: "800", color: colors.text }}>{deviationAlerts.length}</Text>
                      <Text style={{ fontSize: fontSize.sm, fontWeight: "600", color: colors.textSecondary }}>Deviations & Half-Days</Text>
                      <Text style={{ fontSize: fontSize.xs, color: colors.slate400, marginTop: 4 }}>Click to view geo & checkout logs</Text>
                    </View>
                  </Card>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </>
      )}

      {/* Overlay Modal for Exception Section Details */}
      {selectedExceptionSection !== null && (
        <View style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(15, 23, 42, 0.4)",
          justifyContent: "center",
          alignItems: "center",
          zIndex: 1000,
          padding: spacing.xl,
        }}>
          <View style={{
            width: "100%",
            maxWidth: 800,
            maxHeight: "85%",
            backgroundColor: colors.white,
            borderRadius: borderRadius.xl,
            borderWidth: 1,
            borderColor: colors.border,
            shadowColor: colors.slate900,
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.15,
            shadowRadius: 24,
            padding: spacing.xl,
          }}>
            {/* Modal Header */}
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderBottomWidth: 1, borderBottomColor: colors.border, paddingBottom: spacing.lg, marginBottom: spacing.lg }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md }}>
                {selectedExceptionSection === "branch_not_opened" ? (
                  <Building size={20} color={colors.brand} />
                ) : selectedExceptionSection === "missing_attendance" ? (
                  <Users size={20} color={colors.warning} />
                ) : selectedExceptionSection === "unresolved_complaint" ? (
                  <Wrench size={20} color={colors.error} />
                ) : (
                  <Route size={20} color={colors.info} />
                )}
                <Text style={{ fontSize: fontSize.xl, fontWeight: "800", color: colors.text }}>
                  {selectedExceptionSection === "branch_not_opened" ? "Branch Opening Status Details" :
                   selectedExceptionSection === "missing_attendance" ? "Staff Attendance Exceptions Details" :
                   selectedExceptionSection === "unresolved_complaint" ? "SLA Breach Complaints Details" :
                   "Deviations & Half-Day Logs Details"}
                </Text>
              </View>
              <TouchableOpacity 
                onPress={() => setSelectedExceptionSection(null)}
                style={{ paddingHorizontal: spacing.lg, paddingVertical: spacing.md, backgroundColor: colors.slate100, borderRadius: borderRadius.full }}
              >
                <Text style={{ fontSize: fontSize.sm, fontWeight: "800", color: colors.slate600 }}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Scrollable Alerts List */}
            <View style={{ flex: 1, overflow: "scroll" }}>
              <View style={{ gap: spacing.md, paddingBottom: spacing.xl }}>
                {(selectedExceptionSection === "branch_not_opened" ? branchOpeningAlerts :
                  selectedExceptionSection === "missing_attendance" ? missingAttendanceAlerts :
                  selectedExceptionSection === "unresolved_complaint" ? slaBreachAlerts :
                  deviationAlerts).map(renderAlertCard)}

                {(selectedExceptionSection === "branch_not_opened" ? branchOpeningAlerts :
                  selectedExceptionSection === "missing_attendance" ? missingAttendanceAlerts :
                  selectedExceptionSection === "unresolved_complaint" ? slaBreachAlerts :
                  deviationAlerts).length === 0 && (
                  <View style={{ alignItems: "center", padding: spacing["4xl"] }}>
                    <CheckCircle size={32} color={colors.success} strokeWidth={1.5} />
                    <Text style={{ fontSize: fontSize.lg, fontWeight: "600", color: colors.text, marginTop: spacing.md }}>All Clear</Text>
                    <Text style={{ fontSize: fontSize.sm, color: colors.textSecondary }}>No active exceptions in this category.</Text>
                  </View>
                )}
              </View>
            </View>
          </View>
        </View>
      )}
    </ScreenWrapper>
  );
}
