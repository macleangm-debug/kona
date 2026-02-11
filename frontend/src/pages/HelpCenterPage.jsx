import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { 
  Search, ChevronRight, MessageCircle, FileText, ArrowLeft,
  HelpCircle, CreditCard, Gift, Tv, AlertTriangle, Users, Sparkles,
  Send, Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { KonaLogo2Full } from "@/components/KonaLogo";
import SEO from "@/components/SEO";
import ReactMarkdown from "react-markdown";

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Category icons mapping
const categoryIcons = {
  "Getting Started": HelpCircle,
  "Coins & Rewards": Gift,
  "Subscriptions": Sparkles,
  "Billing & Payments": CreditCard,
  "Features": Tv,
  "Troubleshooting": AlertTriangle,
  "Creators": Users,
};

const HelpCenterPage = () => {
  const navigate = useNavigate();
  const { articleId } = useParams();
  const [searchQuery, setSearchQuery] = useState("");
  const [categories, setCategories] = useState([]);
  const [articles, setArticles] = useState([]);
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchResults, setSearchResults] = useState(null);

  // Fetch categories and articles
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [catsRes, articlesRes] = await Promise.all([
          fetch(`${API_URL}/api/support/categories`),
          fetch(`${API_URL}/api/support/articles`)
        ]);
        
        const cats = await catsRes.json();
        const arts = await articlesRes.json();
        
        setCategories(cats);
        setArticles(arts);
      } catch (error) {
        console.error("Failed to fetch help data:", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);

  // Fetch specific article if articleId in URL
  useEffect(() => {
    if (articleId) {
      const fetchArticle = async () => {
        try {
          const res = await fetch(`${API_URL}/api/support/articles/${articleId}`);
          if (res.ok) {
            const article = await res.json();
            setSelectedArticle(article);
          }
        } catch (error) {
          console.error("Failed to fetch article:", error);
        }
      };
      fetchArticle();
    } else {
      setSelectedArticle(null);
    }
  }, [articleId]);

  // Handle search
  const handleSearch = async (query) => {
    setSearchQuery(query);
    if (query.length < 2) {
      setSearchResults(null);
      return;
    }
    
    try {
      const res = await fetch(`${API_URL}/api/support/articles?search=${encodeURIComponent(query)}`);
      const results = await res.json();
      setSearchResults(results);
    } catch (error) {
      console.error("Search failed:", error);
    }
  };

  // Get articles by category
  const getArticlesByCategory = (category) => {
    return articles.filter(a => a.category === category);
  };

  // Render article view
  if (selectedArticle) {
    return (
      <div className="min-h-screen bg-[#030014]" data-testid="help-article-page">
        <SEO title={`${selectedArticle.title} - Kona Help Center`} />
        
        {/* Header */}
        <header className="sticky top-0 z-10 bg-[#030014]/95 backdrop-blur-sm border-b border-white/10">
          <div className="max-w-4xl mx-auto px-6 py-4 flex items-center gap-4">
            <button 
              onClick={() => navigate("/help")}
              className="p-2 hover:bg-white/10 rounded-full transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-white" />
            </button>
            <div>
              <p className="text-xs text-purple-400">{selectedArticle.category}</p>
              <h1 className="text-lg font-semibold text-white">{selectedArticle.title}</h1>
            </div>
          </div>
        </header>

        {/* Article Content */}
        <div className="max-w-4xl mx-auto px-6 py-8">
          <article className="prose prose-invert prose-purple max-w-none">
            <ReactMarkdown>{selectedArticle.content}</ReactMarkdown>
          </article>

          {/* Helpful? */}
          <div className="mt-12 p-6 bg-white/5 rounded-xl border border-white/10 text-center">
            <h3 className="font-semibold mb-2">Was this article helpful?</h3>
            <div className="flex items-center justify-center gap-4 mb-4">
              <Button variant="outline" className="border-green-500/50 text-green-400 hover:bg-green-500/10">
                Yes, thanks!
              </Button>
              <Button variant="outline" className="border-red-500/50 text-red-400 hover:bg-red-500/10">
                Not really
              </Button>
            </div>
            <p className="text-sm text-gray-400">
              Still need help? <button onClick={() => navigate("/help/tickets/new")} className="text-purple-400 hover:underline">Create a support ticket</button>
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Main Help Center view
  return (
    <div className="min-h-screen bg-[#030014]" data-testid="help-center-page">
      <SEO 
        title="Help Center - Kona" 
        description="Get help with your Kona account, subscriptions, coins, and more. Search our knowledge base or chat with our AI assistant."
      />

      {/* Hero Section */}
      <div className="bg-gradient-to-b from-purple-900/30 to-transparent">
        <div className="max-w-4xl mx-auto px-6 py-12">
          <button onClick={() => navigate("/")} className="mb-6">
            <KonaLogo2Full height={28} />
          </button>
          
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            How can we help you?
          </h1>
          <p className="text-gray-400 mb-8">
            Search our knowledge base or browse categories below
          </p>

          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              type="text"
              placeholder="Search for help..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full pl-12 pr-4 py-4 bg-white/10 border-white/20 text-white placeholder-gray-400 rounded-xl text-lg"
            />
          </div>

          {/* Search Results */}
          {searchResults && (
            <div className="mt-4 bg-white/5 rounded-xl border border-white/10 overflow-hidden">
              {searchResults.length === 0 ? (
                <div className="p-6 text-center text-gray-400">
                  <p>No results found for "{searchQuery}"</p>
                  <p className="text-sm mt-2">Try different keywords or browse categories below</p>
                </div>
              ) : (
                <div className="divide-y divide-white/10">
                  {searchResults.map((article) => (
                    <button
                      key={article.id}
                      onClick={() => navigate(`/help/article/${article.id}`)}
                      className="w-full px-6 py-4 text-left hover:bg-white/5 transition-colors flex items-center justify-between"
                    >
                      <div>
                        <p className="text-xs text-purple-400 mb-1">{article.category}</p>
                        <p className="font-medium text-white">{article.title}</p>
                        <p className="text-sm text-gray-400">{article.summary}</p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-500" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Categories */}
      {!searchResults && (
        <div className="max-w-4xl mx-auto px-6 py-8">
          <h2 className="text-xl font-semibold text-white mb-6">Browse by Category</h2>
          
          <div className="grid sm:grid-cols-2 gap-4">
            {categories.map((category) => {
              const Icon = categoryIcons[category] || HelpCircle;
              const categoryArticles = getArticlesByCategory(category);
              
              return (
                <div
                  key={category}
                  className="bg-white/5 rounded-xl border border-white/10 overflow-hidden"
                >
                  <div className="p-4 border-b border-white/10 flex items-center gap-3">
                    <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
                      <Icon className="w-5 h-5 text-purple-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-white">{category}</h3>
                      <p className="text-xs text-gray-400">{categoryArticles.length} articles</p>
                    </div>
                  </div>
                  <div className="divide-y divide-white/5">
                    {categoryArticles.slice(0, 3).map((article) => (
                      <button
                        key={article.id}
                        onClick={() => navigate(`/help/article/${article.id}`)}
                        className="w-full px-4 py-3 text-left hover:bg-white/5 transition-colors flex items-center justify-between"
                      >
                        <span className="text-sm text-gray-300">{article.title}</span>
                        <ChevronRight className="w-4 h-4 text-gray-500" />
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Popular Articles */}
      {!searchResults && (
        <div className="max-w-4xl mx-auto px-6 py-8">
          <h2 className="text-xl font-semibold text-white mb-6">Popular Articles</h2>
          
          <div className="space-y-3">
            {articles.slice(0, 5).map((article) => (
              <button
                key={article.id}
                onClick={() => navigate(`/help/article/${article.id}`)}
                className="w-full bg-white/5 rounded-xl p-4 text-left hover:bg-white/10 transition-colors flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-purple-400" />
                  <div>
                    <p className="font-medium text-white">{article.title}</p>
                    <p className="text-sm text-gray-400">{article.summary}</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-500" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Contact Options */}
      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="bg-gradient-to-r from-purple-900/30 to-pink-900/30 rounded-2xl p-8 text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Still need help?</h2>
          <p className="text-gray-400 mb-6">
            Our AI assistant is available 24/7, or you can create a support ticket
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button
              onClick={() => {
                // Trigger chat widget
                const chatBtn = document.querySelector('[data-testid="support-chat-button"]');
                if (chatBtn) chatBtn.click();
              }}
              className="bg-purple-600 hover:bg-purple-500"
            >
              <MessageCircle className="w-4 h-4 mr-2" />
              Chat with AI Assistant
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate("/help/tickets/new")}
              className="border-white/30 hover:bg-white/10"
            >
              <FileText className="w-4 h-4 mr-2" />
              Create Support Ticket
            </Button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-white/10 py-6">
        <div className="max-w-4xl mx-auto px-6 flex items-center justify-between">
          <button onClick={() => navigate("/")} className="text-gray-400 hover:text-white text-sm">
            ← Back to Kona
          </button>
          <p className="text-gray-500 text-sm">© 2026 Kona Entertainment Ltd.</p>
        </div>
      </footer>
    </div>
  );
};

export default HelpCenterPage;
