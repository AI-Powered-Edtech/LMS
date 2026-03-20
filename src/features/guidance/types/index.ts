// SP-18: In-App Learning Guidance Types

export interface ApplicableGuide {
    id: string;
    title: string;
    content: string;
    guide_type: 'tooltip' | 'banner' | 'walkthrough' | 'checkpoint';
    trigger_type: 'on_enter' | 'after_seconds' | 'on_struggle' | 'on_idle';
    trigger_value: number;
    priority: number;
    impression_count: number;
}

export interface LearningGuide {
    id: string;
    title: string;
    content: string;
    guide_type: 'tooltip' | 'banner' | 'walkthrough' | 'checkpoint';
    target_type: 'lesson' | 'course' | 'quiz';
    target_id: string;
    segment: 'all' | 'at_risk' | 'low' | 'medium' | 'high' | 'struggling';
    trigger_type: 'on_enter' | 'after_seconds' | 'on_struggle' | 'on_idle';
    trigger_value: number;
    priority: number;
    is_active: boolean;
    max_impressions: number | null;
    starts_at: string | null;
    ends_at: string | null;
    total_impressions: number;
    total_dismissals: number;
    total_completions: number;
    created_at: string;
}

export type GuideSegment = LearningGuide['segment'];
export type GuideTrigger = LearningGuide['trigger_type'];
export type GuideType = LearningGuide['guide_type'];
export type GuideTargetType = LearningGuide['target_type'];
