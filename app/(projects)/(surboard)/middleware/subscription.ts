import { NextResponse } from 'next/server';
import { getAuthenticatedSurfUser } from '@/utils/surfAuth';
import prisma from '@/lib/prisma';

// List of paths that require an active subscription
const PROTECTED_PATHS = [
  '/surfboard/dashboard/plans',
  // Add other protected paths here
];

// List of paths that are always allowed (e.g., subscription management)
const ALLOWED_PATHS = [
  '/surfboard/dashboard/subscription',
  '/surfboard/dashboard/billing',
  // Add other allowed paths here
];

export async function checkSubscription(request: Request) {
  const { pathname } = new URL(request.url);
  
  // Skip if path doesn't require subscription check
  if (!PROTECTED_PATHS.some(path => pathname.startsWith(path))) {
    return NextResponse.next();
  }
  
  // Allow access to subscription and billing pages
  if (ALLOWED_PATHS.some(path => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  try {
    const user = await getAuthenticatedSurfUser();
    if (!user) {
      // Redirect to login if not authenticated
      const loginUrl = new URL('/surfboard/login', request.url);
      loginUrl.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(loginUrl);
    }
    
    // Check if user has an active subscription
    const subscription = await prisma.subscription.findFirst({
      where: {
        userId: user.id,
        status: 'active',
        currentEnd: {
          gte: new Date(),
        },
      },
    });
    
    if (!subscription) {
      // Redirect to subscription page if no active subscription
      const subscriptionUrl = new URL('/surfboard/dashboard/subscription', request.url);
      subscriptionUrl.searchParams.set('required', 'true');
      return NextResponse.redirect(subscriptionUrl);
    }
    
    return NextResponse.next();
  } catch (error) {
    console.error('Subscription check error:', error);
    // Allow access in case of errors to prevent blocking users
    return NextResponse.next();
  }
}
