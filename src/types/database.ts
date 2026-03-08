// Database types matching Supabase schema
// These should be regenerated with `supabase gen types typescript` when schema changes

export type UserRole = "super_admin" | "admin" | "viewer";

export interface LineChannel {
  id: string;
  name: string;
  channel_id: string;
  channel_secret: string;
  channel_access_token: string;
  admin_line_group_id: string | null;
  webhook_path: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  email: string;
  display_name: string | null;
  role: UserRole;
  is_active: boolean;
  created_at: string;
}

export type QuestionType = "image_carousel" | "button" | "free_text";
export type SessionStatus = "in_progress" | "completed" | "abandoned";
export type TriggerType =
  | "inactivity"
  | "session_start"
  | "specific_question"
  | "registration_delay";
export type NotificationType =
  | "session_completed"
  | "session_abandoned"
  | "user_inactive";
export type NotificationStatus = "pending" | "sent" | "failed";
export type VariableSource = "answer" | "lookup" | "constant" | "formula";

export interface ConditionRule {
  question_key: string;
  operator: string;
  value?: string | number | string[];
}

export interface Condition {
  id: string;
  description?: string;
  rules: ConditionRule[];
  logic: "and" | "or";
  next_question_key: string;
}

export interface DisplayConditionGroup {
  rules: ConditionRule[];
  logic: "and" | "or";
}

export interface Question {
  id: string;
  line_channel_id: string;
  question_key: string;
  question_type: QuestionType;
  content: string;
  description: string | null;
  sort_order: number;
  group_name: string | null;
  parent_question_id: string | null;
  conditions: Condition[];
  display_conditions: DisplayConditionGroup[];
  validation: Record<string, unknown>;
  image_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface QuestionOption {
  id: string;
  question_id: string;
  label: string;
  value: string;
  image_url: string | null;
  sort_order: number;
  error_message: string | null;
  created_at: string;
}

export interface LineUser {
  id: string;
  line_user_id: string;
  display_name: string | null;
  picture_url: string | null;
  status_message: string | null;
  is_following: boolean;
  created_at: string;
  updated_at: string;
}

export interface Session {
  id: string;
  line_user_id: string;
  status: SessionStatus;
  current_question_id: string | null;
  last_reminder_sent_at: string | null;
  reminder_count: number;
  result: Record<string, unknown> | null;
  started_at: string;
  completed_at: string | null;
  abandoned_at: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  line_user?: LineUser;
}

export interface Answer {
  id: string;
  session_id: string;
  question_id: string;
  answer_value: string;
  answer_numeric: number | null;
  answered_at: string;
  // Joined fields
  question?: Question;
}

export interface LookupTable {
  id: string;
  table_name: string;
  description: string | null;
  key_columns: string[];
  created_at: string;
  updated_at: string;
}

export interface LookupEntry {
  id: string;
  lookup_table_id: string;
  key_values: Record<string, string>;
  result_value: number;
  created_at: string;
}

export interface KeyMappingEntry {
  question_key: string;
  transform?: string;
}

export interface FormulaVariable {
  source: VariableSource;
  question_key?: string;
  table_name?: string;
  key_mappings?: Record<string, string | KeyMappingEntry>;
  value?: number;
  formula_name?: string;
}

export interface Formula {
  id: string;
  name: string;
  description: string | null;
  expression: string;
  variables: Record<string, FormulaVariable>;
  result_label: string | null;
  result_format: string;
  value_unit: string;
  value_scale: number;
  value_decimals: number;
  display_order: number;
  is_active: boolean;
  condition: unknown[] | null;
  created_at: string;
  updated_at: string;
}

export interface ResultDisplayConfig {
  id: string;
  line_channel_id: string;
  name: string;
  trigger_question_id: string | null; // legacy
  trigger_route_id: string | null;
  intro_message: string;
  body_template: string | null;
  closing_message: string | null;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface StepDeliveryConfig {
  id: string;
  line_channel_id: string | null;
  name: string;
  trigger: TriggerType;
  trigger_condition: Record<string, unknown>;
  delay_hours: number;
  max_sends: number;
  message_template: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface StepDeliverySend {
  id: string;
  config_id: string;
  line_user_id: string;
  sent_at: string;
}

export interface AdminNotification {
  id: string;
  session_id: string | null;
  line_user_id: string | null;
  notification_type: NotificationType;
  status: NotificationStatus;
  payload: Record<string, unknown>;
  error_message: string | null;
  sent_at: string | null;
  created_at: string;
  // Joined fields
  session?: Session;
  line_user?: LineUser;
}

export interface Route {
  id: string;
  channel_id: string;
  name: string;
  description: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface RouteQuestion {
  id: string;
  route_id: string;
  question_id: string;
  sort_order: number;
  // Joined
  question?: Question;
}

export interface GlobalConstant {
  id: string;
  name: string;
  value: number;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface RouteConnection {
  id: string;
  from_route_id: string;
  to_route_id: string;
  conditions: DisplayConditionGroup[];
  sort_order: number;
  // Joined
  to_route?: Route;
}
