import React, { useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { Mail, Lock, ArrowLeft, CheckCircle, Loader2, KeyRound } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { API } from "@/config";
import { toast } from "sonner";

export const ForgotPasswordPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const resetToken = searchParams.get("token");
  
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [resetComplete, setResetComplete] = useState(false);

  const handleRequestReset = async (e) => {
    e.preventDefault();
    if (!email) {
      toast.error("Please enter your email");
      return;
    }
    
    setLoading(true);
    try {
      await axios.post(`${API}/auth/request-password-reset?email=${encodeURIComponent(email)}`);
      setEmailSent(true);
      toast.success("If an account exists, a reset link has been sent!");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to send reset email");
    }
    setLoading(false);
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    
    if (newPassword.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    
    if (newPassword !== confirmPassword) {
      toast.error("Passwords don't match");
      return;
    }
    
    setLoading(true);
    try {
      await axios.post(
        `${API}/auth/reset-password?token=${resetToken}&new_password=${encodeURIComponent(newPassword)}`
      );
      setResetComplete(true);
      toast.success("Password reset successfully!");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to reset password");
    }
    setLoading(false);
  };

  // If we have a reset token, show the reset form
  if (resetToken) {
    if (resetComplete) {
      return (
        <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
          <Card className="w-full max-w-md p-8 bg-gray-900/80 border-white/10 text-center">
            <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-green-500/20 flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-green-400" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Password Reset!</h1>
            <p className="text-white/60 mb-6">
              Your password has been successfully reset. You can now sign in with your new password.
            </p>
            <Button className="w-full" onClick={() => navigate("/")}>
              Go to Sign In
            </Button>
          </Card>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-8 bg-gray-900/80 border-white/10">
          <div className="text-center mb-8">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-purple-500/20 flex items-center justify-center">
              <KeyRound className="w-8 h-8 text-purple-400" />
            </div>
            <h1 className="text-2xl font-bold text-white">Create New Password</h1>
            <p className="text-white/60 mt-2">Enter your new password below</p>
          </div>

          <form onSubmit={handleResetPassword} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">
                New Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                <Input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimum 8 characters"
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                <Input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm your password"
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <KeyRound className="w-4 h-4 mr-2" />
              )}
              Reset Password
            </Button>
          </form>
        </Card>
      </div>
    );
  }

  // Email sent confirmation
  if (emailSent) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-8 bg-gray-900/80 border-white/10 text-center">
          <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-green-500/20 flex items-center justify-center">
            <Mail className="w-8 h-8 text-green-400" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Check Your Email</h1>
          <p className="text-white/60 mb-6">
            If an account exists with <span className="text-white">{email}</span>, 
            we've sent a password reset link. Check your inbox (and spam folder).
          </p>
          <p className="text-sm text-white/40 mb-6">
            The link expires in 1 hour.
          </p>
          <Button variant="outline" onClick={() => setEmailSent(false)}>
            Try Another Email
          </Button>
        </Card>
      </div>
    );
  }

  // Request reset form
  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8 bg-gray-900/80 border-white/10">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-white/60 hover:text-white mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-purple-500/20 flex items-center justify-center">
            <Lock className="w-8 h-8 text-purple-400" />
          </div>
          <h1 className="text-2xl font-bold text-white">Forgot Password?</h1>
          <p className="text-white/60 mt-2">
            No worries! Enter your email and we'll send you a reset link.
          </p>
        </div>

        <form onSubmit={handleRequestReset} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                className="pl-10"
                required
              />
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Mail className="w-4 h-4 mr-2" />
            )}
            Send Reset Link
          </Button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-white/40">
            Remember your password?{" "}
            <button
              onClick={() => navigate("/")}
              className="text-purple-400 hover:text-purple-300"
            >
              Sign In
            </button>
          </p>
        </div>
      </Card>
    </div>
  );
};

export default ForgotPasswordPage;
