import type React from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { MapPin, FileText, BarChart3, Users } from "lucide-react"

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <header className="bg-primary text-primary-foreground py-16">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Municipal Complaint Management System</h1>
          <p className="text-xl md:text-2xl mb-8 max-w-3xl mx-auto">
            A platform for citizens to report issues, track progress, and help improve our community
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg" className="text-lg">
              <Link href="/auth/login">Login</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="text-lg bg-white text-primary hover:bg-gray-100">
              <Link href="/auth/signup">Sign Up</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Features Section */}
      <section className="py-16 bg-background">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">Key Features</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <FeatureCard
              icon={<FileText className="h-12 w-12" />}
              title="Easy Complaint Filing"
              description="Submit complaints with details, location, and photos in just a few clicks"
            />
            <FeatureCard
              icon={<MapPin className="h-12 w-12" />}
              title="Location Tracking"
              description="Pinpoint issues on a map and identify problem hotspots in your area"
            />
            <FeatureCard
              icon={<BarChart3 className="h-12 w-12" />}
              title="Real-time Updates"
              description="Track the status of your complaints from submission to resolution"
            />
            <FeatureCard
              icon={<Users className="h-12 w-12" />}
              title="Role-Based Access"
              description="Different interfaces for citizens, municipal officers, and administrators"
            />
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-16 bg-muted">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">How It Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <StepCard
              number={1}
              title="Register & Login"
              description="Create an account as a citizen to access the complaint system"
            />
            <StepCard
              number={2}
              title="Submit Complaint"
              description="Provide details about the issue, location, and upload supporting images"
            />
            <StepCard
              number={3}
              title="Track Progress"
              description="Receive updates as your complaint is processed and resolved by municipal officers"
            />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-6">Ready to report an issue?</h2>
          <p className="text-xl mb-8 max-w-2xl mx-auto">
            Join our platform today and help make our community better for everyone
          </p>
          <Button asChild size="lg" variant="outline" className="text-lg bg-white text-primary hover:bg-gray-100">
            <Link href="/auth/signup">Get Started</Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 bg-secondary">
        <div className="container mx-auto px-4 text-center">
          <p className="text-secondary-foreground">
            © {new Date().getFullYear()} Municipal Complaint Management System. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  )
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="bg-card rounded-lg p-6 shadow-md flex flex-col items-center text-center">
      <div className="text-primary mb-4">{icon}</div>
      <h3 className="text-xl font-semibold mb-2">{title}</h3>
      <p className="text-muted-foreground">{description}</p>
    </div>
  )
}

function StepCard({ number, title, description }: { number: number; title: string; description: string }) {
  return (
    <div className="bg-card rounded-lg p-6 shadow-md relative">
      <div className="absolute -top-5 -left-5 bg-primary text-primary-foreground w-10 h-10 rounded-full flex items-center justify-center text-xl font-bold">
        {number}
      </div>
      <h3 className="text-xl font-semibold mb-2 mt-4">{title}</h3>
      <p className="text-muted-foreground">{description}</p>
    </div>
  )
}

