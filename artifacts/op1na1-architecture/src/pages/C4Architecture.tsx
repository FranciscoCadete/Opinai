import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function C4Architecture() {
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground mb-4">
          C4 Architecture
        </h1>
        <p className="text-muted-foreground">
          Structural view of the OP1NA1 platform at Context, Container, and Component levels.
        </p>
      </div>

      <Tabs defaultValue="context" className="w-full">
        <TabsList className="mb-6 h-auto p-1 bg-secondary inline-flex w-full md:w-auto">
          <TabsTrigger value="context" className="px-6 py-2">Level 1: Context</TabsTrigger>
          <TabsTrigger value="container" className="px-6 py-2">Level 2: Container</TabsTrigger>
          <TabsTrigger value="component" className="px-6 py-2">Level 3: Component</TabsTrigger>
        </TabsList>

        <TabsContent value="context" className="space-y-6">
          <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
            <h2 className="text-xl font-bold mb-6">LEVEL 1 — CONTEXT DIAGRAM</h2>
            
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">Actors</h3>
                <ul className="space-y-3">
                  <li className="flex gap-3">
                    <span className="font-medium min-w-[200px] text-foreground">Citizen (external)</span>
                    <span className="text-muted-foreground">→ interacts via WhatsApp, SMS, USSD, Web Portal, Mobile App, Facebook Messenger</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="font-medium min-w-[200px] text-foreground">Municipal Staff (internal)</span>
                    <span className="text-muted-foreground">→ uses Web Admin Portal</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="font-medium min-w-[200px] text-foreground">System Administrator (internal)</span>
                    <span className="text-muted-foreground">→ manages infra and config</span>
                  </li>
                </ul>
              </div>

              <div className="pt-4 border-t border-border">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">External Systems</h3>
                <ul className="space-y-2 list-disc pl-5 text-foreground">
                  <li>Africa's Talking (SMS/USSD gateway)</li>
                  <li>WhatsApp Business API (via Twilio or 360dialog)</li>
                  <li>Facebook Messenger API</li>
                  <li>Email SMTP (Postfix or external)</li>
                  <li>Firebase Cloud Messaging (push notifications for mobile)</li>
                </ul>
              </div>

              <div className="pt-4 border-t border-border">
                <p className="font-medium flex items-center gap-2">
                  <span className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Context boundary:</span>
                  OP1NA1 Platform (monolith deployed on Ubuntu VPS)
                </p>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="container" className="space-y-6">
          <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
            <h2 className="text-xl font-bold mb-6">LEVEL 2 — CONTAINER DIAGRAM</h2>
            
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">Containers inside OP1NA1</h3>
              <ol className="space-y-4 list-decimal pl-5">
                <li className="pl-2">
                  <span className="font-medium text-foreground">Nginx Reverse Proxy (port 80/443)</span>
                  <span className="block text-muted-foreground mt-1">— TLS termination, rate limiting, static file serving</span>
                </li>
                <li className="pl-2">
                  <span className="font-medium text-foreground">FastAPI Application (port 8000)</span>
                  <span className="block text-muted-foreground mt-1">— core monolith: REST API + business logic + channel adapters</span>
                </li>
                <li className="pl-2">
                  <span className="font-medium text-foreground">Celery Worker</span>
                  <span className="block text-muted-foreground mt-1">— async task processing (notifications, heavy jobs)</span>
                </li>
                <li className="pl-2">
                  <span className="font-medium text-foreground">Redis (port 6379)</span>
                  <span className="block text-muted-foreground mt-1">— Celery broker + result backend + rate-limit cache</span>
                </li>
                <li className="pl-2">
                  <span className="font-medium text-foreground">MySQL 8.x (port 3306)</span>
                  <span className="block text-muted-foreground mt-1">— primary data store</span>
                </li>
                <li className="pl-2">
                  <span className="font-medium text-foreground">Static File Storage</span>
                  <span className="block text-muted-foreground mt-1">— local /media/ folder served via Nginx (no S3 at this stage)</span>
                </li>
              </ol>
            </div>

            <div className="mt-6 pt-4 border-t border-border">
              <p className="text-foreground bg-secondary/50 p-4 rounded-md">
                All containers run on the same Ubuntu 22.04 VPS. Systemd manages FastAPI, Celery, Redis, MySQL.
              </p>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="component" className="space-y-6">
          <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
            <h2 className="text-xl font-bold mb-6">LEVEL 3 — COMPONENT DIAGRAM (FastAPI Application)</h2>
            
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">Modules inside the FastAPI monolith</h3>
                <ul className="space-y-3 font-mono text-sm">
                  <li className="flex flex-col md:flex-row md:gap-4 border-b border-border/50 pb-2">
                    <span className="font-semibold text-foreground min-w-[180px]">app/channels/</span>
                    <span className="text-muted-foreground">— channel adapters (whatsapp.py, sms.py, ussd.py, messenger.py, web.py, mobile.py)</span>
                  </li>
                  <li className="flex flex-col md:flex-row md:gap-4 border-b border-border/50 pb-2">
                    <span className="font-semibold text-foreground min-w-[180px]">app/reports/</span>
                    <span className="text-muted-foreground">— report intake, validation, routing</span>
                  </li>
                  <li className="flex flex-col md:flex-row md:gap-4 border-b border-border/50 pb-2">
                    <span className="font-semibold text-foreground min-w-[180px]">app/tickets/</span>
                    <span className="text-muted-foreground">— ticket lifecycle management</span>
                  </li>
                  <li className="flex flex-col md:flex-row md:gap-4 border-b border-border/50 pb-2">
                    <span className="font-semibold text-foreground min-w-[180px]">app/notifications/</span>
                    <span className="text-muted-foreground">— notification dispatch (SMS, push, email)</span>
                  </li>
                  <li className="flex flex-col md:flex-row md:gap-4 border-b border-border/50 pb-2">
                    <span className="font-semibold text-foreground min-w-[180px]">app/users/</span>
                    <span className="text-muted-foreground">— user registration, profile, auth</span>
                  </li>
                  <li className="flex flex-col md:flex-row md:gap-4 border-b border-border/50 pb-2">
                    <span className="font-semibold text-foreground min-w-[180px]">app/analytics/</span>
                    <span className="text-muted-foreground">— aggregation queries, dashboard data</span>
                  </li>
                  <li className="flex flex-col md:flex-row md:gap-4 border-b border-border/50 pb-2">
                    <span className="font-semibold text-foreground min-w-[180px]">app/admin/</span>
                    <span className="text-muted-foreground">— admin-only endpoints</span>
                  </li>
                  <li className="flex flex-col md:flex-row md:gap-4 border-b border-border/50 pb-2">
                    <span className="font-semibold text-foreground min-w-[180px]">app/core/</span>
                    <span className="text-muted-foreground">— config, security, dependencies, middleware</span>
                  </li>
                  <li className="flex flex-col md:flex-row md:gap-4">
                    <span className="font-semibold text-foreground min-w-[180px]">app/tasks/</span>
                    <span className="text-muted-foreground">— Celery task definitions</span>
                  </li>
                </ul>
              </div>

              <div className="pt-6 mt-2 border-t border-border">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">Data flow</h3>
                <div className="bg-sidebar text-sidebar-foreground p-4 rounded-md font-mono text-sm overflow-x-auto whitespace-nowrap">
                  Channel Adapter → Report Service → Ticket Service → Notification Service → Celery Queue → External Gateway
                </div>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
