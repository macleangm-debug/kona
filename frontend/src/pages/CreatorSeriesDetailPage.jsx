import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import { 
  ChevronLeft, Clock, Film, Eye, Coins, Loader2, 
  Play, Edit, Plus, FileVideo, Upload, Trash2, 
  Languages, CheckCircle, AlertCircle, Image, Link, Video, XCircle, X,
  ChevronDown, ChevronRight, FolderPlus, Layers, GripVertical, Move, Send, Globe
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { API } from "@/config";
import { toast } from "sonner";

// DnD Kit imports
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// Supported subtitle languages
const SUBTITLE_LANGUAGES = [
  { code: "en", name: "English" },
  { code: "sw", name: "Swahili" },
  { code: "fr", name: "French" }
];

// ============ UPLOAD PROGRESS PANEL COMPONENT ============
const UploadProgressPanel = ({ uploads, onDismiss }) => {
  if (!uploads || uploads.length === 0) return null;
  
  const activeUploads = uploads.filter(u => !u.dismissed);
  if (activeUploads.length === 0) return null;
  
  const completedCount = activeUploads.filter(u => u.status === 'ready' || u.status === 'encoding').length;
  const failedCount = activeUploads.filter(u => u.status === 'failed').length;
  const uploadingCount = activeUploads.filter(u => u.status === 'uploading').length;
  
  return (
    <div className="fixed bottom-4 right-4 z-50 w-80 max-h-96 overflow-hidden rounded-xl bg-card/95 backdrop-blur-sm border border-white/10 shadow-2xl" data-testid="upload-progress-panel">
      {/* Header */}
      <div className="p-3 border-b border-white/10 bg-gradient-to-r from-primary/20 to-purple-500/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Upload className="w-4 h-4 text-primary" />
            <span className="font-medium text-sm">Upload Progress</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            {uploadingCount > 0 && (
              <span className="text-yellow-400">{uploadingCount} uploading</span>
            )}
            {completedCount > 0 && (
              <span className="text-green-400">{completedCount} done</span>
            )}
            {failedCount > 0 && (
              <span className="text-red-400">{failedCount} failed</span>
            )}
          </div>
        </div>
      </div>
      
      {/* Upload Items */}
      <div className="max-h-72 overflow-y-auto p-2 space-y-2">
        {activeUploads.map((upload) => (
          <div 
            key={upload.id} 
            className={`p-2 rounded-lg border transition-all ${
              upload.status === 'ready' || upload.status === 'encoding' 
                ? 'bg-green-500/10 border-green-500/30' 
                : upload.status === 'failed' 
                  ? 'bg-red-500/10 border-red-500/30'
                  : 'bg-white/5 border-white/10'
            }`}
          >
            <div className="flex items-start gap-2">
              {/* Thumbnail Preview */}
              <div className="w-12 h-12 rounded bg-secondary/50 flex items-center justify-center flex-shrink-0 overflow-hidden">
                {upload.thumbnail ? (
                  <img src={upload.thumbnail} alt="" className="w-full h-full object-cover" />
                ) : upload.status === 'ready' || upload.status === 'encoding' ? (
                  <CheckCircle className="w-5 h-5 text-green-400" />
                ) : upload.status === 'uploading' ? (
                  <Loader2 className="w-5 h-5 animate-spin text-primary" />
                ) : upload.status === 'failed' ? (
                  <XCircle className="w-5 h-5 text-red-400" />
                ) : (
                  <Video className="w-5 h-5 text-muted-foreground" />
                )}
              </div>
              
              {/* Details */}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">{upload.title}</p>
                <p className="text-[10px] text-muted-foreground">{upload.episodeCode}</p>
                
                {/* Progress Bar */}
                {upload.status === 'uploading' && (
                  <div className="mt-1">
                    <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary transition-all duration-300"
                        style={{ width: `${upload.progress}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{upload.progress}%</p>
                  </div>
                )}
                
                {upload.status === 'encoding' && (
                  <p className="text-[10px] text-yellow-400 mt-1 flex items-center gap-1">
                    <Loader2 className="w-3 h-3 animate-spin" /> Processing on CDN...
                  </p>
                )}
                
                {upload.status === 'ready' && (
                  <p className="text-[10px] text-green-400 mt-1">Ready to stream</p>
                )}
                
                {upload.status === 'failed' && (
                  <p className="text-[10px] text-red-400 mt-1">{upload.error || 'Upload failed'}</p>
                )}
              </div>
              
              {/* Dismiss button */}
              {(upload.status === 'ready' || upload.status === 'failed') && (
                <button 
                  onClick={() => onDismiss(upload.id)}
                  className="p-1 hover:bg-white/10 rounded"
                >
                  <X className="w-3 h-3 text-muted-foreground" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
      
      {/* Clear All Button */}
      {completedCount + failedCount === activeUploads.length && activeUploads.length > 0 && (
        <div className="p-2 border-t border-white/10">
          <Button 
            size="sm" 
            variant="ghost" 
            className="w-full text-xs"
            onClick={() => activeUploads.forEach(u => onDismiss(u.id))}
          >
            Clear All
          </Button>
        </div>
      )}
    </div>
  );
};

// ============ DRAGGABLE EPISODE CARD ============
const DraggableEpisodeCard = ({ ep, seasonNum, onEditEpisode, isDragging, isSelected, onToggleSelect, selectionMode }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: ep.id });
  
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };
  
  return (
    <Card 
      ref={setNodeRef}
      style={style}
      className={`p-3 hover:bg-white/5 transition-colors cursor-pointer group border-white/5 ${isDragging ? 'ring-2 ring-primary' : ''} ${isSelected ? 'ring-2 ring-green-500 bg-green-500/10' : ''}`}
      data-testid={`episode-${ep.id}`}
    >
      <div className="flex gap-3">
        {/* Selection Checkbox (when in selection mode) */}
        {selectionMode ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleSelect(ep.id);
            }}
            className={`flex items-center justify-center w-6 self-stretch rounded transition-colors ${isSelected ? 'bg-green-500' : 'bg-white/10 hover:bg-white/20'}`}
          >
            {isSelected ? (
              <CheckCircle className="w-4 h-4 text-white" />
            ) : (
              <div className="w-4 h-4 border-2 border-white/40 rounded" />
            )}
          </button>
        ) : (
          /* Drag Handle */
          <button
            {...attributes}
            {...listeners}
            className="flex items-center justify-center w-6 self-stretch cursor-grab active:cursor-grabbing hover:bg-white/10 rounded transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            <GripVertical className="w-4 h-4 text-muted-foreground" />
          </button>
        )}
        
        {/* Thumbnail */}
        <div 
          className="w-16 h-16 rounded-lg bg-secondary/50 flex items-center justify-center flex-shrink-0 overflow-hidden relative cursor-pointer"
          onClick={() => selectionMode ? onToggleSelect(ep.id) : onEditEpisode(ep)}
        >
          {ep.thumbnail ? (
            <img src={ep.thumbnail} alt={ep.title} className="w-full h-full object-cover" />
          ) : (
            <Play className="w-6 h-6 text-muted-foreground" />
          )}
          {ep.encoding_status === 'encoding' && (
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
              <Loader2 className="w-5 h-5 animate-spin text-yellow-400" />
            </div>
          )}
        </div>
        
        {/* Details */}
        <div className="flex-1 min-w-0 cursor-pointer" onClick={() => selectionMode ? onToggleSelect(ep.id) : onEditEpisode(ep)}>
          <div className="flex flex-wrap items-center gap-1.5 mb-1">
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
              {ep.episode_code || `S${String(seasonNum).padStart(2, '0')}E${String(ep.episode_number).padStart(2, '0')}`}
            </Badge>
            {ep.is_free && (
              <Badge className="text-[10px] px-1.5 py-0 bg-green-500/20 text-green-400 border-0">FREE</Badge>
            )}
            {ep.season_number === 1 && ep.episode_number === 1 && (
              <Badge className="text-[10px] px-1.5 py-0 bg-purple-500/20 text-purple-400 border-0">STORIES</Badge>
            )}
            {ep.encoding_status === 'encoding' && (
              <Badge className="text-[10px] px-1.5 py-0 bg-yellow-500/20 text-yellow-400 border-0">PROCESSING</Badge>
            )}
          </div>
          <h4 className="font-medium text-sm line-clamp-1">{ep.title}</h4>
          <div className="flex gap-3 text-xs text-muted-foreground mt-1">
            <span className="flex items-center gap-1">
              <Eye className="w-3 h-3" /> {ep.views || 0}
            </span>
            <span className="flex items-center gap-1">
              <Coins className="w-3 h-3" /> {ep.earnings || 0}
            </span>
            {!ep.is_free && (
              <span>{ep.coins_required} coins</span>
            )}
          </div>
        </div>
        
        {/* Edit Button (hidden in selection mode) */}
        {!selectionMode && (
          <button 
            className="p-2 hover:bg-secondary rounded-lg opacity-0 group-hover:opacity-100 transition-opacity self-center"
            onClick={(e) => {
              e.stopPropagation();
              onEditEpisode(ep);
            }}
          >
            <Edit className="w-4 h-4 text-muted-foreground" />
          </button>
        )}
      </div>
    </Card>
  );
};

// ============ DROPPABLE SEASON COMPONENT ============
const DroppableSeason = ({ 
  seasonNum, 
  season, 
  episodes, 
  isExpanded, 
  onToggleSeason, 
  onAddEpisode, 
  onEditEpisode,
  activeId,
  selectionMode,
  selectedEpisodes,
  onToggleSelect
}) => {
  const episodeIds = episodes.map(ep => ep.id);
  
  return (
    <div 
      className="rounded-xl border border-white/10 overflow-hidden bg-card/50"
      data-testid={`season-${seasonNum}`}
    >
      {/* Season Header */}
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onToggleSeason(seasonNum);
        }}
        className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition-colors cursor-pointer text-left"
        data-testid={`season-header-${seasonNum}`}
      >
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${isExpanded ? 'bg-primary/20' : 'bg-white/5'}`}>
            <Layers className={`w-4 h-4 ${isExpanded ? 'text-primary' : 'text-muted-foreground'}`} />
          </div>
          <div className="text-left">
            <h3 className="font-heading font-semibold">{season.title || `Season ${seasonNum}`}</h3>
            <p className="text-xs text-muted-foreground">
              {episodes.length} episode{episodes.length !== 1 ? 's' : ''}
              {episodes.length > 0 && (
                <span className="ml-2">
                  • {episodes.reduce((sum, ep) => sum + (ep.views || 0), 0)} views
                </span>
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div
            role="button"
            tabIndex={0}
            className="h-8 px-2 flex items-center justify-center rounded-md hover:bg-secondary transition-colors cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              onAddEpisode(seasonNum);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.stopPropagation();
                onAddEpisode(seasonNum);
              }
            }}
          >
            <Plus className="w-4 h-4" />
          </div>
          {isExpanded ? (
            <ChevronDown className="w-5 h-5 text-muted-foreground transition-transform duration-200" />
          ) : (
            <ChevronRight className="w-5 h-5 text-muted-foreground transition-transform duration-200" />
          )}
        </div>
      </button>
      
      {/* Season Episodes */}
      {isExpanded && (
        <div className="border-t border-white/10">
          {episodes.length === 0 ? (
            <div className="p-8 text-center">
              <Film className="w-10 h-10 mx-auto mb-3 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground mb-3">No episodes in this season yet</p>
              <Button size="sm" variant="outline" onClick={() => onAddEpisode(seasonNum)}>
                <Plus className="w-4 h-4 mr-1" /> Add Episode
              </Button>
            </div>
          ) : (
            <div className="p-3 space-y-2">
              <SortableContext items={episodeIds} strategy={verticalListSortingStrategy}>
                {episodes.map((ep) => (
                  <DraggableEpisodeCard
                    key={ep.id}
                    ep={ep}
                    seasonNum={seasonNum}
                    onEditEpisode={onEditEpisode}
                    isDragging={activeId === ep.id}
                    selectionMode={selectionMode}
                    isSelected={selectedEpisodes?.includes(ep.id)}
                    onToggleSelect={onToggleSelect}
                  />
                ))}
              </SortableContext>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ============ SEASON ACCORDION WITH DND ============
const SeasonAccordion = ({ 
  seasons, 
  episodes, 
  expandedSeasons, 
  onToggleSeason, 
  onEditEpisode,
  onAddSeason,
  onAddEpisode,
  onReorderEpisodes,
  onBulkEdit
}) => {
  const [activeId, setActiveId] = useState(null);
  const [localEpisodes, setLocalEpisodes] = useState(episodes);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedEpisodes, setSelectedEpisodes] = useState([]);
  
  // Sync local episodes with props
  useEffect(() => {
    setLocalEpisodes(episodes);
  }, [episodes]);
  
  // Toggle episode selection
  const toggleSelect = (episodeId) => {
    setSelectedEpisodes(prev => 
      prev.includes(episodeId) 
        ? prev.filter(id => id !== episodeId)
        : [...prev, episodeId]
    );
  };
  
  // Select all episodes
  const selectAll = () => {
    setSelectedEpisodes(localEpisodes.map(ep => ep.id));
  };
  
  // Clear selection
  const clearSelection = () => {
    setSelectedEpisodes([]);
    setSelectionMode(false);
  };
  
  // Toggle selection mode
  const toggleSelectionMode = () => {
    if (selectionMode) {
      clearSelection();
    } else {
      setSelectionMode(true);
    }
  };
  
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px of movement required before drag starts
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );
  
  // Group episodes by season
  const episodesBySeason = {};
  localEpisodes.forEach(ep => {
    const seasonNum = ep.season_number || 1;
    if (!episodesBySeason[seasonNum]) {
      episodesBySeason[seasonNum] = [];
    }
    episodesBySeason[seasonNum].push(ep);
  });
  
  // Sort episodes within each season
  Object.keys(episodesBySeason).forEach(seasonNum => {
    episodesBySeason[seasonNum].sort((a, b) => a.episode_number - b.episode_number);
  });
  
  // Get all season numbers
  const allSeasonNumbers = [...new Set([
    ...seasons.map(s => s.season_number),
    ...Object.keys(episodesBySeason).map(Number)
  ])].sort((a, b) => a - b);
  
  if (allSeasonNumbers.length === 0) {
    allSeasonNumbers.push(1);
  }
  
  // Find which season an episode is in
  const findEpisodeSeason = (episodeId) => {
    for (const [seasonNum, eps] of Object.entries(episodesBySeason)) {
      if (eps.find(ep => ep.id === episodeId)) {
        return Number(seasonNum);
      }
    }
    return null;
  };
  
  const handleDragStart = (event) => {
    setActiveId(event.active.id);
  };
  
  const handleDragOver = (event) => {
    const { active, over } = event;
    if (!over) return;
    
    const activeId = active.id;
    const overId = over.id;
    
    if (activeId === overId) return;
    
    const activeSeason = findEpisodeSeason(activeId);
    const overSeason = findEpisodeSeason(overId);
    
    if (!activeSeason || !overSeason) return;
    
    // Moving between seasons
    if (activeSeason !== overSeason) {
      setLocalEpisodes(prev => {
        const activeEp = prev.find(ep => ep.id === activeId);
        const overEp = prev.find(ep => ep.id === overId);
        
        if (!activeEp || !overEp) return prev;
        
        return prev.map(ep => {
          if (ep.id === activeId) {
            return { ...ep, season_number: overSeason };
          }
          return ep;
        });
      });
    }
  };
  
  const handleDragEnd = async (event) => {
    const { active, over } = event;
    setActiveId(null);
    
    if (!over || active.id === over.id) return;
    
    const activeSeason = findEpisodeSeason(active.id);
    if (!activeSeason) return;
    
    // Reorder within the same season
    const seasonEpisodes = episodesBySeason[activeSeason] || [];
    const oldIndex = seasonEpisodes.findIndex(ep => ep.id === active.id);
    const newIndex = seasonEpisodes.findIndex(ep => ep.id === over.id);
    
    if (oldIndex === -1 || newIndex === -1) return;
    
    const reorderedSeason = arrayMove(seasonEpisodes, oldIndex, newIndex);
    
    // Update local state immediately
    const updatedEpisodes = localEpisodes.map(ep => {
      const reorderedIdx = reorderedSeason.findIndex(r => r.id === ep.id);
      if (reorderedIdx !== -1) {
        return { 
          ...ep, 
          episode_number: reorderedIdx + 1,
          season_number: activeSeason
        };
      }
      return ep;
    });
    
    setLocalEpisodes(updatedEpisodes);
    
    // Call parent to save to backend
    if (onReorderEpisodes) {
      const reorderData = updatedEpisodes.map(ep => ({
        episode_id: ep.id,
        season_number: ep.season_number || 1,
        episode_number: ep.episode_number
      }));
      onReorderEpisodes(reorderData);
    }
  };
  
  const activeEpisode = activeId ? localEpisodes.find(ep => ep.id === activeId) : null;
  
  // Handle bulk edit action
  const handleBulkAction = (action, value) => {
    if (selectedEpisodes.length === 0) return;
    onBulkEdit(selectedEpisodes, action, value);
    clearSelection();
  };
  
  return (
    <div className="space-y-3" data-testid="season-accordion">
      {/* Action Bar */}
      <div className="flex items-center gap-2 p-3 rounded-lg bg-gradient-to-r from-primary/10 to-purple-500/10 border border-primary/20">
        {selectionMode ? (
          <>
            {/* Selection Mode Active */}
            <CheckCircle className="w-4 h-4 text-green-400" />
            <span className="text-xs font-medium text-green-400">
              {selectedEpisodes.length} selected
            </span>
            <div className="flex-1" />
            <Button size="sm" variant="ghost" onClick={selectAll} className="h-7 text-xs">
              Select All
            </Button>
            <Button size="sm" variant="ghost" onClick={clearSelection} className="h-7 text-xs text-red-400 hover:text-red-300">
              Cancel
            </Button>
          </>
        ) : (
          <>
            {/* Normal Mode */}
            <Move className="w-4 h-4 text-primary" />
            <p className="text-xs text-muted-foreground flex-1">
              <span className="text-foreground font-medium">Drag & drop</span> to reorder, or
            </p>
            <Button 
              size="sm" 
              variant="outline" 
              onClick={toggleSelectionMode}
              className="h-7 text-xs"
              data-testid="bulk-edit-btn"
            >
              <CheckCircle className="w-3 h-3 mr-1" />
              Bulk Edit
            </Button>
          </>
        )}
      </div>
      
      {/* Bulk Edit Actions Bar (when items selected) */}
      {selectionMode && selectedEpisodes.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 p-3 rounded-lg bg-green-500/10 border border-green-500/30" data-testid="bulk-actions-bar">
          <span className="text-xs text-green-400 font-medium mr-2">Bulk Actions:</span>
          
          {/* Move to Season */}
          <select
            className="h-7 px-2 text-xs rounded bg-secondary/50 border border-white/10"
            onChange={(e) => {
              if (e.target.value) {
                handleBulkAction('move_season', parseInt(e.target.value));
              }
            }}
            defaultValue=""
          >
            <option value="" disabled>Move to Season...</option>
            {allSeasonNumbers.map(num => (
              <option key={num} value={num}>Season {num}</option>
            ))}
            <option value={allSeasonNumbers.length + 1}>New Season {allSeasonNumbers.length + 1}</option>
          </select>
          
          {/* Set Free Status */}
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs bg-green-500/20 border-green-500/30 text-green-400 hover:bg-green-500/30"
            onClick={() => handleBulkAction('set_free', true)}
          >
            Make Free
          </Button>
          
          {/* Set Paid Status */}
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs"
            onClick={() => handleBulkAction('set_free', false)}
          >
            Make Paid
          </Button>
          
          {/* Set Coins */}
          <div className="flex items-center gap-1">
            <Coins className="w-3 h-3 text-yellow-400" />
            <input
              type="number"
              min={1}
              max={50}
              placeholder="5"
              className="w-12 h-7 px-2 text-xs rounded bg-secondary/50 border border-white/10"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleBulkAction('set_coins', parseInt(e.target.value) || 5);
                }
              }}
            />
            <span className="text-xs text-muted-foreground">coins (Enter)</span>
          </div>
        </div>
      )}
      
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        {allSeasonNumbers.map((seasonNum) => {
          const season = seasons.find(s => s.season_number === seasonNum) || {
            season_number: seasonNum,
            title: `Season ${seasonNum}`
          };
          const seasonEpisodes = episodesBySeason[seasonNum] || [];
          const isExpanded = expandedSeasons.includes(seasonNum);
          
          return (
            <DroppableSeason
              key={seasonNum}
              seasonNum={seasonNum}
              season={season}
              episodes={seasonEpisodes}
              isExpanded={isExpanded}
              onToggleSeason={onToggleSeason}
              onAddEpisode={onAddEpisode}
              onEditEpisode={onEditEpisode}
              activeId={activeId}
              selectionMode={selectionMode}
              selectedEpisodes={selectedEpisodes}
              onToggleSelect={toggleSelect}
            />
          );
        })}
        
        {/* Drag Overlay */}
        <DragOverlay>
          {activeEpisode ? (
            <Card className="p-3 bg-card border-primary shadow-lg shadow-primary/20">
              <div className="flex gap-3 items-center">
                <GripVertical className="w-4 h-4 text-primary" />
                <div className="w-12 h-12 rounded bg-secondary/50 flex items-center justify-center">
                  {activeEpisode.thumbnail ? (
                    <img src={activeEpisode.thumbnail} alt="" className="w-full h-full object-cover rounded" />
                  ) : (
                    <Play className="w-5 h-5 text-muted-foreground" />
                  )}
                </div>
                <div>
                  <Badge variant="outline" className="text-[10px] mb-1">
                    {activeEpisode.episode_code}
                  </Badge>
                  <p className="text-sm font-medium">{activeEpisode.title}</p>
                </div>
              </div>
            </Card>
          ) : null}
        </DragOverlay>
      </DndContext>
      
      {/* Add New Season Button */}
      <button
        onClick={onAddSeason}
        className="w-full p-4 rounded-xl border-2 border-dashed border-white/10 hover:border-primary/50 transition-colors flex items-center justify-center gap-2 text-muted-foreground hover:text-foreground"
        data-testid="add-season-btn"
      >
        <FolderPlus className="w-5 h-5" />
        <span>Add New Season</span>
      </button>
    </div>
  );
};

// ============ MAIN COMPONENT ============
export const CreatorSeriesDetailPage = () => {
  const navigate = useNavigate();
  const { id: seriesId } = useParams();
  const { token } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [series, setSeries] = useState(null);
  const [episodes, setEpisodes] = useState([]);
  const [seasons, setSeasons] = useState([]);
  const [expandedSeasons, setExpandedSeasons] = useState([1]); // Season 1 expanded by default
  
  // Upload progress tracking (persistent outside modal)
  const [uploadQueue, setUploadQueue] = useState([]);
  
  // Series editor state
  const [showSeriesEditor, setShowSeriesEditor] = useState(false);
  const [seriesForm, setSeriesForm] = useState({
    title: "",
    description: "",
    thumbnail_url: "",
    genre: ""
  });
  
  // Episode editor state
  const [showEpisodeEditor, setShowEpisodeEditor] = useState(false);
  const [selectedEpisode, setSelectedEpisode] = useState(null);
  const [episodeForm, setEpisodeForm] = useState({
    title: "",
    intro_duration: 30,
    is_free: false,
    coins_required: 5,
    thumbnail_url: "",
    video_url: ""
  });

  // Batch upload state
  const [showBatchUpload, setShowBatchUpload] = useState(false);
  const [batchEpisodes, setBatchEpisodes] = useState([]);
  const [batchUploading, setBatchUploading] = useState(false);
  const [selectedSeason, setSelectedSeason] = useState(1);
  
  // Season creator state
  const [showSeasonCreator, setShowSeasonCreator] = useState(false);
  const [newSeasonTitle, setNewSeasonTitle] = useState("");
  
  // Subtitle upload state
  const [subtitleUploading, setSubtitleUploading] = useState(false);
  const [episodeSubtitles, setEpisodeSubtitles] = useState({});
  const [selectedSubtitleLanguage, setSelectedSubtitleLanguage] = useState("en");
  const subtitleFileInputRef = useRef(null);
  
  // Video preview state
  const [showPreview, setShowPreview] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  
  // Video validation state
  const [videoValidation, setVideoValidation] = useState({
    isValidating: false,
    isVertical: null,
    dimensions: null,
    error: null
  });

  // Toggle season expansion
  const toggleSeason = (seasonNum) => {
    setExpandedSeasons(prev => 
      prev.includes(seasonNum) 
        ? prev.filter(s => s !== seasonNum)
        : [...prev, seasonNum]
    );
  };

  // Dismiss upload from progress panel
  const dismissUpload = (uploadId) => {
    setUploadQueue(prev => prev.map(u => 
      u.id === uploadId ? { ...u, dismissed: true } : u
    ));
  };

  // Reorder episodes (drag & drop)
  const handleReorderEpisodes = async (reorderData) => {
    try {
      await axios.post(
        `${API}/creator/series/${seriesId}/reorder-episodes`,
        { episodes: reorderData },
        { headers: { Authorization: `Bearer ${token}` }}
      );
      toast.success("Episodes reordered successfully!");
      fetchSeriesDetail(); // Refresh to get updated episode codes
    } catch (e) {
      console.error("Failed to reorder episodes:", e);
      toast.error("Failed to save episode order");
      fetchSeriesDetail(); // Refresh to reset to server state
    }
  };

  // Bulk edit episodes
  const handleBulkEdit = async (episodeIds, action, value) => {
    try {
      const res = await axios.post(
        `${API}/creator/series/${seriesId}/bulk-edit-episodes`,
        { episode_ids: episodeIds, action, value },
        { headers: { Authorization: `Bearer ${token}` }}
      );
      toast.success(res.data.message);
      fetchSeriesDetail(); // Refresh to get updated episodes
    } catch (e) {
      console.error("Failed to bulk edit episodes:", e);
      toast.error(e.response?.data?.detail || "Failed to update episodes");
    }
  };

  // Publish series to make it visible to viewers
  const [publishing, setPublishing] = useState(false);
  
  const handlePublishSeries = async () => {
    if (episodes.length === 0) {
      toast.error("Add at least 1 episode before publishing");
      return;
    }
    
    setPublishing(true);
    try {
      const res = await axios.post(
        `${API}/creator/series/${seriesId}/publish`,
        {},
        { headers: { Authorization: `Bearer ${token}` }}
      );
      toast.success(res.data.message);
      fetchSeriesDetail(); // Refresh to get updated status
    } catch (e) {
      console.error("Failed to publish series:", e);
      toast.error(e.response?.data?.detail || "Failed to publish series");
    } finally {
      setPublishing(false);
    }
  };

  // Generate video thumbnail from file
  const generateThumbnail = (file) => {
    return new Promise((resolve) => {
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.muted = true;
      
      video.onloadeddata = () => {
        video.currentTime = 1; // Seek to 1 second
      };
      
      video.onseeked = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 160;
        canvas.height = 90;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const thumbnail = canvas.toDataURL('image/jpeg', 0.5);
        window.URL.revokeObjectURL(video.src);
        resolve(thumbnail);
      };
      
      video.onerror = () => {
        resolve(null);
      };
      
      video.src = URL.createObjectURL(file);
    });
  };

  const fetchSeriesDetail = async () => {
    if (!seriesId) {
      setLoading(false);
      return;
    }
    
    if (!token) {
      toast.error("Please login to access creator dashboard");
      navigate("/");
      return;
    }
    
    try {
      const res = await axios.get(`${API}/creator/series/${seriesId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSeries(res.data);
      setEpisodes(res.data.episodes || []);
      
      // Fetch seasons
      try {
        const seasonsRes = await axios.get(`${API}/creator/series/${seriesId}/seasons`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setSeasons(seasonsRes.data || []);
      } catch (e) {
        console.error("Failed to fetch seasons:", e);
      }
    } catch (e) {
      console.error("Failed to fetch series:", e);
      toast.error("Failed to load series details");
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchSeriesDetail();
  }, [token, seriesId]);

  // Poll for encoding status updates
  useEffect(() => {
    const encodingUploads = uploadQueue.filter(u => u.status === 'encoding' && !u.dismissed);
    if (encodingUploads.length === 0) return;
    
    const interval = setInterval(async () => {
      for (const upload of encodingUploads) {
        try {
          const res = await axios.get(`${API}/creator/episodes/${upload.episodeId}/status`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          
          if (res.data.status === 'ready') {
            setUploadQueue(prev => prev.map(u => 
              u.id === upload.id ? { ...u, status: 'ready', thumbnail: res.data.thumbnail } : u
            ));
            fetchSeriesDetail(); // Refresh episode list
          }
        } catch (e) {
          console.error("Failed to check status:", e);
        }
      }
    }, 5000);
    
    return () => clearInterval(interval);
  }, [uploadQueue, token]);

  const openSeriesEditor = () => {
    if (series) {
      setSeriesForm({
        title: series.title || "",
        description: series.description || "",
        thumbnail_url: series.thumbnail || "",
        genre: series.genre || ""
      });
      setShowSeriesEditor(true);
    }
  };

  const handleUpdateSeries = async () => {
    if (!series) return;
    
    try {
      const params = new URLSearchParams();
      if (seriesForm.title) params.append("title", seriesForm.title);
      if (seriesForm.description) params.append("description", seriesForm.description);
      if (seriesForm.thumbnail_url) params.append("thumbnail_url", seriesForm.thumbnail_url);
      if (seriesForm.genre) params.append("genre", seriesForm.genre);
      
      await axios.patch(`${API}/creator/series/${seriesId}?${params.toString()}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast.success("Series updated!");
      setShowSeriesEditor(false);
      fetchSeriesDetail();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Failed to update series");
    }
  };

  const openEpisodeEditor = async (episode) => {
    setSelectedEpisode(episode);
    setEpisodeForm({
      title: episode.title || "",
      intro_duration: episode.intro_duration || 30,
      is_free: episode.is_free || false,
      coins_required: episode.coins_required || 5,
      thumbnail_url: episode.thumbnail || "",
      video_url: episode.video_url || ""
    });
    setEpisodeSubtitles(episode.subtitles || {});
    setSelectedSubtitleLanguage("en");
    setShowEpisodeEditor(true);
    
    try {
      const res = await axios.get(
        `${API}/creator/episodes/${episode.id}/subtitles`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setEpisodeSubtitles(res.data.subtitles || {});
    } catch (e) {
      console.error("Failed to fetch subtitles:", e);
    }
  };
  
  // Preview episode video
  const handlePreviewEpisode = async (episode) => {
    if (!episode?.id) return;
    
    setPreviewLoading(true);
    setShowPreview(true);
    
    try {
      const res = await axios.get(
        `${API}/creator/episodes/${episode.id}/preview`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setPreviewData(res.data);
    } catch (e) {
      toast.error(e.response?.data?.detail || "Failed to load preview");
      setPreviewData(null);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleUpdateEpisode = async () => {
    if (!selectedEpisode) return;
    
    try {
      const params = new URLSearchParams();
      if (episodeForm.title) params.append("title", episodeForm.title);
      params.append("intro_duration", episodeForm.intro_duration);
      params.append("is_free", episodeForm.is_free);
      if (!episodeForm.is_free) params.append("coins_required", episodeForm.coins_required);
      if (episodeForm.thumbnail_url) params.append("thumbnail_url", episodeForm.thumbnail_url);
      
      await axios.patch(`${API}/creator/episodes/${selectedEpisode.id}?${params.toString()}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast.success("Episode updated!");
      setShowEpisodeEditor(false);
      setSelectedEpisode(null);
      setVideoValidation({ isValidating: false, isVertical: null, dimensions: null, error: null });
      fetchSeriesDetail();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Failed to update episode");
    }
  };

  // Handle subtitle file upload
  const handleSubtitleUpload = async (file) => {
    if (!selectedEpisode || !file) return;
    
    if (!file.name.endsWith('.vtt')) {
      toast.error("Please upload a .vtt file");
      return;
    }
    
    setSubtitleUploading(true);
    
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const content = e.target.result;
        const base64Content = btoa(unescape(encodeURIComponent(content)));
        const subtitleDataUrl = `data:text/vtt;base64,${base64Content}`;
        
        try {
          await axios.post(
            `${API}/creator/episodes/${selectedEpisode.id}/subtitles`,
            { 
              episode_id: selectedEpisode.id,
              language: selectedSubtitleLanguage,
              subtitle_url: subtitleDataUrl
            },
            { headers: { Authorization: `Bearer ${token}` }}
          );
          
          setEpisodeSubtitles(prev => ({...prev, [selectedSubtitleLanguage]: subtitleDataUrl}));
          toast.success(`${SUBTITLE_LANGUAGES.find(l => l.code === selectedSubtitleLanguage)?.name || selectedSubtitleLanguage.toUpperCase()} subtitles uploaded!`);
        } catch (err) {
          toast.error(err.response?.data?.detail || "Failed to save subtitles");
        }
        setSubtitleUploading(false);
      };
      reader.onerror = () => {
        toast.error("Failed to read subtitle file");
        setSubtitleUploading(false);
      };
      reader.readAsText(file);
    } catch (e) {
      toast.error("Failed to process subtitle file");
      setSubtitleUploading(false);
    }
    
    if (subtitleFileInputRef.current) {
      subtitleFileInputRef.current.value = "";
    }
  };

  const handleRemoveSubtitle = async (language) => {
    if (!selectedEpisode) return;
    
    try {
      await axios.delete(
        `${API}/creator/episodes/${selectedEpisode.id}/subtitles/${language}`,
        { headers: { Authorization: `Bearer ${token}` }}
      );
      
      setEpisodeSubtitles(prev => {
        const updated = {...prev};
        delete updated[language];
        return updated;
      });
      toast.success(`${SUBTITLE_LANGUAGES.find(l => l.code === language)?.name || language.toUpperCase()} subtitles removed`);
    } catch (e) {
      toast.error("Failed to remove subtitles");
    }
  };

  // ============ BATCH UPLOAD HANDLERS ============
  
  const handleBatchFileSelect = async (e) => {
    const files = Array.from(e.target.files || []);
    const videoFiles = files.filter(f => f.type.startsWith('video/'));
    
    if (videoFiles.length === 0) {
      toast.error("Please select video files");
      return;
    }
    
    // Get current episode count for this season
    const seasonEpisodes = episodes.filter(ep => ep.season_number === selectedSeason);
    
    const newEpisodes = await Promise.all(videoFiles.map(async (file, index) => {
      const thumbnail = await generateThumbnail(file);
      return {
        id: `batch-${Date.now()}-${index}`,
        file,
        thumbnail,
        title: file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " "),
        season_number: selectedSeason,
        episode_number: seasonEpisodes.length + index + 1,
        is_free: seasonEpisodes.length + index === 0 && selectedSeason === 1, // S01E01 is free
        coins_required: 5,
        intro_duration: 30,
        uploading: false,
        progress: 0,
        uploaded: false,
        error: null
      };
    }));
    
    setBatchEpisodes(prev => [...prev, ...newEpisodes]);
  };

  const removeBatchEpisode = (id) => {
    setBatchEpisodes(prev => prev.filter(ep => ep.id !== id));
  };

  const updateBatchEpisode = (id, field, value) => {
    setBatchEpisodes(prev => prev.map(ep => 
      ep.id === id ? { ...ep, [field]: value } : ep
    ));
  };

  const uploadBatchEpisodes = async () => {
    if (batchEpisodes.length === 0) return;
    
    setBatchUploading(true);
    let successCount = 0;
    
    for (let i = 0; i < batchEpisodes.length; i++) {
      const ep = batchEpisodes[i];
      if (ep.uploaded) continue;
      
      const uploadId = `upload-${Date.now()}-${i}`;
      
      try {
        // Update progress in batch list
        setBatchEpisodes(prev => prev.map(e => 
          e.id === ep.id ? { ...e, uploading: true, progress: 10 } : e
        ));
        
        // Add to upload queue for progress panel
        setUploadQueue(prev => [...prev, {
          id: uploadId,
          title: ep.title,
          episodeCode: `S${String(ep.season_number).padStart(2, '0')}E${String(ep.episode_number).padStart(2, '0')}`,
          thumbnail: ep.thumbnail,
          status: 'uploading',
          progress: 10,
          dismissed: false
        }]);
        
        // Create episode
        const episodeData = {
          title: ep.title,
          season_number: ep.season_number,
          episode_number: ep.episode_number,
          is_free: ep.is_free,
          coins_required: ep.coins_required,
          intro_duration: ep.intro_duration
        };
        
        const createRes = await axios.post(
          `${API}/creator/series/${seriesId}/episodes`,
          episodeData,
          { headers: { Authorization: `Bearer ${token}` }}
        );
        
        const episodeId = createRes.data.episode?.id || createRes.data.episode_id;
        
        setBatchEpisodes(prev => prev.map(e => 
          e.id === ep.id ? { ...e, progress: 30 } : e
        ));
        setUploadQueue(prev => prev.map(u => 
          u.id === uploadId ? { ...u, progress: 30, episodeId } : u
        ));
        
        // Upload video file to Bunny.net
        const formData = new FormData();
        formData.append('video', ep.file);
        
        await axios.post(
          `${API}/creator/episodes/${episodeId}/upload`,
          formData,
          { 
            headers: { 
              Authorization: `Bearer ${token}`,
              'Content-Type': 'multipart/form-data'
            },
            onUploadProgress: (progressEvent) => {
              const progress = 30 + Math.round((progressEvent.loaded / progressEvent.total) * 60);
              setBatchEpisodes(prev => prev.map(e => 
                e.id === ep.id ? { ...e, progress } : e
              ));
              setUploadQueue(prev => prev.map(u => 
                u.id === uploadId ? { ...u, progress } : u
              ));
            }
          }
        );
        
        // Mark as encoding (video is processing on Bunny CDN)
        setBatchEpisodes(prev => prev.map(e => 
          e.id === ep.id ? { ...e, uploading: false, progress: 100, uploaded: true } : e
        ));
        setUploadQueue(prev => prev.map(u => 
          u.id === uploadId ? { ...u, status: 'encoding', progress: 100 } : u
        ));
        
        successCount++;
        
      } catch (err) {
        console.error(`Failed to upload episode: ${ep.title}`, err);
        const errorMsg = err.response?.data?.detail || "Upload failed";
        
        setBatchEpisodes(prev => prev.map(e => 
          e.id === ep.id ? { ...e, uploading: false, error: errorMsg } : e
        ));
        setUploadQueue(prev => prev.map(u => 
          u.id === uploadId ? { ...u, status: 'failed', error: errorMsg } : u
        ));
      }
    }
    
    setBatchUploading(false);
    
    if (successCount > 0) {
      toast.success(`${successCount} episode${successCount > 1 ? 's' : ''} uploaded to Bunny.net CDN!`);
      fetchSeriesDetail();
    }
    
    // Close modal after delay if all done
    setTimeout(() => {
      const allDone = batchEpisodes.every(ep => ep.uploaded || ep.error);
      if (allDone) {
        setBatchEpisodes([]);
        setShowBatchUpload(false);
      }
    }, 2000);
  };

  // ============ SEASON MANAGEMENT ============
  
  const handleCreateSeason = async () => {
    if (!newSeasonTitle.trim()) {
      toast.error("Please enter a season title");
      return;
    }
    
    try {
      const nextSeasonNum = seasons.length > 0 
        ? Math.max(...seasons.map(s => s.season_number)) + 1 
        : 1;
      
      await axios.post(
        `${API}/creator/series/${seriesId}/seasons`,
        { 
          season_number: nextSeasonNum,
          title: newSeasonTitle.trim()
        },
        { headers: { Authorization: `Bearer ${token}` }}
      );
      
      toast.success(`Season ${nextSeasonNum} created!`);
      setShowSeasonCreator(false);
      setNewSeasonTitle("");
      setExpandedSeasons(prev => [...prev, nextSeasonNum]);
      fetchSeriesDetail();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Failed to create season");
    }
  };

  const openBatchUploadForSeason = (seasonNum) => {
    setSelectedSeason(seasonNum);
    setShowBatchUpload(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!series) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="p-6 text-center max-w-sm">
          <AlertCircle className="w-12 h-12 mx-auto mb-4 text-red-400" />
          <h2 className="font-heading text-xl font-bold mb-2">Series Not Found</h2>
          <p className="text-sm text-muted-foreground mb-4">This series does not exist or you do not have access.</p>
          <Button onClick={() => navigate("/creator")} className="w-full">Back to Creator Portal</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-16 lg:pt-16" data-testid="creator-series-detail">
      {/* Upload Progress Panel (Persistent) */}
      <UploadProgressPanel uploads={uploadQueue} onDismiss={dismissUpload} />
      
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col fixed left-0 top-16 bottom-0 w-72 bg-card border-r border-white/10 z-40">
        {/* Back Navigation */}
        <div className="p-4 border-b border-white/10">
          <button 
            onClick={() => navigate("/creator")} 
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to Creator Portal
          </button>
        </div>

        {/* Series Info */}
        <div className="p-6 border-b border-white/10">
          <div className="w-full aspect-[2/3] rounded-lg overflow-hidden bg-secondary/50 mb-4">
            {series.thumbnail ? (
              <img src={series.thumbnail} alt={series.title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Film className="w-12 h-12 text-muted-foreground" />
              </div>
            )}
          </div>
          <h1 className="font-heading text-xl font-bold mb-1">{series.title}</h1>
          <p className="text-sm text-muted-foreground mb-3">{series.genre} • {series.total_episodes || episodes.length} episodes</p>
          <Badge 
            variant={series.status === "published" ? "default" : series.status === "approved" ? "outline" : "secondary"}
            className="mb-3"
          >
            {series.status === "pending_review" ? "Under Review" : series.status}
          </Badge>
          <p className="text-xs text-muted-foreground line-clamp-4">{series.description || "No description"}</p>
        </div>

        {/* Quick Stats */}
        <div className="p-4 border-b border-white/10 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground flex items-center gap-2">
              <Eye className="w-4 h-4 text-blue-400" /> Views
            </span>
            <span className="font-bold">{series.total_views || 0}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground flex items-center gap-2">
              <Coins className="w-4 h-4 text-yellow-400" /> Earnings
            </span>
            <span className="font-bold">{series.total_earnings || 0}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground flex items-center gap-2">
              <Layers className="w-4 h-4 text-purple-400" /> Seasons
            </span>
            <span className="font-bold">{seasons.length || 1}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground flex items-center gap-2">
              <Film className="w-4 h-4 text-green-400" /> Episodes
            </span>
            <span className="font-bold">{episodes.length}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="p-4 mt-auto space-y-2">
          <Button className="w-full" variant="outline" onClick={openSeriesEditor}>
            <Edit className="w-4 h-4 mr-2" /> Edit Series Info
          </Button>
          <Button 
            className="w-full" 
            onClick={() => setShowBatchUpload(true)}
            data-testid="add-episode-btn"
          >
            <Plus className="w-4 h-4 mr-2" /> Add Episodes
          </Button>
          
          {/* Publish Button */}
          {series.status !== "published" && (
            <Button 
              className="w-full bg-green-600 hover:bg-green-700"
              onClick={handlePublishSeries}
              disabled={publishing}
              data-testid="publish-series-btn"
            >
              {publishing ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Globe className="w-4 h-4 mr-2" />
              )}
              {publishing ? "Publishing..." : "Publish Series"}
            </Button>
          )}
          
          {series.status === "published" && (
            <div className="p-2 rounded-lg bg-green-500/20 border border-green-500/30 text-center">
              <p className="text-xs text-green-400 flex items-center justify-center gap-1">
                <Globe className="w-3 h-3" /> Live & visible to viewers
              </p>
            </div>
          )}
          
          {series.status === "pending_review" && (
            <p className="text-xs text-center text-muted-foreground">
              You can add episodes while under review
            </p>
          )}
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="lg:hidden sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-white/10">
        <div className="flex items-center gap-3 p-4">
          <button onClick={() => navigate("/creator")} className="p-2 hover:bg-secondary rounded-full">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="font-heading text-lg font-bold line-clamp-1">{series.title}</h1>
            <p className="text-xs text-muted-foreground">{series.genre} • {episodes.length} episodes</p>
          </div>
          <button 
            onClick={openSeriesEditor}
            className="p-2 hover:bg-secondary rounded-full"
            data-testid="edit-series-btn-mobile"
          >
            <Edit className="w-4 h-4" />
          </button>
          <Badge variant={series.status === "published" ? "default" : series.status === "approved" ? "outline" : "secondary"}>
            {series.status === "pending_review" ? "Review" : series.status}
          </Badge>
        </div>
      </div>

      {/* Main Content */}
      <main className="lg:ml-72">
        {/* Desktop Header */}
        <div className="hidden lg:block border-b border-white/10 px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-heading text-2xl font-bold">Seasons & Episodes</h2>
              <p className="text-sm text-muted-foreground">Organize your content by seasons</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowSeasonCreator(true)}>
                <FolderPlus className="w-4 h-4 mr-2" /> New Season
              </Button>
              <Button onClick={() => setShowBatchUpload(true)} data-testid="add-episode-btn-desktop">
                <Plus className="w-4 h-4 mr-2" /> Add Episodes
              </Button>
            </div>
          </div>
          
          {/* Workflow Help Banner */}
          {series.status !== "published" && episodes.length > 0 && (
            <div className="mt-4 p-4 rounded-lg bg-gradient-to-r from-green-500/20 to-emerald-600/20 border border-green-500/30">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-green-500/30 flex items-center justify-center">
                    <Globe className="w-5 h-5 text-green-400" />
                  </div>
                  <div>
                    <p className="font-medium text-green-300">Ready to go live?</p>
                    <p className="text-sm text-green-400/80">Click Publish to make your series visible to all viewers</p>
                  </div>
                </div>
                <Button 
                  className="bg-green-600 hover:bg-green-700"
                  onClick={handlePublishSeries}
                  disabled={publishing}
                  data-testid="publish-series-btn-main"
                >
                  {publishing ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Globe className="w-4 h-4 mr-2" />
                  )}
                  {publishing ? "Publishing..." : "Publish Series"}
                </Button>
              </div>
            </div>
          )}
          
          {/* Published Status Banner */}
          {series.status === "published" && (
            <div className="mt-4 p-3 rounded-lg bg-green-500/10 border border-green-500/20 flex items-center justify-between">
              <p className="text-sm text-green-400 flex items-center gap-2">
                <Globe className="w-4 h-4" />
                Your series is live and visible to all viewers!
              </p>
              <a 
                href={`/series/${series.id}`} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-sm text-green-300 hover:text-green-200 underline"
              >
                View Public Page →
              </a>
            </div>
          )}
        </div>

        {/* Mobile Series Info */}
        <div className="lg:hidden p-4">
          <Card className="p-4 mb-4 flex gap-4">
            <div className="w-20 h-28 rounded-lg overflow-hidden bg-secondary/50 flex-shrink-0">
              {series.thumbnail ? (
                <img src={series.thumbnail} alt={series.title} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Film className="w-6 h-6 text-muted-foreground" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-muted-foreground line-clamp-3">{series.description || "No description"}</p>
              <div className="flex gap-2 mt-2">
                <Button size="sm" variant="outline" onClick={openSeriesEditor}>
                  <Edit className="w-3 h-3 mr-1" /> Edit
                </Button>
                <Button size="sm" onClick={() => setShowBatchUpload(true)}>
                  <Plus className="w-3 h-3 mr-1" /> Add
                </Button>
              </div>
            </div>
          </Card>

          {/* Mobile Stats */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            <Card className="p-3 bg-gradient-to-br from-blue-500/20 to-cyan-600/20 border-blue-500/30">
              <p className="text-[10px] text-muted-foreground">Views</p>
              <p className="font-heading text-lg font-bold">{series.total_views || 0}</p>
            </Card>
            <Card className="p-3 bg-gradient-to-br from-purple-500/20 to-pink-600/20 border-purple-500/30">
              <p className="text-[10px] text-muted-foreground">Seasons</p>
              <p className="font-heading text-lg font-bold">{seasons.length || 1}</p>
            </Card>
            <Card className="p-3 bg-gradient-to-br from-green-500/20 to-emerald-600/20 border-green-500/30">
              <p className="text-[10px] text-muted-foreground">Episodes</p>
              <p className="font-heading text-lg font-bold">{episodes.length}</p>
            </Card>
          </div>
        </div>

        {/* Seasons Accordion Section */}
        <div className="p-4 lg:p-8">
          {episodes.length === 0 && seasons.length === 0 ? (
            <Card className="p-12 text-center">
              <Layers className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="font-heading text-lg font-semibold mb-2">Start Your Series</h3>
              <p className="text-muted-foreground mb-4 max-w-md mx-auto">
                {series.status === "pending_review" 
                  ? "Your series is under review. Start adding seasons and episodes while you wait!"
                  : "Organize your content into seasons and add episodes to each season."}
              </p>
              <div className="flex gap-3 justify-center">
                <Button variant="outline" onClick={() => setShowSeasonCreator(true)}>
                  <FolderPlus className="w-4 h-4 mr-2" /> Create Season
                </Button>
                <Button onClick={() => setShowBatchUpload(true)} data-testid="add-first-episode-btn">
                  <Plus className="w-4 h-4 mr-2" /> Add Episodes
                </Button>
              </div>
            </Card>
          ) : (
            <>
              {/* Help Tip */}
              <div className="mb-4 p-3 rounded-lg bg-primary/10 border border-primary/20 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                  <Play className="w-4 h-4 text-primary" />
                </div>
                <p className="text-sm text-muted-foreground">
                  <span className="text-foreground font-medium">Tip:</span> Click on any episode card to edit settings or preview your video
                </p>
              </div>
              
              <SeasonAccordion 
                seasons={seasons}
                episodes={episodes}
                expandedSeasons={expandedSeasons}
                onToggleSeason={toggleSeason}
                onEditEpisode={openEpisodeEditor}
                onAddSeason={() => setShowSeasonCreator(true)}
                onAddEpisode={openBatchUploadForSeason}
                onReorderEpisodes={handleReorderEpisodes}
                onBulkEdit={handleBulkEdit}
              />
            </>
          )}
        </div>
      </main>

      {/* Episode Editor Dialog */}
      <Dialog open={showEpisodeEditor} onOpenChange={setShowEpisodeEditor}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Episode</DialogTitle>
            <DialogDescription>
              Update episode settings including Skip Intro timing and subtitles
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <label className="text-sm text-muted-foreground">Episode Title</label>
              <Input 
                value={episodeForm.title}
                onChange={(e) => setEpisodeForm({...episodeForm, title: e.target.value})}
                placeholder="Episode title"
                data-testid="episode-title-input"
              />
            </div>
            
            <div>
              <label className="text-sm text-muted-foreground flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Intro Duration (seconds)
              </label>
              <p className="text-xs text-muted-foreground mb-2">
                Set when the Skip Intro button should skip to
              </p>
              <div className="flex items-center gap-3">
                <Input 
                  type="number"
                  min={0}
                  max={120}
                  value={episodeForm.intro_duration}
                  onChange={(e) => setEpisodeForm({...episodeForm, intro_duration: parseInt(e.target.value) || 0})}
                  className="w-24"
                  data-testid="intro-duration-input"
                />
                <span className="text-sm text-muted-foreground">seconds</span>
              </div>
              <div className="flex gap-2 mt-2">
                {[10, 15, 30, 45, 60].map(sec => (
                  <button
                    key={sec}
                    onClick={() => setEpisodeForm({...episodeForm, intro_duration: sec})}
                    className={`px-2 py-1 text-xs rounded-md border transition-colors ${
                      episodeForm.intro_duration === sec 
                        ? 'bg-primary text-white border-primary' 
                        : 'border-white/20 hover:border-primary'
                    }`}
                  >
                    {sec}s
                  </button>
                ))}
              </div>
            </div>
            
            <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 border border-white/10">
              <div>
                <p className="text-sm font-medium">Free Episode</p>
                <p className="text-xs text-muted-foreground">No coins required</p>
              </div>
              <button
                onClick={() => setEpisodeForm({...episodeForm, is_free: !episodeForm.is_free})}
                className={`w-12 h-6 rounded-full transition-colors ${episodeForm.is_free ? 'bg-green-500' : 'bg-white/20'}`}
                data-testid="is-free-toggle"
              >
                <div className={`w-5 h-5 bg-white rounded-full transition-transform ${episodeForm.is_free ? 'translate-x-6' : 'translate-x-0.5'}`} />
              </button>
            </div>
            
            {!episodeForm.is_free && (
              <div>
                <label className="text-sm text-muted-foreground flex items-center gap-2">
                  <Coins className="w-4 h-4" />
                  Coins Required
                </label>
                <Input 
                  type="number"
                  min={1}
                  max={50}
                  value={episodeForm.coins_required}
                  onChange={(e) => setEpisodeForm({...episodeForm, coins_required: parseInt(e.target.value) || 5})}
                  className="w-24"
                  data-testid="coins-required-input"
                />
              </div>
            )}
            
            {/* Thumbnail URL Section */}
            <div className="border-t border-white/10 pt-4">
              <label className="text-sm font-medium flex items-center gap-2 mb-2">
                <Image className="w-4 h-4 text-purple-400" />
                Episode Thumbnail
              </label>
              <Input 
                value={episodeForm.thumbnail_url}
                onChange={(e) => setEpisodeForm({...episodeForm, thumbnail_url: e.target.value})}
                placeholder="https://example.com/thumbnail.jpg"
                data-testid="episode-thumbnail-input"
              />
              {episodeForm.thumbnail_url && (
                <div className="mt-2 relative w-24 h-24 rounded-lg overflow-hidden bg-secondary/50">
                  <img 
                    src={episodeForm.thumbnail_url} 
                    alt="Preview" 
                    className="w-full h-full object-cover"
                    onError={(e) => e.target.style.display = 'none'}
                  />
                </div>
              )}
            </div>
            
            {/* Subtitle Upload Section */}
            <div className="border-t border-white/10 pt-4">
              <label className="text-sm font-medium flex items-center gap-2 mb-3">
                <Languages className="w-4 h-4 text-blue-400" />
                Subtitles (Optional)
              </label>
              
              {Object.keys(episodeSubtitles).length > 0 && (
                <div className="mb-3 space-y-2">
                  <p className="text-xs text-muted-foreground">Uploaded subtitles:</p>
                  {Object.entries(episodeSubtitles).map(([lang]) => (
                    <div key={lang} className="flex items-center justify-between p-2 bg-green-500/10 rounded-md border border-green-500/20">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-400" />
                        <span className="text-sm font-medium">
                          {SUBTITLE_LANGUAGES.find(l => l.code === lang)?.name || lang.toUpperCase()}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveSubtitle(lang)}
                        className="p-1 hover:bg-red-500/20 rounded text-red-400"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              
              <div className="space-y-2">
                <div className="flex gap-2">
                  <select
                    value={selectedSubtitleLanguage}
                    onChange={(e) => setSelectedSubtitleLanguage(e.target.value)}
                    className="flex-1 p-2 rounded-lg bg-secondary/50 border border-white/10 text-sm"
                  >
                    {SUBTITLE_LANGUAGES.map(lang => (
                      <option key={lang.code} value={lang.code}>
                        {lang.name} {episodeSubtitles[lang.code] ? '(Replace)' : ''}
                      </option>
                    ))}
                  </select>
                  <label className="flex items-center gap-2 px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 rounded-lg cursor-pointer transition-colors">
                    {subtitleUploading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Upload className="w-4 h-4" />
                    )}
                    <span className="text-sm">Upload</span>
                    <input
                      ref={subtitleFileInputRef}
                      type="file"
                      accept=".vtt"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files?.[0]) {
                          handleSubtitleUpload(e.target.files[0]);
                        }
                      }}
                      disabled={subtitleUploading}
                    />
                  </label>
                </div>
                <p className="text-xs text-muted-foreground">
                  Upload .vtt subtitle files. Adding subtitles increases your reach by 40%!
                </p>
              </div>
            </div>
            
            {/* Preview Button - Shows if episode has a video */}
            {selectedEpisode?.bunny_video_id && (
              <div className="border-t border-white/10 pt-4">
                <Button 
                  variant="outline"
                  onClick={() => handlePreviewEpisode(selectedEpisode)}
                  className="w-full"
                  data-testid="preview-episode-btn"
                >
                  <Play className="w-4 h-4 mr-2" />
                  Preview Video
                </Button>
                {selectedEpisode?.encoding_status !== 'ready' && (
                  <p className="text-xs text-yellow-400 text-center mt-2">
                    Video is still processing. Preview may not be available yet.
                  </p>
                )}
              </div>
            )}
            
            <Button 
              onClick={handleUpdateEpisode} 
              className="w-full"
              data-testid="save-episode-btn"
            >
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Series Editor Dialog */}
      <Dialog open={showSeriesEditor} onOpenChange={setShowSeriesEditor}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Series</DialogTitle>
            <DialogDescription>
              Update series information and thumbnail
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <label className="text-sm text-muted-foreground">Series Title</label>
              <Input 
                value={seriesForm.title}
                onChange={(e) => setSeriesForm({...seriesForm, title: e.target.value})}
                placeholder="Series title"
              />
            </div>
            
            <div>
              <label className="text-sm text-muted-foreground">Description</label>
              <textarea 
                className="w-full p-3 rounded-lg bg-secondary/50 border border-white/10 text-sm resize-none"
                rows={3}
                value={seriesForm.description}
                onChange={(e) => setSeriesForm({...seriesForm, description: e.target.value})}
                placeholder="Series description..."
              />
            </div>
            
            <div>
              <label className="text-sm text-muted-foreground">Genre</label>
              <select 
                className="w-full p-3 rounded-lg bg-secondary/50 border border-white/10 text-sm"
                value={seriesForm.genre}
                onChange={(e) => setSeriesForm({...seriesForm, genre: e.target.value})}
              >
                <option value="Romance">Romance</option>
                <option value="Drama">Drama</option>
                <option value="Thriller">Thriller</option>
                <option value="Fantasy">Fantasy</option>
                <option value="Action">Action</option>
                <option value="Comedy">Comedy</option>
              </select>
            </div>
            
            <div className="border-t border-white/10 pt-4">
              <label className="text-sm font-medium flex items-center gap-2 mb-2">
                <Image className="w-4 h-4 text-purple-400" />
                Series Thumbnail
              </label>
              <Input 
                value={seriesForm.thumbnail_url}
                onChange={(e) => setSeriesForm({...seriesForm, thumbnail_url: e.target.value})}
                placeholder="https://example.com/thumbnail.jpg"
              />
              {seriesForm.thumbnail_url && (
                <div className="mt-2 relative w-24 h-32 rounded-lg overflow-hidden bg-secondary/50">
                  <img 
                    src={seriesForm.thumbnail_url} 
                    alt="Preview" 
                    className="w-full h-full object-cover"
                    onError={(e) => e.target.style.display = 'none'}
                  />
                </div>
              )}
            </div>
            
            <Button onClick={handleUpdateSeries} className="w-full">
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Season Creator Dialog */}
      <Dialog open={showSeasonCreator} onOpenChange={setShowSeasonCreator}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FolderPlus className="w-5 h-5 text-primary" />
              Create New Season
            </DialogTitle>
            <DialogDescription>
              Add a new season to organize your episodes
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <label className="text-sm text-muted-foreground mb-2 block">Season Title</label>
              <Input 
                value={newSeasonTitle}
                onChange={(e) => setNewSeasonTitle(e.target.value)}
                placeholder={`Season ${seasons.length + 1}`}
                data-testid="new-season-title-input"
              />
              <p className="text-xs text-muted-foreground mt-1">
                This will be Season {seasons.length > 0 ? Math.max(...seasons.map(s => s.season_number)) + 1 : 1}
              </p>
            </div>
            
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setShowSeasonCreator(false)} className="flex-1">
                Cancel
              </Button>
              <Button onClick={handleCreateSeason} className="flex-1" data-testid="create-season-btn">
                Create Season
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Batch Upload Modal */}
      <Dialog open={showBatchUpload} onOpenChange={setShowBatchUpload}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5 text-primary" />
              Add Episodes
            </DialogTitle>
            <DialogDescription>
              Upload videos to Bunny.net CDN for smooth streaming performance
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            {/* Season Selector */}
            <div className="p-3 rounded-lg bg-gradient-to-r from-primary/10 to-purple-500/10 border border-primary/20">
              <label className="text-sm font-medium mb-2 block flex items-center gap-2">
                <Layers className="w-4 h-4 text-primary" />
                Select Season
              </label>
              <select
                value={selectedSeason}
                onChange={(e) => setSelectedSeason(parseInt(e.target.value))}
                className="w-full p-2 rounded-lg bg-secondary/50 border border-white/10 text-sm"
                data-testid="season-selector"
              >
                {[...new Set([...seasons.map(s => s.season_number), 1])].sort().map(num => (
                  <option key={num} value={num}>
                    Season {num} {seasons.find(s => s.season_number === num)?.title ? `- ${seasons.find(s => s.season_number === num)?.title}` : ''}
                  </option>
                ))}
                <option value={seasons.length > 0 ? Math.max(...seasons.map(s => s.season_number)) + 1 : 2}>
                  + New Season {seasons.length > 0 ? Math.max(...seasons.map(s => s.season_number)) + 1 : 2}
                </option>
              </select>
            </div>

            {/* Upload Area */}
            <label className="block cursor-pointer">
              <div className="border-2 border-dashed border-white/20 rounded-xl p-8 text-center hover:border-primary/50 transition-colors">
                <Upload className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
                <p className="font-medium">Drop video files here or click to browse</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Supported formats: MP4, WebM, MOV (max 500MB each)
                </p>
                <p className="text-xs text-primary mt-2">
                  Videos are uploaded to Bunny.net CDN for fast, reliable streaming
                </p>
              </div>
              <input
                type="file"
                accept="video/*"
                multiple
                onChange={handleBatchFileSelect}
                className="hidden"
              />
            </label>

            {/* Episode List */}
            {batchEpisodes.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-sm">{batchEpisodes.length} episode(s) ready for Season {selectedSeason}</h4>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setBatchEpisodes([])}
                    className="text-red-400 hover:text-red-300"
                  >
                    Clear All
                  </Button>
                </div>
                
                {batchEpisodes.map((ep) => (
                  <Card key={ep.id} className={`p-3 ${ep.uploaded ? 'bg-green-500/10 border-green-500/30' : ep.error ? 'bg-red-500/10 border-red-500/30' : ''}`}>
                    <div className="flex items-start gap-3">
                      {/* Thumbnail Preview */}
                      <div className="w-20 h-14 rounded bg-secondary/50 flex items-center justify-center flex-shrink-0 overflow-hidden">
                        {ep.thumbnail ? (
                          <img src={ep.thumbnail} alt="" className="w-full h-full object-cover" />
                        ) : ep.uploaded ? (
                          <CheckCircle className="w-6 h-6 text-green-400" />
                        ) : ep.uploading ? (
                          <Loader2 className="w-6 h-6 animate-spin text-primary" />
                        ) : ep.error ? (
                          <AlertCircle className="w-6 h-6 text-red-400" />
                        ) : (
                          <Video className="w-6 h-6 text-muted-foreground" />
                        )}
                      </div>
                      
                      {/* Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline" className="text-[10px] px-1.5">
                            S{String(ep.season_number).padStart(2, '0')}E{String(ep.episode_number).padStart(2, '0')}
                          </Badge>
                          {!ep.uploaded && !ep.uploading && (
                            <button
                              onClick={() => removeBatchEpisode(ep.id)}
                              className="ml-auto text-red-400 hover:text-red-300"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                        
                        <Input
                          value={ep.title}
                          onChange={(e) => updateBatchEpisode(ep.id, 'title', e.target.value)}
                          placeholder="Episode title"
                          className="mb-2 text-sm h-8"
                          disabled={ep.uploading || ep.uploaded}
                        />
                        
                        <div className="flex items-center gap-4 text-xs">
                          <label className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={ep.is_free}
                              onChange={(e) => updateBatchEpisode(ep.id, 'is_free', e.target.checked)}
                              disabled={ep.uploading || ep.uploaded}
                              className="rounded border-white/20"
                            />
                            Free
                          </label>
                          
                          {!ep.is_free && (
                            <div className="flex items-center gap-1">
                              <Coins className="w-3 h-3 text-yellow-400" />
                              <input
                                type="number"
                                value={ep.coins_required}
                                onChange={(e) => updateBatchEpisode(ep.id, 'coins_required', parseInt(e.target.value) || 5)}
                                className="w-14 px-2 py-1 text-xs bg-secondary/50 border border-white/10 rounded"
                                disabled={ep.uploading || ep.uploaded}
                              />
                            </div>
                          )}
                          
                          <span className="text-muted-foreground ml-auto">
                            {(ep.file.size / (1024 * 1024)).toFixed(1)} MB
                          </span>
                        </div>
                        
                        {/* Progress Bar */}
                        {(ep.uploading || ep.uploaded) && (
                          <div className="mt-2">
                            <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                              <div 
                                className={`h-full transition-all duration-300 ${ep.uploaded ? 'bg-green-500' : 'bg-primary'}`}
                                style={{ width: `${ep.progress}%` }}
                              />
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              {ep.uploaded ? 'Uploaded to Bunny CDN!' : `${ep.progress}% uploading...`}
                            </p>
                          </div>
                        )}
                        
                        {ep.error && (
                          <p className="text-xs text-red-400 mt-1">{ep.error}</p>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-4 border-t border-white/10">
              <Button
                variant="outline"
                onClick={() => {
                  setBatchEpisodes([]);
                  setShowBatchUpload(false);
                }}
                className="flex-1"
                disabled={batchUploading}
              >
                Cancel
              </Button>
              <Button
                onClick={uploadBatchEpisodes}
                disabled={batchEpisodes.length === 0 || batchUploading || batchEpisodes.every(ep => ep.uploaded)}
                className="flex-1"
              >
                {batchUploading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Uploading to CDN...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Upload {batchEpisodes.filter(ep => !ep.uploaded).length} Episode(s)
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Video Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={(open) => {
        setShowPreview(open);
        if (!open) setPreviewData(null);
      }}>
        <DialogContent className="max-w-4xl max-h-[90vh] p-0 overflow-hidden">
          <DialogHeader className="p-4 pb-0">
            <DialogTitle className="flex items-center gap-2">
              <Play className="w-5 h-5 text-primary" />
              Episode Preview
            </DialogTitle>
            <DialogDescription>
              {previewData?.title || "Loading preview..."}
              {previewData?.episode_code && ` - ${previewData.episode_code}`}
            </DialogDescription>
          </DialogHeader>
          
          <div className="p-4">
            {previewLoading ? (
              <div className="aspect-video bg-black/50 rounded-lg flex items-center justify-center">
                <div className="text-center">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-primary" />
                  <p className="text-sm text-muted-foreground">Loading video...</p>
                </div>
              </div>
            ) : previewData?.can_preview ? (
              <div className="aspect-video bg-black rounded-lg overflow-hidden">
                <iframe
                  src={previewData.embed_url}
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  title="Episode Preview"
                />
              </div>
            ) : previewData?.message ? (
              <div className="aspect-video bg-black/50 rounded-lg flex items-center justify-center">
                <div className="text-center p-4">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-yellow-400" />
                  <p className="text-sm text-yellow-400 font-medium">{previewData.message}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Video encoding typically takes 2-5 minutes
                  </p>
                </div>
              </div>
            ) : (
              <div className="aspect-video bg-black/50 rounded-lg flex items-center justify-center">
                <div className="text-center p-4">
                  <AlertCircle className="w-8 h-8 mx-auto mb-2 text-red-400" />
                  <p className="text-sm text-red-400">Failed to load preview</p>
                </div>
              </div>
            )}
            
            {previewData && (
              <div className="mt-4 flex items-center justify-between text-sm">
                <div className="flex items-center gap-4">
                  {previewData.duration && (
                    <span className="text-muted-foreground flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {Math.floor(previewData.duration / 60)}:{String(Math.floor(previewData.duration % 60)).padStart(2, '0')}
                    </span>
                  )}
                  <Badge variant={previewData.encoding_status === 'ready' ? 'default' : 'secondary'}>
                    {previewData.encoding_status === 'ready' ? 'Ready' : previewData.encoding_status}
                  </Badge>
                </div>
                <Button variant="outline" size="sm" onClick={() => setShowPreview(false)}>
                  Close
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CreatorSeriesDetailPage;
