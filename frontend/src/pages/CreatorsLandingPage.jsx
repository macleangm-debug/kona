import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Film, DollarSign, BarChart3, Users, Globe, Zap,
  CheckCircle, ArrowRight, Play, Upload, TrendingUp,
  Star, Heart, Eye, Clock, Shield, Wallet
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { KonaLogo2Full } from "@/components/KonaLogo";

export const CreatorsLandingPage = () => {
  const navigate = useNavigate();
  const [activeTestimonial, setActiveTestimonial] = useState(0);

  const stats = [
    { value: "70%", label: "Revenue Share", icon: DollarSign },
    { value: "100K+", label: "Active Viewers", icon: Users },
    { value: "48hrs", label: "Payout Speed", icon: Clock },
    { value: "25+", label: "Countries Reached", icon: Globe }
  ];

  const benefits = [
    {
      title: "Industry-Leading Revenue Share",
      description: "Keep 70% of all earnings from your content. No hidden fees, no surprises.",
      icon: DollarSign,
      highlight: "70% to you"
    },
    {
      title: "Instant Global Distribution",
      description: "Your content reaches viewers across Africa and the diaspora immediately upon approval.",
      icon: Globe,
      highlight: "25+ countries"
    },
    {
      title: "Real-Time Analytics",
      description: "Track views, engagement, earnings, and audience demographics in your creator dashboard.",
      icon: BarChart3,
      highlight: "Live data"
    },
    {
      title: "Fast Payouts",
      description: "Get paid within 48 hours via M-Pesa, bank transfer, or mobile money.",
      icon: Wallet,
      highlight: "48hr payouts"
    },
    {
      title: "Marketing Support",
      description: "We promote top-performing content across our platform and social channels.",
      icon: TrendingUp,
      highlight: "Free promotion"
    },
    {
      title: "Content Protection",
      description: "Advanced DRM and anti-piracy measures protect your intellectual property.",
      icon: Shield,
      highlight: "Secure platform"
    }
  ];

  const howItWorks = [
    {
      step: "1",
      title: "Apply to Join",
      description: "Submit your application with sample content. We review within 48 hours.",
      icon: Upload
    },
    {
      step: "2",
      title: "Upload Content",
      description: "Use our creator portal to upload episodes, add metadata, and set pricing.",
      icon: Film
    },
    {
      step: "3",
      title: "Earn Money",
      description: "Get paid every time a viewer unlocks your content with coins.",
      icon: DollarSign
    },
    {
      step: "4",
      title: "Grow Your Audience",
      description: "Track performance, engage with fans, and build your following.",
      icon: Users
    }
  ];

  const testimonials = [
    {
      name: "Amara Okonkwo",
      role: "Creator of 'Lagos Love'",
      image: "AO",
      quote: "Kona changed my life. I went from uploading on YouTube with no income to earning a full-time living from my stories. The 70% revenue share is unbeatable.",
      earnings: "$12,000+",
      period: "in 6 months"
    },
    {
      name: "David Mwangi",
      role: "Creator of 'Nairobi Nights'",
      image: "DM",
      quote: "The analytics dashboard helps me understand exactly what my audience wants. My views have increased 300% since I joined Kona.",
      earnings: "$8,500+",
      period: "in 4 months"
    },
    {
      name: "Fatou Diallo",
      role: "Creator of 'Dakar Dreams'",
      image: "FD",
      quote: "Finally, a platform that truly values African storytellers. The support team is incredible and payouts are always on time.",
      earnings: "$15,000+",
      period: "in 8 months"
    }
  ];

  const faqs = [
    {
      question: "How much can I earn?",
      answer: "Earnings depend on your content's popularity. Top creators earn $5,000-$20,000+ monthly. You keep 70% of every coin spent on your content."
    },
    {
      question: "What content can I upload?",
      answer: "We accept mini-series, short films, and episodic content. All content must be original and follow our community guidelines."
    },
    {
      question: "How do I get paid?",
      answer: "Payouts are processed within 48 hours of request via M-Pesa, MTN MoMo, bank transfer, or PayPal. Minimum withdrawal is $50."
    },
    {
      question: "Do I keep my rights?",
      answer: "Yes! You retain full ownership of your content. Kona has a non-exclusive license to distribute on our platform."
    }
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <button onClick={() => navigate("/")} className="hover:opacity-80 transition">
            <KonaLogo2Full height={28} />
          </button>
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate("/advertisers")}>
              For Advertisers
            </Button>
            <Button variant="outline" onClick={() => navigate("/creator/login")}>
              Creator Login
            </Button>
            <Button onClick={() => navigate("/creator/register")}>
              Start Creating
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative py-20 md:py-32 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-green-500/20 via-background to-background" />
        <div className="absolute top-20 left-20 w-96 h-96 bg-green-500/30 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-20 w-64 h-64 bg-primary/20 rounded-full blur-3xl" />
        
        <div className="relative max-w-7xl mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-500/10 border border-green-500/30 text-green-500 text-sm font-medium mb-6">
                <Film className="w-4 h-4" />
                Join 500+ African Creators
              </div>
              
              <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
                Turn Your Stories Into <span className="text-green-500">Income</span>
              </h1>
              
              <p className="text-xl text-muted-foreground mb-8 leading-relaxed">
                Upload your mini-series, reach millions of viewers, and earn 70% of every coin spent on your content. 
                Africa's storytellers deserve to be paid.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 mb-8">
                <Button 
                  size="lg" 
                  className="text-lg px-8 bg-green-600 hover:bg-green-700"
                  onClick={() => navigate("/creator/register")}
                >
                  Apply Now - It's Free
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
                <Button 
                  size="lg" 
                  variant="outline"
                  className="text-lg px-8"
                  onClick={() => document.getElementById('how-it-works').scrollIntoView({ behavior: 'smooth' })}
                >
                  <Play className="w-5 h-5 mr-2" />
                  How It Works
                </Button>
              </div>
              
              <div className="flex items-center gap-6 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  Free to join
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  No upfront costs
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  Keep your rights
                </div>
              </div>
            </div>
            
            {/* Creator Dashboard Preview */}
            <div className="relative hidden lg:block">
              <div className="absolute inset-0 bg-gradient-to-br from-green-500/20 to-primary/20 rounded-2xl blur-xl" />
              <Card className="relative p-6 bg-background/80 backdrop-blur border-white/10">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-semibold">Creator Dashboard</h3>
                  <span className="text-xs text-green-500">Live</span>
                </div>
                <div className="space-y-4">
                  <div className="p-4 rounded-lg bg-white/5">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-muted-foreground">This Month's Earnings</span>
                      <TrendingUp className="w-4 h-4 text-green-500" />
                    </div>
                    <div className="text-3xl font-bold text-green-500">$4,250.00</div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="p-3 rounded-lg bg-white/5 text-center">
                      <Eye className="w-5 h-5 text-primary mx-auto mb-1" />
                      <div className="font-bold">125K</div>
                      <div className="text-xs text-muted-foreground">Views</div>
                    </div>
                    <div className="p-3 rounded-lg bg-white/5 text-center">
                      <Heart className="w-5 h-5 text-red-500 mx-auto mb-1" />
                      <div className="font-bold">8.5K</div>
                      <div className="text-xs text-muted-foreground">Likes</div>
                    </div>
                    <div className="p-3 rounded-lg bg-white/5 text-center">
                      <Star className="w-5 h-5 text-yellow-500 mx-auto mb-1" />
                      <div className="font-bold">4.8</div>
                      <div className="text-xs text-muted-foreground">Rating</div>
                    </div>
                  </div>
                </div>
              </Card>
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
                <stat.icon className="w-8 h-8 text-green-500 mx-auto mb-3" />
                <div className="text-3xl md:text-4xl font-bold text-white mb-1">{stat.value}</div>
                <div className="text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Why Creators Choose Kona</h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              We built Kona for African storytellers. Here's why creators love our platform.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {benefits.map((benefit, index) => (
              <Card key={index} className="p-6 bg-white/5 border-white/10 hover:border-green-500/50 transition-all group">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center group-hover:bg-green-500/20 transition">
                    <benefit.icon className="w-6 h-6 text-green-500" />
                  </div>
                  <span className="text-xs font-bold text-green-500 bg-green-500/10 px-2 py-1 rounded-full">
                    {benefit.highlight}
                  </span>
                </div>
                <h3 className="text-lg font-semibold mb-2">{benefit.title}</h3>
                <p className="text-muted-foreground text-sm">{benefit.description}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-20 bg-white/5">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">How It Works</h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              From application to your first payout in just a few simple steps
            </p>
          </div>
          
          <div className="grid md:grid-cols-4 gap-8">
            {howItWorks.map((step, index) => (
              <div key={index} className="relative">
                {index < howItWorks.length - 1 && (
                  <div className="hidden md:block absolute top-12 left-1/2 w-full h-0.5 bg-gradient-to-r from-green-500 to-green-500/0" />
                )}
                <div className="text-center relative">
                  <div className="w-24 h-24 rounded-full bg-green-500/10 border-2 border-green-500 flex items-center justify-center mx-auto mb-4">
                    <step.icon className="w-10 h-10 text-green-500" />
                  </div>
                  <div className="text-sm font-bold text-green-500 mb-2">Step {step.step}</div>
                  <h3 className="text-lg font-semibold mb-2">{step.title}</h3>
                  <p className="text-muted-foreground text-sm">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Creator Success Stories</h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Hear from creators who turned their passion into profit
            </p>
          </div>
          
          <div className="max-w-4xl mx-auto">
            <Card className="p-8 bg-white/5 border-white/10">
              <div className="flex flex-col md:flex-row gap-8 items-center">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-green-500 to-primary flex items-center justify-center text-2xl font-bold flex-shrink-0">
                  {testimonials[activeTestimonial].image}
                </div>
                <div className="flex-1 text-center md:text-left">
                  <p className="text-lg mb-4 italic">"{testimonials[activeTestimonial].quote}"</p>
                  <div className="font-semibold">{testimonials[activeTestimonial].name}</div>
                  <div className="text-sm text-muted-foreground mb-4">{testimonials[activeTestimonial].role}</div>
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-500/10 text-green-500">
                    <DollarSign className="w-4 h-4" />
                    <span className="font-bold">{testimonials[activeTestimonial].earnings}</span>
                    <span className="text-sm">{testimonials[activeTestimonial].period}</span>
                  </div>
                </div>
              </div>
            </Card>
            
            <div className="flex justify-center gap-2 mt-6">
              {testimonials.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setActiveTestimonial(index)}
                  className={`w-3 h-3 rounded-full transition-all ${
                    index === activeTestimonial ? 'bg-green-500 w-8' : 'bg-white/20'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 bg-white/5">
        <div className="max-w-3xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Frequently Asked Questions</h2>
          </div>
          
          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <Card key={index} className="p-6 bg-background border-white/10">
                <h3 className="font-semibold mb-2">{faq.question}</h3>
                <p className="text-muted-foreground text-sm">{faq.answer}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-500/10 border border-green-500/30 text-green-500 text-sm font-medium mb-6">
            <Zap className="w-4 h-4" />
            Limited Time: First 100 creators get featured placement
          </div>
          
          <h2 className="text-3xl md:text-5xl font-bold mb-6">
            Your Audience is Waiting
          </h2>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Join hundreds of African creators earning real income from their stories. 
            Apply today and start monetizing your content within 48 hours.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg" 
              className="text-lg px-8 bg-green-600 hover:bg-green-700"
              onClick={() => navigate("/creator/register")}
            >
              Apply to Become a Creator
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
            <Button 
              size="lg" 
              variant="outline"
              className="text-lg px-8"
              onClick={() => navigate("/creator/login")}
            >
              Already a Creator? Log In
            </Button>
          </div>
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

export default CreatorsLandingPage;
