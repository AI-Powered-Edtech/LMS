import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, BookOpen, Clock, Loader2, RefreshCw, Users } from 'lucide-react';
import { useAuth } from '@/src/contexts/AuthContext';
import { useTenant } from '@/src/contexts/TenantContext';
import { courseService, Course } from '@/src/services/courseService';
import { motion } from 'framer-motion';
import { AssignCourseModal } from '@/src/components/Classroom/AssignCourseModal';

export const Courses: React.FC = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { tenant } = useTenant();

    const [courses, setCourses] = useState<Course[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Create Course Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newTitle, setNewTitle] = useState('');
    const [newDescription, setNewDescription] = useState('');
    const [isCreating, setIsCreating] = useState(false);

    // Assign Class Modal State
    const [assignModal, setAssignModal] = useState<{ isOpen: boolean; courseId: string; courseTitle: string }>({
        isOpen: false,
        courseId: '',
        courseTitle: ''
    });

    useEffect(() => {
        loadCourses();
    }, [tenant?.id, user?.id]);

    const loadCourses = async () => {
        if (!tenant?.id) return;

        try {
            setLoading(true);
            setError(null);
            const { courses: fetchedCourses } = await courseService.fetchCourses({
                tenantId: tenant.id,
                limit: 50, // Load initial 50 for now
            });
            setCourses(fetchedCourses);
        } catch (err: any) {
            console.error('Failed to load courses:', err);
            setError(err.message || 'Gagal memuat daftar materi.');
        } finally {
            setLoading(false);
        }
    };

    const handleCreateCourse = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!tenant?.id || !user?.id || !newTitle.trim()) return;

        try {
            setIsCreating(true);
            const newCourse = await courseService.createCourse({
                title: newTitle.trim(),
                description: newDescription.trim() || null,
                tenant_id: tenant.id,
                created_by: user.id
            });

            setIsModalOpen(false);
            // Directly navigate to the builder with the newly created course ID
            navigate(`/teaching/course-builder?courseId=${newCourse.id}`);
        } catch (err: any) {
            console.error('Failed to create course:', err);
            alert(err.message || 'Gagal membuat materi baru.');
        } finally {
            setIsCreating(false);
        }
    };

    const openModal = () => {
        setNewTitle('');
        setNewDescription('');
        setIsModalOpen(true);
    };

    return (
        <div className="p-4 md:p-10 max-w-7xl mx-auto min-h-screen">
            <div className="bg-white/50 dark:bg-gray-800/40 backdrop-blur-md rounded-2xl p-6 md:p-8 border border-gray-200 dark:border-gray-700/50 mb-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h1 className="text-3xl md:text-4xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600 mb-3">
                        Kelola Materi
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400 text-lg max-w-2xl">
                        Pusat kendali untuk menyusun kurikulum, modul pembelajaran, dan kuis interaktif Anda.
                    </p>
                </div>
                <button
                    onClick={openModal}
                    className="group relative flex items-center space-x-2 px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg hover:shadow-indigo-500/30 active:scale-95 overflow-hidden"
                >
                    <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                    <Plus className="w-6 h-6" />
                    <span>Buat Materi Baru</span>
                </button>
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-32 bg-white/30 dark:bg-gray-800/20 backdrop-blur-sm rounded-3xl border border-dashed border-gray-300 dark:border-gray-700">
                    <Loader2 className="w-12 h-12 animate-spin text-indigo-500 mb-4" />
                    <p className="text-gray-500 font-medium">Menyesuaikan kurikulum Anda...</p>
                </div>
            ) : error ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                    <div className="p-8 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 text-red-600 dark:text-red-400 rounded-3xl max-w-md w-full shadow-xl">
                        <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                            <RefreshCw className="w-8 h-8" />
                        </div>
                        <p className="text-xl font-bold mb-3">Opps! Ada kendala</p>
                        <p className="text-sm opacity-80 mb-6">{error}</p>
                        <button
                            onClick={loadCourses}
                            className="flex items-center justify-center w-full space-x-2 px-6 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-all shadow-lg hover:shadow-red-500/20"
                        >
                            <span>Coba Muat Ulang</span>
                        </button>
                    </div>
                </div>
            ) : courses.length === 0 ? (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col items-center justify-center py-32 bg-white/50 dark:bg-gray-800/30 backdrop-blur-md rounded-3xl border border-gray-200 dark:border-gray-700 shadow-xl"
                >
                    <div className="w-24 h-24 bg-gradient-to-tr from-indigo-100 to-purple-100 dark:from-indigo-900/40 dark:to-purple-900/40 rounded-3xl flex items-center justify-center mb-8 rotate-6">
                        <BookOpen className="w-12 h-12 text-indigo-500" />
                    </div>
                    <h2 className="text-3xl font-extrabold mb-3">Mulai Petualangan Anda</h2>
                    <p className="text-gray-500 dark:text-gray-400 text-center max-w-sm mb-10 text-lg">
                        Anda belum memiliki materi. Mari buat materi pertama yang akan menginspirasi siswa Anda!
                    </p>
                    <button
                        onClick={openModal}
                        className="px-8 py-4 bg-indigo-600 text-white font-bold rounded-2xl hover:bg-indigo-700 shadow-xl shadow-indigo-500/20 transition-all hover:-translate-y-1 active:scale-95"
                    >
                        Buat Materi Pertama
                    </button>
                </motion.div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {courses.map((course, idx) => (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.1 }}
                            key={course.id}
                            className="group cursor-pointer bg-white dark:bg-gray-800 rounded-3xl border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-2xl hover:shadow-indigo-500/10 transition-all duration-300 border-b-4 border-b-transparent hover:border-b-indigo-500"
                            onClick={() => navigate(`/teaching/course-builder?courseId=${course.id}`)}
                        >
                            <div className="h-44 bg-gradient-to-br from-indigo-500 via-indigo-600 to-purple-600 relative p-8 flex flex-col justify-end overflow-hidden">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-3xl" />
                                <div className="absolute bottom-0 left-0 w-24 h-24 bg-purple-400/20 rounded-full -ml-12 -mb-12 blur-2xl" />
                                <h3 className="text-white font-black text-2xl relative z-10 leading-tight line-clamp-2">
                                    {course.title}
                                </h3>
                            </div>
                            <div className="p-6">
                                <p className="text-gray-500 dark:text-gray-400 line-clamp-2 mb-6 h-12 leading-relaxed">
                                    {course.description || "Susun kurikulum terbaik untuk siswa Anda dengan modul yang terorganisir."}
                                </p>

                                {course.assigned_classes && course.assigned_classes.length > 0 && (
                                    <div className="mb-6 flex flex-wrap gap-2">
                                        {course.assigned_classes.map((ac: any) => (
                                            <span key={ac.class_id} className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-800">
                                                {ac.class?.name || 'Kelas'}
                                            </span>
                                        ))}
                                    </div>
                                )}
                                
                                <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-700">
                                    <div className="flex items-center text-gray-400 text-xs font-medium">
                                        <Clock className="w-4 h-4 mr-1.5" />
                                        <span>{new Date(course.updated_at || "").toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setAssignModal({ isOpen: true, courseId: course.id, courseTitle: course.title });
                                            }}
                                            className="p-2 bg-gray-50 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                            title="Tugaskan ke Kelas"
                                        >
                                            <Users className="w-5 h-5" />
                                        </button>
                                        <span className="text-indigo-600 dark:text-indigo-400 font-bold text-sm group-hover:translate-x-1 transition-transform">
                                            Edit Materi →
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}
            {/* Create Course Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/60 backdrop-blur-md">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        className="bg-white dark:bg-gray-800 rounded-3xl max-w-md w-full p-8 shadow-2xl border border-gray-100 dark:border-gray-700 overflow-hidden relative"
                    >
                        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-indigo-500 to-purple-600" />
                        
                        <h2 className="text-2xl font-black mb-6 bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600">
                            Buat Materi Baru
                        </h2>
                        
                        <form onSubmit={handleCreateCourse}>
                            <div className="mb-5">
                                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 ml-1">
                                    Judul Materi <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={newTitle}
                                    onChange={(e) => setNewTitle(e.target.value)}
                                    className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700/50 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-medium text-lg"
                                    placeholder="Contoh: Dasar-dasar Design Thinking"
                                    autoFocus
                                />
                            </div>
                            <div className="mb-8">
                                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 ml-1">
                                    Deskripsi Singkat
                                </label>
                                <textarea
                                    rows={3}
                                    value={newDescription}
                                    onChange={(e) => setNewDescription(e.target.value)}
                                    className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700/50 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-medium resize-none"
                                    placeholder="Opsional: Jelaskan apa yang akan dipelajari siswa..."
                                />
                            </div>
                            <div className="flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="flex-1 px-6 py-3 text-gray-600 dark:text-gray-400 font-bold hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors"
                                    disabled={isCreating}
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    disabled={isCreating || !newTitle.trim()}
                                    className="flex-[2] flex items-center justify-center px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-indigo-500/20 active:scale-95"
                                >
                                    {isCreating ? (
                                        <>
                                            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                            Menyimpan...
                                        </>
                                    ) : (
                                        'Buat & Mulai Edit'
                                    )}
                                </button>
                            </div>
                        </form>
                    </motion.div>
                </div>
            )}

            {/* Assign Course Modal */}
            <AssignCourseModal
                isOpen={assignModal.isOpen}
                onClose={() => setAssignModal(prev => ({ ...prev, isOpen: false }))}
                courseId={assignModal.courseId}
                courseTitle={assignModal.courseTitle}
            />
        </div>
    );
};
