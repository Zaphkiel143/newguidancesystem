"use client";

import ReferralForm from "../../../components/ReferralForm";
import { submitReferral } from "../../action/faculty";

export default function SubmitReferralPage() {
  return (
    <div className="px-5 sm:px-8 lg:px-12 pt-8 lg:pt-12 pb-16 max-w-4xl text-slate-800">
      <header className="mb-6">
        <h1 className="page-title">Submit referral</h1>
        <p className="text-sm text-slate-500 mt-1">Refer a student to the guidance office for support. Referrals are confidential.</p>
      </header>
      <ReferralForm mode="faculty" onSubmit={submitReferral} myReferralsPath="/faculty_myreferral" />
    </div>
  );
}
