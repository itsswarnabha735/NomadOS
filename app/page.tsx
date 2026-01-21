import Link from "next/link";
import { Button } from "@/components/ui/button";
import { MapPin, Calendar, Globe, ArrowRight, CheckCircle2, Shield, Zap } from "lucide-react";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-white/80 backdrop-blur-md">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-primary/10 rounded-lg">
              <MapPin className="h-5 w-5 text-primary" />
            </div>
            <span className="text-xl font-bold font-heading tracking-tight">NomadOS</span>
          </div>
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-muted-foreground">
            <Link href="#" className="hover:text-primary transition-colors">Features</Link>
            <Link href="#" className="hover:text-primary transition-colors">Pricing</Link>
            <Link href="#" className="hover:text-primary transition-colors">About</Link>
          </nav>
          <div className="flex items-center gap-4">
            <Link href="/login">
              <Button variant="ghost" className="font-medium">Log in</Button>
            </Link>
            <Link href="/signup">
              <Button className="shadow-lg shadow-primary/20">Get Started</Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative pt-20 pb-32 overflow-hidden">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/10 via-background to-background" />
          <div className="container mx-auto px-4 text-center">
            <div className="inline-flex items-center rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-sm font-medium text-primary mb-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <span className="flex h-2 w-2 rounded-full bg-primary mr-2 animate-pulse"></span>
              v2.0 is now live
            </div>
            <h1 className="text-5xl md:text-7xl font-bold font-heading tracking-tight text-slate-900 mb-6 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-100">
              Travel smarter, <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-indigo-600">
                live freer.
              </span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200">
              The ultimate operating system for digital nomads. Plan trips, track destinations, and manage your lifestyle in one beautiful workspace.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-300">
              <Link href="/signup">
                <Button size="lg" className="h-14 px-8 text-lg rounded-full shadow-xl shadow-primary/25 hover:shadow-2xl hover:shadow-primary/30 transition-all hover:-translate-y-1">
                  Start your journey <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link href="/login">
                <Button variant="outline" size="lg" className="h-14 px-8 text-lg rounded-full border-slate-200 hover:bg-slate-50">
                  View Demo
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Features Grid */}
        <section className="py-24 bg-slate-50/50 border-t border-slate-100">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold font-heading mb-4">Everything you need to roam</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Powerful features designed specifically for the modern traveler.
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-8">
              {[
                {
                  icon: Globe,
                  title: "Smart Itineraries",
                  description: "Build detailed day-by-day plans with integrated maps and time zones."
                },
                {
                  icon: Shield,
                  title: "Offline Access",
                  description: "Access your travel documents and plans even without an internet connection."
                },
                {
                  icon: Zap,
                  title: "Expense Tracking",
                  description: "Keep track of your spending in multiple currencies automatically."
                }
              ].map((feature, i) => (
                <div key={i} className="bg-white p-8 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                  <div className="h-12 w-12 bg-primary/10 rounded-xl flex items-center justify-center mb-6 text-primary">
                    <feature.icon className="h-6 w-6" />
                  </div>
                  <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-100 bg-white py-12">
        <div className="container mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            <span className="font-bold font-heading text-slate-900">NomadOS</span>
          </div>
          <p className="text-sm text-muted-foreground">
            © 2024 NomadOS Inc. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
