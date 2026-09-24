import { handleApplication, str, validEmail } from "@/lib/applications";

const HAIR_TYPES = new Set(["1a","1b","1c","2a","2b","2c","3a","3b","3c","4a","4b","4c"]);

export async function POST(request: Request) {
  return handleApplication(request, {
    type: "stylist",
    table: "stylist_applications",
    parse: (body) => {
      const displayName = str(body, "display_name", 200);
      const contact = str(body, "contact_name", 200);
      const email = str(body, "email", 254).toLowerCase();
      const city = str(body, "city", 100);
      if (!displayName || !contact || !city || !validEmail(email)) {
        return { ok: false, message: "Display name, contact name, city and a valid email are required." };
      }
      const phone = str(body, "phone", 40);
      const neighborhood = str(body, "neighborhood", 100);
      const salon = str(body, "salon_name", 200);
      const website = str(body, "website", 300);
      const instagram = str(body, "instagram", 100);
      const bio = str(body, "bio", 3000);
      const why = str(body, "why_qoyl", 3000);

      const years = Number(body.years_experience);
      const yearsExperience =
        body.years_experience !== "" && body.years_experience != null && Number.isFinite(years) && years >= 0
          ? Math.floor(years)
          : null;

      const hairTypes = Array.isArray(body.hair_types_served)
        ? body.hair_types_served.filter((t): t is string => typeof t === "string" && HAIR_TYPES.has(t))
        : [];

      return {
        ok: true,
        value: {
          name: displayName,
          contactName: contact,
          email,
          row: {
            display_name: displayName,
            contact_name: contact,
            email,
            phone: phone || null,
            city,
            neighborhood: neighborhood || null,
            salon_name: salon || null,
            website: website || null,
            instagram: instagram || null,
            years_experience: yearsExperience,
            hair_types_served: hairTypes.length ? hairTypes : null,
            bio: bio || null,
            why_qoyl: why || null,
          },
          fields: [
            ["NAME", displayName],
            ["CONTACT", contact],
            ["PHONE", phone],
            ["LOCATION", [neighborhood, city].filter(Boolean).join(", ")],
            ["SALON", salon],
            ["WEBSITE", website],
            ["INSTAGRAM", instagram],
            ["EXPERIENCE", yearsExperience != null ? `${yearsExperience} years` : ""],
            ["HAIR TYPES", hairTypes.join(", ")],
            ["BIO", bio],
            ["WHY QOYL", why],
          ],
        },
      };
    },
  });
}
