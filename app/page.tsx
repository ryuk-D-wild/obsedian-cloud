import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { FileText } from 'lucide-react';

/**
 * Landing Page
 * Redirects authenticated users to dashboard, shows landing for guests
 */
export default async function Home() {
  const session = await auth();
  
  if (session?.user) {
    redirect('/dashboard');
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-8">
      <div className="text-center max-w-2xl">
        <div className="flex items-center justify-center gap-3 mb-6">
          <FileText className="w-12 h-12 text-black dark:text-white" />
          <h1 className="text-4xl font-bold text-black dark:text-white">Obsidian Cloud</h1>
        </div>
        
        <p className="text-xl text-muted-foreground mb-8">
          A collaborative document editor with real-time sync, 
          slash commands, and offline support.
        </p>

        <div className="flex gap-4 justify-center mb-12">
          <Button asChild size="lg" className="bg-black text-white hover:bg-gray-800">
            <Link href="/sign-in">Sign In</Link>
          </Button>
          <Button asChild size="lg" className="bg-black text-white hover:bg-gray-800">
            <Link href="/sign-up">Sign Up</Link>
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
          <div className="p-4 rounded-lg border border-border">
            <h3 className="font-semibold mb-2">Real-time Collaboration</h3>
            <p className="text-sm text-muted-foreground">
              Work together with your team in real-time using CRDT technology.
            </p>
          </div>
          <div className="p-4 rounded-lg border border-border">
            <h3 className="font-semibold mb-2">Slash Commands</h3>
            <p className="text-sm text-muted-foreground">
              Type / to access formatting options and insert blocks quickly.
            </p>
          </div>
          <div className="p-4 rounded-lg border border-border">
            <h3 className="font-semibold mb-2">Offline Support</h3>
            <p className="text-sm text-muted-foreground">
              Keep working offline and sync when you reconnect.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
