import React, { useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, TextInput } from "react-native";
import { CheckCircle2, CalendarDays, Send } from "lucide-react-native";
import { ScreenWrapper } from "../../shared/layout/ScreenWrapper";
import { SectionHeader } from "../../shared/components/SectionHeader";
import { Card } from "../../shared/components/Card";
import { Badge } from "../../shared/components/Badge";
import { SegmentedControl } from "../../shared/components/SegmentedControl";
import { useApp } from "../../context/AppContext";
import { colors, fontSize, spacing, borderRadius } from "../../theme/theme";

export function BranchManagerAttendanceScreen() {
  const { scopedAttendance, state, currentUser, markAttendance, showToast } = useApp();
  const [activeTab, setActiveTab] = useState("mark");
  const [remarks, setRemarks] = useState("");

  const myAttendance = scopedAttendance.filter((a) => String(a.userId) === String(currentUser?.id));
  const myToday = myAttendance.find((a) => a.date === state.today);
  const isPresent = myToday?.status === "Present" || myToday?.status === "Late";

  const calendarDays = Array.from({ length: 15 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - i);
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
  });

  let currentMonthLabel = "";
  try {
    currentMonthLabel = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Kolkata", month: "long", year: "numeric" }).format(new Date());
  } catch (e) {
    currentMonthLabel = new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' });
  }

  const handleMarkAttendance = () => {
    if (isPresent) {
      showToast("Attendance already marked for today");
      return;
    }
    markAttendance({ remarks });
  };

  return (
    <ScreenWrapper>
      <SectionHeader title="My Attendance" />
      <View style={{ marginTop: spacing.lg, marginBottom: spacing.xl }}>
        <SegmentedControl
          tabs={[
            { label: "Mark Attendance", value: "mark" },
            { label: "My History", value: "history" },
          ]}
          activeKey={activeTab}
          onChange={(v) => setActiveTab(v)}
        />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: spacing.xl, paddingBottom: 40 }}>
        {activeTab === "mark" && (
          <Card variant="glass">
            <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md, marginBottom: spacing.lg }}>
              <View style={{ width: 32, height: 32, borderRadius: borderRadius.md, backgroundColor: colors.brand + "15", alignItems: "center", justifyContent: "center" }}>
                <Send size={16} color={colors.brand} strokeWidth={2} />
              </View>
              <Text style={{ fontSize: fontSize.lg, fontWeight: "400", color: colors.text }}>Mark your attendance</Text>
            </View>

            {isPresent ? (
              <View style={{ backgroundColor: colors.emerald50, borderRadius: borderRadius.lg, padding: spacing.xl, flexDirection: "row", alignItems: "center", gap: spacing.md }}>
                <CheckCircle2 size={16} color={colors.success} strokeWidth={2} />
                <Text style={{ fontSize: fontSize.sm, fontWeight: "400", color: colors.success }}>Attendance marked today at {myToday?.checkIn}</Text>
              </View>
            ) : (
              <View style={{ gap: spacing.md }}>
                <View style={{ backgroundColor: colors.slate50, borderRadius: borderRadius.lg, padding: spacing.md, borderWidth: 1, borderColor: colors.border }}>
                  <Text style={{ fontSize: fontSize.sm, fontWeight: "500", color: colors.slate700, marginBottom: spacing.xs }}>Daily To-Do / Tasks Completed</Text>
                  <TextInput
                    value={remarks}
                    onChangeText={setRemarks}
                    placeholder="Enter what you plan to do or have completed today..."
                    placeholderTextColor={colors.slate400}
                    style={{ fontSize: fontSize.sm, color: colors.slate900, minHeight: 80, textAlignVertical: "top" }}
                    multiline
                  />
                </View>
                <TouchableOpacity onPress={handleMarkAttendance} style={{ backgroundColor: colors.brand, borderRadius: borderRadius.lg, paddingHorizontal: spacing.xl, paddingVertical: spacing.md, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: spacing.sm }}>
                  <Send size={14} color={colors.white} strokeWidth={2} />
                  <Text style={{ fontSize: fontSize.sm, fontWeight: "400", color: colors.white }}>Mark Attendance Now</Text>
                </TouchableOpacity>
              </View>
            )}
          </Card>
        )}

        {activeTab === "history" && (
          <Card variant="glass">
            <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md, marginBottom: spacing.lg }}>
              <View style={{ width: 32, height: 32, borderRadius: borderRadius.md, backgroundColor: colors.brand + "15", alignItems: "center", justifyContent: "center" }}>
                <CalendarDays size={16} color={colors.brand} strokeWidth={2} />
              </View>
              <Text style={{ fontSize: fontSize.lg, fontWeight: "400", color: colors.text }}>My Calendar - {currentMonthLabel}</Text>
            </View>

            <View style={{ gap: spacing.lg }}>
              {calendarDays.map((date) => {
                const attRecord = scopedAttendance.find((a) => String(a.userId) === String(currentUser?.id) && a.date === date);
                const wasPresent = attRecord?.status === "Present" || attRecord?.status === "Late";
                const todoText = attRecord?.remarks || (attRecord?.weeklyTasks || []).map((t) => t.description).filter(Boolean).join(", ");

                return (
                  <View key={date} style={{ backgroundColor: colors.white, borderRadius: borderRadius.lg, padding: spacing.xl, borderWidth: 1, borderColor: colors.border, gap: spacing.md }}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderBottomWidth: 1, borderColor: colors.slate100, paddingBottom: spacing.md }}>
                      <Text style={{ fontSize: fontSize.md, fontWeight: "400", color: colors.slate900 }}>{date}</Text>
                      <Badge label={wasPresent ? "Present" : "Absent"} type={wasPresent ? "Completed" : "Pending"} />
                    </View>

                    {todoText ? (
                      <View style={{ gap: spacing.sm, paddingTop: spacing.xs }}>
                        <Text style={{ fontSize: fontSize.xs, color: colors.slate500, textTransform: "uppercase" }}>Daily To-Do / Tasks</Text>
                        <View style={{ backgroundColor: colors.slate50, padding: spacing.md, borderRadius: borderRadius.md, borderWidth: 1, borderColor: colors.slate100 }}>
                          <Text style={{ fontSize: fontSize.sm, color: colors.slate700 }}>{todoText}</Text>
                        </View>
                      </View>
                    ) : (
                      <View style={{ paddingTop: spacing.xs }}>
                        <Text style={{ fontSize: fontSize.sm, color: colors.slate400, fontStyle: "italic" }}>No tasks recorded</Text>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          </Card>
        )}
      </ScrollView>
    </ScreenWrapper>
  );
}
