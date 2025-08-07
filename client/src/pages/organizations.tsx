import { AppLayout } from "@/components/layout/AppLayout";
import OrganizationPage from "./organization-simple";

export default function OrganizationsPage() {
  return (
    <AppLayout title="Organizations" activeSection="organisations">
      <OrganizationPage />
    </AppLayout>
  );
}