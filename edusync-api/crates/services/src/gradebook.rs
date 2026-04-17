//! Gradebook Service — Server-side statistics computation
//!
//! Ports `src/features/gradebook/hooks/useGradebookState.ts`
//!
//! Features:
//! - Student grade averages (weighted by assignment weight)
//! - Class statistics (highest, lowest, average, std deviation)
//! - Grade color derivation based on thresholds
//! - CSV export

use serde::{Deserialize, Serialize};
use sqlx::{PgPool, Row};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StudentGrade {
    pub student_id: Uuid,
    pub student_name: String,
    pub grades: Vec<AssignmentGrade>,
    pub weighted_average: f64,
    pub letter_grade: String,
    pub grade_color: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AssignmentGrade {
    pub assignment_id: Uuid,
    pub assignment_name: String,
    pub score: Option<f64>,
    pub max_score: f64,
    pub weight: f64,
    pub submitted_at: Option<String>,
    pub status: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ClassStatistics {
    pub total_students: i32,
    pub submitted_count: i32,
    pub highest_average: f64,
    pub lowest_average: f64,
    pub class_average: f64,
    pub std_deviation: f64,
    pub grade_distribution: GradeDistribution,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GradeDistribution {
    pub a_count: i32,
    pub b_count: i32,
    pub c_count: i32,
    pub d_count: i32,
    pub e_count: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GradebookResponse {
    pub students: Vec<StudentGrade>,
    pub class_id: Uuid,
    pub statistics: ClassStatistics,
}

const GRADE_THRESHOLDS: [(f64, &str, &str); 5] = [
    (85.0, "A", "#22c55e"),
    (75.0, "B", "#3b82f6"),
    (65.0, "C", "#eab308"),
    (55.0, "D", "#f97316"),
    (0.0, "E", "#ef4444"),
];

pub fn calculate_letter_grade(percentage: f64) -> String {
    for (threshold, letter, _) in GRADE_THRESHOLDS.iter() {
        if percentage >= *threshold {
            return letter.to_string();
        }
    }
    "E".to_string()
}

pub fn calculate_grade_color(percentage: f64) -> String {
    for (threshold, _, color) in GRADE_THRESHOLDS.iter() {
        if percentage >= *threshold {
            return color.to_string();
        }
    }
    "#ef4444".to_string()
}

pub fn calculate_weighted_average(grades: &[AssignmentGrade]) -> f64 {
    let total_weight: f64 = grades.iter().map(|g| g.weight).sum();
    if total_weight == 0.0 {
        return 0.0;
    }

    let weighted_sum: f64 = grades
        .iter()
        .filter_map(|g| g.score.map(|s| s * g.weight))
        .sum();

    weighted_sum / total_weight
}

pub fn calculate_mean(values: &[f64]) -> f64 {
    if values.is_empty() {
        return 0.0;
    }
    values.iter().sum::<f64>() / values.len() as f64
}

pub fn calculate_std_deviation(values: &[f64]) -> f64 {
    if values.is_empty() {
        return 0.0;
    }
    let mean = calculate_mean(values);
    let variance: f64 = values.iter().map(|v| (v - mean).powi(2)).sum::<f64>() / values.len() as f64;
    variance.sqrt()
}

pub async fn get_gradebook(
    db: &PgPool,
    class_id: Uuid,
    tenant_id: Uuid,
) -> Result<GradebookResponse, GradebookError> {
    let student_rows: Vec<(Uuid, String)> = sqlx::query_as(
        r#"
        SELECT u.id, COALESCE(p.display_name, p.username, 'Unknown')
        FROM public.users u
        JOIN public.profiles p ON p.user_id = u.id
        JOIN public.class_enrollments ce ON ce.user_id = u.id
        WHERE ce.class_id = $1 AND ce.tenant_id = $2 AND ce.role = 'student'
        ORDER BY p.display_name NULLS LAST, p.username
        "#,
    )
    .bind(class_id)
    .bind(tenant_id)
    .fetch_all(db)
    .await
    .map_err(|e| GradebookError::Database(e.to_string()))?;

    let assignment_rows: Vec<(Uuid, String, f64)> = sqlx::query_as(
        r#"
        SELECT id, title, COALESCE(weight, 1.0)
        FROM public.assignments
        WHERE class_id = $1 AND tenant_id = $2 AND is_active = true
        ORDER BY due_date NULLS LAST, created_at
        "#,
    )
    .bind(class_id)
    .bind(tenant_id)
    .fetch_all(db)
    .await
    .map_err(|e| GradebookError::Database(e.to_string()))?;

    let mut students = Vec::new();
    let mut all_averages = Vec::new();

    for (student_id, student_name) in student_rows {
        let submission_rows: Vec<(Uuid, Option<f64>, chrono::DateTime<chrono::Utc>)> = sqlx::query_as(
            r#"
            SELECT assignment_id, score, submitted_at
            FROM public.submissions
            WHERE student_id = $1 AND assignment_id = ANY($2)
            "#,
        )
        .bind(student_id)
        .bind(&assignment_rows.iter().map(|(id, _, _)| id).collect::<Vec<_>>())
        .fetch_all(db)
        .await
        .map_err(|e| GradebookError::Database(e.to_string()))?;

        let submissions_map: std::collections::HashMap<Uuid, (Option<f64>, chrono::DateTime<chrono::Utc>)> =
            submission_rows.into_iter().map(|(aid, score, sat)| (aid, (score, sat))).collect();

        let mut grades = Vec::new();
        let mut has_submission = false;

        for (assignment_id, assignment_name, weight) in &assignment_rows {
            let (score, submitted_at) = submissions_map.get(assignment_id).cloned().unwrap_or((None, chrono::Utc::now()));
            
            if score.is_some() {
                has_submission = true;
            }

            grades.push(AssignmentGrade {
                assignment_id: *assignment_id,
                assignment_name: assignment_name.clone(),
                score,
                max_score: 100.0,
                weight: *weight,
                submitted_at: submitted_at.to_rfc3339().into(),
                status: score.map_or("not_submitted".to_string(), |_| "submitted".to_string()),
            });
        }

        let weighted_average = calculate_weighted_average(&grades);
        let letter_grade = calculate_letter_grade(weighted_average);
        let grade_color = calculate_grade_color(weighted_average);

        all_averages.push(weighted_average);

        students.push(StudentGrade {
            student_id,
            student_name,
            grades,
            weighted_average,
            letter_grade,
            grade_color,
        });
    }

    let submitted_count = all_averages.iter().filter(|&&a| a > 0.0).count() as i32;
    let non_zero_averages: Vec<f64> = all_averages.into_iter().filter(|&a| a > 0.0).collect();

    let highest_average = non_zero_averages.iter().cloned().fold(0.0f64, f64::max);
    let lowest_average = non_zero_averages.iter().cloned().fold(100.0f64, f64::min);
    let class_average = calculate_mean(&non_zero_averages);
    let std_deviation = calculate_std_deviation(&non_zero_averages);

    let mut grade_distribution = GradeDistribution {
        a_count: 0,
        b_count: 0,
        c_count: 0,
        d_count: 0,
        e_count: 0,
    };

    for student in &students {
        match student.letter_grade.as_str() {
            "A" => grade_distribution.a_count += 1,
            "B" => grade_distribution.b_count += 1,
            "C" => grade_distribution.c_count += 1,
            "D" => grade_distribution.d_count += 1,
            "E" => grade_distribution.e_count += 1,
            _ => {}
        }
    }

    let statistics = ClassStatistics {
        total_students: students.len() as i32,
        submitted_count,
        highest_average,
        lowest_average,
        class_average,
        std_deviation,
        grade_distribution,
    };

    Ok(GradebookResponse {
        students,
        class_id,
        statistics,
    })
}

pub async fn get_student_grades(
    db: &PgPool,
    student_id: Uuid,
    course_id: Option<Uuid>,
    tenant_id: Uuid,
) -> Result<Vec<StudentGrade>, GradebookError> {
    let class_rows: Vec<Uuid> = if let Some(cid) = course_id {
        sqlx::query_scalar(
            r#"
            SELECT class_id
            FROM public.class_enrollments
            WHERE user_id = $1 AND class_id IN (
                SELECT id FROM public.classes WHERE course_id = $2 AND tenant_id = $3
            )
            "#,
        )
        .bind(student_id)
        .bind(cid)
        .bind(tenant_id)
        .fetch_all(db)
        .await
        .map_err(|e| GradebookError::Database(e.to_string()))?
    } else {
        sqlx::query_scalar(
            r#"
            SELECT class_id
            FROM public.class_enrollments
            WHERE user_id = $1 AND tenant_id = $2 AND role = 'student'
            "#,
        )
        .bind(student_id)
        .bind(tenant_id)
        .fetch_all(db)
        .await
        .map_err(|e| GradebookError::Database(e.to_string()))?
    };

    let mut all_grades = Vec::new();
    let username: String = sqlx::query_scalar(
        r#"
        SELECT COALESCE(display_name, username, 'Unknown')
        FROM public.profiles
        WHERE user_id = $1
        "#,
    )
    .bind(student_id)
    .fetch_one(db)
    .await
    .map_err(|e| GradebookError::Database(e.to_string()))?;

    for class_id in class_rows {
        let assignment_rows: Vec<(Uuid, String, f64)> = sqlx::query_as(
            r#"
            SELECT id, title, COALESCE(weight, 1.0)
            FROM public.assignments
            WHERE class_id = $1 AND tenant_id = $2 AND is_active = true
            ORDER BY due_date NULLS LAST
            "#,
        )
        .bind(class_id)
        .bind(tenant_id)
        .fetch_all(db)
        .await
        .map_err(|e| GradebookError::Database(e.to_string()))?;

        if assignment_rows.is_empty() {
            continue;
        }

        let submission_rows: Vec<(Uuid, Option<f64>, chrono::DateTime<chrono::Utc>)> = sqlx::query_as(
            r#"
            SELECT assignment_id, score, submitted_at
            FROM public.submissions
            WHERE student_id = $1 AND assignment_id = ANY($2)
            "#,
        )
        .bind(student_id)
        .bind(&assignment_rows.iter().map(|(id, _, _)| id).collect::<Vec<_>>())
        .fetch_all(db)
        .await
        .map_err(|e| GradebookError::Database(e.to_string()))?;

        let submissions_map: std::collections::HashMap<Uuid, (Option<f64>, chrono::DateTime<chrono::Utc>)> =
            submission_rows.into_iter().map(|(aid, score, sat)| (aid, (score, sat))).collect();

        let mut grades = Vec::new();
        for (assignment_id, assignment_name, weight) in assignment_rows {
            let (score, submitted_at) = submissions_map.get(&assignment_id).cloned().unwrap_or((None, chrono::Utc::now()));

            grades.push(AssignmentGrade {
                assignment_id,
                assignment_name,
                score,
                max_score: 100.0,
                weight,
                submitted_at: submitted_at.to_rfc3339().into(),
                status: score.map_or("not_submitted".to_string(), |_| "submitted".to_string()),
            });
        }

        let weighted_average = calculate_weighted_average(&grades);
        all_grades.push(StudentGrade {
            student_id,
            student_name: username.clone(),
            grades,
            weighted_average,
            letter_grade: calculate_letter_grade(weighted_average),
            grade_color: calculate_grade_color(weighted_average),
        });
    }

    Ok(all_grades)
}

#[derive(Debug)]
pub enum GradebookError {
    Database(String),
    NotFound,
    Internal(String),
}

impl std::fmt::Display for GradebookError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            GradebookError::Database(msg) => write!(f, "Database error: {msg}"),
            GradebookError::NotFound => write!(f, "Resource not found"),
            GradebookError::Internal(msg) => write!(f, "Internal error: {msg}"),
        }
    }
}

impl std::error::Error for GradebookError {}

impl From<sqlx::Error> for GradebookError {
    fn from(e: sqlx::Error) -> Self {
        GradebookError::Database(e.to_string())
    }
}
