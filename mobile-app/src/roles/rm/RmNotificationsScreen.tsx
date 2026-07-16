import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Bell, Eye, EyeOff, Bookmark, BookmarkCheck, Building, TriangleAlert, ChevronRight } from "lucide-react-native";
import { ScreenWrapper } from "../../shared/layout/ScreenWrapper";
import { SectionHeader } from "../../shared/components/SectionHeader";
import { SegmentedControl } from "../../shared/components/SegmentedControl";
import { Card } from "../../shared/components/Card";
import { Badge } from "../../shared/components/Badge";
import { useApp } from "../../context/AppContext";
import { colors, fontSize, spacing, borderRadius } from "../../theme/theme";
import { NotificationItem } from "../../types/domain";

export function RmNotificationsScreen() {
  const { state, setTab, setPage, scopedNotifications, scopedTasks, scopedComplaints, scopedApprovals, toggleNotificationRead, toggleBookmark, openTaskDetail, openComplaintDetail, openBranchDetail, openApprovalDetail, showToast } = useApp();
  const filter = state.tabs.notifications || "all";

  const list = scopedNotifications.filter((item) => {
    if (filter === "all") return true;
    if (filter === "unread") return !item.read;
    if (filter === "bookmarked") return item.bookmarked;
    return item.priority === "Critical";
  });

  const handleNotificationTap = (item: NotificationItem) => {
    if (!item.read) toggleNotificationRead(item.id);

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

    const approvalMatch = item.detail.match(/approval\s*([0-9a-fA-F-]+)/i) || item.detail.match(/expense\s*([0-9a-fA-F-]+)/i) || item.detail.match(/request\s*([0-9a-fA-F-]+)/i);
    if (approvalMatch) {
      const approvalId = approvalMatch[1];
      const approval = scopedApprovals.find((a) => a.id === approvalId);
      if (approval) { openApprovalDetail(approval.id); return; }
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
        title="Notification Center"
        action={
          <SegmentedControl tabs={[{ label: "All", value: "all" }, { label: "Unread", value: "unread" }, { label: "Bookmarked", value: "bookmarked" }, { label: "Critical", value: "critical" }]} activeKey={filter} onChange={(v) => setTab("notifications", v)} />
        }
      />

      <View style={{ gap: spacing.xl, marginTop: spacing.xl }}>
        {list.map((item) => (
          <TouchableOpacity key={item.id} onPress={() => handleNotificationTap(item)} activeOpacity={0.7}>
            <Card variant="glass">
              <View style={{ flexDirection: "row", alignItems: "flex-start", gap: spacing.lg }}>
                <View style={{ width: 40, height: 40, borderRadius: borderRadius.lg, backgroundColor: item.priority === "Critical" ? colors.rose50 : item.priority === "High" ? colors.amber50 : colors.sky50, alignItems: "center", justifyContent: "center" }}>
                  {item.priority === "Critical" ? <TriangleAlert size={18} color={colors.error} strokeWidth={2} /> : item.priority === "High" ? <Bell size={18} color={colors.warning} strokeWidth={2} /> : <Bell size={18} color={colors.info} strokeWidth={2} />}
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, alignItems: "center" }}>
                    <Badge label={item.priority} type={item.priority} />
                    {!item.read && <Badge label="Unread" type="Pending" />}
                    {item.bookmarked && <BookmarkCheck size={14} color={colors.warning} strokeWidth={2} />}
                  </View>
                  <Text style={{ fontSize: fontSize.lg, fontWeight: "400", color: colors.text, marginTop: spacing.md }}>{item.title}</Text>
                  <Text style={{ fontSize: fontSize.sm, color: colors.textSecondary, marginTop: spacing.xs }}>{item.detail}</Text>
                  <Text style={{ fontSize: fontSize.xs, color: colors.textSecondary, marginTop: spacing.lg }}>{item.time}</Text>
                </View>
                <ChevronRight size={16} color={colors.textSecondary} strokeWidth={2} style={{ marginTop: spacing.md }} />
              </View>
              <View style={{ flexDirection: "row", gap: spacing.sm, marginTop: spacing.lg }}>
                <TouchableOpacity onPress={() => toggleNotificationRead(item.id)} style={{ backgroundColor: colors.brand, borderRadius: borderRadius.lg, paddingHorizontal: spacing.xl, paddingVertical: spacing.md, flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
                  {item.read ? <EyeOff size={14} color={colors.white} strokeWidth={2} /> : <Eye size={14} color={colors.white} strokeWidth={2} />}
                  <Text style={{ fontSize: fontSize.sm, fontWeight: "400", color: colors.white }}>{item.read ? "Mark unread" : "Mark read"}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => toggleBookmark(item.id)} style={{ backgroundColor: item.bookmarked ? colors.amber50 : colors.slate100, borderRadius: borderRadius.lg, paddingHorizontal: spacing.xl, paddingVertical: spacing.md, flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
                  {item.bookmarked ? <BookmarkCheck size={14} color={colors.warning} strokeWidth={2} /> : <Bookmark size={14} color={colors.textSecondary} strokeWidth={2} />}
                  <Text style={{ fontSize: fontSize.sm, fontWeight: "400", color: item.bookmarked ? colors.amber700 : colors.textSecondary }}>{item.bookmarked ? "Bookmarked" : "Bookmark"}</Text>
                </TouchableOpacity>
              </View>
            </Card>
          </TouchableOpacity>
        ))}
        {list.length === 0 && (
          <Card variant="glass">
            <View style={{ alignItems: "center", padding: spacing["4xl"] }}>
              <Bell size={32} color={colors.textSecondary} strokeWidth={1.5} />
              <Text style={{ fontSize: fontSize.lg, fontWeight: "400", color: colors.text, marginTop: spacing.lg }}>No notifications</Text>
              <Text style={{ fontSize: fontSize.sm, color: colors.textSecondary, marginTop: spacing.sm }}>No notifications match this filter</Text>
            </View>
          </Card>
        )}
      </View>
    </ScreenWrapper>
  );
}
