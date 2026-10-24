"use client";

import ReferralForm from "../../../components/ReferralForm";
import { submitReferral } from "../../action/parent";

// "Refer someone": parents can tell the guidance office about any student
// they're worried about (the path stays /refer_child for older links).
export default function ReferSomeonePage() {
  return (
    <div className="px-5 sm:px-8 lg:px-12 pt-8 lg:pt-12 pb-16 max-w-4xl text-slate-800">
      <header className="mb-6">
        <h1 className="page-title">Refer someone</h1>
      </header>
      <ReferralForm mode="parent" onSubmit={submitReferral} myReferralsPath="/parent_myreferral" />
    </div>
  );
}
