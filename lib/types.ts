export type Media = {
  id: string; creator_id: string; creator_name: string; scene: string; prompt: string;
  caption: string; model: string; style: string; created_at: string; updated_at: string;
  deleted_at: string | null; image_path: string | null; image_url?: string; upvotes: number; downvotes: number;
};
export type Profile = {
  id: string; first_name: string | null; last_name: string | null; email: string;
  is_superadmin: boolean; created_at: string; last_sign_in_at: string | null;
  media_count: number; vote_count: number;
};
export type Vote = {
  id: number; generation_id: string; user_id: string; value: number; created_at: string;
  updated_at: string; caption: string; voter_name: string; deleted_at: string | null;
};
export type Activity = { id: string; actor_name: string; action: string; media_id: string; summary: string; created_at: string };
export type Snapshot = {
  stats: { profiles: number; media: number; deleted: number; votes: number; upvotes: number; downvotes: number; unrated: number; active_voters: number; new_media: number };
  profiles: Profile[]; media: Media[]; votes: Vote[]; activity: Activity[];
  daily: { day: string; media: number; votes: number }[];
  styles: { style: string; count: number; upvotes: number; downvotes: number }[];
};
