import { NewProjectPageWizard } from "@/components/dashboard/new-project-page-wizard";
import { PageTransition } from "@/components/page-transition";

export default function NewProjectPage() {
  return (
    <PageTransition>
      <NewProjectPageWizard />
    </PageTransition>
  );
}
