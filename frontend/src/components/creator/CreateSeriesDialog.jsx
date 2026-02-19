import React, { useState, useCallback, memo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Upload, Image, Info } from "lucide-react";

// Extended genres list for African content
const GENRE_OPTIONS = [
  { value: "Romance", label: "Romance" },
  { value: "Drama", label: "Drama" },
  { value: "Thriller", label: "Thriller" },
  { value: "Fantasy", label: "Fantasy" },
  { value: "Action", label: "Action" },
  { value: "Comedy", label: "Comedy" },
  { value: "Horror", label: "Horror" },
  { value: "Mystery", label: "Mystery" },
  { value: "Sci-Fi", label: "Sci-Fi" },
  { value: "Family", label: "Family" },
  { value: "Documentary", label: "Documentary" },
  { value: "Historical", label: "Historical" },
  { value: "Crime", label: "Crime" },
  { value: "Musical", label: "Musical" },
  { value: "Reality", label: "Reality" },
  { value: "Sports", label: "Sports" },
  { value: "Animation", label: "Animation" },
  { value: "Nollywood", label: "Nollywood" },
  { value: "Afro-Drama", label: "Afro-Drama" },
  { value: "Cultural", label: "Cultural" },
];

export const CreateSeriesDialog = memo(({ open, onOpenChange, onSubmit, loading }) => {
  // Local state for form - prevents parent re-renders
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [genre, setGenre] = useState("Romance");
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [thumbnailPreview, setThumbnailPreview] = useState("");

  const handleTitleChange = useCallback((e) => setTitle(e.target.value), []);
  const handleDescriptionChange = useCallback((e) => setDescription(e.target.value), []);
  const handleGenreChange = useCallback((e) => setGenre(e.target.value), []);
  const handleThumbnailUrlChange = useCallback((e) => {
    const url = e.target.value;
    setThumbnailUrl(url);
    setThumbnailPreview(url);
  }, []);

  const handleThumbnailUpload = useCallback((e) => {
    const file = e.target.files?.[0];
    if (file) {
      // Create preview URL
      const previewUrl = URL.createObjectURL(file);
      setThumbnailPreview(previewUrl);
      // For now, store as data URL (in production, upload to CDN)
      const reader = new FileReader();
      reader.onloadend = () => {
        setThumbnailUrl(reader.result);
      };
      reader.readAsDataURL(file);
    }
  }, []);

  const handleSubmit = useCallback(() => {
    onSubmit({ title, description, genre, thumbnail_url: thumbnailUrl });
  }, [title, description, genre, thumbnailUrl, onSubmit]);

  const handleClose = useCallback((open) => {
    if (!open) {
      // Reset form when closing
      setTitle("");
      setDescription("");
      setGenre("Romance");
      setThumbnailUrl("");
      setThumbnailPreview("");
    }
    onOpenChange(open);
  }, [onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Series</DialogTitle>
          <DialogDescription>Start a new series for your content</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 mt-4">
          {/* Title */}
          <div>
            <label className="text-sm text-muted-foreground">Series Title *</label>
            <Input
              value={title}
              onChange={handleTitleChange}
              placeholder="My Amazing Series"
            />
          </div>

          {/* Description */}
          <div>
            <label className="text-sm text-muted-foreground">Description * (min 20 characters)</label>
            <textarea
              className="w-full p-3 rounded-lg bg-secondary/50 border border-white/10 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/50"
              rows={3}
              value={description}
              onChange={handleDescriptionChange}
              placeholder="What is your series about? Tell viewers what to expect..."
            />
            <p className={`text-xs mt-1 ${description.length >= 20 ? 'text-green-400' : 'text-red-400'}`}>
              {description.length}/20 characters {description.length < 20 && `(need ${20 - description.length} more)`}
            </p>
          </div>

          {/* Genre Dropdown - Native select for better performance */}
          <div>
            <label className="text-sm text-muted-foreground">Genre *</label>
            <select
              className="w-full p-3 rounded-lg bg-secondary border border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 appearance-none cursor-pointer"
              value={genre}
              onChange={handleGenreChange}
              style={{ 
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%239ca3af' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right 12px center',
                backgroundSize: '16px',
                paddingRight: '40px'
              }}
            >
              {GENRE_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          {/* Thumbnail Upload */}
          <div>
            <label className="text-sm text-muted-foreground flex items-center gap-2">
              <Image className="w-4 h-4" /> Thumbnail (Optional)
            </label>
            
            {/* Size instruction */}
            <div className="flex items-start gap-2 p-2 bg-blue-500/10 rounded-lg mb-2 text-xs">
              <Info className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
              <span className="text-blue-300">
                Recommended size: <strong>400×600px</strong> (2:3 ratio) for best display in carousels. 
                Max file size: 2MB. Formats: JPG, PNG, WebP
              </span>
            </div>

            {/* Thumbnail Preview */}
            {thumbnailPreview && (
              <div className="mb-2 relative w-24 h-36 rounded-lg overflow-hidden border border-white/20">
                <img 
                  src={thumbnailPreview} 
                  alt="Thumbnail preview" 
                  className="w-full h-full object-cover"
                />
                <button
                  onClick={() => { setThumbnailUrl(""); setThumbnailPreview(""); }}
                  className="absolute top-1 right-1 w-5 h-5 bg-black/70 rounded-full flex items-center justify-center text-white text-xs"
                >
                  ×
                </button>
              </div>
            )}

            {/* Upload options */}
            <div className="flex gap-2">
              <label className="flex-1 cursor-pointer">
                <div className="p-3 border border-dashed border-white/20 rounded-lg hover:border-primary/50 transition-colors text-center">
                  <Upload className="w-5 h-5 mx-auto mb-1 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Upload Image</span>
                </div>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleThumbnailUpload}
                  className="hidden"
                />
              </label>
              <div className="flex-1">
                <Input
                  value={thumbnailUrl.startsWith('data:') ? '' : thumbnailUrl}
                  onChange={handleThumbnailUrlChange}
                  placeholder="Or paste image URL"
                  className="h-full text-xs"
                />
              </div>
            </div>
          </div>

          <Button 
            onClick={handleSubmit} 
            className="w-full"
            disabled={loading || !title || description.length < 20}
          >
            {loading ? "Creating..." : "Create Series"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
});

CreateSeriesDialog.displayName = "CreateSeriesDialog";

export default CreateSeriesDialog;
