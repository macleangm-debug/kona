import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Play, Smartphone, Download, Star, Users, Film, ChevronRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { KonaLogo2Full } from "@/components/KonaLogo";
import SEO from "@/components/SEO";

const LandingPage = ({ onAuthClick }) => {
  const navigate = useNavigate();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  const handleStartWatching = () => {
    // Mark that user has seen landing page and wants to watch
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

  return (
    <div className="min-h-screen bg-[#030014] text-white overflow-hidden" data-testid="landing-page">
      <SEO 
        title="Kona - Africa's Premier Mini-Series Streaming Platform"
        description="Watch exclusive African mini-series, earn rewards, and join millions of viewers. Romance, drama, thriller & more. Start watching free today!"
        url="https://www.streamkona.com"
      />

      {/* Hero Section */}
      <div className="relative min-h-screen flex flex-col">
        {/* Background Image with Gradient */}
        <div className="absolute inset-0">
          <img 
            src="https://images.pexels.com/photos/3807517/pexels-photo-3807517.jpeg?auto=compress&cs=tinysrgb&w=1920"
            alt="Kona Streaming"
            className="w-full h-full object-cover opacity-40"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#030014] via-[#030014]/70 to-[#030014]" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#030014] via-transparent to-[#030014]/50" />
        </div>

        {/* Floating Particles Effect */}
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
        <header className="relative z-10 px-6 lg:px-12 py-6 flex items-center justify-between">
          <KonaLogo2Full height={36} />
          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              className="text-white/80 hover:text-white hover:bg-white/10"
              onClick={onAuthClick}
            >
              Sign In
            </Button>
            <Button 
              className="bg-primary hover:bg-primary/90 rounded-full px-6"
              onClick={onAuthClick}
            >
              Get Started
            </Button>
          </div>
        </header>

        {/* Main Hero Content */}
        <div className={`relative z-10 flex-1 flex items-center justify-center px-6 lg:px-12 transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          <div className="max-w-4xl mx-auto text-center">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full mb-6 border border-white/20">
              <Sparkles className="w-4 h-4 text-yellow-400" />
              <span className="text-sm font-medium">Africa's #1 Mini-Series Platform</span>
            </div>

            {/* Main Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-7xl font-bold mb-6 leading-tight">
              Stories That Move
              <span className="block bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 bg-clip-text text-transparent">
                Africa Forward
              </span>
            </h1>

            {/* Subheadline */}
            <p className="text-lg sm:text-xl text-gray-300 mb-8 max-w-2xl mx-auto leading-relaxed">
              Discover exclusive African mini-series. Romance, drama, thrillers & more. 
              Watch free episodes, earn rewards, and join millions of viewers.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
              <Button 
                size="lg"
                onClick={handleStartWatching}
                className="bg-white text-black hover:bg-white/90 rounded-full px-8 h-14 text-lg font-semibold shadow-2xl shadow-white/20 hover:scale-105 transition-all w-full sm:w-auto"
                data-testid="start-watching-btn"
              >
                <Play className="w-6 h-6 fill-black mr-2" />
                Start Watching Free
              </Button>
              <Button 
                size="lg"
                variant="outline"
                onClick={() => navigate('/about')}
                className="border-white/30 hover:bg-white/10 rounded-full px-8 h-14 text-lg w-full sm:w-auto"
              >
                Learn More
                <ChevronRight className="w-5 h-5 ml-1" />
              </Button>
            </div>

            {/* Stats */}
            <div className="flex items-center justify-center gap-8 sm:gap-16">
              {stats.map((stat, i) => (
                <div key={i} className="text-center">
                  <div className="text-2xl sm:text-3xl font-bold text-white">{stat.value}</div>
                  <div className="text-xs sm:text-sm text-gray-400">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Scroll Indicator */}
        <div className="relative z-10 pb-8 flex justify-center">
          <div className="animate-bounce">
            <div className="w-6 h-10 border-2 border-white/30 rounded-full flex justify-center pt-2">
              <div className="w-1 h-2 bg-white/60 rounded-full animate-pulse" />
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <section className="py-20 px-6 lg:px-12 bg-gradient-to-b from-[#030014] to-[#0a0520]">
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
          
          <h2 className="text-3xl sm:text-4xl font-bold mb-6">
            Take Kona Everywhere
          </h2>
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
      <footer className="py-8 px-6 border-t border-white/10">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <KonaLogo2Full height={24} />
          <div className="flex items-center gap-6 text-sm text-gray-500">
            <button onClick={() => navigate('/about')} className="hover:text-white transition-colors">About</button>
            <button onClick={() => navigate('/terms')} className="hover:text-white transition-colors">Terms</button>
            <button onClick={() => navigate('/privacy')} className="hover:text-white transition-colors">Privacy</button>
            <button onClick={() => navigate('/creators')} className="hover:text-white transition-colors">Creators</button>
          </div>
          <p className="text-sm text-gray-600">© 2026 Kona. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
