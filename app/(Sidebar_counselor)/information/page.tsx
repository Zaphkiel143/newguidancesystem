import InformationModule from "./InformationModule";

export default async function InformationServicePage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { tab } = await searchParams;
  return <InformationModule initialTab={tab === "events" ? "events" : "announcements"} />;
}
