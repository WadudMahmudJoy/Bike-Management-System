import type { MetadataRoute } from "next";
import { siteConfig, getValidatedSiteUrl } from "@/lib/site-config";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = siteConfig.indexingEnabled
    ? getValidatedSiteUrl().toString().replace(/\/$/, "")
    : "http://localhost:3000";

  return [
    {
      url: `${baseUrl}/`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1.0,
    },
  ];
}
