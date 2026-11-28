import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

// TEMPORARY: probe catalog_products schema — delete after use
export async function GET() {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("catalog_products")
    .select("*")
    .limit(1);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data || data.length === 0) return NextResponse.json({ columns: [], note: "no rows" });
  return NextResponse.json({ columns: Object.keys(data[0]), sample: data[0] });
}
