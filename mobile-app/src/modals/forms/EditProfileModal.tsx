import React, { useState, useEffect } from "react";
import { View, Text, TextInput, TouchableOpacity, ScrollView } from "react-native";
import { Save, User, Phone, Mail, Clock, Shield } from "lucide-react-native";
import { useApp } from "../../context/AppContext";
import { ModalSheet } from "../../shared/components/ModalSheet";
import { colors, fontSize, spacing, borderRadius, bodyFont, fontWeight } from "../../theme/theme";

interface Props {
  visible: boolean;
  onClose: () => void;
}

export function EditProfileModal({ visible, onClose }: Props) {
  const { currentUser, editUser, showToast } = useApp();

  const [phone, setPhone] = useState(currentUser?.phone || "");
  const [email, setEmail] = useState(currentUser?.email || "");
  const [shift, setShift] = useState(currentUser?.shift || "");
  const [emergencyContact, setEmergencyContact] = useState(currentUser?.emergencyContact || "");
  const [skills, setSkills] = useState((Array.isArray(currentUser?.skills) ? currentUser.skills : []).join(", "));

  useEffect(() => {
    if (visible && currentUser) {
      setPhone(currentUser.phone || "");
      setEmail(currentUser.email || "");
      setShift(currentUser.shift || "");
      setEmergencyContact(currentUser.emergencyContact || "");
      setSkills((Array.isArray(currentUser.skills) ? currentUser.skills : []).join(", "));
    }
  }, [visible, currentUser]);

  const handleSave = () => {
    if (!phone.trim() || !email.trim()) {
      showToast("Phone and email are required");
      return;
    }
    editUser(currentUser.id, {
      phone: phone.trim(),
      email: email.trim(),
      shift: shift.trim(),
      emergencyContact: emergencyContact.trim(),
      skills: skills.split(",").map((s) => s.trim()).filter(Boolean),
    });
    onClose();
  };

  const inputField = (label: string, Icon: React.ComponentType<{ size: number; color: string; strokeWidth: number }>, value: string, setter: (v: string) => void, placeholder: string) => (
    <View>
      <Text style={{ fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: colors.slate400, textTransform: "uppercase", letterSpacing: 1.2, marginBottom: spacing.sm }}>{label}</Text>
      <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: colors.slate50, borderRadius: borderRadius.md, paddingHorizontal: 14, paddingVertical: 12, gap: spacing.md }}>
        <Icon size={16} color={colors.slate400} strokeWidth={2} />
        <TextInput
          value={value}
          onChangeText={setter}
          placeholder={placeholder}
          placeholderTextColor={colors.slate400}
          style={{ flex: 1, fontSize: fontSize.sm, color: colors.text, fontFamily: bodyFont, padding: 0 }}
        />
      </View>
    </View>
  );

  if (!currentUser) return null;

  return (
    <ModalSheet visible={visible} onClose={onClose} title="Edit profile" subtitle="Update your contact information and preferences">
      <ScrollView contentContainerStyle={{ gap: spacing.xl, paddingBottom: spacing.xl }}>
        <View style={{ backgroundColor: colors.text, borderRadius: borderRadius.xl, padding: spacing.xl, flexDirection: "row", alignItems: "center", gap: spacing.lg }}>
          <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: colors.brand, alignItems: "center", justifyContent: "center" }}>
            <Text style={{ fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.white }}>
              {(currentUser.name || "").split(" ").map((n: string) => n?.[0] || "").join("").slice(0, 2).toUpperCase()}
            </Text>
          </View>
          <View>
            <Text style={{ fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.white }}>{currentUser.name}</Text>
            <Text style={{ fontSize: fontSize.sm, color: colors.slate300 }}>{currentUser.position}</Text>
          </View>
        </View>

        <View style={{ gap: spacing.lg }}>
          {inputField("Phone", Phone, phone, setPhone, "Enter phone number")}
          {inputField("Email", Mail, email, setEmail, "Enter email address")}
          {inputField("Shift", Clock, shift, setShift, "e.g. 09:00 - 18:00")}
          {inputField("Emergency Contact", Shield, emergencyContact, setEmergencyContact, "Name and phone")}
          {inputField("Skills", User, skills, setSkills, "Comma separated skills")}
        </View>

        <TouchableOpacity onPress={handleSave} style={{ backgroundColor: colors.slate900, borderRadius: borderRadius.md, height: 48, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: spacing.sm }}>
          <Save size={14} color={colors.white} strokeWidth={2} />
          <Text style={{ fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.white }}>Save changes</Text>
        </TouchableOpacity>
      </ScrollView>
    </ModalSheet>
  );
}
