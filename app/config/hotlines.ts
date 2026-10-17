// Crisis hotlines shown when E-Gabay detects a crisis message.
// Please double-check these numbers with the Guidance Associate each school year.
export const CRISIS_HOTLINES: { name: string; numbers: { label: string; tel: string }[] }[] = [
  {
    name: "NCMH Crisis Hotline (24/7)",
    numbers: [
      { label: "1553", tel: "1553" },
      { label: "0917 899 8727", tel: "+639178998727" },
      { label: "0966 351 4518", tel: "+639663514518" },
      { label: "0908 639 2672", tel: "+639086392672" },
    ],
  },
  {
    name: "HOPELINE (24/7)",
    numbers: [
      { label: "(02) 8804 4673", tel: "+63288044673" },
      { label: "0917 558 4673", tel: "+639175584673" },
      { label: "0918 873 4673", tel: "+639188734673" },
    ],
  },
  {
    name: "Emergency",
    numbers: [{ label: "911", tel: "911" }],
  },
];
