import type { ReactNode } from "react";
import loginHero from "@/assets/login-hero.jpg";

interface AuthLayoutProps {
  children: ReactNode;
}

/**
 * Responsive auth shell.
 * - Mobile (<768px): white background, form-first card near top.
 * - Tablet (≥768px): soft yellow background, centered card.
 * - Desktop (≥1024px): 50/50 split — branded hero on the left, form on the right.
 */
export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="flex min-h-screen w-full bg-background md:bg-yellow-50">
      {/* Left column — desktop only */}
      <aside className="relative hidden lg:block lg:w-1/2">
        <img
          src={loginHero}
          alt="A learner in a yellow t-shirt and wireless headphones attending a live FishTrippers AI class on her laptop."
          width={1024}
          height={1536}
          className="absolute inset-0 h-full w-full object-cover"
        />
      </aside>

      {/* Right column — form */}
      <main className="flex w-full flex-col items-center justify-start px-4 pt-6 pb-6 md:pt-10 md:pb-16 lg:w-1/2 lg:pb-10">
        <div className="flex w-full max-w-md flex-col items-center">
          <div className="w-full">{children}</div>
        </div>
      </main>
    </div>
  );
}

export default AuthLayout;
