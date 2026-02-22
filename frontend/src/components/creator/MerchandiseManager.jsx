import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  ShoppingBag, Package, Truck, Download, Plus, Edit, Trash2, 
  Image, DollarSign, Tag, Box, Shirt, Palette, FileImage,
  Music, Video, FileText, Gift, Star, Eye, ChevronRight, Loader2
} from "lucide-react";
import { API } from "@/config";
import { toast } from "sonner";

const MERCHANDISE_TYPES = {
  physical: { label: "Physical Product", icon: Package },
  digital: { label: "Digital Product", icon: Download }
};

const CATEGORIES = {
  // Physical
  apparel: { label: "Apparel", icon: Shirt, type: "physical" },
  accessories: { label: "Accessories", icon: Box, type: "physical" },
  posters: { label: "Posters & Prints", icon: Image, type: "physical" },
  collectibles: { label: "Collectibles", icon: Gift, type: "physical" },
  // Digital
  wallpapers: { label: "Wallpapers", icon: FileImage, type: "digital" },
  behind_scenes: { label: "Behind the Scenes", icon: Video, type: "digital" },
  soundtrack: { label: "Soundtrack", icon: Music, type: "digital" },
  scripts: { label: "Scripts", icon: FileText, type: "digital" },
  digital_art: { label: "Digital Art", icon: Palette, type: "digital" },
  exclusive_content: { label: "Exclusive Content", icon: Star, type: "digital" },
  shoutouts: { label: "Shoutouts", icon: Video, type: "digital" }
};

export const MerchandiseManager = ({ token }) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [orders, setOrders] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [activeTab, setActiveTab] = useState("products");
  
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    type: "physical",
    category: "apparel",
    price_coins: 100,
    sizes: [],
    colors: [],
    stock_quantity: 50,
    download_url: "",
    preview_url: ""
  });

  const fetchItems = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/merchandise/items/my`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setItems(res.data.items || []);
    } catch (e) {
      console.error("Error fetching merchandise:", e);
    }
    setLoading(false);
  }, [token]);

  const fetchOrders = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/merchandise/orders/creator/pending`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setOrders(res.data.orders || []);
    } catch (e) {
      console.error("Error fetching orders:", e);
    }
  }, [token]);

  const fetchAnalytics = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/merchandise/analytics`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAnalytics(res.data);
    } catch (e) {
      console.error("Error fetching analytics:", e);
    }
  }, [token]);

  useEffect(() => {
    fetchItems();
    fetchOrders();
    fetchAnalytics();
  }, [fetchItems, fetchOrders, fetchAnalytics]);

  const handleCreate = async () => {
    try {
      const payload = {
        ...formData,
        images: [],
        sizes: formData.type === "physical" ? formData.sizes : null,
        colors: formData.type === "physical" ? formData.colors : null,
        stock_quantity: formData.type === "physical" ? formData.stock_quantity : null,
        download_url: formData.type === "digital" ? formData.download_url : null,
        preview_url: formData.type === "digital" ? formData.preview_url : null
      };
      
      await axios.post(`${API}/merchandise/items`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast.success("Product created successfully!");
      setShowCreateDialog(false);
      resetForm();
      fetchItems();
      fetchAnalytics();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Failed to create product");
    }
  };

  const handleDelete = async (itemId) => {
    if (!confirm("Are you sure you want to delete this product?")) return;
    
    try {
      await axios.delete(`${API}/merchandise/items/${itemId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("Product deleted");
      fetchItems();
      fetchAnalytics();
    } catch (e) {
      toast.error("Failed to delete product");
    }
  };

  const updateOrderStatus = async (orderId, status, trackingNumber = null) => {
    try {
      await axios.patch(`${API}/merchandise/orders/${orderId}/status`, {
        status,
        tracking_number: trackingNumber
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success(`Order marked as ${status}`);
      fetchOrders();
    } catch (e) {
      toast.error("Failed to update order");
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      type: "physical",
      category: "apparel",
      price_coins: 100,
      sizes: [],
      colors: [],
      stock_quantity: 50,
      download_url: "",
      preview_url: ""
    });
    setEditingItem(null);
  };

  const openCreateDialog = () => {
    resetForm();
    setShowCreateDialog(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <ShoppingBag className="w-6 h-6 text-primary" />
            Merchandise Store
          </h2>
          <p className="text-sm text-muted-foreground">
            Sell physical and digital merchandise to your fans
          </p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="w-4 h-4 mr-2" />
          Add Product
        </Button>
      </div>

      {/* Analytics Summary */}
      {analytics && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-card border-white/10">
            <CardContent className="p-4 text-center">
              <Package className="w-8 h-8 mx-auto mb-2 text-blue-400" />
              <p className="text-2xl font-bold">{analytics.total_items}</p>
              <p className="text-xs text-muted-foreground">Products</p>
            </CardContent>
          </Card>
          <Card className="bg-card border-white/10">
            <CardContent className="p-4 text-center">
              <ShoppingBag className="w-8 h-8 mx-auto mb-2 text-green-400" />
              <p className="text-2xl font-bold">{analytics.total_orders}</p>
              <p className="text-xs text-muted-foreground">Orders</p>
            </CardContent>
          </Card>
          <Card className="bg-card border-white/10">
            <CardContent className="p-4 text-center">
              <DollarSign className="w-8 h-8 mx-auto mb-2 text-yellow-400" />
              <p className="text-2xl font-bold">{analytics.total_revenue_coins?.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Revenue (coins)</p>
            </CardContent>
          </Card>
          <Card className="bg-card border-white/10">
            <CardContent className="p-4 text-center">
              <Box className="w-8 h-8 mx-auto mb-2 text-purple-400" />
              <p className="text-2xl font-bold">{analytics.total_items_sold}</p>
              <p className="text-xs text-muted-foreground">Items Sold</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-secondary/50">
          <TabsTrigger value="products">Products ({items.length})</TabsTrigger>
          <TabsTrigger value="orders">Orders ({orders.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="products" className="mt-4">
          {items.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {items.map((item) => (
                <Card key={item.id} className="bg-card border-white/10 overflow-hidden">
                  <div className="h-32 bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
                    {item.type === "physical" ? (
                      <Package className="w-12 h-12 text-primary/50" />
                    ) : (
                      <Download className="w-12 h-12 text-primary/50" />
                    )}
                  </div>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="font-medium">{item.name}</h3>
                        <p className="text-sm text-muted-foreground capitalize">{item.category.replace("_", " ")}</p>
                      </div>
                      <span className="text-lg font-bold text-yellow-400">{item.price_coins}</span>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{item.description}</p>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Eye className="w-3 h-3" />
                        {item.sold_count} sold
                      </span>
                      {item.type === "physical" && item.stock_quantity !== null && (
                        <span>{item.stock_quantity} in stock</span>
                      )}
                    </div>
                    <div className="flex gap-2 mt-3">
                      <Button variant="outline" size="sm" className="flex-1" onClick={() => {
                        setEditingItem(item);
                        setFormData({
                          ...item,
                          sizes: item.sizes || [],
                          colors: item.colors || []
                        });
                        setShowCreateDialog(true);
                      }}>
                        <Edit className="w-3 h-3 mr-1" />
                        Edit
                      </Button>
                      <Button variant="outline" size="sm" className="text-red-400 hover:text-red-300" onClick={() => handleDelete(item.id)}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="bg-card border-white/10">
              <CardContent className="p-8 text-center">
                <ShoppingBag className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
                <h3 className="font-medium mb-2">No Products Yet</h3>
                <p className="text-sm text-muted-foreground mb-4">Start selling merchandise to your fans!</p>
                <Button onClick={openCreateDialog}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Your First Product
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="orders" className="mt-4">
          {orders.length > 0 ? (
            <div className="space-y-3">
              {orders.map((order) => (
                <Card key={order.id} className="bg-card border-white/10">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="font-medium">Order #{order.id.slice(-8)}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(order.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        order.status === "pending" ? "bg-yellow-500/20 text-yellow-400" :
                        order.status === "processing" ? "bg-blue-500/20 text-blue-400" :
                        order.status === "shipped" ? "bg-purple-500/20 text-purple-400" :
                        "bg-green-500/20 text-green-400"
                      }`}>
                        {order.status}
                      </span>
                    </div>
                    <div className="space-y-2 mb-3">
                      {order.items?.map((item, i) => (
                        <div key={i} className="flex items-center justify-between text-sm">
                          <span>{item.merchandise_name} x{item.quantity}</span>
                          <span className="text-yellow-400">{item.total_price_coins} coins</span>
                        </div>
                      ))}
                    </div>
                    {order.shipping_address && (
                      <div className="text-xs text-muted-foreground mb-3 p-2 bg-white/5 rounded">
                        <Truck className="w-3 h-3 inline mr-1" />
                        Ship to: {order.shipping_address.full_name}, {order.shipping_address.city}, {order.shipping_address.country}
                      </div>
                    )}
                    <div className="flex gap-2">
                      {order.status === "pending" && (
                        <Button size="sm" onClick={() => updateOrderStatus(order.id, "processing")}>
                          Mark Processing
                        </Button>
                      )}
                      {order.status === "processing" && (
                        <Button size="sm" onClick={() => updateOrderStatus(order.id, "shipped")}>
                          Mark Shipped
                        </Button>
                      )}
                      {order.status === "shipped" && (
                        <Button size="sm" onClick={() => updateOrderStatus(order.id, "delivered")}>
                          Mark Delivered
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="bg-card border-white/10">
              <CardContent className="p-8 text-center">
                <Truck className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
                <p className="text-muted-foreground">No pending orders</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Create/Edit Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-lg bg-card border-white/10 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingItem ? "Edit Product" : "Add New Product"}</DialogTitle>
            <DialogDescription>
              Create merchandise to sell to your fans
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-4">
            {/* Type Selection */}
            <div className="grid grid-cols-2 gap-3">
              {Object.entries(MERCHANDISE_TYPES).map(([key, { label, icon: Icon }]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setFormData({ ...formData, type: key, category: key === "physical" ? "apparel" : "wallpapers" })}
                  className={`p-4 rounded-lg border text-center transition-all ${
                    formData.type === key 
                      ? "border-primary bg-primary/10" 
                      : "border-white/10 hover:border-white/20"
                  }`}
                >
                  <Icon className="w-6 h-6 mx-auto mb-2" />
                  <p className="text-sm font-medium">{label}</p>
                </button>
              ))}
            </div>

            {/* Category */}
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Category</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full h-10 px-3 rounded-lg bg-secondary/50 border border-white/10"
              >
                {Object.entries(CATEGORIES)
                  .filter(([_, cat]) => cat.type === formData.type)
                  .map(([key, { label }]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
              </select>
            </div>

            {/* Name & Description */}
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Product Name</label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Official Series T-Shirt"
                className="bg-secondary/50 border-white/10"
              />
            </div>

            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe your product..."
                className="w-full h-20 px-3 py-2 rounded-lg bg-secondary/50 border border-white/10 resize-none"
              />
            </div>

            {/* Price */}
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Price (in coins)</label>
              <Input
                type="number"
                value={formData.price_coins}
                onChange={(e) => setFormData({ ...formData, price_coins: parseInt(e.target.value) || 0 })}
                min="1"
                className="bg-secondary/50 border-white/10"
              />
            </div>

            {/* Physical Product Options */}
            {formData.type === "physical" && (
              <>
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">Stock Quantity</label>
                  <Input
                    type="number"
                    value={formData.stock_quantity}
                    onChange={(e) => setFormData({ ...formData, stock_quantity: parseInt(e.target.value) || 0 })}
                    min="0"
                    className="bg-secondary/50 border-white/10"
                  />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">Available Sizes (comma-separated)</label>
                  <Input
                    value={formData.sizes?.join(", ") || ""}
                    onChange={(e) => setFormData({ ...formData, sizes: e.target.value.split(",").map(s => s.trim()).filter(Boolean) })}
                    placeholder="S, M, L, XL"
                    className="bg-secondary/50 border-white/10"
                  />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">Available Colors (comma-separated)</label>
                  <Input
                    value={formData.colors?.join(", ") || ""}
                    onChange={(e) => setFormData({ ...formData, colors: e.target.value.split(",").map(s => s.trim()).filter(Boolean) })}
                    placeholder="Black, White, Navy"
                    className="bg-secondary/50 border-white/10"
                  />
                </div>
              </>
            )}

            {/* Digital Product Options */}
            {formData.type === "digital" && (
              <>
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">Preview URL (optional)</label>
                  <Input
                    value={formData.preview_url}
                    onChange={(e) => setFormData({ ...formData, preview_url: e.target.value })}
                    placeholder="https://..."
                    className="bg-secondary/50 border-white/10"
                  />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">Download URL</label>
                  <Input
                    value={formData.download_url}
                    onChange={(e) => setFormData({ ...formData, download_url: e.target.value })}
                    placeholder="https://..."
                    className="bg-secondary/50 border-white/10"
                  />
                </div>
              </>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setShowCreateDialog(false)}>
                Cancel
              </Button>
              <Button className="flex-1" onClick={handleCreate}>
                {editingItem ? "Update Product" : "Create Product"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MerchandiseManager;
