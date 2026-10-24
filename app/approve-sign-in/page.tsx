import { redirect } from "next/navigation";
import { dashboardPathForRole, getCurrentUser } from "../../lib/auth";

// Opened from the "Approve sign-in?" phone notification
export default async function ApproveSignIn() {
  const me = await getCurrentUser();
  redirect(me ? dashboardPathForRole(me.role) : "/Login");
}
