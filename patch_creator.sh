git checkout src/pages/Creator.tsx
cat << 'PATCH' > creator.patch
<<<<<<< SEARCH
    try {
      // TODO: Route through backend API in Phase 5
      // POST /api/ai/generate-content with file upload
      await new Promise(resolve => setTimeout(resolve, 1000));
      setError("⚠️ Fitur AI Content Generation sedang dalam proses migrasi ke backend API. Akan tersedia di update berikutnya.");
    } catch (err: any) {
=======
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("assignmentType", assignmentType);
      formData.append("questionCount", questionCount.toString());
      formData.append("difficulty", difficulty);

      const { data, error: supaError } = await supabase.functions.invoke("generate-ai-content", {
        body: formData,
      });

      if (supaError) {
        console.error("Supabase edge function error:", supaError);
        // Specifically catch a common indication of a 404 from invoke
        if (supaError.message && (supaError.message.includes('404') || supaError.message.includes('not found') || supaError.message.includes('FetchError'))) {
           throw new Error("⚠️ Layanan AI (Backend API) belum tersedia saat ini.");
        }
        throw new Error(supaError.message || "Gagal memproses materi dengan AI.");
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      // Check if response contains expected data structure
      if (data && data.questions && Array.isArray(data.questions)) {
        setResult(data);
      } else {
         throw new Error("Respons API tidak valid.");
      }
    } catch (err: any) {
>>>>>>> REPLACE
<<<<<<< SEARCH
import { useNavigate } from "react-router-dom";
=======
import { useNavigate } from "react-router-dom";
import { supabase } from "@/src/lib/supabase";
>>>>>>> REPLACE
PATCH
python3 -c "
import sys

def apply_patch(file_path, patch_path):
    with open(file_path, 'r') as f:
        content = f.read()

    with open(patch_path, 'r') as f:
        patch = f.read()

    blocks = patch.split('<<<<<<< SEARCH\n')[1:]
    for block in blocks:
        search, replace = block.split('=======\n')
        replace = replace.split('>>>>>>> REPLACE')[0]
        if search in content:
            content = content.replace(search, replace)
        else:
            print(f'Failed to find block:\n{search}')
            sys.exit(1)

    with open(file_path, 'w') as f:
        f.write(content)

apply_patch('src/pages/Creator.tsx', 'creator.patch')
"
