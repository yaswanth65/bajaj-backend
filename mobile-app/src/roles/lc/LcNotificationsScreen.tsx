import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Bell, Eye, EyeOff, Bookmark, BookmarkCheck, ChevronRight } from "lucide-react-native";
import { ScreenWrapper } from "../../shared/layout/ScreenWrapper";
import { SectionHeader } from "../../shared/components/SectionHeader";
import { SegmentedControl } from "../../shared/components/SegmentedControl";
import { Card } from "../../shared/components/Card";
import { Badge } from "../../shared/components/Badge";
import { useApp } from "../../context/AppContext";
import { colors, fontSize, spacing, borderRadius } from "../../theme/theme";
import { NotificationItem } from "../../types/domain";

export function LcNotificationsScreen() {
  const { state, setTab, setPage, scopedNotifications, scopedTasks, scopedComplaints, toggleNotificationRead, toggleBookmark, openTaskDetail, openComplaintDetail, openBranchDetail, showToast } = useApp();
  const filter = state.tabs.notifications;
  const list = scopedNotifications.filter((item) => {
    if (filter === "all") return true;
    if (filter === "unread") return !item.read;
    if (filter === "bookmarked") return item.bookmarked;
    return item.priority === "Critical";
  });

  const handleNotificationTap = (item: NotificationItem) => {
    if (!item.read) toggleNotificationRead(item.id);

    const titleLower = item.title.toLowerCase();
    const detailLower = item.detail.toLowerCase();

    const taskMatch = item.detail.match(/task\s*([0-9a-fA-F-]+)/i);
    if (taskMatch) {
      const taskId = taskMatch[1];
      const task = scopedTasks.find((t) => t.id === taskId);
      if (task) { openTaskDetail(task.id); return; }
    }

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

    if (item.branchId) {
      openBranchDetail(item.branchId);
      return;
    }

    showToast("Notification: " + item.title);
  };

  return (
    <ScreenWrapper>
      <SectionHeader
        title="Notification center"
        action={
          <SegmentedControl
            tabs={[{ label: "All", value: "all" }, { label: "Unread", value: "unread" }, { label: "Bookmarked", value: "bookmarked" }, { label: "Critical", value: "critical" }]}
            activeKey={filter}
            onChange={(v) => setTab("notifications", v)}
          />
        }
      />

      <View style={{ gap: spacing.xl, marginTop: spacing.xl }}>
        {list.map((item) => (
          <TouchableOpacity key={item.id} onPress={() => handleNotificationTap(item)} activeOpacity={0.7}>
            <Card variant="glass">
              <View style={{ gap: spacing.lg }}>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, alignItems: "center" }}>
                    <Badge label={item.priority} type={item.priority} />
                    <Badge label={item.read ? "Read" : "Unread"} type={item.read ? "Completed" : "Pending"} />
                  </View>
                  <View style={{ flexDirection: "row", alignItems: "flex-start", gap: spacing.md, marginTop: spacing.lg }}>
                    <View style={{ width: 28, height: 28, borderRadius: borderRadius.md, backgroundColor: item.priority === "Critical" ? colors.error + "15" : colors.brand + "15", alignItems: "center", justifyContent: "center", marginTop: 2 }}>
                      <Bell size={14} color={item.priority === "Critical" ? colors.error : colors.brand} strokeWidth={2} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: fontSize.lg, fontWeight: "400", color: colors.text }}>{item.title}</Text>
                      <Text style={{ fontSize: fontSize.sm, color: colors.textSecondary, marginTop: spacing.xs }}>{item.detail}</Text>
                    </View>
                    <ChevronRight size={16} color={colors.textSecondary} strokeWidth={2} />
                  </View>
                  <Text style={{ fontSize: fontSize.xs, fontWeight: "400", color: colors.textSecondary, marginTop: spacing.lg, textTransform: "uppercase" }}>{item.time}</Text>
                </View>
                <View style={{ flexDirection: "row", gap: spacing.sm }}>
                  <TouchableOpacity onPress={() => toggleNotificationRead(item.id)} style={{ backgroundColor: colors.brand, borderRadius: borderRadius.lg, paddingHorizontal: spacing.xl, paddingVertical: spacing.sm, flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
                    {item.read ? <EyeOff size={12} color={colors.white} strokeWidth={2} /> : <Eye size={12} color={colors.white} strokeWidth={2} />}
                    <Text style={{ fontSize: fontSize.sm, fontWeight: "400", color: colors.white }}>{item.read ? "Mark unread" : "Mark read"}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => toggleBookmark(item.id)} style={{ backgroundColor: colors.card, borderRadius: borderRadius.lg, paddingHorizontal: spacing.xl, paddingVertical: spacing.sm, borderWidth: 1, borderColor: colors.border, flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
                    {item.bookmarked ? <BookmarkCheck size={12} color={colors.brand} strokeWidth={2} /> : <Bookmark size={12} color={colors.textSecondary} strokeWidth={2} />}
                    <Text style={{ fontSize: fontSize.sm, fontWeight: "400", color: colors.text }}>{item.bookmarked ? "Remove bookmark" : "Bookmark"}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </Card>
          </TouchableOpacity>
        ))}
        {list.length === 0 && (
          <Card variant="glass">
            <View style={{ alignItems: "center", padding: spacing["4xl"] }}>
              <Bell size={32} color={colors.textSecondary} strokeWidth={1.5} />
              <Text style={{ fontSize: fontSize.lg, fontWeight: "400", color: colors.text, marginTop: spacing.lg }}>No notifications</Text>
              <Text style={{ fontSize: fontSize.sm, color: colors.textSecondary, marginTop: spacing.sm }}>No notifications in this filter</Text>
            </View>
          </Card>
        )}
      </View>
    </ScreenWrapper>
  );
}
