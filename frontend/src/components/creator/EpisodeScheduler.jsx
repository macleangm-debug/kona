import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { 
  Calendar, Clock, Bell, X, Play, AlertCircle,
  Trash2, Edit, ChevronRight, Timer
} from "lucide-react";
import { API } from "@/config";
import { toast } from "sonner";

export const EpisodeScheduler = ({ token, episodes = [], onScheduleChange }) => {
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showScheduleDialog, setShowScheduleDialog] = useState(false);
  const [selectedEpisode, setSelectedEpisode] = useState(null);
  const [scheduleForm, setScheduleForm] = useState({
    date: "",
    time: "20:00",
    timezone: "Africa/Dar_es_Salaam",
    notifySubscribers: true,
    earlyAccessHours: 0
  });

  const fetchSchedules = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/creator/schedules`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSchedules(res.data.schedules || []);
    } catch (e) {
      console.error("Error fetching schedules:", e);
    }
    setLoading(false);
  }, [token]);

  useEffect(() => {
    fetchSchedules();
  }, [fetchSchedules]);

  const handleSchedule = async () => {
    if (!selectedEpisode || !scheduleForm.date || !scheduleForm.time) {
      toast.error("Please fill in all required fields");
      return;
    }

    const scheduledFor = new Date(`${scheduleForm.date}T${scheduleForm.time}:00`).toISOString();

    try {
      await axios.post(
        `${API}/creator/episodes/${selectedEpisode.id}/schedule`,
        {
          scheduled_for: scheduledFor,
          timezone: scheduleForm.timezone,
          notify_subscribers: scheduleForm.notifySubscribers,
          early_access_hours: scheduleForm.earlyAccessHours
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      toast.success(`Scheduled "${selectedEpisode.title}" for release`);
      setShowScheduleDialog(false);
      setSelectedEpisode(null);
      fetchSchedules();
      if (onScheduleChange) onScheduleChange();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Failed to schedule episode");
    }
  };

  const handleCancelSchedule = async (episodeId) => {
    try {
      await axios.delete(`${API}/creator/episodes/${episodeId}/schedule`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("Schedule cancelled");
      fetchSchedules();
      if (onScheduleChange) onScheduleChange();
    } catch (e) {
      toast.error("Failed to cancel schedule");
    }
  };

  const openScheduleDialog = (episode) => {
    setSelectedEpisode(episode);
    
    // Set default date to tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    setScheduleForm({
      date: tomorrow.toISOString().split('T')[0],
      time: "20:00",
      timezone: "Africa/Dar_es_Salaam",
      notifySubscribers: true,
      earlyAccessHours: 0
    });
    
    setShowScheduleDialog(true);
  };

  // Get unscheduled ready episodes
  const scheduledEpisodeIds = new Set(schedules.map(s => s.episode_id));
  const unscheduledEpisodes = episodes.filter(
    ep => ep.encoding_status === "ready" && !scheduledEpisodeIds.has(ep.id)
  );

  const formatScheduledTime = (isoString) => {
    const date = new Date(isoString);
    return date.toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTimeUntil = (isoString) => {
    const target = new Date(isoString);
    const now = new Date();
    const diff = target - now;
    
    if (diff < 0) return "Past due";
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Calendar className="w-6 h-6 text-primary" />
            Episode Scheduler
          </h2>
          <p className="text-sm text-muted-foreground">
            Queue episodes for timed release
          </p>
        </div>
      </div>

      {/* Scheduled Episodes */}
      <Card className="bg-card border-white/10">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Timer className="w-5 h-5 text-yellow-400" />
            Scheduled Releases ({schedules.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {schedules.length > 0 ? (
            <div className="space-y-3">
              {schedules.map((schedule) => (
                <div
                  key={schedule.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10 hover:border-primary/30 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                      <Play className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{schedule.episode_title}</p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        {formatScheduledTime(schedule.scheduled_for)}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-sm font-medium text-primary">
                        {getTimeUntil(schedule.scheduled_for)}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {schedule.notify_subscribers && (
                          <span className="flex items-center gap-1">
                            <Bell className="w-3 h-3" /> Notify
                          </span>
                        )}
                        {schedule.early_access_hours > 0 && (
                          <span>+{schedule.early_access_hours}h early access</span>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                      onClick={() => handleCancelSchedule(schedule.episode_id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No scheduled releases</p>
              <p className="text-sm">Schedule episodes below to release at specific times</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Available to Schedule */}
      <Card className="bg-card border-white/10">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Play className="w-5 h-5 text-green-400" />
            Ready to Schedule ({unscheduledEpisodes.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {unscheduledEpisodes.length > 0 ? (
            <div className="space-y-2">
              {unscheduledEpisodes.map((episode) => (
                <div
                  key={episode.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors cursor-pointer"
                  onClick={() => openScheduleDialog(episode)}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-8 rounded bg-white/10 flex items-center justify-center text-xs font-mono">
                      {episode.episode_code}
                    </div>
                    <div>
                      <p className="font-medium">{episode.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {episode.duration ? `${Math.floor(episode.duration / 60)}:${String(episode.duration % 60).padStart(2, '0')}` : 'Duration N/A'}
                      </p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm">
                    <Calendar className="w-4 h-4 mr-2" />
                    Schedule
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <AlertCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No episodes ready to schedule</p>
              <p className="text-sm">Upload and process episodes first</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Schedule Dialog */}
      <Dialog open={showScheduleDialog} onOpenChange={setShowScheduleDialog}>
        <DialogContent className="max-w-md bg-card border-white/10">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              Schedule Episode Release
            </DialogTitle>
            <DialogDescription>
              Schedule "{selectedEpisode?.title}" for automatic release
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-4">
            {/* Date & Time */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Release Date</label>
                <Input
                  type="date"
                  value={scheduleForm.date}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, date: e.target.value })}
                  min={new Date().toISOString().split('T')[0]}
                  className="bg-secondary/50 border-white/10"
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Release Time</label>
                <Input
                  type="time"
                  value={scheduleForm.time}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, time: e.target.value })}
                  className="bg-secondary/50 border-white/10"
                />
              </div>
            </div>

            {/* Timezone */}
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Timezone</label>
              <select
                value={scheduleForm.timezone}
                onChange={(e) => setScheduleForm({ ...scheduleForm, timezone: e.target.value })}
                className="w-full h-10 px-3 rounded-lg bg-secondary/50 border border-white/10 text-sm"
              >
                <option value="Africa/Dar_es_Salaam">East Africa Time (EAT)</option>
                <option value="Africa/Lagos">West Africa Time (WAT)</option>
                <option value="Africa/Cairo">Eastern European Time (EET)</option>
                <option value="UTC">UTC</option>
              </select>
            </div>

            {/* Notify Subscribers */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-white/5">
              <div className="flex items-center gap-3">
                <Bell className="w-5 h-5 text-primary" />
                <div>
                  <p className="text-sm font-medium">Notify Subscribers</p>
                  <p className="text-xs text-muted-foreground">Send push notification on release</p>
                </div>
              </div>
              <Switch
                checked={scheduleForm.notifySubscribers}
                onCheckedChange={(checked) => setScheduleForm({ ...scheduleForm, notifySubscribers: checked })}
              />
            </div>

            {/* Early Access */}
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">
                Early Access for Premium Subscribers (hours before public release)
              </label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min="0"
                  max="72"
                  value={scheduleForm.earlyAccessHours}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, earlyAccessHours: parseInt(e.target.value) || 0 })}
                  className="bg-secondary/50 border-white/10 w-24"
                />
                <span className="text-sm text-muted-foreground">hours</span>
              </div>
            </div>

            {/* Preview */}
            {scheduleForm.date && scheduleForm.time && (
              <div className="p-3 rounded-lg bg-primary/10 border border-primary/30">
                <p className="text-sm">
                  <strong>Release Preview:</strong><br />
                  {selectedEpisode?.title} will be released on{' '}
                  <strong>
                    {new Date(`${scheduleForm.date}T${scheduleForm.time}`).toLocaleString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </strong>
                  {scheduleForm.earlyAccessHours > 0 && (
                    <><br />Premium subscribers get access {scheduleForm.earlyAccessHours}h earlier</>
                  )}
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowScheduleDialog(false)}
              >
                Cancel
              </Button>
              <Button
                className="flex-1"
                onClick={handleSchedule}
              >
                <Calendar className="w-4 h-4 mr-2" />
                Schedule Release
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EpisodeScheduler;
