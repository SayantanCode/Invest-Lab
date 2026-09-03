import type { MetadataRoute } from "next";
import { SITE_DESCRIPTION, SITE_NAME } from "@/lib/site-config";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SITE_NAME,
    short_name: SITE_NAME,
    description: SITE_DESCRIPTION,
    start_url: "/",
    display: "standalone",
    background_color: "#f4f7ff",
    theme_color: "#315dd4",
    // icon.tsx already generates a 32x32 PNG at /icon — reused here rather
    // than duplicating another image just for the manifest.
    icons: [{ src: "/icon", sizes: "32x32", type: "image/png" }],
  };
}
