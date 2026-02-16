import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { Star, Lock, CheckCircle2, Loader2, ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { API } from "@/config";

const RarityBadge = ({ rarity }) => {
  const colors = {
    common: "bg-gray-500/20 text-gray-300 border-gray-500/30",
    rare: "bg-blue-500/20 text-blue-300 border-blue-500/30",
    epic: "bg-purple-500/20 text-purple-300 border-purple-500/30",
  };
  
  return (
    <span className={`px-1.5 py-0.5 text-[10px] font-bold rounded border ${colors[rarity] || colors.common}`}>
      {rarity.toUpperCase()}
    </span>
  );
};

const CharacterCard = ({ card, collected }) => {
  const rarityColors = {
    common: "from-gray-600 to-gray-700",
    rare: "from-blue-600 to-blue-700",
    epic: "from-purple-600 to-pink-600",
  };
  
  return (
    <div 
      className={`relative aspect-[3/4] rounded-xl overflow-hidden transition-all ${
        collected 
          ? `bg-gradient-to-br ${rarityColors[card.rarity]} shadow-lg` 
          : "bg-gray-800/50 opacity-50"
      }`}
    >
      {/* Card background pattern */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.1),transparent_70%)]" />
      </div>
      
      {/* Card content */}
      <div className="relative h-full flex flex-col items-center justify-center p-2">
        {collected ? (
          <>
            <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center mb-2 text-2xl">
              {card.name.charAt(0)}
            </div>
            <p className="font-bold text-xs text-center text-white">{card.name}</p>
            <RarityBadge rarity={card.rarity} />
          </>
        ) : (
          <>
            <Lock className="w-6 h-6 text-gray-500 mb-1" />
            <p className="text-[10px] text-gray-500">???</p>
          </>
        )}
      </div>
      
      {/* Collected checkmark */}
      {collected && (
        <div className="absolute top-1 right-1">
          <CheckCircle2 className="w-4 h-4 text-green-400" />
        </div>
      )}
    </div>
  );
};

export const CharacterCards = ({ token }) => {
  const [collection, setCollection] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedSeries, setSelectedSeries] = useState(null);

  const fetchCollection = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/cards/collection`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCollection(res.data);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }, [token]);

  useEffect(() => {
    if (token) fetchCollection();
  }, [token, fetchCollection]);

  if (loading) {
    return (
      <Card className="p-4 flex items-center justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-primary" />
      </Card>
    );
  }

  if (!collection) return null;

  return (
    <>
      <Card className="p-4 bg-gradient-to-br from-amber-500/10 to-orange-500/10 border-amber-500/20">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-amber-500/20">
              <Star className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h3 className="font-bold">Character Cards</h3>
              <p className="text-xs text-gray-400">Collect cards by watching series</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-lg font-bold text-amber-400">{collection.total_collected}/{collection.total_cards}</p>
            <p className="text-xs text-gray-400">{collection.completion_percent}% complete</p>
          </div>
        </div>

        {/* Overall progress */}
        <Progress value={collection.completion_percent} className="h-2 bg-gray-700 mb-4" />

        {/* Series list */}
        <div className="space-y-2">
          {collection.collection.map((series) => (
            <button
              key={series.series_id}
              onClick={() => setSelectedSeries(series)}
              className="w-full p-3 rounded-lg bg-black/20 hover:bg-black/30 transition-colors flex items-center gap-3"
            >
              <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-700 flex-shrink-0">
                {series.series_thumbnail && (
                  <img src={series.series_thumbnail} alt="" className="w-full h-full object-cover" />
                )}
              </div>
              <div className="flex-1 text-left">
                <p className="font-medium text-sm">{series.series_title}</p>
                <div className="flex items-center gap-2">
                  <Progress 
                    value={(series.collected_count / series.total_cards) * 100} 
                    className="h-1 flex-1 bg-gray-700" 
                  />
                  <span className="text-xs text-gray-400">
                    {series.collected_count}/{series.total_cards}
                  </span>
                </div>
              </div>
              {series.set_complete ? (
                <div className="px-2 py-1 rounded-full bg-green-500/20 text-green-400 text-xs font-bold">
                  ✓ COMPLETE
                </div>
              ) : (
                <ChevronRight className="w-4 h-4 text-gray-500" />
              )}
            </button>
          ))}
        </div>
      </Card>

      {/* Series Cards Modal */}
      <Dialog open={!!selectedSeries} onOpenChange={() => setSelectedSeries(null)}>
        <DialogContent className="bg-gray-900 border-gray-700 max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              {selectedSeries?.series_thumbnail && (
                <img 
                  src={selectedSeries.series_thumbnail} 
                  alt="" 
                  className="w-10 h-10 rounded-lg object-cover" 
                />
              )}
              <div>
                <p>{selectedSeries?.series_title}</p>
                <p className="text-xs text-gray-400 font-normal">
                  {selectedSeries?.collected_count}/{selectedSeries?.total_cards} cards collected
                </p>
              </div>
            </DialogTitle>
          </DialogHeader>
          
          <div className="grid grid-cols-4 gap-2 mt-4">
            {selectedSeries?.cards.map((card) => (
              <CharacterCard key={card.id} card={card} collected={card.collected} />
            ))}
          </div>
          
          {selectedSeries?.set_complete && (
            <div className="mt-4 p-3 rounded-lg bg-green-500/20 border border-green-500/30 text-center">
              <p className="text-sm font-bold text-green-400">🎉 Set Complete!</p>
              <p className="text-xs text-gray-400">You've earned the Collector badge!</p>
            </div>
          )}
          
          {!selectedSeries?.set_complete && (
            <p className="text-xs text-gray-400 text-center mt-4">
              Watch more episodes to unlock cards!
            </p>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default CharacterCards;
