export interface RemedialContent {
  id: string;
  title: string;
  description: string;
  type: 'flashcard' | 'video' | 'article';
  content: string; // URL or content body
}

export const REMEDIAL_CONTENT_MAP: Record<string, RemedialContent> = {
  'q1': {
    id: 'r1',
    title: 'Flashcard: Konsep Dasar AI',
    description: 'Tinjau kembali definisi AI dan Machine Learning.',
    type: 'flashcard',
    content: 'AI adalah simulasi kecerdasan manusia oleh mesin.'
  },
  'q2': {
    id: 'r2',
    title: 'Video: Supervised Learning',
    description: 'Tonton penjelasan singkat tentang Supervised Learning.',
    type: 'video',
    content: 'https://example.com/video-supervised-learning'
  },
  // Add more as needed
};
