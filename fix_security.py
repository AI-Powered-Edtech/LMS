with open('docs/SECURITY.md', 'r') as f:
    content = f.read()

fixed = content.replace('''<<<<<<< HEAD
## Governance and Policies

For detailed operational security procedures, please refer to the following documents:

- [Secret Rotation SOP](security/SECRET_ROTATION_SOP.md)
- [Audit Logging Retention Policy](security/AUDIT_LOGGING_POLICY.md)

## Feature Module Cross-Reference
=======
- SCORM content runs in a sandboxed `<iframe>`
- The SCORM API bridge attaches to the **parent** `window`, not the iframe's window
- `scorm_runtime_data.lesson_status` has sticky terminal states: once `completed` or `passed`, it cannot revert
>>>>>>> 14aad73895975987b2020e1f711a2e545e172fb1''', '''- SCORM content runs in a sandboxed `<iframe>`
- The SCORM API bridge attaches to the **parent** `window`, not the iframe's window
- `scorm_runtime_data.lesson_status` has sticky terminal states: once `completed` or `passed`, it cannot revert

## Governance and Policies

For detailed operational security procedures, please refer to the following documents:

- [Secret Rotation SOP](security/SECRET_ROTATION_SOP.md)
- [Audit Logging Retention Policy](security/AUDIT_LOGGING_POLICY.md)

## Feature Module Cross-Reference''')

with open('docs/SECURITY.md', 'w') as f:
    f.write(fixed)
