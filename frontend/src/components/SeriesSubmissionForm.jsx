import React, { useState } from "react";
import axios from "axios";
import { 
  X, Upload, Film, Clock, Users, Globe, Star, FileVideo,
  ChevronRight, Loader2, CheckCircle, AlertCircle
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { API } from "@/config";
import { toast } from "sonner";

const GENRES = [
  "Romance", "Drama", "Thriller", "Action", "Comedy", 
  "Horror", "Fantasy", "Sci-Fi", "Mystery", "Family"
];

const CONTENT_RATINGS = [
  { value: "G", label: "G - General Audience" },
  { value: "PG", label: "PG - Parental Guidance" },
  { value: "PG-13", label: "PG-13 - Parents Strongly Cautioned" },
  { value: "R", label: "R - Restricted" }
];

const LANGUAGES = [
  { value: "en", label: "English" },
  { value: "sw", label: "Swahili" },
  { value: "fr", label: "French" },
  { value: "es", label: "Spanish" },
  { value: "pt", label: "Portuguese" }
];

const SCHEDULES = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "biweekly", label: "Bi-weekly" }
];

export const SeriesSubmissionForm = ({ open, onClose, token, onSuccess }) => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submissionId, setSubmissionId] = useState(null);
  
  const [form, setForm] = useState({
    // Series Info
    title: "",
    description: "",
    genre: "Romance",
    target_audience: "",
    content_rating: "PG-13",
    language: "en",
    thumbnail_url: "",
    
    // Pilot Episode
    pilot_title: "",
    pilot_description: "",
    pilot_video_url: "",
    pilot_duration: null,
    
    // Series Plan
    planned_seasons: 1,
    episodes_per_season: 10,
    release_schedule: "weekly",
    unique_selling_point: ""
  });

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const res = await axios.post(
        `${API}/creator/series/submit`,
        form,
        { headers: { Authorization: `Bearer ${token}` }}
      );
      
      setSubmissionId(res.data.submission_id);
      setSubmitted(true);
      toast.success("Series submitted for review!");
      onSuccess?.();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Failed to submit series");
    }
    setLoading(false);
  };

  const canProceed = () => {
    switch (step) {
      case 1:
        return form.title.length >= 2 && form.description.length >= 50 && form.target_audience.length >= 5;
      case 2:
        return form.pilot_title.length >= 2 && form.pilot_description.length >= 20 && form.pilot_video_url.length > 0;
      case 3:
        return form.unique_selling_point.length >= 20;
      default:
        return false;
    }
  };

  if (submitted) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-md">
          <div className="text-center py-6">
            <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
            <h2 className="text-xl font-bold mb-2">Submission Received!</h2>
            <p className="text-muted-foreground mb-4">
              Your series "{form.title}" has been submitted for review. Our team will review your pilot episode and get back to you within 3-5 business days.
            </p>
            <p className="text-sm text-muted-foreground mb-6">
              Submission ID: <span className="font-mono">{submissionId}</span>
            </p>
            <Button onClick={onClose} className="w-full">
              Done
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Film className="w-5 h-5 text-primary" />
            Submit New Series
          </DialogTitle>
        </DialogHeader>

        {/* Progress Steps */}
        <div className="flex items-center justify-between mb-6">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                step >= s ? 'bg-primary text-white' : 'bg-secondary text-muted-foreground'
              }`}>
                {s}
              </div>
              {s < 3 && (
                <div className={`w-16 h-1 mx-2 rounded ${step > s ? 'bg-primary' : 'bg-secondary'}`} />
              )}
            </div>
          ))}
        </div>

        {/* Step 1: Series Info */}
        {step === 1 && (
          <div className="space-y-4">
            <h3 className="font-semibold">Series Information</h3>
            
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Series Title *</label>
              <Input
                value={form.title}
                onChange={(e) => handleChange("title", e.target.value)}
                placeholder="e.g., Love in the City"
                maxLength={100}
              />
            </div>

            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Description * (min 50 chars)</label>
              <textarea
                value={form.description}
                onChange={(e) => handleChange("description", e.target.value)}
                placeholder="Describe your series in detail..."
                className="w-full h-24 px-3 py-2 rounded-md border bg-background text-sm resize-none"
                maxLength={2000}
              />
              <span className="text-xs text-muted-foreground">{form.description.length}/2000</span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Genre *</label>
                <select
                  value={form.genre}
                  onChange={(e) => handleChange("genre", e.target.value)}
                  className="w-full h-10 px-3 rounded-md border bg-background text-sm"
                >
                  {GENRES.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Content Rating</label>
                <select
                  value={form.content_rating}
                  onChange={(e) => handleChange("content_rating", e.target.value)}
                  className="w-full h-10 px-3 rounded-md border bg-background text-sm"
                >
                  {CONTENT_RATINGS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Target Audience *</label>
              <Input
                value={form.target_audience}
                onChange={(e) => handleChange("target_audience", e.target.value)}
                placeholder="e.g., 18-35 female, young adults, families"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Language</label>
                <select
                  value={form.language}
                  onChange={(e) => handleChange("language", e.target.value)}
                  className="w-full h-10 px-3 rounded-md border bg-background text-sm"
                >
                  {LANGUAGES.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Thumbnail URL</label>
                <Input
                  value={form.thumbnail_url}
                  onChange={(e) => handleChange("thumbnail_url", e.target.value)}
                  placeholder="https://..."
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Pilot Episode */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <FileVideo className="w-5 h-5 text-primary" />
              <h3 className="font-semibold">Pilot Episode (S01E01)</h3>
            </div>
            
            <Card className="p-3 bg-blue-500/10 border-blue-500/30">
              <p className="text-sm text-blue-400">
                The pilot episode will be free for all users and is used by our team to evaluate your content quality.
              </p>
            </Card>

            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Episode Title *</label>
              <Input
                value={form.pilot_title}
                onChange={(e) => handleChange("pilot_title", e.target.value)}
                placeholder="e.g., The First Meeting"
                maxLength={100}
              />
            </div>

            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Episode Description *</label>
              <textarea
                value={form.pilot_description}
                onChange={(e) => handleChange("pilot_description", e.target.value)}
                placeholder="Brief description of the pilot episode..."
                className="w-full h-20 px-3 py-2 rounded-md border bg-background text-sm resize-none"
                maxLength={500}
              />
            </div>

            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Video URL * (YouTube, Vimeo, or direct link)</label>
              <Input
                value={form.pilot_video_url}
                onChange={(e) => handleChange("pilot_video_url", e.target.value)}
                placeholder="https://..."
              />
              <p className="text-xs text-muted-foreground mt-1">
                Provide a link to your pilot episode video. After approval, you'll upload directly to our platform.
              </p>
            </div>

            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Duration (seconds)</label>
              <Input
                type="number"
                value={form.pilot_duration || ""}
                onChange={(e) => handleChange("pilot_duration", parseInt(e.target.value) || null)}
                placeholder="e.g., 180 (3 minutes)"
              />
            </div>
          </div>
        )}

        {/* Step 3: Series Plan */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-5 h-5 text-primary" />
              <h3 className="font-semibold">Series Plan</h3>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Planned Seasons</label>
                <Input
                  type="number"
                  min={1}
                  max={10}
                  value={form.planned_seasons}
                  onChange={(e) => handleChange("planned_seasons", parseInt(e.target.value) || 1)}
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Episodes per Season</label>
                <Input
                  type="number"
                  min={5}
                  max={50}
                  value={form.episodes_per_season}
                  onChange={(e) => handleChange("episodes_per_season", parseInt(e.target.value) || 10)}
                />
              </div>
            </div>

            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Release Schedule</label>
              <select
                value={form.release_schedule}
                onChange={(e) => handleChange("release_schedule", e.target.value)}
                className="w-full h-10 px-3 rounded-md border bg-background text-sm"
              >
                {SCHEDULES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>

            <div>
              <label className="text-sm text-muted-foreground mb-1 block">
                What makes your series unique? * (min 20 chars)
              </label>
              <textarea
                value={form.unique_selling_point}
                onChange={(e) => handleChange("unique_selling_point", e.target.value)}
                placeholder="Describe what makes your series stand out from others..."
                className="w-full h-24 px-3 py-2 rounded-md border bg-background text-sm resize-none"
                maxLength={500}
              />
              <span className="text-xs text-muted-foreground">{form.unique_selling_point.length}/500</span>
            </div>

            {/* Summary */}
            <Card className="p-4 bg-secondary/30">
              <h4 className="font-semibold mb-2">Submission Summary</h4>
              <div className="space-y-1 text-sm">
                <p><span className="text-muted-foreground">Series:</span> {form.title}</p>
                <p><span className="text-muted-foreground">Genre:</span> {form.genre}</p>
                <p><span className="text-muted-foreground">Pilot:</span> {form.pilot_title}</p>
                <p><span className="text-muted-foreground">Plan:</span> {form.planned_seasons} season(s), {form.episodes_per_season} episodes each</p>
              </div>
            </Card>
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between pt-4 border-t">
          {step > 1 ? (
            <Button variant="outline" onClick={() => setStep(s => s - 1)}>
              Back
            </Button>
          ) : (
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
          )}

          {step < 3 ? (
            <Button onClick={() => setStep(s => s + 1)} disabled={!canProceed()}>
              Continue
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={!canProceed() || loading}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Submit for Review
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SeriesSubmissionForm;
