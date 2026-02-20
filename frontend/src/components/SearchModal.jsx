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
    setSuggestions([]);
  };

  const clearRecent = () => {
    setRecentSearches([]);
    localStorage.removeItem("kona-recent-searches");
  };

  const handleTrendingClick = (term) => {
    setQuery(term);
    const updated = [term, ...recentSearches.filter(s => s !== term)].slice(0, 5);
    setRecentSearches(updated);
    localStorage.setItem("kona-recent-searches", JSON.stringify(updated));
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
              data-testid="search-input"
            />
            {query && (
              <button 
                onClick={() => { setQuery(""); setSuggestions([]); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-white/10 rounded-full"
                data-testid="clear-search-btn"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Auto-complete Suggestions Dropdown */}
          {showSuggestions && suggestions.length > 0 && (
            <div className="mb-4 p-2 bg-secondary/80 rounded-lg border border-white/10" data-testid="suggestions-dropdown">
              <div className="flex items-center gap-2 mb-2 px-2">
                <Sparkles className="w-4 h-4 text-primary" />
                <span className="text-xs text-muted-foreground">Suggestions</span>
              </div>
              {suggestions.map((suggestion, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSuggestionClick(suggestion)}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-white/10 text-sm transition-colors flex items-center gap-2"
                  data-testid={`suggestion-${idx}`}
                >
                  <Search className="w-3 h-3 text-muted-foreground" />
                  <span dangerouslySetInnerHTML={{ 
                    __html: suggestion.replace(
                      new RegExp(`(${query})`, 'gi'), 
                      '<span class="text-primary font-medium">$1</span>'
                    )
                  }} />
                </button>
              ))}
            </div>
          )}

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
              <div className="space-y-2" data-testid="search-results">
                <p className="text-xs text-muted-foreground mb-2">{results.length} results</p>
                {results.map(series => (
                  <div
                    key={series.id}
                    onClick={() => handleSelect(series)}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-secondary cursor-pointer"
                    data-testid={`search-result-${series.id}`}
                  >
                    <img src={series.thumbnail} alt="" className="w-12 h-16 object-cover rounded" />
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm line-clamp-1">{series.title}</h4>
                      <p className="text-xs text-muted-foreground">{series.genre} • {series.total_episodes} Eps <span className="text-green-400">• Free EP1</span></p>
                      {series.is_exclusive && (
                        <span className="inline-block px-1.5 py-0.5 bg-gradient-to-r from-amber-500 to-orange-500 text-[10px] font-bold rounded mt-1">
                          EXCLUSIVE
                        </span>
                      )}
                    </div>
                    <ChevronLeft className="w-4 h-4 rotate-180 text-muted-foreground" />
                  </div>
                ))}
              </div>
            )}

            {/* No Results */}
            {!loading && query && results.length === 0 && !showSuggestions && (
              <div className="text-center py-8" data-testid="no-results">
                <Search className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
                <p className="text-muted-foreground">No results found</p>
                <p className="text-xs text-muted-foreground mt-1">Try different keywords</p>
              </div>
            )}

            {/* Recent Searches */}
            {!query && recentSearches.length > 0 && (
              <div className="mb-4" data-testid="recent-searches">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <p className="text-sm font-medium">Recent Searches</p>
                  </div>
                  <button onClick={clearRecent} className="text-xs text-primary" data-testid="clear-recent-btn">Clear</button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {recentSearches.map((term, i) => (
                    <button
                      key={i}
                      onClick={() => setQuery(term)}
                      className="px-3 py-1.5 bg-secondary rounded-full text-sm hover:bg-secondary/80 transition-colors"
                      data-testid={`recent-search-${i}`}
                    >
                      {term}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Trending Searches */}
            {!query && trendingSearches.length > 0 && (
              <div className="mb-4" data-testid="trending-searches">
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp className="w-4 h-4 text-orange-400" />
                  <p className="text-sm font-medium">Trending Now</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {trendingSearches.slice(0, 8).map((term, i) => (
                    <button
                      key={i}
                      onClick={() => handleTrendingClick(term)}
                      className="px-3 py-1.5 bg-gradient-to-r from-orange-500/20 to-red-500/20 border border-orange-500/30 rounded-full text-sm hover:from-orange-500/30 hover:to-red-500/30 transition-colors"
                      data-testid={`trending-search-${i}`}
                    >
                      {term}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Quick Genre Filters */}
            {!query && (
              <div className="mt-4" data-testid="quick-filters">
                <p className="text-sm font-medium mb-3">Quick Filters</p>
                <div className="flex flex-wrap gap-2">
                  {["Romance", "Drama", "Thriller", "Action", "Comedy", "Mystery", "Fantasy", "Historical"].map(genre => (
                    <button
                      key={genre}
                      onClick={() => setQuery(genre)}
                      className="px-4 py-2 bg-white/10 hover:bg-primary/30 rounded-full text-sm font-medium transition-colors"
                      data-testid={`genre-filter-${genre.toLowerCase()}`}
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
