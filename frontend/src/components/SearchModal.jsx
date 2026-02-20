import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Search, X, ChevronLeft, Loader2, TrendingUp, Clock, Sparkles } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import axios from "axios";
import { API } from "@/config";
import { useAuth } from "@/contexts/AuthContext";

export const SearchModal = ({ open, onClose }) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [trendingSearches, setTrendingSearches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [recentSearches, setRecentSearches] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const navigate = useNavigate();
  const { token } = useAuth();

  // Load recent searches and trending on mount
  useEffect(() => {
    const saved = localStorage.getItem("kona-recent-searches");
    if (saved) setRecentSearches(JSON.parse(saved));
    
    // Fetch trending searches
    const fetchTrending = async () => {
      try {
        const res = await axios.get(`${API}/search/trending`);
        setTrendingSearches(res.data.trending || []);
      } catch (e) {
        console.error("Error fetching trending:", e);
      }
    };
    if (open) fetchTrending();
  }, [open]);

  // Fetch auto-complete suggestions
  useEffect(() => {
    if (!query.trim() || query.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const fetchSuggestions = async () => {
      try {
        const res = await axios.get(`${API}/search/suggestions?q=${encodeURIComponent(query)}`);
        setSuggestions(res.data.suggestions || []);
        setShowSuggestions(true);
      } catch (e) {
        console.error("Error fetching suggestions:", e);
      }
    };

    const debounce = setTimeout(fetchSuggestions, 150);
    return () => clearTimeout(debounce);
  }, [query]);

  // Full search with filters
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const search = async () => {
      setLoading(true);
      try {
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        const res = await axios.get(`${API}/search?q=${encodeURIComponent(query)}`, { headers });
        setResults(res.data.results || res.data || []);
        setShowSuggestions(false);
      } catch (e) {
        console.error(e);
      }
      setLoading(false);
    };

    const debounce = setTimeout(search, 400);
    return () => clearTimeout(debounce);
  }, [query, token]);

  const handleSuggestionClick = useCallback((suggestion) => {
    setQuery(suggestion);
    setShowSuggestions(false);
  }, []);

  const handleSelect = (series) => {
    const updated = [series.title, ...recentSearches.filter(s => s !== series.title)].slice(0, 5);
    setRecentSearches(updated);
    localStorage.setItem("kona-recent-searches", JSON.stringify(updated));
    
    navigate(`/series/${series.id}`);
    onClose();
    setQuery("");
  };

  const clearRecent = () => {
    setRecentSearches([]);
    localStorage.removeItem("kona-recent-searches");
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] lg:max-w-[600px] max-h-[80vh] p-0 bg-card border-white/10 overflow-hidden" data-testid="search-modal">
        <Card className="bg-transparent border-0 p-4">
          {/* Search Input */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search series, genres..."
              className="pl-10 h-12 bg-secondary border-0 rounded-full text-base"
              autoFocus
            />
            {query && (
              <button 
                onClick={() => setQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-white/10 rounded-full"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Scrollable Content Area */}
          <div className="max-h-[55vh] overflow-y-auto pr-1">
            {/* Loading */}
            {loading && (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            )}

            {/* Results */}
            {!loading && results.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground mb-2">{results.length} results</p>
                {results.map(series => (
                  <div
                    key={series.id}
                    onClick={() => handleSelect(series)}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-secondary cursor-pointer"
                  >
                    <img src={series.thumbnail} alt="" className="w-12 h-16 object-cover rounded" />
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm line-clamp-1">{series.title}</h4>
                      <p className="text-xs text-muted-foreground">{series.genre} • {series.total_episodes} Eps <span className="text-green-400">• Free EP1</span></p>
                    </div>
                    <ChevronLeft className="w-4 h-4 rotate-180 text-muted-foreground" />
                  </div>
                ))}
              </div>
            )}

            {/* No Results */}
            {!loading && query && results.length === 0 && (
              <div className="text-center py-8">
                <Search className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
                <p className="text-muted-foreground">No results found</p>
                <p className="text-xs text-muted-foreground mt-1">Try different keywords</p>
              </div>
            )}

            {/* Recent Searches */}
            {!query && recentSearches.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium">Recent Searches</p>
                  <button onClick={clearRecent} className="text-xs text-primary">Clear</button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {recentSearches.map((term, i) => (
                    <button
                      key={i}
                      onClick={() => setQuery(term)}
                      className="px-3 py-1.5 bg-secondary rounded-full text-sm"
                    >
                      {term}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Quick Genre Filters */}
            {!query && (
              <div className="mt-4">
                <p className="text-sm font-medium mb-3">Quick Filters</p>
                <div className="flex flex-wrap gap-2">
                  {["Romance", "Drama", "Thriller", "Action", "Comedy", "Mystery"].map(genre => (
                    <button
                      key={genre}
                      onClick={() => setQuery(genre)}
                      className="px-4 py-2 bg-white/10 hover:bg-primary/30 rounded-full text-sm font-medium transition-colors"
                    >
                      {genre}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Card>
      </DialogContent>
    </Dialog>
  );
};

export default SearchModal;
