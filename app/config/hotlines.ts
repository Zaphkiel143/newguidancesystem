// Crisis hotlines shown when E-Gabay detects a crisis message.
// Confirmed by the Guidance Associate (Ms. Eslie Rose Clemente), October 2026.
// Please double-check these numbers with the Guidance Associate each school year.
export const CRISIS_HOTLINES: { name: string; numbers: { label: string; tel: string }[] }[] = [
  {
    name: "Emergency",
    numbers: [{ label: "911", tel: "911" }],
  },
  {
    name: "NCMH Crisis Hotline (National Center for Mental Health)",
    numbers: [
      { label: "1553", tel: "1553" },
      { label: "0917 899 8727", tel: "+639178998727" },
      { label: "0919 057 1553", tel: "+639190571553" },
    ],
  },
];
