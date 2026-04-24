const fs = require('fs');
const file = 'edusync-api/crates/auth/src/jwt.rs';
let content = fs.readFileSync(file, 'utf8');

const priv = fs.readFileSync('edusync-api/jwt-private.pem', 'utf8');
const pub = fs.readFileSync('edusync-api/jwt-public.pem', 'utf8');

content = content.replace(/const TEST_PRIVATE_KEY: &str = r#"[\s\S]*?"#;/, `const TEST_PRIVATE_KEY: &str = r#"${priv}"#;`);
content = content.replace(/const TEST_PUBLIC_KEY: &str = r#"[\s\S]*?"#;/, `const TEST_PUBLIC_KEY: &str = r#"${pub}"#;`);

fs.writeFileSync(file, content);
