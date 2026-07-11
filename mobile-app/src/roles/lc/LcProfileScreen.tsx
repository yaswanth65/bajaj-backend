import React, { useState } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import {
  Mail, Phone, Clock, Smartphone, Award, FileText,
  CalendarDays, ChevronRight, LogOut, CalendarRange,
  CheckSquare, Star, MapPin, ShieldCheck, Activity, User,
} from "lucide-react-native";
import { ScreenWrapper } from "../../shared/layout/ScreenWrapper";
import { StatCard } from "../../shared/components/StatCard";
import { Card } from "../../shared/components/Card";
import { EditProfileModal } from "../../modals/forms/EditProfileModal";
import { useApp } from "../../context/AppContext";
import { colors, fontSize, spacing, borderRadius, fontWeight } from "../../theme/theme";

// ── helpers ──────────────────────────────────────────────────────────────────

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ size: number; color: string; strokeWidth: number }>;
  label: string;
  value?: string | null;
}) {
  if (!value) return null;
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.md,
        paddingVertical: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
      }}
    >
      <View
        style={{
          width: 32,
          height: 32,
          borderRadius: borderRadius.md,
          backgroundColor: colors.brand + "12",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Icon size={14} color={colors.brand} strokeWidth={2} />
      </View>
      <Text style={{ fontSize: fontSize.xs, color: colors.slate400, width: 80 }}>
        {label}
      </Text>
      <Text
        numberOfLines={1}
        style={{
          flex: 1,
          fontSize: fontSize.sm,
          fontWeight: fontWeight.semibold,
          color: colors.slate800,
          textAlign: "right",
        }}
      >
        {value}
      </Text>
    </View>
  );
}

function SectionTitle({ title }: { title: string }) {
  return (
    <Text
      style={{
        fontSize: fontSize.xs,
        fontWeight: fontWeight.extrabold,
        color: colors.slate400,
        textTransform: "uppercase",
        letterSpacing: 1.2,
        marginBottom: spacing.md,
        marginTop: spacing.lg,
      }}
    >
      {title}
    </Text>
  );
}

// ── Screen ────────────────────────────────────────────────────────────────────

export function LcProfileScreen() {
  const { currentUser, getBranch, openAuditTrail, logout } = useApp();
  const [editVisible, setEditVisible] = useState(false);
  if (!currentUser) return null;

  const branch = getBranch(currentUser.branchId);
  const branchName = branch?.name || "—";

  const initials = (currentUser.name || "")
    .split(" ")
    .map((n: string) => n?.[0] || "")
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const skills: string[] = Array.isArray(currentUser.skills) ? currentUser.skills : [];
  const documents: string[] = Array.isArray(currentUser.documents) ? currentUser.documents : [];

  return (
    <ScreenWrapper>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.lg }}>
        <Text style={{ fontSize: fontSize.xl, fontWeight: "800", color: colors.text }}>Profile & credentials</Text>
        <TouchableOpacity 
          onPress={() => setEditVisible(true)}
          style={{ backgroundColor: colors.brand, borderRadius: borderRadius.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm }}
        >
          <Text style={{ fontSize: fontSize.xs, fontWeight: "700", color: colors.white }}>Edit Profile</Text>
        </TouchableOpacity>
      </View>
      {/* ── Avatar Header ── */}
      <LinearGradient
        colors={["#1D4ED8", "#3B82F6", "#60A5FA"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ borderRadius: 20, padding: spacing.xl, marginBottom: spacing.xl }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.lg }}>
          <View
            style={{
              width: 64,
              height: 64,
              borderRadius: 32,
              backgroundColor: "rgba(255,255,255,0.2)",
              borderWidth: 2,
              borderColor: "rgba(255,255,255,0.4)",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={{ fontSize: fontSize["2xl"], fontWeight: "700", color: colors.white }}>
              {initials}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: fontSize.xl, fontWeight: "800", color: colors.white, letterSpacing: -0.3 }}>
              {currentUser.name}
            </Text>
            <Text style={{ fontSize: fontSize.sm, color: "rgba(255,255,255,0.75)", marginTop: 2 }}>
              {currentUser.position || "Location Coordinator"}
            </Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.xs, marginTop: spacing.sm }}>
              <MapPin size={11} color="rgba(255,255,255,0.7)" strokeWidth={2} />
              <Text style={{ fontSize: fontSize.xs, color: "rgba(255,255,255,0.75)" }}>
                {branchName}
              </Text>
              <View
                style={{
                  marginLeft: spacing.sm,
                  backgroundColor: currentUser.status === "Active" ? "#22C55E" : "#F59E0B",
                  borderRadius: 4,
                  paddingHorizontal: 6,
                  paddingVertical: 2,
                }}
              >
                <Text style={{ fontSize: 9, fontWeight: "800", color: colors.white, textTransform: "uppercase", letterSpacing: 0.8 }}>
                  {currentUser.status || "Active"}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </LinearGradient>

      {/* ── KPI Stats ── */}
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.md, marginBottom: spacing.xl }}>
        <View style={{ flex: 1, minWidth: 90 }}>
          <StatCard
            label="Attendance"
            value={`${currentUser.attendancePct ?? 0}%`}
            meta="Monthly"
            accent={colors.brand}
            icon={CalendarRange}
          />
        </View>
        <View style={{ flex: 1, minWidth: 90 }}>
          <StatCard
            label="Closures"
            value={String(currentUser.tasksClosed ?? 0)}
            meta="Tasks done"
            accent={colors.brand}
            icon={CheckSquare}
          />
        </View>
        <View style={{ flex: 1, minWidth: 90 }}>
          <StatCard
            label="Rating"
            value={(currentUser.rating ?? 0).toFixed(1)}
            meta="Supervisor"
            accent={colors.brand}
            icon={Star}
          />
        </View>
        <View style={{ flex: 1, minWidth: 90 }}>
          <StatCard
            label="Proof rate"
            value={`${currentUser.proofRate ?? 0}%`}
            meta="Verification"
            accent={colors.brand}
            icon={ShieldCheck}
          />
        </View>
      </View>

      {/* ── Contact & Identity ── */}
      <Card variant="glass">
        <SectionTitle title="Contact & Identity" />
        <InfoRow icon={Phone} label="Phone" value={currentUser.phone} />
        <InfoRow icon={Mail} label="Email" value={currentUser.email} />
        <InfoRow icon={Clock} label="Shift" value={currentUser.shift} />
        <InfoRow icon={Smartphone} label="Device ID" value={currentUser.deviceId} />
        <InfoRow icon={CalendarDays} label="Joined" value={currentUser.joinDate} />
        <InfoRow icon={Phone} label="Emergency" value={currentUser.emergencyContact} />
      </Card>

      {/* ── Skills ── */}
      {skills.length > 0 && (
        <Card variant="glass" style={{ marginTop: spacing.xl }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md, marginBottom: spacing.md }}>
            <View
              style={{
                width: 32,
                height: 32,
                borderRadius: borderRadius.md,
                backgroundColor: colors.brand + "15",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Award size={15} color={colors.brand} strokeWidth={2} />
            </View>
            <Text style={{ fontSize: fontSize.md, fontWeight: fontWeight.extrabold, color: colors.slate900 }}>
              Skills & Competencies
            </Text>
          </View>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
            {skills.map((skill) => (
              <View
                key={skill}
                style={{
                  backgroundColor: colors.brand + "12",
                  borderRadius: borderRadius.full,
                  paddingHorizontal: spacing.md,
                  paddingVertical: spacing.sm,
                  borderWidth: 1,
                  borderColor: colors.brand + "25",
                }}
              >
                <Text style={{ fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: colors.brand }}>
                  {skill}
                </Text>
              </View>
            ))}
          </View>
        </Card>
      )}

      {/* ── Documents ── */}
      {documents.length > 0 && (
        <Card variant="glass" style={{ marginTop: spacing.xl }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md, marginBottom: spacing.md }}>
            <View
              style={{
                width: 32,
                height: 32,
                borderRadius: borderRadius.md,
                backgroundColor: colors.brand + "15",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <FileText size={15} color={colors.brand} strokeWidth={2} />
            </View>
            <Text style={{ fontSize: fontSize.md, fontWeight: fontWeight.extrabold, color: colors.slate900 }}>
              Uploaded Documents
            </Text>
          </View>
          <View style={{ gap: spacing.sm }}>
            {documents.map((doc) => (
              <View
                key={doc}
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  backgroundColor: colors.slate50,
                  borderRadius: borderRadius.lg,
                  padding: spacing.md,
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm, flex: 1 }}>
                  <FileText size={12} color={colors.slate400} strokeWidth={2} />
                  <Text numberOfLines={1} style={{ fontSize: fontSize.sm, color: colors.slate700, flex: 1 }}>
                    {doc}
                  </Text>
                </View>
                <Text style={{ fontSize: fontSize.xs, fontWeight: "700", color: colors.success }}>
                  Verified
                </Text>
              </View>
            ))}
          </View>
        </Card>
      )}

      {/* ── Actions ── */}
      <View style={{ marginTop: spacing.xl, gap: spacing.md }}>
        <TouchableOpacity
          onPress={openAuditTrail}
          style={{
            backgroundColor: colors.card,
            borderRadius: borderRadius.xl,
            padding: spacing.xl,
            borderWidth: 1,
            borderColor: colors.border,
            flexDirection: "row",
            alignItems: "center",
            gap: spacing.xl,
          }}
        >
          <View
            style={{
              width: 36,
              height: 36,
              borderRadius: borderRadius.md,
              backgroundColor: colors.brand + "15",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Activity size={16} color={colors.brand} strokeWidth={2} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: fontSize.sm, fontWeight: fontWeight.extrabold, color: colors.slate900 }}>
              Open Audit Trail
            </Text>
            <Text style={{ fontSize: fontSize.xs, color: colors.slate400, marginTop: 2 }}>
              Review all actions taken on your account
            </Text>
          </View>
          <ChevronRight size={16} color={colors.slate400} strokeWidth={2} />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={logout}
          style={{
            backgroundColor: colors.card,
            borderRadius: borderRadius.xl,
            padding: spacing.xl,
            borderWidth: 1,
            borderColor: "rgba(239,68,68,0.15)",
            flexDirection: "row",
            alignItems: "center",
            gap: spacing.xl,
          }}
        >
          <View
            style={{
              width: 36,
              height: 36,
              borderRadius: borderRadius.md,
              backgroundColor: "rgba(239,68,68,0.08)",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <LogOut size={16} color={colors.error} strokeWidth={2} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: fontSize.sm, fontWeight: "800", color: colors.error }}>
              Sign Out
            </Text>
            <Text style={{ fontSize: fontSize.xs, color: colors.slate400, marginTop: 2 }}>
              Log out of this corporate device session
            </Text>
          </View>
          <ChevronRight size={16} color={colors.slate400} strokeWidth={2} />
        </TouchableOpacity>
      </View>
      <EditProfileModal visible={editVisible} onClose={() => setEditVisible(false)} />
    </ScreenWrapper>
  );
}
