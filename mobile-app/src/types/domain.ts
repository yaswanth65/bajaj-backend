export type RoleId = "lc" | "branchManager" | "aa" | "rm" | "am" | "rrm";

export type Priority = "Critical" | "High" | "Medium" | "Low";

export type TaskStatus = "Pending" | "In Progress" | "Completed" | "Revoked";

export type ComplaintStatus = "OPEN" | "VENDOR_PENDING" | "IN_PROGRESS" | "ON_HOLD" | "RESOLVED" | "REOPENED" | "ACKNOWLEDGED";

export type ComplaintRemark = {
  user: string;
  text: string;
  timestamp: string;
};

export type ApprovalStatus = "Pending" | "Approved" | "Rejected";

export type ApplianceStatus = "Operational" | "At Risk" | "Critical" | "Down";

export type VisitStatus = "Scheduled" | "Escalated" | "Completed" | "Cancelled";

export type AttStatus = "Present" | "Late" | "Absent";

export type RolePage = {
  id: string;
  label: string;
  icon: string;
};

export type RoleDef = {
  id: RoleId;
  name: string;
  short: string;
  icon: string;
  hierarchy: string;
  accent: string;
  pages: RolePage[];
};

export type Branch = {
  id: string | number;
  code: string;
  name: string;
  city: string;
  address: string;
  managerId: string | number;
  assistantManagerId: string | number;
  phone: string;
  email: string;
  geoRadius: number;
  shiftWindow: string;
  health: number;
  performance: number;
  todayAttendance: number;
  staffCount: number;
  workerCount: number;

  monthlyBudget: number;
  usedBudget: number;
  openIssues: number;
  criticalAlerts: number;
  applianceRisk: number;
  auditScore: number;
  lastVisit: string;
  nextVisit: string;
  revenueIndex: number;
  customerFootfall: number;
  sla: number;
};

export type User = {
  id: string | number;
  name: string;
  role: RoleId;
  branchId: string | number;
  branchScope?: (string | number)[];
  position: string;
  phone: string;
  email: string;
  shift: string;
  joinDate: string;
  status: string;
  rating: number;
  attendancePct: number;
  tasksClosed: number;
  proofRate: number;
  escalations: number;
  managerId: string | number | null;
  salary: number;
  lastCheckIn: string;
  skills: string[];
  emergencyContact: string;
  documents: string[];
  deviceId: string;
};

export type Task = {
  id: string | number;
  title: string;
  branchId: string | number;
  audience: RoleId;
  schedule: string;
  priority: Priority;
  zone: string;
  deadline: string;
  assignedTo: string | number | null;
  assignedBy: string | number;
  status: TaskStatus;
  checklistDone: number;
  checklistTotal: number;
  proofRequired: boolean;
  completedBy: string | number | null;
  completedAt: string | null;
  notes: string;
  escalation: string;
  proofLabel: string;
  redoReason: string | null;
  applianceId?: string | number | null;
  proofUrl?: string | null;
};

export type Complaint = {
  id: string | number;
  complaintId: string;
  branchId: string | number;
  priority: Priority;
  status: ComplaintStatus;
  raisedById: string | number;
  raisedByName?: string;
  raisedByRole?: string;
  vendorId: string;
  vendorEmail?: string;
  assetId: string | number | null;
  assetName?: string;
  description: string;
  vendorIssueId?: string;
  attachmentUrls: string[];
  vendorRemarks?: string | null;
  resolutionNotes?: string | null;
  workOrderPdfUrl?: string | null;
  completionPdfUrl?: string | null;
  resolvedById?: string | number | null;
  resolvedByName?: string | null;
  resolvedAt: string | null;
  createdAt: string;
};

export type Appliance = {
  id: string | number;
  branchId: string | number;
  name: string;
  category: string;
  zone: string;
  brand: string;
  model: string;
  serial: string;
  healthScore: number;
  status: ApplianceStatus;
  purchaseDate: string;
  lastService: string;
  nextService: string;
  warranty: string;
  amcVendor: string;
  vendorEmail: string;
  purchaseCost: number;
  approvalStatus: string;
  pendingParts: string;
  imageUrl?: string;
};

export type Approval = {
  id: string | number;
  title: string;
  kind: string;
  branchId: string | number;
  amount: number;
  requestedBy: string | number;
  status: ApprovalStatus;
  stage: string;
  priority: Priority;
  age: string;
  note: string;
  updatedAt?: string;
};

export type Visit = {
  id: string | number;
  branchId: string | number;
  managerId: string | number;
  scheduledAt: string;
  purpose: string;
  agenda: string;
  status: VisitStatus;
  report: string;
};

export type NotificationItem = {
  id: string | number;
  title: string;
  detail: string;
  scope: RoleId[];
  branchId: string | number;
  priority: Priority;
  read: boolean;
  bookmarked: boolean;
  time: string;
};

export type AttendanceLog = {
  id: string | number;
  userId: string | number;
  date: string;
  status: AttStatus;
  checkIn: string;
  location: string;
  proof: string;
  deviation: string;
  isBranchOpening?: boolean;
  remarks?: string;
  photos?: string[];
  user?: Partial<User>;
  weeklyTasks?: WeeklyTaskItem[];
};

export type WeeklyTaskItem = {
  id: string;
  description: string;
  estimatedHours: number;
};

export type TabState = {
  lcTasks: string;
  lcBranch: string;
  managerMonitoring: string;
  managerIssues: string;
  approvals: string;
  notifications: string;
  complaints: string;
  rmAlerts: string;
  rmIntelligence: string;
  rmUsers: string;
};
