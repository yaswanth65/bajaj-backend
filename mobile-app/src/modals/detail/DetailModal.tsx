import React, { useState, useEffect, useCallback, useMemo } from "react";
import { View, Text, ScrollView, TouchableOpacity, TextInput, Image, Alert, Modal, ActivityIndicator, Linking, Platform } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { X, MapPin, Calendar, User, Building, Clock, CheckCircle, XCircle, AlertTriangle, DollarSign, Wrench, HardHat, Phone, Mail, Award, Activity, Shield, TrendingUp, FileText, Camera, Upload, ImageOff, Trash2, Eye, EyeOff, ShieldAlert, ChevronRight } from "lucide-react-native";
import { useApp } from "../../context/AppContext";
import { apiClient } from "../../services/api/client";
import { colors, fontSize, spacing, borderRadius, shadows } from "../../theme/theme";
import { Badge } from "../../shared/components/Badge";
import { ProgressBar } from "../../shared/components/ProgressBar";
import { QuickButton } from "../../shared/components/QuickButton";
import { ModalSheet } from "../../shared/components/ModalSheet";
import { BranchDeepDiveScreen } from "./BranchDeepDiveScreen";
import { formatMoney, countdown, formatPct } from "../../utils/helpers";
import { Task, Complaint, Branch, User as UserType, Appliance, Approval, Visit } from "../../types/domain";

// Ã¢â€â‚¬Ã¢â€â‚¬ Proof Image Card Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬


const getRenderableImageUri = (value?: string | null) => {
  const uri = typeof value === "string" ? value.trim() : "";
  if (!uri || uri === "null") return null;
  if (uri.startsWith("blob:") && Platform.OS !== "web") return null;
  return /^(https?:|data:image\/|file:|content:|ph:|blob:)/i.test(uri) ? uri : null;
};

function ProofImageCard({ proofUrl, taskTitle }: { proofUrl: string | null; taskTitle?: string }) {
  const [loading, setLoading] = useState(true);
  const [currentUrl, setCurrentUrl] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    setLoading(true);
    if (!proofUrl || proofUrl === "null" || proofUrl.trim() === "") {
      setCurrentUrl(null);
    } else {
      setCurrentUrl(proofUrl);
    }
  }, [proofUrl]);

  if (!currentUrl) {
    return (
      <View style={{ width: "100%", height: 100, borderRadius: borderRadius.md, backgroundColor: colors.slate200, alignItems: "center", justifyContent: "center", marginBottom: spacing.sm }}>
        <FileText size={20} color={colors.slate400} />
        <Text style={{ fontSize: 9, color: colors.slate400, marginTop: 4 }}>No proof image</Text>
      </View>
    );
  }

  return (
    <>
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => setModalVisible(true)}
        style={{ width: "100%", height: 100, borderRadius: borderRadius.md, overflow: "hidden", marginBottom: spacing.sm, backgroundColor: colors.slate200 }}
      >
        <Image
          source={{ uri: currentUrl }}
          style={{ width: "100%", height: "100%" }}
          resizeMode="cover"
          onLoadStart={() => setLoading(true)}
          onLoad={() => setLoading(false)}
          onError={() => setCurrentUrl(null)}
        />
        {loading && (
          <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "center", backgroundColor: colors.slate100 }}>
            <ActivityIndicator size="small" color={colors.brand} />
          </View>
        )}
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={{ flex: 1, backgroundColor: "rgba(0, 0, 0, 0.9)", justifyContent: "center", alignItems: "center" }}>
          <TouchableOpacity
            style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
            onPress={() => setModalVisible(false)}
          />

          <View style={{ position: "absolute", top: 40, left: 20, right: 20, flexDirection: "row", justifyContent: "space-between", alignItems: "center", zIndex: 1 }}>
            <View style={{ flex: 1, marginRight: 10 }}>
              <Text style={{ color: "#FFF", fontSize: 16, fontWeight: "bold" }} numberOfLines={1}>
                {taskTitle || "Verification Proof"}
              </Text>
              <Text style={{ color: "#AAA", fontSize: 12 }}>
                Actual Proof Image
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => setModalVisible(false)}
              style={{ backgroundColor: "rgba(255, 255, 255, 0.2)", borderRadius: 20, padding: 8 }}
            >
              <X size={20} color="#FFF" />
            </TouchableOpacity>
          </View>

          <Image
            source={{ uri: currentUrl }}
            style={{ width: "95%", height: "70%" }}
            resizeMode="contain"
          />
        </View>
      </Modal>
    </>
  );
}

// Ã¢â€â‚¬Ã¢â€â‚¬ Safe Delete Modal Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

function SafeDeleteModal({
  visible,
  applianceName,
  userEmail,
  onConfirm,
  onCancel,
}: {
  visible: boolean;
  applianceName: string;
  userEmail: string;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
}) {
  const [step, setStep] = useState<1 | 2>(1);
  const [acknowledged, setAcknowledged] = useState(false);
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [pwError, setPwError] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (visible) {
      setStep(1);
      setAcknowledged(false);
      setPassword("");
      setShowPw(false);
      setPwError("");
      setVerifying(false);
      setDeleting(false);
    }
  }, [visible]);

  const handleNext = async () => {
    if (step === 1) {
      if (!acknowledged) return;
      setStep(2);
    } else if (step === 2) {
      if (!password) { setPwError("Password is required"); return; }
      setVerifying(true);
      setPwError("");
      try {
        await apiClient.post("/auth/login", { email: userEmail, password });
        setVerifying(false);
        setDeleting(true);
        await onConfirm();
      } catch {
        setVerifying(false);
        setPwError("Incorrect password. Please try again.");
      }
    }
  };

  const stepTitles: Record<1 | 2, string> = {
    1: "Step 1 of 2 Ã¢â‚¬â€ Acknowledge Risk",
    2: "Step 2 of 2 Ã¢â‚¬â€ Verify Your Identity",
  };

  const canProceed =
    (step === 1 && acknowledged) ||
    (step === 2 && password.length > 0);

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
      <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.65)", justifyContent: "center", alignItems: "center", padding: spacing.xl }}>
        <View style={{ backgroundColor: colors.white, borderRadius: 20, width: "100%", maxWidth: 400, overflow: "hidden", shadowColor: "#000", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 24, elevation: 20 }}>

          {/* Header */}
          <View style={{ backgroundColor: "#FEF2F2", borderBottomWidth: 1, borderBottomColor: "#FECACA", padding: spacing.xl, flexDirection: "row", alignItems: "center", gap: spacing.md }}>
            <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: "#FEE2E2", alignItems: "center", justifyContent: "center" }}>
              <Trash2 size={18} color="#EF4444" strokeWidth={2.2} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: fontSize.xs, fontWeight: "700", color: "#EF4444", textTransform: "uppercase", letterSpacing: 0.8 }}>Permanent Deletion</Text>
              <Text style={{ fontSize: fontSize.sm, fontWeight: "600", color: "#7F1D1D", marginTop: 2 }}>{stepTitles[step]}</Text>
            </View>
            <TouchableOpacity onPress={onCancel} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <X size={16} color={colors.slate400} />
            </TouchableOpacity>
          </View>

          {/* Step progress bar */}
          <View style={{ flexDirection: "row" }}>
            {([1, 2] as const).map((s) => (
              <View key={s} style={{ flex: 1, height: 3, backgroundColor: s <= step ? "#EF4444" : "#FECDD3" }} />
            ))}
          </View>

          <View style={{ padding: spacing.xl, gap: spacing.lg }}>

            {/* Ã¢â€â‚¬Ã¢â€â‚¬ STEP 1: Acknowledge Ã¢â€â‚¬Ã¢â€â‚¬ */}
            {step === 1 && (
              <>
                <View style={{ backgroundColor: "#FFF1F2", borderRadius: 12, padding: spacing.lg, borderWidth: 1, borderColor: "#FECACA", gap: spacing.sm }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
                    <ShieldAlert size={15} color="#EF4444" />
                    <Text style={{ fontSize: fontSize.sm, fontWeight: "700", color: "#991B1B" }}>This action cannot be undone</Text>
                  </View>
                  <Text style={{ fontSize: fontSize.xs, color: "#7F1D1D", lineHeight: 18 }}>
                    Deleting <Text style={{ fontWeight: "700" }}>"{applianceName}"</Text> will permanently remove all associated records, task history, verification proofs, and maintenance logs from the system.
                  </Text>
                </View>

                <TouchableOpacity
                  onPress={() => setAcknowledged(v => !v)}
                  activeOpacity={0.8}
                  style={{ flexDirection: "row", alignItems: "flex-start", gap: spacing.md, padding: spacing.md, borderRadius: 10, backgroundColor: acknowledged ? "#FEF2F2" : colors.slate50, borderWidth: 1, borderColor: acknowledged ? "#FECACA" : colors.border }}
                >
                  <View style={{ width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: acknowledged ? "#EF4444" : colors.slate300, backgroundColor: acknowledged ? "#EF4444" : colors.white, alignItems: "center", justifyContent: "center", marginTop: 1 }}>
                    {acknowledged && <CheckCircle size={13} color={colors.white} strokeWidth={3} />}
                  </View>
                  <Text style={{ flex: 1, fontSize: fontSize.sm, color: colors.slate700, fontWeight: "500", lineHeight: 18 }}>
                    I understand this is a permanent, irreversible action and I accept full responsibility
                  </Text>
                </TouchableOpacity>
              </>
            )}

            {/* Ã¢â€â‚¬Ã¢â€â‚¬ STEP 2: Password Ã¢â€â‚¬Ã¢â€â‚¬ */}
            {step === 2 && (
              <>
                <View style={{ gap: spacing.xs }}>
                  <Text style={{ fontSize: fontSize.xs, fontWeight: "600", color: colors.slate500, textTransform: "uppercase", letterSpacing: 0.8 }}>Enter your account password</Text>
                  <Text style={{ fontSize: fontSize.xs, color: colors.slate400, lineHeight: 16 }}>
                    Your identity must be verified before deletion proceeds. Signed in as <Text style={{ fontWeight: "700", color: colors.slate600 }}>{userEmail}</Text>
                  </Text>
                </View>
                <View>
                  <TextInput
                    value={password}
                    onChangeText={v => { setPassword(v); setPwError(""); }}
                    placeholder="Enter your password"
                    placeholderTextColor={colors.slate400}
                    secureTextEntry={!showPw}
                    autoCapitalize="none"
                    style={{
                      borderWidth: 1.5,
                      borderColor: pwError ? "#EF4444" : colors.border,
                      borderRadius: 10,
                      paddingHorizontal: spacing.md,
                      paddingRight: 48,
                      paddingVertical: spacing.md,
                      fontSize: fontSize.sm,
                      color: colors.slate900,
                      backgroundColor: colors.white
                    }}
                  />
                  <TouchableOpacity
                    onPress={() => setShowPw(v => !v)}
                    style={{ position: "absolute", right: 14, top: 0, bottom: 0, justifyContent: "center" }}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    {showPw ? <EyeOff size={16} color={colors.slate400} /> : <Eye size={16} color={colors.slate400} />}
                  </TouchableOpacity>
                </View>
                {pwError ? (
                  <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.xs }}>
                    <AlertTriangle size={12} color="#EF4444" />
                    <Text style={{ fontSize: fontSize.xs, color: "#EF4444" }}>{pwError}</Text>
                  </View>
                ) : null}
              </>
            )}
          </View>

          {/* Footer */}
          <View style={{ flexDirection: "row", gap: spacing.md, padding: spacing.xl, paddingTop: 0 }}>
            <TouchableOpacity
              onPress={onCancel}
              style={{ flex: 1, paddingVertical: spacing.md, borderRadius: 10, backgroundColor: colors.slate100, alignItems: "center" }}
            >
              <Text style={{ fontSize: fontSize.sm, fontWeight: "700", color: colors.slate600 }}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleNext}
              disabled={!canProceed || verifying || deleting}
              style={{
                flex: 1.5, paddingVertical: spacing.md, borderRadius: 10, alignItems: "center", justifyContent: "center",
                flexDirection: "row", gap: spacing.sm,
                backgroundColor: !canProceed ? colors.slate200 : step < 2 ? "#1E293B" : "#EF4444",
                opacity: verifying || deleting ? 0.8 : 1,
              }}
            >
              {verifying || deleting ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                <>
                  <Text style={{ fontSize: fontSize.sm, fontWeight: "700", color: !canProceed ? colors.slate400 : colors.white }}>
                    {step === 2 ? "Delete Permanently" : "Continue"}
                  </Text>
                  {step < 2 && <ChevronRight size={14} color={!canProceed ? colors.slate400 : colors.white} strokeWidth={2.5} />}
                  {step === 2 && canProceed && <Trash2 size={13} color={colors.white} strokeWidth={2.5} />}
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// Ã¢â€â‚¬Ã¢â€â‚¬ Main Modal Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

interface Props {
  visible: boolean;
  onClose: () => void;
  entityType: string;
  entityId: string;
}

export function DetailModal({ visible, onClose, entityType, entityId }: Props) {
  const { getTask, getComplaint, getBranch, getUser, getAppliance, tasks, complaints, approvals, visits, state, currentUser, submitTaskProof, markTaskDone, revokeTask, updateComplaintStatus, addComplaintRemark, closeComplaint, approveRequest, rejectRequest, showToast, deleteUser, deleteAppliance, submitVisitReport, updateAppliance, openApplianceDetail, openTaskDetail, openModal } = useApp();

  const [proofText, setProofText] = useState("");
  const [selectedImage, setSelectedImage] = useState("");
  const [isSubmittingProof, setIsSubmittingProof] = useState(false);
  const [pickedImage, setPickedImage] = useState<string | null>(null);
  const [previewImageUri, setPreviewImageUri] = useState<string | null>(null);

  const pickImage = useCallback(async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permission required", "Camera roll access is needed to pick a proof image.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.7,
      allowsEditing: true,
    });
    if (!result.canceled && result.assets?.[0]?.uri) {
      setPickedImage(result.assets[0].uri);
      setSelectedImage(result.assets[0].uri);
    }
  }, []);

  const takePhoto = useCallback(async () => {
    if (Platform.OS === "web") {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 0.7,
        allowsEditing: true,
      });
      if (!result.canceled && result.assets?.[0]?.uri) {
        setPickedImage(result.assets[0].uri);
        setSelectedImage(result.assets[0].uri);
      }
      return;
    }

    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permission required", "Camera access is needed to take a proof photo.");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      quality: 0.7,
      allowsEditing: true,
    });
    if (!result.canceled && result.assets?.[0]?.uri) {
      setPickedImage(result.assets[0].uri);
      setSelectedImage(result.assets[0].uri);
    }
  }, []);

  const [applianceFromDate, setApplianceFromDate] = useState("2026-06-01");
  const [applianceToDate, setApplianceToDate] = useState("2026-06-15");

  const [editPurchaseDate, setEditPurchaseDate] = useState("");
  const [editLastService, setEditLastService] = useState("");
  const [editNextService, setEditNextService] = useState("");

  const [editName, setEditName] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editBrand, setEditBrand] = useState("");
  const [editModel, setEditModel] = useState("");
  const [editZone, setEditZone] = useState("");
  const [editSerial, setEditSerial] = useState("");
  const [editWarranty, setEditWarranty] = useState("");
  const [editAmcVendor, setEditAmcVendor] = useState("");
  const [editPurchaseCost, setEditPurchaseCost] = useState("");
  const [editStatus, setEditStatus] = useState("");
  const [editHealthScore, setEditHealthScore] = useState("");
  const [isSavingAppliance, setIsSavingAppliance] = useState(false);
  const [safeDeleteOpen, setSafeDeleteOpen] = useState(false);

  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [datePickerTarget, setDatePickerTarget] = useState<"purchaseDate" | "lastService" | "nextService" | "fromDate" | "toDate" | null>(null);
  const [datePickerValue, setDatePickerValue] = useState("");

  const handleSelectDatePicker = (dateStr: string) => {
    if (datePickerTarget === "purchaseDate") {
      setEditPurchaseDate(dateStr);
    } else if (datePickerTarget === "lastService") {
      setEditLastService(dateStr);
    } else if (datePickerTarget === "nextService") {
      setEditNextService(dateStr);
    } else if (datePickerTarget === "fromDate") {
      setApplianceFromDate(dateStr);
    } else if (datePickerTarget === "toDate") {
      setApplianceToDate(dateStr);
    }
  };

  const type = entityType || state.modalType;
  const id = entityId || state.modalData?.id;

  const task = type === "task" ? getTask(id) || tasks.find(t => t.id === id) : undefined;
  const complaint = type === "complaint" ? getComplaint(id) : undefined;
  const branch = type === "branch" ? getBranch(id) : undefined;
  const user = type === "user" ? getUser(id) : undefined;
  const appliance = type === "appliance" ? getAppliance(id) : undefined;
  const approval = type === "approval" ? approvals.find(a => a.id === id) : undefined;
  const visit = type === "visit" ? visits.find(v => v.id === id) : undefined;

  useEffect(() => {
    if (appliance) {
      setEditPurchaseDate(appliance.purchaseDate ? String(appliance.purchaseDate).slice(0, 10) : "");
      setEditLastService(appliance.lastService ? String(appliance.lastService).slice(0, 10) : "");
      setEditNextService(appliance.nextService ? String(appliance.nextService).slice(0, 10) : "");

      setEditName(appliance.name || "");
      setEditCategory(appliance.category || "");
      setEditBrand(appliance.brand || "");
      setEditModel(appliance.model || "");
      setEditZone(appliance.zone || "");
      setEditSerial(appliance.serial || "");
      setEditWarranty(appliance.warranty || "");
      setEditAmcVendor(appliance.amcVendor || "");
      setEditPurchaseCost(appliance.purchaseCost ? String(appliance.purchaseCost) : "");
      setEditStatus(appliance.status || "");
      setEditHealthScore(appliance.healthScore ? String(appliance.healthScore) : "");
    }
  }, [appliance]);

  const handleSaveAppliance = async () => {
    if (!appliance) return;
    setIsSavingAppliance(true);
    try {
      await updateAppliance(appliance.id, {
        name: editName,
        category: editCategory,
        brand: editBrand,
        model: editModel,
        zone: editZone,
        serial: editSerial,
        warranty: editWarranty,
        amcVendor: editAmcVendor,
        purchaseCost: editPurchaseCost ? Number(editPurchaseCost) : 0,
        status: editStatus as any,
        healthScore: editHealthScore ? Number(editHealthScore) : 100,
        purchaseDate: editPurchaseDate ? new Date(editPurchaseDate) : null as any,
        lastService: editLastService ? new Date(editLastService) : null as any,
        nextService: editNextService ? new Date(editNextService) : null as any,
      });
      showToast("Appliance details updated successfully");
      onClose();
    } catch (err: any) {
      console.error(err);
      showToast("Failed to save appliance details");
    } finally {
      setIsSavingAppliance(false);
    }
  };

  function renderTaskContent() {
    if (!task) return null;
    const taskBranch = getBranch(task.branchId);
    const assignee = task.assignedTo ? getUser(task.assignedTo) : undefined;
    const pct = (task.checklistDone / task.checklistTotal) * 100;
    const linkedAppliance = task.applianceId ? getAppliance(task.applianceId) : undefined;
    const relatedTasks = task.applianceId ? tasks.filter(t => String(t.applianceId) === String(task.applianceId) && String(t.id) !== String(task.id) && t.proofUrl) : [];
    return (
      <>
        <View style={{ gap: spacing.md }}>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, alignItems: "center" }}>
            <Badge label={task.status} type={task.status as any} />
            <Badge label={task.priority} type={task.priority as any} />
            <Badge label={task.schedule} />
          </View>
          <Text style={{ fontSize: fontSize["2xl"], fontWeight: "400", color: colors.slate900 }}>{task.title}</Text>
        </View>
        <View style={{ gap: spacing.md }}>
          <DetailRow icon={Building} label="Branch" value={taskBranch?.name || "Ã¢â‚¬â€"} />
          <DetailRow icon={MapPin} label="Zone" value={task.zone} />
          <DetailRow icon={User} label="Assigned to" value={assignee?.name || "Shared"} />
          <DetailRow icon={Clock} label="Deadline" value={countdown(task.deadline, "2026-04-26T11:20:00")} />
          <DetailRow icon={FileText} label="Proof rule" value={task.proofLabel} />
          <DetailRow icon={Activity} label="Escalation" value={task.escalation} />
        </View>

        {linkedAppliance ? (
          <TouchableOpacity onPress={() => openApplianceDetail(linkedAppliance.id)} style={{ backgroundColor: colors.sky50, borderRadius: borderRadius["2xl"], padding: spacing.lg, borderWidth: 1, borderColor: colors.sky200 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md }}>
              <Wrench size={18} color={colors.sky700} strokeWidth={2} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: fontSize.sm, fontWeight: "400", color: colors.sky900 }}>{linkedAppliance.name}</Text>
                <Text style={{ fontSize: fontSize.xs, color: colors.sky600 }}>{linkedAppliance.category} Ã‚Â· {linkedAppliance.zone} Ã‚Â· Health: {formatPct(linkedAppliance.healthScore)}</Text>
              </View>
              <ChevronRight size={16} color={colors.sky600} strokeWidth={2} />
            </View>
          </TouchableOpacity>
        ) : null}

        {task.proofUrl ? (
          <View>
            <Text style={{ fontSize: fontSize.sm, fontWeight: "400", color: colors.slate900, marginBottom: spacing.sm }}>Proof Image</Text>
            <ProofImageCard proofUrl={task.proofUrl} taskTitle={task.title} />
          </View>
        ) : null}

        {relatedTasks.length > 0 ? (
          <View>
            <Text style={{ fontSize: fontSize.sm, fontWeight: "400", color: colors.slate900, marginBottom: spacing.sm }}>Related Task Images ({relatedTasks.length})</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm }}>
              {relatedTasks.map(rt => (
                <TouchableOpacity key={rt.id} onPress={() => openTaskDetail(rt.id)} style={{ width: 120, height: 100, borderRadius: borderRadius.lg, overflow: "hidden", borderWidth: 1, borderColor: colors.border }}>
                  <Image source={{ uri: rt.proofUrl! }} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        ) : null}

        <View>
          <Text style={{ fontSize: fontSize.sm, fontWeight: "400", color: colors.slate900, marginBottom: spacing.sm }}>Checklist: {task.checklistDone}/{task.checklistTotal}</Text>
          <ProgressBar value={pct} color={task.status === "Completed" ? colors.success : colors.brand} />
        </View>
        {task.notes ? (
          <View style={{ backgroundColor: colors.slate50, borderRadius: borderRadius["2xl"], padding: spacing.lg }}>
            <Text style={{ fontSize: fontSize.sm, fontWeight: "400", color: colors.slate900 }}>Notes</Text>
            <Text style={{ fontSize: fontSize.sm, color: colors.slate500, marginTop: spacing.xs }}>{task.notes}</Text>
          </View>
        ) : null}
        {task.redoReason ? (
          <View style={{ backgroundColor: colors.red50, borderRadius: borderRadius["2xl"], padding: spacing.lg }}>
            <Text style={{ fontSize: fontSize.sm, fontWeight: "400", color: colors.red700 }}>Redo reason</Text>
            <Text style={{ fontSize: fontSize.sm, color: colors.red700, marginTop: spacing.xs }}>{task.redoReason}</Text>
          </View>
        ) : null}
        {task.completedBy && task.completedAt ? (
          <View style={{ backgroundColor: colors.emerald50, borderRadius: borderRadius["2xl"], padding: spacing.lg }}>
            <Text style={{ fontSize: fontSize.sm, fontWeight: "400", color: colors.emerald700 }}>Completed</Text>
            <Text style={{ fontSize: fontSize.sm, color: colors.emerald700, marginTop: spacing.xs }}>By user #{task.completedBy} at {task.completedAt}</Text>
          </View>
        ) : null}
        {task.status !== "Completed" && currentUser.role !== "rm" ? (
          currentUser.role === "lc" ? (
            <View style={{ gap: spacing.md, marginTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.md }}>
              <Text style={{ fontSize: fontSize.md, fontWeight: "600", color: colors.slate900 }}>Submit Task Proof</Text>

              <View>
                <Text style={{ fontSize: fontSize.xs, color: colors.slate500, marginBottom: spacing.xs }}>Select Image Proof</Text>
                <View style={{ flexDirection: "row", gap: spacing.sm, flexWrap: "wrap" }}>
                  <TouchableOpacity
                    onPress={pickImage}
                    style={{ flex: 1, minWidth: 80, paddingVertical: spacing.md, borderRadius: borderRadius.md, borderWidth: 2, borderColor: pickedImage && !pickedImage.startsWith("https://images.unsplash.com") ? colors.brand : colors.slate200, backgroundColor: pickedImage && !pickedImage.startsWith("https://images.unsplash.com") ? colors.brand + "10" : colors.white, alignItems: "center", gap: 4 }}
                  >
                    <Upload size={16} color={pickedImage && !pickedImage.startsWith("https://images.unsplash.com") ? colors.brand : colors.slate500} />
                    <Text style={{ fontSize: 10, color: pickedImage && !pickedImage.startsWith("https://images.unsplash.com") ? colors.brand : colors.slate600, fontWeight: "600", textAlign: "center" }}>Gallery</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={takePhoto}
                    style={{ flex: 1, minWidth: 80, paddingVertical: spacing.md, borderRadius: borderRadius.md, borderWidth: 2, borderColor: colors.slate200, backgroundColor: colors.white, alignItems: "center", gap: 4 }}
                  >
                    <Camera size={16} color={colors.slate500} />
                    <Text style={{ fontSize: 10, color: colors.slate600, fontWeight: "600", textAlign: "center" }}>Camera</Text>
                  </TouchableOpacity>

                </View>
                {pickedImage && (
                  <View style={{ marginTop: spacing.sm }}>
                    <Image source={{ uri: pickedImage }} style={{ width: "100%", height: 120, borderRadius: borderRadius.md }} resizeMode="cover" />
                  </View>
                )}
              </View>

              <View>
                <Text style={{ fontSize: fontSize.xs, color: colors.slate500, marginBottom: spacing.xs }}>Remarks / Text Notes</Text>
                <TextInput
                  value={proofText}
                  onChangeText={proofText => setProofText(proofText)}
                  placeholder="Enter details of work completed..."
                  placeholderTextColor={colors.slate400}
                  multiline
                  numberOfLines={3}
                  style={{
                    borderRadius: borderRadius.lg,
                    borderWidth: 1,
                    borderColor: colors.border,
                    paddingHorizontal: spacing.md,
                    paddingVertical: spacing.md,
                    fontSize: fontSize.sm,
                    color: colors.slate900,
                    backgroundColor: colors.slate50,
                    minHeight: 80,
                    textAlignVertical: "top"
                  }}
                />
              </View>

              <QuickButton
                label={isSubmittingProof ? "Submitting..." : "Submit Verification Proof"}
                onPress={async () => {
                  if (!selectedImage) {
                    showToast("Please select or capture a proof image first");
                    return;
                  }
                  setIsSubmittingProof(true);
                  try {
                    const submitted = await submitTaskProof(task.id, proofText, selectedImage);
                    if (submitted) {
                      setProofText("");
                      setSelectedImage("");
                      setPickedImage(null);
                      onClose();
                    }
                  } finally {
                    setIsSubmittingProof(false);
                  }
                }}
              />
            </View>
          ) : (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
              <QuickButton label="Submit photo proof" onPress={() => submitTaskProof(task.id)} />
              <QuickButton label="Mark complete" onPress={() => markTaskDone(task.id)} />
              {task.status !== "Revoked" ? <QuickButton label="Revoke with comment" onPress={() => revokeTask(task.id)} /> : null}
            </View>
          )
        ) : null}
      </>
    );
  }

  function renderComplaintContent() {
    if (!complaint) return null;
    const complaintBranch = getBranch(complaint.branchId);
    const reporter = getUser(complaint.raisedById);
    const vendorRemarks = complaint.vendorRemarks || "";
    const isOpen = complaint.status !== "RESOLVED";
    const statusLabel = complaint.status === "VENDOR_PENDING" ? "Vendor Pending" : complaint.status === "IN_PROGRESS" ? "In Progress" : complaint.status;
    return (
      <>
        <View style={{ gap: spacing.md }}>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, alignItems: "center" }}>
            <Badge label={statusLabel} type={complaint.status as any} />
            <Badge label={complaint.priority} type={complaint.priority as any} />
          </View>
          <Text style={{ fontSize: fontSize.xs, fontWeight: "600", color: colors.slate400 }}>{complaint.complaintId}</Text>
        </View>
        <View style={{ gap: spacing.md }}>
          <DetailRow icon={Building} label="Branch" value={complaintBranch?.name || "â€”"} />
          <DetailRow icon={Building} label="Branch" value={complaintBranch?.name || "—"} />
          <DetailRow icon={User} label="Reported by" value={reporter?.name || complaint.raisedByName || "—"} />
          <DetailRow icon={Wrench} label="Vendor" value={complaint.vendorId} />
          {complaint.vendorEmail ? <DetailRow icon={Mail} label="Vendor Email" value={complaint.vendorEmail} /> : null}
          {complaint.assetName ? <DetailRow icon={HardHat} label="Asset" value={complaint.assetName} /> : null}
          <DetailRow icon={Calendar} label="Raised" value={complaint.createdAt} />
          {complaint.resolvedAt ? <DetailRow icon={CheckCircle} label="RESOLVED" value={new Date(complaint.resolvedAt).toLocaleString("en-IN")} /> : null}
        </View>
        {complaint.description ? (
          <View style={{ backgroundColor: colors.slate50, borderRadius: borderRadius["2xl"], padding: spacing.lg }}>
            <Text style={{ fontSize: fontSize.sm, fontWeight: "400", color: colors.slate900 }}>Description</Text>
            <Text style={{ fontSize: fontSize.sm, color: colors.slate500, marginTop: spacing.xs }}>{complaint.description}</Text>
          </View>
        ) : null}

        {complaint.attachmentUrls && complaint.attachmentUrls.length > 0 ? (
          <View style={{ backgroundColor: colors.slate50, borderRadius: borderRadius["2xl"], padding: spacing.lg }}>
            <Text style={{ fontSize: fontSize.sm, fontWeight: "400", color: colors.slate900, marginBottom: spacing.sm }}>Attachments (Tap to view full screen)</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm }}>
              {complaint.attachmentUrls.map((url, i) => {
                const imageUri = getRenderableImageUri(url);
                if (!imageUri) return null;
                return (
                  <TouchableOpacity key={i} onPress={() => setPreviewImageUri(imageUri)} activeOpacity={0.8} style={{ width: 120, height: 90, borderRadius: borderRadius.md, overflow: "hidden", borderWidth: 1, borderColor: colors.border }}>
                    <Image source={{ uri: imageUri }} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        ) : null}
        {vendorRemarks.length > 0 ? (
          <View style={{ backgroundColor: colors.slate50, borderRadius: borderRadius["2xl"], padding: spacing.lg }}>
            <Text style={{ fontSize: fontSize.sm, fontWeight: "400", color: colors.slate900, marginBottom: spacing.sm }}>Activity / Remarks</Text>
            {vendorRemarks.split("\n").map((remark, i: number) => (
              <View key={i} style={{ flexDirection: "row", gap: spacing.sm, marginBottom: spacing.md }}>
                <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.brand, marginTop: 5 }} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: fontSize.sm, color: colors.slate500 }}>{remark}</Text>
                </View>
              </View>
            ))}
          </View>
        ) : null}
        {isOpen && currentUser.role !== "rm" ? (
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
            {complaint.status !== "ACKNOWLEDGED" && <QuickButton label="Acknowledge" onPress={() => openModal("acknowledgeComplaint", { id: complaint.id })} />}
            <QuickButton label="Resolve" onPress={() => updateComplaintStatus(complaint.id, "RESOLVED")} />
          </View>
        ) : null}
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
          {complaint.workOrderPdfUrl && (
            <QuickButton label="View Work Order PDF" onPress={() => Linking.openURL(complaint.workOrderPdfUrl!)} />
          )}
          {complaint.completionPdfUrl && (
            <QuickButton label="View Completion PDF" onPress={() => Linking.openURL(complaint.completionPdfUrl!)} />
          )}
        </View>
        {complaint.status === "RESOLVED" && currentUser.role !== "rm" ? (
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
            <QuickButton label="Close Complaint" onPress={() => { closeComplaint(complaint.id); onClose(); }} />
          </View>
        ) : null}
      </>
    );
  }

  function renderBranchContent() {
    if (!branch) return null;
    const manager = getUser(branch.managerId);
    const aa = getUser(branch.assistantManagerId);
    const budgetPct = Math.round((branch.usedBudget / branch.monthlyBudget) * 100);
    const branchTasks = tasks.filter((t: any) => t.branchId === branch.id);
    const completedTasksCount = branchTasks.filter((t: any) => t.status === "Completed").length;
    const totalTasksCount = branchTasks.length;

    return (
      <>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.xl }}>
          <View style={{ flex: 1, minWidth: 240, gap: spacing.xl }}>
            <View style={{ backgroundColor: colors.slate900, borderRadius: borderRadius["4xl"], padding: spacing["2xl"] }}>
              <Text style={{ fontSize: fontSize.xs, fontWeight: "400", color: colors.slate300, textTransform: "uppercase", letterSpacing: 2 }}>{branch.code}</Text>
              <Text style={{ fontSize: fontSize["3xl"], fontWeight: "400", color: colors.white, marginTop: spacing.sm }}>{branch.name}</Text>
              <Text style={{ fontSize: fontSize.sm, color: colors.slate300, marginTop: spacing.xs }}>{branch.address}</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginTop: spacing.xl }}>
                {[
                  { label: "Health", value: branch.health + "%", color: colors.success },
                  { label: "Attendance", value: branch.todayAttendance + "%", color: colors.brandLight },
                  { label: "Tasks", value: `${completedTasksCount}/${totalTasksCount}`, color: colors.sky200 },
                  { label: "Alerts", value: String(branch.criticalAlerts), color: colors.error },
                ].map((s) => (
                  <View key={s.label} style={{ flex: 1, minWidth: 60, backgroundColor: "rgba(255,255,255,0.1)", borderRadius: borderRadius["2xl"], padding: spacing.md, alignItems: "center" }}>
                    <Text style={{ fontSize: fontSize.xs, color: colors.slate300 }}>{s.label}</Text>
                    <Text style={{ fontSize: fontSize.lg, fontWeight: "400", color: s.color, marginTop: spacing.xs }}>{s.value}</Text>
                  </View>
                ))}
              </View>
            </View>
            <View style={{ backgroundColor: colors.slate50, borderRadius: borderRadius["4xl"], padding: spacing["2xl"] }}>
              <View style={{ gap: spacing.md }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                  <Text style={{ fontSize: fontSize.sm, color: colors.textSecondary }}>Branch Manager</Text>
                  <Text style={{ fontSize: fontSize.sm, fontWeight: "400", color: colors.slate900 }}>{manager?.name || "Ã¢â‚¬â€"}</Text>
                </View>
                <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                  <Text style={{ fontSize: fontSize.sm, color: colors.textSecondary }}>LC</Text>
                  <Text style={{ fontSize: fontSize.sm, fontWeight: "400", color: colors.slate900 }}>{aa?.name || "Ã¢â‚¬â€"}</Text>
                </View>
                <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                  <Text style={{ fontSize: fontSize.sm, color: colors.textSecondary }}>Geo radius</Text>
                  <Text style={{ fontSize: fontSize.sm, fontWeight: "400", color: colors.slate900 }}>{branch.geoRadius}m</Text>
                </View>
                <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                  <Text style={{ fontSize: fontSize.sm, color: colors.textSecondary }}>Shift window</Text>
                  <Text style={{ fontSize: fontSize.sm, fontWeight: "400", color: colors.slate900 }}>{branch.shiftWindow}</Text>
                </View>
                <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                  <Text style={{ fontSize: fontSize.sm, color: colors.textSecondary }}>Next visit</Text>
                  <Text style={{ fontSize: fontSize.sm, fontWeight: "400", color: colors.slate900 }}>{branch.nextVisit}</Text>
                </View>
              </View>
            </View>
          </View>

          <View style={{ flex: 2, minWidth: 280, gap: spacing.xl }}>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
              {[
                { label: "Staff", value: String(branch.staffCount), meta: "Total staff", accent: colors.sky600 },
                { label: "Issues", value: String(branch.openIssues), meta: "Open and escalated", accent: colors.warning },
                { label: "Tasks", value: String(branch.staffCount * 3), meta: "Still pending", accent: colors.error },
                { label: "Budget left", value: formatMoney(branch.monthlyBudget - branch.usedBudget), meta: "After current spend", accent: colors.success },
              ].map((s) => (
                <View key={s.label} style={{ flex: 1, minWidth: 100, backgroundColor: colors.slate50, borderRadius: borderRadius["2xl"], padding: spacing.lg }}>
                  <Text style={{ fontSize: fontSize.xs, color: colors.textSecondary, textTransform: "uppercase", letterSpacing: 1 }}>{s.label}</Text>
                  <Text style={{ fontSize: fontSize["2xl"], fontWeight: "400", color: colors.slate900, marginTop: spacing.xs }}>{s.value}</Text>
                  <Text style={{ fontSize: fontSize.xs, color: colors.textSecondary, marginTop: spacing.xs }}>{s.meta}</Text>
                </View>
              ))}
            </View>

            <View style={{ backgroundColor: colors.slate50, borderRadius: borderRadius["4xl"], padding: spacing["2xl"] }}>
              <Text style={{ fontSize: fontSize.lg, fontWeight: "400", color: colors.slate900 }}>Operational drill-down</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.md, marginTop: spacing.xl }}>
                <View style={{ flex: 1, minWidth: 140, backgroundColor: colors.white, borderRadius: borderRadius["2xl"], padding: spacing.xl }}>
                  <Text style={{ fontSize: fontSize.sm, fontWeight: "400", color: colors.slate900 }}>People mix</Text>
                  <Text style={{ fontSize: fontSize.xs, color: colors.textSecondary, marginTop: spacing.xs }}>{branch.staffCount} staff, 1 LC.</Text>
                </View>
                <View style={{ flex: 1, minWidth: 140, backgroundColor: colors.white, borderRadius: borderRadius["2xl"], padding: spacing.xl }}>
                  <Text style={{ fontSize: fontSize.sm, fontWeight: "400", color: colors.slate900 }}>Appliance status</Text>
                  <Text style={{ fontSize: fontSize.xs, color: colors.textSecondary, marginTop: spacing.xs }}>{branch.applianceRisk} asset(s) need action.</Text>
                </View>
                <View style={{ flex: 1, minWidth: 140, backgroundColor: colors.white, borderRadius: borderRadius["2xl"], padding: spacing.xl }}>
                  <Text style={{ fontSize: fontSize.sm, fontWeight: "400", color: colors.slate900 }}>Audit readiness</Text>
                  <Text style={{ fontSize: fontSize.xs, color: colors.textSecondary, marginTop: spacing.xs }}>Last audit {branch.auditScore}% with safety logs mostly complete.</Text>
                </View>
                <View style={{ flex: 1, minWidth: 140, backgroundColor: colors.white, borderRadius: borderRadius["2xl"], padding: spacing.xl }}>
                  <Text style={{ fontSize: fontSize.sm, fontWeight: "400", color: colors.slate900 }}>Finance posture</Text>
                  <Text style={{ fontSize: fontSize.xs, color: colors.textSecondary, marginTop: spacing.xs }}>Used {budgetPct}% of monthly budget.</Text>
                </View>
              </View>
              <View style={{ marginTop: spacing.lg }}>
                <Text style={{ fontSize: fontSize.sm, fontWeight: "400", color: colors.slate900, marginBottom: spacing.xs }}>Budget: {formatMoney(branch.usedBudget)} / {formatMoney(branch.monthlyBudget)}</Text>
                <ProgressBar value={budgetPct} color={budgetPct > 80 ? colors.error : budgetPct > 60 ? colors.warning : colors.success} />
              </View>
            </View>
          </View>
        </View>
      </>
    );
  }

  function renderUserContent() {
    if (!user) return null;
    const userBranch = getBranch(user.branchId);
    return (
      <>
        <View style={{ alignItems: "center", gap: spacing.md, paddingVertical: spacing.md }}>
          <View style={{ width: 64, height: 64, borderRadius: 24, backgroundColor: colors.brandLight, alignItems: "center", justifyContent: "center" }}>
            <Text style={{ fontSize: fontSize["3xl"], fontWeight: "400", color: colors.brand }}>
              {(user.name || "").split(" ").map((n: string) => n?.[0] || "").join("").slice(0, 2).toUpperCase()}
            </Text>
          </View>
          <View style={{ alignItems: "center" }}>
            <Text style={{ fontSize: fontSize["2xl"], fontWeight: "400", color: colors.slate900 }}>{user.name}</Text>
            <Text style={{ fontSize: fontSize.sm, color: colors.slate500 }}>{user.position}</Text>
            <Badge label={user.role as any} type={user.role as any} />
          </View>
        </View>
        <View style={{ gap: spacing.md }}>
          <DetailRow icon={Building} label="Branch" value={userBranch?.name || "Ã¢â‚¬â€"} />
          <DetailRow icon={Phone} label="Phone" value={user.phone} />
          <DetailRow icon={Mail} label="Email" value={user.email} />
          <DetailRow icon={Clock} label="Shift" value={user.shift} />
          <DetailRow icon={Calendar} label="Joined" value={user.joinDate} />
          <DetailRow icon={Award} label="Rating" value={user.rating.toFixed(1)} />
        </View>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
          <MiniStat label="Attendance" value={user.attendancePct + "%"} color={colors.success} />
          <MiniStat label="Tasks" value={String(user.tasksClosed)} color={colors.brand} />
          <MiniStat label="Proof rate" value={user.proofRate + "%"} color={colors.sky600} />
        </View>
        <View style={{ backgroundColor: colors.slate50, borderRadius: borderRadius["4xl"], padding: spacing.xl }}>
          <Text style={{ fontSize: fontSize.sm, fontWeight: "400", color: colors.slate900, marginBottom: spacing.sm }}>Skills</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.xs }}>
            {(Array.isArray(user.skills) ? user.skills : []).map((s: string) => (
              <View key={s} style={{ backgroundColor: colors.white, borderRadius: borderRadius.full, paddingHorizontal: spacing.lg, paddingVertical: spacing.xs, borderWidth: 1, borderColor: colors.border }}>
                <Text style={{ fontSize: fontSize.xs, color: colors.textSecondary }}>{s}</Text>
              </View>
            ))}
          </View>
        </View>
        <View style={{ backgroundColor: colors.slate50, borderRadius: borderRadius["4xl"], padding: spacing.xl }}>
          <Text style={{ fontSize: fontSize.sm, fontWeight: "400", color: colors.slate900, marginBottom: spacing.sm }}>Documents</Text>
          {(Array.isArray(user.documents) ? user.documents : []).map((d: string) => (
            <View key={d} style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: spacing.xs }}>
              <CheckCircle size={12} color={colors.success} />
              <Text style={{ fontSize: fontSize.sm, color: colors.textSecondary }}>{d}</Text>
            </View>
          ))}
        </View>
        {currentUser.role === "rm" && (
          <View style={{ marginTop: spacing.md }}>
            <QuickButton label="Delete Employee Profile" onPress={() => { deleteUser(user.id); onClose(); }} variant="secondary" />
          </View>
        )}
      </>
    );
  }

  function renderApplianceContent() {
    if (!appliance) return null;
    const applianceBranch = getBranch(appliance.branchId);

    const filteredApplianceTasks = tasks.filter((t) => {
      if (t.applianceId !== appliance.id || t.status !== "Completed") return false;
      const completedStr = t.completedAt ? String(t.completedAt).slice(0, 10) : "";
      if (applianceFromDate && completedStr < applianceFromDate) return false;
      if (applianceToDate && completedStr > applianceToDate) return false;
      return true;
    });

    return (
      <>
        <View style={{ gap: spacing.md }}>
          <View style={{ gap: spacing.xs }}>
            <Text style={{ fontSize: fontSize.xs, color: colors.slate400, fontWeight: "600", textTransform: "uppercase" }}>Appliance Name</Text>
            <TextInput
              value={editName}
              onChangeText={setEditName}
              placeholder="Enter appliance name..."
              placeholderTextColor={colors.slate400}
              style={{
                fontSize: fontSize.lg,
                fontWeight: "600",
                color: colors.slate900,
                borderRadius: borderRadius.md,
                borderWidth: 1,
                borderColor: colors.border,
                paddingHorizontal: spacing.sm,
                paddingVertical: 8,
                backgroundColor: colors.white
              }}
            />
          </View>
        </View>

        <View style={{ gap: spacing.xs, marginVertical: spacing.xs }}>
          <Text style={{ fontSize: fontSize.xs, color: colors.slate400, fontWeight: "600", textTransform: "uppercase" }}>Status</Text>
          <View style={{ flexDirection: "row", gap: spacing.xs, flexWrap: "wrap" }}>
            {[
              { key: "Operational", label: "Operational", activeBg: "rgba(18,183,106,0.1)", activeText: "#12B76A", activeBorder: "rgba(18,183,106,0.2)" },
              { key: "AtRisk", label: "At Risk", activeBg: "rgba(245,158,11,0.1)", activeText: "#F59E0B", activeBorder: "rgba(245,158,11,0.2)" },
              { key: "Critical", label: "Critical", activeBg: "rgba(239,68,68,0.1)", activeText: "#EF4444", activeBorder: "rgba(239,68,68,0.2)" },
              { key: "Down", label: "Down", activeBg: "rgba(239,68,68,0.15)", activeText: "#E53E3E", activeBorder: "rgba(239,68,68,0.3)" }
            ].map((opt) => {
              const isSelected = editStatus === opt.key || (opt.key === "AtRisk" && editStatus === "At Risk");
              return (
                <TouchableOpacity
                  key={opt.key}
                  onPress={() => setEditStatus(opt.key)}
                  style={{
                    flex: 1,
                    minWidth: 80,
                    paddingVertical: 6,
                    borderRadius: borderRadius.md,
                    borderWidth: 1,
                    borderColor: isSelected ? opt.activeBorder : colors.slate200,
                    backgroundColor: isSelected ? opt.activeBg : colors.slate50,
                    alignItems: "center"
                  }}
                >
                  <Text style={{ fontSize: fontSize.xs, fontWeight: "600", color: isSelected ? opt.activeText : colors.slate500 }}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={{ gap: spacing.md }}>
          <DetailRow icon={Building} label="Branch" value={applianceBranch?.name || "Ã¢â‚¬â€"} />
          <EditableDetailRow icon={FileText} label="Category" value={editCategory} onChangeText={setEditCategory} placeholder="e.g. AC, UPS" />
          <EditableDetailRow icon={MapPin} label="Zone" value={editZone} onChangeText={setEditZone} placeholder="e.g. Server Room" />
          <EditableDetailRow icon={Activity} label="Health (%)" value={editHealthScore} onChangeText={setEditHealthScore} placeholder="0-100" keyboardType="numeric" />
          <EditableDetailRow icon={Wrench} label="Brand" value={editBrand} onChangeText={setEditBrand} placeholder="Brand" />
          <EditableDetailRow icon={FileText} label="Model" value={editModel} onChangeText={setEditModel} placeholder="Model" />
          <EditableDetailRow icon={Shield} label="Serial No" value={editSerial} onChangeText={setEditSerial} placeholder="Serial number" />

          <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
            <View style={{ width: 28, height: 28, borderRadius: borderRadius.md, backgroundColor: colors.slate50, alignItems: "center", justifyContent: "center" }}>
              <Calendar size={12} color={colors.slate500} strokeWidth={1.8} />
            </View>
            <Text style={{ fontSize: fontSize.sm, color: colors.slate500, width: 90 }}>Purchased</Text>
            <TouchableOpacity
              onPress={() => {
                setDatePickerTarget("purchaseDate");
                setDatePickerValue(editPurchaseDate);
                setIsDatePickerOpen(true);
              }}
              style={{
                flex: 1,
                borderRadius: borderRadius.md,
                borderWidth: 1,
                borderColor: colors.border,
                paddingHorizontal: spacing.sm,
                paddingVertical: 8,
                backgroundColor: colors.white,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between"
              }}
            >
              <Text style={{ fontSize: fontSize.xs, color: editPurchaseDate ? colors.slate900 : colors.slate400 }}>
                {editPurchaseDate || "Select Date"}
              </Text>
              <Calendar size={12} color={colors.slate400} />
            </TouchableOpacity>
          </View>

          <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
            <View style={{ width: 28, height: 28, borderRadius: borderRadius.md, backgroundColor: colors.slate50, alignItems: "center", justifyContent: "center" }}>
              <Clock size={12} color={colors.slate500} strokeWidth={1.8} />
            </View>
            <Text style={{ fontSize: fontSize.sm, color: colors.slate500, width: 90 }}>Last service</Text>
            <TouchableOpacity
              onPress={() => {
                setDatePickerTarget("lastService");
                setDatePickerValue(editLastService);
                setIsDatePickerOpen(true);
              }}
              style={{
                flex: 1,
                borderRadius: borderRadius.md,
                borderWidth: 1,
                borderColor: colors.border,
                paddingHorizontal: spacing.sm,
                paddingVertical: 8,
                backgroundColor: colors.white,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between"
              }}
            >
              <Text style={{ fontSize: fontSize.xs, color: editLastService ? colors.slate900 : colors.slate400 }}>
                {editLastService || "Select Date"}
              </Text>
              <Clock size={12} color={colors.slate400} />
            </TouchableOpacity>
          </View>

          <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
            <View style={{ width: 28, height: 28, borderRadius: borderRadius.md, backgroundColor: colors.slate50, alignItems: "center", justifyContent: "center" }}>
              <Activity size={12} color={colors.slate500} strokeWidth={1.8} />
            </View>
            <Text style={{ fontSize: fontSize.sm, color: colors.slate500, width: 90 }}>Next service</Text>
            <TouchableOpacity
              onPress={() => {
                setDatePickerTarget("nextService");
                setDatePickerValue(editNextService);
                setIsDatePickerOpen(true);
              }}
              style={{
                flex: 1,
                borderRadius: borderRadius.md,
                borderWidth: 1,
                borderColor: colors.border,
                paddingHorizontal: spacing.sm,
                paddingVertical: 8,
                backgroundColor: colors.white,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between"
              }}
            >
              <Text style={{ fontSize: fontSize.xs, color: editNextService ? colors.slate900 : colors.slate400 }}>
                {editNextService || "Select Date"}
              </Text>
              <Activity size={12} color={colors.slate400} />
            </TouchableOpacity>
          </View>

          <EditableDetailRow icon={Shield} label="Warranty" value={editWarranty} onChangeText={setEditWarranty} placeholder="Warranty terms" />
          <EditableDetailRow icon={User} label="AMC vendor" value={editAmcVendor} onChangeText={setEditAmcVendor} placeholder="AMC Vendor name" />
          <EditableDetailRow icon={DollarSign} label="Cost (Ã¢â€šÂ¹)" value={editPurchaseCost} onChangeText={setEditPurchaseCost} placeholder="Cost" keyboardType="numeric" />
        </View>

        <View style={{ marginTop: spacing.md }}>
          <QuickButton
            label={isSavingAppliance ? "Saving Details..." : "Save Appliance Details"}
            onPress={handleSaveAppliance}
            disabled={isSavingAppliance}
          />
        </View>
        {appliance.pendingParts !== "None" ? (
          <View style={{ backgroundColor: colors.amber50, borderRadius: borderRadius["2xl"], padding: spacing.lg }}>
            <Text style={{ fontSize: fontSize.sm, fontWeight: "400", color: colors.amber700 }}>Pending parts</Text>
            <Text style={{ fontSize: fontSize.sm, color: colors.amber700, marginTop: spacing.xs }}>{appliance.pendingParts}</Text>
          </View>
        ) : null}

        {/* Improvement 1: Date-to-Date Task Proof Gallery */}
        <View style={{ borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.lg, marginTop: spacing.lg }}>
          <Text style={{ fontSize: fontSize.md, fontWeight: "600", color: colors.slate900, marginBottom: spacing.sm }}>Verification Images & Remarks</Text>

          <View style={{ flexDirection: "row", gap: spacing.sm, marginBottom: spacing.md }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 10, color: colors.slate400, marginBottom: 2 }}>From Date</Text>
              <TouchableOpacity
                onPress={() => {
                  setDatePickerTarget("fromDate");
                  setDatePickerValue(applianceFromDate);
                  setIsDatePickerOpen(true);
                }}
                style={{
                  borderRadius: borderRadius.md,
                  borderWidth: 1,
                  borderColor: colors.border,
                  padding: spacing.sm,
                  backgroundColor: colors.white,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between"
                }}
              >
                <Text style={{ fontSize: fontSize.xs, color: applianceFromDate ? colors.slate900 : colors.slate400 }}>
                  {applianceFromDate || "Select Date"}
                </Text>
                <Calendar size={12} color={colors.slate400} />
              </TouchableOpacity>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 10, color: colors.slate400, marginBottom: 2 }}>To Date</Text>
              <TouchableOpacity
                onPress={() => {
                  setDatePickerTarget("toDate");
                  setDatePickerValue(applianceToDate);
                  setIsDatePickerOpen(true);
                }}
                style={{
                  borderRadius: borderRadius.md,
                  borderWidth: 1,
                  borderColor: colors.border,
                  padding: spacing.sm,
                  backgroundColor: colors.white,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between"
                }}
              >
                <Text style={{ fontSize: fontSize.xs, color: applianceToDate ? colors.slate900 : colors.slate400 }}>
                  {applianceToDate || "Select Date"}
                </Text>
                <Calendar size={12} color={colors.slate400} />
              </TouchableOpacity>
            </View>
          </View>

          {filteredApplianceTasks.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.md }}>
              {filteredApplianceTasks.map((t) => (
                <View key={t.id} style={{ width: 180, backgroundColor: colors.slate50, borderRadius: borderRadius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.md }}>
                  <ProofImageCard proofUrl={t.proofUrl ?? null} taskTitle={t.title} />
                  <Text style={{ fontSize: fontSize.xs, fontWeight: "600", color: colors.slate800 }} numberOfLines={1}>{t.title}</Text>
                  <Text style={{ fontSize: 10, color: colors.slate400, marginTop: 2 }}>{t.completedAt ? String(t.completedAt).slice(0, 10) : "Ã¢â‚¬â€"}</Text>
                  <Text style={{ fontSize: 10, color: colors.slate600, marginTop: 4, fontStyle: "italic" }} numberOfLines={2}>{t.notes || "No vendorRemarks"}</Text>
                </View>
              ))}
            </ScrollView>
          ) : (
            <Text style={{ fontSize: fontSize.xs, color: colors.slate500, fontStyle: "italic", textAlign: "center", paddingVertical: spacing.md }}>No completed verification proofs in this period.</Text>
          )}
        </View>

        {/* Safe Delete Ã¢â‚¬â€ 3-step verification */}
        <View style={{ marginTop: spacing.md }}>
          <TouchableOpacity
            onPress={() => setSafeDeleteOpen(true)}
            style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm, paddingVertical: spacing.md, borderRadius: 12, borderWidth: 1.5, borderColor: "#FECACA", backgroundColor: "#FFF1F2" }}
          >
            <Trash2 size={15} color="#EF4444" strokeWidth={2.2} />
            <Text style={{ fontSize: fontSize.sm, fontWeight: "700", color: "#EF4444" }}>Delete Appliance</Text>
          </TouchableOpacity>
        </View>

        <SafeDeleteModal
          visible={safeDeleteOpen}
          applianceName={appliance.name}
          userEmail={currentUser.email}
          onConfirm={async () => {
            await deleteAppliance(appliance.id);
            setSafeDeleteOpen(false);
            onClose();
          }}
          onCancel={() => setSafeDeleteOpen(false)}
        />
      </>
    );
  }

  function renderApprovalContent() {
    if (!approval) return null;
    const approvalBranch = getBranch(approval.branchId);
    const requester = getUser(approval.requestedBy);
    return (
      <>
        <View style={{ gap: spacing.md }}>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, alignItems: "center" }}>
            <Badge label={approval.status} type={approval.status as any} />
            <Badge label={approval.priority} type={approval.priority as any} />
            <Badge label={approval.kind} />
          </View>
          <Text style={{ fontSize: fontSize["2xl"], fontWeight: "400", color: colors.slate900 }}>{approval.title}</Text>
        </View>
        <View style={{ gap: spacing.md }}>
          <DetailRow icon={Building} label="Branch" value={approvalBranch?.name || "Ã¢â‚¬â€"} />
          <DetailRow icon={User} label="Requester" value={requester?.name || "Ã¢â‚¬â€"} />
          <DetailRow icon={DollarSign} label="Amount" value={formatMoney(approval.amount)} />
          <DetailRow icon={Shield} label="Stage" value={approval.stage} />
          <DetailRow icon={Clock} label="Age" value={approval.age} />
        </View>
        {approval.note ? (
          <View style={{ backgroundColor: colors.slate50, borderRadius: borderRadius["2xl"], padding: spacing.lg }}>
            <Text style={{ fontSize: fontSize.sm, fontWeight: "400", color: colors.slate900 }}>Note</Text>
            <Text style={{ fontSize: fontSize.sm, color: colors.slate500, marginTop: spacing.xs }}>{approval.note}</Text>
          </View>
        ) : null}
        {approval.status === "Pending" ? (
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
            <QuickButton label="Approve" onPress={() => approveRequest(approval.id)} />
            <QuickButton label="Reject" onPress={() => rejectRequest(approval.id)} />
          </View>
        ) : null}
      </>
    );
  }

  function renderVisitContent() {
    if (!visit) return null;
    const visitBranch = getBranch(visit.branchId);
    const manager = getUser(visit.managerId);
    return (
      <>
        <View style={{ gap: spacing.md }}>
          <Badge label={visit.status} type={visit.status as any} />
          <Text style={{ fontSize: fontSize["2xl"], fontWeight: "400", color: colors.slate900 }}>{visit.purpose}</Text>
        </View>
        <View style={{ gap: spacing.md }}>
          <DetailRow icon={Building} label="Branch" value={visitBranch?.name || "Ã¢â‚¬â€"} />
          <DetailRow icon={User} label="Manager" value={manager?.name || "Ã¢â‚¬â€"} />
          <DetailRow icon={Calendar} label="Scheduled" value={visit.scheduledAt} />
          <DetailRow icon={FileText} label="Agenda" value={visit.agenda} />
        </View>
        {visit.report !== "Pending" ? (
          <View style={{ backgroundColor: colors.emerald50, borderRadius: borderRadius["2xl"], padding: spacing.lg }}>
            <Text style={{ fontSize: fontSize.sm, fontWeight: "400", color: colors.emerald700 }}>Report</Text>
            <Text style={{ fontSize: fontSize.sm, color: colors.emerald700, marginTop: spacing.xs }}>{visit.report}</Text>
          </View>
        ) : (currentUser.role === "rm" || currentUser.role === "branchManager") ? (
          <View style={{ marginTop: spacing.md }}>
            <QuickButton label="File Visit Report" onPress={async () => { await submitVisitReport(visit.id); onClose(); }} />
          </View>
        ) : null}
      </>
    );
  }

  if (type === "branch" && branch) {
    return (
      <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
        <BranchDeepDiveScreen branch={branch} onBack={onClose} />
      </Modal>
    );
  }

  return (
    <>
      <ModalSheet visible={visible} onClose={onClose} title="Details">
      <ScrollView style={{ maxHeight: 600 }} contentContainerStyle={{ gap: spacing.xl, paddingBottom: spacing.xl }}>
        {type === "task" && renderTaskContent()}
        {type === "complaint" && renderComplaintContent()}
        {type === "user" && renderUserContent()}
        {type === "appliance" && renderApplianceContent()}
        {type === "approval" && renderApprovalContent()}
        {type === "visit" && renderVisitContent()}
        {!task && !complaint && !branch && !user && !appliance && !approval && !visit ? (
          <View style={{ alignItems: "center", padding: spacing["3xl"] }}>
            <AlertTriangle size={24} color={colors.slate400} />
            <Text style={{ fontSize: fontSize.sm, color: colors.slate500, marginTop: spacing.md }}>Entity not found</Text>
          </View>
        ) : null}
      </ScrollView>
      <DatePickerModal
        visible={isDatePickerOpen}
        onClose={() => setIsDatePickerOpen(false)}
        value={datePickerValue}
        onSelect={handleSelectDatePicker}
        title={
          datePickerTarget === "purchaseDate" ? "Select Purchase Date" :
            datePickerTarget === "lastService" ? "Select Last Service Date" :
              datePickerTarget === "nextService" ? "Select Next Service Date" :
                datePickerTarget === "fromDate" ? "Select From Date" : "Select To Date"
        }
      />
    </ModalSheet>
      {previewImageUri ? (
        <Modal visible={!!previewImageUri} transparent animationType="fade" onRequestClose={() => setPreviewImageUri(null)}>
          <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.9)", justifyContent: "center", alignItems: "center" }}>
            <TouchableOpacity onPress={() => setPreviewImageUri(null)} style={{ position: "absolute", top: 40, right: 20, zIndex: 10, padding: 10 }}>
              <X color={colors.white} size={28} />
            </TouchableOpacity>
            <Image source={{ uri: previewImageUri }} style={{ width: "95%", height: "80%", borderRadius: 12 }} resizeMode="contain" />
          </View>
        </Modal>
      ) : null}
    </>
  );
}

function DetailRow({ icon: Icon, label, value }: { icon: React.ComponentType<any>; label: string; value: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
      <View style={{ width: 28, height: 28, borderRadius: borderRadius.md, backgroundColor: colors.slate50, alignItems: "center", justifyContent: "center" }}>
        <Icon size={12} color={colors.slate500} strokeWidth={1.8} />
      </View>
      <View style={{ flex: 1, flexDirection: "row", justifyContent: "space-between" }}>
        <Text style={{ fontSize: fontSize.sm, color: colors.slate500 }}>{label}</Text>
        <Text style={{ fontSize: fontSize.sm, fontWeight: "400", color: colors.slate900 }}>{value}</Text>
      </View>
    </View>
  );
}

function MiniStat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={{ flex: 1, minWidth: 70, backgroundColor: colors.slate50, borderRadius: borderRadius["2xl"], padding: spacing.lg, alignItems: "center" }}>
      <Text style={{ fontSize: fontSize.xs, color: colors.slate500 }}>{label}</Text>
      <Text style={{ fontSize: fontSize.lg, fontWeight: "400", color, marginTop: spacing.xs }}>{value}</Text>
    </View>
  );
}

function EditableDetailRow({
  icon: Icon,
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType
}: {
  icon: React.ComponentType<any>;
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  keyboardType?: "default" | "numeric" | "email-address" | "phone-pad";
}) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
      <View style={{ width: 28, height: 28, borderRadius: borderRadius.md, backgroundColor: colors.slate50, alignItems: "center", justifyContent: "center" }}>
        <Icon size={12} color={colors.slate500} strokeWidth={1.8} />
      </View>
      <Text style={{ fontSize: fontSize.sm, color: colors.slate500, width: 90 }}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.slate400}
        keyboardType={keyboardType}
        style={{
          flex: 1,
          borderRadius: borderRadius.md,
          borderWidth: 1,
          borderColor: colors.border,
          paddingHorizontal: spacing.sm,
          paddingVertical: 6,
          fontSize: fontSize.xs,
          color: colors.slate900,
          backgroundColor: colors.white
        }}
      />
    </View>
  );
}

function getDaysInMonth(date: Date) {
  const year = date.getFullYear();
  const month = date.getMonth();

  const firstDay = new Date(year, month, 1);
  const startDayOfWeek = firstDay.getDay();

  const totalDays = new Date(year, month + 1, 0).getDate();
  const prevMonthTotalDays = new Date(year, month, 0).getDate();

  const days = [];

  for (let i = startDayOfWeek - 1; i >= 0; i--) {
    days.push({
      day: prevMonthTotalDays - i,
      month: month === 0 ? 11 : month - 1,
      year: month === 0 ? year - 1 : year,
      isCurrentMonth: false
    });
  }

  for (let i = 1; i <= totalDays; i++) {
    days.push({
      day: i,
      month: month,
      year: year,
      isCurrentMonth: true
    });
  }

  const remainingCells = 42 - days.length;
  for (let i = 1; i <= remainingCells; i++) {
    days.push({
      day: i,
      month: (month + 1) % 12,
      year: month === 11 ? year + 1 : year,
      isCurrentMonth: false
    });
  }

  return days;
}

interface DatePickerModalProps {
  visible: boolean;
  onClose: () => void;
  value: string;
  onSelect: (date: string) => void;
  title: string;
}

function DatePickerModal({ visible, onClose, value, onSelect, title }: DatePickerModalProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  useEffect(() => {
    if (visible && value) {
      const parsed = new Date(value);
      if (!isNaN(parsed.getTime())) {
        setCurrentMonth(parsed);
      }
    } else {
      setCurrentMonth(new Date());
    }
  }, [visible, value]);

  const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const daysOfWeek = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
  const days = getDaysInMonth(currentMonth);

  const handlePrevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const handleSelectDay = (item: { day: number; month: number; year: number }) => {
    const mm = String(item.month + 1).padStart(2, "0");
    const dd = String(item.day).padStart(2, "0");
    const dateStr = `${item.year}-${mm}-${dd}`;
    onSelect(dateStr);
    onClose();
  };

  const handleClear = () => {
    onSelect("");
    onClose();
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center", padding: spacing.xl }}>
        <View style={{ width: "100%", maxWidth: 320, backgroundColor: colors.white, borderRadius: borderRadius["2xl"], padding: spacing.lg, gap: spacing.md }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderBottomWidth: 1, borderBottomColor: colors.border, paddingBottom: spacing.sm }}>
            <Text style={{ fontSize: fontSize.md, fontWeight: "600", color: colors.slate900 }}>{title}</Text>
            <TouchableOpacity onPress={onClose} style={{ padding: 4 }}>
              <X size={18} color={colors.slate500} />
            </TouchableOpacity>
          </View>

          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <TouchableOpacity onPress={handlePrevMonth} style={{ padding: spacing.xs }}>
              <Text style={{ fontSize: fontSize.lg, fontWeight: "600", color: colors.brand }}>{"<"}</Text>
            </TouchableOpacity>
            <Text style={{ fontSize: fontSize.sm, fontWeight: "600", color: colors.slate800 }}>
              {months[currentMonth.getMonth()]} {currentMonth.getFullYear()}
            </Text>
            <TouchableOpacity onPress={handleNextMonth} style={{ padding: spacing.xs }}>
              <Text style={{ fontSize: fontSize.lg, fontWeight: "600", color: colors.brand }}>{">"}</Text>
            </TouchableOpacity>
          </View>

          <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
            {daysOfWeek.map((day) => (
              <View key={day} style={{ width: "14.28%", alignItems: "center", paddingVertical: 4 }}>
                <Text style={{ fontSize: 10, fontWeight: "500", color: colors.slate400 }}>{day}</Text>
              </View>
            ))}
            {days.map((item, idx) => {
              const mm = String(item.month + 1).padStart(2, "0");
              const dd = String(item.day).padStart(2, "0");
              const cellDateStr = `${item.year}-${mm}-${dd}`;
              const isSelected = value === cellDateStr;

              return (
                <TouchableOpacity
                  key={idx}
                  disabled={!item.isCurrentMonth}
                  onPress={() => handleSelectDay(item)}
                  style={{
                    width: "14.28%",
                    aspectRatio: 1,
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: 999,
                    backgroundColor: isSelected ? colors.brand : "transparent",
                    opacity: item.isCurrentMonth ? 1 : 0.2
                  }}
                >
                  <Text style={{ fontSize: fontSize.xs, color: isSelected ? colors.white : colors.slate800, fontWeight: isSelected ? "600" : "400" }}>
                    {item.day}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={{ flexDirection: "row", gap: spacing.sm, marginTop: spacing.xs }}>
            <TouchableOpacity onPress={handleClear} style={{ flex: 1, paddingVertical: 8, borderRadius: borderRadius.md, borderWidth: 1, borderColor: colors.border, alignItems: "center" }}>
              <Text style={{ fontSize: fontSize.xs, color: colors.slate500, fontWeight: "600" }}>Clear</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={onClose} style={{ flex: 1, paddingVertical: 8, borderRadius: borderRadius.md, backgroundColor: colors.slate100, alignItems: "center" }}>
              <Text style={{ fontSize: fontSize.xs, color: colors.slate700, fontWeight: "600" }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}




