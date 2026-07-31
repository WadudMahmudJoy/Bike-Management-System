export const siteConfig = {
  businessName: "Sristy-Dristy Bike House",
  legalBusinessName: "Sristy-Dristy Enterprise",
  defaultDescription:
    "A premium and trustworthy pre-owned motorcycle showroom. Properly checked, ready to ride.",
  rawSiteUrl: process.env.SITE_URL || "http://localhost:3000",
  indexingEnabled: process.env.SITE_INDEXING_ENABLED === "true",
} as const;

export function getValidatedSiteUrl(): URL {
  const urlString = process.env.SITE_URL || "http://localhost:3000";
  let url: URL;

  try {
    url = new URL(urlString);
  } catch {
    throw new Error(
      `Invalid SITE_URL configuration: "${urlString}". Must be a valid absolute URL.`
    );
  }

  if (siteConfig.indexingEnabled) {
    if (
      !process.env.SITE_URL ||
      url.hostname === "localhost" ||
      url.hostname === "127.0.0.1"
    ) {
      throw new Error(
        `SITE_INDEXING_ENABLED is set to "true", but SITE_URL ("${urlString}") is missing, localhost, or invalid. Set a valid production SITE_URL before enabling indexing.`
      );
    }
  }

  return url;
}
