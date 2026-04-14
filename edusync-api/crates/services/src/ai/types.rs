/// Request/response types for all AI handlers.
///
/// All types derive Serialize + Deserialize so they can be used both as JSON
/// request bodies and response bodies in Axum handlers.
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use uuid::Uuid;

// ─── Essay Grading ────────────────────────────────────────────────────────────

/// One rubric criterion sent by the caller.
#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct RubricCriterion {
    /// Name of the criterion (e.g. "Tata Bahasa & Ejaan").
    pub criterion: String,
    /// Maximum points for this criterion.
    #[serde(rename = "maxPoints", alias = "maxScore")]
    pub max_points: f64,
    /// Optional description / guidance for the grader.
    #[serde(default)]
    pub description: String,
}

#[derive(Debug, Deserialize)]
pub struct GradeEssayRequest {
    /// Opaque identifier for the submission (format: assignmentId-studentId).
    #[serde(rename = "submissionId")]
    pub submission_id: String,
    /// The student's essay text (max 10 000 characters).
    #[serde(rename = "essayText")]
    pub essay_text: String,
    /// Rubric criteria used for grading.
    pub rubric: Vec<RubricCriterion>,
}

/// AI-generated grading result.
#[derive(Debug, Serialize, Deserialize)]
pub struct GradeEssayResponse {
    /// Map: criterion name → score awarded.
    pub scores: HashMap<String, f64>,
    /// Map: criterion name → feedback string.
    pub feedback: HashMap<String, String>,
    /// Overall narrative feedback.
    #[serde(rename = "overallFeedback")]
    pub overall_feedback: String,
}

// ─── AI Tutor ─────────────────────────────────────────────────────────────────

#[derive(Debug, Deserialize)]
pub struct TutorChatRequest {
    /// Lesson the student is studying.
    pub lesson_id: Uuid,
    /// The student's question / message (max 2 000 characters).
    pub message: String,
    /// Optional: resume an existing session.
    pub session_id: Option<Uuid>,
}

#[derive(Debug, Serialize)]
pub struct TutorChatResponse {
    /// Assistant reply text.
    pub reply: String,
    /// Session ID (new or existing).
    pub session_id: Uuid,
    /// Number of messages exchanged in this session so far.
    pub message_count: i32,
}

/// A single message in the tutor conversation history.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChatMessage {
    pub role: ChatRole,
    pub content: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum ChatRole {
    User,
    Assistant,
    System,
}

// ─── Content Generation ───────────────────────────────────────────────────────

/// Assignment / content type.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum AssignmentType {
    Quiz,
    Reading,
    Writing,
}

/// Bloom's taxonomy level (C1–C6).
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum BloomLevel {
    C1,
    C2,
    C3,
    C4,
    C5,
    C6,
}

impl BloomLevel {
    pub fn description(&self) -> &'static str {
        match self {
            BloomLevel::C1 => "C1-Mengingat: soal menguji daya ingat fakta, definisi, istilah, dan konsep dasar",
            BloomLevel::C2 => "C2-Memahami: soal menguji pemahaman dan kemampuan menjelaskan konsep dengan kata sendiri",
            BloomLevel::C3 => "C3-Mengaplikasikan: soal menguji kemampuan menerapkan konsep pada situasi baru",
            BloomLevel::C4 => "C4-Menganalisis: soal menguji kemampuan menguraikan, membandingkan, dan membedakan",
            BloomLevel::C5 => "C5-Mengevaluasi: soal menguji kemampuan menilai, mengkritisi, dan mempertahankan argumen",
            BloomLevel::C6 => "C6-Mencipta: soal menguji kemampuan merancang, menghasilkan ide baru, dan bersintesis",
        }
    }
}

#[derive(Debug, Deserialize)]
pub struct GenerateContentRequest {
    /// Type of assignment to generate.
    pub assignment_type: AssignmentType,
    /// Bloom's level (default: C2).
    #[serde(default)]
    pub bloom_level: Option<BloomLevel>,
    /// Number of questions / items to generate (1–20).
    #[serde(default)]
    pub question_count: Option<u8>,
    /// Inline text content to generate from. If omitted, multipart file is used.
    pub text_content: Option<String>,
    /// Optional title / label for the content.
    pub title: Option<String>,
}

/// A generated question option.
#[derive(Debug, Serialize, Deserialize)]
pub struct GeneratedOption {
    pub text: String,
    pub is_correct: bool,
}

/// A generated question.
#[derive(Debug, Serialize, Deserialize)]
pub struct GeneratedQuestion {
    pub text: String,
    #[serde(default)]
    pub explanation: Option<String>,
    #[serde(default)]
    pub options: Vec<GeneratedOption>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct GenerateContentResponse {
    /// Brief summary of the source material.
    #[serde(default)]
    pub summary: Option<String>,
    /// Generated questions / tasks.
    pub questions: Vec<GeneratedQuestion>,
    /// ID of the saved `ai_generated_content` row.
    pub content_id: Uuid,
}

// ─── Quiz Generation ──────────────────────────────────────────────────────────

#[derive(Debug, Deserialize)]
pub struct GenerateQuizRequest {
    /// Lesson to generate quiz from.
    pub lesson_id: Uuid,
    /// Number of questions (1–20, default 5).
    #[serde(default)]
    pub count: Option<u8>,
    /// Difficulty: "easy" | "medium" | "hard".
    #[serde(default)]
    pub difficulty: Option<String>,
    /// Question types: "MCQ" | "TRUE_FALSE" | "MULTIPLE_SELECT" | "SHORT_ANSWER".
    #[serde(default)]
    pub question_types: Option<Vec<String>>,
}

#[derive(Debug, Serialize)]
pub struct GenerateQuizResponse {
    pub questions: Vec<GeneratedQuestion>,
    pub lesson_id: Uuid,
    pub lesson_title: String,
}

// ─── Groq wire types ─────────────────────────────────────────────────────────

/// Message sent to Groq /chat/completions.
#[derive(Debug, Serialize, Clone)]
pub struct GroqMessage {
    pub role: String,
    pub content: String,
}

/// Payload sent to Groq.
#[derive(Debug, Serialize)]
pub struct GroqRequest {
    pub model: String,
    pub messages: Vec<GroqMessage>,
    pub temperature: f32,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub response_format: Option<GroqResponseFormat>,
}

#[derive(Debug, Serialize)]
pub struct GroqResponseFormat {
    #[serde(rename = "type")]
    pub format_type: String,
}

/// Top-level Groq response.
#[derive(Debug, Deserialize)]
pub struct GroqResponse {
    pub choices: Vec<GroqChoice>,
}

#[derive(Debug, Deserialize)]
pub struct GroqChoice {
    pub message: GroqChoiceMessage,
}

#[derive(Debug, Deserialize)]
pub struct GroqChoiceMessage {
    pub content: Option<String>,
}
