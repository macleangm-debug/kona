import React from "react";
import { useNavigate } from "react-router-dom";
import { 
  Film, Eye, Coins, Plus, TrendingUp, Clock, PlayCircle, 
  ChevronRight, Sparkles, DollarSign, Users, BarChart3 
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

// Summary Stats Card
const StatCard = ({ icon: Icon, label, value, subValue, color = "text-primary" }) => (
  <Card className="p-4 bg-gradient-to-br from-white/5 to-transparent border-white/10">
    <div className="flex items-start justify-between">
      <div>
        <p className="text-xs text-muted-foreground mb-1">{label}</p>
        <p className={`text-2xl font-bold ${color}`}>{value}</p>
        {subValue && (
          <p className="text-xs text-muted-foreground mt-1">{subValue}</p>
        )}
      </div>
      <div className={`p-2 rounded-lg bg-white/5 ${color}`}>
        <Icon className="w-5 h-5" />
      </div>
    </div>
  </Card>
);

// Series Card for Carousel
const SeriesCard = ({ series, onClick }) => {
  const getStatusColor = (status) => {
    const colors = {
      published: "bg-green-500",
      approved: "bg-blue-500",
      pending_review: "bg-yellow-500",
      rejected: "bg-red-500",
      draft: "bg-gray-500"
    };
    return colors[status] || colors.draft;
  };

  return (
    <Card 
      className="flex-shrink-0 w-44 overflow-hidden hover:ring-2 hover:ring-primary/50 transition-all cursor-pointer group"
      onClick={onClick}
      data-testid={`series-card-${series.id}`}
    >
      {/* Thumbnail */}
      <div className="relative aspect-[3/4] bg-secondary/50 overflow-hidden">
        {series.thumbnail ? (
          <img 
            src={series.thumbnail} 
            alt={series.title} 
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-purple-500/20">
            <Film className="w-12 h-12 text-muted-foreground" />
          </div>
        )}
        {/* Status Badge */}
        <div className={`absolute top-2 right-2 w-2 h-2 rounded-full ${getStatusColor(series.status)}`} />
        {/* Overlay on hover */}
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <PlayCircle className="w-10 h-10 text-white" />
        </div>
      </div>
      {/* Info */}
      <div className="p-3">
        <h4 className="font-medium text-sm truncate mb-1">{series.title}</h4>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Film className="w-3 h-3" /> {series.total_episodes || 0}
          </span>
          <span className="flex items-center gap-1">
            <Eye className="w-3 h-3" /> {(series.total_views || 0).toLocaleString()}
          </span>
        </div>
      </div>
    </Card>
  );
};

// Empty Series Skeleton Card
const EmptySeriesCard = ({ onClick }) => (
  <Card 
    className="flex-shrink-0 w-44 overflow-hidden border-dashed border-2 border-white/20 hover:border-primary/50 transition-all cursor-pointer group"
    onClick={onClick}
    data-testid="create-series-card"
  >
    <div className="aspect-[3/4] flex flex-col items-center justify-center bg-white/5 group-hover:bg-primary/10 transition-colors">
      <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center mb-3 group-hover:bg-primary/20 transition-colors">
        <Plus className="w-8 h-8 text-muted-foreground group-hover:text-primary transition-colors" />
      </div>
      <p className="text-sm font-medium text-muted-foreground group-hover:text-primary transition-colors">
        Add New Series
      </p>
    </div>
    <div className="p-3 text-center">
      <p className="text-xs text-muted-foreground">
        Create your first series
      </p>
    </div>
  </Card>
);

// Skeleton Card for Loading
const SkeletonSeriesCard = () => (
  <Card className="flex-shrink-0 w-44 overflow-hidden animate-pulse">
    <div className="aspect-[3/4] bg-white/10" />
    <div className="p-3 space-y-2">
      <div className="h-4 bg-white/10 rounded w-3/4" />
      <div className="h-3 bg-white/10 rounded w-1/2" />
    </div>
  </Card>
);

export const CreatorDashboardOverview = ({ 
  dashboard, 
  series, 
  submissions,
  onCreateSeries,
  loading = false
}) => {
  const navigate = useNavigate();

  // Calculate summary stats
  const totalEarnings = dashboard?.total_earnings || 0;
  const pendingEarnings = dashboard?.pending_earnings || 0;
  const totalViews = dashboard?.total_views || 0;
  const totalSeries = series?.length || 0;
  const totalEpisodes = series?.reduce((sum, s) => sum + (s.total_episodes || 0), 0) || 0;
  const pendingSubmissions = submissions?.filter(s => s.status === 'pending_review')?.length || 0;

  return (
    <div className="space-y-6" data-testid="creator-dashboard-overview">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          icon={Coins}
          label="Total Earnings"
          value={`${totalEarnings.toLocaleString()}`}
          subValue="coins earned"
          color="text-yellow-400"
        />
        <StatCard 
          icon={DollarSign}
          label="Pending Payout"
          value={`${pendingEarnings.toLocaleString()}`}
          subValue="ready to withdraw"
          color="text-green-400"
        />
        <StatCard 
          icon={Eye}
          label="Total Views"
          value={totalViews.toLocaleString()}
          subValue="across all series"
          color="text-blue-400"
        />
        <StatCard 
          icon={BarChart3}
          label="Content"
          value={totalSeries}
          subValue={`series • ${totalEpisodes} episodes`}
          color="text-purple-400"
        />
      </div>

      {/* Pending Submissions Alert */}
      {pendingSubmissions > 0 && (
        <Card className="p-4 bg-yellow-500/10 border-yellow-500/30">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-yellow-500/20">
              <Clock className="w-5 h-5 text-yellow-400" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-yellow-400">
                {pendingSubmissions} submission{pendingSubmissions > 1 ? 's' : ''} pending review
              </p>
              <p className="text-xs text-muted-foreground">
                Your content is being reviewed by our team
              </p>
            </div>
            <Button 
              variant="outline" 
              size="sm"
              className="border-yellow-500/50 text-yellow-400 hover:bg-yellow-500/20"
              onClick={() => navigate('/creator?tab=submissions')}
            >
              View Status
            </Button>
          </div>
        </Card>
      )}

      {/* My Series Carousel */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            <h3 className="font-heading text-lg font-semibold">My Series</h3>
            {totalSeries > 0 && (
              <Badge variant="secondary" className="ml-2">
                {totalSeries}
              </Badge>
            )}
          </div>
          {totalSeries > 0 && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onCreateSeries}
              className="text-primary hover:text-primary"
            >
              <Plus className="w-4 h-4 mr-1" /> New Series
            </Button>
          )}
        </div>

        {/* Carousel Container */}
        <div className="relative">
          <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide snap-x snap-mandatory">
            {loading ? (
              // Loading skeletons
              <>
                <SkeletonSeriesCard />
                <SkeletonSeriesCard />
                <SkeletonSeriesCard />
              </>
            ) : series && series.length > 0 ? (
              // Series cards
              <>
                {series.map(s => (
                  <SeriesCard 
                    key={s.id} 
                    series={s} 
                    onClick={() => navigate(`/creator/series/${s.id}`)}
                  />
                ))}
                {/* Add new series card at the end */}
                <EmptySeriesCard onClick={onCreateSeries} />
              </>
            ) : (
              // Empty state - show skeleton-style add card
              <>
                <EmptySeriesCard onClick={onCreateSeries} />
                {/* Ghost cards to show potential */}
                <Card className="flex-shrink-0 w-44 overflow-hidden opacity-30 border-dashed border-white/10">
                  <div className="aspect-[3/4] bg-white/5 flex items-center justify-center">
                    <Film className="w-8 h-8 text-white/20" />
                  </div>
                  <div className="p-3 space-y-2">
                    <div className="h-4 bg-white/5 rounded w-3/4" />
                    <div className="h-3 bg-white/5 rounded w-1/2" />
                  </div>
                </Card>
                <Card className="flex-shrink-0 w-44 overflow-hidden opacity-20 border-dashed border-white/10">
                  <div className="aspect-[3/4] bg-white/5 flex items-center justify-center">
                    <Film className="w-8 h-8 text-white/20" />
                  </div>
                  <div className="p-3 space-y-2">
                    <div className="h-4 bg-white/5 rounded w-3/4" />
                    <div className="h-3 bg-white/5 rounded w-1/2" />
                  </div>
                </Card>
              </>
            )}
          </div>
        </div>

        {/* Empty state message */}
        {(!series || series.length === 0) && !loading && (
          <div className="text-center mt-4 py-4">
            <p className="text-muted-foreground text-sm mb-2">
              You haven't created any series yet
            </p>
            <p className="text-xs text-muted-foreground">
              Start by creating your first series and uploading episodes to earn money!
            </p>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card 
          className="p-4 hover:bg-white/5 transition-colors cursor-pointer group"
          onClick={onCreateSeries}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/20 group-hover:bg-primary/30 transition-colors">
              <Plus className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="font-medium text-sm">Create Series</p>
              <p className="text-xs text-muted-foreground">Start a new series</p>
            </div>
          </div>
        </Card>
        
        <Card 
          className="p-4 hover:bg-white/5 transition-colors cursor-pointer group"
          onClick={() => navigate('/creator?tab=analytics')}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/20 group-hover:bg-blue-500/30 transition-colors">
              <TrendingUp className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="font-medium text-sm">Analytics</p>
              <p className="text-xs text-muted-foreground">View performance</p>
            </div>
          </div>
        </Card>
        
        <Card 
          className="p-4 hover:bg-white/5 transition-colors cursor-pointer group"
          onClick={() => navigate('/creator?tab=payouts')}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-500/20 group-hover:bg-green-500/30 transition-colors">
              <DollarSign className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <p className="font-medium text-sm">Payouts</p>
              <p className="text-xs text-muted-foreground">Withdraw earnings</p>
            </div>
          </div>
        </Card>
        
        <Card 
          className="p-4 hover:bg-white/5 transition-colors cursor-pointer group"
          onClick={() => window.open('/help/creators', '_blank')}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-500/20 group-hover:bg-purple-500/30 transition-colors">
              <Users className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <p className="font-medium text-sm">Creator Hub</p>
              <p className="text-xs text-muted-foreground">Tips & resources</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default CreatorDashboardOverview;
