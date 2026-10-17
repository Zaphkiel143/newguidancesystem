import type { MetadataRoute } from "next";

// Lets people add E-Gabay to their phone's home screen. On iPhone this is
// required before the site can show notifications.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "E-Gabay STI",
    short_name: "E-Gabay",
    description: "Guidance and Counseling Office, STI College Sta. Maria",
    start_url: "/approve-sign-in",
    display: "standalone",
    background_color: "#f3f6fa",
    theme_color: "#0b5793",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
