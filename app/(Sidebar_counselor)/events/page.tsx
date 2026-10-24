import { redirect } from "next/navigation";

// Events now live in the Information Service module; keep old links working
export default function EventsPage() {
  redirect("/information?tab=events");
}
