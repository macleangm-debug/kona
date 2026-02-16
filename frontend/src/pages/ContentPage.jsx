import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { 
  ArrowLeft, Mail, MapPin, Users, Heart, Shield, Globe, Briefcase, 
  Scale, Cookie, FileWarning, DollarSign, BookOpen, Star, ChevronRight,
  Check, Zap, Building, Clock, Coffee, Laptop, Gift, Award, TrendingUp,
  Play, Download, Eye, Lock, AlertTriangle, Flag, UserCheck, Accessibility,
  FileText, ExternalLink, Phone, MessageCircle, Send, Loader2, Camera,
  Newspaper, Mic, Video, Quote, Calendar, Award as AwardIcon, Target,
  Sparkles, FileUp, Linkedin, Link as LinkIcon, CheckCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { KonaLogo2Full } from "@/components/KonaLogo";
import SEO from "@/components/SEO";
import { toast } from "sonner";

const API_URL = process.env.REACT_APP_BACKEND_URL;

// ============ CAREERS PAGE (Updated - No specific roles, Application Form) ============
const CareersPage = ({ navigate }) => {
  const [showForm, setShowForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    phone: "",
    country: "",
    position_interest: "",
    experience_years: "",
    current_role: "",
    linkedin_url: "",
    portfolio_url: "",
    cover_letter: "",
    skills: "",
    how_heard: "",
    available_start: "",
    salary_expectation: ""
  });

  const benefits = [
    { icon: DollarSign, title: "Competitive Salary", desc: "Top-tier compensation + equity" },
    { icon: Heart, title: "Health Insurance", desc: "Medical, dental & vision coverage" },
    { icon: Coffee, title: "Unlimited PTO", desc: "Take the time you need" },
    { icon: Laptop, title: "Remote First", desc: "Work from anywhere in Africa" },
    { icon: Gift, title: "Home Office Budget", desc: "$1,000 setup allowance" },
    { icon: BookOpen, title: "Learning Budget", desc: "Annual development fund" },
  ];

  const departments = [
    { name: "Engineering", icon: Laptop, desc: "Build the future of streaming" },
    { name: "Content & Creative", icon: Video, desc: "Shape African storytelling" },
    { name: "Product & Design", icon: Target, desc: "Create amazing experiences" },
    { name: "Marketing & Growth", icon: TrendingUp, desc: "Grow our audience" },
    { name: "Operations", icon: Building, desc: "Scale our business" },
    { name: "Customer Success", icon: Heart, desc: "Delight our viewers" },
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch(`${API_URL}/api/careers/applications`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          experience_years: parseInt(formData.experience_years) || 0,
          skills: formData.skills.split(",").map(s => s.trim()).filter(Boolean)
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Failed to submit application");
      }

      setSubmitted(true);
      toast.success("Application submitted successfully!");
    } catch (error) {
      toast.error(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-[#030014] flex items-center justify-center px-6">
        <div className="max-w-md text-center">
          <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-green-400" />
          </div>
          <h1 className="text-3xl font-bold mb-4">Application Received!</h1>
          <p className="text-gray-400 mb-6">
            Thank you for your interest in joining Kona. Our team will review your application 
            and get back to you within 2 weeks if you're a good fit.
          </p>
          <p className="text-sm text-gray-500 mb-8">
            Check your email for a confirmation. You can also track your application status on our careers page.
          </p>
          <Button onClick={() => navigate("/")} className="bg-purple-600 hover:bg-purple-500">
            Back to Kona
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#030014]">
      {/* Hero */}
      <div className="relative bg-gradient-to-b from-purple-900/30 to-transparent py-16 sm:py-24 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-purple-500/10 border border-purple-500/20 rounded-full mb-6">
            <Sparkles className="w-4 h-4 text-purple-400" />
            <span className="text-sm text-purple-400">Join Our Team</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-bold mb-4">Build the Future of African Entertainment</h1>
          <p className="text-base sm:text-xl text-gray-400 mb-8 max-w-2xl mx-auto">
            We're always looking for passionate people to join our mission of bringing African stories to the world.
          </p>
          <Button 
            size="lg" 
            className="bg-purple-600 hover:bg-purple-500 rounded-full px-8"
            onClick={() => setShowForm(true)}
          >
            Apply Now
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 -mt-8">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          {[
            { value: "50+", label: "Team Members" },
            { value: "10+", label: "Countries" },
            { value: "70%", label: "Remote" },
            { value: "4.8", label: "Employee Rating" },
          ].map((stat, i) => (
            <div key={i} className="bg-white/5 backdrop-blur rounded-xl p-3 sm:p-4 text-center border border-white/10">
              <div className="text-xl sm:text-2xl font-bold text-purple-400">{stat.value}</div>
              <div className="text-xs sm:text-sm text-gray-400">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Benefits */}
      <section className="py-16 sm:py-20 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-8 sm:mb-12">Why Join Kona?</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {benefits.map((benefit, i) => (
              <div key={i} className="bg-white/5 rounded-xl p-5 sm:p-6 border border-white/10 hover:border-purple-500/50 transition-colors">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-purple-500/20 rounded-xl flex items-center justify-center mb-4">
                  <benefit.icon className="w-5 h-5 sm:w-6 sm:h-6 text-purple-400" />
                </div>
                <h3 className="font-semibold mb-2">{benefit.title}</h3>
                <p className="text-sm text-gray-400">{benefit.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Departments */}
      <section className="py-12 px-4 sm:px-6 bg-white/5">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-bold mb-6 sm:mb-8 text-center">Teams We're Building</h2>
          <p className="text-gray-400 text-center mb-8 max-w-2xl mx-auto">
            While we don't have specific roles open right now, we're always interested in hearing from talented people in these areas.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
            {departments.map((dept, i) => (
              <div key={i} className="bg-[#0a0a1a] rounded-xl p-4 sm:p-5 text-center border border-white/10 hover:border-purple-500/30 transition-colors">
                <dept.icon className="w-7 h-7 sm:w-8 sm:h-8 text-purple-400 mx-auto mb-2" />
                <div className="font-medium text-sm sm:text-base">{dept.name}</div>
                <div className="text-xs text-gray-500 mt-1">{dept.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Application Form */}
      {showForm && (
        <section className="py-16 px-4 sm:px-6" id="apply">
          <div className="max-w-2xl mx-auto">
            <div className="bg-white/5 rounded-2xl p-6 sm:p-8 border border-white/10">
              <h2 className="text-2xl font-bold mb-2">Apply to Join Kona</h2>
              <p className="text-gray-400 mb-6 text-sm">
                Submit your application and we'll reach out if there's a good fit.
              </p>

              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Personal Info */}
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Full Name *</label>
                    <Input 
                      required
                      placeholder="Your full name"
                      value={formData.full_name}
                      onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                      className="bg-white/5 border-white/10"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Email *</label>
                    <Input 
                      required
                      type="email"
                      placeholder="you@email.com"
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      className="bg-white/5 border-white/10"
                    />
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Phone *</label>
                    <Input 
                      required
                      placeholder="+254 712 345 678"
                      value={formData.phone}
                      onChange={(e) => setFormData({...formData, phone: e.target.value})}
                      className="bg-white/5 border-white/10"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Country *</label>
                    <Input 
                      required
                      placeholder="Kenya"
                      value={formData.country}
                      onChange={(e) => setFormData({...formData, country: e.target.value})}
                      className="bg-white/5 border-white/10"
                    />
                  </div>
                </div>

                {/* Professional Info */}
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Area of Interest *</label>
                    <select
                      required
                      value={formData.position_interest}
                      onChange={(e) => setFormData({...formData, position_interest: e.target.value})}
                      className="w-full bg-white/5 border border-white/10 rounded-md px-3 py-2 text-sm"
                    >
                      <option value="">Select department</option>
                      <option value="Engineering">Engineering</option>
                      <option value="Content & Creative">Content & Creative</option>
                      <option value="Product & Design">Product & Design</option>
                      <option value="Marketing & Growth">Marketing & Growth</option>
                      <option value="Operations">Operations</option>
                      <option value="Customer Success">Customer Success</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Years of Experience *</label>
                    <Input 
                      required
                      type="number"
                      min="0"
                      max="50"
                      placeholder="5"
                      value={formData.experience_years}
                      onChange={(e) => setFormData({...formData, experience_years: e.target.value})}
                      className="bg-white/5 border-white/10"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1.5">Current Role</label>
                  <Input 
                    placeholder="e.g., Senior Developer at Company X"
                    value={formData.current_role}
                    onChange={(e) => setFormData({...formData, current_role: e.target.value})}
                    className="bg-white/5 border-white/10"
                  />
                </div>

                {/* Links */}
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1.5">
                      <Linkedin className="w-3.5 h-3.5 inline mr-1" /> LinkedIn URL
                    </label>
                    <Input 
                      placeholder="https://linkedin.com/in/..."
                      value={formData.linkedin_url}
                      onChange={(e) => setFormData({...formData, linkedin_url: e.target.value})}
                      className="bg-white/5 border-white/10"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5">
                      <LinkIcon className="w-3.5 h-3.5 inline mr-1" /> Portfolio/Website
                    </label>
                    <Input 
                      placeholder="https://yoursite.com"
                      value={formData.portfolio_url}
                      onChange={(e) => setFormData({...formData, portfolio_url: e.target.value})}
                      className="bg-white/5 border-white/10"
                    />
                  </div>
                </div>

                {/* Skills */}
                <div>
                  <label className="block text-sm font-medium mb-1.5">Key Skills</label>
                  <Input 
                    placeholder="e.g., React, Python, Content Strategy (comma separated)"
                    value={formData.skills}
                    onChange={(e) => setFormData({...formData, skills: e.target.value})}
                    className="bg-white/5 border-white/10"
                  />
                </div>

                {/* Cover Letter */}
                <div>
                  <label className="block text-sm font-medium mb-1.5">Why Kona? *</label>
                  <Textarea 
                    required
                    placeholder="Tell us why you want to join Kona and what makes you a great fit. Share your passion for African storytelling and entertainment. (min 50 words)"
                    rows={5}
                    value={formData.cover_letter}
                    onChange={(e) => setFormData({...formData, cover_letter: e.target.value})}
                    className="bg-white/5 border-white/10"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {formData.cover_letter.split(/\s+/).filter(Boolean).length} words
                  </p>
                </div>

                {/* Additional */}
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1.5">How did you hear about us?</label>
                    <select
                      value={formData.how_heard}
                      onChange={(e) => setFormData({...formData, how_heard: e.target.value})}
                      className="w-full bg-white/5 border border-white/10 rounded-md px-3 py-2 text-sm"
                    >
                      <option value="">Select</option>
                      <option value="LinkedIn">LinkedIn</option>
                      <option value="Twitter/X">Twitter/X</option>
                      <option value="Friend/Referral">Friend/Referral</option>
                      <option value="Kona App">Kona App</option>
                      <option value="Google">Google Search</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Available to Start</label>
                    <select
                      value={formData.available_start}
                      onChange={(e) => setFormData({...formData, available_start: e.target.value})}
                      className="w-full bg-white/5 border border-white/10 rounded-md px-3 py-2 text-sm"
                    >
                      <option value="">Select</option>
                      <option value="Immediately">Immediately</option>
                      <option value="2 weeks">2 weeks</option>
                      <option value="1 month">1 month</option>
                      <option value="2+ months">2+ months</option>
                    </select>
                  </div>
                </div>

                <Button 
                  type="submit" 
                  className="w-full bg-purple-600 hover:bg-purple-500 h-12"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Submit Application
                    </>
                  )}
                </Button>
              </form>
            </div>
          </div>
        </section>
      )}

      {/* CTA */}
      {!showForm && (
        <section className="py-16 sm:py-20 px-4 sm:px-6 bg-gradient-to-r from-purple-900/30 to-pink-900/30">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-2xl sm:text-3xl font-bold mb-4">Ready to Make an Impact?</h2>
            <p className="text-gray-400 mb-6">
              Even if we don't have an open role for you right now, we'd love to hear from you. 
              Great people are always welcome at Kona.
            </p>
            <Button 
              size="lg"
              className="bg-purple-600 hover:bg-purple-500 rounded-full px-8"
              onClick={() => {
                setShowForm(true);
                setTimeout(() => document.getElementById('apply')?.scrollIntoView({ behavior: 'smooth' }), 100);
              }}
            >
              <Briefcase className="w-4 h-4 mr-2" />
              Submit Your Application
            </Button>
          </div>
        </section>
      )}
    </div>
  );
};

// ============ PRESS PAGE (Redesigned) ============
const PressPage = ({ navigate }) => {
  const [pressReleases, setPressReleases] = useState([]);
  const [featuredArticle, setFeaturedArticle] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchArticles = async () => {
      try {
        // Fetch all published articles
        const res = await fetch(`${API_URL}/api/press/articles?limit=20`);
        if (res.ok) {
          const data = await res.json();
          const articles = data.articles || [];
          
          // Separate featured and regular articles
          const featured = articles.find(a => a.is_featured);
          const others = articles.filter(a => !a.is_featured);
          
          setFeaturedArticle(featured || articles[0]);
          setPressReleases(others);
        }
      } catch (err) {
        console.error("Failed to fetch articles:", err);
        // Use fallback data if API fails
        setPressReleases([
          { id: "1", published_at: "2026-02-01", title: "Kona Raises $10M Series A to Expand African Content Library", tag: "Funding", is_featured: true, summary: "Kona announced today a $10 million Series A funding round led by major African and global investors." },
          { id: "2", published_at: "2026-01-15", title: "Kona Launches VIP Tier with Offline Viewing", tag: "Product", is_featured: false },
          { id: "3", published_at: "2025-12-10", title: "Creator Payouts Exceed $500K Milestone", tag: "Creators", is_featured: false },
          { id: "4", published_at: "2025-11-20", title: "Kona Reaches 1 Million Active Users", tag: "Milestone", is_featured: false },
        ]);
      }
      setLoading(false);
    };
    
    fetchArticles();
  }, []);

  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
  };

  const mediaFeatures = [
    { outlet: "TechCrunch", title: "Kona is Netflix for African Stories", logo: "TC" },
    { outlet: "Forbes Africa", title: "Top 10 African Startups to Watch", logo: "FA" },
    { outlet: "BBC Africa", title: "The Rise of African Streaming", logo: "BBC" },
    { outlet: "CNN", title: "How Kona is Changing Entertainment", logo: "CNN" },
  ];

  const executives = [
    { name: "Amara Okafor", role: "CEO & Co-Founder", available: true },
    { name: "David Kimani", role: "CTO & Co-Founder", available: true },
    { name: "Fatima Diallo", role: "Chief Content Officer", available: true },
  ];

  return (
    <div className="min-h-screen bg-[#030014]">
      {/* Hero */}
      <div className="relative bg-gradient-to-b from-blue-900/30 via-purple-900/20 to-transparent py-16 sm:py-24 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500/10 border border-blue-500/20 rounded-full mb-6">
                <Newspaper className="w-4 h-4 text-blue-400" />
                <span className="text-sm text-blue-400">Press & Media</span>
              </div>
              <h1 className="text-3xl sm:text-5xl font-bold mb-4">Kona in the News</h1>
              <p className="text-base sm:text-lg text-gray-400 mb-6">
                Get the latest news, press releases, and media resources about Kona - 
                Africa's premier streaming platform.
              </p>
              <div className="flex flex-wrap gap-3">
                <Button className="bg-blue-600 hover:bg-blue-500">
                  <Download className="w-4 h-4 mr-2" />
                  Press Kit
                </Button>
                <Button variant="outline" className="border-white/30 hover:bg-white/10">
                  <Mail className="w-4 h-4 mr-2" />
                  Media Inquiries
                </Button>
              </div>
            </div>
            
            {/* Featured Stats */}
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              {[
                { label: "Founded", value: "2024", icon: Calendar },
                { label: "Headquarters", value: "Nairobi", icon: MapPin },
                { label: "Active Users", value: "1M+", icon: Users },
                { label: "Original Series", value: "50+", icon: Video },
              ].map((stat, i) => (
                <div key={i} className="bg-white/5 backdrop-blur rounded-xl p-4 border border-white/10">
                  <stat.icon className="w-5 h-5 text-blue-400 mb-2" />
                  <div className="text-xl sm:text-2xl font-bold text-white">{stat.value}</div>
                  <div className="text-xs sm:text-sm text-gray-400">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Featured In */}
      <section className="py-12 px-4 sm:px-6 border-y border-white/10 bg-white/5">
        <div className="max-w-5xl mx-auto">
          <p className="text-center text-sm text-gray-500 mb-6">AS FEATURED IN</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-8">
            {mediaFeatures.map((media, i) => (
              <div key={i} className="text-center group cursor-pointer">
                <div className="w-12 h-12 sm:w-14 sm:h-14 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-2 group-hover:bg-white/20 transition-colors">
                  <span className="font-bold text-xs sm:text-sm text-white">{media.logo}</span>
                </div>
                <p className="text-xs text-gray-400 group-hover:text-white transition-colors">{media.outlet}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Press Releases */}
      <section className="py-16 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold">Latest News</h2>
            <Button variant="ghost" className="text-blue-400 hover:text-blue-300">
              View All
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
          
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
            </div>
          ) : (
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Featured Release */}
              {featuredArticle && (
                <div className="lg:row-span-2 bg-gradient-to-br from-blue-900/40 to-purple-900/40 rounded-2xl p-6 sm:p-8 border border-blue-500/30 hover:border-blue-500/50 transition-all cursor-pointer group">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-xs bg-blue-500/30 text-blue-300 px-2 py-1 rounded">{featuredArticle.tag}</span>
                    <span className="text-sm text-gray-500">{formatDate(featuredArticle.published_at)}</span>
                  </div>
                  <h3 className="text-xl sm:text-2xl font-bold mb-4 group-hover:text-blue-400 transition-colors">{featuredArticle.title}</h3>
                  <p className="text-gray-400 mb-6">
                    {featuredArticle.summary || featuredArticle.content?.slice(0, 200) + "..."}
                  </p>
                  <div className="flex items-center gap-2 text-blue-400">
                    <span className="text-sm">Read full release</span>
                    <ExternalLink className="w-4 h-4" />
                  </div>
                </div>
              )}
              
              {/* Other Releases */}
              <div className="space-y-4">
                {pressReleases.slice(0, 4).map((pr, i) => (
                  <div key={pr.id || i} className="bg-white/5 rounded-xl p-4 sm:p-5 border border-white/10 hover:border-blue-500/30 transition-all cursor-pointer group">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-xs text-gray-500">{formatDate(pr.published_at)}</span>
                          <span className="text-xs bg-white/10 text-gray-300 px-2 py-0.5 rounded">{pr.tag}</span>
                        </div>
                        <h3 className="font-semibold group-hover:text-blue-400 transition-colors text-sm sm:text-base">{pr.title}</h3>
                      </div>
                      <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-blue-400 flex-shrink-0 ml-4" />
                    </div>
                  </div>
                ))}
                {pressReleases.length === 0 && !featuredArticle && (
                  <div className="text-center py-8 text-gray-400">
                    <Newspaper className="w-10 h-10 mx-auto mb-3 opacity-50" />
                    <p>No news articles yet. Check back soon!</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Media Resources */}
      <section className="py-16 px-4 sm:px-6 bg-white/5">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-bold mb-8">Media Resources</h2>
          
          <div className="grid sm:grid-cols-3 gap-4 sm:gap-6">
            <div className="bg-[#0a0a1a] rounded-xl p-5 sm:p-6 border border-white/10 hover:border-blue-500/30 transition-colors">
              <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center mb-4">
                <Camera className="w-6 h-6 text-blue-400" />
              </div>
              <h3 className="font-semibold mb-2">Brand Assets</h3>
              <p className="text-sm text-gray-400 mb-4">Logos, colors, and brand guidelines</p>
              <Button variant="outline" size="sm" className="border-white/20">
                <Download className="w-3 h-3 mr-2" />
                Download
              </Button>
            </div>
            
            <div className="bg-[#0a0a1a] rounded-xl p-5 sm:p-6 border border-white/10 hover:border-blue-500/30 transition-colors">
              <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center mb-4">
                <Video className="w-6 h-6 text-purple-400" />
              </div>
              <h3 className="font-semibold mb-2">Product Screenshots</h3>
              <p className="text-sm text-gray-400 mb-4">App screenshots and product images</p>
              <Button variant="outline" size="sm" className="border-white/20">
                <Download className="w-3 h-3 mr-2" />
                Download
              </Button>
            </div>
            
            <div className="bg-[#0a0a1a] rounded-xl p-5 sm:p-6 border border-white/10 hover:border-blue-500/30 transition-colors">
              <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center mb-4">
                <Users className="w-6 h-6 text-green-400" />
              </div>
              <h3 className="font-semibold mb-2">Executive Headshots</h3>
              <p className="text-sm text-gray-400 mb-4">Leadership team photos and bios</p>
              <Button variant="outline" size="sm" className="border-white/20">
                <Download className="w-3 h-3 mr-2" />
                Download
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Speakers Available */}
      <section className="py-16 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-3 mb-8">
            <Mic className="w-6 h-6 text-purple-400" />
            <h2 className="text-2xl font-bold">Speakers Available</h2>
          </div>
          
          <div className="grid sm:grid-cols-3 gap-4 sm:gap-6">
            {executives.map((exec, i) => (
              <div key={i} className="bg-white/5 rounded-xl p-5 border border-white/10">
                <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center mb-4 text-xl font-bold">
                  {exec.name.split(" ").map(n => n[0]).join("")}
                </div>
                <h3 className="font-semibold">{exec.name}</h3>
                <p className="text-sm text-gray-400 mb-3">{exec.role}</p>
                {exec.available && (
                  <span className="inline-flex items-center gap-1 text-xs text-green-400">
                    <Check className="w-3 h-3" />
                    Available for interviews
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact */}
      <section className="py-16 px-4 sm:px-6 bg-gradient-to-r from-blue-900/30 to-purple-900/30">
        <div className="max-w-3xl mx-auto text-center">
          <Quote className="w-12 h-12 text-blue-400 mx-auto mb-4 opacity-50" />
          <h2 className="text-2xl font-bold mb-4">Press Contact</h2>
          <p className="text-gray-400 mb-6">
            For media inquiries, interview requests, or press materials, please contact our communications team.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button className="bg-blue-600 hover:bg-blue-500">
              <Mail className="w-4 h-4 mr-2" />
              press@streamkona.com
            </Button>
            <Button variant="outline" className="border-white/30 hover:bg-white/10">
              <MessageCircle className="w-4 h-4 mr-2" />
              WhatsApp Press Line
            </Button>
          </div>
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
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
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
        <div className="max-w-5xl mx-auto px-4 sm:px-6 flex items-center justify-between">
          <button onClick={() => navigate("/")} className="text-gray-400 hover:text-white text-sm">
            ← Back to Kona
          </button>
          <p className="text-gray-500 text-xs sm:text-sm">© 2026 Kona Entertainment Ltd.</p>
        </div>
      </footer>
    </div>
  );
};

export default ContentPage;
