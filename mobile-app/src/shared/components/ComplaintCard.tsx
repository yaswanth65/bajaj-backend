import React from "react";
import { View, Text, TouchableOpacity, Image } from "react-native";
import { Complaint } from "../../types/domain";
import { useApp } from "../../context/AppContext";
import { colors, fontSize, spacing, borderRadius, shadows } from "../../theme/theme";
import { Badge } from "./Badge";

interface Props {
  item: Complaint;
  showRaiseToVendor?: boolean;
  actions?: { label: string; onPress: () => void; primary?: boolean; danger?: boolean; warning?: boolean }[];
}

const statusColor = (status: string) => {
  switch (status) {
    case "OPEN": return colors.warning;
    case "VENDOR_PENDING": return colors.info;
    case "IN_PROGRESS": return colors.brand;
    case "VENDOR_PENDING": return colors.orange500;
    case "RESOLVED": return colors.success;
    case "RESOLVED": return colors.slate400;
    default: return colors.slate500;
  }
};

const statusLabel = (status: string) => {
  switch (status) {
    case "VENDOR_PENDING": return "Vendor Contacted";
    case "IN_PROGRESS": return "In Progress";
    case "VENDOR_PENDING": return "Waiting for Vendor";
    default: return status;
  }
};

export function ComplaintCard({ item, showRaiseToVendor = false, actions }: Props) {
  const { state, getBranch, openComplaintDetail, raiseToVendor, openModal } = useApp();
  const branch = getBranch(item.branchId);

  const handleRaiseToVendor = async () => {
    await raiseToVendor(item.id);
  };

  const canRaiseToVendor = showRaiseToVendor && item.status === "OPEN" && item.vendorId !== "Not assigned";
  const canAcknowledge = state.role !== "rm" && item.status !== "RESOLVED" && item.status !== "ACKNOWLEDGED";

  return (
    <View style={{ backgroundColor: colors.white, borderRadius: 20, padding: spacing.xl, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.lg, ...shadows.card }}>
      <View style={{ gap: spacing.md }}>
        {/* Header */}
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, alignItems: "center" }}>
          <View style={{ backgroundColor: statusColor(item.status) + "18", paddingHorizontal: spacing.lg, paddingVertical: spacing.xs, borderRadius: borderRadius.full }}>
            <Text style={{ fontSize: fontSize.xs, fontWeight: "700", color: statusColor(item.status), textTransform: "uppercase", letterSpacing: 0.5 }}>{statusLabel(item.status)}</Text>
          </View>
          <Badge label={item.priority} type={item.priority} />
          <Text style={{ fontSize: fontSize.xs, fontWeight: "600", color: colors.slate400, marginLeft: "auto" }}>{item.complaintId}</Text>
        </View>

        {/* Description */}
        <Text style={{ fontSize: fontSize.sm, fontWeight: "400", color: colors.slate700 }} numberOfLines={2}>{item.description}</Text>

        {item.attachmentUrls?.[0] ? (
          <TouchableOpacity
            onPress={() => openComplaintDetail(item.id)}
            activeOpacity={0.8}
            style={{ alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: spacing.sm }}
          >
            <Image source={{ uri: item.attachmentUrls[0] }} style={{ width: 64, height: 48, borderRadius: borderRadius.md, backgroundColor: colors.slate100 }} resizeMode="cover" />
            <Text style={{ fontSize: fontSize.xs, fontWeight: "600", color: colors.brand }}>
              {item.attachmentUrls.length} uploaded photo{item.attachmentUrls.length === 1 ? "" : "s"} · View
            </Text>
          </TouchableOpacity>
        ) : null}

        {/* Info Grid */}
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.lg }}>
          <View style={{ flex: 1, minWidth: 100 }}>
            <Text style={{ fontSize: fontSize.xs, color: colors.slate400, marginBottom: 2 }}>Branch</Text>
            <Text style={{ fontSize: fontSize.sm, fontWeight: "600", color: colors.slate900 }}>{branch?.name || "â€”"}</Text>
          </View>
          <View style={{ flex: 1, minWidth: 100 }}>
            <Text style={{ fontSize: fontSize.xs, color: colors.slate400, marginBottom: 2 }}>Vendor</Text>
            <Text style={{ fontSize: fontSize.sm, fontWeight: "600", color: colors.slate900 }}>{item.vendorId}</Text>
          </View>
          <View style={{ flex: 1, minWidth: 100 }}>
            <Text style={{ fontSize: fontSize.xs, color: colors.slate400, marginBottom: 2 }}>Raised</Text>
            <Text style={{ fontSize: fontSize.sm, fontWeight: "600", color: colors.slate900 }}>{item.createdAt}</Text>
          </View>
        </View>

        {/* Actions */}
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginTop: spacing.sm }}>
          <TouchableOpacity
            onPress={() => openComplaintDetail(item.id)}
            style={{ borderRadius: borderRadius.lg, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, backgroundColor: colors.slate900 }}
          >
            <Text style={{ fontSize: fontSize.sm, fontWeight: "600", color: colors.white }}>View Details</Text>
          </TouchableOpacity>

          {canRaiseToVendor && (
            <TouchableOpacity
              onPress={handleRaiseToVendor}
              style={{ borderRadius: borderRadius.lg, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, backgroundColor: colors.brand }}
            >
              <Text style={{ fontSize: fontSize.sm, fontWeight: "600", color: colors.white }}>Raise to Vendor</Text>
            </TouchableOpacity>
          )}

          {canAcknowledge && (
            <TouchableOpacity
              onPress={() => openModal("acknowledgeComplaint", { id: item.id })}
              style={{ borderRadius: borderRadius.lg, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, backgroundColor: colors.success }}
            >
              <Text style={{ fontSize: fontSize.sm, fontWeight: "600", color: colors.white }}>Acknowledge</Text>
            </TouchableOpacity>
          )}

          {actions?.map((a, i) => (
            <TouchableOpacity
              key={i}
              onPress={a.onPress}
              style={{
                borderRadius: borderRadius.lg, paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
                backgroundColor: a.danger ? colors.error : a.warning ? colors.warning : a.primary ? colors.success : colors.white,
                borderWidth: (a.danger || a.warning || a.primary) ? 0 : 1, borderColor: colors.border,
              }}
            >
              <Text style={{ fontSize: fontSize.sm, fontWeight: "600", color: (a.danger || a.warning || a.primary) ? colors.white : colors.slate700 }}>{a.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );
}
