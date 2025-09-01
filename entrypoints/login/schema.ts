export interface BrowsingHistoryEntry {
  url: string;
  title: string;
  visitTime: string;
  visitCount?: number;
  lastVisitTime?: string;
  domain?: string;
  category?: string;
}

export interface Bookmark {
  url: string;
  title: string;
  dateAdded: string;
  folder?: string;
}

export interface PersonalityCard {
  type: "professional" | "personal";
  title: string;
  subtitle: string;
  description: string;
  overlay_id: string;
  confidence: number;
}

export interface PersonalityOneLiner {
  text: string;
  category: "witty" | "funny" | "insightful" | "quirky" | "relatable";
  confidence: number;
}

export interface InferredIdentity {
  name: string | null;
  profession: string | null;
  profile_picture_url: string | null;
  confidence: {
    name: number;
    profession: number;
    profile_picture: number;
  };
  evidence_sources: {
    name: string[];
    profession: string[];
    profile_picture: string[];
  };
}

export interface IconValue<T = string> {
  value: T;
  icon: string;
}

export interface TopicWithIcon {
  topic: string;
  icon: string;
}

export interface FormatWithIcon {
  format: string;
  icon: string;
  inclination: string;
}

export interface BrowsingPatterns {
  most_active_hours: IconValue<string>;
  session_length: IconValue<"short" | "medium" | "long">;
  multitasking: boolean;
}

export interface ContentPreferences {
  formats: FormatWithIcon[];
  topics: string[];
  complexity: "beginner" | "intermediate" | "advanced";
}

export interface DigitalFootprintSummary {
  primary_interests: TopicWithIcon[];
  browsing_patterns: BrowsingPatterns;
  content_preferences: ContentPreferences;
  technical_proficiency: "basic" | "intermediate" | "advanced" | "expert";
  social_media_engagement: "low" | "moderate" | "high";
}

export interface BehavioralInsights {
  work_life_balance: IconValue<"work-focused" | "life-focused" | "balanced">;
  learning_style: IconValue<"visual" | "analytical" | "practical" | "social">;
  decision_making: IconValue<
    "impulsive" | "researcher" | "deliberate" | "social-influenced"
  >;
  information_consumption: IconValue<
    "skimmer" | "deep-reader" | "mixed" | "visual-first"
  >;
}

export interface AnalysisMetadata {
  overall_confidence: number;
  data_quality: "excellent" | "good" | "fair" | "limited";
  key_data_points: number;
  analysis_depth: "surface" | "moderate" | "deep";
}

export interface UserPersona {
  personality_cards: PersonalityCard[];
  personality_one_liners: PersonalityOneLiner[];
  comprehensive_persona: string;
  inferred_identity: InferredIdentity;
  digital_footprint_summary: DigitalFootprintSummary;
  behavioral_insights: BehavioralInsights;
  analysis_metadata: AnalysisMetadata;
}

export interface DomainAnalysis {
  domain: string;
  count: number;
  category: string;
}

export interface ProcessingMetadata {
  data_processed: {
    browsing_entries: number;
    unique_domains: number;
    search_queries: number;
    bookmarks: number;
    time_range: string;
  };
  top_domains: DomainAnalysis[];
  processing_time: string;
}

export interface IdentityInference {
  name: string | null;
  profession: string | null;
  country: string | null;
  profile_picture_url: string | null;
  confidence: {
    name: number;
    profession: number;
    country: number;
    profile_picture: number;
  };
  evidence_sources: {
    name: string[];
    profession: string[];
    profile_picture: string[];
  };
}

// Main API Response Interface
export interface PersonaResponse {
  success: boolean;
  persona: UserPersona;
  identity_inference: IdentityInference;
  processing_metadata: ProcessingMetadata;
}

// NEW PHASED INTERFACES

// Phase 1 interfaces
export interface PersonaIdentityData {
  success: boolean;
  session_id: string;
  identity_inference: IdentityInference;
  processing_metadata: ProcessingMetadata;
  persona: {
    comprehensive_persona: string;
    behavioral_insights: BehavioralInsights;
    digital_footprint_summary: {
      browsing_patterns: BrowsingPatterns;
      technical_proficiency: "basic" | "intermediate" | "advanced" | "expert";
    };
  };
}

export interface PersonaIdentityResponse {
  success: boolean;
  session_id: string;
  data: PersonaIdentityData;
  processing_time: number;
}

// Phase 2 interfaces
export interface PersonaContentData {
  success: boolean;
  session_id: string;
  content_preferences: ContentPreferences;
}

export interface PersonaContentResponse {
  success: boolean;
  session_id: string;
  data: PersonaContentData;
  processing_time: number;
}

// Request interfaces
export interface ContentPreferencesRequest {
  session_id: string;
}

// Session management interfaces
export interface SessionStatus {
  session_id: string;
  exists: boolean;
  phase1_completed: boolean;
  phase2_completed: boolean;
  expires_at: string | null;
  created_at: string | null;
}

export interface SessionStats {
  total_sessions: number;
  phase1_completed: number;
  phase2_completed: number;
  memory_usage_mb: number;
}

// Error interfaces
export interface APIError {
  success: false;
  error: string;
  error_code: string;
  details?: any;
}

export interface ValidationError extends APIError {
  error_code: "VALIDATION_ERROR";
  validation_errors: Array<{
    field: string;
    message: string;
  }>;
}

export interface SessionError extends APIError {
  error_code: "SESSION_NOT_FOUND" | "SESSION_EXPIRED";
  session_id: string;
}

export interface InsufficientDataError extends APIError {
  error_code: "INSUFFICIENT_DATA";
  minimum_required: number;
  provided: number;
}

export interface LLMError extends APIError {
  error_code: "LLM_ERROR";
  llm_error: string;
  retry_recommended: boolean;
}

// Combined response for backward compatibility
export interface CombinedPersonaResponse {
  success: boolean;
  session_id: string;
  identity_data: PersonaIdentityData;
  content_data?: PersonaContentData;
  total_processing_time: number;
  phases_completed: 1 | 2;
}

// Hook result interfaces
export interface PersonaIdentityResult {
  identity: PersonaIdentityData;
  dataStats: {
    historyCount: number;
    bookmarkCount: number;
    timeRange: string;
  };
}

export interface PersonaContentResult {
  content: PersonaContentData;
  dataStats: {
    historyCount: number;
    bookmarkCount: number;
    timeRange: string;
  };
}
