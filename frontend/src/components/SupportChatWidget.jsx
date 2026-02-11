import React, { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, Bot, User, Loader2, Trash2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const API_URL = process.env.REACT_APP_BACKEND_URL;

const SupportChatWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: "Hi! I'm Kona Assistant. How can I help you today? You can ask me about:\n\n• Account & login issues\n• Coins & rewards\n• Subscriptions & billing\n• How to use features\n• Troubleshooting"
    }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput("");
    setMessages(prev => [...prev, { role: "user", content: userMessage }]);
    setIsLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/support/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: sessionId,
          message: userMessage
        })
      });

      if (!response.ok) throw new Error("Failed to get response");

      const data = await response.json();
      setSessionId(data.session_id);
      setMessages(prev => [...prev, { role: "assistant", content: data.response }]);
    } catch (error) {
      setMessages(prev => [...prev, { 
        role: "assistant", 
        content: "I'm having trouble connecting right now. Please try again or create a support ticket for help." 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const clearChat = async () => {
    if (sessionId) {
      try {
        await fetch(`${API_URL}/api/support/chat/clear?session_id=${sessionId}`, {
          method: "POST"
        });
      } catch (e) {
        console.error("Failed to clear session");
      }
    }
    setSessionId(null);
    setMessages([{
      role: "assistant",
      content: "Chat cleared! How can I help you?"
    }]);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Quick action buttons
  const quickActions = [
    "How do I earn coins?",
    "Can't log in",
    "Subscription plans",
    "Video not playing"
  ];

  return (
    <>
      {/* Chat Widget Button - positioned in dedicated safe zone */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "fixed z-[60] w-11 h-11 rounded-full shadow-lg flex items-center justify-center transition-all duration-300",
          "right-4 bottom-[72px] sm:bottom-6 sm:right-6",
          isOpen 
            ? "bg-gray-700 hover:bg-gray-600" 
            : "bg-purple-600 hover:bg-purple-500 hover:scale-105"
        )}
        data-testid="support-chat-button"
        aria-label="Open support chat"
      >
        {isOpen ? (
          <X className="w-5 h-5 text-white" />
        ) : (
          <MessageCircle className="w-5 h-5 text-white" />
        )}
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div 
          className="fixed z-[60] w-[340px] max-w-[calc(100vw-2rem)] bg-[#1a1a2e] rounded-2xl shadow-2xl border border-white/10 flex flex-col overflow-hidden right-4 bottom-[130px] sm:bottom-20 sm:right-6"
          style={{ height: "400px", maxHeight: "calc(100vh - 180px)" }}
          data-testid="support-chat-window"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-purple-600 to-pink-600 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-white">Kona Assistant</h3>
                <p className="text-xs text-white/70">Always here to help</p>
              </div>
            </div>
            <button 
              onClick={clearChat}
              className="p-2 hover:bg-white/10 rounded-full transition-colors"
              title="Clear chat"
            >
              <RotateCcw className="w-4 h-4 text-white/70" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={cn(
                  "flex gap-2",
                  msg.role === "user" ? "justify-end" : "justify-start"
                )}
              >
                {msg.role === "assistant" && (
                  <div className="w-8 h-8 bg-purple-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                    <Bot className="w-4 h-4 text-purple-400" />
                  </div>
                )}
                <div
                  className={cn(
                    "max-w-[80%] rounded-2xl px-4 py-2.5 text-sm",
                    msg.role === "user"
                      ? "bg-purple-600 text-white rounded-br-md"
                      : "bg-white/10 text-gray-200 rounded-bl-md"
                  )}
                >
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                </div>
                {msg.role === "user" && (
                  <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center flex-shrink-0">
                    <User className="w-4 h-4 text-gray-300" />
                  </div>
                )}
              </div>
            ))}
            
            {isLoading && (
              <div className="flex gap-2 justify-start">
                <div className="w-8 h-8 bg-purple-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                  <Bot className="w-4 h-4 text-purple-400" />
                </div>
                <div className="bg-white/10 rounded-2xl rounded-bl-md px-4 py-3">
                  <Loader2 className="w-4 h-4 text-purple-400 animate-spin" />
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Actions - Only show at start */}
          {messages.length === 1 && (
            <div className="px-4 pb-2">
              <div className="flex flex-wrap gap-2">
                {quickActions.map((action, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setInput(action);
                      setTimeout(() => sendMessage(), 100);
                    }}
                    className="text-xs bg-white/5 hover:bg-white/10 border border-white/10 rounded-full px-3 py-1.5 text-gray-300 transition-colors"
                  >
                    {action}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input */}
          <div className="p-3 border-t border-white/10">
            <div className="flex items-center gap-2 bg-white/5 rounded-xl px-3 py-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type your message..."
                className="flex-1 bg-transparent text-white placeholder-gray-500 text-sm outline-none"
                disabled={isLoading}
              />
              <button
                onClick={sendMessage}
                disabled={!input.trim() || isLoading}
                className="p-2 bg-purple-600 hover:bg-purple-500 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-full transition-colors"
              >
                <Send className="w-4 h-4 text-white" />
              </button>
            </div>
            <p className="text-xs text-gray-500 text-center mt-2">
              Powered by AI · <button onClick={() => window.location.href = '/help'} className="text-purple-400 hover:underline">Visit Help Center</button>
            </p>
          </div>
        </div>
      )}
    </>
  );
};

export default SupportChatWidget;
