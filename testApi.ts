import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
    process.env.VITE_SUPABASE_URL as string, 
    process.env.VITE_SUPABASE_ANON_KEY as string
);

async function run() {
    console.log("Testing quiz_attempts_v2 query:");
    const { data: attempts, error: attemptsError } = await supabase
        .from('quiz_attempts_v2')
        .select(`
                *,
                quizzes (
                    title, passing_score
                )
            `)
        .order('started_at', { ascending: false });

    if (attemptsError) {
        console.error("Attempts error message:", attemptsError.message);
        console.error("Attempts error details:", attemptsError.details);
        console.error("Attempts error hint:", attemptsError.hint);
    } else {
        console.log("Attempts success, count:", attempts?.length);
    }
}

run();
