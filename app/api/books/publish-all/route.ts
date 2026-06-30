import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export async function POST() {
  try {
    const supabase = await createServiceClient();
    const { error } = await supabase.from("books").update({ is_published: true }).eq("is_published", false);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
