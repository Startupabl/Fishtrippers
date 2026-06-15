import { useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";

type Tab = "signin" | "signup";

/**
 * Top tab navigation for the auth pages.
 * Plain text links; active tab is bold with a brand-green underline.
 *
 * Active styling is driven by local React state (seeded from the current
 * pathname) so the highlight flips instantly on click, before the route
 * finishes navigating. Deep-linking to /register still renders the correct
 * tab as active on first paint.
 */
export function AuthTabs() {
  const pathname = useRouterState({
    select: (s) => s.location.pathname,
  });
  const [activeTab, setActiveTab] = useState<Tab>(
    pathname.startsWith("/register") ? "signup" : "signin",
  );

  const tabBase =
    "relative pb-3 text-base transition-colors border-b-[3px] focus-visible:outline-none";
  const activeClass = "text-[#3DA35D] font-bold border-[#3DA35D]";
  const inactiveClass =
    "text-gray-500 font-medium border-transparent hover:text-[#3DA35D] hover:font-semibold";

  return (
    <nav
      aria-label="Authentication"
      className="mb-6 flex items-center justify-center gap-8"
    >
      <Link
        to="/login"
        className={`${tabBase} ${
          activeTab === "signin" ? activeClass : inactiveClass
        }`}
        onClick={() => setActiveTab("signin")}
        preload="intent"
      >
        Sign In
      </Link>
      <Link
        to="/register"
        className={`${tabBase} ${
          activeTab === "signup" ? activeClass : inactiveClass
        }`}
        onClick={() => setActiveTab("signup")}
        preload="intent"
      >
        Sign Up
      </Link>
    </nav>
  );
}

export default AuthTabs;
