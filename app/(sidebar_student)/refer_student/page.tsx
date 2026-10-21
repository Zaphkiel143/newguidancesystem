"use client";

import ReferralForm from "../../../components/ReferralForm";
import { submitReferral } from "../../action/student";

export default function ReferStudentPage() {
  return (
    <div className="px-5 sm:px-8 lg:px-12 pt-8 lg:pt-12 pb-16 max-w-4xl text-slate-800">
      <header className="mb-6">
        <h1 className="page-title">Submit referral</h1>
      </header>
      <ReferralForm mode="student" onSubmit={submitReferral} myReferralsPath="/my_referrals" />
    </div>
  );
}
