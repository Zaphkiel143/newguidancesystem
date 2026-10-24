"use client"; // Error boundaries must be Client Components

import ErrorScreen from "../../components/ErrorScreen";

// Keeps the menu on screen when one of these pages fails.
export default function Error({ error, unstable_retry }: { error: Error & { digest?: string }; unstable_retry: () => void }) {
  return <ErrorScreen error={error} retry={unstable_retry} homePath="/student_dashboard" />;
}
