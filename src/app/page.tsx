import Navbar from "@/components/layout/Navbar";
import Hero from "@/components/sections/Hero";
import Features from "@/components/sections/Features";
import Testimonials from "@/components/sections/Testimonials"; // <-- Nouvel import
import Marketplace from "@/components/sections/Marketplace";
import Security from "@/components/sections/Security";
import Pricing from "@/components/sections/Pricing";
import Faq from "@/components/sections/Faq";
import Footer from "@/components/layout/Footer";

export default function LandingPage() {
  return (
    <div className="bg-[#020617] text-slate-300 font-sans selection:bg-[#F59E0B] selection:text-black overflow-x-hidden">
      <Navbar />
      <Hero />
      <Features />
      <Testimonials /> 
      <Marketplace />
      <Security />
      <Pricing />
      <Faq />
      <Footer />
    </div>
  );
}
