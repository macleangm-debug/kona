/**
 * SubtitleEditor Component
 * Easy-to-use subtitle creation for creators
 * Supports: File upload (Word, TXT, SRT, VTT) and in-app editing
 */

import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import {
  Upload, Plus, Trash2, Play, Pause, Save, FileText,
  Clock, Languages, Download, ChevronDown, Edit, Eye,
  AlertCircle, Check, Loader2, FileUp, X
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { API } from "@/config";
import { toast } from "sonner";

const LANGUAGES = [
  { code: "en", name: "English", flag: "🇬🇧" },
  { code: "sw", name: "Swahili", flag: "🇹🇿" },
  { code: "fr", name: "French", flag: "🇫🇷" },
  { code: "ar", name: "Arabic", flag: "🇸🇦" },
  { code: "pt", name: "Portuguese", flag: "🇵🇹" },
  { code: "ha", name: "Hausa", flag: "🇳🇬" },
  { code: "am", name: "Amharic", flag: "🇪🇹" },
  { code: "zu", name: "Zulu", flag: "🇿🇦" }
];

const formatTime = (seconds) => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
};

const parseTimeToSeconds = (timeStr) => {
  const parts = timeStr.split(':');
  if (parts.length === 2) {
    const [mins, secs] = parts;
    return parseFloat(mins) * 60 + parseFloat(secs);
  }
  return parseFloat(timeStr) || 0;
};

export const SubtitleEditor = ({ 
  episodeId, 
  episodeTitle,
  videoDuration = 0,
  videoUrl,
  existingSubtitles = {},
  token,
  onSave,
  onClose 
}) => {
  const [activeTab, setActiveTab] = useState("upload");
  const [language, setLanguage] = useState("en");
  const [cues, setCues] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [plainText, setPlainText] = useState("");
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedCue, setSelectedCue] = useState(null);
  
  const videoRef = useRef(null);
  const fileInputRef = useRef(null);

  // Load existing subtitles if available
  useEffect(() => {
    if (existingSubtitles[language]) {
      loadExistingSubtitles(language);
    } else {
      setCues([]);
    }
  }, [language, existingSubtitles]);

  const loadExistingSubtitles = async (lang) => {
    try {
      const res = await axios.get(`${API}/subtitles/${episodeId}/${lang}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.cues) {
        setCues(res.data.cues.map((c, i) => ({ ...c, id: i })));
      }
    } catch (e) {
      console.error("Failed to load subtitles:", e);
    }
  };

  // Handle file upload
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);
    formData.append("episode_id", episodeId);
    formData.append("language", language);

    setUploading(true);
    try {
      const res = await axios.post(`${API}/subtitles/upload`, formData, {
        headers: { 
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data"
        }
      });
      
      toast.success(`${res.data.cue_count} subtitles imported!`);
      
      // Load the imported subtitles
      await loadExistingSubtitles(language);
      setActiveTab("editor");
      
      if (onSave) onSave();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Failed to upload subtitles");
    }
    setUploading(false);
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Create from plain text
  const handleCreateFromText = async () => {
    if (!plainText.trim()) {
      toast.error("Please enter some text");
      return;
    }

    setSaving(true);
    try {
      const res = await axios.post(`${API}/subtitles/from-text`, {
        episode_id: episodeId,
        language,
        text: plainText,
        duration_per_line: 3.0
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      toast.success(`${res.data.cue_count} subtitles created!`);
      await loadExistingSubtitles(language);
      setActiveTab("editor");
      setPlainText("");
      
      if (onSave) onSave();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Failed to create subtitles");
    }
    setSaving(false);
  };

  // Save from editor
  const handleSaveFromEditor = async () => {
    if (cues.length === 0) {
      toast.error("No subtitles to save");
      return;
    }

    setSaving(true);
    try {
      const formattedCues = cues.map(cue => ({
        start_time: formatTime(cue.start),
        end_time: formatTime(cue.end),
        text: cue.text
      }));

      await axios.post(`${API}/subtitles/editor`, {
        episode_id: episodeId,
        language,
        cues: formattedCues
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      toast.success("Subtitles saved!");
      if (onSave) onSave();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Failed to save subtitles");
    }
    setSaving(false);
  };

  // Add new cue
  const addCue = () => {
    const lastCue = cues[cues.length - 1];
    const start = lastCue ? lastCue.end + 0.2 : currentTime;
    
    setCues([...cues, {
      id: Date.now(),
      start,
      end: start + 3,
      text: ""
    }]);
  };

  // Update cue
  const updateCue = (id, field, value) => {
    setCues(cues.map(cue => {
      if (cue.id === id) {
        return { ...cue, [field]: value };
      }
      return cue;
    }));
  };

  // Delete cue
  const deleteCue = (id) => {
    setCues(cues.filter(cue => cue.id !== id));
  };

  // Set cue timing from video
  const setStartFromVideo = (id) => {
    updateCue(id, "start", currentTime);
  };

  const setEndFromVideo = (id) => {
    updateCue(id, "end", currentTime);
  };

  // Video controls
  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  return (
    <div className="space-y-4">
      {/* Language Selector */}
      <div className="flex items-center gap-4 mb-4">
        <label className="text-sm font-medium flex items-center gap-2">
          <Languages className="w-4 h-4" />
          Language:
        </label>
        <select
          className="bg-background border rounded-md px-3 py-2 text-sm"
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
        >
          {LANGUAGES.map(lang => (
            <option key={lang.code} value={lang.code}>
              {lang.flag} {lang.name}
            </option>
          ))}
        </select>
        {existingSubtitles[language] && (
          <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded-full flex items-center gap-1">
            <Check className="w-3 h-3" />
            Has subtitles
          </span>
        )}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="upload">
            <Upload className="w-4 h-4 mr-2" />
            Upload File
          </TabsTrigger>
          <TabsTrigger value="text">
            <FileText className="w-4 h-4 mr-2" />
            From Text
          </TabsTrigger>
          <TabsTrigger value="editor">
            <Edit className="w-4 h-4 mr-2" />
            Editor
          </TabsTrigger>
        </TabsList>

        {/* Upload Tab */}
        <TabsContent value="upload" className="space-y-4">
          <Card className="p-6 border-dashed border-2 text-center">
            <input
              ref={fileInputRef}
              type="file"
              accept=".vtt,.srt,.txt,.docx"
              onChange={handleFileUpload}
              className="hidden"
              id="subtitle-upload"
            />
            <label 
              htmlFor="subtitle-upload"
              className="cursor-pointer block"
            >
              <FileUp className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="font-semibold mb-2">Upload Subtitle File</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Supports: Word (.docx), Text (.txt), SRT (.srt), VTT (.vtt)
              </p>
              <Button disabled={uploading}>
                {uploading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Upload className="w-4 h-4 mr-2" />
                )}
                {uploading ? "Uploading..." : "Choose File"}
              </Button>
            </label>
          </Card>

          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
            <h4 className="font-medium mb-2 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-blue-400" />
              Supported Formats
            </h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li><strong>Word (.docx)</strong> - Plain dialogue, auto-timed OR with timestamps</li>
              <li><strong>Text (.txt)</strong> - One line per subtitle, with or without timestamps</li>
              <li><strong>SRT (.srt)</strong> - Standard subtitle format</li>
              <li><strong>VTT (.vtt)</strong> - WebVTT format (used by web players)</li>
            </ul>
            <div className="mt-3 p-3 bg-white/5 rounded-md">
              <p className="text-xs text-muted-foreground mb-2">Example text format with timestamps:</p>
              <code className="text-xs text-green-400">
                [0:00] Hello, welcome to our show<br/>
                [0:03] Today we're going to...<br/>
                [0:07] Let's get started!
              </code>
            </div>
          </div>
        </TabsContent>

        {/* From Text Tab */}
        <TabsContent value="text" className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Enter Dialogue</label>
            <p className="text-xs text-muted-foreground">
              Enter one subtitle per line. Timing will be generated automatically.
            </p>
            <textarea
              className="w-full h-64 bg-background border rounded-md p-3 text-sm font-mono"
              placeholder="Hello, welcome to the show.&#10;Today we're exploring...&#10;Let's get started!&#10;&#10;(Each line becomes a subtitle with auto-timing)"
              value={plainText}
              onChange={(e) => setPlainText(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setPlainText("")}>
              Clear
            </Button>
            <Button onClick={handleCreateFromText} disabled={saving}>
              {saving ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Check className="w-4 h-4 mr-2" />
              )}
              Create Subtitles
            </Button>
          </div>
        </TabsContent>

        {/* Editor Tab */}
        <TabsContent value="editor" className="space-y-4">
          {/* Mini Video Preview */}
          {videoUrl && (
            <Card className="p-4">
              <div className="flex gap-4">
                <div className="w-48 aspect-video bg-black rounded-lg overflow-hidden relative">
                  <video
                    ref={videoRef}
                    src={videoUrl}
                    className="w-full h-full object-contain"
                    onTimeUpdate={handleTimeUpdate}
                    onPlay={() => setIsPlaying(true)}
                    onPause={() => setIsPlaying(false)}
                  />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Button variant="outline" size="sm" onClick={togglePlay}>
                      {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    </Button>
                    <span className="font-mono text-lg">{formatTime(currentTime)}</span>
                    <span className="text-muted-foreground">/ {formatTime(videoDuration)}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Play the video and use "Set Start/End" buttons to capture timing
                  </p>
                </div>
              </div>
            </Card>
          )}

          {/* Subtitle List */}
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {cues.map((cue, index) => (
              <Card 
                key={cue.id} 
                className={`p-3 ${selectedCue === cue.id ? 'ring-2 ring-purple-500' : ''}`}
                onClick={() => setSelectedCue(cue.id)}
              >
                <div className="flex items-start gap-3">
                  <span className="text-xs bg-white/10 px-2 py-1 rounded">#{index + 1}</span>
                  
                  <div className="flex-1 space-y-2">
                    {/* Timing */}
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="w-3 h-3 text-muted-foreground" />
                      <Input
                        type="text"
                        value={formatTime(cue.start)}
                        onChange={(e) => updateCue(cue.id, "start", parseTimeToSeconds(e.target.value))}
                        className="w-28 h-7 text-xs font-mono"
                      />
                      <span className="text-muted-foreground">→</span>
                      <Input
                        type="text"
                        value={formatTime(cue.end)}
                        onChange={(e) => updateCue(cue.id, "end", parseTimeToSeconds(e.target.value))}
                        className="w-28 h-7 text-xs font-mono"
                      />
                      {videoUrl && (
                        <>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-7 text-xs"
                            onClick={() => setStartFromVideo(cue.id)}
                          >
                            Set Start
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-7 text-xs"
                            onClick={() => setEndFromVideo(cue.id)}
                          >
                            Set End
                          </Button>
                        </>
                      )}
                    </div>
                    
                    {/* Text */}
                    <Input
                      value={cue.text}
                      onChange={(e) => updateCue(cue.id, "text", e.target.value)}
                      placeholder="Enter subtitle text..."
                      className="text-sm"
                    />
                  </div>
                  
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="text-red-400 h-8 w-8"
                    onClick={() => deleteCue(cue.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </Card>
            ))}

            {cues.length === 0 && (
              <Card className="p-8 text-center">
                <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">No subtitles yet</p>
                <p className="text-sm text-muted-foreground mb-4">
                  Upload a file, paste text, or add manually
                </p>
              </Card>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-between">
            <Button variant="outline" onClick={addCue}>
              <Plus className="w-4 h-4 mr-2" />
              Add Subtitle
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button onClick={handleSaveFromEditor} disabled={saving || cues.length === 0}>
                {saving ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                Save Subtitles
              </Button>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

/**
 * SubtitleManager - Wrapper component for managing all subtitles
 */
export const SubtitleManager = ({ episodeId, episodeTitle, token, onUpdate }) => {
  const [showEditor, setShowEditor] = useState(false);
  const [subtitles, setSubtitles] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSubtitles();
  }, [episodeId]);

  const loadSubtitles = async () => {
    try {
      const res = await axios.get(`${API}/subtitles/${episodeId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const subMap = {};
      res.data.subtitles?.forEach(sub => {
        subMap[sub.language] = sub;
      });
      setSubtitles(subMap);
    } catch (e) {
      console.error("Failed to load subtitles:", e);
    }
    setLoading(false);
  };

  const handleDelete = async (language) => {
    if (!confirm(`Delete ${LANGUAGES.find(l => l.code === language)?.name} subtitles?`)) return;
    
    try {
      await axios.delete(`${API}/subtitles/${episodeId}/${language}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("Subtitles deleted");
      loadSubtitles();
      if (onUpdate) onUpdate();
    } catch (e) {
      toast.error("Failed to delete subtitles");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-semibold flex items-center gap-2">
          <Languages className="w-4 h-4" />
          Subtitles
        </h3>
        <Button size="sm" onClick={() => setShowEditor(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Subtitles
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      ) : Object.keys(subtitles).length > 0 ? (
        <div className="grid gap-2">
          {LANGUAGES.filter(l => subtitles[l.code]).map(lang => (
            <div 
              key={lang.code}
              className="flex items-center justify-between p-3 bg-white/5 rounded-lg"
            >
              <div className="flex items-center gap-3">
                <span className="text-xl">{lang.flag}</span>
                <div>
                  <p className="font-medium">{lang.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {subtitles[lang.code]?.cue_count || 0} cues
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => setShowEditor(true)}>
                  <Edit className="w-4 h-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-red-400"
                  onClick={() => handleDelete(lang.code)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <Card className="p-6 text-center">
          <Languages className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
          <p className="text-muted-foreground">No subtitles added yet</p>
          <Button variant="link" onClick={() => setShowEditor(true)}>
            Add subtitles
          </Button>
        </Card>
      )}

      {/* Editor Dialog */}
      <Dialog open={showEditor} onOpenChange={setShowEditor}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Subtitle Editor</DialogTitle>
            <DialogDescription>
              Add subtitles for "{episodeTitle}"
            </DialogDescription>
          </DialogHeader>
          <SubtitleEditor
            episodeId={episodeId}
            episodeTitle={episodeTitle}
            existingSubtitles={subtitles}
            token={token}
            onSave={() => {
              loadSubtitles();
              if (onUpdate) onUpdate();
            }}
            onClose={() => setShowEditor(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SubtitleEditor;
