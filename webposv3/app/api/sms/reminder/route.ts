import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import twilio from "twilio";

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json(
        { error: "Server authentication is not configured." },
        { status: 500 },
      );
    }

    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set() {},
        remove() {},
      },
    });

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role, is_approved")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    if (profile.role !== "admin" && profile.role !== "cashier") {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    if (profile.role === "cashier" && profile.is_approved === false) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const { to, customerName, amount, dueDate } = await request.json();
    const normalizedTo =
      typeof to === "string" ? to.trim().replace(/[^\d+]/g, "") : "";
    const normalizedCustomerName =
      typeof customerName === "string" ? customerName.trim() : "";
    const normalizedAmount = Number(amount);

    if (!normalizedTo || !normalizedCustomerName || !Number.isFinite(normalizedAmount)) {
      return NextResponse.json(
        { error: "Missing required fields." },
        { status: 400 },
      );
    }

    if (!/^\+?[1-9]\d{7,14}$/.test(normalizedTo)) {
      return NextResponse.json(
        { error: "Invalid phone number format." },
        { status: 400 },
      );
    }

    if (normalizedCustomerName.length > 80) {
      return NextResponse.json(
        { error: "Customer name is too long." },
        { status: 400 },
      );
    }

    if (normalizedAmount <= 0) {
      return NextResponse.json(
        { error: "Amount must be greater than 0." },
        { status: 400 },
      );
    }

    const sid = process.env.TWILIO_ACCOUNT_SID;
    const token = process.env.TWILIO_AUTH_TOKEN;
    const from = process.env.TWILIO_FROM_NUMBER;

    if (!sid || !token || !from) {
      return NextResponse.json(
        {
          error:
            "SMS is not configured. Add TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_FROM_NUMBER.",
        },
        { status: 500 },
      );
    }

    const client = twilio(sid, token);
    const dueText = dueDate ? ` Due date: ${new Date(dueDate).toLocaleDateString()}.` : "";
    const body = `Hi ${normalizedCustomerName}, this is a reminder from POSPRO. Your outstanding credit is PHP ${normalizedAmount.toFixed(2)}.${dueText} Please settle at your earliest convenience.`;

    await client.messages.create({
      to: normalizedTo,
      from,
      body,
    });

    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to send SMS.";
    return NextResponse.json(
      { error: message },
      { status: 500 },
    );
  }
}

