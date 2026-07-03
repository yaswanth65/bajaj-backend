import React, { useState, useMemo, useEffect, useCallback } from "react";
import { View, Text, TextInput, TouchableOpacity, ScrollView } from "react-native";
import { ClipboardCheck, Search, Timer, FileCheck, Layers, ChevronDown, Clock, XCircle, CheckCircle2, UserCheck } from "lucide-react-native";
import { ScreenWrapper } from "../../shared/layout/ScreenWrapper";
import { SectionHeader } from "../../shared/components/SectionHeader";
import { StatCard } from "../../shared/components/StatCard";
import { Card } from "../../shared/components/Card";
import { TaskCard } from "../../shared/components/TaskCard";
import { SegmentedControl } from "../../shared/components/SegmentedControl";
import { DatePickerDropdown } from "../../shared/components/DatePickerDropdown";
import { FilterDropdown } from "../../shared/components/FilterDropdown";
import { Badge } from "../../shared/components/Badge";
import { useApp } from "../../context/AppContext";
import { apiClient } from "../../services/api/client";
import { AttendanceLog } from "../../types/domain";
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

export function RmMonitoringScreen() {
  const { state, setTab, scopedBranches, scopedTasks, scopedUsers } = useApp();
  const activeTab = state.tabs.managerMonitoring === "attendance" ? "attendance" : "weekly";

  const [selectedRegion, setSelectedRegion] = useState("");
  const [selectedBranchId, setSelectedBranchId] = useState<string | number>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [visibleTasksLimit, setVisibleTasksLimit] = useState(30);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceLog[]>([]);
  const [loadingAttendance, setLoadingAttendance] = useState(false);

  const STATUS_OPTIONS = [
    { label: "All Status", value: "all" },
    { label: "Pending", value: "Pending" },
    { label: "In Progress", value: "In Progress" },
    { label: "Completed", value: "Completed" },
  ];

  // Fetch attendance records when Attendance tab is active
  const fetchAttendance = useCallback(async () => {
    if (activeTab !== "attendance" || !selectedRegion || selectedBranchId === "") return;
    setLoadingAttendance(true);
    try {
      const res = await apiClient.get("/rm/attendance");
      const records: AttendanceLog[] = (res.data?.attendance || []).map((item: any, index: number) => ({
        id: item.id || index + 1,
        userId: item.userId || "",
        date: item.date,
        status: item.status,
        checkIn: item.checkIn,
        checkOut: item.checkOut,
        location: item.location || "Inside geo fence - 40m",
        proof: item.proof || "Geo + selfie verified",
        deviation: item.deviation || "No",
        remarks: item.remarks,
        weeklyTasks: item.weeklyTasks || [],
      }));
      setAttendanceRecords(records);
    } catch (e) {
      console.error("Failed to fetch attendance:", e);
      setAttendanceRecords([]);
    } finally {
      setLoadingAttendance(false);
    }
  }, [activeTab, selectedRegion, selectedBranchId]);

  useEffect(() => {
    fetchAttendance();
  }, [fetchAttendance]);

  // Reset branch selection and page limit when region changes
  useEffect(() => {
    setSelectedBranchId("");
    setVisibleTasksLimit(30);
  }, [selectedRegion]);

  // Reset page limit when branch or filters change
  useEffect(() => {
    setVisibleTasksLimit(30);
  }, [selectedBranchId, activeTab, searchQuery, statusFilter, fromDate, toDate]);

  // Extract unique regions (normalizing Chhattisgarh typos)
  const uniqueRegions = useMemo(() => {
    const regions = scopedBranches.map((b) => {
      let r = b.city || "";
      if (r.toLowerCase() === "chhatisgarh") return "Chhattisgarh";
      return r;
    }).filter((c) => c && c !== "Pending");
    return Array.from(new Set(regions)).sort();
  }, [scopedBranches]);

  // Dynamically filter branches based on selected region
  const branchesInRegion = useMemo(() => {
    if (!selectedRegion) return [];
    if (selectedRegion === "all") return scopedBranches;
    return scopedBranches.filter((b) => {
      let r = b.city || "";
      if (r.toLowerCase() === "chhatisgarh") r = "Chhattisgarh";
      return r === selectedRegion;
    });
  }, [scopedBranches, selectedRegion]);

  const filteredTasks = useMemo(() => {
    if (!selectedRegion || selectedBranchId === "") return [];

    const activeBranchIds = selectedBranchId !== "all"
      ? [selectedBranchId]
      : branchesInRegion.map(b => b.id);

    return scopedTasks.filter((t) => {
      if (!activeBranchIds.includes(t.branchId)) return false;
      if (activeTab === "weekly" && t.schedule !== "Weekly") return false;
      if (statusFilter !== "all" && t.status !== statusFilter) return false;
      const taskDate = t.deadline ? String(t.deadline).slice(0, 10) : "";
      if (fromDate && taskDate < fromDate) return false;
      if (toDate && taskDate > toDate) return false;
      return true;
    }).filter((t) => {
      const q = searchQuery.toLowerCase();
      if (!q) return true;
      return t.title.toLowerCase().includes(q) || t.zone.toLowerCase().includes(q);
    }).sort((a, b) => {
      if ((a.status === "Pending" || a.status === "In Progress") && b.status === "Completed") return -1;
      if (a.status === "Completed" && (b.status === "Pending" || b.status === "In Progress")) return 1;
      return 0;
    });
  }, [scopedTasks, branchesInRegion, selectedRegion, selectedBranchId, activeTab, searchQuery, statusFilter, fromDate, toDate]);

  const pending = filteredTasks.filter((t) => t.status === "Pending" || t.status === "In Progress").length;
  const completed = filteredTasks.filter((t) => t.status === "Completed").length;

  const slicedTasks = useMemo(() => {
    return filteredTasks.slice(0, visibleTasksLimit);
  }, [filteredTasks, visibleTasksLimit]);

  // Filter attendance by selected branch + date range
  const filteredAttendance = useMemo(() => {
    if (!selectedRegion || selectedBranchId === "") return [];

    const activeBranchIds = selectedBranchId !== "all"
      ? [selectedBranchId]
      : branchesInRegion.map(b => b.id);

    const branchUserIds = scopedUsers.filter(u => activeBranchIds.includes(u.branchId)).map(u => u.id);

    return attendanceRecords.filter(a => {
      if (!branchUserIds.includes(a.userId)) return false;
      if (fromDate && a.date < fromDate) return false;
      if (toDate && a.date > toDate) return false;
      return true;
    }).filter((a) => {
      const q = searchQuery.toLowerCase();
      if (!q) return true;
      const user = scopedUsers.find(u => u.id === a.userId);
      return user?.name.toLowerCase().includes(q);
    });
  }, [attendanceRecords, scopedUsers, branchesInRegion, selectedRegion, selectedBranchId, fromDate, toDate, searchQuery]);

  return (
    <ScreenWrapper>
      <SectionHeader title="Regional Task Monitor" />

      {/* STEP 1: REGIONS PICKER */}
      <View style={{ marginTop: spacing.xl }}>
        <Text style={{ fontSize: fontSize.xs, color: colors.slate400, marginBottom: spacing.sm, fontWeight: "600" }}>
          1. CHOOSE REGION
        </Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
          <TouchableChip label="All Regions" isSelected={selectedRegion === "all"} onPress={() => setSelectedRegion("all")} />
          {uniqueRegions.map((region) => (
            <TouchableChip key={region} label={region} isSelected={selectedRegion === region} onPress={() => setSelectedRegion(region)} />
          ))}
        </View>
      </View>

      {/* STEP 2: BRANCH PICKER (revealed only after region selected) */}
      {selectedRegion !== "" ? (
        <View style={{ marginTop: spacing.xl }}>
          <Text style={{ fontSize: fontSize.xs, color: colors.slate400, marginBottom: spacing.sm, fontWeight: "600" }}>
            2. CHOOSE BRANCH
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
            <TouchableChip label="All Branches" isSelected={selectedBranchId === "all"} onPress={() => setSelectedBranchId("all")} />
            {branchesInRegion.map((b) => (
              <TouchableChip key={b.id} label={b.name} isSelected={selectedBranchId === b.id} onPress={() => setSelectedBranchId(b.id)} />
            ))}
          </View>
        </View>
      ) : (
        <Card style={{ marginTop: spacing.xl, padding: spacing.xl, borderStyle: "dashed", borderWidth: 1, borderColor: colors.border, alignItems: "center" }}>
          <Layers size={24} color={colors.slate300} style={{ marginBottom: spacing.sm }} />
          <Text style={{ fontSize: fontSize.sm, color: colors.slate400 }}>Select a region above to load branches</Text>
        </Card>
      )}

      {/* STEP 3: CONTROLS & CHECK LIST (revealed only after branch selected) */}
      {selectedRegion !== "" && selectedBranchId !== "" ? (
        <>
          <View style={{ marginTop: spacing.xl }}>
            <SegmentedControl
              tabs={[
                { label: "Weekly Checks", value: "weekly" },
                { label: "Attendance", value: "attendance" },
              ]}
              activeKey={activeTab}
              onChange={(v) => setTab("managerMonitoring", v)}
            />
          </View>

          {activeTab === "attendance" ? (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.lg, marginTop: spacing.xl }}>
              <View style={{ flex: 1, minWidth: 280 }}><StatCard label="Present" value={String(filteredAttendance.filter(a => a.status === "Present" || a.status === "Late").length)} meta="Punched in" accent={colors.success} icon={UserCheck} /></View>
              <View style={{ flex: 1, minWidth: 280 }}><StatCard label="Absent" value={String(filteredAttendance.filter(a => a.status !== "Present" && a.status !== "Late").length)} meta="No punch-in" accent={colors.error} icon={XCircle} /></View>
            </View>
          ) : (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.lg, marginTop: spacing.xl }}>
              <View style={{ flex: 1, minWidth: 280 }}><StatCard label="Pending" value={String(pending)} meta="Awaiting completion" accent={colors.brand} icon={Timer} /></View>
              <View style={{ flex: 1, minWidth: 280 }}><StatCard label="Completed" value={String(completed)} meta="Proof accepted" accent={colors.success} icon={FileCheck} /></View>
            </View>
          )}

          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.md, marginTop: spacing.xl }}>
            <View style={{ flex: 1, minWidth: 200, flexDirection: "row", alignItems: "center", backgroundColor: colors.white, borderRadius: borderRadius.lg, paddingHorizontal: spacing.md, borderWidth: 1, borderColor: colors.border }}>
              <Search size={16} color={colors.slate400} />
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder={activeTab === "attendance" ? "Search staff..." : "Search checks..."}
                placeholderTextColor={colors.slate400}
                style={{ flex: 1, paddingVertical: spacing.md, paddingHorizontal: spacing.sm, color: colors.slate900, fontSize: fontSize.sm }}
              />
              {activeTab !== "attendance" && (
                <>
                  <View style={{ width: 1, height: 24, backgroundColor: colors.border, marginHorizontal: spacing.xs }} />
                  <FilterDropdown value={statusFilter} options={STATUS_OPTIONS} onChange={setStatusFilter} placeholder="Status" />
                </>
              )}
            </View>
          </View>

          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.md, marginTop: spacing.md }}>
            <View style={{ flex: 1, minWidth: 140, flexDirection: "row", alignItems: "center", backgroundColor: colors.white, borderRadius: borderRadius.lg, paddingHorizontal: spacing.md, borderWidth: 1, borderColor: colors.border }}>
              <DatePickerDropdown value={fromDate} onChange={setFromDate} placeholder="From" />
            </View>
            <View style={{ flex: 1, minWidth: 140, flexDirection: "row", alignItems: "center", backgroundColor: colors.white, borderRadius: borderRadius.lg, paddingHorizontal: spacing.md, borderWidth: 1, borderColor: colors.border }}>
              <DatePickerDropdown value={toDate} onChange={setToDate} placeholder="To" />
            </View>
          </View>

          {activeTab === "attendance" ? (
            <View style={{ marginTop: spacing.xl }}>
              <Card variant="glass">
                <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md, marginBottom: spacing.lg }}>
                  <View style={{ width: 32, height: 32, borderRadius: borderRadius.md, backgroundColor: colors.success + "15", alignItems: "center", justifyContent: "center" }}>
                    <Clock size={16} color={colors.success} strokeWidth={2} />
                  </View>
                  <Text style={{ fontSize: fontSize.lg, fontWeight: "400", color: colors.text }}>Staff Attendance</Text>
                </View>
                <ScrollView style={{ maxHeight: 500 }} showsVerticalScrollIndicator={false}>
                  {loadingAttendance ? (
                    <Text style={{ fontSize: fontSize.sm, color: colors.textSecondary, textAlign: "center", padding: spacing["4xl"] }}>Loading attendance...</Text>
                  ) : filteredAttendance.length > 0 ? (
                    <View style={{ gap: spacing.md }}>
                      {filteredAttendance.map((record) => {
                        const user = scopedUsers.find(u => u.id === record.userId);
                        const isPresent = record.status === "Present" || record.status === "Late";
                        return (
                          <View key={record.id} style={{ backgroundColor: colors.white, borderRadius: borderRadius["2xl"], padding: spacing.xl, borderWidth: 1, borderColor: colors.border }}>
                            <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md }}>
                              <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: isPresent ? colors.emerald50 : colors.rose50, alignItems: "center", justifyContent: "center" }}>
                                {isPresent ? <CheckCircle2 size={18} color={colors.emerald700} strokeWidth={2} /> : <XCircle size={18} color={colors.rose700} strokeWidth={2} />}
                              </View>
                              <View style={{ flex: 1 }}>
                                <Text style={{ fontSize: fontSize.md, fontWeight: "400", color: colors.text }}>{user?.name || "Unknown"}</Text>
                                <Text style={{ fontSize: fontSize.xs, color: colors.textSecondary }}>
                                  {record.date} • {isPresent ? `Punched in at ${record.checkIn}` : "Not punched in"}
                                </Text>
                              </View>
                              <Badge label={record.status || "Absent"} type={isPresent ? "Completed" : "Pending"} />
                            </View>

                            {record.remarks ? (
                              <View style={{ marginTop: spacing.md, paddingTop: spacing.md, borderTopWidth: 1, borderColor: colors.slate100, gap: spacing.xs }}>
                                <Text style={{ fontSize: fontSize.xs, color: colors.slate500, textTransform: "uppercase" }}>Daily To-Do / Tasks</Text>
                                <View style={{ backgroundColor: colors.slate50, padding: spacing.md, borderRadius: borderRadius.md, borderWidth: 1, borderColor: colors.slate100 }}>
                                  <Text style={{ fontSize: fontSize.sm, color: colors.slate700 }}>{record.remarks}</Text>
                                </View>
                              </View>
                            ) : null}
                          </View>
                        );
                      })}
                    </View>
                  ) : (
                    <Text style={{ fontSize: fontSize.sm, color: colors.textSecondary, textAlign: "center", padding: spacing["4xl"] }}>No attendance records for the selected filters</Text>
                  )}
                </ScrollView>
              </Card>
            </View>
          ) : (
            <View style={{ marginTop: spacing.xl }}>
              <Card variant="glass">
                <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md, marginBottom: spacing.lg }}>
                  <View style={{ width: 32, height: 32, borderRadius: borderRadius.md, backgroundColor: colors.brand + "15", alignItems: "center", justifyContent: "center" }}>
                    <ClipboardCheck size={16} color={colors.brand} strokeWidth={2} />
                  </View>
                  <Text style={{ fontSize: fontSize.lg, fontWeight: "400", color: colors.text }}>Check List</Text>
                </View>
                <View style={{ gap: spacing.xl }}>
                  {slicedTasks.length > 0 ? (
                    <>
                      {slicedTasks.map((task) => (
                        <TaskCard
                          key={task.id}
                          task={task}
                        />
                      ))}

                      {/* Pagination Load More Button */}
                      {filteredTasks.length > visibleTasksLimit && (
                        <TouchableOpacity
                          onPress={() => setVisibleTasksLimit(prev => prev + 30)}
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            justifyContent: "center",
                            backgroundColor: colors.slate100,
                            borderRadius: borderRadius.lg,
                            paddingVertical: spacing.md,
                            marginTop: spacing.md,
                            gap: spacing.sm
                          }}
                        >
                          <ChevronDown size={16} color={colors.slate600} />
                          <Text style={{ fontSize: fontSize.sm, fontWeight: "600", color: colors.slate600 }}>
                            Load More (+{filteredTasks.length - visibleTasksLimit} checks remaining)
                          </Text>
                        </TouchableOpacity>
                      )}
                    </>
                  ) : (
                    <Text style={{ fontSize: fontSize.sm, color: colors.textSecondary, textAlign: "center", padding: spacing["4xl"] }}>No checks to show</Text>
                  )}
                </View>
              </Card>
            </View>
          )}
        </>
      ) : (
        selectedRegion !== "" && (
          <Card style={{ marginTop: spacing.xl, padding: spacing.xl, borderStyle: "dashed", borderWidth: 1, borderColor: colors.border, alignItems: "center" }}>
            <Layers size={24} color={colors.slate300} style={{ marginBottom: spacing.sm }} />
            <Text style={{ fontSize: fontSize.sm, color: colors.slate400 }}>Select a branch or "All Branches" to load {activeTab === "attendance" ? "attendance" : "checks"}</Text>
          </Card>
        )
      )}
    </ScreenWrapper>
  );
}
