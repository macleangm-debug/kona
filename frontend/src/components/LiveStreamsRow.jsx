import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Radio, Users, ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { API } from "@/config";

export const LiveStreamsRow = () => {
  const navigate = useNavigate();
  const [liveStreams, setLiveStreams] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLiveStreams = async () => {
      try {
        const response = await axios.get(`${API}/livestream/active?limit=10`);
        setLiveStreams(response.data.streams || []);
      } catch (err) {
        console.error("Failed to fetch live streams:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchLiveStreams();
    
    // Poll for updates every 30 seconds
    const interval = setInterval(fetchLiveStreams, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading || liveStreams.length === 0) {
    return null;
  }

  return (
    <div className="mb-8 lg:mb-12" data-testid="live-streams-section">
      {/* Header */}
      <div className="mx-4 lg:mx-12 mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1 bg-red-600 rounded-full animate-pulse">
            <Radio className="w-4 h-4 text-white" />
            <span className="text-white font-bold text-sm">LIVE NOW</span>
          </div>
          <span className="text-muted-foreground text-sm">{liveStreams.length} stream{liveStreams.length !== 1 ? 's' : ''}</span>
        </div>
        <button 
          onClick={() => navigate('/live')}
          className="flex items-center gap-1 text-sm text-primary hover:text-primary/80 transition-colors"
        >
          See All
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Live Stream Cards */}
      <div className="flex gap-4 overflow-x-auto scrollbar-hide px-4 lg:px-12 pb-2">
        {liveStreams.map((stream) => (
          <Card
            key={stream.id}
            className="flex-shrink-0 w-72 lg:w-80 bg-white/5 border-white/10 hover:border-red-500/50 transition-all cursor-pointer overflow-hidden group"
            onClick={() => navigate(`/live/${stream.id}`)}
            data-testid={`live-stream-card-${stream.id}`}
          >
            {/* Thumbnail */}
            <div className="relative aspect-video bg-black">
              <img
                src={stream.thumbnail_url || "/default-thumbnail.jpg"}
                alt={stream.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
              {/* Live Badge */}
              <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-0.5 bg-red-600 rounded text-xs font-bold text-white">
                <Radio className="w-3 h-3 animate-pulse" />
                LIVE
              </div>
              {/* Viewer Count */}
              <div className="absolute bottom-2 left-2 flex items-center gap-1 px-2 py-0.5 bg-black/70 rounded text-xs text-white">
                <Users className="w-3 h-3" />
                {stream.viewer_count?.toLocaleString() || 0}
              </div>
              {/* Play overlay */}
              <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="w-12 h-12 rounded-full bg-red-600 flex items-center justify-center">
                  <Radio className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>

            {/* Info */}
            <div className="p-3">
              <h3 className="font-semibold text-white truncate">{stream.title}</h3>
              <div className="flex items-center gap-2 mt-1">
                <img
                  src={stream.creator_avatar || "/default-avatar.png"}
                  alt={stream.creator_name}
                  className="w-5 h-5 rounded-full"
                />
                <span className="text-sm text-muted-foreground truncate">{stream.creator_name}</span>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default LiveStreamsRow;
