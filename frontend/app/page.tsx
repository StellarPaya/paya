import { About } from "@/components/sections/About";
import { CTA } from "@/components/sections/CTA";
import { FAQ } from "@/components/sections/FAQ";
import { Features } from "@/components/sections/Features";
import { Hero } from "@/components/sections/Hero";
import { HowItWorks } from "@/components/sections/HowItWorks";
import { PageBackground } from "@/components/site/Background";
import { Footer } from "@/components/site/Footer";
import { Header } from "@/components/site/Header";

export default function Home() {
  return (
    <div className="relative min-h-screen bg-white text-zinc-900 dark:bg-black dark:text-zinc-50">
      <PageBackground />
      <Header />
      <main>
        <Hero />
        <About />
        <HowItWorks />
        <Features />
        <FAQ />
        <CTA />
      </main>
      <Footer />
    </div>
  );
}
