import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Send, CheckCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { KonaLogo2Full } from "@/components/KonaLogo";
import SEO from "@/components/SEO";
import { useAuth } from "@/context/AuthContext";

const API_URL = process.env.REACT_APP_BACKEND_URL;

const SupportTicketPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [ticketId, setTicketId] = useState(null);
  const [formData, setFormData] = useState({
    email: user?.email || "",
    category: "",
    subject: "",
    description: ""
  });

  const categories = [
    "Account Issues",
    "Billing & Payments",
    "Coins & Rewards",
    "Streaming Problems",
    "Subscription",
    "Technical Issue",
    "Content Request",
    "Other"
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/support/tickets`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          user_id: user?.id
        })
      });

      if (response.ok) {
        const data = await response.json();
        setTicketId(data.id);
        setSubmitted(true);
      }
    } catch (error) {
      console.error("Failed to submit ticket:", error);
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-[#030014] flex items-center justify-center p-6">
        <SEO title="Ticket Submitted - Kona Support" />
        
        <div className="max-w-md w-full text-center">
          <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-green-400" />
          </div>
          
          <h1 className="text-2xl font-bold text-white mb-2">Ticket Submitted!</h1>
          <p className="text-gray-400 mb-6">
            Your ticket <span className="text-purple-400 font-mono">#{ticketId}</span> has been created.
            We'll respond within 24 hours.
          </p>

          <div className="bg-white/5 rounded-xl p-4 mb-6 text-left">
            <p className="text-sm text-gray-400 mb-1">What happens next?</p>
            <ul className="text-sm text-gray-300 space-y-2">
              <li>• You'll receive a confirmation email</li>
              <li>• Our team will review your ticket</li>
              <li>• You'll get a response within 24 hours</li>
            </ul>
          </div>

          <div className="flex flex-col gap-3">
            <Button onClick={() => navigate("/help")} className="w-full">
              Back to Help Center
            </Button>
            <Button 
              variant="outline" 
              onClick={() => navigate("/home")}
              className="w-full border-white/30"
            >
              Continue Watching
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#030014]" data-testid="support-ticket-page">
      <SEO title="Create Support Ticket - Kona" />

      {/* Header */}
      <header className="sticky top-0 z-10 bg-[#030014]/95 backdrop-blur-sm border-b border-white/10">
        <div className="max-w-2xl mx-auto px-6 py-4 flex items-center gap-4">
          <button 
            onClick={() => navigate("/help")}
            className="p-2 hover:bg-white/10 rounded-full transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
          <div>
            <h1 className="text-lg font-semibold text-white">Create Support Ticket</h1>
            <p className="text-xs text-gray-400">We'll respond within 24 hours</p>
          </div>
        </div>
      </header>

      {/* Form */}
      <div className="max-w-2xl mx-auto px-6 py-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Email Address *
            </label>
            <Input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="your@email.com"
              className="bg-white/5 border-white/20 text-white"
            />
            <p className="text-xs text-gray-500 mt-1">We'll send updates to this email</p>
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Category *
            </label>
            <select
              required
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="w-full bg-white/5 border border-white/20 rounded-lg px-4 py-2.5 text-white appearance-none cursor-pointer"
            >
              <option value="" disabled>Select a category</option>
              {categories.map((cat) => (
                <option key={cat} value={cat} className="bg-gray-900">{cat}</option>
              ))}
            </select>
          </div>

          {/* Subject */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Subject *
            </label>
            <Input
              type="text"
              required
              value={formData.subject}
              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              placeholder="Brief description of your issue"
              className="bg-white/5 border-white/20 text-white"
              maxLength={100}
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Description *
            </label>
            <textarea
              required
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Please describe your issue in detail. Include any error messages, what you were trying to do, and what device/browser you're using."
              rows={6}
              className="w-full bg-white/5 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-gray-500 resize-none"
            />
            <p className="text-xs text-gray-500 mt-1">
              The more details you provide, the faster we can help
            </p>
          </div>

          {/* Tips */}
          <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-4">
            <p className="text-sm font-medium text-purple-400 mb-2">Tips for faster resolution:</p>
            <ul className="text-sm text-gray-400 space-y-1">
              <li>• Include any error messages you see</li>
              <li>• Mention your device type and browser</li>
              <li>• Describe the steps that led to the issue</li>
              <li>• Attach screenshots if possible (coming soon)</li>
            </ul>
          </div>

          {/* Submit */}
          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-purple-600 hover:bg-purple-500 h-12"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Submit Ticket
              </>
            )}
          </Button>
        </form>

        {/* Alternative */}
        <div className="mt-8 text-center">
          <p className="text-gray-400 text-sm">
            Need instant help?{" "}
            <button 
              onClick={() => {
                navigate("/help");
                setTimeout(() => {
                  const chatBtn = document.querySelector('[data-testid="support-chat-button"]');
                  if (chatBtn) chatBtn.click();
                }, 500);
              }}
              className="text-purple-400 hover:underline"
            >
              Chat with our AI assistant
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default SupportTicketPage;
