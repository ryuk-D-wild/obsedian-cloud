import { signOut } from '@/lib/auth';
import { NextResponse } from 'next/server';

/**
 * API route to handle sign-out
 * This is a Route Handler where we can modify cookies
 */
export async function POST() {
    try {
        await signOut({ redirect: false });
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('[SignOut API] Error:', error);
        return NextResponse.json({ success: false, error: 'Sign out failed' }, { status: 500 });
    }
}

export async function GET() {
    // Support GET requests for simple redirects
    try {
        await signOut({ redirectTo: '/sign-in' });
        return NextResponse.redirect(new URL('/sign-in', process.env.AUTH_URL || 'http://localhost:3000'));
    } catch (error) {
        console.error('[SignOut API] Error:', error);
        return NextResponse.redirect(new URL('/sign-in', process.env.AUTH_URL || 'http://localhost:3000'));
    }
}
