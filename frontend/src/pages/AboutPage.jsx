import React from "react";
import { useNavigate } from "react-router-dom";
import { Play, Coins, Gift, Users, Star, Smartphone, Globe, Shield, ChevronRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { KonaLogo2Full } from "@/components/KonaLogo";
import SEO from "@/components/SEO";

const AboutPage = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: <Play className="w-6 h-6" />,
      title: "Watch Mini-Series",
      description: "Enjoy exclusive African drama, romance, thriller, and action series. New episodes added daily."
    },
    {
      icon: <Coins className="w-6 h-6" />,
      title: "Pay Per Episode",
      description: "No monthly subscriptions. Buy coins and spend them only on episodes you want to watch."
    },
    {
      icon: <Gift className="w-6 h-6" />,
      title: "Earn Free Coins",
      description: "Get free coins through daily rewards, referrals, and watching ads. Start watching for free!"
    },
    {
      icon: <Smartphone className="w-6 h-6" />,
      title: "Mobile Money",
      description: "Pay easily with M-Pesa, MTN MoMo, Airtel Money, and other local payment methods."
    }
  ];

  const howItWorks = [
    {
      step: "1",
      title: "Create Free Account",
      description: "Sign up in seconds with your email. No credit card required."
    },
    {
      step: "2",
      title: "Get Your Coins",
      description: "Earn free coins daily or buy coin packages starting from $0.99."
    },
    {
      step: "3",
      title: "Start Watching",
      description: "Browse series, unlock episodes with coins, and enjoy premium content."
    }
  ];

  const stats = [
    { value: "25+", label: "Original Series" },
    { value: "300+", label: "Episodes" },
    { value: "100K+", label: "Happy Viewers" },
    { value: "4.8", label: "App Rating" }
  ];

  const testimonials = [
    {
      name: "Sarah M.",
      location: "Nairobi, Kenya",
      text: "Finally, a streaming app that understands Africa! The M-Pesa integration is so convenient.",
      rating: 5
    },
    {
      name: "James O.",
      location: "Lagos, Nigeria",
      text: "Love the daily free coins. I've watched so many series without spending money!",
      rating: 5
    },
    {
      name: "Grace T.",
      location: "Dar es Salaam, Tanzania",
      text: "The stories are amazing and relatable. Best entertainment app on my phone.",
      rating: 5
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <SEO 
        title="About Stream Kona | How It Works | African Mini-Series Streaming"
        description="Learn how Stream Kona works. Watch African mini-series, pay per episode with mobile money, earn free coins daily. No subscriptions required!"
        url="https://www.streamkona.com/about"
        keywords="how Kona works, African streaming, pay per episode, mobile money payments, free coins, mini-series"
      />

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-white/10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <button onClick={() => navigate("/")} className="hover:opacity-80 transition-opacity">
            <KonaLogo2Full height={32} />
          </button>
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate("/")}>
              Browse
            </Button>
            <Button onClick={() => navigate("/")} className="bg-primary hover:bg-primary/90">
              Start Watching
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full text-primary text-sm font-medium mb-6">
            <Globe className="w-4 h-4" />
            Africa's Premier Streaming Platform
          </div>
          
          <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
            Watch Amazing Stories.
            <br />
            <span className="text-primary">Pay Only What You Watch.</span>
          </h1>
          
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Stream Kona brings you the best African mini-series. No monthly fees. 
            Pay per episode with mobile money or earn free coins daily.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button 
              size="lg" 
              onClick={() => navigate("/")}
              className="bg-primary hover:bg-primary/90 text-lg px-8 h-14"
            >
              <Play className="w-5 h-5 mr-2 fill-white" />
              Start Watching Free
            </Button>
            <Button 
              size="lg" 
              variant="outline"
              onClick={() => navigate("/store")}
              className="text-lg px-8 h-14 border-white/20"
            >
              <Coins className="w-5 h-5 mr-2" />
              Get Coins
            </Button>
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="py-12 bg-white/5 border-y border-white/10">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-primary mb-1">{stat.value}</div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Why Choose Stream Kona?</h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              We built Kona for Africa. Local payment methods, relatable stories, and flexible pricing.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <div 
                key={index}
                className="p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-primary/30 transition-all group"
              >
                <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                  {feature.icon}
                </div>
                <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                <p className="text-muted-foreground text-sm">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 px-4 bg-gradient-to-b from-primary/5 to-transparent">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">How It Works</h2>
            <p className="text-muted-foreground text-lg">
              Start watching in 3 simple steps
            </p>
          </div>
          
          <div className="space-y-6">
            {howItWorks.map((item, index) => (
              <div 
                key={index}
                className="flex items-start gap-6 p-6 rounded-2xl bg-white/5 border border-white/10"
              >
                <div className="w-12 h-12 rounded-full bg-primary text-white flex items-center justify-center font-bold text-xl flex-shrink-0">
                  {item.step}
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">{item.title}</h3>
                  <p className="text-muted-foreground">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
          
          <div className="text-center mt-12">
            <Button 
              size="lg" 
              onClick={() => navigate("/")}
              className="bg-primary hover:bg-primary/90"
            >
              Get Started Now
              <ChevronRight className="w-5 h-5 ml-2" />
            </Button>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Simple, Flexible Pricing</h2>
            <p className="text-muted-foreground text-lg">
              No subscriptions. Buy coins when you need them.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-6">
            <div className="p-6 rounded-2xl bg-white/5 border border-white/10 text-center">
              <div className="text-4xl mb-2">🎁</div>
              <h3 className="text-lg font-semibold mb-2">Free Coins</h3>
              <p className="text-muted-foreground text-sm mb-4">Daily rewards, referrals & ads</p>
              <div className="text-2xl font-bold text-primary">FREE</div>
            </div>
            
            <div className="p-6 rounded-2xl bg-primary/10 border border-primary/30 text-center relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-primary text-white text-xs font-bold rounded-full">
                POPULAR
              </div>
              <div className="text-4xl mb-2">⭐</div>
              <h3 className="text-lg font-semibold mb-2">350 Coins</h3>
              <p className="text-muted-foreground text-sm mb-4">+50 bonus coins included</p>
              <div className="text-2xl font-bold text-primary">$4.99</div>
            </div>
            
            <div className="p-6 rounded-2xl bg-white/5 border border-white/10 text-center">
              <div className="text-4xl mb-2">💎</div>
              <h3 className="text-lg font-semibold mb-2">800 Coins</h3>
              <p className="text-muted-foreground text-sm mb-4">+150 bonus coins included</p>
              <div className="text-2xl font-bold text-primary">$9.99</div>
            </div>
          </div>
          
          <div className="mt-8 p-4 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center gap-3">
            <Shield className="w-6 h-6 text-green-500 flex-shrink-0" />
            <p className="text-sm">
              <span className="font-semibold text-green-500">Secure Payments:</span>{" "}
              <span className="text-muted-foreground">Pay with M-Pesa, MTN MoMo, Airtel Money, or Card. All transactions are encrypted and secure.</span>
            </p>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 px-4 bg-white/5">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Loved by Viewers</h2>
            <p className="text-muted-foreground text-lg">
              See what our community is saying
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((testimonial, index) => (
              <div 
                key={index}
                className="p-6 rounded-2xl bg-background border border-white/10"
              >
                <div className="flex items-center gap-1 mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                  ))}
                </div>
                <p className="text-muted-foreground mb-4">"{testimonial.text}"</p>
                <div>
                  <div className="font-semibold">{testimonial.name}</div>
                  <div className="text-sm text-muted-foreground">{testimonial.location}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to Start Watching?</h2>
          <p className="text-muted-foreground text-lg mb-8 max-w-xl mx-auto">
            Join thousands of viewers enjoying the best African stories. Free to start, no commitment.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button 
              size="lg" 
              onClick={() => navigate("/")}
              className="bg-primary hover:bg-primary/90 text-lg px-8 h-14"
            >
              <Play className="w-5 h-5 mr-2 fill-white" />
              Browse Series
            </Button>
          </div>
          
          <div className="mt-8 flex items-center justify-center gap-6 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-green-500" />
              Free to start
            </div>
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-green-500" />
              No subscription
            </div>
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-green-500" />
              Cancel anytime
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 border-t border-white/10">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <KonaLogo2Full height={28} />
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <button onClick={() => navigate("/")}>Home</button>
              <button onClick={() => navigate("/discover")}>Discover</button>
              <button onClick={() => navigate("/store")}>Store</button>
              <button onClick={() => navigate("/rewards")}>Rewards</button>
            </div>
            <p className="text-sm text-muted-foreground">
              © 2025 Stream Kona. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default AboutPage;
