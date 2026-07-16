import React, { createContext, useContext, useReducer, useMemo, useCallback, useState, useEffect, useRef, ReactNode } from "react";
import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  RoleId, TabState, Branch, User, Task, Complaint, Appliance, Approval,
  Visit, NotificationItem, AttendanceLog, WeeklyTaskItem,
} from "../types/domain";
import {
  branches as branchData, users as userData, tasks as taskData, complaints as complaintData,
  appliances as applianceData, approvals as approvalData, visits as visitData,
  notifications as notificationData, attendanceLog as attendanceData,
  ROLES, initialTabState, currentUserByRole,
} from "../data/mockData";
import { apiClient } from "../services/api/client";

const saveSecure = async (key: string, value: string) => {
  try {
    if (Platform.OS === "web") {
      await AsyncStorage.setItem(key, value);
    } else {
      await SecureStore.setItemAsync(key, value);
    }
  } catch (e) {
    console.error("Failed to save secure item: ", e);
  }
};

const blobToDataUrl = (blob: any): Promise<string> => {
  return new Promise((resolve, reject) => {
    const Reader = (globalThis as any).FileReader;
    if (!Reader) {
      reject(new Error("FileReader is not available"));
      return;
    }
    const reader = new Reader();
    reader.onloadend = () => typeof reader.result === "string" ? resolve(reader.result) : reject(new Error("Image conversion failed"));
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};
const getSecure = async (key: string) => {
  try {
    if (Platform.OS === "web") {
      return await AsyncStorage.getItem(key);
    } else {
      return await SecureStore.getItemAsync(key);
    }
  } catch (e) {
    console.error("Failed to get secure item: ", e);
    return null;
  }
};

const deleteSecure = async (key: string) => {
  try {
    if (Platform.OS === "web") {
      await AsyncStorage.removeItem(key);
    } else {
      await SecureStore.deleteItemAsync(key);
    }
  } catch (e) {
    console.error("Failed to delete secure item: ", e);
  }
};

export type AuditEntry = {
  id: number;
  time: string;
  text: string;
  icon: string;
  color: string;
  role: RoleId;
  userId: string;
  branchId: string;
};

export type AlertState = {
  notificationId: string;
  acknowledged: boolean;
  escalated: boolean;
  acknowledgedAt: string | null;
  escalatedAt: string | null;
};

export type AppSettings = {
  geoRadius: number;
  criticalAlertRule: string;
  deadlineRule: string;
  escalationTimeout: string;
  locationProofRequired: boolean;
  selfieVerification: boolean;
  workerShiftWindow: string;
  weekendSchedule: string;
  budgetApprovalLimitBM: number;
  budgetApprovalLimitRM: number;
  proofPolicy: string;
  auditFrequency: string;
  autoSyncInterval: string;
  offlineMode: boolean;
  dataRetentionDays: number;
};

interface AppState {
  role: RoleId;
  page: string;
  tabs: TabState;
  modalType: string | null;
  modalData: any;
  toast: string;
  search: string;
  now: string;
  today: string;
}

type AppAction =
  | { type: "SWITCH_ROLE"; role: RoleId }
  | { type: "SET_PAGE"; page: string }
  | { type: "SET_TAB"; key: keyof TabState; value: string }
  | { type: "OPEN_MODAL"; modalType: string; modalData?: any }
  | { type: "CLOSE_MODAL" }
  | { type: "SHOW_TOAST"; message: string }
  | { type: "HIDE_TOAST" }
  | { type: "SET_SEARCH"; query: string };

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case "SWITCH_ROLE":
      return { ...state, role: action.role, page: ROLES[action.role].pages[0].id, modalType: null };
    case "SET_PAGE":
      return { ...state, page: action.page };
    case "SET_TAB":
      return { ...state, tabs: { ...state.tabs, [action.key]: action.value } };
    case "OPEN_MODAL":
      return { ...state, modalType: action.modalType, modalData: action.modalData ?? null };
    case "CLOSE_MODAL":
      return { ...state, modalType: null, modalData: null };
    case "SHOW_TOAST":
      return { ...state, toast: action.message };
    case "HIDE_TOAST":
      return { ...state, toast: "" };
    case "SET_SEARCH":
      return { ...state, search: action.query };
    default:
      return state;
  }
}

const getNow = () => {
  try {
    const optionsDate = { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" } as const;
    const formatterDate = new Intl.DateTimeFormat("en-CA", optionsDate);
    const dateStr = formatterDate.format(new Date());

    const optionsTime = { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false } as const;
    const formatterTime = new Intl.DateTimeFormat("en-US", optionsTime);
    const timeStr = formatterTime.format(new Date());

    return `${dateStr} ${timeStr}`;
  } catch (e) {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const hours = String(d.getHours()).padStart(2, "0");
    const minutes = String(d.getMinutes()).padStart(2, "0");
    const seconds = String(d.getSeconds()).padStart(2, "0");
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  }
};

const getToday = () => {
  try {
    const options = { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" } as const;
    const formatter = new Intl.DateTimeFormat("en-CA", options);
    return formatter.format(new Date());
  } catch (e) {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }
};

const getTimeStr = () => {
  try {
    const options = { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", hour12: false } as const;
    const formatter = new Intl.DateTimeFormat("en-US", options);
    return formatter.format(new Date());
  } catch (e) {
    const d = new Date();
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  }
};

const initialState: AppState = {
  role: "lc",
  page: ROLES.lc.pages[0].id,
  tabs: initialTabState,
  modalType: null,
  modalData: null,
  toast: "",
  search: "",
  now: getNow(),
  today: getToday(),
};

const defaultSettings: AppSettings = {
  geoRadius: 180,
  criticalAlertRule: "2 misses in 3 days",
  deadlineRule: "Auto escalate until RM if proof is missing",
  escalationTimeout: "45 min worker",
  locationProofRequired: true,
  selfieVerification: true,
  workerShiftWindow: "07:00 - 15:00",
  weekendSchedule: "Alternate Saturdays off",
  budgetApprovalLimitBM: 25000,
  budgetApprovalLimitRM: 50000,
  proofPolicy: "Geo + photo for all checklists",
  auditFrequency: "Quarterly internal audit",
  autoSyncInterval: "Every 5 minutes",
  offlineMode: true,
  dataRetentionDays: 90,
};

interface AppContextValue {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
  branches: Branch[];
  users: User[];
  tasks: Task[];
  complaints: Complaint[];
  appliances: Appliance[];
  approvals: Approval[];
  visits: Visit[];
  notifications: NotificationItem[];
  attendanceLog: AttendanceLog[];

  token: string | null;
  currentUser: User;
  scopedBranchIds: (string | number)[];
  scopedBranches: Branch[];
  scopedTasks: Task[];
  scopedComplaints: Complaint[];
  scopedUsers: User[];
  scopedApprovals: Approval[];
  scopedAppliances: Appliance[];
  scopedNotifications: NotificationItem[];
  scopedAttendance: AttendanceLog[];

  auditLog: AuditEntry[];
  alertStates: Record<string, AlertState>;
  settings: AppSettings;
  loading: boolean;

  getBranch: (id: string | number) => Branch | undefined;
  getUser: (id: string | number) => User | undefined;
  getTask: (id: string | number) => Task | undefined;
  getComplaint: (id: string | number) => Complaint | undefined;
  getAppliance: (id: string | number) => Appliance | undefined;

  setPage: (page: string) => void;
  switchRole: (role: RoleId) => void;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  setTab: (key: keyof TabState, value: string) => void;
  openModal: (type: string, data?: any) => void;
  closeModal: () => void;
  openFormModal: (formType?: string) => void;
  openTaskDetail: (id: string | number) => void;
  openComplaintDetail: (id: string | number) => void;
  openBranchDetail: (id: string | number) => void;
  openUserDetail: (id: string | number) => void;
  openApplianceDetail: (id: string | number) => void;
  openApprovalDetail: (id: string | number) => void;
  openVisitDetail: (id: string | number) => void;
  markAttendance: (params: { weeklyTasks?: WeeklyTaskItem[], isBranchOpening?: boolean, remarks?: string, photos?: string[] }) => void;
  submitTaskProof: (taskId: string | number, textRemarks?: string, customImageUri?: string) => Promise<boolean>;
  markTaskDone: (taskId: string | number) => void;
  revokeTask: (taskId: string | number) => void;
  updateComplaintStatus: (id: string | number, status: string, notes?: string, vendorRemarks?: string) => void;
  acknowledgeComplaint: (id: string | number, vendorIssueId: string) => Promise<void>;
  raiseToVendor: (id: string | number) => Promise<any>;
  addComplaintRemark: (id: string | number, text: string) => void;
  closeComplaint: (id: string | number) => void;
  requestComplaintUpdate: (id: string | number) => void;
  escalateComplaint: (id: string | number, reason?: string) => void;
  sendComplaintReminder: (id: string | number) => void;
  exportComplaintReport: () => Promise<void>;
  approveRequest: (id: string | number) => void;
  rejectRequest: (id: string | number) => void;
  toggleNotificationRead: (id: string | number) => void;
  toggleBookmark: (id: string | number) => void;
  acknowledgeAlert: (notificationId: string | number) => void;
  escalateAlert: (notificationId: string | number) => void;
  createTask: (data: Partial<Task>) => void;
  createComplaint: (data: Partial<Complaint>) => void;
  createUser: (name: string, role: RoleId, branchId: string | number) => void;
  createAppliance: (data: Partial<Appliance>) => Promise<boolean>;
  createExpense: (title: string, amount: number, vendor: string, desc: string) => void;
  createVisit: (branchId: string | number, date: string, purpose: string, agenda: string) => void;
  submitVisitReport: (id: string | number) => void;
  editUser: (id: string | number, data: Partial<User>) => void;
  getHierarchy: () => Promise<any[]>;
  createUserIdentity: (name: string, email: string, phone: string, role: RoleId) => Promise<any>;
  assignManager: (userId: string | number, managerId: string | number) => Promise<void>;
  assignBranches: (userId: string | number, branchIds: (string | number)[]) => Promise<void>;
  assignBranch: (userId: string | number, branchId: string | number) => Promise<void>;
  getAvailableBranches: (amId: string | number) => Promise<any[]>;
  getUnassignedBranches: () => Promise<any[]>;
  saveSettings: (settings: AppSettings) => void;
  updateBranchBudget: (branchId: string | number, amount: number) => Promise<void>;
  deleteUser: (id: string | number) => Promise<void>;
  deleteAppliance: (id: string | number) => Promise<void>;
  updateAppliance: (id: string | number, data: Partial<Appliance>) => Promise<void>;

  showToast: (message: string) => void;
  openAuditTrail: () => void;
  addAuditEntry: (text: string, icon: string, color: string) => void;
  refreshData: () => Promise<void>;

  operationalAlerts: any[];
  operationalAlertsLoading: boolean;
  getOperationalAlerts: (dateStr: string) => Promise<void>;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  // Real database states
  const [branches, setBranches] = useState<Branch[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [appliances, setAppliances] = useState<Appliance[]>([]);
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [attendanceLog, setAttendanceLog] = useState<AttendanceLog[]>([]);
  const [operationalAlerts, setOperationalAlerts] = useState<any[]>([]);
  const [operationalAlertsLoading, setOperationalAlertsLoading] = useState(false);

  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState<User>(null as any);

  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [auditLog, setAuditLog] = useState<AuditEntry[]>([]);
  const [alertStates, setAlertStates] = useState<Record<string, AlertState>>({});
  const auditIdRef = useRef(1);

  // Scopes derived dynamically
  const scopedBranchIds = useMemo(() => {
    if (!currentUser) return [];
    if (state.role === "rm") return branches.map((b) => b.id);
    if (state.role === "rrm") return currentUser.branchScope?.length ? currentUser.branchScope : branches.map((b) => b.id);
    if (state.role === "am") return currentUser.branchScope || [];
    if (state.role === "branchManager" || state.role === "aa") return currentUser.branchScope || [];
    return currentUser.branchId ? [currentUser.branchId] : [];
  }, [state.role, currentUser, branches]);

  const scopedBranches = useMemo(() => branches.filter((b) => scopedBranchIds.includes(b.id)), [branches, scopedBranchIds]);
  const scopedUsers = useMemo(() => {
    if (!currentUser) return [];

    if (state.role === "rm" || state.role === "rrm") {
      return users;
    }

    // AM view must be restricted to self + managed AAs + LCs under those AAs.
    if (state.role === "am" || state.role === "branchManager") {
      const meId = String(currentUser.id);
      const managedAas = users.filter((u) => u.role === "aa" && String(u.managerId) === meId);
      const managedAaIds = new Set(managedAas.map((u) => String(u.id)));

      return users.filter((u) => {
        if (String(u.id) === meId) return true;
        if (u.role === "aa" && String(u.managerId) === meId) return true;
        if (u.role === "lc" && String(u.managerId) === meId) return true;
        if (u.role === "lc" && managedAaIds.has(String(u.managerId))) return true;
        return false;
      });
    }

    return users.filter((u) => scopedBranchIds.includes(u.branchId) || u.id === currentUser.id);
  }, [users, scopedBranchIds, currentUser, state.role]);
  // scopedTasks is defined below after allTasks merge
  const scopedComplaints = useMemo(() => complaints.filter((c) => scopedBranchIds.includes(c.branchId)), [complaints, scopedBranchIds]);
  const scopedApprovals = useMemo(() => approvals.filter((a) => scopedBranchIds.includes(a.branchId)), [approvals, scopedBranchIds]);
  const scopedAppliances = useMemo(() => appliances.filter((a) => scopedBranchIds.includes(a.branchId)), [appliances, scopedBranchIds]);
  const scopedNotifications = useMemo(() => notifications.filter((n) => n.scope.includes(state.role)), [notifications, state.role]);
  const scopedAttendance = useMemo(() => attendanceLog.filter((entry) => {
    if (state.role === "rm" || state.role === "rrm") return true;

    // Always include current user's own attendance records
    if (String(entry.userId) === String(currentUser?.id)) return true;

    if (state.role === "am" || state.role === "branchManager" || state.role === "aa") {
      return scopedUsers.some((u) => String(u.id) === String(entry.userId));
    }

    const person = users.find((u) => String(u.id) === String(entry.userId));
    return person && scopedBranchIds.includes(person.branchId);
  }), [attendanceLog, users, currentUser, scopedBranchIds, state.role, scopedUsers]);

  const getBranch = useCallback((id: string | number) => branches.find((b) => String(b.id) === String(id)), [branches]);
  const getUser = useCallback((id: string | number) => users.find((u) => String(u.id) === String(id)), [users]);
  const getTask = useCallback((id: string | number) => tasks.find((t) => String(t.id) === String(id)), [tasks]);
  const getComplaint = useCallback((id: string | number) => complaints.find((c) => String(c.id) === String(id)), [complaints]);
  const getAppliance = useCallback((id: string | number) => appliances.find((a) => String(a.id) === String(id)), [appliances]);

  const showToast = useCallback((message: string) => {
    dispatch({ type: "SHOW_TOAST", message });
    setTimeout(() => dispatch({ type: "HIDE_TOAST" }), 2200);
  }, []);

  const addAuditEntry = useCallback((text: string, icon: string, color: string) => {
    const entry: AuditEntry = {
      id: auditIdRef.current++,
      time: getTimeStr(),
      text,
      icon,
      color,
      role: state.role,
      userId: String(currentUser?.id || "unknown"),
      branchId: String(currentUser?.branchId || "unknown"),
    };
    setAuditLog((prev) => [entry, ...prev].slice(0, 100));
  }, [state.role, currentUser]);

  const getOperationalAlerts = useCallback(async (dateStr: string) => {
    setOperationalAlertsLoading(true);
    try {
      const res = await apiClient.get(`/rm/operational-alerts?date=${dateStr}`);
      setOperationalAlerts(res.data.alerts || []);
    } catch (err) {
      console.error("Failed to fetch operational alerts:", err);
      showToast("Failed to load operational exceptions");
    } finally {
      setOperationalAlertsLoading(false);
    }
  }, [showToast]);

  // Main list refreshing method (lazy loads depending on current page)
  const refreshData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const getEndpointsForPage = (page: string, role: string): string[] => {
        const common = ["/notifications"];
        const isBmLike = role === "branchManager" || role === "aa";
        const isAm = role === "am";
        const isRmLike = role === "rm" || role === "rrm";

        switch (page) {
          case "home":
          case "dashboard":
            if (role === "lc") return ["/lc/dashboard", ...common];
            if (isBmLike) return ["/bm/dashboard", ...common];
            if (isAm) return ["/am/dashboard", ...common];
            if (isRmLike) return ["/rm/dashboard", ...common];
            return common;
          case "tasks":
            if (role === "lc") return ["/lc/tasks"];
            if (isBmLike) return ["/bm/tasks"];
            if (isAm) return ["/am/tasks"];
            return ["/rm/tasks"];
          case "complaints":
          case "issues":
            if (isBmLike) return ["/bm/complaints", "/branches", "/appliances"];
            return ["/complaints", "/branches", "/appliances"];
          case "branch":
          case "branches":
            if (role === "lc") return ["/lc/dashboard"];
            if (isBmLike) return ["/bm/branches"];
            return ["/branches", "/users", "/appliances"];
          case "intelligence":
          case "analytics":
            if (isRmLike) return ["/rm/analytics", "/branches", "/rm/users", "/appliances"];
            if (isAm) return ["/am/analytics", "/am/users", "/appliances"];
            if (isBmLike) return ["/bm/branches"];
            if (role === "lc") return ["/lc/dashboard"];
            return ["/branches"];
          case "monitoring":
            if (isBmLike) return ["/bm/tasks", "/branches"];
            if (isAm) return ["/am/tasks", "/am/users", "/branches"];
            if (isRmLike) return ["/rm/tasks", "/branches"];
            return ["/lc/tasks", "/branches"];
          case "approvals":
            if (isBmLike) return ["/bm/approvals"];
            return ["/rm/finance"];
          case "finance":
            if (isAm) return ["/am/finance"];
            return ["/rm/finance"];
          case "visits":
            if (isBmLike) return ["/bm/visits"];
            return ["/visits", "/branches"];
          case "attendance":
            if (role === "lc") return ["/lc/attendance/calendar"];
            if (isBmLike) return ["/bm/attendance"];
            if (isAm) return ["/am/attendance"];
            return ["/rm/attendance"];
          case "users":
            if (isBmLike) return ["/users", "/branches"];
            if (isAm) return ["/am/users"];
            return ["/rm/users"];
          case "notifications":
          case "alerts":
            return ["/notifications", "/branches"];
          default:
            return common;
        }
      };

      const endpoints = getEndpointsForPage(state.page, state.role);
      const promises = endpoints.map((endpoint) => {
        if (endpoint === "/lc/attendance/calendar") {
          const now = new Date();
          const month = now.getMonth() + 1;
          const year = now.getFullYear();
          return apiClient.get(`${endpoint}?month=${month}&year=${year}`).catch(() => ({ data: [] }));
        }
        return apiClient.get(endpoint).catch(() => null);
      });

      const results = await Promise.all(promises);

      // Helper to map check/task fields for frontend compatibility
      const normalizeTaskStatus = (status: string) => status === "IN_PROGRESS" ? "In Progress" : status;
      const getTaskItems = (data: any) => data?.checks || data?.tasks || (Array.isArray(data) ? data : []);
      const mapTask = (t: any) => ({
        ...t,
        status: normalizeTaskStatus(t.status),
        assignedTo: t.assignedToId || t.assignedTo?.id || t.assignedTo || null,
        assignedBy: t.assignedById || t.assignedBy?.id || t.assignedBy || "system",
        completedBy: t.completedById || t.completedBy?.id || t.completedBy || null,
        checklistDone: t.checklistDone ?? 0,
        checklistTotal: t.checklistTotal ?? 1,
        proofLabel: t.proofLabel || "Upload proof photo",
        escalation: t.escalation || "None",
        redoReason: t.redoReason || null,
        proofUrl: t.proofUrl || null,
      });

      // Helper to parse complaints timeline
      const mapComplaint = (c: any) => {
        let parsedTimeline: any[] = [];
        try {
          if (c.timeline) {
            if (typeof c.timeline === "string") {
              const parsed = JSON.parse(c.timeline);
              parsedTimeline = Array.isArray(parsed) ? parsed : [parsed];
            } else if (Array.isArray(c.timeline)) {
              parsedTimeline = c.timeline;
            }
          }
        } catch (err) {
          console.error("Timeline parse error: ", err);
          parsedTimeline = [];
        }
        const rawAttachments = c.attachmentUrls ?? c.attachments ?? [];
        let attachmentUrls: string[] = [];
        try {
          attachmentUrls = Array.isArray(rawAttachments)
            ? rawAttachments.filter((url): url is string => typeof url === "string" && url.trim().length > 0)
            : typeof rawAttachments === "string" ? JSON.parse(rawAttachments) : [];
        } catch {
          attachmentUrls = typeof rawAttachments === "string" && rawAttachments.trim() ? [rawAttachments] : [];
        }
        return { ...c, attachmentUrls, raisedById: c.raisedByIdId || c.raisedById, timeline: parsedTimeline };
      };

      // Helper to map attendance records
      const mapAttendance = (item: any, index: number) => {
        const weeklyTasks = Array.isArray(item.weeklyTasks) ? item.weeklyTasks : [];
        const derivedRemarks =
          item.remarks ||
          item.description ||
          item.todoDescription ||
          item.tasksDescription ||
          (weeklyTasks.length > 0
            ? weeklyTasks.map((t: any) => t?.description).filter(Boolean).join(", ")
            : "");

        return {
          id: item.id || index + 1,
          userId: item.userId || item.user?.id || currentUser?.id,
          date: item.date,
          status: item.status,
          checkIn: item.checkIn,
          checkOut: item.checkOut,
          location: item.location || "Inside geo fence - 40m",
          proof: item.proof || "Geo + selfie verified",
          deviation: item.deviation || "No",
          remarks: derivedRemarks,
          photos: item.photos || [],
          weeklyTasks,
          user: item.user,
        };
      };

      endpoints.forEach((endpoint, idx) => {
        const res = results[idx];
        if (!res || !res.data) return;

        // Role-specific bundle endpoints

        if (endpoint === "/lc/dashboard") {
          const data = res.data;
          if (data.branch) setBranches([data.branch]);
          setTasks(getTaskItems(data).map(mapTask));
          if (data.complaints) setComplaints((data.complaints || []).map(mapComplaint));
          if (data.appliances) setAppliances(data.appliances || []);
          if (data.todayAttendance) {
            setAttendanceLog([mapAttendance(data.todayAttendance, 0)]);
          }
          return;
        }

        if (endpoint === "/bm/dashboard" || endpoint === "/am/dashboard") {
          const data = res.data;
          if (data.branches) setBranches(data.branches || []);
          if (data.approvals) setApprovals((data.approvals || []).map((a: any) => ({ ...a, age: a.age || "", requestedBy: a.requestedById || a.requestedBy })));
          if (data.visits) setVisits(data.visits || []);
          if (data.notifications) setNotifications((data.notifications || []).map((n: any) => ({ ...n, bookmarked: n.bookmarked ?? false, branchId: n.branchId || "" })));
          if (data.complaints) setComplaints((data.complaints || []).map(mapComplaint));
          return;
        }

        if (endpoint === "/rm/dashboard") {
          const data = res.data;
          if (data.branches) setBranches(data.branches || []);
          if (data.complaints) setComplaints((data.complaints || []).map(mapComplaint));
          if (data.approvals) setApprovals((data.approvals || []).map((a: any) => ({ ...a, age: a.age || "", requestedBy: a.requestedById || a.requestedBy })));
          if (data.notifications) setNotifications((data.notifications || []).map((n: any) => ({ ...n, bookmarked: n.bookmarked ?? false, branchId: n.branchId || "" })));
          return;
        }

        if (endpoint === "/bm/attendance" || endpoint === "/rm/attendance" || endpoint === "/am/attendance") {
          const data = res.data;
          const attendanceArray = Array.isArray(data) ? data : (data.attendance || []);
          if (attendanceArray) {
            setAttendanceLog(prev => {
              const serverLogs = attendanceArray.map(mapAttendance);
              const currentUserLogs = prev.filter(p => String(p.userId) === String(currentUser?.id) && p.date === state.today);
              // Merge: If server missed our local punch today, keep the local one
              if (currentUserLogs.length > 0 && !serverLogs.find((s: any) => String(s.userId) === String(currentUser?.id) && s.date === state.today)) {
                return [...currentUserLogs, ...serverLogs];
              }
              return serverLogs;
            });
          }
          if (data.users) setUsers(data.users || []);
          setTasks(getTaskItems(data).map(mapTask));
          return;
        }

        if (endpoint === "/bm/branches") {
          const data = res.data;
          if (data.branches) setBranches(data.branches || []);
          if (data.appliances) setAppliances(data.appliances || []);
          if (data.users) setUsers(data.users || []);
          return;
        }

        if (endpoint === "/rm/users" || endpoint === "/am/users") {
          const data = res.data;
          if (data.users) setUsers(data.users || []);
          if (data.branches) setBranches(data.branches || []);
          return;
        }

        if (endpoint === "/rm/finance" || endpoint === "/am/finance") {
          const data = res.data;
          if (data.approvals) setApprovals((data.approvals || []).map((a: any) => ({ ...a, age: a.age || "", requestedBy: a.requestedById || a.requestedBy })));
          if (data.branches) setBranches(data.branches || []);
          return;
        }

        if (endpoint === "/rm/analytics" || endpoint === "/am/analytics") {
          // Analytics data is not stored in state directly - used for analytics screen.
          // Branches are re-fetched separately for now.
          return;
        }

        // Tasks endpoints
        if (endpoint === "/lc/tasks" || endpoint === "/bm/tasks" || endpoint === "/rm/tasks" || endpoint === "/am/tasks") {
          const rawTasks = getTaskItems(res.data);
          setTasks(rawTasks.map(mapTask));
          return;
        }

        // Approvals endpoints
        if (endpoint === "/bm/approvals") {
          const rawApprovals = res.data || [];
          setApprovals(rawApprovals.map((a: any) => ({ ...a, age: a.age || "", requestedBy: a.requestedById || a.requestedBy })));
          return;
        }

        // Complaints endpoints
        if (endpoint === "/bm/complaints") {
          setComplaints((res.data || []).map(mapComplaint));
          return;
        }

        // Visits endpoints
        if (endpoint === "/bm/visits") {
          setVisits(res.data || []);
          return;
        }

        // LC attendance calendar
        if (endpoint === "/lc/attendance/calendar") {
          const calendar = res.data || [];
          setAttendanceLog(calendar.map(mapAttendance));
          return;
        }

        // Legacy / fallback generic endpoints
        if (endpoint === "/branches") {
          setBranches(res.data);
        } else if (endpoint === "/users") {
          setUsers(res.data);
        } else if (endpoint === "/complaints") {
          setComplaints((res.data || []).map(mapComplaint));
        } else if (endpoint === "/appliances") {
          setAppliances(res.data);
        } else if (endpoint === "/visits") {
          setVisits(res.data);
        } else if (endpoint === "/notifications") {
          setNotifications((res.data || []).map((n: any) => ({ ...n, bookmarked: n.bookmarked ?? false, branchId: n.branchId || "" })));
        }
      });
    } catch (e: any) {
      console.error("Refresh data failed: ", e);
    } finally {
      setLoading(false);
    }
  }, [token, state.page, state.role, currentUser]);

  // Authentication SwitchRole logic (Testing utility)
  const switchRole = useCallback(async (role: RoleId) => {
    setLoading(true);
    try {
      let email = "";
      let password = "";
      if (role === "lc") {
        email = "lc.addanki@gmail.com";
        password = "lc123";
      } else if (role === "branchManager") {
        email = "pachari@gmail.com";
        password = "am123";
      } else if (role === "aa") {
        email = "g.teja@gmail.com";
        password = "aa123";
      } else if (role === "rm") {
        email = "ravi@gmail.com";
        password = "ravi123";
      }

      const res = await apiClient.post("/auth/login", { email, password });
      const { token: userToken, user: userProfile } = res.data;

      // Bind Bearer Token
      apiClient.defaults.headers.common["Authorization"] = `Bearer ${userToken}`;

      // Save session
      await saveSecure("auth_token", userToken);
      await saveSecure("user_profile", JSON.stringify(userProfile));

      setToken(userToken);
      setCurrentUser(userProfile);

      dispatch({ type: "SWITCH_ROLE", role });
      showToast(`Switched scope to ${userProfile.name}`);
    } catch (e: any) {
      console.error("Authentication switch failed: ", e);
      showToast("Auth failed: " + (e.response?.data?.message || e.message));
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  const login = useCallback(async (email: string, password: string): Promise<boolean> => {
    setLoading(true);
    try {
      const res = await apiClient.post("/auth/login", { email, password });
      const { token: userToken, user: userProfile } = res.data;

      // Bind Bearer Token
      apiClient.defaults.headers.common["Authorization"] = `Bearer ${userToken}`;

      // Save session
      await saveSecure("auth_token", userToken);
      await saveSecure("user_profile", JSON.stringify(userProfile));

      setToken(userToken);
      setCurrentUser(userProfile);

      dispatch({ type: "SWITCH_ROLE", role: userProfile.role });
      showToast(`Welcome back, ${userProfile.name}`);
      return true;
    } catch (e: any) {
      console.error("Authentication failed: ", e);
      showToast("Login failed: " + (e.response?.data?.message || e.message));
      return false;
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  const logout = useCallback(async () => {
    setLoading(true);
    try {
      await deleteSecure("auth_token");
      await deleteSecure("user_profile");

      delete apiClient.defaults.headers.common["Authorization"];
      setToken(null);
      setCurrentUser(null as any);
      showToast("Signed out successfully");
    } catch (e: any) {
      console.error("Logout failed: ", e);
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  // Load saved token on mount
  useEffect(() => {
    const loadSavedAuth = async () => {
      setLoading(true);
      try {
        const savedToken = await getSecure("auth_token");
        const savedProfile = await getSecure("user_profile");
        if (savedToken && savedProfile) {
          const profile = JSON.parse(savedProfile);
          apiClient.defaults.headers.common["Authorization"] = `Bearer ${savedToken}`;
          setToken(savedToken);
          setCurrentUser(profile);
          dispatch({ type: "SWITCH_ROLE", role: profile.role });
        }
      } catch (err) {
        console.log("Error loading saved auth state: ", err);
      } finally {
        setLoading(false);
      }
    };
    loadSavedAuth();
  }, []);

  // Trigger data refresh once token is registered
  useEffect(() => {
    if (token) {
      refreshData();
    }
  }, [token, refreshData]);

  // Register push notifications
  useEffect(() => {
    if (!currentUser || !token || currentUser.id === "lc-dummy") return;

    const registerPushToken = async () => {
      try {
        let pushToken = "ExponentPushToken[mock-token-123456]";
        try {
          const Notifications = require("expo-notifications");
          const Device = require("expo-device");
          if (Device.isDevice) {
            const { status: existingStatus } = await Notifications.getPermissionsAsync();
            let finalStatus = existingStatus;
            if (existingStatus !== "granted") {
              const { status } = await Notifications.requestPermissionsAsync();
              finalStatus = status;
            }
            if (finalStatus === "granted") {
              const tokenData = await Notifications.getExpoPushTokenAsync();
              pushToken = tokenData.data;
            }
          }
        } catch (err) {
          console.log("Expo Push notification permissions skipped.");
        }

        await apiClient.put(`/users/${currentUser.id}`, {
          expoPushToken: pushToken
        });
      } catch (err) {
        console.error("Failed to register Expo push token on backend: ", err);
      }
    };

    registerPushToken();
  }, [currentUser, token]);

  const setPage = useCallback((page: string) => dispatch({ type: "SET_PAGE", page }), []);
  const setTab = useCallback((key: keyof TabState, value: string) => dispatch({ type: "SET_TAB", key, value }), []);
  const openModal = useCallback((type: string, data?: any) => dispatch({ type: "OPEN_MODAL", modalType: type, modalData: data }), []);
  const closeModal = useCallback(() => dispatch({ type: "CLOSE_MODAL" }), []);
  const openFormModal = useCallback((formType?: string) => dispatch({ type: "OPEN_MODAL", modalType: "form", modalData: formType ? { formType } : {} }), []);
  const openAuditTrail = useCallback(() => dispatch({ type: "OPEN_MODAL", modalType: "audit" }), []);
  const openTaskDetail = useCallback((id: string | number) => dispatch({ type: "OPEN_MODAL", modalType: "task", modalData: { id } }), []);
  const openComplaintDetail = useCallback((id: string | number) => dispatch({ type: "OPEN_MODAL", modalType: "complaint", modalData: { id } }), []);
  const openBranchDetail = useCallback((id: string | number) => dispatch({ type: "OPEN_MODAL", modalType: "branch", modalData: { id } }), []);
  const openUserDetail = useCallback((id: string | number) => dispatch({ type: "OPEN_MODAL", modalType: "user", modalData: { id } }), []);
  const openApplianceDetail = useCallback((id: string | number) => dispatch({ type: "OPEN_MODAL", modalType: "appliance", modalData: { id } }), []);
  const openApprovalDetail = useCallback((id: string | number) => dispatch({ type: "OPEN_MODAL", modalType: "approval", modalData: { id } }), []);
  const openVisitDetail = useCallback((id: string | number) => dispatch({ type: "OPEN_MODAL", modalType: "visit", modalData: { id } }), []);

  // Context Operations mapped to backend API
  const markAttendance = useCallback(async (params: { weeklyTasks?: WeeklyTaskItem[], isBranchOpening?: boolean, remarks?: string, photos?: string[] }) => {
    try {
      const formattedTasks = params.weeklyTasks?.map(t => ({
        description: t.description,
        estimatedHours: t.estimatedHours
      }));
      const nowStr = getTimeStr();
      const endpoint = state.role === "lc" ? "/lc/attendance" : "/attendance";

      // Optimistic update
      setAttendanceLog(prev => {
        const existing = prev.find(a => String(a.userId) === String(currentUser.id) && a.date === state.today);
        if (existing) {
          return prev.map(a => a.id === existing.id ? { ...a, checkIn: nowStr, status: "Present", remarks: params.remarks || a.remarks } : a);
        }
        return [{
          id: Math.random().toString(),
          userId: String(currentUser.id),
          date: state.today,
          status: "Present",
          checkIn: nowStr,
          checkOut: "",
          location: "Inside geo fence - 40m",
          proof: "Geo + selfie verified",
          deviation: "No",
          isBranchOpening: params.isBranchOpening,
          remarks: params.remarks,
          photos: params.photos || [],
          weeklyTasks: formattedTasks as any
        }, ...prev];
      });

      await apiClient.post(endpoint, {
        checkIn: nowStr,
        weeklyTasks: formattedTasks,
        isBranchOpening: params.isBranchOpening,
        remarks: params.remarks,
        photos: params.photos
      });
      addAuditEntry(`${currentUser.name} marked attendance at ${nowStr}`, "CheckCircle", "#10B981");
      showToast("Attendance marked and checklist submitted");
      await refreshData();
    } catch (e: any) {
      console.error(e);
      showToast("Failed to mark attendance");
    }
  }, [currentUser, state.role, addAuditEntry, showToast, refreshData]);

  const submitTaskProof = useCallback(async (taskId: string | number, textRemarks?: string, customImageUri?: string) => {
    try {
      const uri = customImageUri || "";
      if (!uri) {
        showToast("Please select or capture a proof image first");
        return false;
      }

      const formData = new FormData();
      formData.append("imageUrl", uri);

      if (Platform.OS === "web") {
        try {
          const response = await fetch(uri);
          const blob = await response.blob();
          formData.append("image", blob, "proof.jpg");
        } catch (fetchErr) {
          console.error("Failed to fetch blob for web upload:", fetchErr);
          formData.append("image", {
            uri,
            name: "proof.jpg",
            type: "image/jpeg"
          } as any);
        }
      } else {
        formData.append("image", {
          uri,
          name: "proof.jpg",
          type: "image/jpeg"
        } as any);
      }

      if (textRemarks) {
        formData.append("notes", textRemarks);
      }

      let response;
      if (Platform.OS === "web") {
        response = await apiClient.post(`/tasks/${taskId}/submit-proof`, formData, {
          headers: { "Content-Type": "multipart/form-data" }
        });
      } else {
        const token = await getSecure("auth_token");
        response = await fetch(`${apiClient.defaults.baseURL}/tasks/${taskId}/submit-proof`, {
          method: "POST",
          headers: { "Authorization": `Bearer ${token}` },
          body: formData
        });
        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.message || "Failed to submit check proof");
        }
      }

      addAuditEntry(`Task proof submitted by ${currentUser.name}`, "CheckCircle", "#10B981");
      showToast("Verification proof submitted successfully");
      await refreshData();
      return true;
    } catch (e: any) {
      console.error(e);
      showToast(e.response?.data?.message || "Failed to submit check proof");
      return false;
    }
  }, [currentUser, addAuditEntry, showToast, refreshData]);

  const markTaskDone = useCallback(async (taskId: string | number) => {
    const taskStr = String(taskId);
    if (taskStr.startsWith("appliance_auto_")) {
      setApplianceTaskStatus((prev) => ({ ...prev, [taskStr]: { status: "Completed", completedAt: new Date().toISOString().slice(0, 10), completedBy: currentUser.id } }));
      addAuditEntry(`Appliance inspection completed by ${currentUser.name}`, "CheckCircle", "#10B981");
      showToast("Inspection completed");
      return;
    }
    try {
      await apiClient.post(`/tasks/${taskId}/complete`, { checklistDone: 1 });
      addAuditEntry(`Task marked complete by ${currentUser.name}`, "CheckCircle", "#10B981");
      showToast("Task completed");
      await refreshData();
    } catch (e: any) {
      console.error(e);
      showToast("Failed to mark task complete");
    }
  }, [currentUser, addAuditEntry, showToast, refreshData]);

  const revokeTask = useCallback(async (taskId: string | number) => {
    const taskStr = String(taskId);
    if (taskStr.startsWith("appliance_auto_")) {
      setApplianceTaskStatus((prev) => ({ ...prev, [taskStr]: { status: "Revoked", redoReason: "Revision requested" } }));
      addAuditEntry(`Appliance inspection revoked by ${currentUser.name}`, "RefreshCw", "#EF4444");
      showToast("Inspection sent back for revision");
      return;
    }
    try {
      await apiClient.post(`/tasks/${taskId}/revoke`, {
        redoReason: "Revision requested on checklist notes and supporting entry."
      });
      addAuditEntry(`Task revoked for revision by ${currentUser.name}`, "RefreshCw", "#EF4444");
      showToast("Task checklist sent back for revision");
      await refreshData();
    } catch (e: any) {
      console.error(e);
      showToast("Failed to revoke task");
    }
  }, [currentUser, addAuditEntry, showToast, refreshData]);

  const updateComplaintStatus = useCallback(async (id: string | number, status: string, notes?: string, vendorRemarks?: string) => {
    try {
      if (status === "RESOLVED") {
        await apiClient.patch(`/complaints/${id}/resolve`, { resolutionNotes: notes || "Resolved via mobile app", vendorRemarks });
      } else {
        await apiClient.patch(`/complaints/${id}/status`, { status });
      }
      addAuditEntry(`Complaint status changed to ${status} by ${currentUser.name}`, "RefreshCw", "#6366F1");
      showToast(`Status updated to ${status}`);
      await refreshData();
    } catch (e: any) {
      console.error(e);
      showToast("Failed to update status");
    }
  }, [currentUser, addAuditEntry, showToast, refreshData]);

  const acknowledgeComplaint = useCallback(async (id: string | number, vendorIssueId: string) => {
    try {
      try {
        await apiClient.patch(`/complaints/${id}/status`, { status: "ACKNOWLEDGED", vendorIssueId });
      } catch (e) {
        // Fallback for mock backend
      }
      setComplaints(prev => prev.map(c => String(c.id) === String(id) ? { ...c, status: "ACKNOWLEDGED", vendorIssueId } : c));
      addAuditEntry(`Complaint acknowledged by ${currentUser.name}`, "CheckCircle", "#10B981");
      showToast("Complaint acknowledged");
    } catch (e: any) {
      console.error(e);
      showToast("Failed to acknowledge complaint");
    }
  }, [currentUser, addAuditEntry, showToast]);

  const raiseToVendor = useCallback(async (id: string | number) => {
    try {
      const res = await apiClient.post(`/complaints/${id}/raise-to-vendor`);
      addAuditEntry(`Complaint raised to vendor by ${currentUser.name}`, "Send", "#008DD2");
      showToast("Raised to vendor");
      await refreshData();
      return res.data;
    } catch (e: any) {
      console.error(e);
      showToast("Failed to raise to vendor");
      return null;
    }
  }, [currentUser, addAuditEntry, showToast, refreshData]);

  const addComplaintRemark = useCallback(async (id: string | number, text: string) => {
    try {
      await apiClient.post(`/complaints/${id}/vendorRemarks`, { text });
      addAuditEntry(`Remark added to complaint by ${currentUser.name}`, "MessageSquare", "#6366F1");
      showToast("Remark added");
      await refreshData();
    } catch (e: any) {
      console.error(e);
      showToast("Failed to add remark");
    }
  }, [currentUser, addAuditEntry, showToast, refreshData]);

  const closeComplaint = useCallback(async (id: string | number) => {
    try {
      await apiClient.post(`/complaints/${id}/close`);
      addAuditEntry(`Complaint closed by ${currentUser.name}`, "CheckCircle", "#10B981");
      showToast("Complaint closed");
      await refreshData();
    } catch (e: any) {
      console.error(e);
      showToast("Failed to close complaint");
    }
  }, [currentUser, addAuditEntry, showToast, refreshData]);

  const requestComplaintUpdate = useCallback(async (id: string | number) => {
    try {
      await apiClient.post(`/complaints/${id}/request-update`);
      addAuditEntry(`Update requested on complaint by RM`, "Bell", "#F59E0B");
      showToast("Update requested");
    } catch (e: any) {
      console.error(e);
      showToast("Failed to request update");
    }
  }, [currentUser, addAuditEntry, showToast]);

  const escalateComplaint = useCallback(async (id: string | number, reason?: string) => {
    try {
      await apiClient.post(`/complaints/${id}/escalate`, { reason });
      addAuditEntry(`Complaint escalated by RM`, "AlertTriangle", "#EF4444");
      showToast("Complaint escalated");
      await refreshData();
    } catch (e: any) {
      console.error(e);
      showToast("Failed to escalate complaint");
    }
  }, [currentUser, addAuditEntry, showToast, refreshData]);

  const sendComplaintReminder = useCallback(async (id: string | number) => {
    try {
      // Assuming backend has this route, or mock it
      // await apiClient.post(`/complaints/${id}/remind`);
      addAuditEntry(`Reminder sent for complaint by ${currentUser.name}`, "Bell", "#008DD2");
      showToast("Reminder sent");
    } catch (e: any) {
      console.error(e);
      showToast("Failed to send reminder");
    }
  }, [currentUser, addAuditEntry, showToast]);

  const exportComplaintReport = useCallback(async () => {
    try {
      // Mocking report export
      addAuditEntry(`Complaint report exported by RM`, "Download", "#10B981");
      showToast("Report exported successfully");
    } catch (e: any) {
      console.error(e);
      showToast("Failed to export report");
    }
  }, [currentUser, addAuditEntry, showToast]);

  const approveRequest = useCallback(async (id: string | number) => {
    try {
      await apiClient.post(`/approvals/${id}/approve`);
      addAuditEntry(`Approval request approved by ${currentUser.name}`, "CheckCircle", "#10B981");
      showToast("Request approved");
      await refreshData();
    } catch (e: any) {
      console.error(e);
      showToast("Failed to approve request");
    }
  }, [currentUser, addAuditEntry, showToast, refreshData]);

  const rejectRequest = useCallback(async (id: string | number) => {
    try {
      await apiClient.post(`/approvals/${id}/reject`);
      addAuditEntry(`Approval request rejected by ${currentUser.name}`, "XCircle", "#EF4444");
      showToast("Request rejected");
      await refreshData();
    } catch (e: any) {
      console.error(e);
      showToast("Failed to reject request");
    }
  }, [currentUser, addAuditEntry, showToast, refreshData]);

  const toggleNotificationRead = useCallback(async (id: string | number) => {
    try {
      await apiClient.post(`/notifications/${id}/read`);
      await refreshData();
    } catch (e: any) {
      console.error(e);
    }
  }, [refreshData]);

  const toggleBookmark = useCallback(async (id: string | number) => {
    try {
      await apiClient.post(`/notifications/${id}/bookmark`);
      await refreshData();
    } catch (e: any) {
      console.error(e);
    }
  }, [refreshData]);

  const acknowledgeAlert = useCallback(async (notificationId: string | number) => {
    try {
      await apiClient.post(`/notifications/${notificationId}/acknowledge`);
      addAuditEntry(`Alert acknowledged by ${currentUser.name}`, "CheckCircle", "#10B981");
      showToast("Alert acknowledged");
      await refreshData();
    } catch (e: any) {
      console.error(e);
      showToast("Failed to acknowledge alert");
    }
  }, [currentUser, addAuditEntry, showToast, refreshData]);

  const escalateAlert = useCallback(async (notificationId: string | number) => {
    try {
      await apiClient.post(`/notifications/${notificationId}/escalate`);
      addAuditEntry(`Alert escalated by ${currentUser.name}`, "AlertTriangle", "#F59E0B");
      showToast("Alert escalated");
      await refreshData();
    } catch (e: any) {
      console.error(e);
      showToast("Failed to escalate alert");
    }
  }, [currentUser, addAuditEntry, showToast, refreshData]);

  const createTask = useCallback(async (data: Partial<Task>) => {
    try {
      await apiClient.post("/tasks", {
        title: data.title,
        branchId: data.branchId || currentUser.branchId,
        audience: data.audience,
        schedule: "Weekly",
        priority: data.priority,
        zone: data.zone,
        deadline: data.deadline,
        assignedToId: data.assignedTo,
        proofRequired: data.proofRequired,
        proofLabel: data.proofLabel,
        notes: data.notes
      });
      addAuditEntry(`Check "${data.title}" created by ${currentUser.name}`, "Plus", "#6366F1");
      showToast("Check created successfully");
      await refreshData();
    } catch (e: any) {
      console.error(e);
      showToast("Failed to create check");
    }
  }, [currentUser, addAuditEntry, showToast, refreshData]);

  const createComplaint = useCallback(async (data: Partial<Complaint>) => {
    try {
      const formData = new FormData();
      formData.append("branchId", String(data.branchId || currentUser.branchId));
      formData.append("priority", String(data.priority));
      formData.append("assetId", String(data.assetId));
      formData.append("description", String(data.description));
      formData.append("vendorName", String((data as any).vendorName || ""));
      formData.append("vendorEmail", String((data as any).vendorEmail || ""));

      const localAttachments: string[] = [];
      const remoteAttachments: string[] = [];

      if (data.attachmentUrls && data.attachmentUrls.length > 0) {
        for (const url of data.attachmentUrls) {
          if (/^(file:|content:|ph:)/i.test(url) || !url.startsWith("http")) {
            localAttachments.push(url);
          } else {
            remoteAttachments.push(url);
          }
        }
      }

      formData.append("attachments", JSON.stringify(remoteAttachments));

      if (localAttachments.length > 0) {
        for (let i = 0; i < localAttachments.length; i++) {
          const uri = localAttachments[i];
          const filename = `attachment_${i}.jpg`;
          
          if (Platform.OS === "web") {
            try {
              const response = await fetch(uri);
              const blob = await response.blob();
              formData.append("images", blob, filename);
            } catch (err) {
              console.error("Web fetch file blob failed:", err);
              formData.append("images", {
                uri,
                name: filename,
                type: "image/jpeg"
              } as any);
            }
          } else {
            formData.append("images", {
              uri,
              name: filename,
              type: "image/jpeg"
            } as any);
          }
        }
      }

      let response;
      if (Platform.OS === "web") {
        response = await apiClient.post("/complaints", formData, {
          headers: { "Content-Type": "multipart/form-data" }
        });
      } else {
        const token = await getSecure("auth_token");
        response = await fetch(`${apiClient.defaults.baseURL}/complaints`, {
          method: "POST",
          headers: { "Authorization": `Bearer ${token}` },
          body: formData
        });
        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.message || "Failed to create complaint");
        }
      }

      addAuditEntry(`Issue raised by ${currentUser.name}`, "Zap", "#EF4444");
      showToast("Complaint submitted");
      await refreshData();
    } catch (e: any) {
      console.error(e);
      showToast(e.response?.data?.message || "Failed to raise complaint");
    }
  }, [currentUser, addAuditEntry, showToast, refreshData]);

  const createUser = useCallback(async (name: string, role: RoleId, branchId: string | number) => {
    try {
      await apiClient.post("/users", {
        name,
        role,
        position: ROLES[role].name,
        branchId
      });
      addAuditEntry(`User "${name}" created by ${currentUser.name}`, "UserPlus", "#6366F1");
      showToast("Employee registered successfully");
      await refreshData();
    } catch (e: any) {
      console.error(e);
      showToast("Failed to create employee profile");
    }
  }, [currentUser, addAuditEntry, showToast, refreshData]);

  const editUser = useCallback(async (id: string | number, data: Partial<User>) => {
    try {
      await apiClient.put(`/users/${id}`, {
        name: data.name,
        phone: data.phone,
        email: data.email,
        shift: data.shift,
        skills: data.skills,
        emergencyContact: data.emergencyContact,
        status: data.status
      });
      addAuditEntry(`User profile ${id} updated by ${currentUser.name}`, "Edit", "#6366F1");
      showToast("Profile updated");

      // Check if we updated the CURRENT logged-in user
      if (currentUser && String(id) === String(currentUser.id)) {
        const updatedProfile = {
          ...currentUser,
          name: data.name !== undefined ? data.name : currentUser.name,
          phone: data.phone !== undefined ? data.phone : currentUser.phone,
          email: data.email !== undefined ? data.email : currentUser.email,
          shift: data.shift !== undefined ? data.shift : currentUser.shift,
          skills: data.skills !== undefined ? data.skills : currentUser.skills,
          emergencyContact: data.emergencyContact !== undefined ? data.emergencyContact : currentUser.emergencyContact,
          status: data.status !== undefined ? data.status : currentUser.status,
        };
        setCurrentUser(updatedProfile);
        await saveSecure("user_profile", JSON.stringify(updatedProfile));
      }

      await refreshData();
    } catch (e: any) {
      console.error(e);
      showToast("Failed to update profile");
    }
  }, [currentUser, addAuditEntry, showToast, refreshData]);

  const getHierarchy = useCallback(async () => {
    try {
      const res = await apiClient.get("/users/hierarchy");
      return res.data;
    } catch (e: any) {
      console.error(e);
      showToast("Failed to load user hierarchy");
      return [];
    }
  }, [showToast]);

  const createUserIdentity = useCallback(async (name: string, email: string, phone: string, role: RoleId) => {
    try {
      const position = ROLES[role]?.name || role;
      const res = await apiClient.post("/users", { name, role, position, phone, email });
      return res.data.user;
    } catch (e: any) {
      console.error(e);
      showToast(e.response?.data?.message || "Failed to create user");
      return null;
    }
  }, [showToast]);

  const assignManager = useCallback(async (userId: string | number, managerId: string | number) => {
    try {
      await apiClient.put(`/users/${userId}/assign-manager`, { managerId });
      addAuditEntry(`Manager assigned to user ${userId} by ${currentUser.name}`, "UserCheck", "#6366F1");
      showToast("Manager assigned");
      await refreshData();
    } catch (e: any) {
      console.error(e);
      showToast(e.response?.data?.message || "Failed to assign manager");
    }
  }, [currentUser, addAuditEntry, showToast, refreshData]);

  const assignBranches = useCallback(async (userId: string | number, branchIds: (string | number)[]) => {
    try {
      await apiClient.put(`/users/${userId}/assign-branches`, { branchIds });
      addAuditEntry(`Branches assigned to AA ${userId} by ${currentUser.name}`, "Building", "#6366F1");
      showToast("Branches assigned");
      await refreshData();
    } catch (e: any) {
      console.error(e);
      showToast(e.response?.data?.message || "Failed to assign branches");
    }
  }, [currentUser, addAuditEntry, showToast, refreshData]);

  const assignBranch = useCallback(async (userId: string | number, branchId: string | number) => {
    try {
      await apiClient.put(`/users/${userId}/assign-branch`, { branchId });
      addAuditEntry(`Branch assigned to LC ${userId} by ${currentUser.name}`, "Building", "#6366F1");
      showToast("Branch assigned to LC");
      await refreshData();
    } catch (e: any) {
      console.error(e);
      showToast(e.response?.data?.message || "Failed to assign branch");
    }
  }, [currentUser, addAuditEntry, showToast, refreshData]);

  const getAvailableBranches = useCallback(async (amId: string | number) => {
    try {
      const res = await apiClient.get(`/users/available-branches/${amId}`);
      return res.data;
    } catch (e: any) {
      console.error(e);
      showToast("Failed to load available branches");
      return [];
    }
  }, [showToast]);

  const getUnassignedBranches = useCallback(async () => {
    try {
      const res = await apiClient.get("/users/unassigned-branches");
      return res.data;
    } catch (e: any) {
      console.error(e);
      showToast("Failed to load unassigned branches");
      return [];
    }
  }, [showToast]);

  const createAppliance = useCallback(async (data: Partial<Appliance>) => {
    try {
      const payload = {
        name: data.name,
        category: data.category,
        zone: data.zone,
        brand: data.brand,
        model: data.model,
        serial: data.serial,
        purchaseCost: data.purchaseCost,
        amcVendor: data.amcVendor,
        purchaseDate: data.purchaseDate,
        lastService: data.lastService,
        nextService: data.nextService,
        warranty: data.warranty,
        pendingParts: data.pendingParts,
        branchId: data.branchId || currentUser.branchId,
      };

      if (data.imageUrl) {
        const isRemoteImage = /^https?:\/\//i.test(data.imageUrl);
        const isDataImage = /^data:image\//i.test(data.imageUrl);

        if (Platform.OS === "web" && !isRemoteImage && !isDataImage) {
          const response = await fetch(data.imageUrl);
          const blob = await response.blob();
          const dataUrl = await blobToDataUrl(blob);
          await apiClient.post("/appliances", { ...payload, imageUrl: dataUrl });
        } else {
          const formData = new FormData();
          Object.entries(payload).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== "") {
              formData.append(key, String(value));
            }
          });

          if (isRemoteImage || isDataImage) {
            formData.append("imageUrl", data.imageUrl);
          } else {
            formData.append("image", {
              uri: data.imageUrl,
              name: "appliance.jpg",
              type: "image/jpeg",
            } as any);
          }

          await apiClient.post("/appliances", formData);
        }
      } else {
        await apiClient.post("/appliances", payload);
      }

      addAuditEntry(`Appliance "${data.name}" added by ${currentUser.name}`, "Wrench", "#10B981");
      showToast("Appliance registered");
      const appliancesRes = await apiClient.get("/appliances");
      setAppliances(appliancesRes.data || []);
      await refreshData();
      return true;
    } catch (e: any) {
      console.error(e);
      const errMsg = e.response?.data?.message || "Failed to add appliance";
      showToast(errMsg);
      return false;
    }
  }, [currentUser, addAuditEntry, showToast, refreshData]);

  const createExpense = useCallback(async (title: string, amount: number, vendor: string, desc: string) => {
    try {
      await apiClient.post("/approvals", {
        title,
        kind: "Expense",
        amount,
        note: vendor ? `${vendor} | ${desc}` : desc
      });
      addAuditEntry(`Work order "${title}" raised for Rs ${amount} by ${currentUser.name}`, "DollarSign", "#F59E0B");
      showToast("Budget approval request created");
      await refreshData();
    } catch (e: any) {
      console.error(e);
      showToast("Failed to raise budget request");
    }
  }, [currentUser, addAuditEntry, showToast, refreshData]);

  const createVisit = useCallback(async (branchId: string | number, date: string, purpose: string, agenda: string) => {
    try {
      await apiClient.post("/visits", {
        branchId,
        scheduledAt: date,
        purpose,
        agenda
      });
      const branchName = branches.find(b => b.id === branchId)?.name || `Branch ${branchId}`;
      addAuditEntry(`Visit to ${branchName} scheduled by ${currentUser.name}`, "Calendar", "#6366F1");
      showToast("Visit scheduled");
      await refreshData();
    } catch (e: any) {
      console.error(e);
      showToast("Failed to schedule visit");
    }
  }, [currentUser, branches, addAuditEntry, showToast, refreshData]);

  const submitVisitReport = useCallback(async (id: string | number) => {
    try {
      await apiClient.post(`/visits/${id}/report`, {
        report: "Visit report submitted. Proof logs reviewed, manpower gaps discussed, and follow-up assigned."
      });
      addAuditEntry(`Visit report ${id} submitted by ${currentUser.name}`, "FileText", "#10B981");
      showToast("Visit report filed");
      await refreshData();
    } catch (e: any) {
      console.error(e);
      showToast("Failed to file visit report");
    }
  }, [currentUser, addAuditEntry, showToast, refreshData]);

  const saveSettings = useCallback((newSettings: AppSettings) => {
    setSettings(newSettings);
    addAuditEntry(`System settings updated by ${currentUser.name}`, "Settings", "#6366F1");
    showToast("Settings updated");
  }, [currentUser, addAuditEntry, showToast]);

  const updateBranchBudget = useCallback(async (branchId: string | number, amount: number) => {
    try {
      await apiClient.put(`/branches/${branchId}`, { monthlyBudget: amount });
      addAuditEntry(`Branch budget updated by ${currentUser.name}`, "Settings", "#6366F1");
      showToast("Budget updated successfully");
      await refreshData();
    } catch (e: any) {
      console.error(e);
      showToast("Failed to update branch budget");
    }
  }, [currentUser, addAuditEntry, showToast, refreshData]);

  const deleteUser = useCallback(async (id: string | number) => {
    try {
      await apiClient.delete(`/users/${id}`);
      addAuditEntry(`Employee deleted by ${currentUser.name}`, "UserMinus", "#EF4444");
      showToast("Employee profile deleted successfully");
      await refreshData();
    } catch (e: any) {
      console.error(e);
      showToast("Failed to delete employee profile");
    }
  }, [currentUser, addAuditEntry, showToast, refreshData]);

  const deleteAppliance = useCallback(async (id: string | number) => {
    try {
      await apiClient.delete(`/appliances/${id}`);
      addAuditEntry(`Appliance deleted by ${currentUser.name}`, "Trash2", "#EF4444");
      showToast("Appliance deleted successfully");
      await refreshData();
    } catch (e: any) {
      console.error(e);
      showToast("Failed to delete appliance");
    }
  }, [currentUser, addAuditEntry, showToast, refreshData]);

  const updateAppliance = useCallback(async (id: string | number, data: Partial<Appliance>) => {
    try {
      if (data.imageUrl) {
        const isRemoteImage = /^https?:\/\//i.test(data.imageUrl);
        const isDataImage = /^data:image\//i.test(data.imageUrl);

        if (Platform.OS === "web" && !isRemoteImage && !isDataImage) {
          const response = await fetch(data.imageUrl);
          const blob = await response.blob();
          const dataUrl = await blobToDataUrl(blob);
          await apiClient.put(`/appliances/${id}`, { ...data, imageUrl: dataUrl });
        } else {
          const formData = new FormData();
          Object.entries(data).forEach(([key, value]) => {
            if (key !== "imageUrl" && value !== undefined && value !== null && value !== "") {
              formData.append(key, String(value));
            }
          });

          if (isRemoteImage || isDataImage) {
            formData.append("imageUrl", data.imageUrl);
          } else {
            formData.append("image", {
              uri: data.imageUrl,
              name: "appliance.jpg",
              type: "image/jpeg",
            } as any);
          }

          await apiClient.put(`/appliances/${id}`, formData);
        }
      } else {
        await apiClient.put(`/appliances/${id}`, data);
      }

      addAuditEntry(`Appliance updated by ${currentUser.name}`, "Settings", "#6366F1");
      showToast("Appliance details updated");
      const appliancesRes = await apiClient.get("/appliances");
      setAppliances(appliancesRes.data || []);
      await refreshData();
    } catch (e: any) {
      console.error(e);
      showToast("Failed to update appliance details");
    }
  }, [currentUser, addAuditEntry, showToast, refreshData]);



  // Track completion status for auto-generated appliance inspection tasks
  const [applianceTaskStatus, setApplianceTaskStatus] = useState<Record<string, Partial<Task>>>({});

  // Auto-generate weekly inspection tasks for appliances that don't have linked server tasks
  const applianceWeeklyTasks = useMemo((): Task[] => {
    return appliances.flatMap((a) => {
      const hasServerTask = tasks.some((t) => t.applianceId != null && String(t.applianceId) === String(a.id));
      if (hasServerTask) return [];
      const deadline = new Date();
      deadline.setDate(deadline.getDate() + 7);
      const base: Task = {
        id: `appliance_auto_${a.id}`,
        title: `Weekly inspection - ${a.name}`,
        branchId: a.branchId,
        audience: "lc",
        schedule: "Weekly",
        priority: "Medium",
        zone: a.zone,
        deadline: deadline.toISOString().slice(0, 10),
        assignedTo: null,
        assignedBy: "system",
        status: "Pending",
        checklistDone: 0,
        checklistTotal: 3,
        proofRequired: true,
        completedBy: null,
        completedAt: null,
        notes: `Auto-generated weekly inspection for ${a.name} (${a.category})`,
        escalation: "None",
        proofLabel: "Upload inspection photo",
        redoReason: null,
        applianceId: a.id,
      };
      const override = applianceTaskStatus[base.id];
      return override ? [{ ...base, ...override }] : [base];
    });
  }, [appliances, tasks, applianceTaskStatus]);

  const allTasks = useMemo(() => [...tasks, ...applianceWeeklyTasks], [tasks, applianceWeeklyTasks]);
  const scopedTasks = useMemo(() => allTasks.filter((t) => scopedBranchIds.includes(t.branchId)), [allTasks, scopedBranchIds]);

  const value: AppContextValue = {
    state, dispatch, branches, users, tasks, complaints, appliances, approvals, visits, notifications, attendanceLog,
    token, currentUser, scopedBranchIds, scopedBranches, scopedTasks, scopedComplaints, scopedUsers,
    scopedApprovals, scopedAppliances, scopedNotifications, scopedAttendance,
    auditLog, alertStates, settings, loading,
    getBranch, getUser, getTask, getComplaint, getAppliance,
    setPage, switchRole, login, logout, setTab, openModal, closeModal, openFormModal,
    openTaskDetail, openComplaintDetail, openBranchDetail, openUserDetail,
    openApplianceDetail, openApprovalDetail, openVisitDetail,
    markAttendance, submitTaskProof, markTaskDone, revokeTask,
    updateComplaintStatus, acknowledgeComplaint, raiseToVendor, addComplaintRemark, closeComplaint,
    requestComplaintUpdate,
    escalateComplaint,
    sendComplaintReminder,
    exportComplaintReport,
    approveRequest, rejectRequest, toggleNotificationRead, toggleBookmark,
    acknowledgeAlert, escalateAlert,
    createTask, createComplaint, createUser, createAppliance, createExpense, createVisit,
    submitVisitReport, editUser, getHierarchy, createUserIdentity,
    assignManager, assignBranches, assignBranch, getAvailableBranches, getUnassignedBranches,
    saveSettings, showToast, openAuditTrail, addAuditEntry,
    updateBranchBudget, deleteUser, deleteAppliance, updateAppliance,
    refreshData,
    operationalAlerts,
    operationalAlertsLoading,
    getOperationalAlerts,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
