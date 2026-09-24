import { handleApplication, str, validEmail } from "@/lib/applications";
import { BRAND_TIERS, isBrandTier } from "@/lib/accountTypes";

export async function POST(request: Request) {
  return handleApplication(request, {
    type: "brand",
    table: "brand_applications",
    // requested_tier comes from supabase/add_brand_requested_tier.sql.
    optionalColumns: ["requested_tier"],
    parse: (body) => {
      const company = str(body, "company_name", 200);
      const contact = str(body, "contact_name", 200);
      const email = str(body, "email", 254).toLowerCase();
      if (!company || !contact || !validEmail(email)) {
        return { ok: false, message: "Company name, contact name and a valid email are required." };
      }
      const website = str(body, "website", 300);
      const instagram = str(body, "instagram_handle", 100);
      const productCount = str(body, "product_count", 20);
      const revenue = str(body, "annual_revenue", 50);
      const why = str(body, "why_qoyl", 3000);
      const tier = isBrandTier(body.requested_tier) ? body.requested_tier : null;

      return {
        ok: true,
        value: {
          name: company,
          contactName: contact,
          email,
          row: {
            company_name: company,
            contact_name: contact,
            email,
            website: website || null,
            instagram_handle: instagram || null,
            product_count: productCount || null,
            annual_revenue: revenue || null,
            why_qoyl: why || null,
            requested_tier: tier,
          },
          fields: [
            ["COMPANY", company],
            ["CONTACT", contact],
            ["PLAN", tier ? `${BRAND_TIERS[tier].label} (${BRAND_TIERS[tier].price})` : ""],
            ["WEBSITE", website],
            ["INSTAGRAM", instagram],
            ["PRODUCTS", productCount],
            ["REVENUE", revenue],
            ["WHY QOYL", why],
          ],
        },
      };
    },
  });
}
