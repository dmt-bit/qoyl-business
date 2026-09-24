import { handleApplication, str, validEmail } from "@/lib/applications";
import { PRODUCT_TYPES, isStringArray } from "@/lib/hairSeller";

// Goes into fake_hair_brand_applications (status 'pending'); admin approval
// promotes it to fake_hair_brand_accounts and creates the login -- the same
// two-step flow every other account type uses. There is one plan ($35/mo),
// so no tier is accepted; the table's tier column keeps its 'standard'
// default.
export async function POST(request: Request) {
  return handleApplication(request, {
    type: "hair_seller",
    table: "fake_hair_brand_applications",
    parse: (body) => {
      // brand_name kept as an alias for older callers of this endpoint.
      const company = str(body, "company_name", 200) || str(body, "brand_name", 200);
      const contact = str(body, "contact_name", 200);
      const email = str(body, "email", 254).toLowerCase();
      if (!company || !contact || !validEmail(email)) {
        return { ok: false, message: "Company name, contact name and a valid email are required." };
      }

      const productTypes = body.product_types ?? [];
      if (!isStringArray(productTypes) || productTypes.some((t) => !(PRODUCT_TYPES as readonly string[]).includes(t))) {
        return { ok: false, message: `product_types must be a subset of: ${PRODUCT_TYPES.join(", ")}.` };
      }
      const stylesServed = body.styles_served ?? [];
      if (!isStringArray(stylesServed)) {
        return { ok: false, message: "styles_served must be an array of strings." };
      }

      const website = str(body, "website", 300);
      const instagram = str(body, "instagram_handle", 100);
      const productCount = str(body, "product_count", 20);
      const why = str(body, "why_qoyl", 3000);

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
            why_qoyl: why || null,
            product_types: productTypes.length ? productTypes : null,
            styles_served: stylesServed.length ? stylesServed : null,
          },
          fields: [
            ["BRAND", company],
            ["CONTACT", contact],
            ["WEBSITE", website],
            ["INSTAGRAM", instagram],
            ["PRODUCTS", productCount],
            ["PRODUCT TYPES", productTypes.join(", ")],
            ["STYLES SERVED", stylesServed.join(", ")],
            ["WHY QOYL", why],
          ],
        },
      };
    },
  });
}
