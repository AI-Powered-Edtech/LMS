export type WidgetType =
  | "metric_card"
  | "line_chart"
  | "bar_chart"
  | "pie_chart"
  | "heatmap"
  | "funnel"
  | "table"
  | "radar"
  | "leaderboard"
  | "engagement_trend"
  | "risk_radar";

export interface LayoutItem {
  widget_id: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface WidgetConfig {
  id: string;
  type: WidgetType;
  config: Record<string, unknown>;
}

export interface DashboardConfig {
  id: string;
  tenant_id: string;
  created_by: string;
  name: string;
  description?: string;
  layout: LayoutItem[];
  widgets: WidgetConfig[];
  is_default: boolean;
  is_shared: boolean;
  created_at: string;
  updated_at: string;
}
