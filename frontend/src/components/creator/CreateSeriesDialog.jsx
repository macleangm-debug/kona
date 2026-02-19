import React, { useState, useCallback, memo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// Memoized input component to prevent re-renders
const FormInput = memo(({ label, value, onChange, placeholder, type = "text" }) => (
  <div>
    <label className="text-sm text-muted-foreground">{label}</label>
    <Input
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
    />
  </div>
));

const FormTextarea = memo(({ label, value, onChange, placeholder, rows = 3 }) => (
  <div>
    <label className="text-sm text-muted-foreground">{label}</label>
    <textarea
      className="w-full p-3 rounded-lg bg-secondary/50 border border-white/10 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/50"
      rows={rows}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
    />
  </div>
));

const FormSelect = memo(({ label, value, onChange, options }) => (
  <div>
    <label className="text-sm text-muted-foreground">{label}</label>
    <select
      className="w-full p-3 rounded-lg bg-secondary/50 border border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
      value={value}
      onChange={onChange}
    >
      {options.map(opt => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  </div>
));

const GENRE_OPTIONS = [
  { value: "Romance", label: "Romance" },
  { value: "Drama", label: "Drama" },
  { value: "Thriller", label: "Thriller" },
  { value: "Fantasy", label: "Fantasy" },
  { value: "Action", label: "Action" },
  { value: "Comedy", label: "Comedy" },
];

export const CreateSeriesDialog = memo(({ open, onOpenChange, onSubmit, loading }) => {
  // Local state for form - prevents parent re-renders
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [genre, setGenre] = useState("Romance");

  const handleTitleChange = useCallback((e) => setTitle(e.target.value), []);
  const handleDescriptionChange = useCallback((e) => setDescription(e.target.value), []);
  const handleGenreChange = useCallback((e) => setGenre(e.target.value), []);

  const handleSubmit = useCallback(() => {
    onSubmit({ title, description, genre });
  }, [title, description, genre, onSubmit]);

  const handleClose = useCallback((open) => {
    if (!open) {
      // Reset form when closing
      setTitle("");
      setDescription("");
      setGenre("Romance");
    }
    onOpenChange(open);
  }, [onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Create New Series</DialogTitle>
          <DialogDescription>Start a new series for your content</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 mt-4">
          <FormInput
            label="Series Title"
            value={title}
            onChange={handleTitleChange}
            placeholder="My Amazing Series"
          />
          <FormTextarea
            label="Description"
            value={description}
            onChange={handleDescriptionChange}
            placeholder="What is your series about? (min 20 characters)"
            rows={3}
          />
          <FormSelect
            label="Genre"
            value={genre}
            onChange={handleGenreChange}
            options={GENRE_OPTIONS}
          />
          <Button 
            onClick={handleSubmit} 
            className="w-full"
            disabled={loading}
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
