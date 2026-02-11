import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { 
  ArrowLeft, Mail, MapPin, Users, Heart, Shield, Globe, Briefcase, 
  Scale, Cookie, FileWarning, DollarSign, BookOpen, Star, ChevronRight,
  Check, Zap, Building, Clock, Coffee, Laptop, Gift, Award, TrendingUp,
  Play, Download, Eye, Lock, AlertTriangle, Flag, UserCheck, Accessibility,
  FileText, ExternalLink, Phone, MessageCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { KonaLogo2Full } from "@/components/KonaLogo";
import SEO from "@/components/SEO";

// ============ CAREERS PAGE ============
const CareersPage = ({ navigate }) => {
  const departments = [
    { name: "Engineering", openings: 5, icon: Laptop },
    { name: "Product", openings: 3, icon: Zap },
    { name: "Content", openings: 4, icon: Play },
    { name: "Marketing", openings: 3, icon: TrendingUp },
    { name: "Operations", openings: 2, icon: Building },
  ];

  const benefits = [
    { icon: DollarSign, title: "Competitive Salary", desc: "Top-tier compensation + equity" },
    { icon: Heart, title: "Health Insurance", desc: "Medical, dental & vision coverage" },
    { icon: Coffee, title: "Unlimited PTO", desc: "Take the time you need" },
    { icon: Laptop, title: "Remote First", desc: "Work from anywhere" },
    { icon: Gift, title: "Home Office Budget", desc: "$1,000 setup allowance" },
    { icon: BookOpen, title: "Learning Budget", desc: "Annual development fund" },
  ];

  const jobs = [
    { title: "Senior Backend Engineer", dept: "Engineering", location: "Remote", type: "Full-time" },
    { title: "Frontend Engineer", dept: "Engineering", location: "Remote", type: "Full-time" },
    { title: "Mobile Engineer (React Native)", dept: "Engineering", location: "Remote", type: "Full-time" },
    { title: "Product Manager", dept: "Product", location: "Nairobi/Remote", type: "Full-time" },
    { title: "UX Designer", dept: "Product", location: "Remote", type: "Full-time" },
    { title: "Content Acquisitions Manager", dept: "Content", location: "Lagos", type: "Full-time" },
    { title: "Creator Success Manager", dept: "Content", location: "Nairobi", type: "Full-time" },
    { title: "Growth Marketing Manager", dept: "Marketing", location: "Remote", type: "Full-time" },
    { title: "Customer Support Lead", dept: "Operations", location: "Nairobi", type: "Full-time" },
  ];

  return (
    <div className="min-h-screen bg-[#030014]">
      {/* Hero */}
      <div className="relative bg-gradient-to-b from-purple-900/30 to-transparent py-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-500/10 border border-green-500/20 rounded-full mb-6">
            <Briefcase className="w-4 h-4 text-green-400" />
            <span className="text-sm text-green-400">We're Hiring!</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold mb-4">Build the Future of African Entertainment</h1>
          <p className="text-xl text-gray-400 mb-8 max-w-2xl mx-auto">
            Join a team of passionate builders creating Africa's premier streaming platform.
          </p>
          <Button size="lg" className="bg-purple-600 hover:bg-purple-500 rounded-full px-8">
            View Open Positions
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="max-w-5xl mx-auto px-6 -mt-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { value: "50+", label: "Team Members" },
            { value: "10+", label: "Countries" },
            { value: "70%", label: "Remote" },
            { value: "4.8", label: "Glassdoor Rating" },
          ].map((stat, i) => (
            <div key={i} className="bg-white/5 backdrop-blur rounded-xl p-4 text-center border border-white/10">
              <div className="text-2xl font-bold text-purple-400">{stat.value}</div>
              <div className="text-sm text-gray-400">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Benefits */}
      <section className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">Why Join Kona?</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {benefits.map((benefit, i) => (
              <div key={i} className="bg-white/5 rounded-xl p-6 border border-white/10 hover:border-purple-500/50 transition-colors">
                <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center mb-4">
                  <benefit.icon className="w-6 h-6 text-purple-400" />
                </div>
                <h3 className="font-semibold mb-2">{benefit.title}</h3>
                <p className="text-sm text-gray-400">{benefit.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Departments */}
      <section className="py-12 px-6 bg-white/5">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-bold mb-8">Open by Department</h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {departments.map((dept, i) => (
              <div key={i} className="bg-[#0a0a1a] rounded-xl p-4 text-center border border-white/10">
                <dept.icon className="w-8 h-8 text-purple-400 mx-auto mb-2" />
                <div className="font-medium">{dept.name}</div>
                <div className="text-sm text-purple-400">{dept.openings} roles</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Job Listings */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold mb-8">Open Positions</h2>
          <div className="space-y-4">
            {jobs.map((job, i) => (
              <div 
                key={i} 
                className="bg-white/5 rounded-xl p-5 border border-white/10 hover:border-purple-500/50 transition-all cursor-pointer group flex items-center justify-between"
              >
                <div>
                  <h3 className="font-semibold group-hover:text-purple-400 transition-colors">{job.title}</h3>
                  <div className="flex items-center gap-4 mt-2 text-sm text-gray-400">
                    <span className="flex items-center gap-1">
                      <Building className="w-3 h-3" /> {job.dept}
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" /> {job.location}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {job.type}
                    </span>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-purple-400 transition-colors" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6 bg-gradient-to-r from-purple-900/30 to-pink-900/30">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">Don't See Your Role?</h2>
          <p className="text-gray-400 mb-6">We're always looking for exceptional talent. Send us your info!</p>
          <Button variant="outline" className="border-white/30 hover:bg-white/10">
            <Mail className="w-4 h-4 mr-2" />
            careers@streamkona.com
          </Button>
        </div>
      </section>
    </div>
  );
};

// ============ PRESS PAGE ============
const PressPage = ({ navigate }) => {
  const pressReleases = [
    { date: "Feb 2026", title: "Kona Raises $10M Series A to Expand African Content Library", tag: "Funding" },
    { date: "Jan 2026", title: "Kona Launches VIP Tier with Offline Viewing", tag: "Product" },
    { date: "Dec 2025", title: "Creator Payouts Exceed $500K Milestone", tag: "Creators" },
    { date: "Nov 2025", title: "Kona Reaches 1 Million Active Users", tag: "Milestone" },
  ];

  return (
    <div className="min-h-screen bg-[#030014]">
      {/* Hero */}
      <div className="relative bg-gradient-to-b from-blue-900/30 to-transparent py-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl sm:text-5xl font-bold mb-4">Press & Media</h1>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            News, press releases, and media resources for Kona
          </p>
        </div>
      </div>

      {/* Quick Facts */}
      <div className="max-w-5xl mx-auto px-6 py-12">
        <h2 className="text-2xl font-bold mb-6">Quick Facts</h2>
        <div className="grid md:grid-cols-4 gap-4">
          {[
            { label: "Founded", value: "2024" },
            { label: "Headquarters", value: "Nairobi, Kenya" },
            { label: "Active Users", value: "1M+" },
            { label: "Original Series", value: "50+" },
          ].map((fact, i) => (
            <div key={i} className="bg-white/5 rounded-xl p-4 border border-white/10">
              <div className="text-sm text-gray-400">{fact.label}</div>
              <div className="text-xl font-bold text-white">{fact.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Press Releases */}
      <section className="py-12 px-6">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold mb-8">Recent News</h2>
          <div className="space-y-4">
            {pressReleases.map((pr, i) => (
              <div key={i} className="bg-white/5 rounded-xl p-5 border border-white/10 hover:border-blue-500/50 transition-all cursor-pointer group">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-sm text-gray-500">{pr.date}</span>
                      <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded">{pr.tag}</span>
                    </div>
                    <h3 className="font-semibold group-hover:text-blue-400 transition-colors">{pr.title}</h3>
                  </div>
                  <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-blue-400" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Media Kit */}
      <section className="py-12 px-6 bg-white/5">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">Media Kit</h2>
            <Button className="bg-blue-600 hover:bg-blue-500">
              <Download className="w-4 h-4 mr-2" />
              Download Kit
            </Button>
          </div>
          <p className="text-gray-400">
            Includes high-resolution logos, executive headshots, product screenshots, and brand guidelines.
          </p>
        </div>
      </section>

      {/* Contact */}
      <section className="py-20 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl font-bold mb-4">Press Contact</h2>
          <p className="text-gray-400 mb-6">For media inquiries, please contact:</p>
          <Button variant="outline" className="border-white/30 hover:bg-white/10">
            <Mail className="w-4 h-4 mr-2" />
            press@streamkona.com
          </Button>
        </div>
      </section>
    </div>
  );
};

// ============ SAFETY PAGE ============
const SafetyPage = ({ navigate }) => {
  const safetyFeatures = [
    { icon: Shield, title: "Content Moderation", desc: "All content reviewed before publishing with 24/7 moderation team" },
    { icon: Eye, title: "Age Ratings", desc: "G, PG, 13+, 16+, 18+ ratings to help you make informed choices" },
    { icon: Lock, title: "Parental Controls", desc: "Set PIN for mature content, create kids profiles, set viewing limits" },
    { icon: UserCheck, title: "Account Security", desc: "Email/phone verification, 2FA, secure passwords" },
  ];

  return (
    <div className="min-h-screen bg-[#030014]">
      {/* Hero */}
      <div className="relative bg-gradient-to-b from-green-900/30 to-transparent py-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <Shield className="w-8 h-8 text-green-400" />
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold mb-4">Safety Center</h1>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            Your safety is our top priority. Learn about our safety features and how to stay safe on Kona.
          </p>
        </div>
      </div>

      {/* Safety Features */}
      <section className="py-16 px-6">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-bold mb-8 text-center">How We Keep You Safe</h2>
          <div className="grid md:grid-cols-2 gap-6">
            {safetyFeatures.map((feature, i) => (
              <div key={i} className="bg-white/5 rounded-xl p-6 border border-white/10">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                    <feature.icon className="w-6 h-6 text-green-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-2">{feature.title}</h3>
                    <p className="text-sm text-gray-400">{feature.desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Report */}
      <section className="py-16 px-6 bg-white/5">
        <div className="max-w-3xl mx-auto text-center">
          <AlertTriangle className="w-12 h-12 text-yellow-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-4">See Something? Report It.</h2>
          <p className="text-gray-400 mb-6">
            Help us keep Kona safe. Report inappropriate content or behavior.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Button className="bg-yellow-600 hover:bg-yellow-500">
              <Flag className="w-4 h-4 mr-2" />
              Report Content
            </Button>
            <Button variant="outline" className="border-white/30">
              Report User
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
};

// ============ GUIDELINES PAGE ============
const GuidelinesPage = ({ navigate }) => {
  const rules = [
    { title: "Be Respectful", desc: "Treat others with kindness. No harassment, bullying, or hate speech." },
    { title: "Be Honest", desc: "Don't impersonate others or spread misinformation." },
    { title: "Be Safe", desc: "Don't share personal information publicly. Report suspicious activity." },
    { title: "No Spam", desc: "Don't post repetitive, misleading, or low-quality content." },
  ];

  return (
    <div className="min-h-screen bg-[#030014]">
      <div className="relative bg-gradient-to-b from-purple-900/30 to-transparent py-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <Users className="w-12 h-12 text-purple-400 mx-auto mb-4" />
          <h1 className="text-4xl sm:text-5xl font-bold mb-4">Community Guidelines</h1>
          <p className="text-xl text-gray-400">Rules for a positive community experience</p>
        </div>
      </div>

      <section className="py-16 px-6">
        <div className="max-w-3xl mx-auto">
          <div className="space-y-6">
            {rules.map((rule, i) => (
              <div key={i} className="bg-white/5 rounded-xl p-6 border border-white/10">
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 bg-purple-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                    <Check className="w-4 h-4 text-purple-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">{rule.title}</h3>
                    <p className="text-sm text-gray-400">{rule.desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-12 bg-red-500/10 border border-red-500/20 rounded-xl p-6">
            <h3 className="font-semibold text-red-400 mb-2">Violations Result In:</h3>
            <ul className="text-sm text-gray-400 space-y-1">
              <li>• First offense: Warning</li>
              <li>• Second offense: Temporary suspension</li>
              <li>• Third offense: Permanent ban</li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
};

// ============ ACCESSIBILITY PAGE ============
const AccessibilityPage = ({ navigate }) => {
  const features = [
    { category: "Visual", items: ["High contrast mode", "Font size controls", "Screen reader support", "Color blind modes"] },
    { category: "Audio", items: ["Subtitles on all content", "Closed captions", "Audio descriptions", "Volume controls"] },
    { category: "Motor", items: ["Keyboard navigation", "Voice commands", "Large touch targets", "Reduced motion option"] },
  ];

  return (
    <div className="min-h-screen bg-[#030014]">
      <div className="relative bg-gradient-to-b from-cyan-900/30 to-transparent py-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <Accessibility className="w-12 h-12 text-cyan-400 mx-auto mb-4" />
          <h1 className="text-4xl sm:text-5xl font-bold mb-4">Accessibility</h1>
          <p className="text-xl text-gray-400">Kona for everyone</p>
        </div>
      </div>

      <section className="py-16 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="grid md:grid-cols-3 gap-6">
            {features.map((category, i) => (
              <div key={i} className="bg-white/5 rounded-xl p-6 border border-white/10">
                <h3 className="font-semibold text-cyan-400 mb-4">{category.category} Accessibility</h3>
                <ul className="space-y-2">
                  {category.items.map((item, j) => (
                    <li key={j} className="flex items-center gap-2 text-sm text-gray-300">
                      <Check className="w-4 h-4 text-cyan-400" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 px-6 bg-white/5">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl font-bold mb-4">Need Accommodations?</h2>
          <p className="text-gray-400 mb-6">We're always improving. Tell us how we can do better.</p>
          <Button variant="outline" className="border-white/30">
            <Mail className="w-4 h-4 mr-2" />
            accessibility@streamkona.com
          </Button>
        </div>
      </section>
    </div>
  );
};

// ============ LEGAL PAGES (Terms, Privacy, Cookies, DMCA) ============
const LegalPage = ({ title, icon: Icon, sections }) => (
  <div className="min-h-screen bg-[#030014]">
    <div className="relative bg-gradient-to-b from-gray-800/50 to-transparent py-16 px-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-4">
          <Icon className="w-8 h-8 text-gray-400" />
          <h1 className="text-3xl font-bold">{title}</h1>
        </div>
        <p className="text-gray-400">Last updated: February 1, 2026</p>
      </div>
    </div>

    <div className="max-w-4xl mx-auto px-6 py-12">
      <div className="space-y-8">
        {sections.map((section, i) => (
          <div key={i} className="bg-white/5 rounded-xl p-6 border border-white/10">
            <h2 className="text-xl font-semibold mb-4 text-purple-400">{section.title}</h2>
            <div className="text-sm text-gray-300 space-y-3 leading-relaxed">
              {section.content.map((para, j) => (
                <p key={j}>{para}</p>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

// ============ CREATOR PAGES ============
const CreatorGuidelines = ({ navigate }) => (
  <div className="min-h-screen bg-[#030014]">
    <div className="relative bg-gradient-to-b from-orange-900/30 to-transparent py-20 px-6">
      <div className="max-w-4xl mx-auto text-center">
        <BookOpen className="w-12 h-12 text-orange-400 mx-auto mb-4" />
        <h1 className="text-4xl sm:text-5xl font-bold mb-4">Creator Guidelines</h1>
        <p className="text-xl text-gray-400">Best practices for success on Kona</p>
      </div>
    </div>

    <section className="py-16 px-6">
      <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-8">
        {[
          { title: "Video Quality", items: ["1080p HD minimum", "24-30 fps", "Clear audio at 48kHz"] },
          { title: "Storytelling", items: ["Hook viewers in 30 seconds", "Clear episode structure", "End with cliffhangers"] },
          { title: "Optimization", items: ["Eye-catching thumbnails", "Descriptive titles", "Relevant tags (5-10)"] },
          { title: "Engagement", items: ["Respond to comments", "Consistent upload schedule", "Cross-promote on social"] },
        ].map((section, i) => (
          <div key={i} className="bg-white/5 rounded-xl p-6 border border-white/10">
            <h3 className="font-semibold text-orange-400 mb-4">{section.title}</h3>
            <ul className="space-y-2">
              {section.items.map((item, j) => (
                <li key={j} className="flex items-center gap-2 text-sm text-gray-300">
                  <Check className="w-4 h-4 text-orange-400" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  </div>
);

const RevenuePage = ({ navigate }) => (
  <div className="min-h-screen bg-[#030014]">
    <div className="relative bg-gradient-to-b from-green-900/30 to-transparent py-20 px-6">
      <div className="max-w-4xl mx-auto text-center">
        <DollarSign className="w-12 h-12 text-green-400 mx-auto mb-4" />
        <h1 className="text-4xl sm:text-5xl font-bold mb-4">Revenue Sharing</h1>
        <p className="text-xl text-gray-400">Transparent, fair compensation for creators</p>
      </div>
    </div>

    <section className="py-16 px-6">
      <div className="max-w-4xl mx-auto">
        {/* Revenue Split */}
        <div className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 rounded-2xl p-8 border border-green-500/30 mb-12 text-center">
          <h2 className="text-5xl font-bold text-green-400 mb-2">70%</h2>
          <p className="text-xl text-gray-300">Creator Revenue Share</p>
          <p className="text-sm text-gray-400 mt-2">Among the highest in the industry</p>
        </div>

        {/* How You Earn */}
        <h3 className="text-2xl font-bold mb-6">How You Earn</h3>
        <div className="grid md:grid-cols-2 gap-4 mb-12">
          {[
            { title: "Coin Purchases", desc: "70% when viewers spend coins on your content" },
            { title: "Subscription Share", desc: "Distributed based on watch time" },
            { title: "Tips", desc: "Keep 85% of viewer tips" },
            { title: "Bonuses", desc: "Extra rewards for top performers" },
          ].map((item, i) => (
            <div key={i} className="bg-white/5 rounded-xl p-5 border border-white/10">
              <h4 className="font-semibold mb-1">{item.title}</h4>
              <p className="text-sm text-gray-400">{item.desc}</p>
            </div>
          ))}
        </div>

        {/* Payment Info */}
        <div className="bg-white/5 rounded-xl p-6 border border-white/10">
          <h3 className="font-semibold mb-4">Payment Details</h3>
          <ul className="space-y-2 text-sm text-gray-300">
            <li>• Payouts processed 1st of each month</li>
            <li>• Minimum payout: $50 USD</li>
            <li>• Methods: M-Pesa, Bank Transfer, PayPal, Wise</li>
          </ul>
        </div>
      </div>
    </section>
  </div>
);

// ============ PAGE ROUTER ============
const ContentPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const pageId = location.pathname.replace('/', '');

  // Legal page content
  const termsContent = [
    { title: "1. Acceptance of Terms", content: ["By accessing or using Kona, you agree to be bound by these Terms. If you disagree, please do not use our service."] },
    { title: "2. Eligibility", content: ["You must be at least 13 years old. If under 18, you need parental consent. You must not be prohibited from using our service by law."] },
    { title: "3. Account Registration", content: ["Provide accurate information. Keep your password secure. You're responsible for all activity on your account. One account per person."] },
    { title: "4. Subscriptions & Payments", content: ["Paid subscriptions are billed monthly and auto-renew unless cancelled. Cancel anytime. No refunds for partial months."] },
    { title: "5. Content & Conduct", content: ["You may stream content for personal use. You may not download without permission, share your account, or harass other users."] },
  ];

  const privacyContent = [
    { title: "1. Information We Collect", content: ["Account info (email, phone, name), payment information, viewing history, device information, and cookies."] },
    { title: "2. How We Use Your Information", content: ["To provide and improve our service, process payments, personalize recommendations, send notifications, and prevent fraud."] },
    { title: "3. How We Share", content: ["With service providers, business partners (aggregated only), and legal authorities when required. We never sell your personal data."] },
    { title: "4. Your Rights", content: ["You can access, correct, delete, or export your data. Opt out of marketing. Manage cookies in Settings > Privacy."] },
  ];

  const cookiesContent = [
    { title: "What Are Cookies?", content: ["Cookies are small text files stored on your device. They help us remember your preferences and understand how you use our service."] },
    { title: "Types We Use", content: ["Essential (authentication, security), Functional (preferences), Analytics (usage patterns), Marketing (personalization)."] },
    { title: "Managing Cookies", content: ["Manage in Settings > Privacy > Cookie Preferences. You can also control cookies in your browser settings."] },
  ];

  const dmcaContent = [
    { title: "Copyright Policy", content: ["Kona respects intellectual property rights. If you believe content infringes your copyright, submit a DMCA takedown notice."] },
    { title: "Filing a Notice", content: ["Provide: your contact info, identification of copyrighted work, URL of infringing content, and statement of good faith belief."] },
    { title: "Repeat Infringers", content: ["First offense: Warning. Second offense: Account suspension. Third offense: Permanent termination."] },
    { title: "Contact", content: ["Email: dmca@streamkona.com"] },
  ];

  // Render based on page
  const renderPage = () => {
    switch (pageId) {
      case 'careers':
        return <CareersPage navigate={navigate} />;
      case 'press':
        return <PressPage navigate={navigate} />;
      case 'safety':
        return <SafetyPage navigate={navigate} />;
      case 'guidelines':
        return <GuidelinesPage navigate={navigate} />;
      case 'accessibility':
        return <AccessibilityPage navigate={navigate} />;
      case 'terms':
        return <LegalPage title="Terms of Service" icon={Scale} sections={termsContent} />;
      case 'privacy':
        return <LegalPage title="Privacy Policy" icon={Shield} sections={privacyContent} />;
      case 'cookies':
        return <LegalPage title="Cookie Policy" icon={Cookie} sections={cookiesContent} />;
      case 'dmca':
        return <LegalPage title="DMCA & Copyright" icon={FileWarning} sections={dmcaContent} />;
      case 'creator-guidelines':
        return <CreatorGuidelines navigate={navigate} />;
      case 'revenue':
        return <RevenuePage navigate={navigate} />;
      default:
        return (
          <div className="min-h-screen bg-[#030014] flex items-center justify-center">
            <div className="text-center">
              <h1 className="text-2xl font-bold mb-4">Page Not Found</h1>
              <Button onClick={() => navigate("/")}>Go Home</Button>
            </div>
          </div>
        );
    }
  };

  return (
    <div data-testid={`page-${pageId}`}>
      <SEO title={`${pageId.charAt(0).toUpperCase() + pageId.slice(1).replace('-', ' ')} - Kona`} />
      
      {/* Header */}
      <header className="sticky top-0 z-10 bg-[#030014]/95 backdrop-blur-sm border-b border-white/10">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
          <button onClick={() => navigate("/")} className="hidden sm:block">
            <KonaLogo2Full height={24} />
          </button>
          <div className="w-9" /> {/* Spacer */}
        </div>
      </header>

      {renderPage()}

      {/* Footer */}
      <footer className="border-t border-white/10 py-6">
        <div className="max-w-5xl mx-auto px-6 flex items-center justify-between">
          <button onClick={() => navigate("/")} className="text-gray-400 hover:text-white text-sm">
            ← Back to Kona
          </button>
          <p className="text-gray-500 text-sm">© 2026 Kona Entertainment Ltd.</p>
        </div>
      </footer>
    </div>
  );
};

export default ContentPage;
