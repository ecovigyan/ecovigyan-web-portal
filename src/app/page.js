"use client";

import React from "react";
import Hero from "@/components/Hero";
import VisionMission from "@/components/VisionMission";
import WhatWeDo from "@/components/WhatWeDo";
import ImpactStats from "@/components/ImpactStats";
import WhoWeAre from "@/components/WhoWeAre";
import WhyOurApproach from "@/components/WhyOurApproach";
import FeaturedPrograms from "@/components/FeaturedPrograms";
import Testimonials from "@/components/Testimonials";
import CallToAction from "@/components/CallToAction";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#F9FAF8] font-sans selection:bg-emerald-200 selection:text-emerald-900">
      <Hero />
      <VisionMission />
      <WhatWeDo />
      <ImpactStats />
      <WhoWeAre />
      <WhyOurApproach />
      {/* <FeaturedPrograms /> */}
      <Testimonials />
      <CallToAction />
    </div>
  );
}
