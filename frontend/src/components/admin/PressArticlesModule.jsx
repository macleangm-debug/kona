import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  Newspaper, Plus, Edit, Trash2, Eye, EyeOff, Star,
  Save, ChevronLeft, Loader2, Calendar, ExternalLink,
  Image, FileText, Tag, Link as LinkIcon, CheckCircle
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { API } from "@/config";
import { toast } from "sonner";

const TAG_OPTIONS = ["Funding", "Product", "Partnership", "Milestone", "Creators", "Company", "Awards", "Events"];
const CATEGORY_OPTIONS = ["News", "Press Release", "Blog", "Announcement"];

const PressArticlesModule = ({ token }) => {
  const [articles, setArticles] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // View modes: "list", "create", "edit"
  const [viewMode, setViewMode] = useState("list");
  const [selectedArticle, setSelectedArticle] = useState(null);
  
  // Form state
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    summary: "",
    tag: "News",
    category: "Press Release",
    image_url: "",
    source_link: "",
    is_featured: false,
    is_published: true
  });

  const fetchArticles = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/press/admin/articles`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setArticles(res.data.articles || []);
      setStats(res.data.stats || null);
    } catch (err) {
      console.error("Failed to fetch articles:", err);
      toast.error("Failed to load articles");
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchArticles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const resetForm = () => {
    setFormData({
      title: "",
      content: "",
      summary: "",
      tag: "News",
      category: "Press Release",
      image_url: "",
      source_link: "",
      is_featured: false,
      is_published: true
    });
  };

  const handleCreate = () => {
    resetForm();
    setSelectedArticle(null);
    setViewMode("create");
  };

  const handleEdit = (article) => {
    setSelectedArticle(article);
    setFormData({
      title: article.title,
      content: article.content,
      summary: article.summary || "",
      tag: article.tag,
      category: article.category || "Press Release",
      image_url: article.image_url || "",
      source_link: article.source_link || "",
      is_featured: article.is_featured,
      is_published: article.is_published
    });
    setViewMode("edit");
  };

  const handleSave = async () => {
    if (!formData.title.trim() || !formData.content.trim()) {
      toast.error("Title and content are required");
      return;
    }
    
    setSaving(true);
    try {
      if (viewMode === "create") {
        await axios.post(`${API}/press/admin/articles`, formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success("Article created successfully");
      } else {
        await axios.put(`${API}/press/admin/articles/${selectedArticle.id}`, formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success("Article updated successfully");
      }
      
      setViewMode("list");
      fetchArticles();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to save article");
    }
    setSaving(false);
  };

  const handleDelete = async (articleId) => {
    if (!window.confirm("Are you sure you want to delete this article?")) return;
    
    try {
      await axios.delete(`${API}/press/admin/articles/${articleId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("Article deleted");
      fetchArticles();
    } catch (err) {
      toast.error("Failed to delete article");
    }
  };

  const handleTogglePublish = async (article) => {
    try {
      const endpoint = article.is_published 
        ? `${API}/press/admin/articles/${article.id}/unpublish`
        : `${API}/press/admin/articles/${article.id}/publish`;
      
      await axios.post(endpoint, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast.success(article.is_published ? "Article unpublished" : "Article published");
      fetchArticles();
    } catch (err) {
      toast.error("Failed to update publish status");
    }
  };

  const handleSetFeatured = async (articleId) => {
    try {
      await axios.post(`${API}/press/admin/articles/${articleId}/feature`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("Article set as featured");
      fetchArticles();
    } catch (err) {
      toast.error("Failed to set featured article");
    }
  };

  // Create/Edit Form View
  if (viewMode === "create" || viewMode === "edit") {
    return (
      <div className="space-y-6" data-testid="article-form">
        {/* Header */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => setViewMode("list")}
            className="flex items-center gap-2 text-muted-foreground hover:text-white transition-colors"
            data-testid="back-to-list-btn"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to Articles
          </button>
          <h2 className="text-xl font-bold">
            {viewMode === "create" ? "Create New Article" : "Edit Article"}
          </h2>
        </div>

        {/* Form */}
        <Card className="p-6">
          <div className="space-y-5">
            {/* Title */}
            <div>
              <label className="block text-sm font-medium mb-2">Title *</label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Enter article title..."
                className="bg-white/5 border-white/10"
                data-testid="article-title-input"
              />
            </div>

            {/* Summary */}
            <div>
              <label className="block text-sm font-medium mb-2">Summary (for cards/previews)</label>
              <Textarea
                value={formData.summary}
                onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
                placeholder="Brief summary of the article..."
                className="bg-white/5 border-white/10"
                rows={2}
                data-testid="article-summary-input"
              />
            </div>

            {/* Content */}
            <div>
              <label className="block text-sm font-medium mb-2">Content *</label>
              <Textarea
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                placeholder="Full article content..."
                className="bg-white/5 border-white/10 min-h-[200px]"
                rows={10}
                data-testid="article-content-input"
              />
              <p className="text-xs text-muted-foreground mt-1">
                {formData.content.length} characters
              </p>
            </div>

            {/* Tag & Category */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Tag *</label>
                <select
                  value={formData.tag}
                  onChange={(e) => setFormData({ ...formData, tag: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-md px-3 py-2 text-sm"
                  data-testid="article-tag-select"
                >
                  {TAG_OPTIONS.map(tag => (
                    <option key={tag} value={tag}>{tag}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Category</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-md px-3 py-2 text-sm"
                  data-testid="article-category-select"
                >
                  {CATEGORY_OPTIONS.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Image URL & Source Link */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  <Image className="w-3.5 h-3.5 inline mr-1" />
                  Image URL
                </label>
                <Input
                  value={formData.image_url}
                  onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                  placeholder="https://..."
                  className="bg-white/5 border-white/10"
                  data-testid="article-image-input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  <LinkIcon className="w-3.5 h-3.5 inline mr-1" />
                  Source/External Link
                </label>
                <Input
                  value={formData.source_link}
                  onChange={(e) => setFormData({ ...formData, source_link: e.target.value })}
                  placeholder="https://..."
                  className="bg-white/5 border-white/10"
                  data-testid="article-source-input"
                />
              </div>
            </div>

            {/* Toggles */}
            <div className="flex flex-wrap gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_published}
                  onChange={(e) => setFormData({ ...formData, is_published: e.target.checked })}
                  className="w-4 h-4 rounded bg-white/5 border-white/20"
                  data-testid="article-published-checkbox"
                />
                <span className="text-sm">Publish immediately</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_featured}
                  onChange={(e) => setFormData({ ...formData, is_featured: e.target.checked })}
                  className="w-4 h-4 rounded bg-white/5 border-white/20"
                  data-testid="article-featured-checkbox"
                />
                <span className="text-sm">Set as featured article</span>
              </label>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
              <Button
                variant="outline"
                onClick={() => setViewMode("list")}
                className="border-white/20"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving}
                className="bg-primary"
                data-testid="save-article-btn"
              >
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                {viewMode === "create" ? "Create Article" : "Save Changes"}
              </Button>
            </div>
          </div>
        </Card>

        {/* Preview */}
        {formData.title && (
          <Card className="p-6 bg-white/5 border-white/10">
            <h3 className="text-sm font-medium text-muted-foreground mb-4">Preview</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Badge className="bg-blue-500/20 text-blue-400">{formData.tag}</Badge>
                <span className="text-xs text-muted-foreground">{formData.category}</span>
              </div>
              <h4 className="text-lg font-bold">{formData.title}</h4>
              {formData.summary && (
                <p className="text-sm text-muted-foreground">{formData.summary}</p>
              )}
            </div>
          </Card>
        )}
      </div>
    );
  }

  // List View
  return (
    <div className="space-y-6" data-testid="press-articles-module">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Press & News Management</h2>
          <p className="text-sm text-muted-foreground">Create and manage news articles for the Press page</p>
        </div>
        <Button onClick={handleCreate} className="bg-primary" data-testid="create-article-btn">
          <Plus className="w-4 h-4 mr-2" />
          New Article
        </Button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="p-4 bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20">
            <div className="flex items-center gap-3">
              <Newspaper className="w-6 h-6 text-blue-400" />
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-xs text-muted-foreground">Total Articles</p>
              </div>
            </div>
          </Card>
          <Card className="p-4 bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/20">
            <div className="flex items-center gap-3">
              <Eye className="w-6 h-6 text-green-400" />
              <div>
                <p className="text-2xl font-bold">{stats.published}</p>
                <p className="text-xs text-muted-foreground">Published</p>
              </div>
            </div>
          </Card>
          <Card className="p-4 bg-gradient-to-br from-yellow-500/10 to-yellow-600/5 border-yellow-500/20">
            <div className="flex items-center gap-3">
              <FileText className="w-6 h-6 text-yellow-400" />
              <div>
                <p className="text-2xl font-bold">{stats.drafts}</p>
                <p className="text-xs text-muted-foreground">Drafts</p>
              </div>
            </div>
          </Card>
          <Card className="p-4 bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-500/20">
            <div className="flex items-center gap-3">
              <Star className="w-6 h-6 text-purple-400" />
              <div>
                <p className="text-2xl font-bold">{stats.featured}</p>
                <p className="text-xs text-muted-foreground">Featured</p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Articles List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : articles.length === 0 ? (
        <Card className="p-12 text-center">
          <Newspaper className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground mb-4">No articles yet</p>
          <Button onClick={handleCreate} className="bg-primary">
            <Plus className="w-4 h-4 mr-2" />
            Create First Article
          </Button>
        </Card>
      ) : (
        <div className="space-y-3">
          {articles.map((article) => (
            <Card
              key={article.id}
              className="p-4 hover:bg-white/5 transition-colors"
              data-testid={`article-card-${article.id}`}
            >
              <div className="flex items-start gap-4">
                {/* Image Preview */}
                <div className="w-20 h-16 rounded-lg bg-gray-800 overflow-hidden flex-shrink-0">
                  {article.image_url ? (
                    <img src={article.image_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Newspaper className="w-6 h-6 text-muted-foreground" />
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge className="bg-blue-500/20 text-blue-400 text-xs">{article.tag}</Badge>
                    {article.is_featured && (
                      <Badge className="bg-yellow-500/20 text-yellow-400 text-xs">
                        <Star className="w-3 h-3 mr-1" />
                        Featured
                      </Badge>
                    )}
                    {!article.is_published && (
                      <Badge className="bg-gray-500/20 text-gray-400 text-xs">Draft</Badge>
                    )}
                  </div>
                  <h3 className="font-semibold truncate">{article.title}</h3>
                  {article.summary && (
                    <p className="text-sm text-muted-foreground truncate mt-1">{article.summary}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-2">
                    {article.published_at 
                      ? `Published ${new Date(article.published_at).toLocaleDateString()}`
                      : `Created ${new Date(article.created_at).toLocaleDateString()}`
                    }
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleEdit(article)}
                    className="hover:bg-white/10"
                    data-testid={`edit-article-${article.id}`}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleTogglePublish(article)}
                    className="hover:bg-white/10"
                    title={article.is_published ? "Unpublish" : "Publish"}
                    data-testid={`toggle-publish-${article.id}`}
                  >
                    {article.is_published ? (
                      <EyeOff className="w-4 h-4 text-yellow-400" />
                    ) : (
                      <Eye className="w-4 h-4 text-green-400" />
                    )}
                  </Button>
                  {!article.is_featured && article.is_published && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleSetFeatured(article.id)}
                      className="hover:bg-white/10"
                      title="Set as Featured"
                      data-testid={`feature-article-${article.id}`}
                    >
                      <Star className="w-4 h-4" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(article.id)}
                    className="hover:bg-red-500/10 text-red-400"
                    data-testid={`delete-article-${article.id}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default PressArticlesModule;
