// ==========================================================================
// SCORM Error Handler — scormErrorHandler.ts
//
// SCORM 1.2 and 2004 error code maps and error string/diagnostic helpers.
// Extracted from scormApiBridge.ts for modularity.
// ==========================================================================

// ── SCORM Error Codes ──────────────────────────────────────────

export const SCORM_12_ERRORS: Record<string, string> = {
  "0": "No Error",
  "101": "General Exception",
  "201": "Invalid argument error",
  "202": "Element cannot have children",
  "203": "Element not an array",
  "301": "Not initialized",
  "401": "Not implemented error",
  "402": "Invalid set value, element is a keyword",
  "403": "Element is read only",
  "404": "Element is write only",
};

export const SCORM_2004_ERRORS: Record<string, string> = {
  "0": "No Error",
  "101": "General Exception",
  "102": "General Initialization Failure",
  "103": "Already Initialized",
  "104": "Content Instance Terminated",
  "111": "General Termination Failure",
  "112": "Termination Before Initialization",
  "113": "Termination After Termination",
  "122": "Store Data Before Initialization",
  "123": "Store Data After Termination",
  "132": "Retrieve Data Before Initialization",
  "133": "Retrieve Data After Termination",
  "142": "Commit Before Initialization",
  "143": "Commit After Termination",
  "201": "General Argument Error",
  "301": "General Get Failure",
  "351": "General Set Failure",
  "391": "General Commit Failure",
  "401": "Undefined Data Model Element",
  "402": "Unimplemented Data Model Element",
  "403": "Data Model Element Value Not Initialized",
  "404": "Data Model Element Is Read Only",
  "405": "Data Model Element Is Write Only",
  "406": "Data Model Element Type Mismatch",
  "407": "Data Model Element Value Out Of Range",
  "408": "Data Model Dependency Not Established",
};

// ── Error String Helpers ───────────────────────────────────────

export function getScorm12ErrorString(errorCode: string): string {
  return SCORM_12_ERRORS[errorCode] || "Unknown Error";
}

export function getScorm12Diagnostic(errorCode: string): string {
  return `Error code: ${errorCode}. ${SCORM_12_ERRORS[errorCode] || "No diagnostic info available."}`;
}

export function getScorm2004ErrorString(errorCode: string): string {
  return SCORM_2004_ERRORS[errorCode] || "Unknown Error";
}

export function getScorm2004Diagnostic(errorCode: string): string {
  return `Error code: ${errorCode}. ${SCORM_2004_ERRORS[errorCode] || "No diagnostic info available."}`;
}
