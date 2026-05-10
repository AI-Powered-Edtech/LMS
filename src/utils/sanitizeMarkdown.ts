import { defaultSchema } from "rehype-sanitize";

// XSS protection: sanitize user-generated markdown while preserving KaTeX math (SC-1)
export const katexSanitizeSchema = {
  ...defaultSchema,
  tagNames: [
    ...(defaultSchema.tagNames || []),
    "math",
    "semantics",
    "mrow",
    "mi",
    "mo",
    "mn",
    "msup",
    "msub",
    "mfrac",
    "msqrt",
    "mroot",
    "mtext",
    "annotation",
  ],
  attributes: {
    ...defaultSchema.attributes,
    div: [...(defaultSchema.attributes?.div || []), "className", "style"],
    span: [
      ...(defaultSchema.attributes?.span || []),
      "className",
      "style",
      "aria-hidden",
    ],
    math: ["xmlns", "display"],
    annotation: ["encoding"],
  },
};
