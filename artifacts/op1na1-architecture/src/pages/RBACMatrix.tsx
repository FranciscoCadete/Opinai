import { cn } from "@/lib/utils";

const ROLES = ["Admin", "Manager", "Analyst", "Technician", "Citizen"] as const;

type Permission = "C" | "R" | "U" | "D" | "C/U" | "—";

interface Row {
  resource: string;
  action: string;
  admin: Permission;
  manager: Permission;
  analyst: Permission;
  technician: Permission;
  citizen: Permission;
}

const ROWS: Row[] = [
  { resource: "Users", action: "Create", admin: "C", manager: "—", analyst: "—", technician: "—", citizen: "—" },
  { resource: "Users", action: "Read All", admin: "R", manager: "R", analyst: "R", technician: "—", citizen: "—" },
  { resource: "Users", action: "Read Own", admin: "R", manager: "R", analyst: "R", technician: "R", citizen: "R" },
  { resource: "Users", action: "Update Any", admin: "U", manager: "U", analyst: "—", technician: "—", citizen: "—" },
  { resource: "Users", action: "Update Own", admin: "U", manager: "U", analyst: "U", technician: "U", citizen: "U" },
  { resource: "Users", action: "Deactivate", admin: "D", manager: "D", analyst: "—", technician: "—", citizen: "—" },
  { resource: "Reports", action: "Submit", admin: "C", manager: "C", analyst: "C", technician: "C", citizen: "C" },
  { resource: "Reports", action: "Read All", admin: "R", manager: "R", analyst: "R", technician: "R", citizen: "—" },
  { resource: "Reports", action: "Read Own", admin: "R", manager: "R", analyst: "R", technician: "R", citizen: "R" },
  { resource: "Reports", action: "Update Status", admin: "U", manager: "U", analyst: "—", technician: "U", citizen: "—" },
  { resource: "Reports", action: "Delete", admin: "D", manager: "—", analyst: "—", technician: "—", citizen: "—" },
  { resource: "Tickets", action: "Create", admin: "C", manager: "C", analyst: "—", technician: "—", citizen: "—" },
  { resource: "Tickets", action: "Read All", admin: "R", manager: "R", analyst: "R", technician: "R", citizen: "—" },
  { resource: "Tickets", action: "Read Assigned", admin: "R", manager: "R", analyst: "R", technician: "R", citizen: "—" },
  { resource: "Tickets", action: "Update", admin: "U", manager: "U", analyst: "—", technician: "U", citizen: "—" },
  { resource: "Tickets", action: "Close", admin: "U", manager: "U", analyst: "—", technician: "—", citizen: "—" },
  { resource: "Ticket Comments", action: "Add (Internal)", admin: "C", manager: "C", analyst: "C", technician: "C", citizen: "—" },
  { resource: "Ticket Comments", action: "Add (Public)", admin: "C", manager: "C", analyst: "C", technician: "C", citizen: "—" },
  { resource: "Ticket Comments", action: "Read Internal", admin: "R", manager: "R", analyst: "R", technician: "R", citizen: "—" },
  { resource: "Notifications", action: "Send Broadcast", admin: "C", manager: "C", analyst: "—", technician: "—", citizen: "—" },
  { resource: "Notifications", action: "Send to User", admin: "C", manager: "C", analyst: "—", technician: "—", citizen: "—" },
  { resource: "Notifications", action: "Read Own", admin: "R", manager: "R", analyst: "R", technician: "R", citizen: "R" },
  { resource: "Analytics", action: "View Dashboard", admin: "R", manager: "R", analyst: "R", technician: "—", citizen: "—" },
  { resource: "Analytics", action: "Export Data", admin: "R", manager: "R", analyst: "—", technician: "—", citizen: "—" },
  { resource: "Channels", action: "Configure", admin: "C/U", manager: "—", analyst: "—", technician: "—", citizen: "—" },
  { resource: "Channels", action: "View Config", admin: "R", manager: "R", analyst: "—", technician: "—", citizen: "—" },
  { resource: "Admin", action: "Manage Roles", admin: "U", manager: "—", analyst: "—", technician: "—", citizen: "—" },
  { resource: "Admin", action: "View Audit Log", admin: "R", manager: "R", analyst: "—", technician: "—", citizen: "—" },
  { resource: "Admin", action: "System Config", admin: "U", manager: "—", analyst: "—", technician: "—", citizen: "—" },
  { resource: "Webhooks", action: "Receive (internal)", admin: "R", manager: "R", analyst: "—", technician: "—", citizen: "—" },
];

const PERM_STYLE: Record<string, string> = {
  "C": "bg-emerald-100 text-emerald-800 font-bold",
  "R": "bg-blue-100 text-blue-800",
  "U": "bg-amber-100 text-amber-800",
  "D": "bg-red-100 text-red-800 font-bold",
  "C/U": "bg-violet-100 text-violet-800 font-bold",
  "—": "text-muted-foreground/40",
};

const ROLE_HEADER_STYLE: Record<string, string> = {
  Admin: "bg-red-900 text-white",
  Manager: "bg-blue-700 text-white",
  Analyst: "bg-purple-700 text-white",
  Technician: "bg-emerald-700 text-white",
  Citizen: "bg-gray-500 text-white",
};

const LEGEND = [
  { sym: "C", label: "Create", style: "bg-emerald-100 text-emerald-800" },
  { sym: "R", label: "Read", style: "bg-blue-100 text-blue-800" },
  { sym: "U", label: "Update", style: "bg-amber-100 text-amber-800" },
  { sym: "D", label: "Delete / Deactivate", style: "bg-red-100 text-red-800" },
  { sym: "C/U", label: "Create or Update", style: "bg-violet-100 text-violet-800" },
  { sym: "—", label: "No access", style: "bg-secondary text-muted-foreground" },
];

const ROLE_DESCRIPTIONS = [
  { role: "Admin", style: "border-red-200 bg-red-50", desc: "Full system access. Manages users, roles, system config, and audit logs. Typically 1 person." },
  { role: "Manager", style: "border-blue-200 bg-blue-50", desc: "Manages operations: creates tickets, assigns staff, sends notifications, views analytics." },
  { role: "Analyst", style: "border-purple-200 bg-purple-50", desc: "Read-only access to all data and analytics. Cannot create or modify any records." },
  { role: "Technician", style: "border-emerald-200 bg-emerald-50", desc: "Field worker. Updates ticket status, adds comments. Cannot manage users or analytics." },
  { role: "Citizen", style: "border-gray-200 bg-gray-50", desc: "Submits reports and tracks their own submissions only. No access to other citizens' data." },
];

const getPermission = (row: Row, role: typeof ROLES[number]): Permission => {
  const key = role.toLowerCase() as keyof Row;
  return row[key] as Permission;
};

const resources = [...new Set(ROWS.map(r => r.resource))];

export default function RBACMatrix() {
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground mb-2">
          RBAC Permission Matrix
        </h1>
        <p className="text-muted-foreground">
          Role-Based Access Control — 5 roles, 30 resource actions.
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        {LEGEND.map((l) => (
          <div key={l.sym} className="flex items-center gap-2">
            <span className={cn("inline-block px-2 py-0.5 rounded text-xs font-mono font-bold", l.style)}>{l.sym}</span>
            <span className="text-sm text-muted-foreground">{l.label}</span>
          </div>
        ))}
      </div>

      <div className="overflow-x-auto rounded-lg border border-border shadow-sm">
        <table className="w-full text-sm" data-testid="table-rbac">
          <thead>
            <tr>
              <th className="text-left px-4 py-3 bg-secondary text-foreground font-semibold border-b border-border min-w-[140px]">Resource</th>
              <th className="text-left px-4 py-3 bg-secondary text-foreground font-semibold border-b border-border min-w-[160px]">Action</th>
              {ROLES.map((role) => (
                <th key={role} className={cn("px-4 py-3 text-center font-bold text-xs uppercase tracking-wider border-b border-border min-w-[100px]", ROLE_HEADER_STYLE[role])}>
                  {role}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {resources.map((resource) => {
              const resourceRows = ROWS.filter(r => r.resource === resource);
              return resourceRows.map((row, i) => (
                <tr key={`${resource}-${row.action}`} className={cn(
                  "border-b border-border/50 hover:bg-secondary/20 transition-colors",
                  i === 0 && "border-t-2 border-border"
                )}>
                  {i === 0 ? (
                    <td rowSpan={resourceRows.length} className="px-4 py-2.5 font-semibold text-foreground align-top border-r border-border bg-secondary/30">
                      {resource}
                    </td>
                  ) : null}
                  <td className="px-4 py-2 text-muted-foreground border-r border-border/50">{row.action}</td>
                  {ROLES.map((role) => {
                    const perm = getPermission(row, role);
                    return (
                      <td key={role} className="px-4 py-2 text-center">
                        <span className={cn("inline-block px-2 py-0.5 rounded text-xs font-mono", PERM_STYLE[perm])}>
                          {perm}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              ));
            })}
          </tbody>
        </table>
      </div>

      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">Role Descriptions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {ROLE_DESCRIPTIONS.map((r) => (
            <div key={r.role} className={cn("rounded-lg border p-4", r.style)}>
              <p className="font-semibold text-foreground mb-1">{r.role}</p>
              <p className="text-sm text-muted-foreground">{r.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
