import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";
import {
  ChevronLeft, ChevronRight, Check, DollarSign,
  Target, Film, Calendar, Upload, Image, Video,
  Loader2, AlertCircle, Sparkles, Globe, Users
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { API } from "@/config";
import { toast } from "sonner";

const CAMPAIGN_TYPES = [
  {
    id: "cpv",
    name: "Pay Per View",
    description: "Only pay when viewers watch your ad",
    icon: <DollarSign className="w-6 h-6" />,
    rate: "$0.02/view",
    recommended: true
  },
  {
    id: "monthly",
    name: "Monthly + CPV",
    description: "Lower rate with monthly commitment",
    icon: <Calendar className="w-6 h-6" />,
    rate: "$500/mo + $0.01/view"
  },
  {
    id: "sponsorship",
    name: "Sponsorship",
    description: "Sponsor a series or genre",
    icon: <Sparkles className="w-6 h-6" />,
    rate: "From $2,000"
  },
  {
    id: "takeover",
    name: "Story Takeover",
    description: "Own the Stories feed for 24 hours",
    icon: <Target className="w-6 h-6" />,
    rate: "From $5,000"
  }
];

const AD_PLACEMENTS = [
  {
    id: "pre_roll",
    name: "Pre-roll",
    description: "5-10 second ad before video starts",
    duration: "5-10s",
    available: ["cpv", "monthly", "sponsorship", "takeover"]
  },
  {
    id: "mid_roll",
    name: "Mid-roll",
    description: "Ad during video playback",
    duration: "5-15s",
    available: ["monthly", "sponsorship", "takeover"]
  },
  {
    id: "overlay",
    name: "Overlay Banner",
    description: "Non-intrusive banner at bottom",
    duration: "8s",
    available: ["monthly", "sponsorship", "takeover"]
  },
  {
    id: "story",
    name: "Story Ad",
    description: "Full-screen vertical between stories",
    duration: "5-15s",
    available: ["sponsorship", "takeover"]
  }
];

const GENRES = [
  "All Genres", "Romance", "Drama", "Action", "Comedy", 
  "Thriller", "Horror", "Documentary", "Family"
];

const COUNTRIES = [
  "All Africa", "Kenya", "Nigeria", "South Africa", "Ghana", 
  "Tanzania", "Uganda", "Rwanda", "Ethiopia"
];

export const CampaignCreatePage = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const token = localStorage.getItem("advertiser_token");

  const [campaign, setCampaign] = useState({
    name: "",
    campaign_type: "cpv",
    budget: 100,
    daily_budget: null,
    start_date: new Date().toISOString().split("T")[0],
    end_date: "",
    ad_placements: ["pre_roll"],
    targeting: {
      genres: ["All Genres"],
      countries: ["All Africa"],
      age_range: "18-65"
    }
  });

  const [adCreative, setAdCreative] = useState({
    name: "",
    creative_type: "video",
    media_url: "",
    duration: 10,
    click_url: "",
    call_to_action: "Learn More"
  });

  useEffect(() => {
    if (!token) {
      navigate("/business/auth");
    }
  }, [token, navigate]);

  const handleNext = () => {
    if (step === 1 && !campaign.name) {
      toast.error("Please enter a campaign name");
      return;
    }
    if (step === 2 && campaign.ad_placements.length === 0) {
      toast.error("Please select at least one ad placement");
      return;
    }
    if (step === 3 && campaign.budget < 50) {
      toast.error("Minimum budget is $50");
      return;
    }
    setStep(step + 1);
  };

  const handleBack = () => {
    setStep(step - 1);
  };

  const handlePlacementToggle = (placementId) => {
    const placement = AD_PLACEMENTS.find(p => p.id === placementId);
    if (!placement.available.includes(campaign.campaign_type)) {
      toast.error(`This placement requires a higher tier plan`);
      return;
    }
    
    setCampaign(prev => ({
      ...prev,
      ad_placements: prev.ad_placements.includes(placementId)
        ? prev.ad_placements.filter(p => p !== placementId)
        : [...prev.ad_placements, placementId]
    }));
  };

  const handleSubmit = async () => {
    if (!adCreative.media_url) {
      toast.error("Please provide an ad creative URL");
      return;
    }
    
    setLoading(true);
    
    try {
      // Create campaign
      const campaignRes = await axios.post(`${API}/advertiser/campaigns`, campaign, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Create ad creative
      await axios.post(
        `${API}/advertiser/campaigns/${campaignRes.data.campaign.id}/ads`,
        adCreative,
        { headers: { Authorization: `Bearer ${token}` }}
      );
      
      toast.success("Campaign created! Pending approval.");
      navigate("/business/dashboard");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to create campaign");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-900 to-purple-900/20">
      {/* Header */}
      <header className="bg-black/40 backdrop-blur-lg border-b border-white/10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/business/dashboard" className="flex items-center gap-2 text-white hover:text-primary transition-colors">
            <ChevronLeft className="w-5 h-5" />
            <span>Back to Dashboard</span>
          </Link>
          <span className="text-white/60">Create Campaign</span>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Progress Steps */}
        <div className="flex items-center justify-center mb-12">
          {[
            { num: 1, label: "Campaign Type" },
            { num: 2, label: "Ad Placement" },
            { num: 3, label: "Budget & Targeting" },
            { num: 4, label: "Creative" },
            { num: 5, label: "Review" }
          ].map((s, i) => (
            <React.Fragment key={s.num}>
              <div className={`flex flex-col items-center ${step >= s.num ? "text-primary" : "text-white/40"}`}>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                  step > s.num ? "bg-primary text-white" :
                  step === s.num ? "bg-primary/20 border-2 border-primary" :
                  "bg-white/10"
                }`}>
                  {step > s.num ? <Check className="w-5 h-5" /> : s.num}
                </div>
                <span className="text-xs mt-2 hidden sm:block">{s.label}</span>
              </div>
              {i < 4 && (
                <div className={`w-12 sm:w-24 h-0.5 mx-2 ${step > s.num ? "bg-primary" : "bg-white/10"}`} />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Step Content */}
        <Card className="p-8 bg-black/40 border-white/10">
          {/* Step 1: Campaign Type */}
          {step === 1 && (
            <div>
              <h2 className="text-2xl font-heading font-bold text-white mb-2">Choose Campaign Type</h2>
              <p className="text-white/60 mb-8">Select how you want to pay for your ads</p>
              
              <div className="mb-8">
                <label className="text-sm text-white/70 mb-2 block">Campaign Name</label>
                <Input
                  value={campaign.name}
                  onChange={(e) => setCampaign({...campaign, name: e.target.value})}
                  placeholder="e.g., Summer Sale Campaign"
                  className="max-w-md"
                  data-testid="campaign-name-input"
                />
              </div>
              
              <div className="grid md:grid-cols-2 gap-4">
                {CAMPAIGN_TYPES.map((type) => (
                  <div
                    key={type.id}
                    onClick={() => setCampaign({...campaign, campaign_type: type.id})}
                    className={`p-6 rounded-xl border-2 cursor-pointer transition-all ${
                      campaign.campaign_type === type.id
                        ? "border-primary bg-primary/10"
                        : "border-white/10 hover:border-white/30"
                    }`}
                    data-testid={`campaign-type-${type.id}`}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className={`p-3 rounded-lg ${campaign.campaign_type === type.id ? "bg-primary/20 text-primary" : "bg-white/10 text-white/60"}`}>
                        {type.icon}
                      </div>
                      {type.recommended && (
                        <Badge className="bg-green-500/20 text-green-400">Recommended</Badge>
                      )}
                    </div>
                    <h3 className="text-lg font-semibold text-white mb-1">{type.name}</h3>
                    <p className="text-sm text-white/60 mb-2">{type.description}</p>
                    <p className="text-primary font-medium">{type.rate}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: Ad Placements */}
          {step === 2 && (
            <div>
              <h2 className="text-2xl font-heading font-bold text-white mb-2">Select Ad Placements</h2>
              <p className="text-white/60 mb-8">Choose where your ads will appear</p>
              
              <div className="space-y-4">
                {AD_PLACEMENTS.map((placement) => {
                  const isAvailable = placement.available.includes(campaign.campaign_type);
                  const isSelected = campaign.ad_placements.includes(placement.id);
                  
                  return (
                    <div
                      key={placement.id}
                      onClick={() => handlePlacementToggle(placement.id)}
                      className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex items-center justify-between ${
                        isSelected
                          ? "border-primary bg-primary/10"
                          : isAvailable
                          ? "border-white/10 hover:border-white/30"
                          : "border-white/5 opacity-50 cursor-not-allowed"
                      }`}
                      data-testid={`placement-${placement.id}`}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-6 h-6 rounded-md border-2 flex items-center justify-center ${
                          isSelected ? "bg-primary border-primary" : "border-white/30"
                        }`}>
                          {isSelected && <Check className="w-4 h-4 text-white" />}
                        </div>
                        <div>
                          <h3 className="font-medium text-white">{placement.name}</h3>
                          <p className="text-sm text-white/60">{placement.description}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge variant="outline" className="text-xs">{placement.duration}</Badge>
                        {!isAvailable && (
                          <p className="text-xs text-yellow-400 mt-1">Upgrade required</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Step 3: Budget & Targeting */}
          {step === 3 && (
            <div>
              <h2 className="text-2xl font-heading font-bold text-white mb-2">Budget & Targeting</h2>
              <p className="text-white/60 mb-8">Set your budget and who should see your ads</p>
              
              <div className="grid md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div>
                    <label className="text-sm text-white/70 mb-2 block">Total Budget ($)</label>
                    <Input
                      type="number"
                      value={campaign.budget}
                      onChange={(e) => setCampaign({...campaign, budget: parseFloat(e.target.value) || 0})}
                      min={50}
                      className="text-lg"
                      data-testid="campaign-budget-input"
                    />
                    <p className="text-xs text-white/50 mt-1">Minimum: $50</p>
                  </div>
                  
                  <div>
                    <label className="text-sm text-white/70 mb-2 block">Daily Budget (Optional)</label>
                    <Input
                      type="number"
                      value={campaign.daily_budget || ""}
                      onChange={(e) => setCampaign({...campaign, daily_budget: parseFloat(e.target.value) || null})}
                      placeholder="Auto-calculated if empty"
                      data-testid="campaign-daily-budget-input"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm text-white/70 mb-2 block">Start Date</label>
                      <Input
                        type="date"
                        value={campaign.start_date}
                        onChange={(e) => setCampaign({...campaign, start_date: e.target.value})}
                        data-testid="campaign-start-date"
                      />
                    </div>
                    <div>
                      <label className="text-sm text-white/70 mb-2 block">End Date</label>
                      <Input
                        type="date"
                        value={campaign.end_date}
                        onChange={(e) => setCampaign({...campaign, end_date: e.target.value})}
                        data-testid="campaign-end-date"
                      />
                    </div>
                  </div>
                </div>
                
                <div className="space-y-6">
                  <div>
                    <label className="text-sm text-white/70 mb-2 block flex items-center gap-2">
                      <Film className="w-4 h-4" /> Target Genres
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {GENRES.map((genre) => (
                        <Badge
                          key={genre}
                          variant={campaign.targeting.genres.includes(genre) ? "default" : "outline"}
                          className="cursor-pointer"
                          onClick={() => {
                            const genres = campaign.targeting.genres.includes(genre)
                              ? campaign.targeting.genres.filter(g => g !== genre)
                              : [...campaign.targeting.genres, genre];
                            setCampaign({...campaign, targeting: {...campaign.targeting, genres}});
                          }}
                        >
                          {genre}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-sm text-white/70 mb-2 block flex items-center gap-2">
                      <Globe className="w-4 h-4" /> Target Countries
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {COUNTRIES.map((country) => (
                        <Badge
                          key={country}
                          variant={campaign.targeting.countries.includes(country) ? "default" : "outline"}
                          className="cursor-pointer"
                          onClick={() => {
                            const countries = campaign.targeting.countries.includes(country)
                              ? campaign.targeting.countries.filter(c => c !== country)
                              : [...campaign.targeting.countries, country];
                            setCampaign({...campaign, targeting: {...campaign.targeting, countries}});
                          }}
                        >
                          {country}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-sm text-white/70 mb-2 block flex items-center gap-2">
                      <Users className="w-4 h-4" /> Age Range
                    </label>
                    <select
                      value={campaign.targeting.age_range}
                      onChange={(e) => setCampaign({...campaign, targeting: {...campaign.targeting, age_range: e.target.value}})}
                      className="w-full h-10 px-3 rounded-lg bg-secondary/50 border border-white/10 text-white"
                    >
                      <option value="18-65">All Adults (18-65)</option>
                      <option value="18-24">Young Adults (18-24)</option>
                      <option value="25-34">Adults (25-34)</option>
                      <option value="35-44">Middle Age (35-44)</option>
                      <option value="45-65">Mature (45-65)</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Creative */}
          {step === 4 && (
            <div>
              <h2 className="text-2xl font-heading font-bold text-white mb-2">Upload Ad Creative</h2>
              <p className="text-white/60 mb-8">Add your video or image ad</p>
              
              <div className="space-y-6">
                <div>
                  <label className="text-sm text-white/70 mb-2 block">Creative Name</label>
                  <Input
                    value={adCreative.name}
                    onChange={(e) => setAdCreative({...adCreative, name: e.target.value})}
                    placeholder="e.g., Summer Sale Video Ad"
                    data-testid="creative-name-input"
                  />
                </div>
                
                <div>
                  <label className="text-sm text-white/70 mb-2 block">Creative Type</label>
                  <div className="flex gap-4">
                    <button
                      onClick={() => setAdCreative({...adCreative, creative_type: "video"})}
                      className={`flex-1 p-4 rounded-xl border-2 flex items-center justify-center gap-2 ${
                        adCreative.creative_type === "video" ? "border-primary bg-primary/10" : "border-white/10"
                      }`}
                    >
                      <Video className="w-5 h-5" />
                      <span>Video</span>
                    </button>
                    <button
                      onClick={() => setAdCreative({...adCreative, creative_type: "image"})}
                      className={`flex-1 p-4 rounded-xl border-2 flex items-center justify-center gap-2 ${
                        adCreative.creative_type === "image" ? "border-primary bg-primary/10" : "border-white/10"
                      }`}
                    >
                      <Image className="w-5 h-5" />
                      <span>Image</span>
                    </button>
                  </div>
                </div>
                
                <div>
                  <label className="text-sm text-white/70 mb-2 block">Media URL</label>
                  <Input
                    value={adCreative.media_url}
                    onChange={(e) => setAdCreative({...adCreative, media_url: e.target.value})}
                    placeholder="https://your-cdn.com/ad-video.mp4"
                    data-testid="creative-url-input"
                  />
                  <p className="text-xs text-white/50 mt-1">
                    {adCreative.creative_type === "video" 
                      ? "MP4 format, max 15 seconds, vertical (9:16) recommended for Stories"
                      : "JPG/PNG format, 1080x1920 for Stories, 1920x1080 for banners"
                    }
                  </p>
                </div>
                
                {adCreative.creative_type === "video" && (
                  <div>
                    <label className="text-sm text-white/70 mb-2 block">Duration (seconds)</label>
                    <Input
                      type="number"
                      value={adCreative.duration}
                      onChange={(e) => setAdCreative({...adCreative, duration: parseInt(e.target.value) || 10})}
                      min={5}
                      max={15}
                      data-testid="creative-duration-input"
                    />
                  </div>
                )}
                
                <div>
                  <label className="text-sm text-white/70 mb-2 block">Click URL (Landing Page)</label>
                  <Input
                    value={adCreative.click_url}
                    onChange={(e) => setAdCreative({...adCreative, click_url: e.target.value})}
                    placeholder="https://yourwebsite.com/landing-page"
                    data-testid="creative-click-url-input"
                  />
                </div>
                
                <div>
                  <label className="text-sm text-white/70 mb-2 block">Call to Action</label>
                  <select
                    value={adCreative.call_to_action}
                    onChange={(e) => setAdCreative({...adCreative, call_to_action: e.target.value})}
                    className="w-full h-10 px-3 rounded-lg bg-secondary/50 border border-white/10 text-white"
                  >
                    <option value="Learn More">Learn More</option>
                    <option value="Shop Now">Shop Now</option>
                    <option value="Sign Up">Sign Up</option>
                    <option value="Download">Download</option>
                    <option value="Get Offer">Get Offer</option>
                    <option value="Contact Us">Contact Us</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Step 5: Review */}
          {step === 5 && (
            <div>
              <h2 className="text-2xl font-heading font-bold text-white mb-2">Review Campaign</h2>
              <p className="text-white/60 mb-8">Review your campaign details before submitting</p>
              
              <div className="space-y-6">
                <div className="p-4 rounded-xl bg-white/5">
                  <h3 className="text-sm text-white/50 mb-2">Campaign Details</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-white/70">Name</p>
                      <p className="text-white font-medium">{campaign.name}</p>
                    </div>
                    <div>
                      <p className="text-white/70">Type</p>
                      <p className="text-white font-medium capitalize">{campaign.campaign_type}</p>
                    </div>
                    <div>
                      <p className="text-white/70">Budget</p>
                      <p className="text-white font-medium">${campaign.budget}</p>
                    </div>
                    <div>
                      <p className="text-white/70">Duration</p>
                      <p className="text-white font-medium">{campaign.start_date} - {campaign.end_date || "Ongoing"}</p>
                    </div>
                  </div>
                </div>
                
                <div className="p-4 rounded-xl bg-white/5">
                  <h3 className="text-sm text-white/50 mb-2">Ad Placements</h3>
                  <div className="flex flex-wrap gap-2">
                    {campaign.ad_placements.map(p => (
                      <Badge key={p} className="capitalize">{p.replace("_", " ")}</Badge>
                    ))}
                  </div>
                </div>
                
                <div className="p-4 rounded-xl bg-white/5">
                  <h3 className="text-sm text-white/50 mb-2">Targeting</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-white/70">Genres</p>
                      <p className="text-white">{campaign.targeting.genres.join(", ")}</p>
                    </div>
                    <div>
                      <p className="text-white/70">Countries</p>
                      <p className="text-white">{campaign.targeting.countries.join(", ")}</p>
                    </div>
                  </div>
                </div>
                
                <div className="p-4 rounded-xl bg-white/5">
                  <h3 className="text-sm text-white/50 mb-2">Creative</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-white/70">Name</p>
                      <p className="text-white">{adCreative.name || "Unnamed"}</p>
                    </div>
                    <div>
                      <p className="text-white/70">Type</p>
                      <p className="text-white capitalize">{adCreative.creative_type}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-white/70">Media URL</p>
                      <p className="text-white text-sm truncate">{adCreative.media_url}</p>
                    </div>
                  </div>
                </div>
                
                <div className="p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/30">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-yellow-400 font-medium">Approval Required</p>
                      <p className="text-sm text-yellow-400/80">
                        Your campaign and ad creative will be reviewed by our team before going live. 
                        This typically takes 24-48 hours.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between mt-8 pt-6 border-t border-white/10">
            {step > 1 ? (
              <Button variant="outline" onClick={handleBack}>
                <ChevronLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
            ) : (
              <div />
            )}
            
            {step < 5 ? (
              <Button onClick={handleNext}>
                Next
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button onClick={handleSubmit} disabled={loading}>
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Check className="w-4 h-4 mr-2" />
                )}
                Submit Campaign
              </Button>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default CampaignCreatePage;
