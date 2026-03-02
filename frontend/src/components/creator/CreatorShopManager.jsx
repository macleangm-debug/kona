import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import {
  Plus, Edit2, Trash2, Package, Download, ShoppingBag,
  Coins, Image as ImageIcon, Eye, EyeOff, Truck, Mail,
  ChevronRight, MoreVertical, Save, X, AlertCircle, Check
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { API } from "@/config";
import { toast } from "sonner";

const ITEM_TYPES = [
  { id: "digital", label: "Digital", icon: Download, description: "Downloads, videos, documents" },
  { id: "physical", label: "Physical", icon: Package, description: "Merch, posters, collectibles" }
];

const DELIVERY_METHODS = {
  digital: [
    { id: "download", label: "Direct Download", description: "User downloads the file" },
    { id: "email", label: "Email Delivery", description: "Sent to user's email" }
  ],
  physical: [
    { id: "shipping", label: "Shipping Required", description: "You ship to buyer's address" }
  ]
};

export const CreatorShopManager = ({ token }) => {
  const [items, setItems] = useState([]);
  const [orders, setOrders] = useState([]);
  const [stats, setStats] = useState({ total_items: 0, total_sales: 0, total_revenue: 0 });
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState("items"); // items, orders
  const [filter, setFilter] = useState("all"); // all, digital, physical
  
  // Create/Edit item state
  const [showItemDialog, setShowItemDialog] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [itemForm, setItemForm] = useState({
    type: "digital",
    title: "",
    description: "",
    price_coins: 100,
    image_url: "",
    stock: null,
    delivery_method: "download",
    download_url: ""
  });
  const [saving, setSaving] = useState(false);

  // Order details
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showOrderSheet, setShowOrderSheet] = useState(false);
  const [fulfilling, setFulfilling] = useState(false);
  const [trackingNumber, setTrackingNumber] = useState("");

  const fetchData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [itemsRes, ordersRes] = await Promise.all([
        axios.get(`${API}/creators/shop/my-items?include_inactive=true`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${API}/creators/shop/my-orders?limit=50`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);
      setItems(itemsRes.data.items || []);
      setStats(itemsRes.data.stats || { total_items: 0, total_sales: 0, total_revenue: 0 });
      setOrders(ordersRes.data || []);
    } catch (err) {
      console.error("Failed to fetch shop data:", err);
      toast.error("Failed to load shop data");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const resetForm = () => {
    setItemForm({
      type: "digital",
      title: "",
      description: "",
      price_coins: 100,
      image_url: "",
      stock: null,
      delivery_method: "download",
      download_url: ""
    });
    setEditingItem(null);
  };

  const openCreateDialog = () => {
    resetForm();
    setShowItemDialog(true);
  };

  const openEditDialog = (item) => {
    setEditingItem(item);
    setItemForm({
      type: item.type,
      title: item.title,
      description: item.description || "",
      price_coins: item.price_coins,
      image_url: item.image_url || "",
      stock: item.stock,
      delivery_method: item.delivery_method || (item.type === "digital" ? "download" : "shipping"),
      download_url: item.download_url || ""
    });
    setShowItemDialog(true);
  };

  const handleSaveItem = async () => {
    if (!itemForm.title || itemForm.title.length < 3) {
      toast.error("Title must be at least 3 characters");
      return;
    }
    if (itemForm.price_coins < 1) {
      toast.error("Price must be at least 1 coin");
      return;
    }

    setSaving(true);
    try {
      // Get creator ID first
      const statusRes = await axios.get(`${API}/creator/status`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const creatorId = statusRes.data.creator_id;

      if (editingItem) {
        // Update existing item
        await axios.patch(
          `${API}/creators/${creatorId}/shop/items/${editingItem.id}`,
          {
            title: itemForm.title,
            description: itemForm.description || null,
            price_coins: itemForm.price_coins,
            image_url: itemForm.image_url || null,
            stock: itemForm.type === "physical" ? itemForm.stock : null,
            download_url: itemForm.type === "digital" ? itemForm.download_url : null
          },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        toast.success("Item updated!");
      } else {
        // Create new item
        await axios.post(
          `${API}/creators/${creatorId}/shop/items`,
          {
            type: itemForm.type,
            title: itemForm.title,
            description: itemForm.description || null,
            price_coins: itemForm.price_coins,
            image_url: itemForm.image_url || null,
            stock: itemForm.type === "physical" ? itemForm.stock : null,
            delivery_method: itemForm.delivery_method,
            download_url: itemForm.type === "digital" ? itemForm.download_url : null
          },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        toast.success("Item created!");
      }

      setShowItemDialog(false);
      resetForm();
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to save item");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteItem = async (item) => {
    if (!confirm(`Delete "${item.title}"? This cannot be undone.`)) return;

    try {
      const statusRes = await axios.get(`${API}/creator/status`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const creatorId = statusRes.data.creator_id;

      await axios.delete(
        `${API}/creators/${creatorId}/shop/items/${item.id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success("Item deleted");
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to delete item");
    }
  };

  const handleToggleActive = async (item) => {
    try {
      const statusRes = await axios.get(`${API}/creator/status`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const creatorId = statusRes.data.creator_id;

      await axios.patch(
        `${API}/creators/${creatorId}/shop/items/${item.id}`,
        { active: !item.active },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(item.active ? "Item hidden from shop" : "Item visible in shop");
      fetchData();
    } catch (err) {
      toast.error("Failed to update item");
    }
  };

  const openOrderDetails = (order) => {
    setSelectedOrder(order);
    setTrackingNumber(order.tracking_number || "");
    setShowOrderSheet(true);
  };

  const handleFulfillOrder = async () => {
    if (!selectedOrder) return;

    setFulfilling(true);
    try {
      await axios.patch(
        `${API}/creators/shop/orders/${selectedOrder.id}/fulfill`,
        { tracking_number: trackingNumber || null },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success("Order marked as shipped!");
      setShowOrderSheet(false);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to fulfill order");
    } finally {
      setFulfilling(false);
    }
  };

  const filteredItems = items.filter(item => 
    filter === "all" || item.type === filter
  );

  const pendingOrders = orders.filter(o => o.status === "pending");
  const completedOrders = orders.filter(o => o.status !== "pending");

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="creator-shop-manager">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-500/20">
          <ShoppingBag className="w-5 h-5 text-purple-400 mb-2" />
          <p className="text-2xl font-bold">{stats.total_items}</p>
          <p className="text-xs text-muted-foreground">Shop Items</p>
        </Card>
        <Card className="p-4 bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border-blue-500/20">
          <Package className="w-5 h-5 text-blue-400 mb-2" />
          <p className="text-2xl font-bold">{stats.total_sales}</p>
          <p className="text-xs text-muted-foreground">Total Sales</p>
        </Card>
        <Card className="p-4 bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border-yellow-500/20">
          <Coins className="w-5 h-5 text-yellow-400 mb-2" />
          <p className="text-2xl font-bold">{stats.total_revenue?.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground">Revenue (coins)</p>
        </Card>
        <Card className="p-4 bg-gradient-to-br from-red-500/10 to-orange-500/10 border-red-500/20">
          <Truck className="w-5 h-5 text-red-400 mb-2" />
          <p className="text-2xl font-bold">{pendingOrders.length}</p>
          <p className="text-xs text-muted-foreground">Pending Orders</p>
        </Card>
      </div>

      {/* View Tabs & Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex gap-2">
          <Button
            variant={activeView === "items" ? "default" : "outline"}
            onClick={() => setActiveView("items")}
            size="sm"
          >
            <ShoppingBag className="w-4 h-4 mr-2" />
            Items ({items.length})
          </Button>
          <Button
            variant={activeView === "orders" ? "default" : "outline"}
            onClick={() => setActiveView("orders")}
            size="sm"
            className={pendingOrders.length > 0 ? "relative" : ""}
          >
            <Package className="w-4 h-4 mr-2" />
            Orders
            {pendingOrders.length > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                {pendingOrders.length}
              </span>
            )}
          </Button>
        </div>
        
        {activeView === "items" && (
          <Button onClick={openCreateDialog} data-testid="add-item-btn">
            <Plus className="w-4 h-4 mr-2" />
            Add Item
          </Button>
        )}
      </div>

      {/* Items View */}
      {activeView === "items" && (
        <>
          {/* Filter Tabs */}
          <div className="flex gap-2">
            {[
              { id: "all", label: "All" },
              { id: "digital", label: "Digital" },
              { id: "physical", label: "Physical" }
            ].map(f => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                  filter === f.id 
                    ? "bg-primary text-primary-foreground" 
                    : "bg-white/10 hover:bg-white/20"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Items Grid */}
          {filteredItems.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredItems.map(item => (
                <Card 
                  key={item.id} 
                  className={`overflow-hidden ${!item.active ? "opacity-60" : ""}`}
                  data-testid={`shop-item-${item.id}`}
                >
                  {/* Image */}
                  <div className="aspect-video bg-white/5 relative">
                    {item.image_url ? (
                      <img 
                        src={item.image_url} 
                        alt={item.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ImageIcon className="w-12 h-12 text-muted-foreground" />
                      </div>
                    )}
                    
                    {/* Type Badge */}
                    <span className={`absolute top-2 left-2 px-2 py-0.5 rounded text-xs font-bold uppercase ${
                      item.type === "digital" ? "bg-purple-500" : "bg-blue-500"
                    }`}>
                      {item.type}
                    </span>
                    
                    {/* Inactive Badge */}
                    {!item.active && (
                      <span className="absolute top-2 right-2 px-2 py-0.5 rounded text-xs font-bold bg-gray-500">
                        Hidden
                      </span>
                    )}
                  </div>

                  {/* Info */}
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium truncate">{item.title}</h3>
                        {item.description && (
                          <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                            {item.description}
                          </p>
                        )}
                      </div>
                      
                      {/* Actions Menu */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="shrink-0">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEditDialog(item)}>
                            <Edit2 className="w-4 h-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleToggleActive(item)}>
                            {item.active ? (
                              <>
                                <EyeOff className="w-4 h-4 mr-2" />
                                Hide from Shop
                              </>
                            ) : (
                              <>
                                <Eye className="w-4 h-4 mr-2" />
                                Show in Shop
                              </>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleDeleteItem(item)}
                            className="text-red-400"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    {/* Stats Row */}
                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/10">
                      <div className="flex items-center gap-1 text-yellow-400 font-bold">
                        <Coins className="w-4 h-4" />
                        {item.price_coins}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span>{item.sold_count || 0} sold</span>
                        {item.type === "physical" && item.stock !== null && (
                          <span className={item.stock <= 5 ? "text-red-400" : ""}>
                            {item.stock} left
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="p-8 text-center">
              <ShoppingBag className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-medium mb-2">No items yet</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Create your first shop item to start earning
              </p>
              <Button onClick={openCreateDialog}>
                <Plus className="w-4 h-4 mr-2" />
                Add Item
              </Button>
            </Card>
          )}
        </>
      )}

      {/* Orders View */}
      {activeView === "orders" && (
        <div className="space-y-6">
          {/* Pending Orders */}
          {pendingOrders.length > 0 && (
            <div>
              <h3 className="font-medium mb-3 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-yellow-400" />
                Pending Orders ({pendingOrders.length})
              </h3>
              <div className="space-y-2">
                {pendingOrders.map(order => (
                  <Card 
                    key={order.id}
                    className="p-4 cursor-pointer hover:border-primary/50 transition-colors"
                    onClick={() => openOrderDetails(order)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="font-medium">{order.item_title}</p>
                        <p className="text-sm text-muted-foreground">
                          {order.user_email} • {new Date(order.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="px-2 py-1 rounded bg-yellow-500/20 text-yellow-400 text-xs font-bold">
                          PENDING
                        </span>
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Completed Orders */}
          <div>
            <h3 className="font-medium mb-3 flex items-center gap-2">
              <Check className="w-4 h-4 text-green-400" />
              Completed Orders ({completedOrders.length})
            </h3>
            {completedOrders.length > 0 ? (
              <div className="space-y-2">
                {completedOrders.slice(0, 20).map(order => (
                  <Card 
                    key={order.id}
                    className="p-4 cursor-pointer hover:border-primary/50 transition-colors"
                    onClick={() => openOrderDetails(order)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="font-medium">{order.item_title}</p>
                        <p className="text-sm text-muted-foreground">
                          {order.user_email} • {new Date(order.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="px-2 py-1 rounded bg-green-500/20 text-green-400 text-xs font-bold uppercase">
                          {order.status}
                        </span>
                        <span className="text-yellow-400 font-bold flex items-center gap-1">
                          <Coins className="w-3 h-3" />
                          {order.creator_received}
                        </span>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="p-6 text-center text-muted-foreground">
                No completed orders yet
              </Card>
            )}
          </div>
        </div>
      )}

      {/* Create/Edit Item Dialog */}
      <Dialog open={showItemDialog} onOpenChange={setShowItemDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingItem ? "Edit Item" : "Add Shop Item"}</DialogTitle>
            <DialogDescription>
              {editingItem 
                ? "Update your item details" 
                : "Create a new item for your shop"
              }
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            {/* Type Selection (only for new items) */}
            {!editingItem && (
              <div>
                <label className="text-sm text-muted-foreground mb-2 block">Item Type</label>
                <div className="grid grid-cols-2 gap-3">
                  {ITEM_TYPES.map(type => {
                    const Icon = type.icon;
                    return (
                      <button
                        key={type.id}
                        onClick={() => setItemForm({
                          ...itemForm, 
                          type: type.id,
                          delivery_method: type.id === "digital" ? "download" : "shipping",
                          stock: type.id === "physical" ? 10 : null
                        })}
                        className={`p-4 rounded-lg border-2 text-left transition-colors ${
                          itemForm.type === type.id 
                            ? "border-primary bg-primary/10" 
                            : "border-white/10 hover:border-white/30"
                        }`}
                      >
                        <Icon className={`w-5 h-5 mb-2 ${
                          itemForm.type === type.id ? "text-primary" : "text-muted-foreground"
                        }`} />
                        <p className="font-medium">{type.label}</p>
                        <p className="text-xs text-muted-foreground">{type.description}</p>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Title */}
            <div>
              <label className="text-sm text-muted-foreground">Title *</label>
              <Input
                value={itemForm.title}
                onChange={(e) => setItemForm({...itemForm, title: e.target.value})}
                placeholder="e.g., Behind the Scenes Documentary"
                className="mt-1"
              />
            </div>

            {/* Description */}
            <div>
              <label className="text-sm text-muted-foreground">Description</label>
              <textarea
                value={itemForm.description}
                onChange={(e) => setItemForm({...itemForm, description: e.target.value})}
                placeholder="Describe what buyers will get..."
                className="w-full mt-1 p-3 rounded-lg bg-secondary/50 border border-white/10 text-sm resize-none"
                rows={3}
              />
            </div>

            {/* Price */}
            <div>
              <label className="text-sm text-muted-foreground">Price (coins) *</label>
              <Input
                type="number"
                value={itemForm.price_coins}
                onChange={(e) => setItemForm({...itemForm, price_coins: Math.max(1, parseInt(e.target.value) || 0)})}
                min={1}
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                You'll receive 85% ({Math.floor(itemForm.price_coins * 0.85)} coins) per sale
              </p>
            </div>

            {/* Image URL */}
            <div>
              <label className="text-sm text-muted-foreground">Image URL</label>
              <Input
                value={itemForm.image_url}
                onChange={(e) => setItemForm({...itemForm, image_url: e.target.value})}
                placeholder="https://example.com/image.jpg"
                className="mt-1"
              />
              {itemForm.image_url && (
                <img 
                  src={itemForm.image_url} 
                  alt="Preview" 
                  className="mt-2 w-full h-32 object-cover rounded-lg"
                  onError={(e) => e.target.style.display = 'none'}
                />
              )}
            </div>

            {/* Digital Item Fields */}
            {itemForm.type === "digital" && (
              <>
                <div>
                  <label className="text-sm text-muted-foreground">Delivery Method</label>
                  <select
                    value={itemForm.delivery_method}
                    onChange={(e) => setItemForm({...itemForm, delivery_method: e.target.value})}
                    className="w-full mt-1 p-3 rounded-lg bg-secondary/50 border border-white/10 text-sm"
                  >
                    {DELIVERY_METHODS.digital.map(m => (
                      <option key={m.id} value={m.id}>{m.label}</option>
                    ))}
                  </select>
                </div>

                {itemForm.delivery_method === "download" && (
                  <div>
                    <label className="text-sm text-muted-foreground">Download URL</label>
                    <Input
                      value={itemForm.download_url}
                      onChange={(e) => setItemForm({...itemForm, download_url: e.target.value})}
                      placeholder="https://example.com/file.zip"
                      className="mt-1"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Buyers will be able to download from this URL after purchase
                    </p>
                  </div>
                )}
              </>
            )}

            {/* Physical Item Fields */}
            {itemForm.type === "physical" && (
              <div>
                <label className="text-sm text-muted-foreground">Stock Quantity</label>
                <Input
                  type="number"
                  value={itemForm.stock || ""}
                  onChange={(e) => setItemForm({...itemForm, stock: parseInt(e.target.value) || null})}
                  placeholder="Leave empty for unlimited"
                  min={0}
                  className="mt-1"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Set to 0 to mark as sold out. Leave empty for unlimited.
                </p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <Button 
                variant="outline" 
                onClick={() => setShowItemDialog(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleSaveItem} 
                disabled={saving}
                className="flex-1"
              >
                {saving ? "Saving..." : editingItem ? "Update Item" : "Create Item"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Order Details Sheet */}
      <Sheet open={showOrderSheet} onOpenChange={setShowOrderSheet}>
        <SheetContent side="right" className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Order Details</SheetTitle>
          </SheetHeader>

          {selectedOrder && (
            <div className="mt-6 space-y-6">
              {/* Order Info */}
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Order ID</span>
                  <span className="font-mono text-sm">{selectedOrder.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Item</span>
                  <span className="font-medium">{selectedOrder.item_title}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Type</span>
                  <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${
                    selectedOrder.item_type === "digital" ? "bg-purple-500" : "bg-blue-500"
                  }`}>
                    {selectedOrder.item_type}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Price Paid</span>
                  <span className="flex items-center gap-1 text-yellow-400 font-bold">
                    <Coins className="w-4 h-4" />
                    {selectedOrder.price_paid}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Your Earnings</span>
                  <span className="flex items-center gap-1 text-green-400 font-bold">
                    <Coins className="w-4 h-4" />
                    {selectedOrder.creator_received}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status</span>
                  <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${
                    selectedOrder.status === "pending" 
                      ? "bg-yellow-500/20 text-yellow-400"
                      : "bg-green-500/20 text-green-400"
                  }`}>
                    {selectedOrder.status}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Date</span>
                  <span>{new Date(selectedOrder.created_at).toLocaleString()}</span>
                </div>
              </div>

              {/* Buyer Info */}
              <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                <h4 className="font-medium mb-3">Buyer Information</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Email</span>
                    <span>{selectedOrder.user_email}</span>
                  </div>
                </div>
              </div>

              {/* Shipping Address (for physical items) */}
              {selectedOrder.item_type === "physical" && selectedOrder.shipping_address && (
                <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    <Truck className="w-4 h-4" />
                    Shipping Address
                  </h4>
                  <div className="text-sm space-y-1">
                    <p>{selectedOrder.shipping_address.name}</p>
                    <p>{selectedOrder.shipping_address.address}</p>
                    <p>{selectedOrder.shipping_address.city}, {selectedOrder.shipping_address.country}</p>
                    {selectedOrder.shipping_address.phone && (
                      <p className="text-muted-foreground">{selectedOrder.shipping_address.phone}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Fulfillment Section */}
              {selectedOrder.status === "pending" && selectedOrder.item_type === "physical" && (
                <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
                  <h4 className="font-medium mb-3">Fulfill Order</h4>
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm text-muted-foreground">Tracking Number (optional)</label>
                      <Input
                        value={trackingNumber}
                        onChange={(e) => setTrackingNumber(e.target.value)}
                        placeholder="Enter tracking number"
                        className="mt-1"
                      />
                    </div>
                    <Button 
                      onClick={handleFulfillOrder}
                      disabled={fulfilling}
                      className="w-full"
                    >
                      {fulfilling ? "Processing..." : "Mark as Shipped"}
                    </Button>
                  </div>
                </div>
              )}

              {/* Already Fulfilled */}
              {selectedOrder.status === "shipped" && selectedOrder.tracking_number && (
                <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/30">
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-400" />
                    Order Shipped
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    Tracking: {selectedOrder.tracking_number}
                  </p>
                  {selectedOrder.fulfilled_at && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Shipped on {new Date(selectedOrder.fulfilled_at).toLocaleDateString()}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default CreatorShopManager;
