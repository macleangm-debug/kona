import React, { useState, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import axios from "axios";
import {
  ChevronLeft, ShoppingBag, Package, Coins, Filter,
  Check, X, Truck, Download, Mail, Star
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useAuth } from "@/contexts/AuthContext";
import { API } from "@/config";
import { toast } from "sonner";

export const CreatorShopPage = () => {
  const { creatorId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, token, refreshUser } = useAuth();
  
  const initialType = searchParams.get("type") || "all";
  
  const [creator, setCreator] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState(initialType);
  
  // Purchase state
  const [selectedItem, setSelectedItem] = useState(null);
  const [showPurchaseSheet, setShowPurchaseSheet] = useState(false);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [shippingAddress, setShippingAddress] = useState({
    name: "",
    address: "",
    city: "",
    country: "",
    phone: ""
  });

  useEffect(() => {
    const fetchShop = async () => {
      try {
        const typeParam = filter !== "all" ? `?item_type=${filter}` : "";
        const response = await axios.get(`${API}/creators/${creatorId}/shop${typeParam}`);
        setCreator(response.data.creator);
        setItems(response.data.items || []);
      } catch (err) {
        toast.error("Failed to load shop");
      } finally {
        setLoading(false);
      }
    };

    fetchShop();
  }, [creatorId, filter]);

  const handlePurchase = async () => {
    if (!token) {
      toast.error("Please sign in to make purchases");
      navigate("/login");
      return;
    }

    if (!selectedItem) return;

    // Check if user has enough coins
    if ((user?.coins || 0) < selectedItem.price_coins) {
      toast.error("Not enough coins");
      return;
    }

    // Validate shipping for physical items
    if (selectedItem.type === "physical") {
      if (!shippingAddress.name || !shippingAddress.address || !shippingAddress.city || !shippingAddress.country) {
        toast.error("Please fill in all shipping details");
        return;
      }
    }

    setIsPurchasing(true);
    try {
      const response = await axios.post(
        `${API}/creators/${creatorId}/shop/purchase/${selectedItem.id}`,
        {
          shipping_address: selectedItem.type === "physical" ? shippingAddress : null,
          email: user?.email
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast.success(response.data.message || "Purchase successful!");
      setShowPurchaseSheet(false);
      setSelectedItem(null);

      // Refresh user balance
      if (refreshUser) {
        await refreshUser();
      }

      // If digital item with download, offer download
      if (response.data.download_url) {
        window.open(response.data.download_url, "_blank");
      }

      // Refresh items to update stock
      const typeParam = filter !== "all" ? `?item_type=${filter}` : "";
      const shopRes = await axios.get(`${API}/creators/${creatorId}/shop${typeParam}`);
      setItems(shopRes.data.items || []);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Purchase failed");
    } finally {
      setIsPurchasing(false);
    }
  };

  const openPurchaseSheet = (item) => {
    setSelectedItem(item);
    setShowPurchaseSheet(true);
  };

  const filteredItems = items.filter(item => 
    filter === "all" || item.type === filter
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin w-10 h-10 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24" data-testid="creator-shop-page">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b border-white/10">
        <div className="flex items-center justify-between px-4 py-3">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h1 className="font-bold">{creator?.display_name}'s Shop</h1>
          <div className="w-9" />
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 p-4 overflow-x-auto scrollbar-hide">
        {[
          { id: "all", label: "All", icon: ShoppingBag },
          { id: "digital", label: "Digital", icon: Download },
          { id: "physical", label: "Physical", icon: Package }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFilter(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              filter === tab.id
                ? "bg-primary text-primary-foreground"
                : "bg-white/10 hover:bg-white/20"
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Items Grid */}
      {filteredItems.length > 0 ? (
        <div className="grid grid-cols-2 gap-4 px-4">
          {filteredItems.map((item) => (
            <Card
              key={item.id}
              className="bg-white/5 border-white/10 overflow-hidden cursor-pointer hover:border-primary/50 transition-all"
              onClick={() => openPurchaseSheet(item)}
              data-testid={`shop-item-${item.id}`}
            >
              {/* Image */}
              <div className="aspect-square relative">
                <img
                  src={item.image_url || "/default-product.jpg"}
                  alt={item.title}
                  className="w-full h-full object-cover"
                />
                {/* Type badge */}
                <div className={`absolute top-2 left-2 px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                  item.type === "digital" 
                    ? "bg-purple-500" 
                    : "bg-blue-500"
                }`}>
                  {item.type}
                </div>
                {/* Stock badge for physical items */}
                {item.type === "physical" && item.stock !== null && (
                  <div className={`absolute top-2 right-2 px-2 py-0.5 rounded text-[10px] font-bold ${
                    item.stock > 0 ? "bg-green-500" : "bg-red-500"
                  }`}>
                    {item.stock > 0 ? `${item.stock} left` : "Sold out"}
                  </div>
                )}
              </div>
              
              {/* Info */}
              <div className="p-3">
                <h3 className="font-medium text-sm truncate">{item.title}</h3>
                {item.description && (
                  <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                    {item.description}
                  </p>
                )}
                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center gap-1 text-yellow-400 font-bold">
                    <Coins className="w-4 h-4" />
                    {item.price_coins}
                  </div>
                  {item.sold_count > 0 && (
                    <span className="text-[10px] text-muted-foreground">
                      {item.sold_count} sold
                    </span>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 px-4">
          <ShoppingBag className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-bold mb-2">No items yet</h3>
          <p className="text-muted-foreground">
            {creator?.display_name} hasn't added any {filter !== "all" ? filter : ""} items to their shop yet.
          </p>
        </div>
      )}

      {/* Purchase Sheet */}
      <Sheet open={showPurchaseSheet} onOpenChange={setShowPurchaseSheet}>
        <SheetContent side="bottom" className="bg-gray-900 border-white/10 rounded-t-3xl max-h-[90vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="text-white">Purchase Item</SheetTitle>
          </SheetHeader>

          {selectedItem && (
            <div className="py-4 space-y-4">
              {/* Item preview */}
              <div className="flex gap-4">
                <img
                  src={selectedItem.image_url || "/default-product.jpg"}
                  alt={selectedItem.title}
                  className="w-24 h-24 rounded-lg object-cover"
                />
                <div className="flex-1">
                  <h3 className="font-bold">{selectedItem.title}</h3>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {selectedItem.description}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      selectedItem.type === "digital" ? "bg-purple-500" : "bg-blue-500"
                    }`}>
                      {selectedItem.type}
                    </span>
                    {selectedItem.delivery_method === "download" && (
                      <span className="text-xs text-green-400 flex items-center gap-1">
                        <Download className="w-3 h-3" /> Instant download
                      </span>
                    )}
                    {selectedItem.delivery_method === "shipping" && (
                      <span className="text-xs text-blue-400 flex items-center gap-1">
                        <Truck className="w-3 h-3" /> Shipping required
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Shipping form for physical items */}
              {selectedItem.type === "physical" && (
                <div className="space-y-3 p-4 rounded-lg bg-white/5 border border-white/10">
                  <h4 className="font-medium flex items-center gap-2">
                    <Truck className="w-4 h-4" /> Shipping Address
                  </h4>
                  <Input
                    placeholder="Full Name"
                    value={shippingAddress.name}
                    onChange={(e) => setShippingAddress({...shippingAddress, name: e.target.value})}
                    className="bg-white/10 border-white/20"
                  />
                  <Input
                    placeholder="Street Address"
                    value={shippingAddress.address}
                    onChange={(e) => setShippingAddress({...shippingAddress, address: e.target.value})}
                    className="bg-white/10 border-white/20"
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      placeholder="City"
                      value={shippingAddress.city}
                      onChange={(e) => setShippingAddress({...shippingAddress, city: e.target.value})}
                      className="bg-white/10 border-white/20"
                    />
                    <Input
                      placeholder="Country"
                      value={shippingAddress.country}
                      onChange={(e) => setShippingAddress({...shippingAddress, country: e.target.value})}
                      className="bg-white/10 border-white/20"
                    />
                  </div>
                  <Input
                    placeholder="Phone Number"
                    value={shippingAddress.phone}
                    onChange={(e) => setShippingAddress({...shippingAddress, phone: e.target.value})}
                    className="bg-white/10 border-white/20"
                  />
                </div>
              )}

              {/* Price summary */}
              <div className="p-4 rounded-lg bg-white/5 border border-white/10 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Item price</span>
                  <span className="flex items-center gap-1">
                    <Coins className="w-4 h-4 text-yellow-400" />
                    {selectedItem.price_coins}
                  </span>
                </div>
                <div className="flex justify-between font-bold">
                  <span>Total</span>
                  <span className="flex items-center gap-1 text-yellow-400">
                    <Coins className="w-4 h-4" />
                    {selectedItem.price_coins}
                  </span>
                </div>
                <div className="border-t border-white/10 pt-2 flex justify-between text-sm">
                  <span className="text-muted-foreground">Your balance</span>
                  <span className={`flex items-center gap-1 ${
                    (user?.coins || 0) >= selectedItem.price_coins ? "text-green-400" : "text-red-400"
                  }`}>
                    <Coins className="w-4 h-4" />
                    {user?.coins || 0}
                  </span>
                </div>
              </div>

              {/* Purchase button */}
              <Button
                onClick={handlePurchase}
                disabled={isPurchasing || (user?.coins || 0) < selectedItem.price_coins || (selectedItem.type === "physical" && selectedItem.stock <= 0)}
                className="w-full bg-gradient-to-r from-primary to-purple-500"
              >
                {isPurchasing ? "Processing..." : 
                 (selectedItem.type === "physical" && selectedItem.stock <= 0) ? "Sold Out" :
                 `Buy for ${selectedItem.price_coins} Coins`}
              </Button>

              {(user?.coins || 0) < selectedItem.price_coins && (
                <p className="text-center text-sm text-red-400">
                  Not enough coins. <button onClick={() => navigate("/store")} className="underline text-primary">Get more</button>
                </p>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default CreatorShopPage;
