"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export interface ChannelOption {
  id: string;
  name: string;
}

interface ChannelContextValue {
  channels: ChannelOption[];
  selectedChannelId: string;
  setSelectedChannelId: (id: string) => void;
}

const ChannelContext = createContext<ChannelContextValue>({
  channels: [],
  selectedChannelId: "",
  setSelectedChannelId: () => {},
});

const STORAGE_KEY = "selected_channel_id";

export function ChannelProvider({ children }: { children: React.ReactNode }) {
  const [channels, setChannels] = useState<ChannelOption[]>([]);
  const [selectedChannelId, setSelectedChannelIdState] = useState<string>("");

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("line_channels")
      .select("id, name")
      .eq("is_active", true)
      .order("created_at", { ascending: true })
      .then(({ data }) => {
        if (!data || data.length === 0) return;
        setChannels(data);
        const saved = localStorage.getItem(STORAGE_KEY);
        const valid = data.some((c) => c.id === saved);
        setSelectedChannelIdState(valid ? saved! : data[0].id);
      });
  }, []);

  function setSelectedChannelId(id: string) {
    setSelectedChannelIdState(id);
    localStorage.setItem(STORAGE_KEY, id);
  }

  return (
    <ChannelContext.Provider value={{ channels, selectedChannelId, setSelectedChannelId }}>
      {children}
    </ChannelContext.Provider>
  );
}

export function useChannel() {
  return useContext(ChannelContext);
}
