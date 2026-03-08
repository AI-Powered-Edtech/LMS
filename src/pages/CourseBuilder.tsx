import { useState, useRef, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { 
  Plus, 
  GripVertical, 
  Video, 
  FileText, 
  HelpCircle, 
  Target, 
  Trash2, 
  MoreVertical, 
  ArrowRight,
  Layout,
  Eye,
  Save,
  X,
  UploadCloud,
  Link as LinkIcon,
  Image as ImageIcon,
  Sparkles,
  Check
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/src/utils/cn";
import { useToast } from "@/src/contexts/ToastContext";

type ContentType = "video" | "article" | "quiz" | "assignment";

interface QuizQuestion {
  id: number;
  text: string;
  options: string[];
  answer: number;
}

interface CourseItem {
  id: string;
  title: string;
  type: ContentType;
  prerequisiteId?: string;
  contentUrl?: string;
  contentBody?: string;
  description?: string;
  quizQuestions?: QuizQuestion[];
  isPublished?: boolean;
}

interface Module {
  id: string;
  title: string;
  items: CourseItem[];
  isPublished?: boolean;
}

export function CourseBuilder() {
  const location = useLocation();
  const [modules, setModules] = useState<Module[]>([]);

  const [activePreview, setActivePreview] = useState(false);
  const [editingItem, setEditingItem] = useState<{moduleId: string, item: CourseItem} | null>(null);
  const [incomingQuiz, setIncomingQuiz] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (location.state?.action === 'add-quiz' && location.state?.quizData) {
      setIncomingQuiz(location.state.quizData);
      // Clear state to prevent re-triggering
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  const handleAddItem = (moduleId: string, type: ContentType) => {
    const newItem: CourseItem = {
      id: `new-${Date.now()}`,
      title: `New ${type.charAt(0).toUpperCase() + type.slice(1)}`,
      type,
      prerequisiteId: modules.find(m => m.id === moduleId)?.items.slice(-1)[0]?.id
    };

    setModules(prev => prev.map(m => 
      m.id === moduleId ? { ...m, items: [...m.items, newItem] } : m
    ));
    
    // Automatically open edit panel for new item
    setEditingItem({ moduleId, item: newItem });
  };

  const handleAddIncomingQuiz = (moduleId: string) => {
    if (!incomingQuiz) return;
    
    const newItem: CourseItem = {
      id: `quiz-${Date.now()}`,
      title: incomingQuiz.title,
      type: 'quiz',
      prerequisiteId: modules.find(m => m.id === moduleId)?.items.slice(-1)[0]?.id,
      description: incomingQuiz.summary,
      quizQuestions: incomingQuiz.questions
    };

    setModules(prev => prev.map(m => 
      m.id === moduleId ? { ...m, items: [...m.items, newItem] } : m
    ));
    
    setIncomingQuiz(null);
    setEditingItem({ moduleId, item: newItem });
    toast("Quiz added to module successfully!", "success");
  };

  const handleDeleteItem = (moduleId: string, itemId: string) => {
    setModules(prev => prev.map(m => ({
      ...m,
      items: m.items.filter(i => i.id !== itemId)
    })));
    if (editingItem?.item.id === itemId) setEditingItem(null);
  };

  const handleUpdateItem = (field: keyof CourseItem, value: any) => {
    if (!editingItem) return;
    
    const updatedItem = { ...editingItem.item, [field]: value };
    setEditingItem({ ...editingItem, item: updatedItem });
    
    setModules(prev => prev.map(m => 
      m.id === editingItem.moduleId ? {
        ...m,
        items: m.items.map(i => i.id === editingItem.item.id ? updatedItem : i)
      } : m
    ));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // In a real app, upload to server/storage here
      // For demo, we fake a URL
      const fakeUrl = URL.createObjectURL(file);
      handleUpdateItem('contentUrl', fakeUrl);
      handleUpdateItem('title', file.name.split('.')[0]); // Auto-update title from filename
    }
  };

  const getIcon = (type: ContentType) => {
    switch (type) {
      case "video": return <Video className="w-4 h-4 text-blue-500" />;
      case "article": return <FileText className="w-4 h-4 text-green-500" />;
      case "quiz": return <HelpCircle className="w-4 h-4 text-purple-500" />;
      case "assignment": return <Target className="w-4 h-4 text-orange-500" />;
    }
  };

  const [activeTab, setActiveTab] = useState<'materials' | 'assignments'>('materials');

  const [step, setStep] = useState(1);
  const [isPublishing, setIsPublishing] = useState(false);

  const steps = [
    "Define Course Structure",
    "Add Content",
    "Preview",
    "Publish"
  ];

  return (
    <div className="max-w-7xl mx-auto pb-20 relative">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Course Builder</h1>
          <p className="text-slate-500 mt-2">Atur konten pembelajaran dan tugas siswa.</p>
          <div className="mt-4 flex items-center gap-2 text-sm font-bold text-blue-600">
            <span>Step {step} of {steps.length}: {steps[step - 1]}</span>
          </div>
        </div>
        <div className="flex gap-3">
          {step < steps.length && (
            <button 
              onClick={() => setStep(prev => prev + 1)}
              className="px-4 py-2 bg-slate-900 text-white rounded-xl font-bold flex items-center gap-2"
            >
              Next Step <ArrowRight className="w-4 h-4" />
            </button>
          )}
          {step === steps.length && (
            <button 
              onClick={() => {
                if (confirm("Are you sure you want to publish this course?")) {
                  setIsPublishing(true);
                  toast("Course Published!", "success");
                }
              }}
              className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-green-200 transition-transform active:scale-95"
            >
              <Check className="w-4 h-4" />
              Publish Course
            </button>
          )}
          <button 
            onClick={() => setActivePreview(!activePreview)}
            className={cn(
              "px-4 py-2 rounded-xl font-bold flex items-center gap-2 transition-colors border",
              activePreview 
                ? "bg-blue-50 text-blue-700 border-blue-200" 
                : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
            )}
          >
            <Eye className="w-4 h-4" />
            {activePreview ? "Hide Preview" : "Preview"}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-slate-200 mb-8">
        <button
          onClick={() => setActiveTab('materials')}
          className={cn(
            "px-4 py-2 font-bold text-sm border-b-2 transition-colors",
            activeTab === 'materials' ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-700"
          )}
        >
          Learning Materials
        </button>
        <button
          onClick={() => setActiveTab('assignments')}
          className={cn(
            "px-4 py-2 font-bold text-sm border-b-2 transition-colors",
            activeTab === 'assignments' ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-700"
          )}
        >
          Assignments
        </button>
      </div>

      {activeTab === 'materials' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Course Structure Builder */}
          <div className="lg:col-span-2 space-y-6">
            {modules.length === 0 && (
              <div className="text-center py-12 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto shadow-sm mb-4">
                  <Layout className="w-8 h-8 text-slate-300" />
                </div>
                <h3 className="text-lg font-bold text-slate-700">Course Structure is Empty</h3>
                <p className="text-slate-500 mb-6">Start by adding your first module.</p>
                <button 
                  onClick={() => setModules([{ id: `mod-${Date.now()}`, title: "Module 1", items: [] }])}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-colors"
                >
                  + Create Module
                </button>
              </div>
            )}
            {modules.map((module) => (
              <motion.div 
                key={module.id} 
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden"
              >
                <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <GripVertical className="w-5 h-5 text-slate-400 cursor-move" />
                    <input 
                      type="text" 
                      value={module.title}
                      onChange={(e) => {
                        const newTitle = e.target.value;
                        setModules(prev => prev.map(m => m.id === module.id ? { ...m, title: newTitle } : m));
                      }}
                      className="bg-transparent font-bold text-slate-800 focus:outline-none focus:bg-white px-2 py-1 rounded-lg border border-transparent focus:border-blue-300 transition-all w-full sm:w-80"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => setModules(prev => prev.map(m => m.id === module.id ? { ...m, isPublished: !m.isPublished } : m))}
                      className={cn("px-2 py-1 rounded-lg text-xs font-bold transition-colors", module.isPublished ? "bg-green-100 text-green-700" : "bg-slate-200 text-slate-600")}
                    >
                      {module.isPublished ? "Published" : "Draft"}
                    </button>
                    <button className="p-2 hover:bg-slate-200 rounded-full text-slate-500">
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                
                <div className="p-4 space-y-3">
                  <AnimatePresence>
                    {module.items.map((item, index) => (
                      <motion.div 
                        key={item.id} 
                        layout
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        onClick={() => setEditingItem({ moduleId: module.id, item })}
                        className={cn(
                          "group flex items-center gap-3 p-3 border rounded-xl cursor-pointer transition-all",
                          editingItem?.item.id === item.id 
                            ? "bg-blue-50 border-blue-300 ring-2 ring-blue-100" 
                            : "bg-white border-slate-100 hover:border-blue-300 hover:shadow-md"
                        )}
                      >
                        <GripVertical className="w-4 h-4 text-slate-300 cursor-move" />
                        <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center shrink-0">
                          {getIcon(item.type)}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <div className="font-medium text-slate-700 text-sm truncate">{item.title}</div>
                            {((item.type === 'video' && !item.contentUrl) || (item.type === 'article' && !item.contentBody)) && (
                              <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-100 flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                                Empty
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                              {item.type}
                            </span>
                            {item.prerequisiteId && (
                              <span className="text-[10px] text-slate-400 flex items-center gap-1">
                                <ArrowRight className="w-3 h-3" /> Requires: 
                                <span className="font-medium text-slate-600 truncate max-w-[100px]">
                                  {modules.flatMap(m => m.items).find(i => i.id === item.prerequisiteId)?.title || "Unknown"}
                                </span>
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingItem({ moduleId: module.id, item });
                            }}
                            className="p-2 hover:bg-blue-50 text-slate-400 hover:text-blue-500 rounded-lg transition-colors"
                            title="Edit Content"
                          >
                            <FileText className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteItem(module.id, item.id);
                            }}
                            className="p-2 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-lg transition-colors"
                            title="Delete Item"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>

                  <div className="flex gap-2 mt-4 pt-2 border-t border-slate-100">
                    <button onClick={() => handleAddItem(module.id, 'video')} className="flex-1 py-2 bg-slate-50 hover:bg-blue-50 text-slate-600 hover:text-blue-600 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors border border-dashed border-slate-300 hover:border-blue-300">
                      <Plus className="w-3 h-3" /> Video
                    </button>
                    <button onClick={() => handleAddItem(module.id, 'article')} className="flex-1 py-2 bg-slate-50 hover:bg-green-50 text-slate-600 hover:text-green-600 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors border border-dashed border-slate-300 hover:border-green-300">
                      <Plus className="w-3 h-3" /> Article
                    </button>
                    <button onClick={() => handleAddItem(module.id, 'quiz')} className="flex-1 py-2 bg-slate-50 hover:bg-purple-50 text-slate-600 hover:text-purple-600 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors border border-dashed border-slate-300 hover:border-purple-300">
                      <Plus className="w-3 h-3" /> Quiz
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}

            <button 
              onClick={() => setModules([...modules, { id: `mod-${Date.now()}`, title: "New Module", items: [] }])}
              className="w-full py-4 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-3xl font-bold flex items-center justify-center gap-2 border-2 border-dashed border-slate-300 transition-colors"
            >
              <Plus className="w-5 h-5" /> Add New Module
            </button>
          </div>

          {/* Right Column: Live Map Preview */}
          <div className="lg:col-span-1">
            <div className={cn(
              "sticky top-8 bg-slate-900 rounded-3xl overflow-hidden shadow-2xl border border-slate-800 transition-all duration-500",
              activePreview ? "opacity-100 translate-x-0" : "opacity-50 grayscale"
            )}>
              <div className="p-4 border-b border-slate-800 flex justify-between items-center">
                <h3 className="font-bold text-white flex items-center gap-2">
                  <Layout className="w-4 h-4 text-blue-400" />
                  Live Map Preview
                </h3>
                <span className="text-[10px] font-bold bg-blue-900/50 text-blue-300 px-2 py-1 rounded">STUDENT VIEW</span>
              </div>
              
              <div className="relative h-[500px] bg-slate-900 p-6 overflow-y-auto custom-scrollbar">
                {/* Grid Background */}
                <div 
                  className="absolute inset-0 opacity-20 pointer-events-none"
                  style={{
                    backgroundImage: "radial-gradient(#3b82f6 1px, transparent 1px)",
                    backgroundSize: "20px 20px",
                  }}
                />

                {/* Visualization of Nodes */}
                <div className="relative flex flex-col items-center gap-12 py-8">
                  {modules.flatMap(m => m.items).map((item, index, allItems) => {
                    // Find if this item is a prerequisite for anyone (to draw line down)
                    const isPrereqFor = allItems.find(i => i.prerequisiteId === item.id);
                    
                    return (
                      <div key={item.id} className="relative flex flex-col items-center z-10">
                        {/* Connection Line (Upwards to prereq) */}
                        {item.prerequisiteId && (
                          <div className="absolute -top-12 w-0.5 h-12 bg-slate-700 -z-10" />
                        )}
                        
                        {/* Node */}
                        <div className={cn(
                          "w-12 h-12 rounded-full flex items-center justify-center border-4 shadow-lg transition-transform hover:scale-110 cursor-pointer",
                          index === 0 ? "bg-blue-500 border-blue-400 shadow-blue-500/50" : "bg-slate-800 border-slate-700"
                        )}>
                          {getIcon(item.type)}
                        </div>
                        
                        {/* Label */}
                        <div className="mt-2 bg-slate-800/80 backdrop-blur px-3 py-1 rounded-lg border border-slate-700 text-center max-w-[150px]">
                          <p className="text-[10px] text-slate-400 truncate font-bold">{item.title}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              
              <div className="p-4 bg-slate-800/50 border-t border-slate-800 text-xs text-slate-400 leading-relaxed">
                <strong className="text-blue-400">Note:</strong> Perubahan urutan atau prasyarat di sebelah kiri akan langsung mengubah struktur peta yang dilihat siswa.
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-20 bg-white rounded-3xl border border-slate-200">
          <h2 className="text-2xl font-bold text-slate-900">Assignments</h2>
          <p className="text-slate-500 mt-2">Manage your quizzes and tasks here.</p>
          {/* Add assignment management UI here */}
        </div>
      )}

      {/* Content Editor Drawer */}
      <AnimatePresence>
        {editingItem && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setEditingItem(null)}
              className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[90]"
            />
            <motion.div 
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-white shadow-2xl z-[100] border-l border-slate-200 flex flex-col"
            >
              {/* Drawer Header */}
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    {getIcon(editingItem.item.type)}
                    Edit {editingItem.item.type === 'video' ? 'Video Content' : editingItem.item.type === 'article' ? 'Article Content' : 'Item Details'}
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">ID: {editingItem.item.id}</p>
                </div>
                <button 
                  onClick={() => setEditingItem(null)}
                  className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Drawer Content */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Title Input */}
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Title</label>
                  <input 
                    type="text" 
                    value={editingItem.item.title}
                    onChange={(e) => handleUpdateItem('title', e.target.value)}
                    className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                {/* Prerequisite Select */}
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Prerequisite (Required before this)</label>
                  <select 
                    value={editingItem.item.prerequisiteId || ""}
                    onChange={(e) => handleUpdateItem('prerequisiteId', e.target.value)}
                    className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                  >
                    <option value="">No Prerequisite (Start Node)</option>
                    {modules.flatMap(m => m.items)
                      .filter(i => i.id !== editingItem.item.id) // Prevent self-reference
                      .map(i => (
                        <option key={i.id} value={i.id}>{i.title}</option>
                    ))}
                  </select>
                </div>

                {/* Dynamic Content Fields based on Type */}
                {editingItem.item.type === 'video' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <label className="block text-sm font-bold text-slate-700">Video Content</label>
                      <span className="text-[10px] font-bold bg-blue-100 text-blue-600 px-2 py-1 rounded-full">MP4 or YouTube</span>
                    </div>
                    
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-4">
                      {/* File Upload */}
                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">Upload File</label>
                        <input 
                          type="file" 
                          ref={fileInputRef}
                          accept="video/mp4"
                          className="hidden"
                          onChange={handleFileUpload}
                        />
                        <div 
                          onClick={() => fileInputRef.current?.click()}
                          className="w-full h-32 border-2 border-dashed border-slate-300 hover:border-blue-400 rounded-xl bg-white hover:bg-blue-50 cursor-pointer flex flex-col items-center justify-center gap-2 transition-all group"
                        >
                          <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                            <UploadCloud className="w-5 h-5 text-blue-500" />
                          </div>
                          <span className="text-xs font-bold text-slate-600 group-hover:text-blue-600">Click to upload MP4</span>
                          <span className="text-[10px] text-slate-400">Max 100MB</span>
                        </div>
                      </div>

                      <div className="relative flex items-center gap-4">
                        <div className="h-px bg-slate-200 flex-1" />
                        <span className="text-[10px] font-bold text-slate-400 uppercase">OR</span>
                        <div className="h-px bg-slate-200 flex-1" />
                      </div>

                      {/* URL Input */}
                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">External URL</label>
                        <div className="relative">
                          <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                          <input 
                            type="text" 
                            placeholder="https://youtube.com/watch?v=..."
                            value={editingItem.item.contentUrl || ""}
                            onChange={(e) => handleUpdateItem('contentUrl', e.target.value)}
                            className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Preview Area */}
                    {editingItem.item.contentUrl && (
                      <div className="mt-4 rounded-xl overflow-hidden border border-slate-200 bg-black aspect-video flex items-center justify-center relative group">
                        <Video className="w-12 h-12 text-white/50" />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity">
                          <p className="text-white text-xs font-bold">Video Preview</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {editingItem.item.type === 'article' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <label className="block text-sm font-bold text-slate-700">Article Content</label>
                      <span className="text-[10px] font-bold bg-green-100 text-green-600 px-2 py-1 rounded-full flex items-center gap-1">
                        <FileText className="w-3 h-3" /> Markdown Supported
                      </span>
                    </div>
                    
                    <div className="relative">
                      <textarea 
                        rows={12}
                        placeholder="# Title\n\nWrite your article content here..."
                        value={editingItem.item.contentBody || ""}
                        onChange={(e) => handleUpdateItem('contentBody', e.target.value)}
                        className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-green-500 outline-none font-mono leading-relaxed resize-y min-h-[200px]"
                      />
                      <div className="absolute bottom-3 right-3 text-[10px] text-slate-400 font-mono bg-white/80 px-2 py-1 rounded border border-slate-100">
                        {(editingItem.item.contentBody || "").length} chars
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">Cover Image</label>
                      <div className="flex items-center gap-4 p-3 border border-slate-200 rounded-xl bg-slate-50">
                        <div className="w-16 h-16 bg-white rounded-lg flex items-center justify-center border border-slate-200 shadow-sm">
                          <ImageIcon className="w-6 h-6 text-slate-300" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-700 mb-1">Article Cover</p>
                          <button className="text-xs text-blue-600 font-bold hover:underline">
                            Upload Image
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {(editingItem.item.type === 'quiz') && (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <label className="block text-sm font-bold text-slate-700">Quiz Questions</label>
                      <button 
                        onClick={() => {
                          const newQ = { id: Date.now(), text: "New Question", options: ["Option A", "Option B", "Option C", "Option D"], answer: 0 };
                          const currentQuestions = editingItem.item.quizQuestions || [];
                          handleUpdateItem('quizQuestions', [...currentQuestions, newQ]);
                        }}
                        className="text-xs font-bold text-blue-600 hover:bg-blue-50 px-2 py-1 rounded-lg transition-colors"
                      >
                        + Add Question
                      </button>
                    </div>
                    
                    <div className="space-y-4">
                      {(editingItem.item.quizQuestions || []).map((q, qIdx) => (
                        <div key={q.id} className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                          <div className="flex justify-between items-start gap-2">
                            <span className="text-xs font-bold text-slate-400 mt-2">Q{qIdx + 1}</span>
                            <textarea
                              value={q.text}
                              onChange={(e) => {
                                const newQuestions = [...(editingItem.item.quizQuestions || [])];
                                newQuestions[qIdx].text = e.target.value;
                                handleUpdateItem('quizQuestions', newQuestions);
                              }}
                              className="flex-1 bg-white border border-slate-200 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                              rows={2}
                            />
                            <button 
                              onClick={() => {
                                const newQuestions = (editingItem.item.quizQuestions || []).filter((_, i) => i !== qIdx);
                                handleUpdateItem('quizQuestions', newQuestions);
                              }}
                              className="text-slate-400 hover:text-red-500 p-1"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                          
                          <div className="space-y-2 pl-6">
                            {q.options.map((opt, oIdx) => (
                              <div key={oIdx} className="flex items-center gap-2">
                                <button
                                  onClick={() => {
                                    const newQuestions = [...(editingItem.item.quizQuestions || [])];
                                    newQuestions[qIdx].answer = oIdx;
                                    handleUpdateItem('quizQuestions', newQuestions);
                                  }}
                                  className={cn(
                                    "w-5 h-5 rounded-full border flex items-center justify-center transition-colors",
                                    q.answer === oIdx ? "bg-green-50 border-green-500 text-white" : "border-slate-300 hover:border-slate-400 text-transparent"
                                  )}
                                >
                                  <Check className="w-3 h-3" />
                                </button>
                                <input
                                  type="text"
                                  value={opt}
                                  onChange={(e) => {
                                    const newQuestions = [...(editingItem.item.quizQuestions || [])];
                                    newQuestions[qIdx].options[oIdx] = e.target.value;
                                    handleUpdateItem('quizQuestions', newQuestions);
                                  }}
                                  className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                      
                      {(editingItem.item.quizQuestions || []).length === 0 && (
                        <div className="text-center py-8 text-slate-400 text-sm border-2 border-dashed border-slate-200 rounded-xl">
                          No questions yet. Add one to start.
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {editingItem.item.type === 'assignment' && (
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-center space-y-3">
                    <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mx-auto shadow-sm">
                      {getIcon(editingItem.item.type)}
                    </div>
                    <h3 className="font-bold text-slate-900">Assignment Details</h3>
                    <p className="text-xs text-slate-500">
                      Assignment configuration will be available in the next update.
                    </p>
                  </div>
                )}
              </div>

              {/* Drawer Footer */}
              <div className="p-6 border-t border-slate-100 bg-slate-50/50">
                <button 
                  onClick={() => setEditingItem(null)}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-200 transition-all active:scale-95"
                >
                  Save & Close
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Incoming Quiz Modal */}
      <AnimatePresence>
        {incomingQuiz && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl"
            >
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                  <Sparkles className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">AI Quiz Ready</h3>
                  <p className="text-sm text-slate-500">Where should we place "{incomingQuiz.title}"?</p>
                </div>
              </div>
              
              <div className="space-y-2 max-h-60 overflow-y-auto mb-6">
                {modules.map(m => (
                  <button
                    key={m.id}
                    onClick={() => handleAddIncomingQuiz(m.id)}
                    className="w-full p-3 text-left rounded-xl border border-slate-200 hover:border-purple-500 hover:bg-purple-50 transition-all flex justify-between items-center group"
                  >
                    <span className="font-medium text-slate-700 group-hover:text-purple-700">{m.title}</span>
                    <Plus className="w-4 h-4 text-slate-400 group-hover:text-purple-500" />
                  </button>
                ))}
              </div>
              
              <button 
                onClick={() => setIncomingQuiz(null)}
                className="w-full py-3 text-slate-500 font-bold hover:bg-slate-50 rounded-xl"
              >
                Cancel
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
