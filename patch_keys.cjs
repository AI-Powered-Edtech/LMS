const fs = require('fs');
const file = 'edusync-api/crates/api-server/src/auth/token.rs';
let content = fs.readFileSync(file, 'utf8');

const priv = fs.readFileSync('edusync-api/jwt-private.pem', 'utf8');
const pub = fs.readFileSync('edusync-api/jwt-public.pem', 'utf8');

content = content.replace(/const TEST_PRIVATE_KEY: &\[u8\] = r#"[\s\S]*?"#\s*\.as_bytes\(\);/, `const TEST_PRIVATE_KEY: &[u8] = r#"${priv}"#.as_bytes();`);
content = content.replace(/const TEST_PUBLIC_KEY: &\[u8\] = r#"[\s\S]*?"#\s*\.as_bytes\(\);/, `const TEST_PUBLIC_KEY: &[u8] = r#"${pub}"#.as_bytes();`);

fs.writeFileSync(file, content);
