import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { 
  TrendingUp, Users, Target, BarChart3, Zap, Globe, 
  Play, CheckCircle, ArrowRight, Mail, Building2, 
  DollarSign, Eye, Smartphone, Monitor, Video
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { KonaLogo2Full } from "@/components/KonaLogo";
import { toast } from "sonner";

export const AdvertisersPage = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    companyName: "",
    contactName: "",
    email: "",
    phone: "",
    budget: "",
    message: ""
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const stats = [
    { value: "100K+", label: "Active Viewers", icon: Users },
    { value: "85%", label: "Completion Rate", icon: Eye },
    { value: "25+", label: "Original Series", icon: Video },
    { value: "18-35", label: "Core Demographic", icon: Target }
  ];

  const adFormats = [
    {
      title: "Pre-Roll Ads",
      description: "15-30 second video ads before episode playback",
      icon: Play,
      reach: "100% viewership",
      color: "from-blue-500 to-cyan-500"
    },
    {
      title: "Mid-Roll Ads",
      description: "Non-skippable ads during natural story breaks",
      icon: Video,
      reach: "High engagement",
      color: "from-purple-500 to-pink-500"
    },
    {
      title: "Banner Ads",
      description: "Strategic placement across browse and discovery pages",
      icon: Monitor,
      reach: "1M+ impressions/mo",
      color: "from-orange-500 to-red-500"
    },
    {
      title: "Sponsored Content",
      description: "Native integration with series and creator content",
      icon: Zap,
      reach: "Premium placement",
      color: "from-green-500 to-emerald-500"
    }
  ];

  const benefits = [
    {
      title: "Engaged African Audience",
      description: "Reach viewers who are actively engaged with premium African content",
      icon: Globe
    },
    {
      title: "Targeted Demographics",
      description: "Precise targeting based on viewing habits, location, and interests",
      icon: Target
    },
    {
      title: "Real-Time Analytics",
      description: "Comprehensive dashboard with impressions, clicks, and conversions",
      icon: BarChart3
    },
    {
      title: "Flexible Budgets",
      description: "Campaigns starting from $500 with scalable options",
      icon: DollarSign
    },
    {
      title: "Mobile-First Platform",
      description: "85% of our audience accesses via mobile devices",
      icon: Smartphone
    },
    {
      title: "Brand Safety",
      description: "Premium, curated content ensures brand-safe environment",
      icon: CheckCircle
    }
  ];

  const pricingTiers = [
    {
      name: "Starter",
      price: "$500",
      period: "/month",
      description: "Perfect for testing the waters",
      features: [
        "Up to 50,000 impressions",
        "Banner ads only",
        "Basic analytics",
        "Email support"
      ],
      cta: "Get Started",
      popular: false
    },
    {
      name: "Growth",
      price: "$2,000",
      period: "/month",
      description: "For brands ready to scale",
      features: [
        "Up to 250,000 impressions",
        "Pre-roll + Banner ads",
        "Advanced analytics",
        "Dedicated account manager",
        "A/B testing"
      ],
      cta: "Start Growing",
      popular: true
    },
    {
      name: "Enterprise",
      price: "Custom",
      period: "",
      description: "Full partnership experience",
      features: [
        "Unlimited impressions",
        "All ad formats",
        "Sponsored content integration",
        "Custom reporting",
        "Priority support",
        "Exclusivity options"
      ],
      cta: "Contact Sales",
      popular: false
    }
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    toast.success("Thank you! Our team will contact you within 24 hours.");
    setFormData({
      companyName: "",
      contactName: "",
      email: "",
      phone: "",
      budget: "",
      message: ""
    });
    setIsSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <button onClick={() => navigate("/")} className="hover:opacity-80 transition">
            <KonaLogo2Full height={28} />
          </button>
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate("/creators")}>
              For Creators
            </Button>
            <Button onClick={() => document.getElementById('contact-form').scrollIntoView({ behavior: 'smooth' })}>
              Advertise With Us
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative py-20 md:py-32 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-background to-background" />
        <div className="absolute top-20 right-20 w-96 h-96 bg-primary/30 rounded-full blur-3xl" />
        <div className="absolute bottom-20 left-20 w-64 h-64 bg-purple-500/20 rounded-full blur-3xl" />
        
        <div className="relative max-w-7xl mx-auto px-4">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/30 text-primary text-sm font-medium mb-6">
              <TrendingUp className="w-4 h-4" />
              Africa's Fastest Growing Streaming Platform
            </div>
            
            <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
              Reach <span className="text-primary">Millions</span> of Engaged African Viewers
            </h1>
            
            <p className="text-xl text-muted-foreground mb-8 leading-relaxed">
              Connect your brand with the most engaged streaming audience in Africa. 
              Premium ad placements, precise targeting, and measurable results.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <Button 
                size="lg" 
                className="text-lg px-8"
                onClick={() => document.getElementById('contact-form').scrollIntoView({ behavior: 'smooth' })}
              >
                Start Advertising
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
              <Button 
                size="lg" 
                variant="outline"
                className="text-lg px-8"
                onClick={() => document.getElementById('ad-formats').scrollIntoView({ behavior: 'smooth' })}
              >
                View Ad Formats
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 border-y border-white/10 bg-white/5">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <stat.icon className="w-8 h-8 text-primary mx-auto mb-3" />
                <div className="text-3xl md:text-4xl font-bold text-white mb-1">{stat.value}</div>
                <div className="text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Ad Formats Section */}
      <section id="ad-formats" className="py-20">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Advertising Formats</h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Multiple ways to reach your audience with engaging, non-intrusive ad experiences
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {adFormats.map((format, index) => (
              <Card key={index} className="p-6 bg-white/5 border-white/10 hover:border-primary/50 transition-all group">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${format.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                  <format.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{format.title}</h3>
                <p className="text-muted-foreground text-sm mb-4">{format.description}</p>
                <div className="text-xs text-primary font-medium">{format.reach}</div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 bg-white/5">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Why Advertise on Kona?</h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Join leading brands reaching Africa's most engaged streaming audience
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {benefits.map((benefit, index) => (
              <div key={index} className="flex gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <benefit.icon className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold mb-2">{benefit.title}</h3>
                  <p className="text-muted-foreground text-sm">{benefit.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Advertising Packages</h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Flexible options to fit every budget and marketing goal
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {pricingTiers.map((tier, index) => (
              <Card 
                key={index} 
                className={`p-8 relative ${
                  tier.popular 
                    ? 'bg-primary/10 border-primary' 
                    : 'bg-white/5 border-white/10'
                }`}
              >
                {tier.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-primary text-white text-xs font-bold rounded-full">
                    MOST POPULAR
                  </div>
                )}
                <h3 className="text-xl font-bold mb-2">{tier.name}</h3>
                <div className="flex items-baseline gap-1 mb-2">
                  <span className="text-4xl font-bold">{tier.price}</span>
                  <span className="text-muted-foreground">{tier.period}</span>
                </div>
                <p className="text-muted-foreground text-sm mb-6">{tier.description}</p>
                <ul className="space-y-3 mb-8">
                  {tier.features.map((feature, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <Button 
                  className="w-full" 
                  variant={tier.popular ? "default" : "outline"}
                  onClick={() => document.getElementById('contact-form').scrollIntoView({ behavior: 'smooth' })}
                >
                  {tier.cta}
                </Button>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Form Section */}
      <section id="contact-form" className="py-20 bg-white/5">
        <div className="max-w-3xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Start Your Campaign</h2>
            <p className="text-muted-foreground text-lg">
              Fill out the form below and our advertising team will contact you within 24 hours
            </p>
          </div>
          
          <Card className="p-8 bg-background border-white/10">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium mb-2">Company Name *</label>
                  <Input
                    required
                    placeholder="Your company"
                    value={formData.companyName}
                    onChange={(e) => setFormData({...formData, companyName: e.target.value})}
                    className="bg-white/5 border-white/10"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Contact Name *</label>
                  <Input
                    required
                    placeholder="Your name"
                    value={formData.contactName}
                    onChange={(e) => setFormData({...formData, contactName: e.target.value})}
                    className="bg-white/5 border-white/10"
                  />
                </div>
              </div>
              
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium mb-2">Email Address *</label>
                  <Input
                    required
                    type="email"
                    placeholder="you@company.com"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className="bg-white/5 border-white/10"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Phone Number</label>
                  <Input
                    placeholder="+254 700 000 000"
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    className="bg-white/5 border-white/10"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Monthly Budget *</label>
                <select 
                  required
                  value={formData.budget}
                  onChange={(e) => setFormData({...formData, budget: e.target.value})}
                  className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white"
                >
                  <option value="">Select your budget range</option>
                  <option value="500-1000">$500 - $1,000</option>
                  <option value="1000-2500">$1,000 - $2,500</option>
                  <option value="2500-5000">$2,500 - $5,000</option>
                  <option value="5000-10000">$5,000 - $10,000</option>
                  <option value="10000+">$10,000+</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Tell us about your campaign goals</label>
                <textarea
                  rows={4}
                  placeholder="What are you looking to achieve?"
                  value={formData.message}
                  onChange={(e) => setFormData({...formData, message: e.target.value})}
                  className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white resize-none"
                />
              </div>
              
              <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>Processing...</>
                ) : (
                  <>
                    <Mail className="w-5 h-5 mr-2" />
                    Submit Inquiry
                  </>
                )}
              </Button>
              
              <p className="text-center text-xs text-muted-foreground">
                By submitting, you agree to our{" "}
                <button type="button" onClick={() => navigate("/terms")} className="text-primary hover:underline">
                  Terms of Service
                </button>{" "}
                and{" "}
                <button type="button" onClick={() => navigate("/privacy")} className="text-primary hover:underline">
                  Privacy Policy
                </button>
              </p>
            </form>
          </Card>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <Building2 className="w-16 h-16 text-primary mx-auto mb-6" />
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Ready to Grow Your Brand?
          </h2>
          <p className="text-muted-foreground text-lg mb-8 max-w-2xl mx-auto">
            Join brands like Safaricom, MTN, and Coca-Cola reaching millions of viewers on Africa's premier streaming platform.
          </p>
          <Button 
            size="lg" 
            className="text-lg px-8"
            onClick={() => document.getElementById('contact-form').scrollIntoView({ behavior: 'smooth' })}
          >
            Get Started Today
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-white/10">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <p>© 2026 Kona. All rights reserved.</p>
          <div className="flex gap-6">
            <button onClick={() => navigate("/about")} className="hover:text-white">About Us</button>
            <button onClick={() => navigate("/terms")} className="hover:text-white">Terms of Service</button>
            <button onClick={() => navigate("/privacy")} className="hover:text-white">Privacy Policy</button>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default AdvertisersPage;
