import type { MetadataRoute } from "next";
import { siteConfig, getValidatedSiteUrl } from "@/lib/site-config";

export default function sitemap(): MetadataRoute.Sitemap {
  if (!siteConfig.indexingEnabled) {
    return [];
  }

  const baseUrl = getValidatedSiteUrl().toString().replace(/\/$/, "");

  return [
    {
      url: `${baseUrl}/`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1.0,
    },
  ];
}
