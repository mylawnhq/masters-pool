import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * POST /api/send-confirmation
 *
 * Sends a confirmation email via Resend when configured.
 * If RESEND_API_KEY is not set, silently returns success (no-op).
 * This is intentionally non-blocking — the entry form fires and forgets.
 */
export async function POST(request) {
  // If Resend is not configured, skip silently
  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ sent: false, reason: 'RESEND_API_KEY not configured' });
  }

  try {
    const { name, email, picks, tiebreakers } = await request.json();

    if (!name || !email) {
      return NextResponse.json({ error: 'Missing name or email' }, { status: 400 });
    }

    const pickLines = [
      `Group 1: ${picks?.g1 || 'N/A'}`,
      `Group 2A: ${picks?.g2a || 'N/A'}`,
      `Group 2B: ${picks?.g2b || 'N/A'}`,
      `Group 3A: ${picks?.g3a || 'N/A'}`,
      `Group 3B: ${picks?.g3b || 'N/A'}`,
      `Group 4: ${picks?.g4 || 'N/A'}`,
    ].join('\n');

    const body = [
      `Hey ${name.split(' ')[0]}!`,
      '',
      `Your picks for the Masters Pool 2026 have been received. Here's what you submitted:`,
      '',
      pickLines,
      '',
      `Low Amateur: ${tiebreakers?.lowAmateur || 'N/A'}`,
      `Winning Score: ${tiebreakers?.winningScore || 'N/A'}`,
      '',
      `Your entry is pending payment confirmation. Once Alex verifies your Venmo payment, you'll be officially in the pool.`,
      '',
      `Good luck!`,
      `\u2014 Mendoza's Masters Pool`,
    ].join('\n');

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: process.env.RESEND_FROM_EMAIL || 'Masters Pool <noreply@mendozasmasters.com>',
        to: [email],
        subject: "You're in the queue \u2014 Masters Pool 2026",
        text: body,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error('Resend API error:', err);
      return NextResponse.json({ sent: false, error: 'Email send failed' });
    }

    return NextResponse.json({ sent: true });
  } catch (err) {
    console.error('Send confirmation error:', err);
    return NextResponse.json({ sent: false, error: err.message });
  }
}
