"use client";

import ReferralForm from "../../../components/ReferralForm";
import { submitReferral } from "../../action/student";

export default function ReferStudentPage() {
  return (
    <div className="px-5 sm:px-8 lg:px-12 pt-8 lg:pt-12 pb-16 max-w-4xl text-slate-800">
      <header className="mb-6">
        <h1 className="page-title">Refer a student</h1>
        <p className="text-sm text-slate-500 mt-1">
          Ask the guidance office to reach out to you, or to someone in school who may need support. Referrals are confidential.
        </p>
      </header>
      <ReferralForm mode="student" onSubmit={submitReferral} myReferralsPath="/my_referrals" />
    </div>
  );
}
