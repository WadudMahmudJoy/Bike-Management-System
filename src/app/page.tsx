const NAV_ITEMS = [
  { label: "Home", href: "/" },
  { label: "Available Bikes", href: "/bikes" },
  { label: "Offers", href: "/offers" },
  { label: "Sell Your Bike", href: "/sell-your-bike" },
  { label: "Request a Bike", href: "/request-a-bike" },
  { label: "Contact", href: "/contact" },
] as const;

export default function HomePage() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Navigation */}
      <header className="border-b border-graphite-light/30">
        <nav className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex-shrink-0">
              <span className="text-xl font-bold tracking-tight text-warm-ivory">
                Sristy-Dristy
              </span>
            </div>

            {/* Desktop navigation */}
            <div className="hidden md:flex md:items-center md:gap-8">
              {NAV_ITEMS.map((item) => (
                <span
                  key={item.href}
                  className="text-sm text-soft-white transition-colors duration-200 hover:text-champagne cursor-default"
                >
                  {item.label}
                </span>
              ))}
            </div>

            {/* Mobile menu indicator */}
            <div className="flex md:hidden">
              <span className="text-soft-white text-sm">Menu</span>
            </div>
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <main className="flex-1">
        <section className="relative flex items-center justify-center px-4 py-24 sm:py-32 lg:py-40">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="text-4xl font-bold tracking-tight text-warm-ivory sm:text-5xl lg:text-6xl">
              Sristy-Dristy Bike House
            </h1>

            <p className="mt-6 text-lg font-medium tracking-wide text-champagne sm:text-xl">
              Pre-Owned. Properly Checked. Ready to Ride.
            </p>

            <div className="mt-10 rounded-xl border border-graphite-light bg-graphite/60 px-8 py-8 sm:px-12">
              <p className="text-base leading-relaxed text-soft-white sm:text-lg">
                A premium and trustworthy pre-owned motorcycle showroom is being
                prepared. We are building something exceptional for riders who
                value quality and reliability.
              </p>
            </div>

            <div className="mt-12 flex flex-col items-center gap-3 sm:flex-row sm:justify-center sm:gap-4">
              <span className="inline-flex items-center rounded-lg bg-champagne/10 px-4 py-2 text-sm text-champagne ring-1 ring-champagne/20">
                Coming Soon
              </span>
            </div>
          </div>
        </section>

        {/* Navigation Preview */}
        <section className="border-t border-graphite-light/30 bg-graphite/40 px-4 py-16 sm:py-20">
          <div className="mx-auto max-w-5xl">
            <h2 className="mb-10 text-center text-sm font-semibold uppercase tracking-widest text-champagne">
              What We Are Preparing
            </h2>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {NAV_ITEMS.filter((item) => item.href !== "/").map((item) => (
                <div
                  key={item.href}
                  className="rounded-lg border border-graphite-light/40 bg-graphite px-6 py-5 text-center transition-colors duration-200 hover:border-champagne/30"
                >
                  <span className="text-sm font-medium text-warm-ivory">
                    {item.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-graphite-light/30 px-4 py-8">
        <div className="mx-auto max-w-7xl text-center">
          <p className="text-sm text-soft-white/60">
            &copy; {new Date().getFullYear()} Sristy-Dristy Enterprise. All
            rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
