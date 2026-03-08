"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface DayData {
  date: string;
  completed: number;
  total: number;
}

export function CompletionChart() {
  const [data, setData] = useState<DayData[]>([]);

  useEffect(() => {
    async function fetchChartData() {
      const supabase = createClient();
      const since = new Date();
      since.setDate(since.getDate() - 7);

      const { data: sessions } = await supabase
        .from("sessions")
        .select("started_at, status")
        .gte("started_at", since.toISOString());

      if (!sessions) return;

      const dayMap = new Map<string, { completed: number; total: number }>();

      // Initialize last 7 days
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const key = d.toLocaleDateString("ja-JP", {
          month: "short",
          day: "numeric",
        });
        dayMap.set(key, { completed: 0, total: 0 });
      }

      for (const session of sessions) {
        const d = new Date(session.started_at);
        const key = d.toLocaleDateString("ja-JP", {
          month: "short",
          day: "numeric",
        });
        const entry = dayMap.get(key);
        if (entry) {
          entry.total += 1;
          if (session.status === "completed") {
            entry.completed += 1;
          }
        }
      }

      const chartData: DayData[] = [];
      dayMap.forEach((value, key) => {
        chartData.push({ date: key, ...value });
      });

      setData(chartData);
    }

    fetchChartData();
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle>完了率推移 (過去7日間)</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="text-sm text-muted-foreground">データなし</p>
        ) : (
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" fontSize={12} />
              <YAxis fontSize={12} />
              <Tooltip />
              <Bar
                dataKey="total"
                fill="hsl(var(--chart-2))"
                name="全セッション"
                radius={[2, 2, 0, 0]}
              />
              <Bar
                dataKey="completed"
                fill="hsl(var(--chart-1))"
                name="完了"
                radius={[2, 2, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
