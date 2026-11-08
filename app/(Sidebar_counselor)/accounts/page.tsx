import ParentConfirmations from "../../../components/ParentConfirmations";
import AccountsManager from "../../../components/AccountsManager";

// The Guidance Associate manages every account (there is no Super Admin).
// Handing the Guidance Associate role to someone else is in My Account.
export default function AccountsPage() {
  return (
    <div className="px-5 sm:px-8 lg:px-10 pt-8 lg:pt-10 pb-16 text-slate-800">
      <header>
        <h1 className="page-title">Accounts</h1>
      </header>
      <ParentConfirmations />
      <AccountsManager />
    </div>
  );
}
