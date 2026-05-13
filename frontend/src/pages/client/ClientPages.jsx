import { useApp } from "../../context/AppContext";
import { C } from "../../constants";
import { Card, PageTitle } from "../../components/UI";
import { animationStyles } from "../../utils/animations";

export function ClientDashboard() {
  const { user } = useApp();

  return (
    <div>
      <style>{animationStyles}</style>
      <div style={{ animation: "riseIn 0.6s ease-out backwards" }}>
        <PageTitle title="Client Dashboard" subtitle={`Welcome to ${user.agency || "TechStaff Ltd"}`} />
      </div>
      <Card style={{ animation: "scaleIn 0.5s ease-out 0.1s backwards" }}>
        <div style={{ fontSize: "13px", color: C.muted, lineHeight: "1.6", animation: "fadeIn 0.6s ease-out 0.2s backwards" }}>
          <p style={{ margin: "0 0 16px 0" }}>
            Welcome to your client portal. Here you can track your project deliverables and invoices.
          </p>
          <p style={{ margin: "0 0 16px 0" }}>
            For any new work assignments or project requirements, please contact your agency directly.
          </p>
          <p style={{ margin: "0" }}>
            Use the navigation menu to view your deliverables and invoices.
          </p>
        </div>
      </Card>
    </div>
  );
}