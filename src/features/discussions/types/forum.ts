/** A comment/reply within a forum post */
export interface ForumComment {
  id: string;
  author: string;
  avatar: string;
  role: string;
  points: number;
  badges: string[];
  content: string;
  upvotes: number;
  time: string;
  isBestAnswer?: boolean;
  replies?: ForumComment[];
}

/** A top-level forum post with its comments */
export interface ForumPost {
  id: string;
  author: string;
  avatar: string;
  role: string;
  points: number;
  badges: string[];
  time: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  upvotes: number;
  isAnonymous: boolean;
  contextLink?: { title: string; url: string };
  bestAnswerId?: string;
  comments: ForumComment[];
}
