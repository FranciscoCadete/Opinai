import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Layout from "@/components/layout";
import Overview from "@/pages/Overview";
import C4Architecture from "@/pages/C4Architecture";
import ERDSchema from "@/pages/ERDSchema";
import APIContract from "@/pages/APIContract";
import RBACMatrix from "@/pages/RBACMatrix";
import FolderStructure from "@/pages/FolderStructure";
import AlembicMigrations from "@/pages/AlembicMigrations";
import AuthModule from "@/pages/AuthModule";
import ReportsModule from "@/pages/ReportsModule";
import NotificationEngine from "@/pages/NotificationEngine";
import NLPPipeline from "@/pages/NLPPipeline";
import CrisisDetection from "@/pages/CrisisDetection";
import MobileSubmitForm from "@/pages/MobileSubmitForm";
import AdminDashboard from "@/pages/AdminDashboard";
import MunicipalityConfig from "@/pages/MunicipalityConfig";
import DeploymentGuide from "@/pages/DeploymentGuide";
import TestingStrategy from "@/pages/TestingStrategy";

const queryClient = new QueryClient();

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Overview} />
        <Route path="/overview" component={Overview} />
        <Route path="/c4-architecture" component={C4Architecture} />
        <Route path="/erd-schema" component={ERDSchema} />
        <Route path="/api-contract" component={APIContract} />
        <Route path="/rbac-matrix" component={RBACMatrix} />
        <Route path="/folder-structure" component={FolderStructure} />
        <Route path="/alembic-migrations" component={AlembicMigrations} />
        <Route path="/auth-module" component={AuthModule} />
        <Route path="/reports-module" component={ReportsModule} />
        <Route path="/notification-engine" component={NotificationEngine} />
        <Route path="/nlp-pipeline" component={NLPPipeline} />
        <Route path="/crisis-detection" component={CrisisDetection} />
        <Route path="/mobile-submit" component={MobileSubmitForm} />
        <Route path="/municipality-config" component={MunicipalityConfig} />
        <Route path="/admin-dashboard"  component={AdminDashboard} />
        <Route path="/deployment-guide" component={DeploymentGuide} />
        <Route path="/testing-strategy" component={TestingStrategy} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
