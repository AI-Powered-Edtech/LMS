-- Translate system badges to Bahasa Indonesia
UPDATE badge_definitions SET name = 'Kutu Buku' WHERE name = 'Bookworm' AND tenant_id IS NULL;
UPDATE badge_definitions SET name = 'Penembak Jitu' WHERE name = 'Sharp Shooter' AND tenant_id IS NULL;
UPDATE badge_definitions SET name = 'Membara' WHERE name = 'On Fire' AND tenant_id IS NULL;
UPDATE badge_definitions SET name = 'Tak Terhentikan' WHERE name = 'Unstoppable' AND tenant_id IS NULL;
UPDATE badge_definitions SET name = 'Ahli Kursus' WHERE name = 'Course Master' AND tenant_id IS NULL;
UPDATE badge_definitions SET name = 'Cendekiawan' WHERE name = 'Scholar' AND tenant_id IS NULL;
UPDATE badge_definitions SET name = 'Pembelajar Cepat' WHERE name = 'Speed Learner' AND tenant_id IS NULL;
