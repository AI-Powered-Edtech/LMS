#![allow(dead_code)]
/// SCORM Extract Service — Phase 3D
///
/// Ports `supabase/functions/scorm-extract/index.ts`.
///
/// Parses a SCORM ZIP package:
///   1. Locate and parse `imsmanifest.xml`.
///   2. Determine SCORM version (1.2 or 2004).
///   3. Extract entry point (first SCO href).
///   4. Return a `ScormManifest` with title, version, and item list.
///
/// Storage upload is deferred to Phase 5 — this module handles only
/// parsing/validation. The handler inserts a `lesson_resources` record
/// with `type = 'scorm'` per the CHECK constraint added by migration
/// `20260324200000`.
///
/// Notes:
///   - SCORM content runs in a sandboxed `<iframe>` (by design; enforced by frontend).
///   - `lesson_resources.type` CHECK constraint includes 'scorm'.
///   - Table: `lesson_resources` (id, lesson_id, type, url, title, scorm_manifest_json, tenant_id)
// DEPENDENCY: zip = "2"
// DEPENDENCY: quick-xml = "0.37"
// DEPENDENCY: serde = "1"
// DEPENDENCY: serde_json = "1"
// DEPENDENCY: sqlx = "0.8"
// DEPENDENCY: uuid = "1"
// DEPENDENCY: tracing = "0.1"

use serde::{Deserialize, Serialize};
use std::io::Read;
use uuid::Uuid;

// ─── Error type ───────────────────────────────────────────────────────────────

/// Errors from SCORM extraction.
#[derive(Debug)]
pub enum ScormError {
    /// ZIP bytes are malformed or corrupt.
    InvalidZip(String),
    /// `imsmanifest.xml` was not found inside the ZIP.
    NoManifest(String),
    /// Manifest was found but contains no entry point (no SCO href).
    NoEntryPoint,
    /// Database failure during resource record upsert.
    Database(String),
    /// Internal serialisation or logic error.
    Internal(String),
}

impl std::fmt::Display for ScormError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            ScormError::InvalidZip(msg) => write!(f, "File ZIP tidak valid: {msg}"),
            ScormError::NoManifest(msg) => write!(f, "Manifest SCORM tidak ditemukan: {msg}"),
            ScormError::NoEntryPoint => {
                write!(f, "Titik masuk (entry point) tidak ditemukan dalam manifest SCORM")
            }
            ScormError::Database(msg) => write!(f, "Kesalahan basis data: {msg}"),
            ScormError::Internal(msg) => write!(f, "Kesalahan internal: {msg}"),
        }
    }
}

impl std::error::Error for ScormError {}

// ─── Manifest types ───────────────────────────────────────────────────────────

/// A single item (SCO / asset) from the SCORM manifest.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScormItem {
    /// `identifierref` from `<item>` element.
    pub identifier: String,
    /// Title from nested `<title>` element.
    pub title: String,
    /// `href` of the referenced `<resource>`.
    pub href: String,
}

/// Parsed SCORM manifest.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScormManifest {
    /// Human-readable course title.
    pub title: String,
    /// "1.2" or "2004".
    pub version: String,
    /// Launch URL for the first SCO (relative path within the ZIP).
    pub entry_point: String,
    /// All SCO/asset items found in the manifest.
    pub items: Vec<ScormItem>,
    /// Raw schema version string from `<schemaversion>` if present.
    pub schema_version: Option<String>,
}

// ─── ZIP helpers ──────────────────────────────────────────────────────────────

/// Read the text contents of a named file from a ZIP archive (case-insensitive).
fn read_zip_file(zip_bytes: &[u8], filename: &str) -> Option<String> {
    let cursor = std::io::Cursor::new(zip_bytes);
    let mut archive = zip::ZipArchive::new(cursor).ok()?;

    let index = (0..archive.len()).find(|&i| {
        archive
            .by_index(i)
            .map(|f| f.name().to_lowercase() == filename.to_lowercase())
            .unwrap_or(false)
    })?;

    let mut file = archive.by_index(index).ok()?;
    let mut contents = String::new();
    file.read_to_string(&mut contents).ok()?;
    Some(contents)
}

/// Return the list of all file paths (non-directory) inside a ZIP archive.
pub fn list_zip_files(zip_bytes: &[u8]) -> Result<Vec<String>, ScormError> {
    let cursor = std::io::Cursor::new(zip_bytes);
    let mut archive =
        zip::ZipArchive::new(cursor).map_err(|e| ScormError::InvalidZip(e.to_string()))?;

    let mut files = Vec::with_capacity(archive.len());
    for i in 0..archive.len() {
        let file = archive
            .by_index(i)
            .map_err(|e| ScormError::InvalidZip(e.to_string()))?;
        if !file.is_dir() {
            files.push(file.name().to_string());
        }
    }
    Ok(files)
}

// ─── Manifest version detection ──────────────────────────────────────────────

/// Determine SCORM version ("1.2" or "2004") from manifest XML content.
fn detect_scorm_version(xml: &str) -> String {
    // SCORM 2004 indicator namespaces
    if xml.contains("adlcp:scormType")
        || xml.contains("adlseq:")
        || xml.contains("imsss:")
        || xml.contains("adlcp_v3")
    {
        return "2004".to_string();
    }

    // Also check <schemaversion> value
    if let Some(sv) = extract_schema_version(xml) {
        let sv_lower = sv.to_lowercase();
        if sv_lower.starts_with("2004") || sv_lower == "cam 1.3" {
            return "2004".to_string();
        }
        if let Ok(v) = sv.parse::<f32>() {
            if v >= 2.0 {
                return "2004".to_string();
            }
        }
    }

    "1.2".to_string()
}

/// Extract the raw value inside `<schemaversion>...</schemaversion>`.
fn extract_schema_version(xml: &str) -> Option<String> {
    let lxml = xml.to_lowercase();
    let start_tag = "<schemaversion>";
    let end_tag = "</schemaversion>";
    let start = lxml.find(start_tag)?;
    let rest = &xml[start + start_tag.len()..];
    let end = rest.to_lowercase().find(end_tag)?;
    Some(rest[..end].trim().to_string())
}

// ─── Entry point extraction ───────────────────────────────────────────────────

/// Extract the launch entry point from the manifest XML.
///
/// Priority:
///   1. `<resource>` with `adlcp:scormType="sco"` + `href`
///   2. `<resource>` with `type="webcontent"` + `href`
///   3. Any `<resource>` with `href`
///   4. Default fallback: "index.html"
fn extract_entry_point(xml: &str) -> String {
    if let Some(href) = find_href_near(xml, "adlcp:scormType=\"sco\"") {
        return href;
    }
    if let Some(href) = find_href_near(xml, "type=\"webcontent\"") {
        return href;
    }
    if let Some(href) = find_first_resource_href(xml) {
        return href;
    }
    "index.html".to_string()
}

/// Find the first `href="..."` within 512 bytes of a pattern match.
fn find_href_near(xml: &str, pattern: &str) -> Option<String> {
    let lxml = xml.to_lowercase();
    let lpat = pattern.to_lowercase();
    let pos = lxml.find(&lpat)?;
    let window = &xml[pos..std::cmp::min(pos + 512, xml.len())];
    parse_href_attr(window)
}

/// Find the href in the very first `<resource ...>` element.
fn find_first_resource_href(xml: &str) -> Option<String> {
    let lxml = xml.to_lowercase();
    let pos = lxml.find("<resource")?;
    let tag_end = lxml[pos..].find('>')?;
    let tag = &xml[pos..pos + tag_end + 1];
    parse_href_attr(tag)
}

/// Extract the value of a `href="..."` attribute from a string slice.
fn parse_href_attr(s: &str) -> Option<String> {
    let ls = s.to_lowercase();
    let href_pos = ls.find("href=\"")?;
    let after = &s[href_pos + 6..]; // skip `href="`
    let end = after.find('"')?;
    let href = after[..end].trim().to_string();
    if href.is_empty() { None } else { Some(href) }
}

// ─── Title extraction ─────────────────────────────────────────────────────────

/// Extract course title from the first `<title>` inside an `<organization>`.
fn extract_title(xml: &str) -> Option<String> {
    let lxml = xml.to_lowercase();
    let org_pos = lxml.find("<organization")?;
    let after_org = &xml[org_pos..];
    let lafter = after_org.to_lowercase();
    let title_start = lafter.find("<title>")? + 7; // len("<title>")
    let title_end = lafter[title_start..].find("</title>")?;
    let title = after_org[title_start..title_start + title_end].trim().to_string();
    if title.is_empty() { None } else { Some(title) }
}

// ─── Manifest parsing ─────────────────────────────────────────────────────────

/// Parse `imsmanifest.xml` using `quick-xml` event reader.
///
/// Extracts:
///   - SCORM version (1.2 or 2004)
///   - Entry point (launch URL)
///   - Course title
///   - All SCO items (identifier, title, href)
fn parse_manifest_xml(xml: &str) -> Result<ScormManifest, ScormError> {
    // DEPENDENCY: quick-xml = "0.37"
    use quick_xml::events::Event;
    use quick_xml::Reader;

    let version = detect_scorm_version(xml);
    let schema_version = extract_schema_version(xml);
    let entry_point = extract_entry_point(xml);

    let mut reader = Reader::from_str(xml);
    reader.config_mut().trim_text(true);

    let mut items: Vec<ScormItem> = vec![];
    // Map: resource identifier → href
    let mut resource_href_map: std::collections::HashMap<String, String> =
        std::collections::HashMap::new();
    let mut current_item_identifierref: Option<String> = None;
    let mut current_item_title: Option<String> = None;
    let mut inside_item_title = false;

    loop {
        match reader.read_event() {
            Err(e) => {
                tracing::warn!("scorm_manifest_xml_parse_warning: {e}");
                break;
            }
            Ok(Event::Eof) => break,

            Ok(Event::Start(ref e)) | Ok(Event::Empty(ref e)) => {
                let tag_name = std::str::from_utf8(e.name().as_ref())
                    .unwrap_or("")
                    .to_lowercase();

                match tag_name.as_str() {
                    "resource" => {
                        let mut res_id = String::new();
                        let mut res_href = String::new();
                        for attr in e.attributes().flatten() {
                            let key = std::str::from_utf8(attr.key.as_ref())
                                .unwrap_or("")
                                .to_lowercase();
                            let val = attr.unescape_value().unwrap_or_default().to_string();
                            match key.as_str() {
                                "identifier" => res_id = val,
                                "href" => res_href = val,
                                _ => {}
                            }
                        }
                        if !res_id.is_empty() && !res_href.is_empty() {
                            resource_href_map.insert(res_id, res_href);
                        }
                    }
                    "item" => {
                        for attr in e.attributes().flatten() {
                            let key = std::str::from_utf8(attr.key.as_ref())
                                .unwrap_or("")
                                .to_lowercase();
                            if key == "identifierref" {
                                let val = attr.unescape_value().unwrap_or_default().to_string();
                                if !val.is_empty() {
                                    current_item_identifierref = Some(val);
                                }
                            }
                        }
                    }
                    "title" if current_item_identifierref.is_some() => {
                        inside_item_title = true;
                    }
                    _ => {}
                }
            }

            Ok(Event::Text(ref e)) if inside_item_title => {
                current_item_title =
                    Some(e.unescape().unwrap_or_default().trim().to_string());
                inside_item_title = false;
            }

            Ok(Event::End(ref e)) => {
                let tag_name = std::str::from_utf8(e.name().as_ref())
                    .unwrap_or("")
                    .to_lowercase();
                if tag_name == "item" {
                    if let Some(iref) = current_item_identifierref.take() {
                        let href = resource_href_map.get(&iref).cloned().unwrap_or_default();
                        let title = current_item_title.take().unwrap_or_else(|| iref.clone());
                        if !href.is_empty() {
                            items.push(ScormItem {
                                identifier: iref,
                                title,
                                href,
                            });
                        }
                    }
                    current_item_title = None;
                    inside_item_title = false;
                }
            }

            _ => {}
        }
    }

    let title = extract_title(xml).unwrap_or_else(|| "Modul SCORM".to_string());

    Ok(ScormManifest {
        title,
        version,
        entry_point,
        items,
        schema_version,
    })
}

// ─── Public API ───────────────────────────────────────────────────────────────

/// Parse a SCORM ZIP package and return its manifest.
///
/// Validates:
///   - ZIP is well-formed
///   - `imsmanifest.xml` exists
///   - Manifest contains a non-empty entry point
///
/// Storage upload is deferred to Phase 5 — this function returns metadata only.
pub fn extract_scorm(zip_bytes: &[u8]) -> Result<ScormManifest, ScormError> {
    let manifest_xml = read_zip_file(zip_bytes, "imsmanifest.xml").ok_or_else(|| {
        ScormError::NoManifest(
            "File imsmanifest.xml tidak ditemukan. \
             Pastikan file yang diunggah adalah paket SCORM yang valid."
                .to_string(),
        )
    })?;

    let manifest = parse_manifest_xml(&manifest_xml)?;

    if manifest.entry_point.is_empty() {
        return Err(ScormError::NoEntryPoint);
    }

    tracing::debug!(
        version     = %manifest.version,
        entry_point = %manifest.entry_point,
        item_count  = manifest.items.len(),
        "scorm_extract: manifest berhasil diparse"
    );

    Ok(manifest)
}

// ─── Database helper ──────────────────────────────────────────────────────────

/// Insert or update a `lesson_resources` record for a SCORM package.
///
/// Sets `type = 'scorm'` (matches the CHECK constraint in migration 20260324200000).
/// `storage_path` is nullable — pass `None` before Phase 5 upload is implemented.
pub async fn upsert_scorm_lesson_resource(
    db: &sqlx::PgPool,
    lesson_id: Uuid,
    tenant_id: Uuid,
    title: &str,
    manifest: &ScormManifest,
    storage_path: Option<&str>,
) -> Result<Uuid, ScormError> {
    let manifest_json = serde_json::to_value(manifest)
        .map_err(|e| ScormError::Internal(e.to_string()))?;

    let resource_id = Uuid::new_v4();

    // ON CONFLICT on (lesson_id, type) to update if a SCORM resource already exists
    sqlx::query_scalar::<_, Uuid>(
        r#"
        INSERT INTO public.lesson_resources (
            id,
            lesson_id,
            tenant_id,
            type,
            title,
            url,
            scorm_manifest_json,
            created_at
        ) VALUES (
            $1, $2, $3, 'SCORM', $4, $5, $6, NOW()
        )
        ON CONFLICT (lesson_id, type) DO UPDATE
        SET
            title               = EXCLUDED.title,
            url                 = EXCLUDED.url,
            scorm_manifest_json = EXCLUDED.scorm_manifest_json,
            updated_at          = NOW()
        RETURNING id
        "#,
    )
    .bind(resource_id)
    .bind(lesson_id)
    .bind(tenant_id)
    .bind(title)
    .bind(storage_path)
    .bind(manifest_json)
    .fetch_one(db)
    .await
    .map_err(|e: sqlx::Error| ScormError::Database(e.to_string()))
}
