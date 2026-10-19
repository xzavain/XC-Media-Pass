export const STREAMING_NETWORKS = [
  // Major subscription services
  { id: "netflix", name: "Netflix", color: "#E50914", textColor: "#FFFFFF" },
  { id: "prime", name: "Prime Video", color: "#00A8E1", textColor: "#FFFFFF" },
  { id: "disney", name: "Disney+", color: "#113CCF", textColor: "#FFFFFF" },
  { id: "max", name: "Max", color: "#5C2D91", textColor: "#FFFFFF" },
  { id: "apple_tv", name: "Apple TV+", color: "#2A2A2A", textColor: "#FFFFFF" },
  { id: "hulu", name: "Hulu", color: "#1CE783", textColor: "#000000" },
  { id: "paramount", name: "Paramount+", color: "#0064FF", textColor: "#FFFFFF" },
  { id: "peacock", name: "Peacock", color: "#1A1A1A", textColor: "#FFFFFF" },

  // Premium channels
  { id: "hbo", name: "HBO", color: "#000000", textColor: "#FFFFFF" },
  { id: "amc", name: "AMC", color: "#1A1A1A", textColor: "#FFFFFF" },
  { id: "showtime", name: "Showtime", color: "#B00505", textColor: "#FFFFFF" },
  { id: "starz", name: "Starz", color: "#000000", textColor: "#FFFFFF" },
  { id: "mgm", name: "MGM+", color: "#0A0A0A", textColor: "#FFFFFF" },
  { id: "cinemax", name: "Cinemax", color: "#1A1A1A", textColor: "#FFFFFF" },
  { id: "epix", name: "EPIX", color: "#0A0A0A", textColor: "#FFFFFF" },

  // Free / ad-supported (FAST)
  { id: "tubi", name: "Tubi", color: "#E3192E", textColor: "#FFFFFF" },
  { id: "pluto", name: "Pluto TV", color: "#1F4A8C", textColor: "#FFFFFF" },
  { id: "freevee", name: "Freevee", color: "#00A8E1", textColor: "#FFFFFF" },
  { id: "roku", name: "Roku Channel", color: "#6B1FB1", textColor: "#FFFFFF" },
  { id: "crackle", name: "Crackle", color: "#1A1A1A", textColor: "#FFFFFF" },
  { id: "plex_free", name: "Plex", color: "#E5A00B", textColor: "#000000" },

  // Transaction / rental
  { id: "fandango", name: "Fandango at Home", color: "#1A1A1A", textColor: "#FFFFFF" },
  { id: "google_play", name: "Google Play", color: "#414141", textColor: "#FFFFFF" },
  { id: "itunes", name: "iTunes", color: "#1A1A1A", textColor: "#FFFFFF" },
  { id: "youtube_movies", name: "YouTube Movies", color: "#FF0000", textColor: "#FFFFFF" },
  { id: "microsoft", name: "Microsoft Movies", color: "#0078D4", textColor: "#FFFFFF" },

  // Live TV / streaming bundles
  { id: "fubo", name: "FuboTV", color: "#F0303F", textColor: "#FFFFFF" },
  { id: "sling", name: "Sling TV", color: "#FF6A00", textColor: "#FFFFFF" },
  { id: "philo", name: "Philo", color: "#1A1A1A", textColor: "#FFFFFF" },
  { id: "youtube_tv", name: "YouTube TV", color: "#FF0000", textColor: "#FFFFFF" },
  { id: "directv", name: "DirecTV", color: "#00A8E1", textColor: "#FFFFFF" },

  // Sports
  { id: "espn", name: "ESPN+", color: "#D50032", textColor: "#FFFFFF" },
  { id: "dazn", name: "DAZN", color: "#F8FF13", textColor: "#000000" },
  { id: "ufc", name: "UFC Fight Pass", color: "#D20A0A", textColor: "#FFFFFF" },
  { id: "nba", name: "NBA League Pass", color: "#552583", textColor: "#FFFFFF" },
  { id: "mlb", name: "MLB.TV", color: "#041E42", textColor: "#FFFFFF" },
  { id: "nfl", name: "NFL+", color: "#00338D", textColor: "#FFFFFF" },

  // Anime / international
  { id: "crunchyroll", name: "Crunchyroll", color: "#F47521", textColor: "#FFFFFF" },
  { id: "funimation", name: "Funimation", color: "#5B0BB5", textColor: "#FFFFFF" },
  { id: "hidive", name: "HiDive", color: "#00B6F1", textColor: "#FFFFFF" },
  { id: "viki", name: "Rakuten Viki", color: "#1A1A1A", textColor: "#FFFFFF" },

  // Niche / specialty
  { id: "britbox", name: "BritBox", color: "#003399", textColor: "#FFFFFF" },
  { id: "acorn", name: "Acorn TV", color: "#1A1A1A", textColor: "#FFFFFF" },
  { id: "shudder", name: "Shudder", color: "#D50000", textColor: "#FFFFFF" },
  { id: "mubi", name: "MUBI", color: "#1A1A1A", textColor: "#FFFFFF" },
  { id: "kanopy", name: "Kanopy", color: "#1A1A1A", textColor: "#FFFFFF" },
  { id: "hoopla", name: "Hoopla", color: "#1A1A1A", textColor: "#FFFFFF" },
  { id: "curiosity", name: "CuriosityStream", color: "#1A1A1A", textColor: "#FFFFFF" },
  { id: "sundance", name: "Sundance Now", color: "#1A1A1A", textColor: "#FFFFFF" },
  { id: "hallmark", name: "Hallmark", color: "#4B0082", textColor: "#FFFFFF" },
  { id: "bet", name: "BET+", color: "#000000", textColor: "#FFFFFF" },
  { id: "hayu", name: "Hayu", color: "#1A1A1A", textColor: "#FFFFFF" },
  { id: "crave", name: "Crave", color: "#000000", textColor: "#FFFFFF" },

  // Discovery / factual
  { id: "discovery", name: "Discovery+", color: "#00457C", textColor: "#FFFFFF" },
  { id: "animal_planet", name: "Animal Planet", color: "#003366", textColor: "#FFFFFF" },
  { id: "food_network", name: "Food Network", color: "#E60000", textColor: "#FFFFFF" },
  { id: "hgtv", name: "HGTV", color: "#0066B3", textColor: "#FFFFFF" },
  { id: "tlc", name: "TLC", color: "#1A1A1A", textColor: "#FFFFFF" },
  { id: "own", name: "OWN", color: "#1A1A1A", textColor: "#FFFFFF" },
  { id: "science", name: "Science Channel", color: "#003366", textColor: "#FFFFFF" },
  { id: "investigation", name: "Investigation Discovery", color: "#003366", textColor: "#FFFFFF" },
  { id: "motor_trend", name: "Motor Trend", color: "#1A1A1A", textColor: "#FFFFFF" },

  // Broadcast networks
  { id: "abc", name: "ABC", color: "#000000", textColor: "#FFFFFF" },
  { id: "nbc", name: "NBC", color: "#1A1A1A", textColor: "#FFFFFF" },
  { id: "cbs", name: "CBS", color: "#0033A0", textColor: "#FFFFFF" },
  { id: "fox", name: "Fox", color: "#1A1A1A", textColor: "#FFFFFF" },
  { id: "cw", name: "The CW", color: "#1A1A1A", textColor: "#FFFFFF" },
  { id: "pbs", name: "PBS", color: "#0033A0", textColor: "#FFFFFF" },
  { id: "pbs_kids", name: "PBS Kids", color: "#0033A0", textColor: "#FFFFFF" },
  { id: "telemundo", name: "Telemundo", color: "#1A1A1A", textColor: "#FFFFFF" },

  // Cable networks
  { id: "tbs", name: "TBS", color: "#1A1A1A", textColor: "#FFFFFF" },
  { id: "tnt", name: "TNT", color: "#1A1A1A", textColor: "#FFFFFF" },
  { id: "bravo", name: "Bravo", color: "#1A1A1A", textColor: "#FFFFFF" },
  { id: "syfy", name: "Syfy", color: "#1A1A1A", textColor: "#FFFFFF" },
  { id: "usa", name: "USA Network", color: "#1A1A1A", textColor: "#FFFFFF" },
  { id: "aetv", name: "A&E", color: "#1A1A1A", textColor: "#FFFFFF" },
  { id: "history", name: "History", color: "#1A1A1A", textColor: "#FFFFFF" },
  { id: "lifetime", name: "Lifetime", color: "#1A1A1A", textColor: "#FFFFFF" },
  { id: "comedy_central", name: "Comedy Central", color: "#1A1A1A", textColor: "#FFFFFF" },
  { id: "mtv", name: "MTV", color: "#1A1A1A", textColor: "#FFFFFF" },
  { id: "nickelodeon", name: "Nickelodeon", color: "#FF6E00", textColor: "#FFFFFF" },
  { id: "paramount_network", name: "Paramount Network", color: "#0064FF", textColor: "#FFFFFF" },
  { id: "tv_land", name: "TV Land", color: "#1A1A1A", textColor: "#FFFFFF" },
  { id: "cmt", name: "CMT", color: "#1A1A1A", textColor: "#FFFFFF" },
  { id: "logo", name: "Logo", color: "#1A1A1A", textColor: "#FFFFFF" },
  { id: "vh1", name: "VH1", color: "#1A1A1A", textColor: "#FFFFFF" },
  { id: "adult_swim", name: "Adult Swim", color: "#000000", textColor: "#FFFFFF" },
  { id: "cartoon_network", name: "Cartoon Network", color: "#0033A0", textColor: "#FFFFFF" },
  { id: "oxygen", name: "Oxygen", color: "#1A1A1A", textColor: "#FFFFFF" },
  { id: "e_entertainment", name: "E!", color: "#1A1A1A", textColor: "#FFFFFF" },

  // YouTube
  { id: "youtube_premium", name: "YouTube Premium", color: "#FF0000", textColor: "#FFFFFF" },
];

export function getNetworkById(id) {
  return STREAMING_NETWORKS.find((n) => n.id === id);
}

export function getNetworkByName(name) {
  if (!name) return null;
  const lower = name.toLowerCase().replace(/\+$/, "").trim();
  return STREAMING_NETWORKS.find((n) =>
    n.name.toLowerCase().replace(/\+$/, "").includes(lower) || lower.includes(n.name.toLowerCase().replace(/\+$/, ""))
  );
}

export function matchProviderToNetwork(providerName) {
  return getNetworkByName(providerName);
}

export function filterTrendingByNetworks(items, networkIds) {
  if (!networkIds || networkIds.length === 0) return [];
  const networkNames = networkIds
    .map((id) => getNetworkById(id)?.name)
    .filter(Boolean);
  if (networkNames.length === 0) return [];
  return items.filter((item) =>
    (item.streaming_providers || []).some((provider) => {
      const lower = provider.toLowerCase();
      return networkNames.some((name) => {
        const n = name.toLowerCase().replace(/\+$/, "");
        return lower.includes(n);
      });
    })
  );
}