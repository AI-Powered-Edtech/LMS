//! Item Analysis — Statistical question analysis
//!
//! Ports `src/features/quizzes/utils/itemAnalysis.ts`
//!
//! Features:
//! - Difficulty Index (P) = correct_count / total_attempts
//! - Discrimination Index (D) = (upper_group_correct - lower_group_correct) / group_size
//! - Point-Biserial Correlation (PBIS)
//! - Question quality recommendations

use serde::{Deserialize, Serialize};
use sqlx::{PgPool, Row};
use uuid::Uuid;
use std::collections::HashMap;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ItemStatistics {
    pub question_id: Uuid,
    pub difficulty_index: f64,
    pub discrimination_index: f64,
    pub point_biserial: f64,
    pub total_attempts: i32,
    pub correct_count: i32,
    pub recommendation: String,
    pub reliability_rating: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QuizItemAnalysis {
    pub quiz_id: Uuid,
    pub items: Vec<ItemStatistics>,
    pub average_difficulty: f64,
    pub average_discrimination: f64,
    pub reliability_score: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QuestionPerformance {
    pub question_id: Uuid,
    pub total_attempts: i32,
    pub correct_rate: f64,
    pub avg_time_seconds: Option<f64>,
}

const DIFFICULTY_THRESHOLD_EASY: f64 = 0.8;
const DIFFICULTY_THRESHOLD_MEDIUM: f64 = 0.4;
const DISCRIMINATION_THRESHOLD_GOOD: f64 = 0.3;
const DISCRIMINATION_THRESHOLD_POOR: f64 = 0.1;
const PBIS_THRESHOLD_GOOD: f64 = 0.3;
const PBIS_THRESHOLD_POOR: f64 = 0.15;

pub fn calculate_difficulty_index(correct_count: i32, total_attempts: i32) -> f64 {
    if total_attempts == 0 {
        return 0.0;
    }
    correct_count as f64 / total_attempts as f64
}

pub fn calculate_discrimination_index(
    upper_correct: i32,
    lower_correct: i32,
    group_size: i32,
) -> f64 {
    if group_size == 0 {
        return 0.0;
    }
    (upper_correct as f64 - lower_correct as f64) / group_size as f64
}

pub fn calculate_point_biserial(
    item_scores: &[f64],
    total_scores: &[f64],
) -> f64 {
    if item_scores.is_empty() || total_scores.is_empty() || item_scores.len() != total_scores.len() {
        return 0.0;
    }

    let n = item_scores.len() as f64;
    if n < 2.0 {
        return 0.0;
    }

    let mean_item = item_scores.iter().sum::<f64>() / n;
    let mean_total = total_scores.iter().sum::<f64>() / n;

    let std_item = (item_scores.iter().map(|x| (x - mean_item).powi(2)).sum::<f64>() / n).sqrt();
    let std_total = (total_scores.iter().map(|x| (x - mean_total).powi(2)).sum::<f64>() / n).sqrt();

    if std_item == 0.0 || std_total == 0.0 {
        return 0.0;
    }

    let covariance = item_scores.iter()
        .zip(total_scores.iter())
        .map(|(i, t)| (i - mean_item) * (t - mean_total))
        .sum::<f64>() / n;

    covariance / (std_item * std_total)
}

pub fn get_difficulty_rating(difficulty: f64) -> String {
    if difficulty >= DIFFICULTY_THRESHOLD_EASY {
        "easy".to_string()
    } else if difficulty >= DIFFICULTY_THRESHOLD_MEDIUM {
        "medium".to_string()
    } else {
        "hard".to_string()
    }
}

pub fn get_discrimination_rating(discrimination: f64) -> String {
    if discrimination >= DISCRIMINATION_THRESHOLD_GOOD {
        "good".to_string()
    } else if discrimination >= DISCRIMINATION_THRESHOLD_POOR {
        "acceptable".to_string()
    } else {
        "poor".to_string()
    }
}

pub fn get_pbis_rating(pbis: f64) -> String {
    if pbis >= PBIS_THRESHOLD_GOOD {
        "strong".to_string()
    } else if pbis >= PBIS_THRESHOLD_POOR {
        "moderate".to_string()
    } else {
        "weak".to_string()
    }
}

pub fn generate_recommendation(
    difficulty: f64,
    discrimination: f64,
    pbis: f64,
) -> String {
    let diff_rating = get_difficulty_rating(difficulty);
    let disc_rating = get_discrimination_rating(discrimination);
    let pbis_rating = get_pbis_rating(pbis);

    if discrimination < DISCRIMINATION_THRESHOLD_POOR {
        return format!(
            "Question has poor discrimination ({}). Consider revising or replacing. \
             Current stats: difficulty={}, discrimination={}, pbis={}",
            disc_rating, diff_rating, disc_rating, pbis_rating
        );
    }

    if pbis < PBIS_THRESHOLD_POOR {
        return format!(
            "Question has weak point-biserial correlation ({}). \
             It may not effectively differentiate between high and low performers. \
             Consider revision.",
            pbis_rating
        );
    }

    if difficulty < DIFFICULTY_THRESHOLD_MEDIUM {
        return format!(
            "Question is very difficult ({}). Consider adding hints or simplifying. \
             Current stats: difficulty={}, discrimination={}, pbis={}",
            diff_rating, diff_rating, disc_rating, pbis_rating
        );
    }

    if difficulty >= DIFFICULTY_THRESHOLD_EASY {
        return format!(
            "Question is easy ({}). Consider making it more challenging \
             or use for diagnostic purposes. \
             Current stats: difficulty={}, discrimination={}, pbis={}",
            diff_rating, diff_rating, disc_rating, pbis_rating
        );
    }

    format!(
        "Question is adequate. Stats: difficulty={}, discrimination={}, pbis={}",
        diff_rating, disc_rating, pbis_rating
    )
}

pub async fn analyze_quiz_item(
    db: &PgPool,
    question_id: Uuid,
    tenant_id: Uuid,
) -> Result<ItemStatistics, ItemAnalysisError> {
    let stats_row: Option<(i32, i32,)> = sqlx::query_as(
        r#"
        SELECT 
            COUNT(*)::int as total_attempts,
            SUM(CASE WHEN is_correct = true THEN 1 ELSE 0 END)::int as correct_count
        FROM public.quiz_attempt_questions_v2 qaq
        JOIN public.quiz_attempts_v2 qa ON qa.id = qaq.attempt_id
        WHERE qaq.question_id = $1 AND qa.tenant_id = $2 AND qa.status IN ('graded', 'submitted')
        "#,
    )
    .bind(question_id)
    .bind(tenant_id)
    .fetch_optional(db)
    .await
    .map_err(|e| ItemAnalysisError::Database(e.to_string()))?;

    let (total_attempts, correct_count) = stats_row.unwrap_or((0, 0));

    let difficulty = calculate_difficulty_index(correct_count, total_attempts);

    let upper_lower: Option<(i32, i32, i32)> = sqlx::query_as(
        r#"
        WITH ranked_attempts AS (
            SELECT 
                qa.id as attempt_id,
                qa.score,
                ROW_NUMBER() OVER (ORDER BY qa.score DESC) as rank_desc,
                ROW_NUMBER() OVER (ORDER BY qa.score ASC) as rank_asc,
                COUNT(*) OVER () as total
            FROM public.quiz_attempts_v2 qa
            JOIN public.quiz_attempt_questions_v2 qaq ON qaq.attempt_id = qa.id
            WHERE qaq.question_id = $1 AND qa.tenant_id = $2 AND qa.status IN ('graded', 'submitted')
        )
        SELECT 
            (SELECT COUNT(*) FROM ranked_attempts WHERE rank_desc <= CEIL(total::numeric/3) AND EXISTS (
                SELECT 1 FROM public.quiz_attempt_questions_v2 qaq2 
                WHERE qaq2.attempt_id = ranked_attempts.attempt_id AND qaq2.question_id = $1 AND qaq2.is_correct = true
            ))::int as upper_correct,
            (SELECT COUNT(*) FROM ranked_attempts WHERE rank_asc <= CEIL(total::numeric/3) AND EXISTS (
                SELECT 1 FROM public.quiz_attempt_questions_v2 qaq2 
                WHERE qaq2.attempt_id = ranked_attempts.attempt_id AND qaq2.question_id = $1 AND qaq2.is_correct = true
            ))::int as lower_correct,
            CEIL(total::numeric/3)::int as group_size
        FROM ranked_attempts
        LIMIT 1
        "#,
    )
    .bind(question_id)
    .bind(tenant_id)
    .fetch_optional(db)
    .await
    .map_err(|e| ItemAnalysisError::Database(e.to_string()))?;

    let (upper_correct, lower_correct, group_size) = upper_lower.unwrap_or((0, 0, 0));
    let discrimination = calculate_discrimination_index(upper_correct, lower_correct, group_size);

    let item_scores_row: Vec<(bool,)> = sqlx::query_as(
        r#"
        SELECT qaq.is_correct
        FROM public.quiz_attempt_questions_v2 qaq
        JOIN public.quiz_attempts_v2 qa ON qa.id = qaq.attempt_id
        WHERE qaq.question_id = $1 AND qa.tenant_id = $2 AND qa.status IN ('graded', 'submitted')
        "#,
    )
    .bind(question_id)
    .bind(tenant_id)
    .fetch_all(db)
    .await
    .map_err(|e| ItemAnalysisError::Database(e.to_string()))?;

    let item_scores: Vec<f64> = item_scores_row.iter().map(|(is_correct,)| if *is_correct { 1.0 } else { 0.0 }).collect();

    let total_scores_row: Vec<(Option<f64>,)> = sqlx::query_as(
        r#"
        SELECT qa.score
        FROM public.quiz_attempt_questions_v2 qaq
        JOIN public.quiz_attempts_v2 qa ON qa.id = qaq.attempt_id
        WHERE qaq.question_id = $1 AND qa.tenant_id = $2 AND qa.status IN ('graded', 'submitted')
        "#,
    )
    .bind(question_id)
    .bind(tenant_id)
    .fetch_all(db)
    .await
    .map_err(|e| ItemAnalysisError::Database(e.to_string()))?;

    let total_scores: Vec<f64> = total_scores_row.iter().filter_map(|(s,)| *s).collect();

    let pbis = calculate_point_biserial(&item_scores, &total_scores);

    let recommendation = generate_recommendation(difficulty, discrimination, pbis);

    let reliability_rating = if discrimination >= DISCRIMINATION_THRESHOLD_GOOD && pbis >= PBIS_THRESHOLD_GOOD {
        "high"
    } else if discrimination >= DISCRIMINATION_THRESHOLD_POOR && pbis >= PBIS_THRESHOLD_POOR {
        "moderate"
    } else {
        "low"
    };

    Ok(ItemStatistics {
        question_id,
        difficulty_index: (difficulty * 1000.0).round() / 10.0,
        discrimination_index: (discrimination * 1000.0).round() / 10.0,
        point_biserial: (pbis * 1000.0).round() / 10.0,
        total_attempts,
        correct_count,
        recommendation,
        reliability_rating: reliability_rating.to_string(),
    })
}

pub async fn analyze_quiz(
    db: &PgPool,
    quiz_id: Uuid,
    tenant_id: Uuid,
) -> Result<QuizItemAnalysis, ItemAnalysisError> {
    let question_ids: Vec<Uuid> = sqlx::query_scalar(
        r#"
        SELECT id
        FROM public.quiz_questions
        WHERE quiz_id = $1 AND tenant_id = $2
        "#,
    )
    .bind(quiz_id)
    .bind(tenant_id)
    .fetch_all(db)
    .await
    .map_err(|e| ItemAnalysisError::Database(e.to_string()))?;

    let mut items = Vec::new();
    let mut total_difficulty = 0.0;
    let mut total_discrimination = 0.0;

    for qid in question_ids {
        match analyze_quiz_item(db, qid, tenant_id).await {
            Ok(stats) => {
                total_difficulty += stats.difficulty_index;
                total_discrimination += stats.discrimination_index;
                items.push(stats);
            }
            Err(e) => {
                tracing::warn!(question_id = %qid, error = %e, "Failed to analyze question");
            }
        }
    }

    let n = items.len() as f64;
    let average_difficulty = if n > 0.0 { total_difficulty / n } else { 0.0 };
    let average_discrimination = if n > 0.0 { total_discrimination / n } else { 0.0 };

    let reliability_score = ((average_discrimination / 100.0) * 0.5 + 
        (average_difficulty / 100.0) * (1.0 - (average_difficulty / 100.0)) * 0.5) * 100.0;

    Ok(QuizItemAnalysis {
        quiz_id,
        items,
        average_difficulty: (average_difficulty * 10.0).round() / 10.0,
        average_discrimination: (average_discrimination * 10.0).round() / 10.0,
        reliability_score: (reliability_score * 10.0).round() / 10.0,
    })
}

#[derive(Debug)]
pub enum ItemAnalysisError {
    Database(String),
    QuestionNotFound,
    InsufficientData,
    Internal(String),
}

impl std::fmt::Display for ItemAnalysisError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            ItemAnalysisError::Database(msg) => write!(f, "Database error: {msg}"),
            ItemAnalysisError::QuestionNotFound => write!(f, "Question not found"),
            ItemAnalysisError::InsufficientData => write!(f, "Insufficient data for analysis"),
            ItemAnalysisError::Internal(msg) => write!(f, "Internal error: {msg}"),
        }
    }
}

impl std::error::Error for ItemAnalysisError {}

impl From<sqlx::Error> for ItemAnalysisError {
    fn from(e: sqlx::Error) -> Self {
        ItemAnalysisError::Database(e.to_string())
    }
}
