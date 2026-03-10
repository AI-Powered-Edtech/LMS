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
        <div className="p-8 max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-2xl font-bold mb-2">Kelola Materi</h1>
                    <p className="text-gray-600 dark:text-gray-400">
                        Buat dan atur materi pembelajaran, modul, serta kuis.
                    </p>
                </div>
                <button
                    onClick={openModal}
                    className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                >
                    <Plus className="w-5 h-5" />
                    <span>Buat Materi</span>
                </button>
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-20">
                    <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mb-4" />
                    <p className="text-gray-500">Memuat materi...</p>
                </div>
            ) : error ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                    <div className="p-4 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg max-w-md w-full">
                        <p className="font-medium mb-2">Terjadi kesalahan</p>
                        <p className="text-sm">{error}</p>
                        <button
                            onClick={loadCourses}
                            className="mt-4 flex items-center justify-center w-full space-x-2 px-4 py-2 bg-red-50 dark:bg-red-900/50 hover:bg-red-100 rounded-md transition-colors"
                        >
                            <RefreshCw className="w-4 h-4" />
                            <span>Coba Lagi</span>
                        </button>
                    </div>
                </div>
            ) : courses.length === 0 ? (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col items-center justify-center py-32 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm"
                >
                    <div className="w-20 h-20 bg-indigo-50 dark:bg-indigo-900/30 rounded-full flex items-center justify-center mb-6">
                        <BookOpen className="w-10 h-10 text-indigo-500" />
                    </div>
                    <h2 className="text-xl font-semibold mb-2">Belum Ada Materi</h2>
                    <p className="text-gray-500 text-center max-w-sm mb-6">
                        Anda belum memiliki kursus atau materi pelajaran. Buat materi pertama Anda untuk mulai mengajar.
                    </p>
                    <button
                        onClick={openModal}
                        className="px-6 py-2.5 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 shadow-sm transition-colors"
                    >
                        Buat Materi Pertama
                    </button>
                </motion.div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {courses.map((course) => (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            key={course.id}
                            className="group cursor-pointer bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-lg transition-all"
                        >
                            <div
                                onClick={() => navigate(`/teaching/course-builder?courseId=${course.id}`)}
                                className="h-40 bg-gradient-to-br from-indigo-500 to-purple-600 relative p-6 flex flex-col justify-end"
                            >
                                <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors" />
                                <h3 className="text-white font-semibold text-xl relative z-10 drop-shadow-md line-clamp-2">
                                    {course.title}
                                </h3>
                            </div>
                            <div className="p-5">
                                <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 mb-4 h-10">
                                    {course.description || "Tidak ada deskripsi."}
                                </p>

                                {course.assigned_classes && course.assigned_classes.length > 0 && (
                                    <div className="mb-4">
                                        <div className="flex flex-wrap gap-2">
                                            {course.assigned_classes.map((ac: any) => (
                                                <span key={ac.class_id} className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100 uppercase">
                                                    {ac.class?.name || 'Kelas'}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                <div className="flex items-center text-xs text-gray-400 justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="flex items-center">
                                            <Clock className="w-3.5 h-3.5 mr-1" />
                                            <span>{new Date(course.updated_at || "").toLocaleDateString()}</span>
                                        </div>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setAssignModal({ isOpen: true, courseId: course.id, courseTitle: course.title });
                                            }}
                                            className="px-3 py-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full font-bold hover:bg-indigo-100 transition-colors flex items-center gap-1"
                                        >
                                            <Users className="w-3 h-3" />
                                            Tugaskan
                                        </button>
                                    </div>
                                    <span
                                        onClick={() => navigate(`/teaching/course-builder?courseId=${course.id}`)}
                                        className="text-indigo-600 dark:text-indigo-400 font-medium hover:underline"
                                    >
                                        Edit →
                                    </span>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}

            {/* Create Course Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/50 backdrop-blur-sm">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full p-6 shadow-2xl"
                    >
                        <h2 className="text-xl font-bold mb-4">Buat Materi Baru</h2>
                        <form onSubmit={handleCreateCourse}>
                            <div className="mb-4">
                                <label className="block text-sm font-medium mb-1">Judul Materi *</label>
                                <input
                                    type="text"
                                    required
                                    value={newTitle}
                                    onChange={(e) => setNewTitle(e.target.value)}
                                    className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700/50 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                    placeholder="Contoh: Matematika Dasar Kelas 10"
                                    autoFocus
                                />
                            </div>
                            <div className="mb-6">
                                <label className="block text-sm font-medium mb-1">Deskripsi Singkat</label>
                                <textarea
                                    rows={3}
                                    value={newDescription}
                                    onChange={(e) => setNewDescription(e.target.value)}
                                    className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700/50 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                    placeholder="Opsional: Penjelasan singkat tentang materi ini..."
                                />
                            </div>
                            <div className="flex justify-end space-x-3">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                                    disabled={isCreating}
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    disabled={isCreating || !newTitle.trim()}
                                    className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    {isCreating ? (
                                        <>
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
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
