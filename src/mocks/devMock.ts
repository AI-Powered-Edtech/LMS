export function setupDevMocks() {
  if (!import.meta.env.DEV || navigator.webdriver) return

  const originalFetch = window.fetch

  window.fetch = async (input, init) => {
    let url = ''
    if (typeof input === 'string') {
      url = input
    } else if (input instanceof URL) {
      url = input.toString()
    } else if (input instanceof Request) {
      url = input.url
    }

    if (url.includes('/api/v1/auth/login')) {
      const body = init?.body ? JSON.parse(init.body as string) : {}
      const role = body.email.split('@')[0]
      localStorage.setItem('mock_role', role)
      return new Response(
        JSON.stringify({
          access_token: 'mock-token-123',
          refresh_token: 'mock-refresh-123',
          expires_in: 3600,
          user: {
            id: `mock-${role}-id`,
            email: body.email,
            role: role === 'student' ? 'student' : role === 'teacher' ? 'teacher' : 'admin',
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    }

    if (url.includes('/api/v1/auth/bootstrap')) {
      const isStudent = localStorage.getItem('mock_role') === 'student';
      return new Response(
        JSON.stringify({
          profile: {
            id: isStudent ? 'mock-student-id' : 'mock-id',
            first_name: isStudent ? 'Demo' : 'Dev',
            last_name: isStudent ? 'Student' : 'User',
            avatar_url: null,
            email: isStudent ? 'student@edusync.dev' : 'dev@edusync.dev',
          },
          memberships: [
            {
              tenant_id: 'mock-tenant-id',
              tenant_name: 'Mock School',
              tenant_slug: 'mock-school',
              role: isStudent ? 'student' : 'teacher',
              status: 'active',
              is_active: true,
              joined_at: new Date().toISOString(),
            },
          ],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    }

    if (url.includes('/api/v1/auth/switch-tenant')) {
      return new Response(
        JSON.stringify({
          access_token: 'mock-token-123',
          refresh_token: 'mock-refresh-123',
          expires_in: 3600,
          user: {
            id: `mock-id`,
            email: 'teacher@edusync.dev',
            role: 'teacher',
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    }

    if (url.includes('/courses')) console.log('MOCK FETCH COURSES URL:', url);
    
    // Mock VIL data queries
    if (url.includes('/api/v1/data/courses')) {
      const courseData = {
        id: 'mock-course',
        title: 'Mock Course',
        description: 'This is a mock course',
        status: 'published',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        tenant_id: 'mock-tenant-id'
      };
      return new Response(JSON.stringify({ data: [courseData] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (url.match(/\/api\/v1\/courses\/[a-zA-Z0-9-]+\/modules/)) {
      const moduleData = {
        id: 'mock-module-1',
        course_id: 'mock-course',
        title: 'Pengantar Biologi',
        description: 'Bab pertama',
        order: 1,
        status: 'published',
        tenant_id: 'mock-tenant-id',
        lessons: [
          {
            id: 'mock-lesson-1',
            title: 'Apa itu Sel?',
            duration_minutes: 5,
            order: 1
          }
        ]
      };
      return new Response(JSON.stringify([moduleData]), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (url.includes('/api/v1/data/course_modules')) {
      const moduleData = {
        id: 'mock-module-1',
        course_id: 'mock-course',
        title: 'Pengantar Biologi',
        description: 'Bab pertama',
        order_index: 1,
        status: 'published',
        tenant_id: 'mock-tenant-id'
      };
      return new Response(JSON.stringify({ data: [moduleData] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (url.includes('/api/v1/data/assignments')) {
      const assignmentData = {
        id: 'mock-assignment-1',
        title: 'Tugas Biologi: Sel',
        description: 'Jelaskan struktur sel',
        max_points: 100,
        status: 'published',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        tenant_id: 'mock-tenant-id',
        due_date: new Date(Date.now() + 86400000).toISOString()
      };
      return new Response(JSON.stringify({ data: [assignmentData], count: 1 }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (url.includes('/api/v1/data/assignment_submissions')) {
      return new Response(JSON.stringify({ data: [] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (url.match(/\/api\/v1\/modules\/[a-zA-Z0-9-]+\/lessons/)) {
      const lessonData = {
        id: 'mock-lesson-1',
        module_id: 'mock-module-1',
        title: 'Apa itu Sel?',
        content: '<p>Sel adalah unit terkecil dari kehidupan.</p>',
        type: 'content',
        order_index: 1,
        status: 'published',
        tenant_id: 'mock-tenant-id'
      };
      return new Response(JSON.stringify([lessonData]), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (url.includes('/api/v1/data/lessons')) {
      const lessonData = {
        id: 'mock-lesson-1',
        module_id: 'mock-module-1',
        title: 'Apa itu Sel?',
        content: '<p>Sel adalah unit terkecil dari kehidupan.</p>',
        type: 'content',
        order: 1,
        is_published: true,
        duration_minutes: 5,
        tenant_id: 'mock-tenant-id'
      };
      return new Response(JSON.stringify({ data: [lessonData] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Mock API requests for the dashboard
    if (url.includes('/api/v1/courses') || url.includes('/rest/v1/courses')) {
      if (init?.method === 'POST') {
        const body = init?.body ? JSON.parse(init.body as string) : {}
        return new Response(
          JSON.stringify({
            id: 'mock-course-' + Date.now(),
            ...body,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }),
          { status: 201, headers: { 'Content-Type': 'application/json' } }
        )
      }
      
      const courseData = {
        id: 'mock-course',
        title: 'Mock Course',
        description: 'This is a mock course',
        status: 'published',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        tenant_id: 'mock-tenant-id'
      };

      if (url.match(/\/(api|rest)\/v1\/courses\/[a-zA-Z0-9-]+$/) || url.includes('id=eq.')) {
        console.log('MOCK INTERCEPTED COURSE GET:', url);
        // Handle Supabase .single() which expects a single object when fetching by ID
        let isSingle = false;
        if (init?.headers) {
          if (init.headers instanceof Headers) {
            isSingle = init.headers.get('Accept')?.includes('application/vnd.pgrst.object+json') || false;
          } else {
            isSingle = JSON.stringify(init.headers).includes('application/vnd.pgrst.object+json');
          }
        }
        
        return new Response(
          JSON.stringify((url.includes('id=eq.') && !isSingle) ? [courseData] : courseData),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      }
      return new Response(JSON.stringify({ courses: [courseData], count: 1 }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }
    
    if (url.includes('/rest/v1/course_modules')) {
      return new Response(JSON.stringify([]), { status: 200, headers: { 'Content-Type': 'application/json' } })
    }

    if (url.includes('/api/v1/data/quiz_attempts_v2')) {
      const body = init?.body ? JSON.parse(init.body as string) : {};
      const attemptData = {
        id: 'mock-attempt-1',
        quiz_id: 'mock-quiz-1',
        student_id: 'mock-student-id',
        tenant_id: 'mock-tenant-id',
        status: 'IN_PROGRESS',
        question_manifest: ['mock-question-1']
      };
      const responseData = body.single ? attemptData : [attemptData];
      return new Response(JSON.stringify({ data: responseData }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (url.includes('/api/v1/data/quiz_attempt_questions_v2')) {
      return new Response(JSON.stringify({ data: [] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (url.includes('/api/v1/data/quiz_questions')) {
      const body = init?.body ? JSON.parse(init.body as string) : {};
      const questionData = {
        id: 'mock-question-1',
        quiz_id: 'mock-quiz-1',
        text: 'Apa fungsi utama mitokondria pada sel hewan?',
        question_type: 'MCQ',
        points: 10,
        tenant_id: 'mock-tenant-id'
      };
      const responseData = body.single ? questionData : [questionData];
      return new Response(JSON.stringify({ data: responseData }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (url.includes('/api/v1/data/quiz_options')) {
      const optionsData = [
        { id: 'opt-1', question_id: 'mock-question-1', text: 'Respirasi seluler', tenant_id: 'mock-tenant-id' },
        { id: 'opt-2', question_id: 'mock-question-1', text: 'Sintesis protein', tenant_id: 'mock-tenant-id' },
        { id: 'opt-3', question_id: 'mock-question-1', text: 'Fotosintesis', tenant_id: 'mock-tenant-id' },
        { id: 'opt-4', question_id: 'mock-question-1', text: 'Pencernaan intraseluler', tenant_id: 'mock-tenant-id' }
      ];
      return new Response(JSON.stringify({ data: optionsData }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (url.includes('/api/v1/data/classes')) {
      const body = init?.body ? JSON.parse(init.body as string) : {};
      if (body.action === 'insert') {
        return new Response(JSON.stringify({ data: [{
          id: 'mock-class-' + Date.now(),
          ...body.values,
          created_at: new Date().toISOString()
        }] }), { status: 201, headers: { 'Content-Type': 'application/json' } });
      }
      return new Response(JSON.stringify({ data: [{
        id: 'mock-class-1',
        name: 'Kelas Biologi 10A',
        teacher_id: 'mock-teacher-id',
        join_code: 'BIO10A',
        created_at: new Date().toISOString(),
        tenant_id: 'mock-tenant-id'
      }] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (url.includes('/api/v1/data/quiz_assignments')) {
      const assignmentData = {
        id: 'mock-quiz-assignment-1',
        quiz_id: 'mock-quiz-1',
        class_id: 'mock-class-1',
        status: 'active',
        available_from: new Date().toISOString(),
        due_at: new Date(Date.now() + 86400000).toISOString(),
        max_attempts: 1,
        tenant_id: 'mock-tenant-id'
      };
      return new Response(JSON.stringify({ data: [assignmentData] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (url.includes('/api/v1/data/quizzes')) {
      const body = init?.body ? JSON.parse(init.body as string) : {};
      if (body.action === 'insert') {
        return new Response(JSON.stringify({ data: [{
          id: 'mock-quiz-' + Date.now(),
          ...body.values,
          created_at: new Date().toISOString()
        }] }), { status: 201, headers: { 'Content-Type': 'application/json' } });
      }
      const quizData = {
        id: 'mock-quiz-1',
        title: 'Kuis Struktur Sel',
        status: 'published',
        mode: 'graded',
        time_limit_minutes: 30,
        max_attempts: 1,
        passing_score: 75,
        question_count: 10,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        tenant_id: 'mock-tenant-id'
      };
      const responseData = body.single ? quizData : [quizData];
      return new Response(JSON.stringify({ data: responseData }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (url.includes('/api/v1/data/course_enrollments') || url.includes('/api/v1/data/enrollments')) {
      const courseData = {
        id: 'mock-course',
        title: 'Mock Course',
        description: 'This is a mock course',
        status: 'published',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        tenant_id: 'mock-tenant-id'
      };
      const enrollmentData = {
        id: 'mock-enrollment',
        student_id: 'mock-student-id',
        user_id: 'mock-student-id',
        class_id: 'mock-class-1',
        course_id: 'mock-course',
        status: 'ACTIVE',
        enrolled_at: new Date().toISOString(),
        joined_at: new Date().toISOString(),
        course: courseData,
        courses: courseData
      };
      return new Response(JSON.stringify({ data: [enrollmentData] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (url.includes('/api/v1/data/announcements')) {
      const body = init?.body ? JSON.parse(init.body as string) : {};
      if (body.action === 'insert' || body.action === 'upsert') {
        return new Response(JSON.stringify({ data: {
          id: 'mock-announcement-' + Date.now(),
          ...body.values,
          created_at: new Date().toISOString()
        } }), { status: 201, headers: { 'Content-Type': 'application/json' } });
      }
      return new Response(JSON.stringify({ data: [{
        id: 'mock-announcement-1',
        title: 'Ujian Tengah Semester Besok',
        content: 'Tolong siapkan pensil 2B dan penghapus untuk ujian besok pagi di ruang aula.',
        target_audience: 'all_students',
        priority: 'high',
        status: 'published',
        is_pinned: false,
        created_at: new Date().toISOString(),
        tenant_id: 'mock-tenant-id',
        created_by: 'mock-teacher-id',
        author: { full_name: 'Demo Teacher', avatar_url: null }
      }] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (url.includes('/api/v1/rpc/v1_start_quiz_attempt')) {
      const attemptData = {
        attempt_id: 'mock-attempt-1',
        version: 1,
        expires_at: new Date(Date.now() + 3600000).toISOString()
      };
      return new Response(JSON.stringify({ data: attemptData }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (url.includes('/api/v1/rpc/v1_submit_quiz_attempt')) {
      const resultData = {
        score: 100,
        passed: true,
        correct_count: 10,
        total_questions: 10,
        points_earned: 100,
        total_points: 100
      };
      return new Response(JSON.stringify({ data: resultData }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (url.includes('/api/v1/data') || url.includes('/api/v1/')) {
      // Just return empty array for data to prevent crashes
      return new Response(JSON.stringify([]), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    return originalFetch(input, init)
  }
}
