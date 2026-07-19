import type { MetadataRoute } from "next";

const SITE = "https://www.mealhq.ca";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/provider",
          "/provider/",
          "/consumer",
          "/consumer/",
          "/invite",
          "/invite/",
          "/login",
          "/signup",
          "/consumer-signup",
          "/forgot-password",
          "/reset-password",
          "/verify-email",
          "/api/",
        ],
      },
    ],
    sitemap: `${SITE}/sitemap.xml`,
    host: SITE,
  };
}
