import { NextRequest, NextResponse } from 'next/server';

export function middleware(req: NextRequest) {
    const host = req.nextUrl.hostname;
    if (req.nextUrl.protocol !== 'https:' && host !== 'localhost' && host !== '127.0.0.1') {
        return new NextResponse('HTTPS is required', { status: 403 });
    }
    const secret = process.env.WALLET_ADMIN_TOKEN;
    const header = req.headers.get('authorization');
    let password = '';
    if (header?.startsWith('Basic ')) {
        try {
            password = atob(header.slice(6)).split(':').slice(1).join(':');
        } catch { /* invalid credentials */ }
    }

    if (!secret || secret.length < 32 || password.length !== secret.length || password !== secret) {
        return new NextResponse('Owner authentication required', {
            status: 401,
            headers: { 'WWW-Authenticate': 'Basic realm="SafeAgent Wallet"', 'Cache-Control': 'no-store' }
        });
    }

    if (req.method !== 'GET' && req.method !== 'HEAD') {
        const origin = req.headers.get('origin');
        const site = req.headers.get('sec-fetch-site');
        if ((origin && origin !== req.nextUrl.origin) || site === 'cross-site') {
            return new NextResponse('Cross-origin request rejected', { status: 403 });
        }
    }
    const response = NextResponse.next();
    response.headers.set('Cache-Control', 'no-store');
    return response;
}

export const config = {
    matcher: ['/((?!_next/static|_next/image|favicon.ico).*)']
};
