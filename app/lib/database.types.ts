export interface Profile {
  id: string;
  nickname: string;
  full_name: string | null;
  gender: string | null;
  nationality: string | null;
  avatar_url: string | null;
  role: 'user' | 'admin';
  created_at: string;
  updated_at: string;
}

export interface Post {
  id: string;
  author_id: string;
  category: string;
  title: string;
  content: string;
  language: 'kr' | 'en' | 'cn' | 'jp';
  image_urls: string[];
  view_count: number;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
}

export interface PostWithAuthor extends Post {
  author: Pick<Profile, 'nickname' | 'nationality' | 'avatar_url'>;
}
