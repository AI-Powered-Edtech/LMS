import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function run() {
    const { data: attempts, error: attemptsError } = await supabase
        .from('quiz_attempts')
        .select(`
                *,
                quizzes (
                    title, passing_score
                )
            `)
        .order('started_at', { ascending: false });

    console.log("Attempts error:", attemptsError);

    const { data: quizzes, error: quizzesError } = await supabase
        .from('quizzes')
        .select(`
            *,
            quiz_questions (
                id, text, "order",
                quiz_options (id, text)
            )
        `)
        .eq('is_published', true);

    console.log("Quizzes error:", quizzesError);
}

run();
