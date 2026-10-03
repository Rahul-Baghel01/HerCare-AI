export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.15";
  };
  public: {
    Tables: {
      ai_chat_history: {
        Row: {
          content: string;
          created_at: string;
          id: string;
          role: string;
          user_id: string;
        };
        Insert: {
          content: string;
          created_at?: string;
          id?: string;
          role: string;
          user_id: string;
        };
        Update: {
          content?: string;
          created_at?: string;
          id?: string;
          role?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      announcements: {
        Row: {
          created_at: string;
          id: string;
          message: string;
          title: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          message: string;
          title: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          message?: string;
          title?: string;
        };
        Relationships: [];
      };
      appointments: {
        Row: {
          created_at: string;
          doctor: string | null;
          id: string;
          location: string | null;
          notes: string | null;
          scheduled_at: string;
          title: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          doctor?: string | null;
          id?: string;
          location?: string | null;
          notes?: string | null;
          scheduled_at: string;
          title: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          doctor?: string | null;
          id?: string;
          location?: string | null;
          notes?: string | null;
          scheduled_at?: string;
          title?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      articles: {
        Row: {
          author_id: string | null;
          body: string | null;
          category: string | null;
          created_at: string;
          excerpt: string | null;
          id: string;
          published: boolean;
          slug: string;
          title: string;
        };
        Insert: {
          author_id?: string | null;
          body?: string | null;
          category?: string | null;
          created_at?: string;
          excerpt?: string | null;
          id?: string;
          published?: boolean;
          slug: string;
          title: string;
        };
        Update: {
          author_id?: string | null;
          body?: string | null;
          category?: string | null;
          created_at?: string;
          excerpt?: string | null;
          id?: string;
          published?: boolean;
          slug?: string;
          title?: string;
        };
        Relationships: [];
      };
      cycles: {
        Row: {
          created_at: string;
          end_date: string | null;
          flow_intensity: string | null;
          id: string;
          notes: string | null;
          spotting: boolean;
          start_date: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          end_date?: string | null;
          flow_intensity?: string | null;
          id?: string;
          notes?: string | null;
          spotting?: boolean;
          start_date: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          end_date?: string | null;
          flow_intensity?: string | null;
          id?: string;
          notes?: string | null;
          spotting?: boolean;
          start_date?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      exercise_logs: {
        Row: {
          activity: string;
          created_at: string;
          id: string;
          intensity: string | null;
          log_date: string;
          minutes: number;
          notes: string | null;
          user_id: string;
        };
        Insert: {
          activity: string;
          created_at?: string;
          id?: string;
          intensity?: string | null;
          log_date?: string;
          minutes?: number;
          notes?: string | null;
          user_id: string;
        };
        Update: {
          activity?: string;
          created_at?: string;
          id?: string;
          intensity?: string | null;
          log_date?: string;
          minutes?: number;
          notes?: string | null;
          user_id?: string;
        };
        Relationships: [];
      };
      faqs: {
        Row: {
          answer: string;
          created_at: string;
          id: string;
          published: boolean;
          question: string;
          sort_order: number;
        };
        Insert: {
          answer: string;
          created_at?: string;
          id?: string;
          published?: boolean;
          question: string;
          sort_order?: number;
        };
        Update: {
          answer?: string;
          created_at?: string;
          id?: string;
          published?: boolean;
          question?: string;
          sort_order?: number;
        };
        Relationships: [];
      };
      fertility_logs: {
        Row: {
          bbt_c: number | null;
          cervical_mucus: string | null;
          created_at: string;
          id: string;
          intercourse: boolean;
          log_date: string;
          notes: string | null;
          ovulation_test: string | null;
          user_id: string;
        };
        Insert: {
          bbt_c?: number | null;
          cervical_mucus?: string | null;
          created_at?: string;
          id?: string;
          intercourse?: boolean;
          log_date?: string;
          notes?: string | null;
          ovulation_test?: string | null;
          user_id: string;
        };
        Update: {
          bbt_c?: number | null;
          cervical_mucus?: string | null;
          created_at?: string;
          id?: string;
          intercourse?: boolean;
          log_date?: string;
          notes?: string | null;
          ovulation_test?: string | null;
          user_id?: string;
        };
        Relationships: [];
      };
      health_notes: {
        Row: {
          body: string | null;
          created_at: string;
          id: string;
          log_date: string;
          title: string;
          user_id: string;
        };
        Insert: {
          body?: string | null;
          created_at?: string;
          id?: string;
          log_date?: string;
          title: string;
          user_id: string;
        };
        Update: {
          body?: string | null;
          created_at?: string;
          id?: string;
          log_date?: string;
          title?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      medication_logs: {
        Row: {
          created_at: string;
          id: string;
          log_date: string;
          medication_id: string;
          taken: boolean;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          log_date?: string;
          medication_id: string;
          taken?: boolean;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          log_date?: string;
          medication_id?: string;
          taken?: boolean;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "medication_logs_medication_id_fkey";
            columns: ["medication_id"];
            isOneToOne: false;
            referencedRelation: "medications";
            referencedColumns: ["id"];
          },
        ];
      };
      medications: {
        Row: {
          active: boolean;
          created_at: string;
          dosage: string | null;
          id: string;
          med_type: string;
          name: string;
          times: string[];
          user_id: string;
        };
        Insert: {
          active?: boolean;
          created_at?: string;
          dosage?: string | null;
          id?: string;
          med_type?: string;
          name: string;
          times?: string[];
          user_id: string;
        };
        Update: {
          active?: boolean;
          created_at?: string;
          dosage?: string | null;
          id?: string;
          med_type?: string;
          name?: string;
          times?: string[];
          user_id?: string;
        };
        Relationships: [];
      };
      moods: {
        Row: {
          created_at: string;
          emoji: string | null;
          energy_level: number | null;
          gratitude: string | null;
          id: string;
          journal: string | null;
          log_date: string;
          mood: string;
          stress_level: number | null;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          emoji?: string | null;
          energy_level?: number | null;
          gratitude?: string | null;
          id?: string;
          journal?: string | null;
          log_date?: string;
          mood: string;
          stress_level?: number | null;
          user_id: string;
        };
        Update: {
          created_at?: string;
          emoji?: string | null;
          energy_level?: number | null;
          gratitude?: string | null;
          id?: string;
          journal?: string | null;
          log_date?: string;
          mood?: string;
          stress_level?: number | null;
          user_id?: string;
        };
        Relationships: [];
      };
      notifications: {
        Row: {
          body: string | null;
          created_at: string;
          due_at: string;
          id: string;
          kind: string;
          read: boolean;
          title: string;
          user_id: string;
        };
        Insert: {
          body?: string | null;
          created_at?: string;
          due_at?: string;
          id?: string;
          kind: string;
          read?: boolean;
          title: string;
          user_id: string;
        };
        Update: {
          body?: string | null;
          created_at?: string;
          due_at?: string;
          id?: string;
          kind?: string;
          read?: boolean;
          title?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      nutrition_logs: {
        Row: {
          calcium_mg: number | null;
          calories: number | null;
          created_at: string;
          description: string | null;
          fiber_g: number | null;
          id: string;
          iron_mg: number | null;
          log_date: string;
          magnesium_mg: number | null;
          meal: string;
          protein_g: number | null;
          user_id: string;
          vitamin_d_iu: number | null;
        };
        Insert: {
          calcium_mg?: number | null;
          calories?: number | null;
          created_at?: string;
          description?: string | null;
          fiber_g?: number | null;
          id?: string;
          iron_mg?: number | null;
          log_date?: string;
          magnesium_mg?: number | null;
          meal?: string;
          protein_g?: number | null;
          user_id: string;
          vitamin_d_iu?: number | null;
        };
        Update: {
          calcium_mg?: number | null;
          calories?: number | null;
          created_at?: string;
          description?: string | null;
          fiber_g?: number | null;
          id?: string;
          iron_mg?: number | null;
          log_date?: string;
          magnesium_mg?: number | null;
          meal?: string;
          protein_g?: number | null;
          user_id?: string;
          vitamin_d_iu?: number | null;
        };
        Relationships: [];
      };
      pcos_logs: {
        Row: {
          acne: number | null;
          blood_sugar: number | null;
          bmi: number | null;
          cravings: number | null;
          created_at: string;
          fatigue: number | null;
          hair_growth: number | null;
          hair_loss: number | null;
          id: string;
          log_date: string;
          notes: string | null;
          user_id: string;
          waist_cm: number | null;
          weight_kg: number | null;
        };
        Insert: {
          acne?: number | null;
          blood_sugar?: number | null;
          bmi?: number | null;
          cravings?: number | null;
          created_at?: string;
          fatigue?: number | null;
          hair_growth?: number | null;
          hair_loss?: number | null;
          id?: string;
          log_date?: string;
          notes?: string | null;
          user_id: string;
          waist_cm?: number | null;
          weight_kg?: number | null;
        };
        Update: {
          acne?: number | null;
          blood_sugar?: number | null;
          bmi?: number | null;
          cravings?: number | null;
          created_at?: string;
          fatigue?: number | null;
          hair_growth?: number | null;
          hair_loss?: number | null;
          id?: string;
          log_date?: string;
          notes?: string | null;
          user_id?: string;
          waist_cm?: number | null;
          weight_kg?: number | null;
        };
        Relationships: [];
      };
      pregnancy_logs: {
        Row: {
          contractions: Json | null;
          created_at: string;
          id: string;
          kick_count: number | null;
          log_date: string;
          notes: string | null;
          user_id: string;
          week: number | null;
          weight_kg: number | null;
        };
        Insert: {
          contractions?: Json | null;
          created_at?: string;
          id?: string;
          kick_count?: number | null;
          log_date?: string;
          notes?: string | null;
          user_id: string;
          week?: number | null;
          weight_kg?: number | null;
        };
        Update: {
          contractions?: Json | null;
          created_at?: string;
          id?: string;
          kick_count?: number | null;
          log_date?: string;
          notes?: string | null;
          user_id?: string;
          week?: number | null;
          weight_kg?: number | null;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          allergies: string | null;
          avatar_url: string | null;
          avg_cycle_length: number;
          avg_period_length: number;
          created_at: string;
          date_of_birth: string | null;
          display_name: string | null;
          emergency_contact_name: string | null;
          emergency_contact_phone: string | null;
          has_pcos: boolean;
          height_cm: number | null;
          id: string;
          last_period_start: string | null;
          medical_conditions: string | null;
          mode: Database["public"]["Enums"]["tracking_mode"];
          notify_appointment: boolean;
          notify_medication: boolean;
          notify_ovulation: boolean;
          notify_period: boolean;
          notify_water: boolean;
          onboarded: boolean;
          pregnancy_due_date: string | null;
          share_anonymised_data: boolean;
          theme: string;
          units: string;
          updated_at: string;
          weight_kg: number | null;
        };
        Insert: {
          allergies?: string | null;
          avatar_url?: string | null;
          avg_cycle_length?: number;
          avg_period_length?: number;
          created_at?: string;
          date_of_birth?: string | null;
          display_name?: string | null;
          emergency_contact_name?: string | null;
          emergency_contact_phone?: string | null;
          has_pcos?: boolean;
          height_cm?: number | null;
          id: string;
          last_period_start?: string | null;
          medical_conditions?: string | null;
          mode?: Database["public"]["Enums"]["tracking_mode"];
          notify_appointment?: boolean;
          notify_medication?: boolean;
          notify_ovulation?: boolean;
          notify_period?: boolean;
          notify_water?: boolean;
          onboarded?: boolean;
          pregnancy_due_date?: string | null;
          share_anonymised_data?: boolean;
          theme?: string;
          units?: string;
          updated_at?: string;
          weight_kg?: number | null;
        };
        Update: {
          allergies?: string | null;
          avatar_url?: string | null;
          avg_cycle_length?: number;
          avg_period_length?: number;
          created_at?: string;
          date_of_birth?: string | null;
          display_name?: string | null;
          emergency_contact_name?: string | null;
          emergency_contact_phone?: string | null;
          has_pcos?: boolean;
          height_cm?: number | null;
          id?: string;
          last_period_start?: string | null;
          medical_conditions?: string | null;
          mode?: Database["public"]["Enums"]["tracking_mode"];
          notify_appointment?: boolean;
          notify_medication?: boolean;
          notify_ovulation?: boolean;
          notify_period?: boolean;
          notify_water?: boolean;
          onboarded?: boolean;
          pregnancy_due_date?: string | null;
          share_anonymised_data?: boolean;
          theme?: string;
          units?: string;
          updated_at?: string;
          weight_kg?: number | null;
        };
        Relationships: [];
      };
      reminders: {
        Row: {
          created_at: string;
          enabled: boolean;
          id: string;
          kind: string;
          label: string;
          time_of_day: string | null;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          enabled?: boolean;
          id?: string;
          kind: string;
          label: string;
          time_of_day?: string | null;
          user_id: string;
        };
        Update: {
          created_at?: string;
          enabled?: boolean;
          id?: string;
          kind?: string;
          label?: string;
          time_of_day?: string | null;
          user_id?: string;
        };
        Relationships: [];
      };
      reports: {
        Row: {
          created_at: string;
          id: string;
          range_end: string | null;
          range_start: string | null;
          summary: Json | null;
          title: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          range_end?: string | null;
          range_start?: string | null;
          summary?: Json | null;
          title: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          range_end?: string | null;
          range_start?: string | null;
          summary?: Json | null;
          title?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      sleep_logs: {
        Row: {
          created_at: string;
          hours: number;
          id: string;
          log_date: string;
          quality: number | null;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          hours?: number;
          id?: string;
          log_date?: string;
          quality?: number | null;
          user_id: string;
        };
        Update: {
          created_at?: string;
          hours?: number;
          id?: string;
          log_date?: string;
          quality?: number | null;
          user_id?: string;
        };
        Relationships: [];
      };
      symptoms: {
        Row: {
          category: string;
          created_at: string;
          id: string;
          log_date: string;
          name: string;
          notes: string | null;
          severity: number;
          user_id: string;
        };
        Insert: {
          category: string;
          created_at?: string;
          id?: string;
          log_date?: string;
          name: string;
          notes?: string | null;
          severity?: number;
          user_id: string;
        };
        Update: {
          category?: string;
          created_at?: string;
          id?: string;
          log_date?: string;
          name?: string;
          notes?: string | null;
          severity?: number;
          user_id?: string;
        };
        Relationships: [];
      };
      user_roles: {
        Row: {
          created_at: string;
          id: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          role?: Database["public"]["Enums"]["app_role"];
          user_id?: string;
        };
        Relationships: [];
      };
      water_logs: {
        Row: {
          created_at: string;
          glasses: number;
          goal_glasses: number;
          id: string;
          log_date: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          glasses?: number;
          goal_glasses?: number;
          id?: string;
          log_date?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          glasses?: number;
          goal_glasses?: number;
          id?: string;
          log_date?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      weight_history: {
        Row: {
          created_at: string;
          id: string;
          log_date: string;
          notes: string | null;
          user_id: string;
          weight_kg: number;
        };
        Insert: {
          created_at?: string;
          id?: string;
          log_date?: string;
          notes?: string | null;
          user_id: string;
          weight_kg: number;
        };
        Update: {
          created_at?: string;
          id?: string;
          log_date?: string;
          notes?: string | null;
          user_id?: string;
          weight_kg?: number;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      consume_ai_request: {
        Args: Record<PropertyKey, never>;
        Returns: boolean;
      };
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"];
          _user_id: string;
        };
        Returns: boolean;
      };
    };
    Enums: {
      app_role: "admin" | "user";
      tracking_mode: "cycle" | "pregnancy" | "postpartum" | "menopause";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "user"],
      tracking_mode: ["cycle", "pregnancy", "postpartum", "menopause"],
    },
  },
} as const;
