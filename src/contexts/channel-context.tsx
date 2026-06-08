"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export interface ChannelOption {
  id: string;
  name: string;
}

interface ChannelContextValue {
  channels: ChannelOption[];
  currentUserRole: string | null;
}

const ChannelContext = createContext<ChannelContextValue>({
  channels: [],
  currentUserRole: null,
});

export function ChannelProvider({ children }: { children: React.ReactNode }) {
  const [channels, setChannels] = useState<ChannelOption[]>([]);
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    Promise.all([
      supabase
        .from("line_channels")
        .select("id, name")
        .eq("is_active", true)
        .order("created_at", { ascending: true }),
      supabase.auth.getUser().then(async ({ data: { user } }) => {
        if (!user) return { data: null };
        return supabase.from("profiles").select("role").eq("id", user.id).single();
      }),
    ]).then(([{ data: channelData }, { data: profileData }]) => {
      if (channelData && channelData.length > 0) setChannels(channelData);
      if (profileData) setCurrentUserRole(profileData.role);
    });
  }, []);

  return (
    <ChannelContext.Provider value={{ channels, currentUserRole }}>
      {children}
    </ChannelContext.Provider>
  );
}

export function useChannel() {
  return useContext(ChannelContext);
}
