"use client";

import React, { useState } from 'react';
import {
  AlertCircle,
  Send,
  ShieldCheck,
  Info,
  ChevronDown
} from 'lucide-react';
import { submitReferral } from '../../action/parent';

const CHILD_NAME = "Nhel Belarmino";
const PARENT_NAME = "Mrs. Belarmino";

export const ReferChildForm: React.FC = () => {
  // Form Field States
  const [concernType, setConcernType] = useState('');
  const [priorityLevel, setPriorityLevel] = useState('Medium');
  const [description, setDescription] = useState('');
  const [observedBehaviors, setObservedBehaviors] = useState('');
  const [preferredTime, setPreferredTime] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!concernType || !description) return;

    setIsSaving(true);
    setError(null);
    setSuccessMessage(null);

    const detailLines = [
      observedBehaviors && `Observed Behaviors: ${observedBehaviors}`,
      preferredTime && `Preferred Contact Time: ${preferredTime}`,
    ].filter(Boolean);

    const result = await submitReferral({
      studentName: CHILD_NAME,
      referrerName: PARENT_NAME,
      concernType,
      priority: priorityLevel,
      description: [description, ...detailLines].join("\n\n"),
    });

    setIsSaving(false);

    if (result.success) {
      setSuccessMessage('Referral submitted successfully. The Guidance Office will review it shortly.');
      setConcernType('');
      setDescription('');
      setObservedBehaviors('');
      setPreferredTime('');
    } else {
      setError(result.error || "Failed to submit referral.");
    }
  };

  return (
    <div className="px-5 sm:px-8 lg:px-12 pt-8 lg:pt-12 pb-16 max-w-4xl font-sans antialiased text-slate-800 space-y-6">
      
      {/* Page Header Titles (image_859d3c.png) */}
      <div>
        <h1 className="page-title">Refer Child to Counselor</h1>
        <p className="text-sm text-slate-500 font-medium mt-1">
          Request guidance support for your child
        </p>
      </div>

      {/* Child Information Banner (image_859d3c.png) */}
      <div className="bg-blue-50 border border-blue-100 px-5 py-4 rounded-xl text-sm font-medium text-slate-600">
        <span className="text-blue-500 font-semibold block text-xs mb-1">Child Information</span>
        <span className="text-blue-600 font-semibold">Nhel Belarmino</span>
        <span className="mx-2 text-slate-300">•</span>
        <span className="font-mono text-slate-500 text-xs">2024-12345</span>
        <span className="mx-2 text-slate-300">•</span>
        <span className="text-slate-700 font-semibold text-xs bg-white px-2 py-0.5 rounded border border-slate-100 shadow-2xs">Grade 12 - STEM-A</span>
      </div>

      {/* Confidentiality Notice Alert Banner (image_859d3c.png) */}
      <div className="bg-emerald-50 border border-emerald-50 p-4 rounded-xl flex items-start gap-3">
        <ShieldCheck className="text-emerald-600 shrink-0 mt-0.5" size={18} />
        <p className="text-sm text-emerald-700 font-medium leading-relaxed">
          All referrals are confidential and will be handled with care by the Guidance Office. The counselor will contact you to discuss the best support plan for your child.
        </p>
      </div>

      {/* Main Intake Form Container Block (image_859d3c.png & image_859d58.png) */}
      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          
          {/* Row 1: Type of Concern & Priority Level Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            
            {/* Type of Concern Select Dropdown */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700 block">
                Type of Concern <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <select
                  value={concernType}
                  onChange={(e) => setConcernType(e.target.value)}
                  required
                  className="w-full px-4 py-2.5 bg-white border border-slate-200 text-sm rounded-xl text-slate-700 appearance-none focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-medium"
                >
                  <option value="" disabled hidden>Select concern type...</option>
                  <option value="Academic Decline">Academic Decline</option>
                  <option value="Behavioral Concerns">Behavioral Concerns</option>
                  <option value="Social Withdrawal">Social Withdrawal / Emotional Distress</option>
                  <option value="Career Misalignment">Career Choice Uncertainty</option>
                </select>
                <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            </div>

            {/* Priority Level Select Dropdown */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700 block">
                Priority Level <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <select
                  value={priorityLevel}
                  onChange={(e) => setPriorityLevel(e.target.value)}
                  required
                  className="w-full px-4 py-2.5 bg-white border border-slate-200 text-sm rounded-xl text-slate-700 appearance-none focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-medium"
                >
                  <option value="Low">Low - Mild observation</option>
                  <option value="Medium">Medium - Noticeable concern</option>
                  <option value="High">High - Urgent attention needed</option>
                </select>
                <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            </div>

          </div>

          {/* Textarea: Description of Concern */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700 block">
              Description of Concern <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              placeholder="Please describe your concerns about your child. Include specific examples if possible..."
              className="w-full px-4 py-3 bg-white border border-slate-200 text-sm rounded-xl placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all resize-none leading-relaxed font-medium"
            />
          </div>

          {/* Textarea: Observed Behaviors or Changes (Optional) */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700 block">
              Observed Behaviors or Changes (Optional)
            </label>
            <textarea
              rows={3}
              value={observedBehaviors}
              onChange={(e) => setObservedBehaviors(e.target.value)}
              placeholder="Any specific behaviors or changes you've noticed (e.g., mood changes, social withdrawal, academic decline)..."
              className="w-full px-4 py-3 bg-white border border-slate-200 text-sm rounded-xl placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all resize-none leading-relaxed font-medium"
            />
          </div>

          {/* Input: Preferred Contact Time */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700 block">
              Preferred Contact Time
            </label>
            <input
              type="text"
              value={preferredTime}
              onChange={(e) => setPreferredTime(e.target.value)}
              placeholder="e.g., Weekday mornings, After 3 PM"
              className="w-full px-4 py-2.5 bg-white border border-slate-200 text-sm rounded-xl placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-medium"
            />
          </div>

          {/* Orange Callout Note Box: Emergency Situations (image_859d58.png) */}
          <div className="bg-orange-50 border border-orange-100 p-4 rounded-xl flex items-start gap-3">
            <AlertCircle className="text-orange-600 shrink-0 mt-0.5" size={18} />
            <p className="text-xs sm:text-sm text-orange-800 font-medium leading-relaxed">
              <span className="font-semibold text-orange-900">Note:</span> For emergency situations or immediate safety concerns, please contact the school office directly or call emergency services.
            </p>
          </div>

          {/* Action Form Confirmation Feedback */}
          {successMessage && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-600 text-sm font-semibold rounded-xl flex items-center gap-2">
              <Info size={16} />
              <span>{successMessage}</span>
            </div>
          )}

          {error && (
            <div className="p-4 bg-red-50 border border-red-100 text-red-600 text-sm font-semibold rounded-xl flex items-center gap-2">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          {/* Form Action Controls Section Footer (image_859d58.png) */}
          <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => {
                setConcernType('');
                setDescription('');
                setObservedBehaviors('');
                setPreferredTime('');
              }}
              className="w-full sm:w-auto px-8 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold rounded-xl text-sm transition-colors text-center"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-2.5 px-8 rounded-xl transition-colors text-sm shadow-sm text-center flex items-center justify-center gap-2"
            >
              <Send size={15} />
              {isSaving ? "Submitting..." : "Submit Referral"}
            </button>
          </div>

        </form>
      </div>

    </div>
  );
};

export default ReferChildForm;