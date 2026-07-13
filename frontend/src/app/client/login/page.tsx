"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, Mail, ChevronRight, AlertCircle, ShoppingBag } from "lucide-react";
import Link from "next/link";

export default function ClientLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    // Simulate login authentication checks after a delay
    setTimeout(() => {
      if (email.trim().toLowerCase() === "admin@cafemocha.com" && password === "mocha123") {
        localStorage.setItem("client_logged_in", "true");
        localStorage.setItem("client_email", email);
        router.push("/client/dashboard");
      } else {
        setError("Invalid email/password credential. Tip: admin@cafemocha.com & mocha123");
        setIsSubmitting(false);
      }
    }, 1200);
  };

  return (
    <div className="min-h-screen text-white flex flex-col items-center justify-center p-4 bg-radial-to-b from-brand-from to-brand-to">
      
      {/* Brand logo details */}
      <Link href="/" className="flex items-center gap-2 mb-8 cursor-pointer select-none">
        <div className="w-10 h-10 rounded-2xl bg-accent-brand flex items-center justify-center shadow-lg shadow-accent-brand/35">
          <ShoppingBag className="w-5 h-5 text-white" />
        </div>
        <div>
          <span className="text-lg font-extrabold tracking-wider uppercase block">
            Menu Book
          </span>
          <span className="text-[10px] text-text-muted font-bold tracking-widest uppercase block -mt-1">
            Merchant Desk
          </span>
        </div>
      </Link>

      <div className="w-full max-w-sm glass-panel border border-white/10 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
        <div className="absolute -top-12 -left-12 w-24 h-24 bg-accent-brand/10 rounded-full blur-xl pointer-events-none" />
        
        <h2 className="text-xl font-bold tracking-tight text-white mb-1">
          Welcome Back
        </h2>
        <p className="text-xs text-text-muted mb-6">
          Access your restaurant control panel to update dishes.
        </p>

        {error && (
          <div className="flex items-start gap-2 bg-accent-brand/10 border border-accent-brand/20 text-accent-brand text-xs p-3 rounded-xl mb-4 animate-shake">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          
          {/* Email input field */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-text-muted font-bold uppercase tracking-wider pl-1">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@cafemocha.com"
                className="w-full bg-[#111111]/90 text-white placeholder-text-muted/60 text-sm pl-11 pr-4 py-3.5 rounded-full border border-white/10 outline-none focus:border-accent-brand transition-all duration-300"
              />
            </div>
          </div>

          {/* Password input field */}
          <div className="flex flex-col gap-1.5 col-span-1">
            <div className="flex justify-between items-center px-1">
              <label className="text-xs text-text-muted font-bold uppercase tracking-wider">
                Password
              </label>
              <span className="text-[10px] text-accent-brand/70 font-semibold lowercase italic">
                mocha123
              </span>
            </div>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-[#111111]/90 text-white placeholder-text-muted/60 text-sm pl-11 pr-4 py-3.5 rounded-full border border-white/10 outline-none focus:border-accent-brand transition-all duration-300"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className={`
              w-full py-3.5 mt-2 rounded-full font-bold text-sm tracking-wide text-white border-0 flex items-center justify-center gap-2 cursor-pointer transition-all duration-300
              ${
                isSubmitting
                  ? "bg-accent-brand/50 cursor-wait"
                  : "bg-accent-brand hover:bg-accent-brand-hover active:scale-95 shadow-lg shadow-accent-brand/20 hover:shadow-accent-brand/35"
              }
            `}
          >
            {isSubmitting ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <span>Sign In to Desk</span>
                <ChevronRight className="w-4 h-4" />
              </>
            )}
          </button>

        </form>
      </div>

      <div className="mt-8 text-center text-xs text-text-muted flex flex-col gap-1.5">
        <span>Standard Credentials for Demo Review:</span>
        <span className="font-mono text-white/80 bg-white/5 border border-white/5 py-1 px-3 rounded-full">
          Email: <span className="text-info-kcal">admin@cafemocha.com</span> / Pass: <span className="text-star-gold">mocha123</span>
        </span>
      </div>

    </div>
  );
}
