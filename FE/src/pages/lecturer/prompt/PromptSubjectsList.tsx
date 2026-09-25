import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '@/lib/api';
import { Search, ArrowRight, Bot, Sparkles, Folder } from 'lucide-react';

const ENGLISH_SUBJECT_DESCRIPTIONS: Record<string, string> = {
  CSD201: 'Core data structures and algorithms: linked list, stack, queue, tree, binary search tree, heap, hash table, and graph analysis.',
  DBI202: 'Relational database design and management: ERD modeling, Normalization, primary/foreign keys, SQL constraints, and query optimization.',
  PRJ301: 'Java Web Application development using Servlet, JSP, JSTL, MVC architecture, JDBC, Session, Cookie, and Filter handling.',
  PRM392: 'Android Mobile Programming using Java/Kotlin: Activity, Fragment, Intent, RecyclerView, Room Database, and REST API integration.',
  PRM393: 'Android Mobile Programming using Java/Kotlin: Activity, Fragment, Intent, RecyclerView, Room Database, and REST API integration.',
}

export function PromptSubjectsList() {
  const [subjects, setSubjects] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();
  const { t } = useTranslation();

  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        setIsLoading(true);
        const [me, classesData, allSubjectsData] = await Promise.all([
          api.me().catch(() => null),
          api.getClasses(1, 1000).catch(() => []),
          api.getSubjects(1, 1000).catch(() => [])
        ]);

        const allSubjects = Array.isArray(allSubjectsData) ? allSubjectsData : (allSubjectsData as any)?.data || [];
        const classes = Array.isArray(classesData) ? classesData : (classesData as any)?.data || [];

        let resultSubjects: any[] = [];

        if (me && me.role?.toLowerCase() === 'lecturer') {
          // Collect assigned subject IDs/codes from the lecturer's classes
          const assignedSubjectKeys = new Set<string>();
          classes.forEach((c: any) => {
            if (c.subjectId) assignedSubjectKeys.add(c.subjectId);
            if (c.subjectCode) assignedSubjectKeys.add(c.subjectCode);
            if (c.subject?.id) assignedSubjectKeys.add(c.subject.id);
            if (c.subject?.code) assignedSubjectKeys.add(c.subject.code);
          });

          if (assignedSubjectKeys.size > 0) {
            resultSubjects = allSubjects.filter((s: any) => 
              assignedSubjectKeys.has(s.id) || assignedSubjectKeys.has(s.code)
            );

            // Append any subject objects directly attached to classes if missing in allSubjects
            classes.forEach((c: any) => {
              const sub = c.subject;
              if (sub && (sub.id || sub.code)) {
                const exists = resultSubjects.some(rs => rs.id === sub.id || rs.code === sub.code);
                if (!exists) {
                  resultSubjects.push({
                    id: sub.id || sub.code,
                    code: sub.code,
                    name: sub.name || sub.code,
                    description: sub.description || t('lc.pr.no_description'),
                    semester: sub.semester
                  });
                }
              }
            });
          } else {
            resultSubjects = [];
          }
        } else {
          // ADMIN or fallback
          resultSubjects = allSubjects;
        }

        // Sort by Semester asc -> Code asc
        resultSubjects.sort((a, b) => {
          const semA = a.semester != null ? Number(String(a.semester).replace(/\D/g, '')) || 999 : 999;
          const semB = b.semester != null ? Number(String(b.semester).replace(/\D/g, '')) || 999 : 999;
          if (semA !== semB) return semA - semB;
          return (a.code || '').localeCompare(b.code || '', undefined, { numeric: true, sensitivity: 'base' });
        });

        setSubjects(resultSubjects);
      } catch (err) {
        console.error('Failed to load subjects:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchSubjects();
  }, []);

  const filteredSubjects = subjects.filter((s) =>
    s.code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center shrink-0">
            <Bot size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{t('lc.pr.title')}</h1>
            <p className="text-slate-500 text-sm">{t('lc.pr.subtitle')}</p>
          </div>
        </div>

        <div className="relative w-full md:w-72">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder={t('lc.pr.search')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-brand-500 focus:bg-white transition-all"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center p-12 bg-white rounded-2xl border border-slate-200">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-brand-600 border-t-transparent mb-4"></div>
          <p className="text-slate-500 font-medium">{t('lc.pr.loading')}</p>
        </div>
      ) : filteredSubjects.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 bg-white rounded-2xl border border-slate-200 text-center">
          <Folder size={48} className="text-slate-300 mb-3" />
          <h3 className="text-lg font-bold text-slate-800">{t('lc.pr.none_found')}</h3>
          <p className="text-slate-500 text-sm max-w-md mt-1">
            {searchQuery ? t('lc.pr.no_match') : t('lc.pr.none_assigned')}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredSubjects.map((subject) => (
            <div
              key={subject.id}
              onClick={() => navigate(`/lecturer/prompts/${subject.id}`)}
              className="group bg-white p-5 rounded-2xl border border-slate-200 hover:border-brand-300 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="px-3 py-1 bg-brand-50 text-brand-700 text-xs font-bold rounded-lg border border-brand-100">
                    {subject.code}
                  </span>
                  <Sparkles size={16} className="text-slate-300 group-hover:text-brand-500 transition-colors" />
                </div>
                <h3 className="font-bold text-slate-900 text-lg group-hover:text-brand-600 transition-colors line-clamp-1">
                  {subject.name}
                </h3>
                <p className="text-slate-500 text-sm mt-1 line-clamp-2 min-h-[40px]">
                  {ENGLISH_SUBJECT_DESCRIPTIONS[subject.code] || subject.description || t('lc.pr.no_description')}
                </p>
              </div>

              <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between text-sm font-semibold text-brand-600 group-hover:text-brand-700">
                <span>{t('lc.pr.manage')}</span>
                <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
