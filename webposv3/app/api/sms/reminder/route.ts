import { NextResponse } from "next/server";
import twilio from "twilio";

export async function POST(request: Request) {
  try {
    const { to, customerName, amount, dueDate } = await request.json();

    if (!to || !customerName || !amount) {
      return NextResponse.json(
        { error: "Missing required fields." },
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
    const body = `Hi ${customerName}, this is a reminder from POSPRO. Your outstanding credit is PHP ${Number(amount).toFixed(2)}.${dueText} Please settle at your earliest convenience.`;

    await client.messages.create({
      to,
      from,
      body,
    });

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to send SMS." },
      { status: 500 },
    );
  }
}

