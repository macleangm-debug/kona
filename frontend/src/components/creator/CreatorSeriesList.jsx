import React from "react";
import { useNavigate } from "react-router-dom";
import { Film, Eye, Coins, Plus } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const CreatorSeriesList = ({ series, onCreateSeries }) => {
  const navigate = useNavigate();

  if (!series || series.length === 0) {
    return (
      <Card className="p-8 text-center">
        <Film className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
        <h3 className="font-semibold mb-2">No Series Yet</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Start by submitting your first series for review
        </p>
        <Button onClick={onCreateSeries}>
          <Plus className="w-4 h-4 mr-1" /> Create Series
        </Button>
      </Card>
    );
  }

  const getStatusBadge = (status) => {
    const statusConfig = {
      published: { variant: "default", label: "Published" },
      approved: { variant: "outline", className: "border-green-500 text-green-400", label: "Approved" },
      pending_review: { variant: "secondary", label: "Under Review" },
      rejected: { variant: "destructive", label: "Rejected" },
      draft: { variant: "outline", label: "Draft" }
    };
    const config = statusConfig[status] || statusConfig.draft;
    return (
      <Badge variant={config.variant} className={config.className}>
        {config.label}
      </Badge>
    );
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-heading font-semibold">My Series ({series.length})</h3>
        <Button size="sm" variant="outline" onClick={onCreateSeries}>
          <Plus className="w-4 h-4 mr-1" /> New Series
        </Button>
      </div>
      
      {series.map(s => (
        <Card 
          key={s.id}
          className="p-4 hover:bg-white/5 transition-colors cursor-pointer"
          onClick={() => navigate(`/creator/series/${s.id}`)}
          data-testid={`series-card-${s.id}`}
        >
          <div className="flex gap-3">
            <div className="w-16 h-20 rounded-lg bg-secondary/50 overflow-hidden flex-shrink-0">
              {s.thumbnail ? (
                <img src={s.thumbnail} alt={s.title} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Film className="w-6 h-6 text-muted-foreground" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h4 className="font-medium text-sm truncate">{s.title}</h4>
                {getStatusBadge(s.status)}
              </div>
              <p className="text-xs text-muted-foreground mb-2">
                {s.genre} • {s.total_episodes || 0} episodes
              </p>
              <div className="flex gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Eye className="w-3 h-3" /> {s.total_views || 0}
                </span>
                <span className="flex items-center gap-1">
                  <Coins className="w-3 h-3" /> {s.total_earnings || 0}
                </span>
              </div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
};

export default CreatorSeriesList;
