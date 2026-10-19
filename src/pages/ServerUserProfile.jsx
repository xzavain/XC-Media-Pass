import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, BarChart3, MapPin, Monitor, History, AlertTriangle, Ban } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { loadUserProfile, syncTrustScore } from "@/lib/userProfileData";
import UserInfoSection from "@/components/server-users/profile/UserInfoSection";
import StatisticsSection from "@/components/server-users/profile/StatisticsSection";
import LocationsSection from "@/components/server-users/profile/LocationsSection";
import DeviceIntelligencePanel from "@/components/server-users/profile/DeviceIntelligencePanel";
import RecentActivitySection from "@/components/server-users/profile/RecentActivitySection";
import ViolationsSection from "@/components/server-users/profile/ViolationsSection";
import TerminationHistorySection from "@/components/server-users/profile/TerminationHistorySection";

function Section({ icon: Icon, title, children }) {
  return (
    <section className="space-y-3">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-zinc-300 uppercase tracking-wide">
        <Icon className="w-4 h-4 text-lime-400" /> {title}
      </h3>
      {children}
    </section>
  );
}

export default function ServerUserProfile() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [serverUser, setServerUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const user = await base44.entities.ServerUser.get(userId);
    setServerUser(user);
    const data = await loadUserProfile(user);
    setProfile(data);
    await syncTrustScore(user, data.computedTrust);
    setServerUser((prev) => (prev ? { ...prev, trust_score: data.computedTrust } : prev));
    setLoading(false);
  };

  useEffect(() => {
    (async () => {
      try {
        await load();
      } catch (err) {
        console.error(err);
        setLoading(false);
      }
    })();
  }, [userId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 text-lime-500 animate-spin" />
      </div>
    );
  }

  if (!serverUser) {
    return (
      <div className="p-8 text-center">
        <p className="text-zinc-400">User not found.</p>
        <button onClick={() => navigate("/server-users")} className="text-lime-400 text-sm mt-2">Back to Server Users</button>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto space-y-8">
      <button
        onClick={() => navigate("/server-users")}
        className="flex items-center gap-2 text-sm text-zinc-400 hover:text-lime-400 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Server Users
      </button>

      <UserInfoSection serverUser={serverUser} onSaved={load} />

      {profile && (
        <>
          <Section icon={BarChart3} title="Statistics">
            <StatisticsSection stats={profile.stats} />
          </Section>

          <Section icon={MapPin} title="Locations of Use">
            <LocationsSection locations={profile.locations} />
          </Section>

          <Section icon={Monitor} title="Device Intelligence">
            <DeviceIntelligencePanel devices={profile.devices} />
          </Section>

          <Section icon={History} title="Recent Activity">
            <RecentActivitySection recent={profile.recent} />
          </Section>

          <Section icon={AlertTriangle} title="Violations & Trust Score">
            <ViolationsSection violations={profile.violations} trustScore={profile.computedTrust} />
          </Section>

          <Section icon={Ban} title="Termination History">
            <TerminationHistorySection terminations={profile.terminations} />
          </Section>
        </>
      )}
    </div>
  );
}