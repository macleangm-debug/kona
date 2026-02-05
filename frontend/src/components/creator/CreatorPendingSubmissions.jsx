import React from "react";
import { Clock, CheckCircle, AlertCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const CreatorPendingSubmissions = ({ submissions }) => {
  if (!submissions || submissions.length === 0) return null;

  const getStatusConfig = (status) => {
    const configs = {
      pending_review: { icon: Clock, color: "text-yellow-400", bg: "bg-yellow-500/10", label: "Under Review" },
      approved: { icon: CheckCircle, color: "text-green-400", bg: "bg-green-500/10", label: "Approved" },
      rejected: { icon: AlertCircle, color: "text-red-400", bg: "bg-red-500/10", label: "Rejected" },
      changes_requested: { icon: AlertCircle, color: "text-orange-400", bg: "bg-orange-500/10", label: "Changes Needed" }
    };
    return configs[status] || configs.pending_review;
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Clock className="w-4 h-4 text-yellow-400" />
        <h3 className="font-heading font-semibold">Pending Submissions</h3>
      </div>
      
      {submissions.map(sub => {
        const config = getStatusConfig(sub.status);
        const StatusIcon = config.icon;
        
        return (
          <Card 
            key={sub.id}
            className={`p-4 ${config.bg} border-white/10`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-medium text-sm truncate">{sub.series_title}</h4>
                </div>
                <p className="text-xs text-muted-foreground">
                  {sub.genre} • {sub.pilot_episode_title || "Pilot Episode"}
                </p>
                {sub.admin_notes && (
                  <p className="text-xs text-muted-foreground mt-2 italic">
                    "{sub.admin_notes}"
                  </p>
                )}
                <p className="text-[10px] text-muted-foreground mt-2">
                  Submitted {new Date(sub.submitted_at).toLocaleDateString()}
                </p>
              </div>
              <Badge variant="outline" className={`${config.color} border-current shrink-0`}>
                <StatusIcon className="w-3 h-3 mr-1" />
                {config.label}
              </Badge>
            </div>
          </Card>
        );
      })}
    </div>
  );
};

export default CreatorPendingSubmissions;
