import { PageTransition } from "@/components/page-transition";
import { Profile } from "@/components/dashboard/profile";

export default function ProfilePage() {
  return (
    <PageTransition>
      <Profile />
    </PageTransition>
  );
}
