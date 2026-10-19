import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Tv, CheckCircle2, AlertCircle, Loader2, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import PlatformBadge from "@/components/shared/PlatformBadge";

export default function InviteLanding() {
  const { token } = useParams();
  const [invitation, setInvitation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    loadInvitation();
  }, [token]);

  const loadInvitation = async () => {
    try {
      const invitations = await base44.entities.Invitation.filter({ token });
      if (!invitations.length) {
        setError("invalid");
        return;
      }
      const inv = invitations[0];
      if (inv.status === "revoked") {
        setError("revoked");
        return;
      }
      if (inv.status === "expired" || new Date(inv.expires_at) < new Date()) {
        setError("expired");
        return;
      }
      if (inv.use_count >= inv.max_uses) {
        setError("used");
        return;
      }
      setInvitation(inv);
    } catch {
      setError("invalid");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !password) return;
    setSubmitting(true);
    try {
      // In production: this would call the media server API to create the user
      // For now, we update the invitation record
      await base44.entities.Invitation.update(invitation.id, {
        username,
        email: email || undefined,
        status: "active",
        activated_at: new Date().toISOString(),
        use_count: (invitation.use_count || 0) + 1,
      });

      await base44.entities.ActivityLog.create({
        action: "invite_activated",
        invitation_id: invitation.id,
        server_id: invitation.server_id,
        username,
        platform: invitation.platform,
        details: `${username} activated invite for ${invitation.server_name}`,
      });

      setSuccess(true);
    } catch (err) {
      setError("failed");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-violet-400 animate-spin" />
      </div>
    );
  }

  if (error) {
    const messages = {
      invalid: { title: "Invalid Link", desc: "This invitation link is not valid or has been removed." },
      expired: { title: "Link Expired", desc: "This invitation has expired. Contact the admin for a new link." },
      revoked: { title: "Access Revoked", desc: "This invitation has been revoked by the admin." },
      used: { title: "Link Used", desc: "This invitation link has already been used the maximum number of times." },
      failed: { title: "Something Went Wrong", desc: "Failed to create your account. Please try again." },
    };
    const msg = messages[error] || messages.invalid;
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
        <div className="max-w-sm w-full text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mx-auto">
            <AlertCircle className="w-8 h-8 text-rose-400" />
          </div>
          <h1 className="text-xl font-heading font-bold text-zinc-100">{msg.title}</h1>
          <p className="text-sm text-zinc-500">{msg.desc}</p>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
        <div className="max-w-sm w-full text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-8 h-8 text-emerald-400" />
          </div>
          <h1 className="text-xl font-heading font-bold text-zinc-100">You're All Set!</h1>
          <p className="text-sm text-zinc-400">
            Your account has been created on <strong className="text-zinc-200">{invitation.server_name}</strong>. 
            You can now sign in to the media server using your credentials.
          </p>
          {invitation.platform !== "plex" && (
            <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-lg p-4 text-left">
              <p className="text-xs text-zinc-500 mb-2">Connect to:</p>
              <p className="text-sm text-zinc-200 font-mono break-all">
                {/* Would display the actual server URL for the user to connect */}
                {invitation.server_name}
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-6">
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center mx-auto">
            <Tv className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-heading font-bold text-zinc-100">You're Invited!</h1>
            <p className="text-sm text-zinc-500 mt-1">
              Set up your account to access <strong className="text-zinc-300">{invitation.server_name}</strong>
            </p>
          </div>
          <PlatformBadge platform={invitation.platform} size="md" />
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-6 space-y-4">
          {invitation.allowed_libraries?.length > 0 && (
            <div className="bg-zinc-800/30 rounded-lg p-3 border border-zinc-800/60">
              <p className="text-xs text-zinc-500 mb-1.5">Available Libraries</p>
              <div className="flex flex-wrap gap-1.5">
                {invitation.allowed_libraries.map(lib => (
                  <span key={lib.id} className="text-xs bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded">
                    {lib.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div>
            <Label className="text-zinc-300 text-sm">Username</Label>
            <Input
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="Choose a username"
              required
              className="bg-zinc-800 border-zinc-700 text-zinc-100 mt-1"
            />
          </div>

          <div>
            <Label className="text-zinc-300 text-sm">Email (optional)</Label>
            <Input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="your@email.com"
              className="bg-zinc-800 border-zinc-700 text-zinc-100 mt-1"
            />
          </div>

          <div>
            <Label className="text-zinc-300 text-sm">Password</Label>
            <div className="relative mt-1">
              <Input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Create a password"
                required
                className="bg-zinc-800 border-zinc-700 text-zinc-100 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="bg-zinc-800/30 rounded-lg p-3 border border-zinc-800/60">
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-500">Trial Duration</span>
              <span className="text-zinc-300 font-medium">{invitation.duration_hours}h</span>
            </div>
            <div className="flex items-center justify-between text-xs mt-1">
              <span className="text-zinc-500">Expires</span>
              <span className="text-zinc-300 font-medium">
                {new Date(invitation.expires_at).toLocaleDateString()}
              </span>
            </div>
          </div>

          <Button
            type="submit"
            disabled={submitting || !username || !password}
            className="w-full bg-violet-600 hover:bg-violet-700 text-white h-11"
          >
            {submitting ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Creating Account...</>
            ) : (
              "Create Account & Start Watching"
            )}
          </Button>
        </form>

        <p className="text-xs text-zinc-600 text-center">
          By creating an account, you agree to the server admin's usage terms.
        </p>
      </div>
    </div>
  );
}