import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Play, Smartphone, Download, Star, Users, Film, ChevronRight, Sparkles,
  ChevronDown, UserPlus, Coins, Tv, Mail, MapPin, Phone, 
  Twitter, Instagram, Facebook, Youtube, Heart, Shield, Zap
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { KonaLogo2Full } from "@/components/KonaLogo";
import SEO from "@/components/SEO";

const LandingPage = ({ onAuthClick }) => {
  const navigate = useNavigate();
  const [isVisible, setIsVisible] = useState(false);
  const [openFaq, setOpenFaq] = useState(null);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  const handleStartWatching = () => {
    sessionStorage.setItem('kona_entered_app', 'true');
    navigate('/home');
  };

  const features = [
    { icon: Film, title: "Exclusive Series", desc: "Original African mini-series you won't find anywhere else" },
    { icon: Smartphone, title: "Watch Anywhere", desc: "Stream on mobile, tablet, or desktop - even offline" },
    { icon: Users, title: "Join the Community", desc: "Earn coins, compete on leaderboards, unlock rewards" },
  ];

  const stats = [
    { value: "500+", label: "Episodes" },
    { value: "50+", label: "Original Series" },
    { value: "1M+", label: "Happy Viewers" },
  ];

  const howItWorks = [
    { 
      step: "1", 
      icon: UserPlus, 
      title: "Sign Up Free", 
      desc: "Create your account in seconds with email or phone. No credit card required.",
      color: "from-blue-500 to-cyan-500"
    },
    { 
      step: "2", 
      icon: Tv, 
      title: "Browse & Watch", 
      desc: "Explore our library of exclusive African mini-series. First episode is always free!",
      color: "from-purple-500 to-pink-500"
    },
    { 
      step: "3", 
      icon: Coins, 
      title: "Earn Rewards", 
      desc: "Watch daily, complete challenges, and earn coins to unlock more episodes.",
      color: "from-yellow-500 to-orange-500"
    },
    { 
      step: "4", 
      icon: Heart, 
      title: "Enjoy & Share", 
      desc: "Binge your favorites, join watch parties, and share with friends to earn more!",
      color: "from-pink-500 to-red-500"
    },
  ];

  const faqs = [
    {
      question: "Is Kona free to use?",
      answer: "Yes! You can sign up for free and watch the first episode of every series at no cost. You earn coins daily through rewards, challenges, and referrals which you can use to unlock more episodes. Premium subscriptions are available for unlimited access."
    },
    {
      question: "What kind of content is on Kona?",
      answer: "Kona features exclusive African mini-series across genres including Romance, Drama, Thriller, Action, Comedy, and Fantasy. Our content is produced by talented African creators and tells authentic African stories that resonate with audiences worldwide."
    },
    {
      question: "How do I earn coins?",
      answer: "There are many ways to earn coins: Daily check-ins, watching episodes, completing challenges, referring friends, spinning the daily wheel, participating in prediction games, and maintaining watch streaks. The more you engage, the more you earn!"
    },
    {
      question: "Can I watch offline?",
      answer: "Yes! Premium and VIP subscribers can download episodes to watch offline. Simply tap the download button on any episode and enjoy your favorite series without an internet connection."
    },
    {
      question: "How do I become a VIP member?",
      answer: "VIP membership gives you unlimited access to all content, ad-free viewing, early access to new releases, and exclusive perks. You can upgrade from your profile or when you try to access VIP content. We accept mobile money, cards, and crypto payments."
    },
    {
      question: "Is Kona available in my country?",
      answer: "Kona is available across Africa and globally! We support local payment methods in Kenya, Nigeria, South Africa, Ghana, Tanzania, Uganda, and many more countries. Content is available worldwide with localized pricing."
    },
    {
      question: "How do I become a creator on Kona?",
      answer: "We're always looking for talented creators! Visit our Creator Portal to apply. We offer competitive revenue sharing, production support, and access to millions of engaged viewers. Join the Kona creator community today."
    },
  ];

  const footerLinks = {
    company: [
      { label: "About Us", path: "/about" },
      { label: "Careers", path: "/careers" },
      { label: "Press", path: "/press" },
      { label: "Contact", path: "/contact" },
    ],
    support: [
      { label: "Help Center", path: "/help" },
      { label: "Safety", path: "/safety" },
      { label: "Community Guidelines", path: "/guidelines" },
      { label: "Accessibility", path: "/accessibility" },
    ],
    legal: [
      { label: "Terms of Service", path: "/terms" },
      { label: "Privacy Policy", path: "/privacy" },
      { label: "Cookie Policy", path: "/cookies" },
      { label: "DMCA", path: "/dmca" },
    ],
    creators: [
      { label: "Creator Portal", path: "/creators" },
      { label: "Creator Guidelines", path: "/creator-guidelines" },
      { label: "Revenue Sharing", path: "/revenue" },
      { label: "Apply Now", path: "/business/apply" },
    ],
  };

  return (
    <div className="min-h-screen bg-[#030014] text-white overflow-hidden" data-testid="landing-page">
      <SEO 
        title="Kona - Africa's Premier Mini-Series Streaming Platform"
        description="Watch exclusive African mini-series, earn rewards, and join millions of viewers. Romance, drama, thriller & more. Start watching free today!"
        url="https://www.streamkona.com"
      />

      {/* Hero Section */}
      <div className="relative min-h-screen flex flex-col">
        <div className="absolute inset-0">
          <img 
            src="https://images.pexels.com/photos/3807517/pexels-photo-3807517.jpeg?auto=compress&cs=tinysrgb&w=1920"
            alt="Kona Streaming"
            className="w-full h-full object-cover opacity-40"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#030014] via-[#030014]/70 to-[#030014]" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#030014] via-transparent to-[#030014]/50" />
        </div>

        {/* Floating Particles */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 bg-purple-500/30 rounded-full animate-pulse"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 2}s`,
                animationDuration: `${2 + Math.random() * 3}s`,
              }}
            />
          ))}
        </div>

        {/* Header */}
        <header className="relative z-10 px-4 sm:px-6 lg:px-12 py-4 sm:py-6 flex items-center justify-between">
          <KonaLogo2Full height={28} className="sm:h-9" />
          <div className="flex items-center gap-2 sm:gap-3">
            <Button 
              variant="ghost" 
              className="text-white/80 hover:text-white hover:bg-white/10 text-sm sm:text-base px-3 sm:px-4"
              onClick={onAuthClick}
            >
              Sign In
            </Button>
            <Button 
              className="bg-primary hover:bg-primary/90 rounded-full px-4 sm:px-6 text-sm sm:text-base"
              onClick={onAuthClick}
            >
              Get Started
            </Button>
          </div>
        </header>

        {/* Hero Content */}
        <div className={`relative z-10 flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-12 transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-white/10 backdrop-blur-sm rounded-full mb-4 sm:mb-6 border border-white/20">
              <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-yellow-400" />
              <span className="text-xs sm:text-sm font-medium">Africa's #1 Mini-Series Platform</span>
            </div>

            <h1 className="text-3xl sm:text-5xl lg:text-7xl font-bold mb-4 sm:mb-6 leading-tight">
              Stories That Move
              <span className="block bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 bg-clip-text text-transparent">
                Africa Forward
              </span>
            </h1>

            <p className="text-base sm:text-xl text-gray-300 mb-6 sm:mb-8 max-w-2xl mx-auto leading-relaxed px-2">
              Discover exclusive African mini-series. Romance, drama, thrillers & more. 
              Watch free episodes, earn rewards, and join millions of viewers.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 mb-8 sm:mb-12 px-2">
              <Button 
                size="lg"
                onClick={handleStartWatching}
                className="bg-white text-black hover:bg-white/90 rounded-full px-6 sm:px-8 h-12 sm:h-14 text-base sm:text-lg font-semibold shadow-2xl shadow-white/20 hover:scale-105 transition-all w-full sm:w-auto"
                data-testid="start-watching-btn"
              >
                <Play className="w-5 h-5 sm:w-6 sm:h-6 fill-black mr-2" />
                Start Watching Free
              </Button>
              <Button 
                size="lg"
                variant="outline"
                onClick={() => document.getElementById('how-it-works').scrollIntoView({ behavior: 'smooth' })}
                className="border-white/30 hover:bg-white/10 rounded-full px-6 sm:px-8 h-12 sm:h-14 text-base sm:text-lg w-full sm:w-auto"
              >
                How It Works
                <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 ml-1" />
              </Button>
            </div>

            <div className="flex items-center justify-center gap-6 sm:gap-16">
              {stats.map((stat, i) => (
                <div key={i} className="text-center">
                  <div className="text-xl sm:text-3xl font-bold text-white">{stat.value}</div>
                  <div className="text-xs sm:text-sm text-gray-400">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Scroll Indicator */}
        <div className="relative z-10 pb-8 flex justify-center">
          <button 
            onClick={() => document.getElementById('how-it-works').scrollIntoView({ behavior: 'smooth' })}
            className="animate-bounce"
          >
            <div className="w-6 h-10 border-2 border-white/30 rounded-full flex justify-center pt-2">
              <div className="w-1 h-2 bg-white/60 rounded-full animate-pulse" />
            </div>
          </button>
        </div>
      </div>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-20 px-6 lg:px-12 bg-gradient-to-b from-[#030014] to-[#0a0520]">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-500/10 rounded-full mb-4 border border-green-500/20">
              <Zap className="w-4 h-4 text-green-400" />
              <span className="text-sm text-green-400 font-medium">Super Easy to Get Started</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">Start Watching in Seconds</h2>
            <p className="text-gray-400 max-w-xl mx-auto">No complicated setup. No credit card required. Just pure entertainment.</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {howItWorks.map((item, i) => (
              <div 
                key={i}
                className="relative bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10 hover:border-white/20 transition-all group"
              >
                {/* Step number */}
                <div className={`absolute -top-3 -left-3 w-8 h-8 bg-gradient-to-br ${item.color} rounded-full flex items-center justify-center text-sm font-bold shadow-lg`}>
                  {item.step}
                </div>
                
                {/* Connector line (not on last item) */}
                {i < howItWorks.length - 1 && (
                  <div className="hidden lg:block absolute top-1/2 -right-3 w-6 h-0.5 bg-gradient-to-r from-white/20 to-transparent" />
                )}
                
                <div className={`w-14 h-14 bg-gradient-to-br ${item.color} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                  <item.icon className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{item.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>

          {/* CTA after steps */}
          <div className="text-center mt-12">
            <Button 
              size="lg"
              onClick={onAuthClick}
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 rounded-full px-10 h-14 text-lg font-semibold"
            >
              <UserPlus className="w-5 h-5 mr-2" />
              Create Free Account
            </Button>
            <p className="text-gray-500 text-sm mt-3">Takes less than 30 seconds</p>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-6 lg:px-12 bg-[#0a0520]">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">Why Choose Kona?</h2>
            <p className="text-gray-400 max-w-xl mx-auto">Experience African storytelling like never before</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature, i) => (
              <div 
                key={i}
                className="bg-white/5 backdrop-blur-sm rounded-2xl p-8 border border-white/10 hover:border-purple-500/50 transition-all hover:transform hover:scale-105 group"
              >
                <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <feature.icon className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
                <p className="text-gray-400 leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* App Download Section */}
      <section className="py-20 px-6 lg:px-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-purple-900/20 via-transparent to-pink-900/20" />
        
        <div className="max-w-4xl mx-auto relative z-10 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 rounded-full mb-6">
            <Download className="w-4 h-4 text-green-400" />
            <span className="text-sm">Install as App for the Best Experience</span>
          </div>
          
          <h2 className="text-3xl sm:text-4xl font-bold mb-6">Take Kona Everywhere</h2>
          <p className="text-gray-400 mb-8 max-w-xl mx-auto">
            Install Kona on your device for instant access, offline viewing, and push notifications for new episodes.
          </p>
          
          <Button 
            size="lg"
            onClick={handleStartWatching}
            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 rounded-full px-8 h-14 text-lg font-semibold"
          >
            <Smartphone className="w-5 h-5 mr-2" />
            Enter Kona
          </Button>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 px-6 lg:px-12 bg-[#0a0520]">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">What Viewers Say</h2>
          
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { name: "Amara K.", location: "Kenya", text: "Finally a platform that tells OUR stories! The romance series are addictive." },
              { name: "Chidi O.", location: "Nigeria", text: "Love the coin system - I've earned so much just by watching and engaging!" },
              { name: "Thandiwe M.", location: "South Africa", text: "The app is so smooth. I watch on my commute every day. Best decision ever." },
            ].map((review, i) => (
              <div key={i} className="bg-white/5 rounded-2xl p-6 border border-white/10">
                <div className="flex items-center gap-1 mb-4">
                  {[...Array(5)].map((_, j) => (
                    <Star key={j} className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                  ))}
                </div>
                <p className="text-gray-300 mb-4 leading-relaxed">"{review.text}"</p>
                <div className="text-sm">
                  <span className="font-semibold">{review.name}</span>
                  <span className="text-gray-500"> · {review.location}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 px-6 lg:px-12 bg-gradient-to-b from-[#0a0520] to-[#030014]">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">Frequently Asked Questions</h2>
            <p className="text-gray-400">Everything you need to know about Kona</p>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, i) => (
              <div 
                key={i}
                className="bg-white/5 rounded-xl border border-white/10 overflow-hidden"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-white/5 transition-colors"
                >
                  <span className="font-medium pr-4">{faq.question}</span>
                  <ChevronDown 
                    className={`w-5 h-5 text-gray-400 flex-shrink-0 transition-transform ${openFaq === i ? 'rotate-180' : ''}`}
                  />
                </button>
                {openFaq === i && (
                  <div className="px-6 pb-4">
                    <p className="text-gray-400 leading-relaxed">{faq.answer}</p>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Still have questions? */}
          <div className="text-center mt-12 p-8 bg-white/5 rounded-2xl border border-white/10">
            <h3 className="text-xl font-semibold mb-2">Still have questions?</h3>
            <p className="text-gray-400 mb-4">Our support team is here to help 24/7</p>
            <Button 
              variant="outline"
              onClick={() => navigate('/contact')}
              className="border-white/30 hover:bg-white/10"
            >
              <Mail className="w-4 h-4 mr-2" />
              Contact Support
            </Button>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 px-6 lg:px-12 text-center">
        <h2 className="text-3xl sm:text-4xl font-bold mb-6">Ready to Start Watching?</h2>
        <p className="text-gray-400 mb-8 max-w-lg mx-auto">
          Join millions of viewers. First episode of every series is free!
        </p>
        <Button 
          size="lg"
          onClick={handleStartWatching}
          className="bg-white text-black hover:bg-white/90 rounded-full px-10 h-14 text-lg font-semibold"
          data-testid="final-cta-btn"
        >
          <Play className="w-6 h-6 fill-black mr-2" />
          Start Watching Now
        </Button>
      </section>

      {/* Footer */}
      <footer className="bg-black/50 border-t border-white/10">
        {/* Main Footer */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-12 py-10 sm:py-16">
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-5 gap-6 sm:gap-8">
            {/* Brand Column */}
            <div className="col-span-2">
              <KonaLogo2Full height={24} className="sm:h-7" />
              <p className="text-gray-400 text-sm mt-3 sm:mt-4 leading-relaxed max-w-xs">
                Africa's premier mini-series streaming platform. Stories that move Africa forward.
              </p>
              {/* Social Links */}
              <div className="flex items-center gap-2 sm:gap-3 mt-4 sm:mt-6">
                <a href="https://twitter.com/streamkona" target="_blank" rel="noopener noreferrer" className="w-9 h-9 sm:w-10 sm:h-10 bg-white/5 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors">
                  <Twitter className="w-4 h-4" />
                </a>
                <a href="https://instagram.com/streamkona" target="_blank" rel="noopener noreferrer" className="w-9 h-9 sm:w-10 sm:h-10 bg-white/5 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors">
                  <Instagram className="w-4 h-4" />
                </a>
                <a href="https://facebook.com/streamkona" target="_blank" rel="noopener noreferrer" className="w-9 h-9 sm:w-10 sm:h-10 bg-white/5 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors">
                  <Facebook className="w-4 h-4" />
                </a>
                <a href="https://youtube.com/@streamkona" target="_blank" rel="noopener noreferrer" className="w-9 h-9 sm:w-10 sm:h-10 bg-white/5 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors">
                  <Youtube className="w-4 h-4" />
                </a>
              </div>
            </div>

            {/* Company */}
            <div>
              <h4 className="font-semibold mb-3 sm:mb-4 text-xs sm:text-sm uppercase tracking-wider text-gray-300">Company</h4>
              <ul className="space-y-2 sm:space-y-3">
                {footerLinks.company.map((link, i) => (
                  <li key={i}>
                    <button 
                      onClick={() => navigate(link.path)}
                      className="text-gray-400 hover:text-white text-sm transition-colors"
                    >
                      {link.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {/* Support */}
            <div>
              <h4 className="font-semibold mb-3 sm:mb-4 text-xs sm:text-sm uppercase tracking-wider text-gray-300">Support</h4>
              <ul className="space-y-2 sm:space-y-3">
                {footerLinks.support.map((link, i) => (
                  <li key={i}>
                    <button 
                      onClick={() => navigate(link.path)}
                      className="text-gray-400 hover:text-white text-sm transition-colors"
                    >
                      {link.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h4 className="font-semibold mb-3 sm:mb-4 text-xs sm:text-sm uppercase tracking-wider text-gray-300">Legal</h4>
              <ul className="space-y-2 sm:space-y-3">
                {footerLinks.legal.map((link, i) => (
                  <li key={i}>
                    <button 
                      onClick={() => navigate(link.path)}
                      className="text-gray-400 hover:text-white text-sm transition-colors"
                    >
                      {link.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {/* Creators */}
            <div>
              <h4 className="font-semibold mb-3 sm:mb-4 text-xs sm:text-sm uppercase tracking-wider text-gray-300">Creators</h4>
              <ul className="space-y-2 sm:space-y-3">
                {footerLinks.creators.map((link, i) => (
                  <li key={i}>
                    <button 
                      onClick={() => navigate(link.path)}
                      className="text-gray-400 hover:text-white text-sm transition-colors"
                    >
                      {link.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-white/10">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-12 py-4 sm:py-6">
            <div className="flex flex-col items-center gap-3 sm:gap-4 text-center">
              {/* Locations - stack on mobile */}
              <div className="flex flex-wrap items-center justify-center gap-1 sm:gap-2 text-xs sm:text-sm text-gray-500">
                <MapPin className="w-3 h-3 sm:w-4 sm:h-4" />
                <span>Nairobi</span>
                <span className="mx-1 hidden sm:inline">|</span>
                <span className="sm:hidden">,</span>
                <span>Lagos</span>
                <span className="mx-1 hidden sm:inline">|</span>
                <span className="sm:hidden">,</span>
                <span>Johannesburg</span>
              </div>
              {/* Copyright */}
              <div className="text-xs sm:text-sm text-gray-500">
                © 2026 Kona Entertainment Ltd. All rights reserved.
              </div>
            </div>
            
            {/* Payment Methods & Trust Badges */}
            <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-4 mt-4 sm:mt-6 pt-4 sm:pt-6 border-t border-white/5">
              <div className="flex items-center gap-1.5 sm:gap-2 text-xs text-gray-500">
                <Shield className="w-3 h-3 sm:w-4 sm:h-4 text-green-500" />
                <span>Secure Payments</span>
              </div>
              <span className="text-gray-600 hidden sm:inline">|</span>
              <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 text-xs text-gray-500">
                <span>M-Pesa</span>
                <span>Airtel Money</span>
                <span>Visa</span>
                <span>Mastercard</span>
                <span className="hidden sm:inline">PayPal</span>
                <span className="hidden sm:inline">Crypto</span>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
