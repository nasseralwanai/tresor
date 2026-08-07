/* eslint-disable */
/**
 * Supabase database types for the Trésor project.
 *
 * Manually authored to match the schema in:
 *   supabase/migrations/0001_initial_schema.sql
 *   supabase/migrations/0002_wishlist_fixes.sql
 *
 * Generated types format compatible with @supabase/supabase-js v2.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          phone: string;
          display_name: string | null;
          avatar_url: string | null;
          push_token: string | null;
          bio: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          phone: string;
          display_name?: string | null;
          avatar_url?: string | null;
          push_token?: string | null;
          bio?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          phone?: string;
          display_name?: string | null;
          avatar_url?: string | null;
          push_token?: string | null;
          bio?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };

      circles: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          invite_code: string;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          invite_code: string;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          invite_code?: string;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'circles_created_by_fkey';
            columns: ['created_by'];
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };

      circle_members: {
        Row: {
          id: string;
          circle_id: string;
          user_id: string;
          role: string;
          joined_at: string;
        };
        Insert: {
          id?: string;
          circle_id: string;
          user_id: string;
          role?: string;
          joined_at?: string;
        };
        Update: {
          id?: string;
          circle_id?: string;
          user_id?: string;
          role?: string;
          joined_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'circle_members_circle_id_fkey';
            columns: ['circle_id'];
            referencedRelation: 'circles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'circle_members_user_id_fkey';
            columns: ['user_id'];
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };

      items: {
        Row: {
          id: string;
          owner_id: string;
          circle_id: string | null;
          brand: string;
          model_name: string | null;
          category: Database['public']['Enums']['item_category'] | null;
          color: string | null;
          size: string | null;
          material: string | null;
          condition: Database['public']['Enums']['item_condition'];
          status: Database['public']['Enums']['item_status'];
          purchase_price: number | null;
          purchase_date: string | null;
          estimated_value: number | null;
          currency: string;
          serial_number: string | null;
          authenticity_verified: boolean;
          notes: string | null;
          ai_brand_confidence: number | null;
          ai_identification: Json | null;
          source_url: string | null;
          primary_image_url: string | null;
          is_private: boolean;
          is_lendable: boolean;
          ownership_type: Database['public']['Enums']['ownership_type'];
          current_custodian_id: string | null;
          co_borrow_approval: Database['public']['Enums']['co_borrow_approval'];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          circle_id?: string | null;
          brand: string;
          model_name?: string | null;
          category?: Database['public']['Enums']['item_category'] | null;
          color?: string | null;
          size?: string | null;
          material?: string | null;
          condition?: Database['public']['Enums']['item_condition'];
          status?: Database['public']['Enums']['item_status'];
          purchase_price?: number | null;
          purchase_date?: string | null;
          estimated_value?: number | null;
          currency?: string;
          serial_number?: string | null;
          authenticity_verified?: boolean;
          notes?: string | null;
          ai_brand_confidence?: number | null;
          ai_identification?: Json | null;
          source_url?: string | null;
          primary_image_url?: string | null;
          is_private?: boolean;
          is_lendable?: boolean;
          ownership_type?: Database['public']['Enums']['ownership_type'];
          current_custodian_id?: string | null;
          co_borrow_approval?: Database['public']['Enums']['co_borrow_approval'];
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          owner_id?: string;
          circle_id?: string | null;
          brand?: string;
          model_name?: string | null;
          category?: Database['public']['Enums']['item_category'] | null;
          color?: string | null;
          size?: string | null;
          material?: string | null;
          condition?: Database['public']['Enums']['item_condition'];
          status?: Database['public']['Enums']['item_status'];
          purchase_price?: number | null;
          purchase_date?: string | null;
          estimated_value?: number | null;
          currency?: string;
          serial_number?: string | null;
          authenticity_verified?: boolean;
          notes?: string | null;
          ai_brand_confidence?: number | null;
          ai_identification?: Json | null;
          source_url?: string | null;
          primary_image_url?: string | null;
          is_private?: boolean;
          is_lendable?: boolean;
          ownership_type?: Database['public']['Enums']['ownership_type'];
          current_custodian_id?: string | null;
          co_borrow_approval?: Database['public']['Enums']['co_borrow_approval'];
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'items_owner_id_fkey';
            columns: ['owner_id'];
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'items_circle_id_fkey';
            columns: ['circle_id'];
            referencedRelation: 'circles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'items_current_custodian_id_fkey';
            columns: ['current_custodian_id'];
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };

      item_photos: {
        Row: {
          id: string;
          item_id: string;
          storage_path: string;
          display_order: number;
          is_primary: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          item_id: string;
          storage_path: string;
          display_order?: number;
          is_primary?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          item_id?: string;
          storage_path?: string;
          display_order?: number;
          is_primary?: boolean;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'item_photos_item_id_fkey';
            columns: ['item_id'];
            referencedRelation: 'items';
            referencedColumns: ['id'];
          },
        ];
      };

      borrow_transactions: {
        Row: {
          id: string;
          item_id: string;
          borrower_id: string;
          lender_id: string;
          circle_id: string | null;
          status: Database['public']['Enums']['borrow_status'];
          requested_at: string;
          approved_at: string | null;
          borrowed_at: string | null;
          due_date: string | null;
          returned_at: string | null;
          completed_at: string | null;
          borrower_note: string | null;
          lender_note: string | null;
          return_condition_note: string | null;
          condition_before: Database['public']['Enums']['item_condition'] | null;
          condition_after: Database['public']['Enums']['item_condition'] | null;
          last_nudged_at: string | null;
          nudge_count: number;
          is_co_owned_borrow: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          item_id: string;
          borrower_id: string;
          lender_id: string;
          circle_id?: string | null;
          status?: Database['public']['Enums']['borrow_status'];
          requested_at?: string;
          approved_at?: string | null;
          borrowed_at?: string | null;
          due_date?: string | null;
          returned_at?: string | null;
          completed_at?: string | null;
          borrower_note?: string | null;
          lender_note?: string | null;
          return_condition_note?: string | null;
          condition_before?: Database['public']['Enums']['item_condition'] | null;
          condition_after?: Database['public']['Enums']['item_condition'] | null;
          last_nudged_at?: string | null;
          nudge_count?: number;
          is_co_owned_borrow?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          item_id?: string;
          borrower_id?: string;
          lender_id?: string;
          circle_id?: string | null;
          status?: Database['public']['Enums']['borrow_status'];
          requested_at?: string;
          approved_at?: string | null;
          borrowed_at?: string | null;
          due_date?: string | null;
          returned_at?: string | null;
          completed_at?: string | null;
          borrower_note?: string | null;
          lender_note?: string | null;
          return_condition_note?: string | null;
          condition_before?: Database['public']['Enums']['item_condition'] | null;
          condition_after?: Database['public']['Enums']['item_condition'] | null;
          is_co_owned_borrow?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'borrow_transactions_item_id_fkey';
            columns: ['item_id'];
            referencedRelation: 'items';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'borrow_transactions_borrower_id_fkey';
            columns: ['borrower_id'];
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'borrow_transactions_lender_id_fkey';
            columns: ['lender_id'];
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'borrow_transactions_circle_id_fkey';
            columns: ['circle_id'];
            referencedRelation: 'circles';
            referencedColumns: ['id'];
          },
        ];
      };

      wishlists: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          is_private: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name?: string;
          is_private?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          is_private?: boolean;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'wishlists_user_id_fkey';
            columns: ['user_id'];
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };

      wishlist_items: {
        Row: {
          id: string;
          wishlist_id: string;
          user_id: string;
          item_id: string | null;
          brand: string | null;
          model_name: string | null;
          category: Database['public']['Enums']['item_category'] | null;
          max_price: number | null;
          notes: string | null;
          source_url: string | null;
          priority: number;
          fulfilled: boolean;
          created_at: string;
          target_price: number | null;
          current_savings: number;
          target_date: string | null;
          image_url: string | null;
          ai_metadata: Json | null;
          updated_at: string;
        };
        Insert: {
          id?: string;
          wishlist_id: string;
          user_id: string;
          item_id?: string | null;
          brand?: string | null;
          model_name?: string | null;
          category?: Database['public']['Enums']['item_category'] | null;
          max_price?: number | null;
          notes?: string | null;
          source_url?: string | null;
          priority?: number;
          fulfilled?: boolean;
          created_at?: string;
          target_price?: number | null;
          current_savings?: number;
          target_date?: string | null;
          image_url?: string | null;
          ai_metadata?: Json | null;
          updated_at?: string;
        };
        Update: {
          id?: string;
          wishlist_id?: string;
          user_id?: string;
          item_id?: string | null;
          brand?: string | null;
          model_name?: string | null;
          category?: Database['public']['Enums']['item_category'] | null;
          max_price?: number | null;
          notes?: string | null;
          source_url?: string | null;
          priority?: number;
          fulfilled?: boolean;
          created_at?: string;
          target_price?: number | null;
          current_savings?: number;
          target_date?: string | null;
          image_url?: string | null;
          ai_metadata?: Json | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'wishlist_items_wishlist_id_fkey';
            columns: ['wishlist_id'];
            referencedRelation: 'wishlists';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'wishlist_items_user_id_fkey';
            columns: ['user_id'];
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'wishlist_items_item_id_fkey';
            columns: ['item_id'];
            referencedRelation: 'items';
            referencedColumns: ['id'];
          },
        ];
      };

      activity_feed: {
        Row: {
          id: string;
          circle_id: string | null;
          user_id: string | null;
          type: Database['public']['Enums']['activity_type'];
          item_id: string | null;
          borrow_id: string | null;
          actor_name: string | null;
          summary: string | null;
          metadata: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          circle_id?: string | null;
          user_id?: string | null;
          type: Database['public']['Enums']['activity_type'];
          item_id?: string | null;
          borrow_id?: string | null;
          actor_name?: string | null;
          summary?: string | null;
          metadata?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          circle_id?: string | null;
          user_id?: string | null;
          type?: Database['public']['Enums']['activity_type'];
          item_id?: string | null;
          borrow_id?: string | null;
          actor_name?: string | null;
          summary?: string | null;
          metadata?: Json | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'activity_feed_circle_id_fkey';
            columns: ['circle_id'];
            referencedRelation: 'circles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'activity_feed_user_id_fkey';
            columns: ['user_id'];
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'activity_feed_item_id_fkey';
            columns: ['item_id'];
            referencedRelation: 'items';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'activity_feed_borrow_id_fkey';
            columns: ['borrow_id'];
            referencedRelation: 'borrow_transactions';
            referencedColumns: ['id'];
          },
        ];
      };

      price_history: {
        Row: {
          id: string;
          item_id: string;
          price: number;
          currency: string;
          source: string | null;
          source_url: string | null;
          recorded_at: string;
          ai_confidence: number | null;
          metadata: Json | null;
        };
        Insert: {
          id?: string;
          item_id: string;
          price: number;
          currency?: string;
          source?: string | null;
          source_url?: string | null;
          recorded_at?: string;
          ai_confidence?: number | null;
          metadata?: Json | null;
        };
        Update: {
          id?: string;
          item_id?: string;
          price?: number;
          currency?: string;
          source?: string | null;
          source_url?: string | null;
          recorded_at?: string;
          ai_confidence?: number | null;
          metadata?: Json | null;
        };
        Relationships: [
          {
            foreignKeyName: 'price_history_item_id_fkey';
            columns: ['item_id'];
            referencedRelation: 'items';
            referencedColumns: ['id'];
          },
        ];
      };

      notifications: {
        Row: {
          id: string;
          user_id: string;
          circle_id: string | null;
          type: string;
          title: string;
          body: string | null;
          data: Json | null;
          read_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          circle_id?: string | null;
          type: string;
          title: string;
          body?: string | null;
          data?: Json | null;
          read_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          circle_id?: string | null;
          type?: string;
          title?: string;
          body?: string | null;
          data?: Json | null;
          read_at?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'notifications_user_id_fkey';
            columns: ['user_id'];
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'notifications_circle_id_fkey';
            columns: ['circle_id'];
            referencedRelation: 'circles';
            referencedColumns: ['id'];
          },
        ];
      };

      borrow_nudges: {
        Row: {
          id: string;
          borrow_id: string;
          lender_id: string;
          borrower_id: string;
          message_variant: string;
          nudged_at: string;
        };
        Insert: {
          id?: string;
          borrow_id: string;
          lender_id: string;
          borrower_id: string;
          message_variant?: string;
          nudged_at?: string;
        };
        Update: {
          id?: string;
          borrow_id?: string;
          lender_id?: string;
          borrower_id?: string;
          message_variant?: string;
          nudged_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'borrow_nudges_borrow_id_fkey';
            columns: ['borrow_id'];
            referencedRelation: 'borrow_transactions';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'borrow_nudges_lender_id_fkey';
            columns: ['lender_id'];
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'borrow_nudges_borrower_id_fkey';
            columns: ['borrower_id'];
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };

      item_owners: {
        Row: {
          id: string;
          item_id: string;
          user_id: string | null;
          share_percentage: number;
          amount_paid: number;
          currency: string;
          joined_at: string;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          item_id: string;
          user_id: string;
          share_percentage: number;
          amount_paid?: number;
          currency?: string;
          joined_at?: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          item_id?: string;
          user_id?: string | null;
          share_percentage?: number;
          amount_paid?: number;
          currency?: string;
          joined_at?: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'item_owners_item_id_fkey';
            columns: ['item_id'];
            referencedRelation: 'items';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'item_owners_user_id_fkey';
            columns: ['user_id'];
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };

      ownership_ledger: {
        Row: {
          id: string;
          item_id: string;
          payer_id: string;
          entry_type: Database['public']['Enums']['ledger_entry_type'];
          amount: number;
          currency: string;
          description: string | null;
          splits: Json | null;
          affected_owner_id: string | null;
          new_share_percentage: number | null;
          created_at: string;
          created_by: string | null;
        };
        Insert: {
          id?: string;
          item_id: string;
          payer_id: string;
          entry_type: Database['public']['Enums']['ledger_entry_type'];
          amount: number;
          currency?: string;
          description?: string | null;
          splits?: Json | null;
          affected_owner_id?: string | null;
          new_share_percentage?: number | null;
          created_at?: string;
          created_by?: string | null;
        };
        Update: {
          id?: string;
          item_id?: string;
          payer_id?: string;
          entry_type?: Database['public']['Enums']['ledger_entry_type'];
          amount?: number;
          currency?: string;
          description?: string | null;
          splits?: Json | null;
          affected_owner_id?: string | null;
          new_share_percentage?: number | null;
          created_at?: string;
          created_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'ownership_ledger_item_id_fkey';
            columns: ['item_id'];
            referencedRelation: 'items';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'ownership_ledger_payer_id_fkey';
            columns: ['payer_id'];
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'ownership_ledger_affected_owner_id_fkey';
            columns: ['affected_owner_id'];
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'ownership_ledger_created_by_fkey';
            columns: ['created_by'];
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };

      custody_transfers: {
        Row: {
          id: string;
          item_id: string;
          from_user_id: string;
          to_user_id: string;
          circle_id: string | null;
          status: Database['public']['Enums']['custody_status'];
          requested_at: string;
          approved_at: string | null;
          handed_off_at: string | null;
          completed_at: string | null;
          requester_note: string | null;
          approver_note: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          item_id: string;
          from_user_id: string;
          to_user_id: string;
          circle_id?: string | null;
          status?: Database['public']['Enums']['custody_status'];
          requested_at?: string;
          approved_at?: string | null;
          handed_off_at?: string | null;
          completed_at?: string | null;
          requester_note?: string | null;
          approver_note?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          item_id?: string;
          from_user_id?: string;
          to_user_id?: string;
          circle_id?: string | null;
          status?: Database['public']['Enums']['custody_status'];
          requested_at?: string;
          approved_at?: string | null;
          handed_off_at?: string | null;
          completed_at?: string | null;
          requester_note?: string | null;
          approver_note?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'custody_transfers_item_id_fkey';
            columns: ['item_id'];
            referencedRelation: 'items';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'custody_transfers_from_user_id_fkey';
            columns: ['from_user_id'];
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'custody_transfers_to_user_id_fkey';
            columns: ['to_user_id'];
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'custody_transfers_circle_id_fkey';
            columns: ['circle_id'];
            referencedRelation: 'circles';
            referencedColumns: ['id'];
          },
        ];
      };
    };

    Views: {
      [key: string]: never;
    };

    Functions: {
      is_circle_member: {
        Args: { _circle_id: string };
        Returns: boolean;
      };
      nudge_borrower: {
        Args: { _borrow_id: string; _lender_id: string };
        Returns: Json;
      };
      is_circle_admin: {
        Args: { _circle_id: string };
        Returns: boolean;
      };
      tg_set_updated_at: {
        Args: Record<string, never>;
        Returns: void;
      };
      create_activity_entry: {
        Args: Record<string, never>;
        Returns: void;
      };
      create_borrow_activity: {
        Args: Record<string, never>;
        Returns: void;
      };
      create_wishlist_item_activity: {
        Args: Record<string, never>;
        Returns: void;
      };
      create_wishlist_item_update_activity: {
        Args: Record<string, never>;
        Returns: void;
      };
      create_member_joined_activity: {
        Args: Record<string, never>;
        Returns: void;
      };
      create_member_left_activity: {
        Args: Record<string, never>;
        Returns: void;
      };
      create_co_owned_item: {
        Args: {
          p_brand: string;
          p_model_name: string | null;
          p_category: Database['public']['Enums']['item_category'] | null;
          p_color: string | null;
          p_condition: Database['public']['Enums']['item_condition'] | null;
          p_estimated_value: number | null;
          p_currency: string | null;
          p_notes: string | null;
          p_is_private: boolean | null;
          p_is_lendable: boolean | null;
          p_primary_image_url: string | null;
          p_purchase_price: number | null;
          p_purchase_date: string | null;
          p_circle_id: string | null;
          p_co_borrow_approval: Database['public']['Enums']['co_borrow_approval'] | null;
          p_owners: Json;
        };
        Returns: Json;
      };
      process_buyout: {
        Args: {
          p_item_id: string;
          p_buyer_id: string;
          p_seller_id: string;
          p_shares_bought: number;
          p_buyout_amount: number;
          p_currency: string | null;
          p_notes: string | null;
        };
        Returns: Json;
      };
      set_default_custodian: {
        Args: Record<string, never>;
        Returns: void;
      };
      validate_item_ownership_shares: {
        Args: Record<string, never>;
        Returns: void;
      };
      update_custodian_on_borrow: {
        Args: Record<string, never>;
        Returns: void;
      };
    };

    Enums: {
      item_category:
        | 'bag'
        | 'jewelry'
        | 'watch'
        | 'shoes'
        | 'clothing'
        | 'accessories'
        | 'other';
      item_condition: 'new' | 'like_new' | 'good' | 'fair' | 'poor';
      item_status: 'available' | 'borrowed' | 'unavailable';
      borrow_status:
        | 'requested'
        | 'approved'
        | 'active'
        | 'returned_pending'
        | 'completed'
        | 'declined'
        | 'cancelled';
      activity_type:
        | 'item_added'
        | 'item_updated'
        | 'item_removed'
        | 'borrow_requested'
        | 'borrow_approved'
        | 'borrow_active'
        | 'borrow_returned'
        | 'borrow_completed'
        | 'borrow_declined'
        | 'wishlist_item_added'
        | 'price_alert'
        | 'member_joined'
        | 'member_left'
        | 'co_ownership_created'
        | 'custody_requested'
        | 'custody_transferred'
        | 'co_owner_added'
        | 'co_owner_removed'
        | 'share_buyout';
      ownership_type: 'sole' | 'co_owned';
      co_borrow_approval: 'custodian' | 'any_owner';
      ledger_entry_type:
        | 'purchase'
        | 'maintenance'
        | 'insurance'
        | 'storage'
        | 'buyout'
        | 'resale_proceeds'
        | 'adjustment';
      custody_status:
        | 'requested'
        | 'approved'
        | 'active'
        | 'completed'
        | 'declined'
        | 'cancelled';
    };

    CompositeTypes: {
      [key: string]: never;
    };
  };
}

export default Database;
