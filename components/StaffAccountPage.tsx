import PhotoPicker from "./PhotoPicker";
import AuthenticatorSetup from "./AuthenticatorSetup";
import { PushToggle } from "./LoginApproval";
import { getCurrentUser } from "../lib/auth";

export default async function StaffAccountPage() {
  const me = await getCurrentUser();
  if (!me) return null;
  return (
    <div className="px-5 sm:px-8 lg:px-12 pt-8 lg:pt-12 pb-16 max-w-3xl text-slate-800 space-y-6">
      <header>
        <h1 className="page-title">My account</h1>
        <p className="text-sm text-slate-500 mt-1 break-all">{me.name} · {me.email}</p>
      </header>
      <section className="bg-sheet border border-rule rounded-2xl p-5 sm:p-6">
        <h2 className="font-semibold text-[17px] text-ink mb-4">Profile photo</h2>
        <PhotoPicker name={me.name} hasPhoto={Boolean(me.avatarType)} />
      </section>
      <PushToggle />
      <AuthenticatorSetup />
    </div>
  );
}
