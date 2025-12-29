'use client';

import { useRouter } from 'next/navigation';
import { signOutAction } from '@/lib/actions/auth';

interface SignOutButtonProps {
  className?: string;
  children?: React.ReactNode;
}

export function SignOutButton({ className, children }: SignOutButtonProps) {
  const router = useRouter();

  const handleSignOut = async () => {
    await signOutAction();
    router.push('/sign-in');
    router.refresh();
  };

  return (
    <button
      onClick={handleSignOut}
      className={className ?? 'text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'}
    >
      {children ?? 'Sign out'}
    </button>
  );
}
