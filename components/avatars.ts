// Ten drawn avatars anyone can use instead of a photo or their initials: five
// with hairstyles usually seen on men, five usually seen on women. Picking one
// saves it as an ordinary profile photo (a PNG), so the rest of the app needs
// nothing special to show it.

export type AvatarStyle = { id: string; label: string; group: "male" | "female"; svg: string };

const INK = "#2b2b2b";

function face(o: { bg: string; skin: string; shirt: string; hairBack?: string; hairFront: string }) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
<rect width="100" height="100" fill="${o.bg}"/>
${o.hairBack ?? ""}
<path d="M18 100 Q18 72 50 69 Q82 72 82 100Z" fill="${o.shirt}"/>
<rect x="43" y="55" width="14" height="16" rx="6" fill="${o.skin}"/>
<path d="M43 64 Q50 69 57 64 L57 71 Q50 74 43 71Z" fill="#000" opacity=".08"/>
<circle cx="32.5" cy="46" r="3.5" fill="${o.skin}"/>
<circle cx="67.5" cy="46" r="3.5" fill="${o.skin}"/>
<ellipse cx="50" cy="44" rx="17" ry="19" fill="${o.skin}"/>
<circle cx="43" cy="46" r="1.9" fill="${INK}"/>
<circle cx="57" cy="46" r="1.9" fill="${INK}"/>
<path d="M44.5 53.5 Q50 57.5 55.5 53.5" stroke="${INK}" stroke-width="1.6" fill="none" stroke-linecap="round"/>
${o.hairFront}
</svg>`;
}

const SKIN = ["#f6d5b8", "#eabf98", "#d6a077", "#b57d52", "#8d5b39"];

export const AVATARS: AvatarStyle[] = [
  {
    id: "m1",
    label: "Short hair",
    group: "male",
    svg: face({ bg: "#d6ecf9", skin: SKIN[1], shirt: "#0b5793", hairFront: `<path d="M33 42 Q32 22 50 22 Q68 22 67 42 Q63 31 50 30 Q37 31 33 42Z" fill="#2a1c12"/>` }),
  },
  {
    id: "m2",
    label: "Side part",
    group: "male",
    svg: face({ bg: "#fff5cc", skin: SKIN[2], shirt: "#4f8a5c", hairFront: `<path d="M33 44 Q30 21 52 20 Q70 22 67 44 Q64 30 57 29 Q46 34 36 33 Q34 38 33 44Z" fill="#1b130d"/>` }),
  },
  {
    id: "m3",
    label: "Curly hair",
    group: "male",
    svg: face({
      bg: "#eef7f0",
      skin: SKIN[4],
      shirt: "#c07d2c",
      hairFront: `<g fill="#120c08"><circle cx="36" cy="33" r="7"/><circle cx="44" cy="27" r="8"/><circle cx="55" cy="26" r="8"/><circle cx="64" cy="32" r="7"/><circle cx="40" cy="36" r="4.5"/><circle cx="60" cy="36" r="4.5"/></g>`,
    }),
  },
  {
    id: "m4",
    label: "Buzz cut",
    group: "male",
    svg: face({ bg: "#edf1f6", skin: SKIN[3], shirt: "#334156", hairFront: `<path d="M34 39 Q35 24 50 24 Q65 24 66 39 Q60 31 50 31 Q40 31 34 39Z" fill="#2a1c12" opacity=".9"/>` }),
  },
  {
    id: "m5",
    label: "Quiff",
    group: "male",
    svg: face({ bg: "#fdf3e6", skin: SKIN[0], shirt: "#823429", hairFront: `<path d="M33 42 Q31 24 45 21 Q52 13 63 19 Q70 26 67 42 Q63 31 52 30 Q41 31 33 42Z" fill="#5a3a22"/>` }),
  },
  {
    id: "f1",
    label: "Long straight hair",
    group: "female",
    svg: face({
      bg: "#fdeeec",
      skin: SKIN[1],
      shirt: "#b44c40",
      hairBack: `<path d="M30 44 Q29 20 50 20 Q71 20 70 44 L72 80 Q50 86 28 80Z" fill="#1b130d"/>`,
      hairFront: `<path d="M33 41 Q35 23 50 23 Q65 23 67 41 Q58 31 50 32 Q42 31 33 41Z" fill="#1b130d"/>`,
    }),
  },
  {
    id: "f2",
    label: "Bob cut",
    group: "female",
    svg: face({
      bg: "#d6ecf9",
      skin: SKIN[2],
      shirt: "#0e6aa8",
      hairBack: `<path d="M29 46 Q28 20 50 20 Q72 20 71 46 Q71 61 64 63 L36 63 Q29 61 29 46Z" fill="#3b2416"/>`,
      hairFront: `<path d="M32 44 Q33 23 50 23 Q67 23 68 44 Q66 33 56 31 Q44 34 32 44Z" fill="#3b2416"/>`,
    }),
  },
  {
    id: "f3",
    label: "Ponytail",
    group: "female",
    svg: face({
      bg: "#fff5cc",
      skin: SKIN[3],
      shirt: "#4f8a5c",
      hairBack: `<path d="M62 28 Q82 38 74 70 Q69 52 61 40Z" fill="#120c08"/>`,
      hairFront: `<path d="M33 42 Q32 22 50 22 Q68 22 67 42 Q62 30 50 29 Q38 30 33 42Z" fill="#120c08"/>`,
    }),
  },
  {
    id: "f4",
    label: "Hair bun",
    group: "female",
    svg: face({
      bg: "#eef7f0",
      skin: SKIN[0],
      shirt: "#9a6222",
      hairBack: `<circle cx="50" cy="17" r="8.5" fill="#5a3a22"/>`,
      hairFront: `<path d="M33 42 Q32 22 50 22 Q68 22 67 42 Q62 30 50 29 Q38 30 33 42Z" fill="#5a3a22"/>`,
    }),
  },
  {
    id: "f5",
    label: "Long wavy hair",
    group: "female",
    svg: face({
      bg: "#edf1f6",
      skin: SKIN[4],
      shirt: "#45546a",
      hairBack: `<path d="M29 44 Q25 19 50 18 Q75 19 71 44 Q77 62 70 80 Q50 88 30 80 Q23 62 29 44Z" fill="#120c08"/>`,
      hairFront: `<path d="M33 43 Q33 22 52 22 Q68 23 67 41 Q60 28 48 31 Q40 33 33 43Z" fill="#120c08"/>`,
    }),
  },
];

export const avatarDataUrl = (a: AvatarStyle) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(a.svg)}`;

// Draws an avatar to a 512px PNG and returns it as base64 (no data: prefix).
export function avatarPngBase64(a: AvatarStyle): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = 512;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("Canvas unavailable"));
      ctx.drawImage(img, 0, 0, 512, 512);
      resolve(canvas.toDataURL("image/png").split(",")[1] ?? "");
    };
    img.onerror = () => reject(new Error("Couldn't draw the avatar"));
    img.src = avatarDataUrl(a);
  });
}
