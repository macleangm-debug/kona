import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Search, X, ChevronLeft, Loader2 } from "lucide-react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import axios from "axios";
import { API } from "@/config";

export const SearchModal = ({ open, onClose }) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [recentSearches, setRecentSearches] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const saved = localStorage.getItem("kona-recent-searches");
    if (saved) setRecentSearches(JSON.parse(saved));
  }, []);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const search = async () => {
      setLoading(true);
      try {
        const res = await axios.get(`${API}/search?q=${encodeURIComponent(query)}`);
        setResults(res.data);
      } catch (e) {
        console.error(e);
      }
      setLoading(false);
    };

    const debounce = setTimeout(search, 300);
    return () => clearTimeout(debounce);
  }, [query]);

  const handleSelect = (series) => {
    // Save to recent searches
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
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="top" className="h-[85vh] bg-background border-b border-white/10">
        <div className="pt-4">
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
            <div className="text-center py-12">
              <Search className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
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

          {/* Trending Genres */}
          {!query && (
            <div className="mt-6">
              <p className="text-sm font-medium mb-3">Browse by Genre</p>
              <div className="grid grid-cols-2 gap-2">
                {["Romance", "Drama", "Thriller", "Action"].map(genre => (
                  <button
                    key={genre}
                    onClick={() => setQuery(genre)}
                    className="p-4 bg-gradient-to-br from-primary/20 to-purple-600/20 rounded-xl text-left hover:from-primary/30 hover:to-purple-600/30 transition-colors"
                  >
                    <span className="font-medium">{genre}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default SearchModal;
