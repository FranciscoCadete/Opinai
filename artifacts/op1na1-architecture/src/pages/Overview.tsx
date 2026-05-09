export default function Overview() {
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground mb-2">
          OP1NA1 — Omnichannel Citizen Participation Platform
        </h1>
        <p className="text-lg text-muted-foreground">
          Municipality of Mulenvos, Luanda, Angola
        </p>
      </div>

      <div className="prose prose-slate max-w-none">
        <p className="text-base leading-relaxed text-foreground">
          A monolithic, modular FastAPI + Python + SQLAlchemy + MySQL platform enabling citizens to report civic issues and interact with municipal services across 6 input channels: WhatsApp, Facebook Messenger, SMS, USSD, Web Portal, and Mobile App.
        </p>

        <h3 className="text-xl font-semibold mt-8 mb-4">Design principles:</h3>
        <ul className="space-y-2 list-disc pl-5">
          <li>Monolith-first, modular code — no microservices</li>
          <li>MySQL only — no NoSQL at this stage</li>
          <li>Runs on 2GB RAM Ubuntu VPS with Nginx reverse proxy</li>
          <li>Offline-resilient: async queue for low-connectivity scenarios</li>
          <li>Team: 1–3 developers</li>
          <li>Budget: Minimal</li>
        </ul>

        <div className="mt-10 p-5 bg-card border border-border rounded-lg shadow-sm">
          <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3">Stack</h4>
          <div className="flex flex-wrap gap-2">
            {["FastAPI", "Python 3.11", "SQLAlchemy 2.x", "Alembic", "MySQL 8.x", "Celery + Redis", "Nginx", "Ubuntu 22.04 LTS"].map((tech) => (
              <span key={tech} className="px-3 py-1 bg-secondary text-secondary-foreground text-sm rounded-md font-medium">
                {tech}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
