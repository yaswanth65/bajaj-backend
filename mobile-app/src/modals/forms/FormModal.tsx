import React, { useEffect, useState } from "react";
import { View, Text, TextInput, TouchableOpacity, ScrollView, Image } from "react-native";
import { Send, Plus, Wrench, DollarSign, Calendar, Zap, AlertCircle, Camera, Image as LucideImage } from "lucide-react-native";
import * as ImagePicker from "expo-image-picker";
import { useApp } from "../../context/AppContext";
import { colors, fontSize, spacing, borderRadius, bodyFont, fontWeight } from "../../theme/theme";
import { RoleId } from "../../types/domain";
import { validate, complaintSchema, taskSchema, applianceSchema, expenseSchema, visitSchema, userSchema } from "../../utils/validation";
import { ModalSheet } from "../../shared/components/ModalSheet";
import { DatePickerDropdown } from "../../shared/components/DatePickerDropdown";

interface Props {
  visible: boolean;
  onClose: () => void;
}

export function FormModal({ visible, onClose }: Props) {
  const { state, createComplaint, createTask, createAppliance, createExpense, createVisit, createUser, branches, currentUser, showToast } = useApp();
  const [formType, setFormType] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (visible) {
      setFormType(null);
      setErrors({});
    }
  }, [visible]);

  const [title, setTitle] = useState("");
  const [type, setType] = useState("Appliance");
  const [priority, setPriority] = useState("High");
  const [desc, setDesc] = useState("");

  const [taskTitle, setTaskTitle] = useState("");
  const [taskAudience, setTaskAudience] = useState("lc");
  const [taskBranch, setTaskBranch] = useState<string>(String(branches[0]?.id || ""));
  const [taskSchedule, setTaskSchedule] = useState("Weekly");
  const [taskZone, setTaskZone] = useState("");
  const [taskDeadline, setTaskDeadline] = useState("");
  const [taskPriority, setTaskPriority] = useState("High");
  const [taskProofRule, setTaskProofRule] = useState("true");
  const [taskNotes, setTaskNotes] = useState("");

  const [applianceName, setApplianceName] = useState("");
  const [applianceCategory, setApplianceCategory] = useState("");
  const [applianceZone, setApplianceZone] = useState("");
  const [applianceBrand, setApplianceBrand] = useState("");
  const [applianceModel, setApplianceModel] = useState("");
  const [applianceSerial, setApplianceSerial] = useState("");
  const [appliancePurchaseCost, setAppliancePurchaseCost] = useState("");
  const [applianceAmcVendor, setApplianceAmcVendor] = useState("");
  const [appliancePurchaseDate, setAppliancePurchaseDate] = useState("");
  const [applianceLastService, setApplianceLastService] = useState("");
  const [applianceNextService, setApplianceNextService] = useState("");
  const [applianceWarranty, setApplianceWarranty] = useState("");
  const [appliancePendingParts, setAppliancePendingParts] = useState("");
  const [applianceImageUri, setApplianceImageUri] = useState("");

  const [expenseTitle, setExpenseTitle] = useState("");
  const [expenseAmount, setExpenseAmount] = useState("");
  const [expenseVendor, setExpenseVendor] = useState("");
  const [expenseDesc, setExpenseDesc] = useState("");

  const [visitBranch, setVisitBranch] = useState<string>(String(branches[0]?.id || ""));
  const [visitDate, setVisitDate] = useState("");
  const [visitPurpose, setVisitPurpose] = useState("");
  const [visitAgenda, setVisitAgenda] = useState("");

  const [userName, setUserName] = useState("");
  const [userRole, setUserRole] = useState<RoleId>("lc");
  const [userBranch, setUserBranch] = useState<string>(String(branches[0]?.id || ""));

  const resetForms = () => {
    setTaskTitle(""); setTaskAudience("lc"); setTaskBranch(String(branches[0]?.id || "")); setTaskSchedule("Weekly"); setTaskZone(""); setTaskDeadline(""); setTaskPriority("High"); setTaskProofRule("true"); setTaskNotes("");
    setApplianceName(""); setApplianceCategory(""); setApplianceZone(""); setApplianceBrand(""); setApplianceModel("");
    setApplianceSerial(""); setAppliancePurchaseCost(""); setApplianceAmcVendor(""); setAppliancePurchaseDate("");
    setApplianceLastService(""); setApplianceNextService(""); setApplianceWarranty(""); setAppliancePendingParts("");
    setApplianceImageUri("");
    setExpenseTitle(""); setExpenseAmount(""); setExpenseVendor(""); setExpenseDesc("");
    setVisitBranch(String(branches[0]?.id || "")); setVisitDate(""); setVisitPurpose(""); setVisitAgenda("");
    setUserName(""); setUserRole("lc"); setUserBranch(String(branches[0]?.id || ""));
    setErrors({});
  };

  const openForm = (type: string) => {
    resetForms();
    setFormType(type);
  };

  const handleClose = () => {
    setFormType(null);
    setErrors({});
    onClose();
  };

  const showError = (field: string) => {
    if (!errors[field]) return null;
    return (
      <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.xs, marginTop: spacing.xs }}>
        <AlertCircle size={12} color={colors.error} strokeWidth={2} />
        <Text style={{ fontSize: fontSize.xs, color: colors.error }}>{errors[field]}</Text>
      </View>
    );
  };

  const selectOptions = (label: string, options: string[], value: string, onValue: (v: string) => void, errorKey?: string) => (
    <View>
      <Text style={{ fontSize: fontSize.xs, fontFamily: bodyFont, fontWeight: fontWeight.semibold, color: colors.slate400, textTransform: "uppercase", letterSpacing: 1.2, marginBottom: spacing.xs }}>{label}</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
        {options.map((opt) => (
          <TouchableOpacity
            key={opt}
            onPress={() => { onValue(opt); if (errorKey) setErrors((prev) => { const next = { ...prev }; delete next[errorKey]; return next; }); }}
            style={{
              paddingHorizontal: spacing.lg, paddingVertical: spacing.sm,
              borderRadius: borderRadius.full, backgroundColor: value === opt ? colors.brand : colors.slate50,
              borderWidth: errorKey && errors[errorKey] && value !== opt ? 1 : 0,
              borderColor: colors.error,
            }}
          >
            <Text style={{ fontSize: fontSize.sm, fontWeight: "400", color: value === opt ? colors.white : colors.textSecondary }}>{opt}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {errorKey && showError(errorKey)}
    </View>
  );

  const input = (placeholder: string, val: string, set: (v: string) => void, extra?: any, errorKey?: string) => (
    <View>
      <TextInput
        value={val}
        onChangeText={(v) => { set(v); if (errorKey) setErrors((prev) => { const next = { ...prev }; delete next[errorKey]; return next; }); }}
        placeholder={placeholder}
        placeholderTextColor={colors.slate400}
        style={{ backgroundColor: colors.slate50, borderRadius: borderRadius.md, paddingHorizontal: 14, paddingVertical: 12, fontFamily: bodyFont, fontSize: fontSize.sm, color: colors.text, borderWidth: errorKey && errors[errorKey] ? 1 : 0, borderColor: colors.error, ...extra }}
      />
      {errorKey && showError(errorKey)}
    </View>
  );

  const textarea = (placeholder: string, val: string, set: (v: string) => void, errorKey?: string) => (
    <View>
      <TextInput
        value={val}
        onChangeText={(v) => { set(v); if (errorKey) setErrors((prev) => { const next = { ...prev }; delete next[errorKey]; return next; }); }}
        placeholder={placeholder}
        placeholderTextColor={colors.slate400}
        multiline
        numberOfLines={4}
        style={{ backgroundColor: colors.slate50, borderRadius: borderRadius.md, paddingHorizontal: 14, paddingVertical: 12, fontFamily: bodyFont, fontSize: fontSize.sm, minHeight: 90, color: colors.text, textAlignVertical: "top", borderWidth: errorKey && errors[errorKey] ? 1 : 0, borderColor: colors.error }}
      />
      {errorKey && showError(errorKey)}
    </View>
  );

  const submitBtn = (label: string, onPress: () => void | Promise<void>) => (
    <TouchableOpacity onPress={onPress} style={{ backgroundColor: colors.slate900, borderRadius: borderRadius.md, height: 48, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: spacing.sm }}>
      <Send size={14} color={colors.white} strokeWidth={2} />
      <Text style={{ fontSize: fontSize.sm, fontFamily: bodyFont, fontWeight: fontWeight.semibold, color: colors.white }}>{label}</Text>
    </TouchableOpacity>
  );

  const roleLabel = (role: string) => {
    switch (role) {
      case "lc": return "LC (Worker)";
      case "branchManager": return "Branch Manager";
      case "rm": return "RM (Admin)";
      default: return role;
    }
  };

  const forms: Record<string, { title: string; subtitle: string; render: () => React.ReactNode }> = {
    quick: {
      title: "Quick actions",
      subtitle: "Jump into the most common operational workflows",
      render: () => (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.md }}>
          {[
            { label: "Raise Complaint Form", icon: Zap, color: colors.brand, bg: colors.card, border: true, action: () => openForm("complaint") },
            { label: "Add appliance", icon: Wrench, color: colors.success, bg: colors.card, border: true, action: () => openForm("appliance") },
          ].map((item, i) => (
            <TouchableOpacity key={i} onPress={item.action} style={{ width: "47%", backgroundColor: item.bg, borderRadius: borderRadius.xl, padding: spacing.xl, borderWidth: item.border ? 1 : 0, borderColor: colors.border }}>
              <item.icon size={20} color={item.color} strokeWidth={2} />
              <Text style={{ fontSize: fontSize.sm, fontWeight: "400", color: item.border ? colors.text : colors.white, marginTop: spacing.md }}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      ),
    },
    complaint: {
      title: "Raise complaint",
      subtitle: "Report an issue with branch infrastructure or assets.",
      render: () => {
        const handleSubmit = async () => {
          const result = validate(complaintSchema, { priority, description: desc });
          if (!result.success) { setErrors(result.errors); return; }
          createComplaint({ priority: priority as any, description: desc });
          handleClose();
        };
        return (
          <View style={{ gap: spacing.lg }}>
            {selectOptions("Priority", ["Low", "Medium", "High", "Critical"], priority, setPriority, "priority")}
            {textarea("Describe issue - location, visible damage, and urgency", desc, setDesc, "description")}
            {submitBtn("Submit complaint", handleSubmit)}
          </View>
        );
      },
    },
    task: {
      title: "Check form",
      subtitle: "Create and assign weekly checks to any role with proof requirements.",
      render: () => {
        const handleSubmit = async () => {
          const result = validate(taskSchema, { title: taskTitle, audience: taskAudience, schedule: taskSchedule, zone: taskZone, deadline: taskDeadline, priority: taskPriority, notes: taskNotes });
          if (!result.success) { setErrors(result.errors); return; }
          createTask({ title: taskTitle, audience: taskAudience as RoleId, schedule: "Weekly", zone: taskZone, deadline: taskDeadline, priority: taskPriority as any, proofRequired: taskProofRule === "true", notes: taskNotes, branchId: taskBranch });
          handleClose();
        };

        const audienceOptions = state.role === "rm"
          ? ["lc", "branchManager", "rm"]
          : state.role === "branchManager"
            ? ["lc", "branchManager"]
            : ["lc"];

        return (
          <View style={{ gap: spacing.lg }}>
            {input("Task title", taskTitle, setTaskTitle, undefined, "title")}
            {selectOptions("Audience", audienceOptions.map(roleLabel), roleLabel(taskAudience), (v) => {
              const role = v === "LC (Worker)" ? "lc" : v === "Branch Manager" ? "branchManager" : "rm";
              setTaskAudience(role);
            }, "audience")}
            <View>
              <Text style={{ fontSize: fontSize.xs, fontWeight: "400", color: colors.textSecondary, marginBottom: spacing.xs }}>Assign to branch</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
                {branches.map((b) => (
                  <TouchableOpacity key={b.id} onPress={() => setTaskBranch(String(b.id))} style={{ paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: borderRadius.full, backgroundColor: taskBranch === String(b.id) ? colors.brand : colors.slate50 }}>
                    <Text style={{ fontSize: fontSize.sm, fontWeight: "400", color: taskBranch === String(b.id) ? colors.white : colors.textSecondary }}>{b.name.split(" ")[0]}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            {selectOptions("Schedule", ["Weekly"], taskSchedule, setTaskSchedule)}
            <View style={{ flexDirection: "row", gap: spacing.lg }}>
              <View style={{ flex: 1 }}>{input("Zone / area", taskZone, setTaskZone)}</View>
              <View style={{ flex: 1 }}>{input("Deadline", taskDeadline, setTaskDeadline)}</View>
            </View>
            {selectOptions("Priority", ["Low", "Medium", "High", "Critical"], taskPriority, setTaskPriority, "priority")}
            {selectOptions("Proof rule", ["Photo proof mandatory", "Completion note only"], taskProofRule, setTaskProofRule)}
            {textarea("Checklist note, escalation rule, instructions, materials required", taskNotes, setTaskNotes)}
            {submitBtn("Create check", handleSubmit)}
          </View>
        );
      },
    },
    appliance: {
      title: "Add appliance",
      subtitle: "Capture category, zone, serial, brand, and service details.",
      render: () => {
        const handleSubmit = async () => {
          const costVal = appliancePurchaseCost.trim() ? Number(appliancePurchaseCost) : undefined;
          const result = validate(applianceSchema, {
            name: applianceName,
            category: applianceCategory,
            zone: applianceZone,
            brand: applianceBrand,
            model: applianceModel,
            serial: applianceSerial,
            purchaseCost: costVal
          });
          if (!result.success) { setErrors(result.errors); return; }
          const created = await createAppliance({
            name: applianceName,
            category: applianceCategory,
            zone: applianceZone,
            brand: applianceBrand,
            model: applianceModel,
            serial: applianceSerial,
            purchaseCost: costVal,
            amcVendor: applianceAmcVendor,
            purchaseDate: appliancePurchaseDate,
            lastService: applianceLastService,
            nextService: applianceNextService,
            warranty: applianceWarranty,
            pendingParts: appliancePendingParts,
            imageUrl: applianceImageUri || undefined,
          });
          if (created) handleClose();
        };

        const renderDatePickerField = (label: string, val: string, setVal: (v: string) => void) => (
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: fontSize.xs, fontFamily: bodyFont, fontWeight: fontWeight.semibold, color: colors.slate400, textTransform: "uppercase", letterSpacing: 1.2, marginBottom: spacing.xs }}>{label}</Text>
            <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: colors.slate50, borderRadius: borderRadius.md, paddingHorizontal: 12, height: 44 }}>
              <DatePickerDropdown value={val} onChange={setVal} placeholder="Select Date" />
            </View>
          </View>
        );

        return (
          <View style={{ gap: spacing.lg, paddingBottom: 20 }}>
            {input("Appliance name *", applianceName, setApplianceName, undefined, "name")}

            <View style={{ flexDirection: "row", gap: spacing.lg }}>
              <View style={{ flex: 1 }}>{input("Category *", applianceCategory, setApplianceCategory, undefined, "category")}</View>
              <View style={{ flex: 1 }}>{input("Zone / Area *", applianceZone, setApplianceZone, undefined, "zone")}</View>
            </View>

            <View style={{ flexDirection: "row", gap: spacing.lg }}>
              <View style={{ flex: 1 }}>{input("Brand *", applianceBrand, setApplianceBrand, undefined, "brand")}</View>
              <View style={{ flex: 1 }}>{input("Model", applianceModel, setApplianceModel)}</View>
            </View>

            <View style={{ flexDirection: "row", gap: spacing.lg }}>
              <View style={{ flex: 1 }}>{input("Serial Number *", applianceSerial, setApplianceSerial, undefined, "serial")}</View>
              <View style={{ flex: 1 }}>{input("Warranty Period", applianceWarranty, setApplianceWarranty)}</View>
            </View>

            <View style={{ flexDirection: "row", gap: spacing.lg }}>
              {renderDatePickerField("Purchase Date", appliancePurchaseDate, setAppliancePurchaseDate)}
              {renderDatePickerField("Last Service", applianceLastService, setApplianceLastService)}
            </View>

            <View style={{ flexDirection: "row", gap: spacing.lg }}>
              {renderDatePickerField("Next Service", applianceNextService, setApplianceNextService)}
              <View style={{ flex: 1 }}>{input("Purchase Cost (Rs)", appliancePurchaseCost, setAppliancePurchaseCost, { keyboardType: "numeric" }, "purchaseCost")}</View>
            </View>

            {input("AMC Vendor Name", applianceAmcVendor, setApplianceAmcVendor)}
            {input("Pending Parts Needed", appliancePendingParts, setAppliancePendingParts)}

            {/* Appliance Photo Upload */}
            <View>
              <Text style={{ fontSize: fontSize.xs, fontFamily: bodyFont, fontWeight: fontWeight.semibold, color: colors.slate400, textTransform: "uppercase", letterSpacing: 1.2, marginBottom: spacing.sm }}>Appliance Photo</Text>
              {applianceImageUri ? (
                <View style={{ gap: spacing.sm }}>
                  <Image source={{ uri: applianceImageUri }} style={{ width: "100%", height: 180, borderRadius: borderRadius.lg }} resizeMode="cover" />
                  <TouchableOpacity onPress={() => setApplianceImageUri("")} style={{ alignSelf: "flex-start", paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, backgroundColor: colors.rose50, borderRadius: borderRadius.full }}>
                    <Text style={{ fontSize: fontSize.xs, color: colors.rose700 }}>Remove photo</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={{ flexDirection: "row", gap: spacing.md }}>
                  <TouchableOpacity
                    onPress={async () => {
                      const perm = await ImagePicker.requestCameraPermissionsAsync();
                      if (!perm.granted) { showToast("Camera permission is required"); return; }
                      const result = await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], allowsEditing: true, quality: 0.8 });
                      if (!result.canceled && result.assets?.length) setApplianceImageUri(result.assets[0].uri);
                    }}
                    style={{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm, paddingVertical: spacing.lg, backgroundColor: colors.brand + "10", borderRadius: borderRadius.lg, borderWidth: 1, borderColor: colors.brand + "30", borderStyle: "dashed" }}
                  >
                    <Camera size={18} color={colors.brand} strokeWidth={2} />
                    <Text style={{ fontSize: fontSize.sm, color: colors.brand, fontWeight: "500" }}>Take Photo</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={async () => {
                      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
                      if (!perm.granted) { showToast("Gallery permission is required"); return; }
                      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsEditing: true, quality: 0.8 });
                      if (!result.canceled && result.assets?.length) setApplianceImageUri(result.assets[0].uri);
                    }}
                    style={{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm, paddingVertical: spacing.lg, backgroundColor: colors.slate50, borderRadius: borderRadius.lg, borderWidth: 1, borderColor: colors.border, borderStyle: "dashed" }}
                  >
                    <LucideImage size={18} color={colors.slate600} strokeWidth={2} />
                    <Text style={{ fontSize: fontSize.sm, color: colors.slate600, fontWeight: "500" }}>Gallery</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {submitBtn("Add appliance", handleSubmit)}
          </View>
        );
      },
    },
    expense: {
      title: "Create work order",
      subtitle: "Create work order with vendor and urgency details.",
      render: () => {
        const handleSubmit = async () => {
          const result = validate(expenseSchema, { title: expenseTitle, amount: Number(expenseAmount) || 0, vendor: expenseVendor, description: expenseDesc });
          if (!result.success) { setErrors(result.errors); return; }
          createExpense(expenseTitle, Number(expenseAmount) || 0, expenseVendor, expenseDesc);
          handleClose();
        };
        return (
          <View style={{ gap: spacing.lg }}>
            {input("Work order title", expenseTitle, setExpenseTitle, undefined, "title")}
            <View style={{ flexDirection: "row", gap: spacing.lg }}>
              <View style={{ flex: 1 }}>{input("Amount", expenseAmount, setExpenseAmount, { keyboardType: "numeric" }, "amount")}</View>
              <View style={{ flex: 1 }}>{input("Vendor", expenseVendor, setExpenseVendor)}</View>
            </View>
            {textarea("Scope, urgency, risk if delayed", expenseDesc, setExpenseDesc)}
            {submitBtn("Create work order", handleSubmit)}
          </View>
        );
      },
    },
    visit: {
      title: "Schedule visit",
      subtitle: "Create visit with branch, agenda and expected outcome.",
      render: () => {
        const handleSubmit = async () => {
          const result = validate(visitSchema, { branchId: visitBranch, date: visitDate, purpose: visitPurpose, agenda: visitAgenda });
          if (!result.success) { setErrors(result.errors); return; }
          createVisit(visitBranch, visitDate, visitPurpose, visitAgenda);
          handleClose();
        };
        return (
          <View style={{ gap: spacing.lg }}>
            <View>
              <Text style={{ fontSize: fontSize.xs, fontWeight: "400", color: colors.textSecondary, marginBottom: spacing.xs }}>Branch</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
                {branches.map((b) => (
                  <TouchableOpacity
                    key={b.id}
                    onPress={() => setVisitBranch(String(b.id))}
                    style={{ paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: borderRadius.full, backgroundColor: visitBranch === String(b.id) ? colors.brand : colors.slate50 }}
                  >
                    <Text style={{ fontSize: fontSize.sm, fontWeight: "400", color: visitBranch === String(b.id) ? colors.white : colors.textSecondary }}>{b.name.split(" ")[0]}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              {showError("branchId")}
            </View>
            {input("Date & time", visitDate, setVisitDate, undefined, "date")}
            {input("Purpose", visitPurpose, setVisitPurpose, undefined, "purpose")}
            {textarea("Agenda and outcome expected", visitAgenda, setVisitAgenda)}
            {submitBtn("Schedule visit", handleSubmit)}
          </View>
        );
      },
    },
    user: {
      title: "Create user",
      subtitle: "Add a new user to the regional directory.",
      render: () => {
        const handleSubmit = async () => {
          const result = validate(userSchema, { name: userName, role: userRole });
          if (!result.success) { setErrors(result.errors); return; }
          createUser(userName, userRole, userBranch);
          handleClose();
        };
        return (
          <View style={{ gap: spacing.lg }}>
            {input("Full name", userName, setUserName, undefined, "name")}
            <View>
              <Text style={{ fontSize: fontSize.xs, fontWeight: "400", color: colors.textSecondary, marginBottom: spacing.xs }}>Role</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
                {(["lc", "branchManager"] as RoleId[]).map((r) => (
                  <TouchableOpacity
                    key={r}
                    onPress={() => { setUserRole(r); setErrors((prev) => { const next = { ...prev }; delete next.role; return next; }); }}
                    style={{ paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: borderRadius.full, backgroundColor: userRole === r ? colors.brand : colors.slate50 }}
                  >
                    <Text style={{ fontSize: fontSize.sm, fontWeight: "400", color: userRole === r ? colors.white : colors.textSecondary }}>{roleLabel(r)}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              {showError("role")}
            </View>
            <View>
              <Text style={{ fontSize: fontSize.xs, fontWeight: "400", color: colors.textSecondary, marginBottom: spacing.xs }}>Branch</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
                {branches.map((b) => (
                  <TouchableOpacity key={b.id} onPress={() => setUserBranch(String(b.id))} style={{ paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: borderRadius.full, backgroundColor: userBranch === String(b.id) ? colors.brand : colors.slate50 }}>
                    <Text style={{ fontSize: fontSize.sm, fontWeight: "400", color: userBranch === String(b.id) ? colors.white : colors.textSecondary }}>{b.name.split(" ")[0]}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            {submitBtn("Create user", handleSubmit)}
          </View>
        );
      },
    },
  };

  const selectedForm = formType ? forms[formType] : null;

  return (
    <ModalSheet
      visible={visible}
      onClose={handleClose}
      title={selectedForm ? selectedForm.title : "Quick actions"}
      subtitle={selectedForm ? selectedForm.subtitle : "Jump into the most common operational workflows"}
    >
      <ScrollView style={{ maxHeight: 500 }} contentContainerStyle={{ gap: spacing.xl }}>
        {selectedForm ? selectedForm.render() : forms.quick.render()}
      </ScrollView>
    </ModalSheet>
  );
}
