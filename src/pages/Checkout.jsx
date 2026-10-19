import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Check, ArrowLeft, CheckCircle2, XCircle } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

export default function Checkout() {
  const { token } = useParams();
  const { toast } = useToast();
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    base44.entities.StorePlan.filter({ checkout_token: token }).then((data) => {
      setPlan(data[0] || null);
      setLoading(false);
    });
  }, [token]);

  const handleSubscribe = async () => {
    if (!plan.stripe_price_id) {
      toast({
        title: "Checkout unavailable",
        description: "This plan isn't connected to Stripe yet. Please contact support.",
        variant: "destructive",
      });
      return;
    }
    setSubmitting(true);
    try {
      const res = await base44.functions.invoke("createCheckoutSession", {
        priceId: plan.stripe_price_id,
        successUrl: `${window.location.origin}/checkout/${token}?success=true`,
        cancelUrl: `${window.location.origin}/checkout/${token}?canceled=true`,
      });
      if (res.data?.url) {
        window.location.href = res.data.url;
      } else {
        throw new Error(res.data?.error || "Failed to start checkout");
      }
    } catch (err) {
      toast({
        title: "Checkout failed",
        description: err.message || "Something went wrong starting checkout.",
        variant: "destructive",
      });
      setSubmitting(false);
    }
  };

  if (loading) return <div className="p-8 text-zinc-300">Loading...</div>;

  if (!plan || !plan.is_active) {
    return (
      <div className="p-8 max-w-md mx-auto text-center">
        <p className="text-white font-medium mb-2">Plan not found</p>
        <p className="text-sm text-zinc-300 mb-4">This checkout link is invalid or no longer active.</p>
        <Link to="/store" className="text-lime-400 text-sm underline">Back to store</Link>
      </div>
    );
  }

  const urlParams = new URLSearchParams(window.location.search);
  const isSuccess = urlParams.get("success") === "true";
  const isCanceled = urlParams.get("canceled") === "true";

  return (
    <div className="p-6 md:p-8 max-w-lg mx-auto">
      <Link to="/store" className="inline-flex items-center gap-1 text-sm text-zinc-300 hover:text-white mb-6">
        <ArrowLeft className="w-4 h-4" /> Back to store
      </Link>
      {isSuccess && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-lime-500/30 bg-lime-500/10 px-4 py-3 text-sm text-lime-400">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> Payment successful! Your subscription is now active.
        </div>
      )}
      {isCanceled && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-800/50 px-4 py-3 text-sm text-zinc-300">
          <XCircle className="w-4 h-4 flex-shrink-0" /> Checkout was canceled. You have not been charged.
        </div>
      )}
      <div className="border border-zinc-800 rounded-xl bg-zinc-900/60 backdrop-blur-sm p-6">
        <h1 className="font-heading text-xl font-bold text-white">{plan.name}</h1>
        {plan.description && <p className="text-sm text-zinc-300 mt-1">{plan.description}</p>}
        <div className="mt-4 flex items-baseline gap-1">
          <span className="text-3xl font-bold text-white">${plan.price}</span>
          <span className="text-sm text-zinc-400">/{plan.billing_interval === "yearly" ? "yr" : "mo"}</span>
        </div>
        {plan.features?.length > 0 && (
          <ul className="mt-4 space-y-2">
            {plan.features.map((f, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-zinc-200">
                <Check className="w-4 h-4 text-lime-400 mt-0.5 flex-shrink-0" />
                {f}
              </li>
            ))}
          </ul>
        )}
        <Button className="mt-6 w-full" onClick={handleSubscribe} disabled={submitting || isSuccess}>
          {isSuccess ? "Subscribed" : submitting ? "Redirecting to checkout..." : "Subscribe"}
        </Button>
      </div>
    </div>
  );
}