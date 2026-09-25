import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import FileUpload from '@/components/modules/grading/FileUpload';
import { gradingApi as api, api as mainApi, type SubjectRow } from '@/lib/api';
import { aiGenerationStore } from '@/services/aiGenerationStore';
import { Sparkles, Edit3, CheckCircle, Type, UploadCloud, ArrowRight, Info, Lightbulb, X, Search, ArrowLeft, ChevronDown, AlertCircle, Calendar, BookOpen, Bookmark, Database, Code, Upload, Loader2 } from 'lucide-react';
import classNames from 'classnames';
import Editor from 'react-simple-wysiwyg';
import { DateTimePicker } from '@/components/ui/DateTimePicker';
import { extractAssignmentTypesFromSyllabus } from '@/utils/subjectHelper';
import { RubricRuleSpecViewer } from '@/components/modules/grading/evidence/RubricRuleSpecViewer';
import { FormattedText } from '@/components/ui/FormattedText';
import { cleanAssignmentHtml } from '@/utils/htmlCleaner';

export interface PromptTemplate {
    id: string;
    name: string;
    subjectId: string;
    projectTypeId?: string;
    category?: string;
    templateContent: string;
    placeholderSchema?: string;
    isActive?: boolean;
    temperature?: number;
}

const CustomDropdown = ({
    value,
    onChange,
    options,
    placeholder,
    emptyMessage,
    className = "w-48",
    hasError = false,
    icon,
    disabled = false
}: {
    value: string,
    onChange: (v: string) => void,
    options: any[],
    placeholder?: string,
    emptyMessage?: string,
    className?: string,
    hasError?: boolean,
    icon?: React.ReactNode,
    disabled?: boolean
}) => {
    const { t } = useTranslation();
    const [isOpen, setIsOpen] = useState(false);

    // Defaults live here rather than in the parameter list so they can be translated.
    const placeholderText = placeholder ?? t('lc.up.select_placeholder');
    const emptyMessageText = emptyMessage ?? t('lc.up.empty_message');

    const normalizedOptions = options.map(opt => typeof opt === 'string' ? { value: opt, label: opt } : opt);
    const selectedOption = normalizedOptions.find(opt => opt.value === value);
    const isInteractive = !disabled;

    return (
        <div className={`relative ${isOpen ? 'z-50' : 'z-10'} ${className}`}>
            <div
                className={classNames(
                    "w-full px-3.5 py-2.5 border rounded-xl text-sm outline-none bg-white flex items-center justify-between shadow-2xs transition-all duration-200 select-none",
                    isInteractive ? 'cursor-pointer' : 'cursor-not-allowed opacity-70',
                    isOpen
                        ? "border-brand-500 ring-4 ring-brand-500/10 shadow-sm"
                        : (hasError
                            ? "border-rose-400 ring-3 ring-rose-500/10 bg-rose-50/30"
                            : "border-slate-200 hover:border-slate-300 hover:shadow-2xs")
                )}
                onClick={() => {
                    if (!isInteractive) return;
                    setIsOpen(!isOpen);
                }}
            >
                <div className="flex items-center gap-2 min-w-0 pr-1">
                    {icon && <span className="text-slate-400 shrink-0">{icon}</span>}
                    <span className={classNames("truncate font-semibold text-[13.5px]", value ? "text-slate-800" : "text-slate-400 font-normal")}>
                        {selectedOption ? selectedOption.label : (value ? value : placeholderText)}
                    </span>
                </div>
                <ChevronDown size={15} className={`text-slate-400 shrink-0 transition-transform duration-200 ${isOpen ? "rotate-180 text-brand-600" : ""} ${disabled ? 'opacity-50' : ''}`} />
            </div>

            {isOpen && isInteractive && (

                <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
                    <div className="absolute z-50 min-w-full w-max max-w-xs mt-1.5 bg-white border border-slate-100 rounded-2xl shadow-[0_12px_32px_-8px_rgba(15,23,42,0.15)] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150 py-1.5 max-h-60 overflow-y-auto">
                        {normalizedOptions.length === 0 ? (
                            <div className="px-4 py-3 text-xs text-slate-400 font-medium text-center italic">
                                {emptyMessageText}
                            </div>
                        ) : (
                            normalizedOptions.map(opt => {
                                const isSelected = value === opt.value;
                                return (
                                    <div
                                        key={opt.value}
                                        className={classNames(
                                            "px-3.5 py-2 mx-1.5 my-0.5 text-xs font-semibold cursor-pointer transition-all duration-150 rounded-xl flex items-center justify-between gap-3",
                                            isSelected
                                                ? "bg-brand-50/80 text-brand-700 font-bold"
                                                : "text-slate-700 hover:bg-slate-50 hover:text-brand-600"
                                        )}
                                        onClick={() => { onChange(opt.value); setIsOpen(false); }}
                                    >
                                        <span className="truncate">{opt.label}</span>
                                        {isSelected && <CheckCircle size={14} className="text-brand-600 shrink-0" />}
                                    </div>
                                );
                            })
                        )}
                    </div>
                </>
            )}
        </div>
    );
};


export default function AssignmentUploadPage() {
    const { t } = useTranslation();
    const [step, setStep] = useState<1 | 2 | 3>(1);
    const [inputMethod, setInputMethod] = useState<'file' | 'text'>('text');
    const [textPrompt, setTextPrompt] = useState('');
    const [_uploadedFile, setUploadedFile] = useState<File | null>(null);

    const [content, setContent] = useState('');
    const [rubric, setRubric] = useState<any>(null);
    const [blueprint, setBlueprint] = useState<any>(null);
    const [metadata, setMetadata] = useState<any>({ title: 'AI Generated Assignment', description: '', projectType: 'backend', subject: '', category: '', dueDate: '' });

    const [answerKeyFile, setAnswerKeyFile] = useState<File | null>(null);
    const [answerKeyText, setAnswerKeyText] = useState<string>('');
    const [isUploadingAnswerKey, setIsUploadingAnswerKey] = useState<boolean>(false);
    const [showAnswerKeyEditor, setShowAnswerKeyEditor] = useState<boolean>(false);

    const handleAnswerKeyUpload = async (file: File) => {
        setIsUploadingAnswerKey(true);
        try {
            setAnswerKeyFile(file);

            // Read file content locally for the editor display
            const text = await file.text();
            setAnswerKeyText(text);

            // Call backend to parse SQL Key and generate test cases
            if (rubric?.rules) {
                const formData = new FormData();
                formData.append('file', file);
                formData.append('rubricRules', JSON.stringify(rubric.rules));

                const response = await api.parseSqlKey(formData);
                if (response.rules) {
                    setRubric({ ...rubric, rules: response.rules });
                }
            }
        } catch (err: any) {
            console.error("Failed to parse Answer Key file:", err);
            setError(t('lc.up.parse_sql_failed') + (err.message || t('lc.up.file_read_error')));
        } finally {
            setIsUploadingAnswerKey(false);
        }
    };

    const [isLoading, setIsLoading] = useState(false);
    const [loadingMsg, setLoadingMsg] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [existingTotalWeight, setExistingTotalWeight] = useState<number>(0);

    const [isDrawerOpen, setIsDrawerOpen] = useState(false);

    const [previewTemplateId, setPreviewTemplateId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [subjectCode, setSubjectCode] = useState('');
    const [promptTemplates, setPromptTemplates] = useState<PromptTemplate[]>([]);
    const [subjectCodeToId, setSubjectCodeToId] = useState<Record<string, string>>({});

    const [drawerSubjectCode, setDrawerSubjectCode] = useState('');
    const [drawerPromptTemplates, setDrawerPromptTemplates] = useState<PromptTemplate[]>([]);

    const [drawerWidth, setDrawerWidth] = useState(50);
    const [isDragging, setIsDragging] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const [previewContent, setPreviewContent] = useState('');
    const [editingRuleIndex, setEditingRuleIndex] = useState<number | null>(null);

    const currentTotalScore = rubric?.rules ? rubric.rules.reduce((sum: number, r: any) => sum + (Number(r.weight) || 0), 0) : 0;
    const isTotalScoreValid = Math.abs(currentTotalScore - 10) <= 0.01;
    const isReviewStep = step === 3;

    const navigate = useNavigate();

    const [teacherSubjects, setTeacherSubjects] = useState<string[]>([]);
    const [allSubjectsData, setAllSubjectsData] = useState<SubjectRow[]>([]);
    const [selectedAssignmentType, setSelectedAssignmentType] = useState<string>('');
    const [availableAssignmentTypes, setAvailableAssignmentTypes] = useState<string[]>([]);
    const [allClasses, setAllClasses] = useState<any[]>([]);
    const [semesters, setSemesters] = useState<any[]>([]);
    const [selectedSemester, setSelectedSemester] = useState<string>('');
    const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
    const [validationErrors, setValidationErrors] = useState<{ semester?: string, subjectCode?: string, assignmentType?: string, dueDate?: string, classes?: string }>({});


    const handleCancelGeneration = () => {
        aiGenerationStore.cancelGeneration();
        setIsLoading(false);
    };

    useEffect(() => {
        const unsubscribe = aiGenerationStore.subscribe((storeState) => {
            setIsLoading(storeState.isGenerating);
            if (storeState.loadingMsg) setLoadingMsg(storeState.loadingMsg);
            if (storeState.error) setError(storeState.error);
            if (storeState.result) {
                setContent(cleanAssignmentHtml(storeState.result.content));
                setRubric(storeState.result.rubric);
                setBlueprint(storeState.result.blueprint);
                setMetadata(storeState.result.metadata);
                setStep(storeState.result.step);
            }
            if (storeState.selectedSemester) setSelectedSemester(storeState.selectedSemester);
            if (storeState.subjectCode) setSubjectCode(storeState.subjectCode);
            if (storeState.assignmentType) setSelectedAssignmentType(storeState.assignmentType);
            if (storeState.textPrompt) setTextPrompt(storeState.textPrompt);
        });
        return unsubscribe;
    }, []);

    useEffect(() => {
        const fetchClasses = async () => {
            try {
                const [clsData, semsData, subjData] = await Promise.all([
                    mainApi.getClasses(1, 1000),
                    mainApi.getSemesters(),
                    mainApi.getSubjects(1, 1000).catch(() => [])
                ]);
                setAllClasses(clsData);
                if (Array.isArray(subjData)) {
                    setAllSubjectsData(subjData);
                }

                // Filter semesters to only include those where the lecturer has classes
                const teacherSemesterIds = new Set(clsData.map((c: any) => c.semester?.id).filter(Boolean));
                const filteredSems = semsData.filter((s: any) => teacherSemesterIds.has(s.id));
                setSemesters(filteredSems);

                const activeSem = filteredSems.find((s: any) => s.isActive) || filteredSems[0];
                if (activeSem) setSelectedSemester(activeSem.id);

                const uniqueSubjects = new Set<string>();
                const subjectIdMap: Record<string, string> = {};
                clsData.forEach((c: any) => {
                    const code = c.subject?.code;
                    const id = c.subject?.id;
                    if (code) {
                        uniqueSubjects.add(code);
                        if (id) subjectIdMap[code] = id;
                    }
                });
                const subjectList = Array.from(uniqueSubjects).sort();
                setTeacherSubjects(subjectList);
                setSubjectCodeToId(subjectIdMap);
            } catch (err) {
                console.error("Failed to load classes:", err);
            }
        };
        fetchClasses();
    }, []);

    useEffect(() => {
        if (!subjectCode) {
            setAvailableAssignmentTypes([]);
            setSelectedAssignmentType('');
            return;
        }
        const foundSubject = allSubjectsData.find(s => s.code?.toLowerCase() === subjectCode.toLowerCase());
        const types = extractAssignmentTypesFromSyllabus(foundSubject?.syllabusData);
        setAvailableAssignmentTypes(types);
        if (types.length > 0) {
            setSelectedAssignmentType(prev => (types.includes(prev) ? prev : types[0]));
            setMetadata((prev: any) => ({ ...prev, category: types.includes(selectedAssignmentType) ? selectedAssignmentType : types[0] }));
        } else {
            setSelectedAssignmentType('');
        }
    }, [subjectCode, allSubjectsData]);

    useEffect(() => {
        if (isDrawerOpen) {
            if (subjectCode) {
                setDrawerSubjectCode(subjectCode);
            } else if (teacherSubjects.length > 0) {
                setDrawerSubjectCode(teacherSubjects[0]);
            }
        }
    }, [isDrawerOpen, subjectCode, teacherSubjects]);

    useEffect(() => {
        const subjectId = subjectCodeToId[drawerSubjectCode];
        if (drawerSubjectCode && subjectId) {
            mainApi.getPromptTemplates(subjectId)
                .then(setDrawerPromptTemplates)
                .catch(console.error);
        } else {
            setDrawerPromptTemplates([]);
        }
    }, [drawerSubjectCode, subjectCodeToId]);

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!isDragging) return;
            const container = containerRef.current;
            if (!container) return;
            const containerRect = container.getBoundingClientRect();
            let newWidthPercent = ((containerRect.right - e.clientX) / containerRect.width) * 100;
            if (newWidthPercent < 30) newWidthPercent = 30;
            if (newWidthPercent > 70) newWidthPercent = 70;
            setDrawerWidth(newWidthPercent);
        };

        const handleMouseUp = () => {
            if (isDragging) setIsDragging(false);
        };

        if (isDragging) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
        }

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging]);

    useEffect(() => {
        const subjectId = subjectCodeToId[subjectCode];
        if (subjectCode && subjectId) {
            mainApi.getPromptTemplates(subjectId)
                .then(setPromptTemplates)
                .catch(console.error);
        } else {
            setPromptTemplates([]);
        }
    }, [subjectCode, subjectCodeToId]);

    useEffect(() => {
        if (error) {
            const timer = setTimeout(() => setError(null), 3500);
            return () => clearTimeout(timer);
        }
    }, [error]);

    useEffect(() => {
        if (!subjectCode) {
            setExistingTotalWeight(0);
            return;
        }
        api.getAssignments()
            .then((res: any[]) => {
                if (Array.isArray(res)) {
                    const total = res
                        .filter((a: any) => a.subject === subjectCode || a.subjectCode === subjectCode || a.SubjectCode === subjectCode)
                        .reduce((sum: number, a: any) => sum + (Number(a.weightPercentage || a.WeightPercentage) || 0), 0);
                    setExistingTotalWeight(total);
                }
            })
            .catch((err) => console.error("Failed to load existing assignments weight:", err));
    }, [subjectCode]);



    const handleGenerateContent = async () => {
        const newErrors: { semester?: string, subjectCode?: string, assignmentType?: string } = {};
        if (!selectedSemester) newErrors.semester = t('lc.up.need_semester');
        if (!subjectCode) newErrors.subjectCode = t('lc.up.need_subject');
        if (!selectedAssignmentType) newErrors.assignmentType = t('lc.up.need_type');

        if (Object.keys(newErrors).length > 0) {
            setValidationErrors(newErrors);
            return;
        }
        setValidationErrors({});

        if (!textPrompt) return;
        setError(null);
        aiGenerationStore.startGeneration(textPrompt, selectedSemester, subjectCode, selectedAssignmentType);
    };

    const handleFileUpload = async (file: File) => {
        const newErrors: { semester?: string, subjectCode?: string, assignmentType?: string } = {};
        if (!selectedSemester) newErrors.semester = t('lc.up.need_semester');
        if (!subjectCode) newErrors.subjectCode = t('lc.up.need_subject');
        if (!selectedAssignmentType) newErrors.assignmentType = t('lc.up.need_type');

        if (Object.keys(newErrors).length > 0) {
            setValidationErrors(newErrors);
            return;
        }
        setValidationErrors({});

        setError(null);
        setUploadedFile(file);
        aiGenerationStore.startFileGeneration(file, selectedSemester, subjectCode, selectedAssignmentType);
    };


    const handleParseRubric = async () => {
        if (!content) return;
        if (rubric && blueprint) {
            setStep(3);
        }
    };

    const handlePublish = async () => {
        if (!rubric || !blueprint) return;

        if (isUploadingAnswerKey) {
            setError(t('lc.up.sql_analyzing'));
            return;
        }

        const newErrors: { semester?: string, classes?: string, dueDate?: string } = {};
        if (!selectedSemester) newErrors.semester = t('lc.up.need_semester');
        if (selectedClasses.length === 0) {
            newErrors.classes = t('lc.up.need_class');
        }
        if (!metadata.dueDate) {
            newErrors.dueDate = t('lc.up.need_due');
        } else if (new Date(metadata.dueDate) < new Date()) {
            newErrors.dueDate = t('lc.up.due_in_past');
        }

        if (Object.keys(newErrors).length > 0) {
            setValidationErrors(newErrors);
            setError(t('lc.up.fill_required'));
            return;
        }

        setError(null);
        setValidationErrors({});

        for (const rule of rubric.rules) {
            if (rule.scoringStrategy === 'StdInOutProbe') {
                const testCases = rule.requiredEvidence?.[0]?.stdInOutProbe?.testCases || [];
                if (testCases.length < 3) {
                    setError(t('lc.up.need_testcases', { title: rule.title, n: testCases.length }));
                    return;
                }
            }
        }

        if (existingTotalWeight + (metadata.weightPercentage || 0) > 70) {
            setError(t('lc.up.weight_exceeds', { value: existingTotalWeight }));
            return;
        }

        const totalScore = rubric.rules.reduce((sum: number, r: any) => sum + (Number(r.weight) || 0), 0);
        if (Math.abs(totalScore - 10) > 0.01) {
            setError(t('lc.up.total_score_warning', { value: totalScore.toFixed(2) }));
            return;
        }

        setIsLoading(true);
        setLoadingMsg(t('lc.up.finalizing'));
        try {
            const defaultGradingStrategy = localStorage.getItem('aita_default_grading_strategy') || 'CONTINUOUS_QUEUE';
            const finalMetadata = {
                ...metadata,
                assignmentType: selectedAssignmentType || metadata.category || 'Assignment',
                examType: selectedAssignmentType || metadata.category || 'Assignment',
                category: selectedAssignmentType || metadata.category || 'Assignment',
                semesterId: selectedSemester,
                classIds: selectedClasses,
                content: cleanAssignmentHtml(content),
                gradingStrategy: defaultGradingStrategy
            };
            const assignment = await api.publishAssignment(finalMetadata, blueprint, rubric);
            aiGenerationStore.reset();
            navigate(`/lecturer/grading/assignments/${assignment.id}`);
        } catch (err: any) {
            setError(err.message || t('lc.up.publish_failed'));
        } finally {
            setIsLoading(false);
        }
    };

    const handleRuleChange = (index: number, field: string, value: string) => {
        const updatedRubric = { ...rubric };
        if (field === 'weight') {
            updatedRubric.rules[index].weight = parseFloat(value) || 0;
        } else {
            updatedRubric.rules[index][field] = value;
        }
        setRubric(updatedRubric);
    };

    const handleDeleteRule = (index: number) => {
        const updatedRubric = { ...rubric };
        updatedRubric.rules.splice(index, 1);
        setRubric(updatedRubric);
    };

    const handleTestCaseChange = (ruleIndex: number, tcIndex: number, field: string, value: string | number) => {
        const updatedRubric = { ...rubric };
        const rule = updatedRubric.rules[ruleIndex];
        if (rule.requiredEvidence && rule.requiredEvidence[0] && rule.requiredEvidence[0].stdInOutProbe) {
            const tc = rule.requiredEvidence[0].stdInOutProbe.testCases[tcIndex];
            if (tc) {
                tc[field] = value;
                setRubric(updatedRubric);
            }
        }
    };

    const availableSubjectsForInput = selectedSemester
        ? Array.from(new Set(allClasses.filter((c: any) => c.semester?.id === selectedSemester && c.subject?.code).map((c: any) => c.subject.code))).sort()
        : teacherSubjects;

    const getSemesterLabel = (s: any) => {
        const parts = [s.season, s.code].filter(v => v && v !== 'undefined');
        return parts.length > 0 ? parts.join(' - ') : t('lc.up.other_semester');
    };

    return (
        <div ref={containerRef} className={classNames("bg-gradient-to-br from-indigo-50/50 via-white to-white h-[calc(100vh-64px)] -mx-4 sm:-mx-6 lg:-mx-8 -mt-6 -mb-8 rounded-tl-3xl font-sans relative flex", isDragging && "select-none")}>
            <div
                className={classNames("overflow-y-auto overflow-x-hidden transition-all relative flex flex-col h-full", isDrawerOpen ? "shrink-0" : "flex-1 w-full")}
                style={{ width: isDrawerOpen ? `${100 - drawerWidth}%` : '100%', transitionDuration: isDragging ? '0ms' : '300ms' }}
            >

                {/* Clean Background to match mockup */}

                <div className={classNames("mx-auto w-full flex flex-col flex-1 relative z-10 pt-5 pb-6 transition-all duration-300", isDrawerOpen ? "max-w-full px-4 sm:px-6" : "max-w-full px-4 sm:px-6 lg:px-8")}>
                    <div className="mb-3 animate-fade-in">
                        <button onClick={() => { aiGenerationStore.reset(); navigate(`/lecturer/grading/assignments`); }} className="text-slate-400 hover:text-brand-500 transition-colors p-2 -ml-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2 font-medium">
                            <ArrowLeft size={20} />
                            Back to assignments
                        </button>
                    </div>

                    {/* Top Section: Title + Steps + Image */}
                    <div className={classNames("flex items-start justify-between shrink-0 relative z-0", isDrawerOpen ? "mb-8" : "mb-0")}>

                        {/* Left side: Title and Steps */}
                        <div className="flex flex-col gap-8">
                            <div className="flex gap-4">
                                <Sparkles className="text-brand-600 w-10 h-10 mt-1 shrink-0" />
                                <div>
                                    <h1 className="text-3xl font-black text-slate-900 mb-1 tracking-tight">
                                        AI assignment creator
                                    </h1>
                                    <p className="text-slate-500 font-medium text-base">{t('lc.up.subtitle')}</p>
                                </div>
                            </div>

                            {/* Progress Steps */}
                            <div className="flex items-center justify-start gap-5 pl-14">
                                <StepIndicator current={step} step={1} title={t('lc.up.step1')} />
                                <div className="w-16 h-[1px] bg-slate-200"></div>
                                <StepIndicator current={step} step={2} title={t('lc.up.step2')} />
                                <div className="w-16 h-[1px] bg-slate-200"></div>
                                <StepIndicator current={step} step={3} title={t('lc.up.step3')} />
                            </div>
                        </div>

                        {/* Right side: 3D Image (Natural layout, no absolute positioning) */}
                        {!isDrawerOpen && (
                            <div className="hidden lg:block w-[420px] h-[280px] shrink-0 -mr-8 -mt-6">
                                <div
                                    className="w-full h-full opacity-90"
                                    style={{
                                        WebkitMaskImage: 'radial-gradient(ellipse at center, rgba(0,0,0,1) 30%, rgba(0,0,0,0) 70%)',
                                        maskImage: 'radial-gradient(ellipse at center, rgba(0,0,0,1) 30%, rgba(0,0,0,0) 70%)'
                                    }}
                                >
                                    <img
                                        src="/ai-graphic.png"
                                        alt="3D Assignment Graphic"
                                        className="w-full h-full object-cover mix-blend-multiply contrast-[1.1] brightness-[1.05] [filter:hue-rotate(130deg)_saturate(1.2)]"
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center p-20 border border-slate-200 rounded-2xl bg-slate-50 text-center">
                            <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-brand-600 mb-6"></div>
                            <h2 className="text-2xl text-slate-800 font-bold mb-2">{loadingMsg}</h2>
                            <p className="text-slate-500 mb-6">{t('lc.up.please_wait')}</p>
                            <button
                                onClick={handleCancelGeneration}
                                className="px-6 py-2.5 bg-white border border-rose-200 text-rose-600 hover:bg-rose-50 rounded-xl font-bold transition-colors shadow-sm"
                            >
                                Cancel
                            </button>
                        </div>
                    ) : (
                        <div className="flex flex-col flex-1">
                            {/* STEP 1: INPUT */}
                            {step === 1 && (
                                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 flex flex-col flex-1 relative z-10">
                                    {/* Input Cards Grid */}
                                    <div className={classNames("grid shrink-0 relative z-10", isDrawerOpen ? "grid-cols-2 gap-3 mb-4" : "grid-cols-1 md:grid-cols-2 gap-5 mb-5")}>
                                        {/* Write Prompt Card */}
                                        <div
                                            onClick={() => setInputMethod('text')}
                                            className={classNames(
                                                "cursor-pointer transition-all duration-300 flex items-center border bg-white",
                                                isDrawerOpen ? "p-3 gap-3 rounded-[16px]" : "p-5 gap-5 rounded-[24px]",
                                                inputMethod === 'text'
                                                    ? "border-brand-500 shadow-sm"
                                                    : "border-slate-200 hover:border-slate-300"
                                            )}
                                        >
                                            <div className={classNames(
                                                "flex items-center justify-center shrink-0",
                                                isDrawerOpen ? "w-12 h-12 rounded-xl" : "w-16 h-16 rounded-2xl",
                                                inputMethod === 'text' ? "bg-brand-100/60 text-brand-600" : "bg-slate-50 text-slate-500"
                                            )}>
                                                <Type size={isDrawerOpen ? 22 : 28} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h3 className={classNames("font-bold truncate", isDrawerOpen ? "text-[15px] mb-0" : "text-[17px] mb-1", inputMethod === 'text' ? "text-brand-600" : "text-slate-900")}>{t('lc.up.write_prompt')}</h3>
                                                {!isDrawerOpen && <p className="text-[13px] text-slate-500 leading-snug">{t('lc.up.write_prompt_desc')}</p>}
                                            </div>
                                            <div className={classNames(
                                                "rounded-full flex items-center justify-center shrink-0 transition-colors shadow-sm",
                                                isDrawerOpen ? "w-7 h-7" : "w-9 h-9",
                                                inputMethod === 'text' ? "bg-brand-600 text-white" : "bg-slate-400 text-white"
                                            )}>
                                                <ArrowRight size={isDrawerOpen ? 14 : 16} />
                                            </div>
                                        </div>

                                        {/* Upload File Card */}
                                        <div
                                            onClick={() => setInputMethod('file')}
                                            className={classNames(
                                                "cursor-pointer transition-all duration-300 flex items-center border bg-white",
                                                isDrawerOpen ? "p-3 gap-3 rounded-[16px]" : "p-5 gap-5 rounded-[24px]",
                                                inputMethod === 'file'
                                                    ? "border-brand-500 shadow-sm"
                                                    : "border-slate-200 hover:border-slate-300"
                                            )}
                                        >
                                            <div className={classNames(
                                                "flex items-center justify-center shrink-0",
                                                isDrawerOpen ? "w-12 h-12 rounded-xl" : "w-16 h-16 rounded-2xl",
                                                inputMethod === 'file' ? "bg-brand-100/60 text-brand-600" : "bg-slate-50 text-slate-500"
                                            )}>
                                                <UploadCloud size={isDrawerOpen ? 22 : 28} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h3 className={classNames("font-bold truncate", isDrawerOpen ? "text-[15px] mb-0" : "text-[17px] mb-1", inputMethod === 'file' ? "text-brand-600" : "text-slate-900")}>{t('lc.up.upload_file')}</h3>
                                                {!isDrawerOpen && <p className="text-[13px] text-slate-500 leading-snug">{t('lc.up.upload_file_desc')}</p>}
                                            </div>
                                            <div className={classNames(
                                                "rounded-full flex items-center justify-center shrink-0 transition-colors shadow-sm",
                                                isDrawerOpen ? "w-7 h-7" : "w-9 h-9",
                                                inputMethod === 'file' ? "bg-brand-600 text-white" : "bg-slate-400 text-white"
                                            )}>
                                                <ArrowRight size={isDrawerOpen ? 14 : 16} />
                                            </div>
                                        </div>
                                    </div>

                                    {inputMethod === 'text' ? (
                                        <>
                                            <div className="border border-slate-200/90 rounded-[24px] p-5 md:p-6 bg-white flex flex-col flex-1 min-h-[460px] shadow-2xs">
                                                {/* Clean Single-Row Selection Bar */}
                                                <div className="bg-slate-50/80 border border-slate-200/80 rounded-2xl p-3.5 md:p-4 mb-4 shadow-2xs max-w-full">
                                                    <div className="flex flex-wrap items-center gap-x-5 gap-y-3 max-w-full">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-[13px] font-bold text-slate-700 whitespace-nowrap">
                                                                Semester <span className="text-rose-500">*</span>
                                                            </span>
                                                            <div className="relative">
                                                                <CustomDropdown
                                                                    value={selectedSemester}
                                                                    onChange={(val) => {
                                                                        setSelectedSemester(val);
                                                                        setSubjectCode('');
                                                                        setSelectedClasses([]);
                                                                        setMetadata({ ...metadata, subject: '' });
                                                                        setValidationErrors(prev => ({ ...prev, semester: undefined }));
                                                                    }}
                                                                    options={semesters.map((s: any) => ({ value: s.id, label: getSemesterLabel(s) }))}
                                                                    placeholder={t('lc.up.select_semester')}
                                                                    className="w-48 md:w-52"
                                                                    icon={<Calendar size={15} />}
                                                                    hasError={!!validationErrors.semester}
                                                                />
                                                                {validationErrors.semester && (
                                                                    <div className="absolute top-[110%] left-0 flex items-center gap-1.5 text-[11px] text-rose-600 font-bold bg-rose-50 px-2 py-1 rounded-lg border border-rose-200 shadow-xs whitespace-nowrap z-20 animate-in fade-in slide-in-from-top-1">
                                                                        <Info size={13} className="shrink-0" />
                                                                        {validationErrors.semester}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>

                                                        <div className="flex items-center gap-2">
                                                            <span className="text-[13px] font-bold text-slate-700 whitespace-nowrap">
                                                                Subject code <span className="text-rose-500">*</span>
                                                            </span>
                                                            <div className="relative">
                                                                <CustomDropdown
                                                                    value={subjectCode}
                                                                    onChange={(val) => {
                                                                        setSubjectCode(val);
                                                                        setSelectedClasses([]);
                                                                        setMetadata({ ...metadata, subject: val });
                                                                        setValidationErrors(prev => ({ ...prev, subjectCode: undefined }));
                                                                    }}
                                                                    options={availableSubjectsForInput as string[]}
                                                                    placeholder={t('lc.up.select_subject')}
                                                                    className="w-40 md:w-44"
                                                                    icon={<BookOpen size={15} />}
                                                                    hasError={!!validationErrors.subjectCode}
                                                                />
                                                                {validationErrors.subjectCode && (
                                                                    <div className="absolute top-[110%] left-0 flex items-center gap-1.5 text-[11px] text-rose-600 font-bold bg-rose-50 px-2 py-1 rounded-lg border border-rose-200 shadow-xs whitespace-nowrap z-20 animate-in fade-in slide-in-from-top-1">
                                                                        <Info size={13} className="shrink-0" />
                                                                        {validationErrors.subjectCode}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>

                                                        <div className="flex items-center gap-2">
                                                            <span className="text-[13px] font-bold text-slate-700 whitespace-nowrap">
                                                                Assignment type <span className="text-rose-500">*</span>
                                                            </span>
                                                            <div className="relative">
                                                                <CustomDropdown
                                                                    value={selectedAssignmentType}
                                                                    onChange={(val) => {
                                                                        setSelectedAssignmentType(val);
                                                                        setMetadata((prev: any) => ({ ...prev, category: val }));
                                                                        setValidationErrors(prev => ({ ...prev, assignmentType: undefined }));
                                                                    }}
                                                                    options={availableAssignmentTypes}
                                                                    placeholder={subjectCode ? t('lc.up.select_type') : t('lc.up.select_subject_first')}
                                                                    className="w-44 md:w-48"
                                                                    icon={<Bookmark size={15} />}
                                                                    hasError={!!validationErrors.assignmentType}
                                                                />
                                                                {validationErrors.assignmentType && (
                                                                    <div className="absolute top-[110%] left-0 flex items-center gap-1.5 text-[11px] text-rose-600 font-bold bg-rose-50 px-2 py-1 rounded-lg border border-rose-200 shadow-xs whitespace-nowrap z-20 animate-in fade-in slide-in-from-top-1">
                                                                        <Info size={13} className="shrink-0" />
                                                                        {validationErrors.assignmentType}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex items-center justify-between gap-3 mb-3">
                                                    <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                                                        Describe the assignment
                                                        <Info size={15} className="text-slate-400" />
                                                    </div>
                                                    <button
                                                        onClick={() => setIsDrawerOpen(true)}
                                                        className="flex items-center justify-center gap-2 px-3.5 py-1.5 bg-brand-50 text-brand-600 hover:bg-brand-100/80 rounded-xl text-xs font-bold transition-all border border-brand-200/50 shadow-2xs whitespace-nowrap"
                                                    >
                                                        <Lightbulb size={15} /> Prompt suggestions
                                                    </button>
                                                </div>


                                                <div className="relative flex-1 flex flex-col rounded-2xl border border-slate-200/90 bg-white shadow-2xs focus-within:border-brand-500 focus-within:ring-4 focus-within:ring-brand-500/10 transition-all">
                                                    <textarea
                                                        className="w-full flex-1 bg-transparent p-4 pb-10 text-slate-800 placeholder-slate-400 outline-none resize-none text-[14.5px] leading-relaxed rounded-2xl"
                                                        placeholder={t('lc.up.prompt_placeholder')}
                                                        value={textPrompt}
                                                        onChange={(e) => setTextPrompt(e.target.value)}
                                                    />
                                                    <div className="absolute bottom-3 right-4 text-xs font-semibold text-slate-400 pointer-events-none">
                                                        {textPrompt.length}/2000
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="mt-5 flex justify-end shrink-0">
                                                <button
                                                    onClick={handleGenerateContent}
                                                    disabled={!textPrompt || textPrompt.length === 0}
                                                    className="flex items-center gap-2.5 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-7 py-3 rounded-xl font-bold shadow-sm hover:shadow-md transition-all text-sm"
                                                >
                                                    <Sparkles size={16} /> Generate content <ArrowRight size={16} />
                                                </button>
                                            </div>
                                        </>
                                    ) : (
                                        <div className="border border-slate-200/90 rounded-[24px] p-5 md:p-6 bg-white flex flex-col flex-1 min-h-[460px] shadow-2xs">
                                            {/* Clean Single-Row Selection Bar for File Upload */}
                                            <div className="bg-slate-50/80 border border-slate-200/80 rounded-2xl p-3.5 md:p-4 mb-6 shadow-2xs max-w-full">
                                                <div className="flex flex-wrap items-center gap-x-5 gap-y-3 max-w-full">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[13px] font-bold text-slate-700 whitespace-nowrap">
                                                            Semester <span className="text-rose-500">*</span>
                                                        </span>
                                                        <div className="relative">
                                                            <CustomDropdown
                                                                value={selectedSemester}
                                                                onChange={(val) => {
                                                                    setSelectedSemester(val);
                                                                    setSubjectCode('');
                                                                    setSelectedClasses([]);
                                                                    setMetadata({ ...metadata, subject: '' });
                                                                    setValidationErrors(prev => ({ ...prev, semester: undefined }));
                                                                }}
                                                                options={semesters.map((s: any) => ({ value: s.id, label: getSemesterLabel(s) }))}
                                                                placeholder={t('lc.up.select_semester')}
                                                                className="w-48 md:w-52"
                                                                icon={<Calendar size={15} />}
                                                                hasError={!!validationErrors.semester}
                                                            />
                                                            {validationErrors.semester && (
                                                                <div className="absolute top-[110%] left-0 flex items-center gap-1.5 text-[11px] text-rose-600 font-bold bg-rose-50 px-2 py-1 rounded-lg border border-rose-200 shadow-xs whitespace-nowrap z-20 animate-in fade-in slide-in-from-top-1">
                                                                    <Info size={13} className="shrink-0" />
                                                                    {validationErrors.semester}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[13px] font-bold text-slate-700 whitespace-nowrap">
                                                            Subject code <span className="text-rose-500">*</span>
                                                        </span>
                                                        <div className="relative">
                                                            <CustomDropdown
                                                                value={subjectCode}
                                                                onChange={(val) => {
                                                                    setSubjectCode(val);
                                                                    setSelectedClasses([]);
                                                                    setMetadata({ ...metadata, subject: val });
                                                                    setValidationErrors(prev => ({ ...prev, subjectCode: undefined }));
                                                                }}
                                                                options={availableSubjectsForInput as string[]}
                                                                placeholder={t('lc.up.select_subject')}
                                                                className="w-40 md:w-44"
                                                                icon={<BookOpen size={15} />}
                                                                hasError={!!validationErrors.subjectCode}
                                                            />
                                                            {validationErrors.subjectCode && (
                                                                <div className="absolute top-[110%] left-0 flex items-center gap-1.5 text-[11px] text-rose-600 font-bold bg-rose-50 px-2 py-1 rounded-lg border border-rose-200 shadow-xs whitespace-nowrap z-20 animate-in fade-in slide-in-from-top-1">
                                                                    <Info size={13} className="shrink-0" />
                                                                    {validationErrors.subjectCode}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[13px] font-bold text-slate-700 whitespace-nowrap">
                                                            Assignment type <span className="text-rose-500">*</span>
                                                        </span>
                                                        <div className="relative">
                                                            <CustomDropdown
                                                                value={selectedAssignmentType}
                                                                onChange={(val) => {
                                                                    setSelectedAssignmentType(val);
                                                                    setMetadata((prev: any) => ({ ...prev, category: val }));
                                                                    setValidationErrors(prev => ({ ...prev, assignmentType: undefined }));
                                                                }}
                                                                options={availableAssignmentTypes}
                                                                placeholder={subjectCode ? t('lc.up.select_type') : t('lc.up.select_subject_first')}
                                                                className="w-44 md:w-48"
                                                                icon={<Bookmark size={15} />}
                                                                hasError={!!validationErrors.assignmentType}
                                                            />
                                                            {validationErrors.assignmentType && (
                                                                <div className="absolute top-[110%] left-0 flex items-center gap-1.5 text-[11px] text-rose-600 font-bold bg-rose-50 px-2 py-1 rounded-lg border border-rose-200 shadow-xs whitespace-nowrap z-20 animate-in fade-in slide-in-from-top-1">
                                                                    <Info size={13} className="shrink-0" />
                                                                    {validationErrors.assignmentType}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex-1 flex items-center justify-center border border-slate-200/90 border-dashed rounded-2xl bg-slate-50/50 p-6">
                                                <div className="w-full max-w-xl">
                                                    <FileUpload onUpload={handleFileUpload} accept=".pdf,.docx,.doc,.sql,.zip,.txt" errorMessage={t('lc.up.supported_formats')} />
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                </div>
                            )}

                            {/* STEP 2: EDIT CONTENT */}
                            {step === 2 && (
                                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 flex flex-col flex-1">
                                    <div className="flex justify-between items-center mb-4">
                                        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                                            <Edit3 className="text-brand-600" /> Refine assignment content
                                        </h2>
                                    </div>
                                    <div className="flex-1 min-h-[650px] h-[calc(100vh-280px)]">
                                        <div className="flex flex-col h-full bg-white border border-slate-200 rounded-2xl text-slate-900 overflow-hidden shadow-sm">
                                            <div className="flex-grow overflow-y-auto prose prose-slate max-w-none prose-h1:text-3xl prose-h1:font-bold prose-h1:mb-4 prose-h2:text-2xl prose-h2:mt-6 prose-h2:mb-3 prose-p:my-2 prose-ul:my-2 p-6">
                                                <Editor
                                                    value={content}
                                                    onChange={(e) => setContent(e.target.value)}
                                                    containerProps={{ style: { height: '100%' } }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="mt-6 flex justify-between">
                                        <button onClick={() => { aiGenerationStore.reset(); setStep(1); }} className="text-slate-500 hover:text-slate-800 font-medium px-6 py-3 border border-slate-200 rounded-xl bg-white shadow-sm">{t('lc.up.back')}</button>
                                        <button
                                            onClick={handleParseRubric}
                                            className="bg-brand-600 hover:bg-brand-700 text-white px-8 py-3 rounded-xl font-bold shadow-md transition-all"
                                        >
                                            Generate scoring rubric
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* STEP 3: EDIT RUBRIC */}
                            {step === 3 && rubric && (
                                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 text-slate-900">
                                    <div className="mb-6">
                                        <h2 className="text-xl font-bold text-slate-900 mb-2">{t('lc.up.review_title')}</h2>
                                        <p className="text-slate-500 text-sm mb-4">
                                            Edit titles, descriptions, and scores. Ensure the total score adds up to <strong className="text-slate-900">10 points</strong>.
                                        </p>

                                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-slate-50/80 p-5 rounded-2xl border border-slate-200/90 shadow-2xs mb-5">
                                            <div className="col-span-1">
                                                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">{t('lc.up.subject_code')}</label>
                                                <CustomDropdown
                                                    value={metadata.subject || ''}
                                                    onChange={(v) => {
                                                        setMetadata({ ...metadata, subject: v });
                                                        setSelectedClasses([]); // Reset classes when subject changes
                                                    }}
                                                    options={teacherSubjects}
                                                    className="w-full"
                                                    placeholder={t('lc.up.select_a_subject')}
                                                    icon={<BookOpen size={15} />}
                                                    disabled={isReviewStep}
                                                />
                                            </div>
                                            <div className="col-span-1">
                                                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">{t('lc.up.assignment_type')}</label>
                                                <CustomDropdown
                                                    value={selectedAssignmentType || metadata.category || ''}
                                                    onChange={(v) => {
                                                        setSelectedAssignmentType(v);
                                                        setMetadata((prev: any) => ({ ...prev, category: v }));
                                                    }}
                                                    options={availableAssignmentTypes.length > 0 ? availableAssignmentTypes : ['Assignment', 'Lab']}
                                                    className="w-full"
                                                    placeholder={t('lc.up.select_type')}
                                                    icon={<Bookmark size={15} />}
                                                    disabled={isReviewStep}
                                                />
                                            </div>
                                            <div className="col-span-1">
                                                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">{t('lc.up.assignment_title')}</label>
                                                <input
                                                    disabled={isReviewStep}
                                                    className={classNames(
                                                        "w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-800 text-sm font-semibold outline-none shadow-2xs transition-all",
                                                        isReviewStep
                                                            ? 'bg-slate-100 text-slate-500 cursor-not-allowed border-slate-200'
                                                            : 'focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10'
                                                    )}
                                                    value={metadata.title}
                                                    onChange={(e) => setMetadata({ ...metadata, title: e.target.value })}
                                                />
                                            </div>
                                            <div className="col-span-1">
                                                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">{t('lc.up.project_type')}</label>
                                                <select
                                                    disabled={isReviewStep}
                                                    className={classNames(
                                                        "w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-800 text-sm font-semibold outline-none shadow-2xs transition-all",
                                                        isReviewStep
                                                            ? 'bg-slate-100 text-slate-500 cursor-not-allowed border-slate-200'
                                                            : 'focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 cursor-pointer'
                                                    )}
                                                    value={metadata.projectType}
                                                    onChange={(e) => setMetadata({ ...metadata, projectType: e.target.value })}
                                                >
                                                    <option value="backend">Backend</option>
                                                    <option value="frontend">Frontend</option>
                                                    <option value="fullstack">Fullstack</option>
                                                    <option value="mobile">Mobile</option>
                                                    <option value="desktop">Desktop</option>
                                                    <option value="algorithm">Algorithm</option>
                                                    <option value="database">Database (SQL)</option>
                                                    <option value="unity">Unity / Game</option>
                                                </select>
                                            </div>
                                        </div>

                                        {/* SQL Answer Key / Reference Solution Upload Section */}
                                        {(metadata.projectType === 'database' || selectedAssignmentType === 'database' || metadata.subject?.toUpperCase().includes('DBI') || subjectCode?.toUpperCase().includes('DBI') || selectedAssignmentType?.toUpperCase().includes('SQL') || rubric?.rules?.some((r: any) => r.scoringStrategy === 'SqlExecutionProbe')) && (
                                            <div className="bg-emerald-50/70 border border-emerald-200/90 p-5 rounded-2xl mb-6 shadow-2xs">
                                                <div className="flex items-center justify-between mb-3">
                                                    <div className="flex items-center gap-2.5">
                                                        <div className="p-2.5 bg-emerald-600 text-white rounded-xl shadow-xs">
                                                            <Database size={20} />
                                                        </div>
                                                        <div>
                                                            <h3 className="font-bold text-slate-900 text-[15px] flex items-center gap-2">
                                                                SQL Answer Key & Setup Script <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-200/80 text-emerald-800 font-semibold">{t('lc.up.optional_recommended')}</span>
                                                            </h3>
                                                            <p className="text-slate-500 text-xs mt-0.5">{t('lc.up.sql_desc')}</p>
                                                        </div>
                                                    </div>
                                                    {answerKeyText && (
                                                        <button
                                                            onClick={() => setShowAnswerKeyEditor(!showAnswerKeyEditor)}
                                                            className="px-3.5 py-1.5 bg-white border border-emerald-300 text-emerald-700 hover:bg-emerald-100/50 font-semibold text-xs rounded-lg transition-colors flex items-center gap-1.5 shadow-2xs"
                                                        >
                                                            <Code size={14} /> {showAnswerKeyEditor ? t('lc.up.hide_sql_editor') : t('lc.up.view_edit_sql')}
                                                        </button>
                                                    )}
                                                </div>

                                                {answerKeyFile || answerKeyText ? (
                                                    <div className="bg-white p-4 rounded-xl border border-emerald-200 flex flex-col gap-3">
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs uppercase shadow-2xs">
                                                                    {answerKeyFile?.name.split('.').pop() || 'SQL'}
                                                                </div>
                                                                <div>
                                                                    <div className="font-bold text-slate-800 text-sm flex items-center gap-2">
                                                                        {answerKeyFile?.name || 'SQL answer key file loaded'}
                                                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-800">
                                                                            <CheckCircle size={12} className="mr-1" /> Ready for DB Probe
                                                                        </span>
                                                                    </div>
                                                                    <div className="text-xs text-slate-500 mt-0.5">
                                                                        {answerKeyText ? t('lc.up.sql_lines', { n: answerKeyText.split('\n').length }) : t('lc.up.loaded_into_config')}
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            <div className="flex items-center gap-2">
                                                                <label className={classNames(
                                                                    "cursor-pointer px-3 py-1.5 font-semibold text-xs rounded-lg transition-colors flex items-center gap-1.5",
                                                                    isUploadingAnswerKey ? "bg-emerald-600 text-white animate-pulse cursor-wait ring-2 ring-emerald-300 ring-offset-1" : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                                                                )}>
                                                                    {isUploadingAnswerKey ? (
                                                                        <Loader2 size={14} className="animate-spin" />
                                                                    ) : (
                                                                        <Upload size={14} />
                                                                    )}
                                                                    {isUploadingAnswerKey ? t('lc.up.analyzing') : t('lc.up.replace_answer_key')}
                                                                    <input
                                                                        type="file"
                                                                        accept=".sql,.zip,.docx,.txt"
                                                                        className="hidden"
                                                                        disabled={isUploadingAnswerKey}
                                                                        onChange={(e) => {
                                                                            if (e.target.files?.[0]) handleAnswerKeyUpload(e.target.files[0]);
                                                                        }}
                                                                    />
                                                                </label>
                                                            </div>
                                                        </div>

                                                        {showAnswerKeyEditor && (
                                                            <div className="mt-2 pt-3 border-t border-slate-100">
                                                                <label className="block text-xs font-bold text-slate-700 mb-1.5">{t('lc.up.sql_content_label')}</label>
                                                                <textarea
                                                                    className="w-full h-48 bg-slate-900 text-emerald-400 font-mono text-xs p-3 rounded-lg border border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                                                    value={answerKeyText}
                                                                    onChange={(e) => {
                                                                        const newText = e.target.value;
                                                                        setAnswerKeyText(newText);
                                                                        if (rubric?.rules) {
                                                                            const updatedRules = rubric.rules.map((rule: any) => {
                                                                                if (rule.scoringStrategy === 'SqlExecutionProbe' && rule.requiredEvidence?.[0]?.sqlProbe) {
                                                                                    return {
                                                                                        ...rule,
                                                                                        requiredEvidence: [{
                                                                                            ...rule.requiredEvidence[0],
                                                                                            sqlProbe: {
                                                                                                ...rule.requiredEvidence[0].sqlProbe,
                                                                                                setupScript: newText
                                                                                            }
                                                                                        }]
                                                                                    };
                                                                                }
                                                                                return rule;
                                                                            });
                                                                            setRubric({ ...rubric, rules: updatedRules });
                                                                        }
                                                                    }}
                                                                />
                                                            </div>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <div className="bg-white p-4 rounded-xl border border-dashed border-emerald-300 flex items-center justify-center">
                                                        <label className="cursor-pointer flex flex-col items-center gap-2 py-3 px-6 text-center">
                                                            <UploadCloud size={24} className={classNames("text-emerald-600", isUploadingAnswerKey ? "animate-spin" : "animate-bounce")} />
                                                            <span className="text-sm font-bold text-slate-700">
                                                                {isUploadingAnswerKey ? t('lc.up.reading_analyzing') : t('lc.up.upload_reference')}
                                                            </span>
                                                            <span className="text-xs text-slate-400">{t('lc.up.sql_autoload_note')}</span>
                                                            <input
                                                                type="file"
                                                                accept=".sql,.zip,.docx,.txt"
                                                                className="hidden"
                                                                disabled={isUploadingAnswerKey}
                                                                onChange={(e) => {
                                                                    if (e.target.files?.[0]) handleAnswerKeyUpload(e.target.files[0]);
                                                                }}
                                                            />
                                                        </label>
                                                    </div>
                                                )}
                                            </div>
                                        )}





                                        <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 shadow-sm mb-8">
                                            <div className="grid grid-cols-4 gap-6">
                                                <div className="col-span-1 border-r border-slate-200 pr-6">
                                                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">{t('lc.up.semester')}</label>
                                                    <CustomDropdown
                                                        value={selectedSemester}
                                                        onChange={(val) => setSelectedSemester(val)}
                                                        options={semesters.map((s: any) => ({ value: s.id, label: getSemesterLabel(s) }))}
                                                        placeholder={t('lc.up.select_a_semester')}
                                                        className="w-full"
                                                        disabled={isReviewStep}
                                                    />
                                                </div>
                                                <div className="col-span-2 border-r border-slate-200 pr-6">
                                                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">{t('lc.up.assign_classes')} <span className="text-rose-500">*</span></label>
                                                    <div className="flex flex-wrap gap-2">
                                                        {(() => {
                                                            const availableClasses = allClasses.filter((c: any) => c.semester?.id === selectedSemester && c.subject?.code === metadata.subject);
                                                            if (!metadata.subject) return <div className="text-sm text-slate-500 mt-2 italic">{t('lc.up.pick_subject_first')}</div>;
                                                            if (availableClasses.length === 0) return <div className="text-sm text-slate-500 mt-2 italic">{t('lc.up.no_classes')}</div>;
                                                            return availableClasses.map((c: any) => (
                                                                <button
                                                                    key={c.id}
                                                                    type="button"
                                                                    onClick={() => {
                                                                        setSelectedClasses(prev => prev.includes(c.id) ? prev.filter(id => id !== c.id) : [...prev, c.id]);
                                                                        if (validationErrors.classes) setValidationErrors({ ...validationErrors, classes: undefined });
                                                                    }}
                                                                    className={classNames(
                                                                        "px-4 py-2 rounded-lg text-sm font-bold border transition-all duration-200",
                                                                        selectedClasses.includes(c.id)
                                                                            ? "bg-brand-600 text-white border-brand-600 shadow-md ring-2 ring-brand-100 ring-offset-1"
                                                                            : "bg-white text-slate-600 border-slate-200 hover:border-brand-300 hover:text-brand-600 hover:bg-brand-50/50"
                                                                    )}
                                                                >
                                                                    {c.code || c.name || 'N/A'}
                                                                </button>
                                                            ));
                                                        })()}
                                                    </div>
                                                    {validationErrors.classes && (
                                                        <div className="text-rose-500 text-[11px] font-semibold mt-2 flex items-center gap-1">
                                                            <AlertCircle size={12} /> {validationErrors.classes}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="col-span-1">
                                                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">{t('lc.up.due_date')} <span className="text-rose-500">*</span></label>
                                                    <DateTimePicker
                                                        value={metadata.dueDate || ''}
                                                        onChange={(val) => {
                                                            setMetadata({ ...metadata, dueDate: val });
                                                            if (validationErrors.dueDate) {
                                                                setValidationErrors({ ...validationErrors, dueDate: undefined });
                                                                setError(null);
                                                            }
                                                        }}
                                                        error={!!validationErrors.dueDate}
                                                    />
                                                    {validationErrors.dueDate && (
                                                        <div className="text-rose-500 text-[11px] font-semibold mt-1 flex items-center gap-1">
                                                            <AlertCircle size={12} /> {validationErrors.dueDate}
                                                        </div>
                                                    )}
                                                </div>
                                                {/* Late Submission Policy */}
                                                <div className="col-span-4 mt-2 pt-4 border-t border-slate-200">
                                                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
                                                        {t('lc.up.late_submission_policy') || 'Quy tắc nộp trễ (Late Submission Policy)'}
                                                    </label>
                                                    <div className="flex items-center gap-2">
                                                        <select
                                                            value={metadata.allowLateSubmission === false ? 'NONE' : (metadata.latePenaltyType || 'NONE')}
                                                            disabled={metadata.allowLateSubmission === false}
                                                            onChange={(e) => {
                                                                const newType = e.target.value
                                                                const val = (metadata.latePenaltyValue !== undefined && metadata.latePenaltyValue !== null && metadata.latePenaltyValue !== 0) ? metadata.latePenaltyValue : 2
                                                                setMetadata({ ...metadata, latePenaltyType: newType, latePenaltyValue: newType === 'NONE' ? 0 : val })
                                                            }}
                                                            className={`flex-1 px-3 py-2 border rounded-lg text-xs font-semibold shadow-xs focus:outline-none transition-all ${metadata.allowLateSubmission === false
                                                                ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                                                                : 'bg-white border-slate-200 text-slate-700 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 cursor-pointer'
                                                                }`}
                                                        >
                                                            <option value="NONE">{t('lc.up.no_late_penalty') || 'Không phạt trễ (No late penalty)'}</option>
                                                            <option value="DAILY_POINTS">{t('lc.up.deduct_by_day') || 'Trừ điểm theo ngày (-X điểm/24h)'}</option>
                                                            <option value="FLAT_POINTS">{t('lc.up.flat_deduction') || 'Trừ cố định (X điểm)'}</option>
                                                        </select>
                                                        {metadata.allowLateSubmission !== false && metadata.latePenaltyType && metadata.latePenaltyType !== 'NONE' && (
                                                            <div className="relative flex items-center shrink-0">
                                                                <input
                                                                    type="number"
                                                                    step="0.5"
                                                                    min="0"
                                                                    placeholder={t('lc.up.penalty_placeholder') || 'Mức phạt'}
                                                                    value={metadata.latePenaltyValue !== undefined && metadata.latePenaltyValue !== null ? metadata.latePenaltyValue : 2}
                                                                    onChange={(e) => setMetadata({ ...metadata, latePenaltyValue: Number(e.target.value) })}
                                                                    className="w-24 pl-3 pr-7 py-2 border border-slate-200 rounded-lg text-xs font-bold text-center text-rose-600 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all"
                                                                />
                                                                <span className="absolute right-2.5 text-[11px] font-bold text-slate-400 pointer-events-none">pts</span>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Checkbox: Allow Late Submission vs Lock at Deadline */}
                                                    <div className="mt-3 pt-2.5 border-t border-slate-100">
                                                        <label className="flex items-start gap-2.5 cursor-pointer group select-none">
                                                            <input
                                                                type="checkbox"
                                                                checked={metadata.allowLateSubmission !== false}
                                                                onChange={(e) => {
                                                                    const checked = e.target.checked
                                                                    setMetadata({
                                                                        ...metadata,
                                                                        allowLateSubmission: checked,
                                                                        latePenaltyType: checked ? (metadata.latePenaltyType && metadata.latePenaltyType !== 'NONE' ? metadata.latePenaltyType : 'DAILY_POINTS') : 'NONE',
                                                                        latePenaltyValue: checked ? (metadata.latePenaltyValue !== undefined && metadata.latePenaltyValue !== null && metadata.latePenaltyValue !== 0 ? metadata.latePenaltyValue : 2) : 0
                                                                    })
                                                                }}
                                                                className="mt-0.5 w-4 h-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500/20 cursor-pointer transition-all shrink-0"
                                                            />
                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex items-center gap-2 flex-wrap">
                                                                    <span className="text-xs font-bold text-slate-800 group-hover:text-brand-600 transition-colors">
                                                                        {t('lc.up.allow_late_label') || 'Cho phép nộp bài sau hạn nộp (áp dụng trừ điểm theo chính sách)'}
                                                                    </span>
                                                                    {metadata.allowLateSubmission !== false ? (
                                                                        <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-50 text-emerald-600 rounded-md border border-emerald-200">
                                                                            {t('lc.up.late_allowed_badge') || 'Cho phép nộp trễ'}
                                                                        </span>
                                                                    ) : (
                                                                        <span className="px-2 py-0.5 text-[10px] font-bold bg-rose-50 text-rose-600 rounded-md border border-rose-200">
                                                                            {t('lc.up.late_blocked_badge') || 'Chặn nộp sau hạn'}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <p className="text-[11px] font-medium text-slate-500 mt-1 leading-relaxed">
                                                                    {metadata.allowLateSubmission !== false
                                                                        ? (t('lc.up.late_allowed_note', { n: metadata.latePenaltyValue || 2 }) || `Sinh viên có thể nộp sau hạn (tự động trừ ${metadata.latePenaltyValue || 2} điểm theo chính sách).`)
                                                                        : (t('lc.up.lock_note') || 'Đến hạn nộp, hệ thống sẽ tự khoá và chặn hoàn toàn việc nộp bài của sinh viên.')}
                                                                </p>
                                                            </div>
                                                        </label>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className={classNames(
                                        "p-4 rounded-xl border flex items-center justify-between shadow-sm transition-all mb-6",
                                        isTotalScoreValid
                                            ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                                            : "bg-rose-50 border-rose-300 text-rose-900"
                                    )}>
                                        <div className="flex items-center gap-3">
                                            {isTotalScoreValid ? (
                                                <CheckCircle className="text-emerald-600 shrink-0" size={22} />
                                            ) : (
                                                <AlertCircle className="text-rose-600 shrink-0" size={22} />
                                            )}
                                            <div>
                                                <h4 className="font-extrabold text-sm">
                                                    {isTotalScoreValid ? "Rubric total score is valid (10.0 / 10.0 points)" : `TOTAL SCORE WARNING: ${currentTotalScore.toFixed(2)} / 10.0 points`}
                                                </h4>
                                                <p className="text-xs opacity-90 mt-0.5">
                                                    {isTotalScoreValid
                                                        ? t('lc.up.score_valid')
                                                        : `The system requires the sum of all criteria to be exactly 10.0. Current difference: ${Math.abs(currentTotalScore - 10).toFixed(2)} points.`}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="text-right shrink-0">
                                            <span className={classNames(
                                                "text-xl font-black px-3 py-1.5 rounded-lg border",
                                                isTotalScoreValid
                                                    ? "bg-emerald-100 border-emerald-300 text-emerald-800"
                                                    : "bg-rose-100 border-rose-300 text-rose-800 font-bold"
                                            )}>
                                                {currentTotalScore.toFixed(2)} / 10.0
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex gap-6 mb-8 items-start">
                                        <div className="grid gap-5 w-full">
                                            {rubric.rules.map((rule: any, index: number) => (
                                                <div key={index} className="bg-white border border-slate-200 p-6 rounded-xl shadow-[0_2px_10px_rgba(0,0,0,0.02)] flex flex-col gap-4">
                                                    <div className="flex gap-4">
                                                        <div className="flex-1">
                                                            <div className="flex items-center justify-between gap-2 mb-2">
                                                                <input
                                                                    className="w-full bg-transparent text-brand-600 font-extrabold border-b-2 border-transparent hover:border-slate-200 focus:border-brand-500 outline-none text-xl"
                                                                    value={rule.title}
                                                                    onChange={(e) => handleRuleChange(index, 'title', e.target.value)}
                                                                    placeholder={t('lc.up.rule_title_placeholder')}
                                                                />
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setEditingRuleIndex(editingRuleIndex === index ? null : index)}
                                                                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold text-slate-500 hover:text-brand-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors border border-slate-200 dark:border-slate-700 shrink-0"
                                                                >
                                                                    <Edit3 size={13} />
                                                                    <span>{editingRuleIndex === index ? t('lc.up.done') : t('lc.up.edit_text')}</span>
                                                                </button>
                                                            </div>

                                                            {editingRuleIndex === index ? (
                                                                <div className="space-y-2 my-2">
                                                                    <textarea
                                                                        ref={(el) => {
                                                                            if (el) {
                                                                                el.style.height = 'auto';
                                                                                el.style.height = el.scrollHeight + 'px';
                                                                            }
                                                                        }}
                                                                        className="w-full bg-slate-50 dark:bg-slate-900 border border-brand-300 dark:border-brand-700 rounded-lg p-3 text-slate-800 dark:text-slate-200 text-sm font-mono leading-relaxed outline-none focus:ring-2 focus:ring-brand-500/20"
                                                                        value={rule.description}
                                                                        onChange={(e) => {
                                                                            handleRuleChange(index, 'description', e.target.value);
                                                                            e.target.style.height = 'auto';
                                                                            e.target.style.height = e.target.scrollHeight + 'px';
                                                                        }}
                                                                        rows={4}
                                                                        placeholder={t('lc.up.rule_desc_placeholder')}
                                                                    />
                                                                    <div className="flex justify-end">
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => setEditingRuleIndex(null)}
                                                                            className="px-3 py-1 bg-brand-600 text-white rounded-lg text-xs font-bold hover:bg-brand-700"
                                                                        >
                                                                            Apply
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <div className="text-slate-700 dark:text-slate-300 text-sm leading-relaxed">
                                                                    <FormattedText text={rule.description} />
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="flex flex-col items-end gap-3 w-32 border-l border-slate-100 pl-4">
                                                            <div className="flex flex-col items-end gap-1">
                                                                <label className="text-xs font-bold text-slate-400 uppercase">{t('lc.up.score_label')}</label>
                                                                <input
                                                                    type="number"
                                                                    value={rule.weight}
                                                                    onChange={(e) => handleRuleChange(index, 'weight', e.target.value)}
                                                                    className="w-20 bg-slate-50 border border-slate-200 rounded-lg px-2 py-2 text-slate-900 font-black text-center text-lg focus:border-brand-500 outline-none shadow-inner"
                                                                />
                                                            </div>
                                                            <button
                                                                onClick={() => handleDeleteRule(index)}
                                                                className="text-xs text-rose-500 hover:text-rose-600 font-bold mt-2"
                                                            >
                                                                Delete criterion
                                                            </button>
                                                        </div>
                                                    </div>
                                                    <div className="flex gap-3 text-xs items-center pt-3 border-t border-slate-100">
                                                        <span className={classNames(
                                                            "px-3 py-1.5 rounded-lg border font-bold shadow-sm text-xs",
                                                            rule.scoringStrategy === 'AIVision'
                                                                ? 'bg-purple-50 text-purple-700 border-purple-200'
                                                                : rule.scoringStrategy === 'StdInOutProbe' || rule.scoringStrategy === 'HTTPProbe' || rule.scoringStrategy === 'SqlExecutionProbe'
                                                                    ? 'bg-sky-50 text-sky-700 border-sky-200'
                                                                    : rule.scoringStrategy === 'AICodeReview' || rule.scoringStrategy === 'AiTextAnalysis'
                                                                        ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                                                                        : rule.scoringStrategy === 'Manual'
                                                                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                                                                            : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                                        )}>
                                                            {rule.scoringStrategy === 'AIVision' ? 'Visual Check' : rule.scoringStrategy === 'StdInOutProbe' ? 'I/O Test' : rule.scoringStrategy === 'HTTPProbe' ? 'API Probe' : rule.scoringStrategy === 'SqlExecutionProbe' ? 'DB Execution' : rule.scoringStrategy === 'AICodeReview' ? 'Code Review' : rule.scoringStrategy === 'AiTextAnalysis' ? 'Text Analysis' : rule.scoringStrategy === 'HybridVisionAndCode' ? 'Hybrid AI & UI' : rule.scoringStrategy === 'Manual' ? 'Teacher Review' : 'Automated Test'}
                                                        </span>
                                                    </div>
                                                    {rule.scoringStrategy === 'StdInOutProbe' && rule.requiredEvidence?.[0]?.stdInOutProbe?.testCases && (
                                                        <div className="mt-4 pt-4 border-t border-slate-100 bg-slate-50 -mx-6 -mb-6 p-6 rounded-b-xl">
                                                            <h4 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                                                                <Type size={16} className="text-brand-600" /> Standard I/O test cases
                                                            </h4>
                                                            <div className="grid gap-4">
                                                                {rule.requiredEvidence[0].stdInOutProbe.testCases.map((tc: any, tcIdx: number) => (
                                                                    <div key={tc.id || tcIdx} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-3">
                                                                        <div className="flex gap-6">
                                                                            <div className="flex-1">
                                                                                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">{t('lc.up.stdin_label')}</label>
                                                                                <textarea
                                                                                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-slate-700 text-sm font-mono resize-none focus:border-brand-500 outline-none shadow-inner"
                                                                                    value={tc.input || ''}
                                                                                    onChange={(e) => handleTestCaseChange(index, tcIdx, 'input', e.target.value)}
                                                                                    rows={4}
                                                                                />
                                                                            </div>
                                                                            <div className="flex-1">
                                                                                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">{t('lc.up.stdout_label')}</label>
                                                                                <textarea
                                                                                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-slate-700 text-sm font-mono resize-none focus:border-brand-500 outline-none shadow-inner"
                                                                                    value={tc.expectedOutput || ''}
                                                                                    onChange={(e) => handleTestCaseChange(index, tcIdx, 'expectedOutput', e.target.value)}
                                                                                    rows={4}
                                                                                />
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                    {rule.scoringStrategy !== 'StdInOutProbe' && (
                                                        <div className="mt-3">
                                                            <RubricRuleSpecViewer rule={rule} />
                                                        </div>
                                                    )}
                                                </div>
                                            ))}

                                            <button
                                                className="w-full py-5 border-2 border-dashed border-slate-300 rounded-xl text-slate-500 font-bold hover:text-brand-600 hover:border-brand-400 hover:bg-brand-50 transition-colors"
                                                onClick={() => {
                                                    const updatedRubric = { ...rubric };
                                                    updatedRubric.rules.push({
                                                        id: `rule-custom-${Date.now()}`,
                                                        title: t('lc.up.new_rule_title'),
                                                        description: t('lc.up.new_rule_desc'),
                                                        category: "Functional",
                                                        weight: 5,
                                                        scoringStrategy: "Boolean",
                                                        requiredEvidence: []
                                                    });
                                                    setRubric(updatedRubric);
                                                }}
                                            >
                                                + Add custom rule
                                            </button>
                                        </div>
                                    </div>

                                    <div className="mt-8 flex justify-between border-t border-slate-200 pt-6">
                                        <button onClick={() => {
                                            if (inputMethod === 'file') {
                                                setStep(1);
                                            } else {
                                                setStep(2);
                                            }
                                        }} className="text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 font-bold px-6 py-3 rounded-xl shadow-sm">
                                            {inputMethod === 'file' ? t('lc.up.back_to_upload') : t('lc.up.back_to_edit')}
                                        </button>
                                        <button
                                            onClick={handlePublish}
                                            disabled={!isTotalScoreValid || isUploadingAnswerKey}
                                            className={classNames(
                                                "px-8 py-3.5 rounded-xl font-bold shadow-md flex items-center gap-2 transition-all",
                                                isUploadingAnswerKey
                                                    ? "bg-emerald-600 text-white cursor-wait opacity-80"
                                                    : isTotalScoreValid
                                                        ? "bg-brand-600 hover:bg-brand-700 text-white cursor-pointer"
                                                        : "bg-slate-300 text-slate-500 border border-slate-300 cursor-not-allowed opacity-70"
                                            )}
                                            title={!isTotalScoreValid ? t('lc.up.total_not_10', { value: currentTotalScore.toFixed(2) }) : (isUploadingAnswerKey ? t('lc.up.wait_answer_key') : undefined)}
                                        >
                                            {isUploadingAnswerKey ? <Loader2 size={20} className="animate-spin" /> : <CheckCircle size={20} />}
                                            {isUploadingAnswerKey ? t('lc.up.analyzing') : t('lc.up.publish')}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {error && (
                        <div className="fixed top-24 right-8 z-[100] animate-toast-in">
                            <div className="bg-white rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-rose-100 p-4 flex items-start gap-4 min-w-[320px]">
                                <div className="text-rose-500 shrink-0 mt-0.5 bg-rose-50 p-1.5 rounded-full">
                                    <Info size={20} />
                                </div>
                                <div className="flex-1">
                                    <h4 className="text-[15px] font-bold text-slate-900 leading-tight">{t('lc.up.missing_info')}</h4>
                                    <p className="text-sm text-slate-600 mt-1">{error}</p>
                                </div>
                                <button
                                    onClick={() => setError(null)}
                                    className="text-slate-400 hover:text-slate-600 transition-colors shrink-0 p-1 rounded-md hover:bg-slate-50"
                                >
                                    <X size={16} />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Context Panel */}
            {isDrawerOpen && (
                <div
                    className="bg-white border-l border-slate-200 shadow-[-4px_0_24px_-10px_rgba(0,0,0,0.1)] flex flex-col z-20 h-full animate-in slide-in-from-right font-sans shrink-0 relative"
                    style={{ width: `${drawerWidth}%`, transitionDuration: isDragging ? '0ms' : '300ms' }}
                >
                    {/* Resizer Handle */}
                    <div
                        className="absolute left-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-brand-500/50 active:bg-brand-500/80 z-30 transition-colors"
                        onMouseDown={(e) => {
                            e.preventDefault();
                            setIsDragging(true);
                        }}
                    />

                    {/* Header */}
                    <div className="flex items-center justify-between px-6 pt-6 pb-4 shrink-0">
                        <h2 className="text-[22px] font-black text-slate-900 tracking-tight">{t('lc.up.prompt_suggestions')}</h2>
                        <button onClick={() => setIsDrawerOpen(false)} className="text-slate-400 hover:text-slate-800 transition-colors p-1 rounded-full">
                            <X size={20} />
                        </button>
                    </div>

                    {/* Search */}
                    <div className="px-6 mb-5 shrink-0">
                        <div className="relative">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                            <input
                                type="text"
                                placeholder={t('lc.up.search_templates')}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-[13px] font-medium focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all shadow-sm placeholder:font-normal"
                            />
                        </div>
                    </div>



                    {/* Split Content */}
                    <div className="flex-1 flex border-t border-slate-100 min-h-0 overflow-hidden">
                        {/* LEFT COLUMN: Subjects */}
                        <div className="w-1/3 border-r border-slate-100 overflow-y-auto bg-white p-6 flex flex-col gap-4">
                            <h3 className="font-bold text-[18px] text-slate-900 mb-2">{t('lc.up.subject_categories')}</h3>
                            <div className="flex flex-col gap-3">
                                {teacherSubjects.map(subj => {
                                    const isSelected = subj === drawerSubjectCode;
                                    return (
                                        <button
                                            key={subj}
                                            onClick={() => {
                                                setDrawerSubjectCode(subj);
                                                setSubjectCode(subj);
                                                setMetadata((prev: any) => ({ ...prev, subject: subj }));
                                                setValidationErrors((prev: any) => ({ ...prev, subjectCode: undefined }));
                                            }}
                                            className={classNames(
                                                "w-full text-left px-4 py-2 rounded-full transition-all flex items-center justify-between border",
                                                isSelected
                                                    ? "bg-[#5CD289] border-[#5CD289] text-slate-900 font-bold shadow-sm"
                                                    : "bg-white border-slate-200 text-slate-700 hover:border-brand-300 font-medium"
                                            )}
                                        >
                                            <span className="text-[14px] font-semibold">{subj}</span>
                                            {isSelected && (
                                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-slate-900">
                                                    <polyline points="20 6 9 17 4 12"></polyline>
                                                </svg>
                                            )}
                                        </button>
                                    );
                                })}
                                {teacherSubjects.length === 0 && (
                                    <div className="text-slate-400 text-sm text-center py-4">
                                        No subjects
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* RIGHT COLUMN: Content */}
                        <div className="flex-1 overflow-y-auto bg-slate-50/50 p-6 relative">
                            <h3 className="font-bold text-[18px] text-slate-900 mb-4">{t('lc.up.suggested_content')}</h3>
                            {(() => {
                                const filtered = drawerPromptTemplates.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()));

                                if (filtered.length === 0) {
                                    return (
                                        <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 opacity-70">
                                            <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mb-3">
                                                <Search className="text-slate-400" size={24} />
                                            </div>
                                            <p className="text-slate-600 font-bold mb-1">{t('lc.up.no_templates')}</p>
                                            <p className="text-slate-400 text-xs">{t('lc.up.no_templates_hint')}</p>
                                        </div>
                                    );
                                }

                                return (
                                    <div className="flex flex-col gap-5">
                                        {filtered.map(prompt => (
                                            <div key={prompt.id} className="bg-white border border-slate-200 rounded-2xl p-5 hover:border-brand-300 transition-colors shadow-sm flex flex-col">
                                                <div className="flex justify-between items-start mb-3">
                                                    <span className="px-3 py-1 bg-slate-100 text-slate-700 text-sm font-bold rounded-full">
                                                        {drawerSubjectCode}
                                                    </span>
                                                    <span className="text-slate-500 text-xs font-bold uppercase tracking-wider">
                                                        {new Date().toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' }).toUpperCase()}
                                                    </span>
                                                </div>

                                                <h4 className="font-bold text-slate-900 text-[18px] mb-3 leading-snug">{prompt.name}</h4>

                                                <div className="flex-1 text-slate-600 text-[14px] leading-relaxed mb-4">
                                                    <div className="line-clamp-3">
                                                        {prompt.templateContent}
                                                    </div>
                                                </div>

                                                <div className="flex items-end justify-between mt-auto">
                                                    <div className="flex flex-col gap-1 text-[13px] text-slate-600 font-medium">
                                                        {/* Matching the layout placeholders from the design if needed */}
                                                        {prompt.category && <div>Type: {prompt.category}</div>}
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={() => {
                                                                setPreviewTemplateId(prompt.id);
                                                                setPreviewContent(prompt.templateContent);
                                                            }}
                                                            className="px-4 py-2.5 text-[13px] font-bold text-brand-600 bg-brand-50 hover:bg-brand-100 rounded-xl shadow-sm transition-colors shrink-0"
                                                        >
                                                            View details
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                setTextPrompt(prompt.templateContent);
                                                                if (drawerSubjectCode !== subjectCode) {
                                                                    setSubjectCode(drawerSubjectCode);
                                                                    setMetadata((prev: any) => ({ ...prev, subject: drawerSubjectCode }));
                                                                    setValidationErrors((prev: any) => ({ ...prev, subjectCode: undefined }));
                                                                }
                                                                mainApi.incrementPromptUsage(prompt.id).catch(console.error);
                                                                if (prompt.projectTypeId) {
                                                                    setMetadata((prev: any) => ({ ...prev, projectType: prompt.projectTypeId! }));
                                                                }
                                                                setIsDrawerOpen(false);
                                                            }}
                                                            className="px-6 py-2.5 text-[14px] font-bold text-white bg-brand-600 hover:bg-brand-700 rounded-xl shadow-sm transition-colors shrink-0"
                                                        >
                                                            Apply
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                );
                            })()}
                        </div>
                    </div>

                    {/* Footer Tip */}
                    <div className="bg-indigo-50/50 p-4 px-6 flex items-start gap-3 shrink-0 border-t border-indigo-100">
                        <Lightbulb size={16} className="text-brand-500 shrink-0 mt-0.5" />
                        <p className="text-indigo-800 text-[13px] font-medium leading-relaxed">
                            Tip: pick a suitable template and edit it to get a better prompt.
                        </p>
                    </div>
                </div>
            )}

            {/* Preview Dialog */}
            {previewTemplateId !== null && (() => {
                const tpl = drawerPromptTemplates.find(x => x.id === previewTemplateId) || promptTemplates.find(x => x.id === previewTemplateId);
                if (!tpl) return null;
                return (
                    <div className="fixed inset-0 z-[200] flex items-center justify-center font-sans p-4">
                        <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setPreviewTemplateId(null)}></div>
                        <div className="relative bg-white w-[650px] max-h-[85vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
                            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                                <div>
                                    <div className="flex gap-2 mb-1">
                                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-700">{subjectCode}</span>
                                        {tpl.category && <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-700">{tpl.category}</span>}
                                        {tpl.projectTypeId && <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-700">{tpl.projectTypeId}</span>}
                                    </div>
                                    <h2 className="text-xl font-bold text-slate-900">{tpl.name}</h2>
                                </div>
                                <button onClick={() => setPreviewTemplateId(null)} className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-200 text-slate-500 hover:bg-slate-300 hover:text-slate-800 transition-colors">
                                    <X size={18} />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
                                <div>
                                    <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                                        {t('lc.up.prompt_content_editable')}
                                    </h3>
                                    <textarea
                                        className="w-full h-64 bg-slate-50 p-4 rounded-xl border border-slate-200 text-slate-700 text-[14px] leading-relaxed resize-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none font-sans"
                                        value={previewContent}
                                        onChange={(e) => setPreviewContent(e.target.value)}
                                        placeholder={t('lc.up.edit_prompt_placeholder')}
                                    />
                                </div>
                            </div>

                            <div className="p-5 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-3">
                                <button onClick={() => setPreviewTemplateId(null)} className="px-5 py-2.5 rounded-xl font-bold text-slate-600 hover:bg-slate-200 transition-colors text-sm">
                                    {t('lc.up.close')}
                                </button>
                                <button
                                    onClick={() => {
                                        setTextPrompt(previewContent);
                                        if (drawerSubjectCode !== subjectCode) {
                                            setSubjectCode(drawerSubjectCode);
                                            setMetadata((prev: any) => ({ ...prev, subject: drawerSubjectCode }));
                                            setValidationErrors((prev: any) => ({ ...prev, subjectCode: undefined }));
                                        }
                                        mainApi.incrementPromptUsage(tpl.id).catch(console.error);
                                        if (tpl.projectTypeId) {
                                            setMetadata((prev: any) => ({ ...prev, projectType: tpl.projectTypeId! }));
                                        }
                                        setPreviewTemplateId(null);
                                        setIsDrawerOpen(false);
                                    }}
                                    className="px-6 py-2.5 rounded-xl font-bold text-white bg-brand-600 hover:bg-brand-700 shadow-sm transition-colors flex items-center gap-2 text-sm"
                                >
                                    {t('lc.up.use_template')} <ArrowRight size={16} />
                                </button>
                            </div>
                        </div>
                    </div>
                )
            })()}
        </div>
    );
}


function StepIndicator({ current, step, title }: { current: number, step: number, title: string }) {

    const isActive = current === step;

    return (
        <div className="flex items-center gap-3">
            <div className={classNames(
                "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors duration-300",
                isActive ? "bg-brand-600 text-white" : "bg-slate-200 text-slate-500"
            )}>
                {step}
            </div>
            <span className={classNames(
                "text-sm",
                isActive ? "text-brand-600 font-bold" : "text-slate-500 font-medium"
            )}>{title}</span>
        </div>
    );
}

