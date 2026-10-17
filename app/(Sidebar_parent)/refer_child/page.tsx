"use client";

import ReferralForm from "../../../components/ReferralForm";
import { submitReferral } from "../../action/parent";
import { useMyChildren } from "../useMyChildren";

export default function ReferChildPage() {
  const children = useMyChildren();
  return (
    <div className="px-5 sm:px-8 lg:px-12 pt-8 lg:pt-12 pb-16 max-w-4xl text-slate-800">
      <header className="mb-6">
        <h1 className="page-title">Refer my child</h1>
        <p className="text-sm text-slate-500 mt-1">Ask the guidance office to check in with your child. Referrals are confidential.</p>
      </header>
      <ReferralForm mode="parent" linkedChildren={children} onSubmit={submitReferral} myReferralsPath="/parent_myreferral" />
    </div>
  );
}
