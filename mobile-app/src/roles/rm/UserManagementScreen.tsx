import React, { useState, useEffect, useMemo, useCallback } from "react";
import { View, Text, TextInput, TouchableOpacity, ScrollView, Modal, Platform, useWindowDimensions, KeyboardAvoidingView } from "react-native";
import { Users, UserPlus, Building, ChevronDown, ChevronRight, Search, X, Check, Shield, Briefcase, UserCog, Save, AlertTriangle, Pencil, Trash2, ArrowRight, ChevronLeft } from "lucide-react-native";
import { ScreenWrapper } from "../../shared/layout/ScreenWrapper";
import { SectionHeader } from "../../shared/components/SectionHeader";
import { Card } from "../../shared/components/Card";
import { Badge } from "../../shared/components/Badge";
import { useApp } from "../../context/AppContext";
import { RoleId } from "../../types/domain";
import { colors, fontSize, spacing, borderRadius, shadows } from "../../theme/theme";

const MOBILE_BREAKPOINT = 768;

type BadgeStyle = { label: string; color: string };

const roleBadge = (role: string): BadgeStyle => {
  const map: Record<string, BadgeStyle> = {
    rm: { label: "RM", color: "#8B5CF6" },
    branchManager: { label: "AM", color: "#12B76A" },
    aa: { label: "AA", color: "#06B6D4" },
    lc: { label: "LC", color: "#005BAC" },
  };
  return map[role] || { label: role, color: "#94A3B8" };
};

const ROLE_OPTIONS = [
  { label: "RM", value: "rm" as RoleId },
  { label: "AM (BAM)", value: "branchManager" as RoleId },
  { label: "AA", value: "aa" as RoleId },
  { label: "LC", value: "lc" as RoleId },
];

const FILTER_OPTIONS = [
  { label: "All", value: "all" },
  { label: "RM", value: "rm" },
  { label: "AM", value: "branchManager" },
  { label: "AA", value: "aa" },
  { label: "LC", value: "lc" },
];

interface BranchNode {
  id: string; name: string; city: string;
  lc: { id: string; name: string; email: string; phone: string; status: string } | null;
}

interface TreeNode {
  id: string; name: string; role: string; position: string;
  email: string; phone: string; status: string;
  branchCount?: number; branchScope?: string[];
  children?: TreeNode[]; branches?: BranchNode[];
}

interface AvailableBranch {
  id: string; name: string; city: string;
  assigned: boolean;
  assignedTo: { id: string; name: string } | null;
}

interface UnassignedBranch {
  id: string; name: string; city?: string;
}

export function UserManagementScreen() {
  const ctx = useApp();
  const { getHierarchy, createUserIdentity, assignManager, assignBranches, assignBranch, getAvailableBranches, getUnassignedBranches, editUser, showToast, refreshData, state } = ctx;

  const [hierarchy, setHierarchy] = useState<TreeNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [expandedAmIds, setExpandedAmIds] = useState<Set<string>>(new Set());
  const [expandedAaIds, setExpandedAaIds] = useState<Set<string>>(new Set());
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [selectedEntityType, setSelectedEntityType] = useState<string | null>(null);

  // Add User modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [addStep, setAddStep] = useState(1);
  const [addName, setAddName] = useState("");
  const [addEmail, setAddEmail] = useState("");
  const [addPhone, setAddPhone] = useState("");
  const [addRole, setAddRole] = useState<RoleId | "">("");
  const [addManagerId, setAddManagerId] = useState("");
  const [addBranchIds, setAddBranchIds] = useState<string[]>([]);
  const [addBranchId, setAddBranchId] = useState("");
  const [availableBranches, setAvailableBranches] = useState<AvailableBranch[]>([]);
  const [unassignedBranches, setUnassignedBranches] = useState<UnassignedBranch[]>([]);
  const [creating, setCreating] = useState(false);

  // Edit Branch Assignment modal
  const [showEditBranchModal, setShowEditBranchModal] = useState(false);
  const [editAaId, setEditAaId] = useState("");
  const [editAaName, setEditAaName] = useState("");
  const [editBranches, setEditBranches] = useState<AvailableBranch[]>([]);
  const [editSelectedBranches, setEditSelectedBranches] = useState<string[]>([]);
  const [savingBranches, setSavingBranches] = useState(false);

  // Transfer LC modal
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferLcId, setTransferLcId] = useState("");
  const [transferLcName, setTransferLcName] = useState("");
  const [transferBranchId, setTransferBranchId] = useState("");
  const [transferBranches, setTransferBranches] = useState<UnassignedBranch[]>([]);
  const [transferring, setTransferring] = useState(false);

  // Edit User modal
  const [showEditUserModal, setShowEditUserModal] = useState(false);
  const [editUserId, setEditUserId] = useState("");
  const [editUserName, setEditUserName] = useState("");
  const [editUserPhone, setEditUserPhone] = useState("");
  const [savingUser, setSavingUser] = useState(false);

  const { width: screenWidth } = useWindowDimensions();
  const isWide = screenWidth >= MOBILE_BREAKPOINT;
  const [viewMode, setViewMode] = useState<"list" | "detail">("list");

  const loadHierarchy = useCallback(async () => {
    setLoading(true);
    const data = await getHierarchy();
    setHierarchy(data);
    setLoading(false);
  }, [getHierarchy]);

  useEffect(() => { loadHierarchy(); }, [loadHierarchy]);

  const allAms = useMemo(() => {
    const result: { id: string; name: string }[] = [];
    hierarchy.forEach((rm) => { (rm.children || []).forEach((am) => result.push({ id: am.id, name: am.name })); });
    return result;
  }, [hierarchy]);

  const toggleAm = (id: string) => {
    setExpandedAmIds((prev) => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  };
  const toggleAa = (id: string) => {
    setExpandedAaIds((prev) => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  };

  // ── Add User ──
  const openAddModal = () => {
    setAddStep(1); setAddName(""); setAddEmail(""); setAddPhone(""); setAddRole(""); setAddManagerId(""); setAddBranchIds([]); setAddBranchId("");
    setShowAddModal(true);
  };

  const handleNextStep = async () => {
    if (!addRole) return;
    if (addRole === "rm") { await handleCreateUser(); return; }
    if (addRole === "branchManager") { setAddStep(2); return; }
    if (addRole === "aa") { setAddStep(2); setAddManagerId(""); setAddBranchIds([]); setAvailableBranches([]); return; }
    if (addRole === "lc") {
      setAddStep(2); setAddBranchId("");
      const b = await getUnassignedBranches();
      setUnassignedBranches(b || []);
      return;
    }
  };

  const handleAmSelected = async (amId: string) => {
    setAddManagerId(amId);
    if (addRole === "aa") {
      const b = await getAvailableBranches(amId);
      setAvailableBranches(b || []);
      setAddBranchIds([]);
    }
  };

  const handleCreateUser = async () => {
    if (!addName.trim() || !addRole) { showToast("Name and role are required"); return; }
    setCreating(true);
    try {
      const email = addEmail || addName.toLowerCase().replace(/\s+/g, "") + "@gmail.com";
      const newUser = await createUserIdentity(addName.trim(), email, addPhone || "Pending", addRole as RoleId);
      if (!newUser) { setCreating(false); return; }
      if (addRole === "branchManager" && addManagerId) await assignManager(newUser.id, addManagerId);
      if (addRole === "aa") {
        if (addManagerId) await assignManager(newUser.id, addManagerId);
        if (addBranchIds.length > 0) await assignBranches(newUser.id, addBranchIds);
      }
      if (addRole === "lc") {
        if (addBranchId) await assignBranch(newUser.id, addBranchId);
      }
      showToast(addRole.toUpperCase() + " user created");
      setShowAddModal(false);
      await loadHierarchy();
      await refreshData();
    } catch (e) { console.error(e); }
    finally { setCreating(false); }
  };

  const toggleBranchSelection = (bid: string) => {
    setAddBranchIds((prev) => prev.includes(bid) ? prev.filter((id) => id !== bid) : [...prev, bid]);
  };

  // ── Edit Branch Assignment ──
  const openEditBranchModal = async (aa: TreeNode) => {
    setEditAaId(aa.id);
    setEditAaName(aa.name);
    const currentIds = (aa.branches || []).map((b) => b.id);
    setEditSelectedBranches([...currentIds]);
    const parentAmId = allAms.find((am) =>
      hierarchy.some((rm) =>
        (rm.children || []).some((a) => a.id === am.id && (a.children || []).some((c) => c.id === aa.id))
      )
    )?.id;
    if (parentAmId) {
      const b = await getAvailableBranches(parentAmId);
      setEditBranches(b || []);
    } else {
      setEditBranches([]);
    }
    setShowEditBranchModal(true);
  };

  const toggleEditBranch = (bid: string) => {
    setEditSelectedBranches((prev) => prev.includes(bid) ? prev.filter((id) => id !== bid) : [...prev, bid]);
  };

  const handleSaveBranchAssignment = async () => {
    if (!editAaId) return;
    setSavingBranches(true);
    try {
      await assignBranches(editAaId, editSelectedBranches);
      showToast("Branch assignment updated");
      setShowEditBranchModal(false);
      await loadHierarchy();
      await refreshData();
    } catch (e: any) { console.error(e); showToast(e?.response?.data?.message || "Failed to update"); }
    finally { setSavingBranches(false); }
  };

  // ── Transfer LC ──
  const openTransferModal = async (lc: any) => {
    setTransferLcId(lc.id);
    setTransferLcName(lc.name);
    setTransferBranchId("");
    const b = await getUnassignedBranches();
    setTransferBranches(b || []);
    setShowTransferModal(true);
  };

  const handleTransferLc = async () => {
    if (!transferLcId || !transferBranchId) return;
    setTransferring(true);
    try {
      await assignBranch(transferLcId, transferBranchId);
      showToast("LC transferred");
      setShowTransferModal(false);
      await loadHierarchy();
      await refreshData();
    } catch (e: any) { console.error(e); showToast(e?.response?.data?.message || "Transfer failed"); }
    finally { setTransferring(false); }
  };

  // ── Disable User ──
  const handleDisableUser = async (user: any) => {
    try {
      await editUser(user.id, { status: "Inactive" });
      showToast("User disabled");
      await loadHierarchy();
      await refreshData();
    } catch (e: any) { console.error(e); showToast("Failed to disable user"); }
  };

  // ── Edit User ──
  const openEditUserModal = (user: any) => {
    setEditUserId(user.id);
    setEditUserName(user.name || "");
    setEditUserPhone(user.phone || "");
    setShowEditUserModal(true);
  };

  const handleEditUser = async () => {
    if (!editUserId || !editUserName.trim()) return;
    setSavingUser(true);
    try {
      await editUser(editUserId, { name: editUserName.trim(), phone: editUserPhone });
      showToast("User updated");
      setShowEditUserModal(false);
      await loadHierarchy();
      await refreshData();
    } catch (e: any) { console.error(e); showToast("Failed to update user"); }
    finally { setSavingUser(false); }
  };

  // ── Select Entity ──
  const handleSelectEntity = (type: string, data: any) => {
    setSelectedEntityType(type);
    setSelectedUser(data);
    if (!isWide) setViewMode("detail");
  };

  const handleGoBack = () => {
    setSelectedUser(null);
    setSelectedEntityType(null);
    setViewMode("list");
  };

  // ── Detail Panel Renderers ──
  const renderAmDetail = (am: TreeNode) => {
    const total = am.branchCount || 0;
    const aaKids = am.children || [];
    const assigned = aaKids.reduce((s, aa) => s + (aa.branchCount || 0), 0);
    const remaining = total - assigned;
    return (
      <View style={{ gap: spacing.xl }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.lg }}>
          <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: "#12B76A", alignItems: "center", justifyContent: "center" }}>
            <Text style={{ fontSize: fontSize["2xl"], fontWeight: "700", color: colors.white }}>{am.name.charAt(0)}</Text>
          </View>
          <View style={{ flex: 1 }}><Text style={{ fontSize: fontSize.xl, fontWeight: "700", color: colors.text }}>{am.name}</Text><Badge label="AM" type="High" /></View>
        </View>

        <View style={{ flexDirection: "row", gap: isWide ? spacing.xl : spacing.md, flexWrap: "wrap" }}>
          <Card style={{ flex: 1, minWidth: 80, padding: isWide ? spacing.lg : spacing.md, alignItems: "center" }}>
            <Text style={{ fontSize: fontSize["3xl"], fontWeight: "700", color: colors.brand }}>{total}</Text>
            <Text style={{ fontSize: fontSize.sm, color: colors.textSecondary }}>Total</Text>
          </Card>
          <Card style={{ flex: 1, minWidth: 80, padding: isWide ? spacing.lg : spacing.md, alignItems: "center" }}>
            <Text style={{ fontSize: fontSize["3xl"], fontWeight: "700", color: colors.success }}>{assigned}</Text>
            <Text style={{ fontSize: fontSize.sm, color: colors.textSecondary }}>Assigned</Text>
          </Card>
          <Card style={{ flex: 1, minWidth: 80, padding: isWide ? spacing.lg : spacing.md, alignItems: "center" }}>
            <Text style={{ fontSize: fontSize["3xl"], fontWeight: "700", color: remaining > 0 ? colors.warning : colors.textSecondary }}>{remaining}</Text>
            <Text style={{ fontSize: fontSize.sm, color: colors.textSecondary }}>Remaining</Text>
          </Card>
        </View>

        {remaining > 0 && (
          <View style={{ backgroundColor: colors.amber50, borderRadius: borderRadius.lg, padding: spacing.lg, flexDirection: "row", alignItems: "center", gap: spacing.md, borderWidth: 1, borderColor: colors.amber200 }}>
            <AlertTriangle size={16} color={colors.warning} />
            <Text style={{ fontSize: fontSize.sm, color: colors.amber700, flex: 1 }}>{remaining} branch{remaining > 1 ? "es" : ""} unassigned — assign via Add AA</Text>
          </View>
        )}

        {/* Action buttons */}
        <View style={{ flexDirection: "row", gap: spacing.md, flexWrap: "wrap" }}>
          <TouchableOpacity onPress={() => openEditUserModal(am)}
            style={{ flex: 1, minWidth: 100, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm, paddingVertical: spacing.md, borderRadius: borderRadius.xl, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white }}>
            <Pencil size={14} color={colors.textSecondary} /><Text style={{ fontSize: fontSize.sm, fontWeight: "600", color: colors.textSecondary }}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => { openAddModal(); setAddRole("aa"); }}
            style={{ flex: 1, minWidth: 100, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm, paddingVertical: spacing.md, borderRadius: borderRadius.xl, backgroundColor: colors.brand }}>
            <UserPlus size={14} color={colors.white} /><Text style={{ fontSize: fontSize.sm, fontWeight: "600", color: colors.white }}>Add AA</Text>
          </TouchableOpacity>
        </View>

        <Text style={{ fontSize: fontSize.md, fontWeight: "600", color: colors.textSecondary }}>AAs ({aaKids.length})</Text>
        {aaKids.map((aa) => (
          <TouchableOpacity key={aa.id} onPress={() => handleSelectEntity("aa", aa)} style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md }}>
              <UserCog size={16} color="#06B6D4" /><Text style={{ fontSize: fontSize.md, color: colors.text }}>{aa.name}</Text>
            </View>
            <Text style={{ fontSize: fontSize.sm, color: colors.textSecondary }}>{aa.branchCount || 0} branches</Text>
          </TouchableOpacity>
        ))}
        {aaKids.length === 0 && <Text style={{ fontSize: fontSize.sm, color: colors.slate400, fontStyle: "italic" }}>No AAs assigned</Text>}
      </View>
    );
  };

  const renderAaDetail = (aa: TreeNode) => {
    const branches = aa.branches || [];
    return (
      <View style={{ gap: spacing.xl }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.lg }}>
          <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: "#06B6D4", alignItems: "center", justifyContent: "center" }}>
            <Text style={{ fontSize: fontSize["2xl"], fontWeight: "700", color: colors.white }}>{aa.name.charAt(0)}</Text>
          </View>
          <View style={{ flex: 1 }}><Text style={{ fontSize: fontSize.xl, fontWeight: "700", color: colors.text }}>{aa.name}</Text><Badge label="AA" type="Medium" /></View>
        </View>

        <TouchableOpacity onPress={() => openEditBranchModal(aa)}
          style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm, paddingVertical: spacing.md, borderRadius: borderRadius.xl, borderWidth: 1, borderColor: colors.brand, backgroundColor: colors.brandLight }}>
          <Pencil size={14} color={colors.brand} /><Text style={{ fontSize: fontSize.sm, fontWeight: "600", color: colors.brand }}>Edit Branch Assignment</Text>
        </TouchableOpacity>

        <Card style={{ padding: spacing.lg }}>
          <Text style={{ fontSize: fontSize.md, fontWeight: "600", color: colors.textSecondary, marginBottom: spacing.md }}>Branches ({branches.length})</Text>
          {branches.map((b) => (
            <TouchableOpacity key={b.id} onPress={() => handleSelectEntity("branch", { ...b, aaName: aa.name })} style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border }}>
              <View style={{ flex: 1 }}><Text style={{ fontSize: fontSize.md, color: colors.text }}>{b.name}</Text><Text style={{ fontSize: fontSize.xs, color: colors.textSecondary }}>{b.city}</Text></View>
              <Badge label={b.lc ? b.lc.name : "No LC"} type={b.lc ? "Success" : "Warning"} />
            </TouchableOpacity>
          ))}
        </Card>
      </View>
    );
  };

  const renderBranchDetail = (branch: any) => (
    <View style={{ gap: spacing.xl }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.lg }}>
        <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: colors.brand, alignItems: "center", justifyContent: "center" }}>
          <Building size={24} color={colors.white} />
        </View>
        <View><Text style={{ fontSize: fontSize.xl, fontWeight: "700", color: colors.text }}>{branch.name}</Text><Text style={{ fontSize: fontSize.sm, color: colors.textSecondary }}>{branch.city}</Text></View>
      </View>
      <Card style={{ padding: spacing.lg, gap: spacing.md }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <Text style={{ fontSize: fontSize.md, color: colors.textSecondary }}>AA</Text>
          <Text style={{ fontSize: fontSize.md, color: colors.text, fontWeight: "600" }}>{branch.aaName || "\u2014"}</Text>
        </View>
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <Text style={{ fontSize: fontSize.md, color: colors.textSecondary }}>LC</Text>
          <Text style={{ fontSize: fontSize.md, color: colors.text, fontWeight: "600" }}>{branch.lc ? branch.lc.name : "None"}</Text>
        </View>
      </Card>
      {branch.lc && (
        <TouchableOpacity onPress={() => handleSelectEntity("lc", branch.lc)} style={{ backgroundColor: colors.card, borderRadius: borderRadius.xl, padding: spacing.xl, borderWidth: 1, borderColor: colors.border, flexDirection: "row", alignItems: "center", gap: spacing.lg }}>
          <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: "#005BAC", alignItems: "center", justifyContent: "center" }}>
            <Text style={{ fontSize: fontSize.lg, fontWeight: "700", color: colors.white }}>{branch.lc.name.charAt(0)}</Text>
          </View>
          <View><Text style={{ fontSize: fontSize.md, fontWeight: "600", color: colors.text }}>{branch.lc.name}</Text><Badge label="LC" type="Low" /></View>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderLcDetail = (lc: any) => (
    <View style={{ gap: spacing.xl }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.lg }}>
        <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: "#005BAC", alignItems: "center", justifyContent: "center" }}>
          <Text style={{ fontSize: fontSize["2xl"], fontWeight: "700", color: colors.white }}>{lc.name.charAt(0)}</Text>
        </View>
        <View style={{ flex: 1 }}><Text style={{ fontSize: fontSize.xl, fontWeight: "700", color: colors.text }}>{lc.name}</Text><Badge label="LC" type="Low" /></View>
      </View>
      <Card style={{ padding: spacing.lg, gap: spacing.md }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <Text style={{ fontSize: fontSize.md, color: colors.textSecondary }}>Branch</Text>
          <Text style={{ fontSize: fontSize.md, color: colors.text, fontWeight: "600" }}>{lc.branchName || "\u2014"}</Text>
        </View>
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <Text style={{ fontSize: fontSize.md, color: colors.textSecondary }}>Status</Text>
          <Badge label={lc.status || "Active"} type={lc.status === "Inactive" ? "Warning" : "Success"} />
        </View>
      </Card>
      {/* Action buttons */}
      <View style={{ flexDirection: "row", gap: spacing.md, flexWrap: "wrap" }}>
        <TouchableOpacity onPress={() => openEditUserModal(lc)}
          style={{ flex: 1, minWidth: 90, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm, paddingVertical: spacing.md, borderRadius: borderRadius.xl, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white }}>
          <Pencil size={14} color={colors.textSecondary} /><Text style={{ fontSize: fontSize.sm, fontWeight: "600", color: colors.textSecondary }}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => handleDisableUser(lc)}
          style={{ flex: 1, minWidth: 90, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm, paddingVertical: spacing.md, borderRadius: borderRadius.xl, borderWidth: 1, borderColor: colors.error, backgroundColor: colors.white }}>
          <Trash2 size={14} color={colors.error} /><Text style={{ fontSize: fontSize.sm, fontWeight: "600", color: colors.error }}>Disable</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => openTransferModal(lc)}
          style={{ flex: 1, minWidth: 90, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm, paddingVertical: spacing.md, borderRadius: borderRadius.xl, backgroundColor: colors.brand }}>
          <ArrowRight size={14} color={colors.white} /><Text style={{ fontSize: fontSize.sm, fontWeight: "600", color: colors.white }}>Transfer</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderDetailPanel = () => {
    if (!selectedUser) {
      return (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: spacing["4xl"] }}>
          <Users size={48} color={colors.slate300} />
          <Text style={{ fontSize: fontSize.md, color: colors.slate400, marginTop: spacing.lg }}>Select a user or branch</Text>
        </View>
      );
    }
    return (
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ gap: spacing.xl }}>
        {/* Back button for mobile */}
        {!isWide && (
          <TouchableOpacity onPress={handleGoBack}
            style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingVertical: spacing.sm }}>
            <ChevronLeft size={18} color={colors.brand} />
            <Text style={{ fontSize: fontSize.md, fontWeight: "600", color: colors.brand }}>Back to list</Text>
          </TouchableOpacity>
        )}
        {selectedEntityType === "am" && renderAmDetail(selectedUser)}
        {selectedEntityType === "aa" && renderAaDetail(selectedUser)}
        {selectedEntityType === "branch" && renderBranchDetail(selectedUser)}
        {selectedEntityType === "lc" && renderLcDetail(selectedUser)}
      </ScrollView>
    );
  };

  // ── Add User Modal ──
  const renderAddModal = () => (
    <Modal visible={showAddModal} transparent animationType="fade" onRequestClose={() => setShowAddModal(false)}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "center", alignItems: "center", padding: isWide ? spacing.xl : spacing.md }}>
        <View style={{ backgroundColor: colors.white, borderRadius: borderRadius["2xl"], width: "100%", maxWidth: 480, maxHeight: "90%", overflow: "hidden", ...shadows.modal }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: isWide ? spacing["3xl"] : spacing.xl, paddingTop: isWide ? spacing["3xl"] : spacing.xl, marginBottom: spacing.lg }}>
            <Text style={{ fontSize: fontSize.xl, fontWeight: "700", color: colors.text }}>
              {addStep === 1 ? "Add User" : addRole === "branchManager" ? "Select RM" : addRole === "aa" ? "Assign AM + Branches" : "Assign Branch"}
            </Text>
            <TouchableOpacity onPress={() => setShowAddModal(false)}><X size={20} color={colors.textSecondary} /></TouchableOpacity>
          </View>

          <ScrollView style={{ flexGrow: 0 }} contentContainerStyle={{ paddingHorizontal: isWide ? spacing["3xl"] : spacing.xl, paddingBottom: isWide ? spacing["3xl"] : spacing.xl }} keyboardShouldPersistTaps="handled">
          {/* Step 1: Basic info */}
          {addStep === 1 && (
            <View style={{ gap: spacing.xl }}>
              <View><Text style={{ fontSize: fontSize.sm, fontWeight: "600", color: colors.textSecondary, marginBottom: spacing.sm }}>Name *</Text>
                <TextInput value={addName} onChangeText={setAddName} placeholder="Full name" placeholderTextColor={colors.slate400}
                  style={{ borderRadius: borderRadius.lg, borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.xl, paddingVertical: spacing.md, fontSize: fontSize.md, color: colors.text }} /></View>
              <View><Text style={{ fontSize: fontSize.sm, fontWeight: "600", color: colors.textSecondary, marginBottom: spacing.sm }}>Email</Text>
                <TextInput value={addEmail} onChangeText={setAddEmail} placeholder="email@example.com" placeholderTextColor={colors.slate400}
                  style={{ borderRadius: borderRadius.lg, borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.xl, paddingVertical: spacing.md, fontSize: fontSize.md, color: colors.text }} /></View>
              <View><Text style={{ fontSize: fontSize.sm, fontWeight: "600", color: colors.textSecondary, marginBottom: spacing.sm }}>Phone</Text>
                <TextInput value={addPhone} onChangeText={setAddPhone} placeholder="Phone" placeholderTextColor={colors.slate400}
                  style={{ borderRadius: borderRadius.lg, borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.xl, paddingVertical: spacing.md, fontSize: fontSize.md, color: colors.text }} /></View>
              <View><Text style={{ fontSize: fontSize.sm, fontWeight: "600", color: colors.textSecondary, marginBottom: spacing.sm }}>Role *</Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
                  {(state.role === "branchManager" ? ROLE_OPTIONS.filter(r => r.value === "aa" || r.value === "lc") : ROLE_OPTIONS).map((opt) => (
                    <TouchableOpacity key={opt.value} onPress={() => setAddRole(opt.value)}
                      style={{ paddingHorizontal: spacing.xl, paddingVertical: spacing.sm, borderRadius: borderRadius.full, backgroundColor: addRole === opt.value ? colors.brand : colors.slate100 }}>
                      <Text style={{ fontSize: fontSize.sm, fontWeight: "500", color: addRole === opt.value ? colors.white : colors.textSecondary }}>{opt.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              <TouchableOpacity onPress={handleNextStep} disabled={!addRole}
                style={{ backgroundColor: addRole ? colors.brand : colors.slate300, borderRadius: borderRadius.xl, paddingVertical: spacing.md, alignItems: "center" }}>
                <Text style={{ fontSize: fontSize.md, fontWeight: "600", color: colors.white }}>{addRole === "rm" ? "Create" : "Next"}</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Step 2: AM - select RM parent */}
          {addStep === 2 && addRole === "branchManager" && (
            <View style={{ gap: spacing.xl }}>
              <Text style={{ fontSize: fontSize.md, color: colors.textSecondary }}>Select parent RM:</Text>
              {hierarchy.map((rm) => (
                <TouchableOpacity key={rm.id} onPress={() => { setAddManagerId(rm.id); handleCreateUser(); }}
                  style={{ flexDirection: "row", alignItems: "center", gap: spacing.lg, padding: spacing.lg, borderRadius: borderRadius.lg, borderWidth: 1, borderColor: addManagerId === rm.id ? colors.brand : colors.border, backgroundColor: addManagerId === rm.id ? colors.brandLight : colors.white }}>
                  <Shield size={20} color={addManagerId === rm.id ? colors.brand : colors.textSecondary} />
                  <Text style={{ fontSize: fontSize.md, fontWeight: "600", color: colors.text }}>{rm.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Step 2: AA - select AM + branches */}
          {addStep === 2 && addRole === "aa" && (
            <View style={{ gap: spacing.xl }}>
              <Text style={{ fontSize: fontSize.md, color: colors.textSecondary }}>Select parent AM:</Text>
              <View style={{ maxHeight: 140, borderWidth: 1, borderColor: colors.border, borderRadius: borderRadius.lg, padding: spacing.sm }}>
                <ScrollView nestedScrollEnabled style={{ flex: 1 }}>
                  {allAms.map((am) => (
                    <TouchableOpacity key={am.id} onPress={() => handleAmSelected(am.id)}
                      style={{ flexDirection: "row", alignItems: "center", gap: spacing.lg, padding: spacing.md, borderRadius: borderRadius.lg, borderWidth: 1, borderColor: addManagerId === am.id ? colors.brand : colors.border, backgroundColor: addManagerId === am.id ? colors.brandLight : colors.white, marginBottom: spacing.sm }}>
                      <Briefcase size={18} color={addManagerId === am.id ? colors.brand : colors.textSecondary} />
                      <Text style={{ fontSize: fontSize.md, fontWeight: "600", color: colors.text }}>{am.name}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
              {addManagerId && (
                <>
                  <Text style={{ fontSize: fontSize.sm, fontWeight: "600", color: colors.textSecondary, marginTop: spacing.sm }}>
                    Select branches ({addBranchIds.length} selected):
                  </Text>
                  <View style={{ maxHeight: 200, borderWidth: 1, borderColor: colors.border, borderRadius: borderRadius.lg, padding: spacing.sm }}>
                    <ScrollView nestedScrollEnabled style={{ flex: 1 }}>
                      {availableBranches.map((b) => {
                        const isAlreadyAssigned = b.assigned && !addBranchIds.includes(b.id);
                        return (
                          <TouchableOpacity key={b.id} onPress={() => !isAlreadyAssigned && toggleBranchSelection(b.id)}
                            style={{ flexDirection: "row", alignItems: "center", gap: spacing.lg, paddingVertical: spacing.sm, opacity: isAlreadyAssigned ? 0.45 : 1 }}>
                            <View style={{ width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: addBranchIds.includes(b.id) ? colors.brand : isAlreadyAssigned ? colors.slate300 : colors.border, backgroundColor: addBranchIds.includes(b.id) ? colors.brand : "transparent", alignItems: "center", justifyContent: "center" }}>
                              {addBranchIds.includes(b.id) && <Check size={14} color={colors.white} />}
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text style={{ fontSize: fontSize.md, color: colors.text }}>{b.name}</Text>
                              {isAlreadyAssigned && b.assignedTo && (
                                <Text style={{ fontSize: fontSize.xs, color: colors.warning }}>Assigned to {b.assignedTo.name}</Text>
                              )}
                            </View>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  </View>
                  <TouchableOpacity onPress={handleCreateUser} disabled={creating}
                    style={{ backgroundColor: creating ? colors.slate300 : colors.brand, borderRadius: borderRadius.xl, paddingVertical: spacing.md, alignItems: "center", marginTop: spacing.md }}>
                    <Text style={{ fontSize: fontSize.md, fontWeight: "600", color: colors.white }}>{creating ? "Creating..." : "Save"}</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          )}

          {/* Step 2: LC - just assign branch (no parent manager) */}
          {addStep === 2 && addRole === "lc" && (
            <View style={{ gap: spacing.xl }}>
              <Text style={{ fontSize: fontSize.md, fontWeight: "600", color: colors.textSecondary }}>Assign branch:</Text>
              {unassignedBranches.length === 0 && (
                <Text style={{ fontSize: fontSize.sm, color: colors.slate400, fontStyle: "italic" }}>No unassigned branches available</Text>
              )}
              <View style={{ maxHeight: 260, borderWidth: 1, borderColor: colors.border, borderRadius: borderRadius.lg, padding: spacing.sm }}>
                <ScrollView nestedScrollEnabled style={{ flex: 1 }}>
                  {unassignedBranches.map((b) => (
                    <TouchableOpacity key={b.id} onPress={() => setAddBranchId(b.id)}
                      style={{ flexDirection: "row", alignItems: "center", gap: spacing.lg, padding: spacing.md, borderRadius: borderRadius.lg, borderWidth: 1, borderColor: addBranchId === b.id ? colors.brand : colors.border, backgroundColor: addBranchId === b.id ? colors.brandLight : colors.white, marginBottom: spacing.sm }}>
                      <Building size={16} color={addBranchId === b.id ? colors.brand : colors.textSecondary} />
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: fontSize.md, color: colors.text }}>{b.name}</Text>
                        {b.city ? <Text style={{ fontSize: fontSize.xs, color: colors.textSecondary }}>{b.city}</Text> : null}
                      </View>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
              <TouchableOpacity onPress={handleCreateUser} disabled={creating || !addBranchId}
                style={{ backgroundColor: addBranchId && !creating ? colors.brand : colors.slate300, borderRadius: borderRadius.xl, paddingVertical: spacing.md, alignItems: "center", marginTop: spacing.md }}>
                <Text style={{ fontSize: fontSize.md, fontWeight: "600", color: colors.white }}>{creating ? "Creating..." : "Save"}</Text>
              </TouchableOpacity>
            </View>
          )}
          </ScrollView>
        </View>
      </View>
    </KeyboardAvoidingView>
    </Modal>
  );

  // ── Edit Branch Assignment Modal ──
  const renderEditBranchModal = () => (
    <Modal visible={showEditBranchModal} transparent animationType="fade" onRequestClose={() => setShowEditBranchModal(false)}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "center", alignItems: "center", padding: isWide ? spacing.xl : spacing.md }}>
        <View style={{ backgroundColor: colors.white, borderRadius: borderRadius["2xl"], width: "100%", maxWidth: 480, maxHeight: "90%", overflow: "hidden", ...shadows.modal }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: isWide ? spacing["3xl"] : spacing.xl, paddingTop: isWide ? spacing["3xl"] : spacing.xl, marginBottom: spacing.lg }}>
            <Text style={{ fontSize: fontSize.xl, fontWeight: "700", color: colors.text }}>{editAaName} — Branches</Text>
            <TouchableOpacity onPress={() => setShowEditBranchModal(false)}><X size={20} color={colors.textSecondary} /></TouchableOpacity>
          </View>
          <ScrollView style={{ flexGrow: 0 }} contentContainerStyle={{ paddingHorizontal: isWide ? spacing["3xl"] : spacing.xl, paddingBottom: isWide ? spacing["3xl"] : spacing.xl }} keyboardShouldPersistTaps="handled">
            <View style={{ maxHeight: 260, borderWidth: 1, borderColor: colors.border, borderRadius: borderRadius.lg, padding: spacing.sm }}>
              <ScrollView nestedScrollEnabled style={{ flex: 1 }}>
                {editBranches.map((b) => {
                  const isAssignedToOther = b.assigned && !editSelectedBranches.includes(b.id);
                  return (
                    <TouchableOpacity key={b.id} onPress={() => !isAssignedToOther && toggleEditBranch(b.id)}
                      style={{ flexDirection: "row", alignItems: "center", gap: spacing.lg, paddingVertical: spacing.md, opacity: isAssignedToOther ? 0.45 : 1 }}>
                      <View style={{ width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: editSelectedBranches.includes(b.id) ? colors.brand : isAssignedToOther ? colors.slate300 : colors.border, backgroundColor: editSelectedBranches.includes(b.id) ? colors.brand : "transparent", alignItems: "center", justifyContent: "center" }}>
                        {editSelectedBranches.includes(b.id) && <Check size={15} color={colors.white} />}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: fontSize.md, color: colors.text }}>{b.name}</Text>
                        {isAssignedToOther && b.assignedTo && (
                          <Text style={{ fontSize: fontSize.xs, color: colors.error }}>Assigned to {b.assignedTo.name}</Text>
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
            <TouchableOpacity onPress={handleSaveBranchAssignment} disabled={savingBranches}
              style={{ backgroundColor: savingBranches ? colors.slate300 : colors.brand, borderRadius: borderRadius.xl, paddingVertical: spacing.md, alignItems: "center", marginTop: spacing.xl }}>
              <Text style={{ fontSize: fontSize.md, fontWeight: "600", color: colors.white }}>{savingBranches ? "Saving..." : "Save"}</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </KeyboardAvoidingView>
    </Modal>
  );

  // ── Transfer LC Modal ──
  const renderTransferModal = () => (
    <Modal visible={showTransferModal} transparent animationType="fade" onRequestClose={() => setShowTransferModal(false)}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "center", alignItems: "center", padding: isWide ? spacing.xl : spacing.md }}>
        <View style={{ backgroundColor: colors.white, borderRadius: borderRadius["2xl"], width: "100%", maxWidth: 480, maxHeight: "90%", overflow: "hidden", ...shadows.modal }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: isWide ? spacing["3xl"] : spacing.xl, paddingTop: isWide ? spacing["3xl"] : spacing.xl, marginBottom: spacing.lg }}>
            <Text style={{ fontSize: fontSize.xl, fontWeight: "700", color: colors.text }}>Transfer {transferLcName}</Text>
            <TouchableOpacity onPress={() => setShowTransferModal(false)}><X size={20} color={colors.textSecondary} /></TouchableOpacity>
          </View>
          <ScrollView style={{ flexGrow: 0 }} contentContainerStyle={{ paddingHorizontal: isWide ? spacing["3xl"] : spacing.xl, paddingBottom: isWide ? spacing["3xl"] : spacing.xl }} keyboardShouldPersistTaps="handled">
            <Text style={{ fontSize: fontSize.md, color: colors.textSecondary, marginBottom: spacing.md }}>Select new branch:</Text>
            {transferBranches.length === 0 && (
              <Text style={{ fontSize: fontSize.sm, color: colors.slate400, fontStyle: "italic", marginBottom: spacing.lg }}>No available branches</Text>
            )}
            <View style={{ maxHeight: 260, borderWidth: 1, borderColor: colors.border, borderRadius: borderRadius.lg, padding: spacing.sm, marginBottom: spacing.md }}>
              <ScrollView nestedScrollEnabled style={{ flex: 1 }}>
                {transferBranches.map((b) => (
                  <TouchableOpacity key={b.id} onPress={() => setTransferBranchId(b.id)}
                    style={{ flexDirection: "row", alignItems: "center", gap: spacing.lg, padding: spacing.md, borderRadius: borderRadius.lg, borderWidth: 1, borderColor: transferBranchId === b.id ? colors.brand : colors.border, backgroundColor: transferBranchId === b.id ? colors.brandLight : colors.white, marginBottom: spacing.sm }}>
                    <Building size={16} color={transferBranchId === b.id ? colors.brand : colors.textSecondary} />
                    <Text style={{ fontSize: fontSize.md, color: colors.text }}>{b.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
            <TouchableOpacity onPress={handleTransferLc} disabled={transferring || !transferBranchId}
              style={{ backgroundColor: transferBranchId && !transferring ? colors.brand : colors.slate300, borderRadius: borderRadius.xl, paddingVertical: spacing.md, alignItems: "center", marginTop: spacing.md }}>
              <Text style={{ fontSize: fontSize.md, fontWeight: "600", color: colors.white }}>{transferring ? "Transferring..." : "Save"}</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </KeyboardAvoidingView>
    </Modal>
  );

  // ── Edit User Modal ──
  const renderEditUserModal = () => (
    <Modal visible={showEditUserModal} transparent animationType="fade" onRequestClose={() => setShowEditUserModal(false)}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "center", alignItems: "center", padding: isWide ? spacing.xl : spacing.md }}>
        <View style={{ backgroundColor: colors.white, borderRadius: borderRadius["2xl"], width: "100%", maxWidth: 400, overflow: "hidden", ...shadows.modal }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: isWide ? spacing["3xl"] : spacing.xl, paddingTop: isWide ? spacing["3xl"] : spacing.xl, marginBottom: spacing.lg }}>
            <Text style={{ fontSize: fontSize.xl, fontWeight: "700", color: colors.text }}>Edit User</Text>
            <TouchableOpacity onPress={() => setShowEditUserModal(false)}><X size={20} color={colors.textSecondary} /></TouchableOpacity>
          </View>
          <ScrollView style={{ flexGrow: 0 }} contentContainerStyle={{ paddingHorizontal: isWide ? spacing["3xl"] : spacing.xl, paddingBottom: isWide ? spacing["3xl"] : spacing.xl }} keyboardShouldPersistTaps="handled">
            <View style={{ gap: spacing.xl }}>
              <View><Text style={{ fontSize: fontSize.sm, fontWeight: "600", color: colors.textSecondary, marginBottom: spacing.sm }}>Name</Text>
                <TextInput value={editUserName} onChangeText={setEditUserName} placeholder="Full name" placeholderTextColor={colors.slate400}
                  style={{ borderRadius: borderRadius.lg, borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.xl, paddingVertical: spacing.md, fontSize: fontSize.md, color: colors.text }} /></View>
              <View><Text style={{ fontSize: fontSize.sm, fontWeight: "600", color: colors.textSecondary, marginBottom: spacing.sm }}>Phone</Text>
                <TextInput value={editUserPhone} onChangeText={setEditUserPhone} placeholder="Phone" placeholderTextColor={colors.slate400}
                  style={{ borderRadius: borderRadius.lg, borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.xl, paddingVertical: spacing.md, fontSize: fontSize.md, color: colors.text }} /></View>
              <TouchableOpacity onPress={handleEditUser} disabled={savingUser || !editUserName.trim()}
                style={{ backgroundColor: savingUser ? colors.slate300 : colors.brand, borderRadius: borderRadius.xl, paddingVertical: spacing.md, alignItems: "center" }}>
                <Text style={{ fontSize: fontSize.md, fontWeight: "600", color: colors.white }}>{savingUser ? "Saving..." : "Save"}</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </KeyboardAvoidingView>
    </Modal>
  );

  // ── Hierarchy Tree ──
  const renderHierarchyTree = () => {
    if (loading) return <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: spacing["5xl"] }}><Text style={{ fontSize: fontSize.md, color: colors.slate400 }}>Loading hierarchy...</Text></View>;
    if (hierarchy.length === 0) return <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: spacing["5xl"] }}><Users size={48} color={colors.slate300} /><Text style={{ fontSize: fontSize.md, color: colors.slate400, marginTop: spacing.lg }}>No users found.</Text></View>;

    const q = searchQuery.toLowerCase();
    const filtered = hierarchy.filter((rm) => {
      if (roleFilter !== "all" && rm.role !== roleFilter && !(rm.children || []).some((c) => c.role === roleFilter)) return false;
      if (q && !rm.name.toLowerCase().includes(q) && !(rm.children || []).some((c) => c.name.toLowerCase().includes(q))) return false;
      return true;
    });

    const indentAm = isWide ? spacing.xl : 8;
    const paddingAm = isWide ? spacing.lg : 8;
    const indentAa = isWide ? spacing.lg : 8;
    const paddingAa = isWide ? spacing.md : 6;
    const indentBranch = isWide ? spacing.lg : 8;

    return (
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ gap: spacing.md }}>
        {filtered.map((rm) => (
          <Card key={rm.id} style={{ padding: isWide ? spacing.xl : spacing.md }}>
            <TouchableOpacity style={{ flexDirection: "row", alignItems: "center", gap: spacing.lg, marginBottom: spacing.md }}>
              <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: "#8B5CF6", alignItems: "center", justifyContent: "center" }}>
                <Text style={{ fontSize: fontSize.lg, fontWeight: "700", color: colors.white }}>{rm.name.charAt(0)}</Text>
              </View>
              <View style={{ flex: 1 }}><Text style={{ fontSize: fontSize.lg, fontWeight: "700", color: colors.text }}>{rm.name}</Text><Badge label="RM" type="Critical" /></View>
              <Text style={{ fontSize: fontSize.sm, color: colors.textSecondary }}>{(rm.children || []).length} AMs</Text>
            </TouchableOpacity>

            {(rm.children || []).map((am) => {
              const isExpanded = expandedAmIds.has(am.id);
              const aaKids = am.children || [];
              const assigned = aaKids.reduce((s, aa) => s + (aa.branchCount || 0), 0);
              const total = am.branchCount || 0;
              const remaining = total - assigned;
              return (
                <View key={am.id} style={{ marginLeft: indentAm, borderLeftWidth: 2, borderLeftColor: colors.border, paddingLeft: paddingAm, marginTop: spacing.sm }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: spacing.md }}>
                      <TouchableOpacity onPress={() => toggleAm(am.id)} style={{ padding: spacing.sm, marginLeft: -spacing.sm }}>
                        {isExpanded ? <ChevronDown size={16} color={colors.textSecondary} /> : <ChevronRight size={16} color={colors.textSecondary} />}
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => handleSelectEntity("am", am)} style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: spacing.md }}>
                        <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: "#12B76A", alignItems: "center", justifyContent: "center" }}>
                          <Text style={{ fontSize: fontSize.sm, fontWeight: "700", color: colors.white }}>{am.name.charAt(0)}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: fontSize.md, fontWeight: "600", color: colors.text }}>{am.name}</Text>
                          <Text style={{ fontSize: fontSize.xs, color: colors.textSecondary }}>AM — {assigned}/{total} assigned{remaining > 0 ? `, ${remaining} remaining` : ""}</Text>
                        </View>
                      </TouchableOpacity>
                    </View>

                  {isExpanded && aaKids.map((aa) => {
                    const isAaExpanded = expandedAaIds.has(aa.id);
                    return (
                      <View key={aa.id} style={{ marginLeft: indentAa, borderLeftWidth: 2, borderLeftColor: colors.border, paddingLeft: paddingAa }}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingVertical: spacing.sm }}>
                          <TouchableOpacity onPress={() => toggleAa(aa.id)} style={{ padding: spacing.sm, marginLeft: -spacing.sm }}>
                            {isAaExpanded ? <ChevronDown size={12} color={colors.textSecondary} /> : <ChevronRight size={12} color={colors.textSecondary} />}
                          </TouchableOpacity>
                          <TouchableOpacity onPress={() => handleSelectEntity("aa", aa)} style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
                            <UserCog size={14} color="#06B6D4" />
                            <Text style={{ fontSize: fontSize.sm, fontWeight: "500", color: colors.text }}>{aa.name}</Text>
                            <Text style={{ fontSize: fontSize.xs, color: colors.textSecondary }}>({aa.branchCount || 0})</Text>
                          </TouchableOpacity>
                        </View>

                        {isAaExpanded && (aa.branches || []).map((b) => (
                          <TouchableOpacity key={b.id} onPress={() => handleSelectEntity("branch", { ...b, aaName: aa.name })}
                            style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingVertical: spacing.sm, marginLeft: indentBranch }}>
                            <Building size={12} color={colors.textSecondary} />
                            <Text style={{ fontSize: fontSize.sm, color: colors.text, flexShrink: 1 }} numberOfLines={1} ellipsizeMode="tail">{b.name}</Text>
                            <Badge label={b.lc ? b.lc.name : "No LC"} type={b.lc ? "Success" : "Warning"} />
                          </TouchableOpacity>
                        ))}
                        {isAaExpanded && (!aa.branches || aa.branches.length === 0) && <Text style={{ fontSize: fontSize.xs, color: colors.slate400, marginLeft: indentBranch }}>No branches assigned</Text>}
                      </View>
                    );
                  })}
                  {isExpanded && aaKids.length === 0 && <Text style={{ fontSize: fontSize.xs, color: colors.slate400, marginLeft: indentAm }}>No AAs assigned</Text>}
                </View>
              );
            })}
          </Card>
        ))}
      </ScrollView>
    );
  };

  return (
    <ScreenWrapper scroll={false} contentContainerStyle={{ flex: 1, paddingBottom: Platform.OS === "ios" ? spacing.xl : 16 }}>
      <SectionHeader title="User Management" action={
        <TouchableOpacity onPress={openAddModal} style={{ backgroundColor: colors.brand, borderRadius: borderRadius.xl, paddingHorizontal: spacing.xl, paddingVertical: isWide ? spacing.sm : spacing.md, flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
          <UserPlus size={16} color={colors.white} /><Text style={{ fontSize: fontSize.sm, fontWeight: "600", color: colors.white }}>Add User</Text>
        </TouchableOpacity>
      } />

      {/* ── Search bar ── */}
      <View style={{ marginTop: spacing.xl, marginBottom: spacing.md }}>
        <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: colors.white, borderRadius: borderRadius.lg, paddingHorizontal: spacing.md, borderWidth: 1, borderColor: colors.border }}>
          <Search size={16} color={colors.slate400} />
          <TextInput value={searchQuery} onChangeText={setSearchQuery} placeholder="Search users..." placeholderTextColor={colors.slate400}
            style={{ flex: 1, paddingVertical: isWide ? spacing.md : spacing.lg, paddingHorizontal: spacing.sm, color: colors.slate900, fontSize: fontSize.sm }} />
        </View>
      </View>

      {/* ── Filter chips (horizontally scrollable on mobile) ── */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.xl, flexGrow: 0 }}>
        <View style={{ flexDirection: "row", gap: spacing.sm }}>
          {FILTER_OPTIONS.map((opt) => (
            <TouchableOpacity key={opt.value} onPress={() => setRoleFilter(opt.value)}
              style={{ paddingHorizontal: spacing.xl, paddingVertical: spacing.sm, borderRadius: borderRadius.full, backgroundColor: roleFilter === opt.value ? colors.brand : colors.white, borderWidth: 1, borderColor: roleFilter === opt.value ? colors.brand : colors.border }}>
              <Text style={{ fontSize: fontSize.sm, fontWeight: "500", color: roleFilter === opt.value ? colors.white : colors.textSecondary }}>{opt.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* ── Main content: responsive layout ── */}
      {isWide ? (
        <View style={{ flexDirection: "row", gap: spacing.xl, flex: 1 }}>
          <View style={{ flex: 1, minWidth: 280 }}>{renderHierarchyTree()}</View>
          <View style={{ width: 1, backgroundColor: colors.border }} />
          <View style={{ flex: 1, minWidth: 280 }}>{renderDetailPanel()}</View>
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          {viewMode === "list" ? renderHierarchyTree() : renderDetailPanel()}
        </View>
      )}

      {renderAddModal()}
      {renderEditBranchModal()}
      {renderTransferModal()}
      {renderEditUserModal()}
    </ScreenWrapper>
  );
}
