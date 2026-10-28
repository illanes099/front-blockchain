import React, { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Users,
  BookOpen,
  Calendar,
  Award,
  GraduationCap,
  Clock,
  ArrowRight,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  FileSpreadsheet,
  FileText,
  CalendarDays,
} from "lucide-react";
import { getMateriasUsername } from "../../api/api.materia";
import { getEstudiantes } from "../../api/api.estudiante";
import { getCalendarios } from "../../api/api.calendario";

export const InicioDocente = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [countCourses, setCountCourses] = useState([]);
  const [countEstudiantes, setCountEstudiantes] = useState(0);
  const [calendario, setCalendario] = useState([]);

  useEffect(() => {
    async function getValues() {
      try {
        setLoading(true);
        setError(null);

        const [resultCount, resulEstudiantesRaw, resultCalendario] =
          await Promise.all([
            getMateriasUsername().catch(() => []),
            getEstudiantes().catch(() => []),
            getCalendarios().catch(() => ({ data: [] })),
          ]);

        const username = localStorage.getItem("username") || "";

        // Filtrar materias por usuario activo
        const materiasProfesor = (resultCount || []).filter(
          (r) => r.username === username
        );
        setCountCourses(materiasProfesor);
        setCountEstudiantes((resulEstudiantesRaw || []).length);

        // Procesar eventos del calendario
        const ahora = new Date();
        const calData = resultCalendario.data || resultCalendario || [];

        const eventosFuturos = calData
          .filter((r) => {
            const fechaEvento = new Date(r.fecha);
            return fechaEvento >= ahora;
          })
          .map((c) => ({
            id: c.calendario_id,
            descripcion: c.descripcion || "",
            fecha: typeof c.fecha === "string" ? c.fecha.split("T")[0] : "",
          }))
          .sort((a, b) => a.fecha.localeCompare(b.fecha));

        setCalendario(eventosFuturos);
      } catch (err) {
        console.error("Error al cargar datos del panel docente:", err);
        setError("Ocurrió un inconveniente al cargar la información del panel.");
      } finally {
        setLoading(false);
      }
    }

    getValues();
  }, []);

  const hoyStr = useMemo(() => new Date().toISOString().split("T")[0], []);

  const eventoMasCercano = calendario[0] || null;

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#EEF3FC] via-[#E9F0FB] to-[#E3ECFA] flex items-center justify-center p-4 font-sans">
        <div className="flex items-center gap-3 bg-white border border-slate-200 px-6 py-4 rounded-xl shadow-lg">
          <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-slate-700 text-sm font-semibold">
            Cargando panel de control docente…
          </span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#EEF3FC] via-[#E9F0FB] to-[#E3ECFA] flex items-center justify-center p-4 font-sans">
        <div className="bg-white border-t-4 border-red-600 border-x border-b border-slate-200 p-6 rounded-xl max-w-md w-full shadow-2xl text-center">
          <AlertCircle className="text-red-600 mx-auto mb-3" size={36} />
          <h3 className="text-base font-bold text-slate-900 mb-1">Error de carga</h3>
          <p className="text-sm text-slate-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-5 py-2 rounded-md bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#EEF3FC] via-[#E9F0FB] to-[#E3ECFA] text-slate-800 p-3 xs:p-4 sm:p-6 md:p-10 font-sans">
      <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8">
        
        {/* BANNER ENCABEZADO DOCENTE */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="bg-gradient-to-r from-blue-700 via-blue-600 to-sky-600 text-white rounded-2xl p-6 sm:p-8 shadow-md relative overflow-hidden"
        >
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-blue-200 text-xs font-bold uppercase tracking-wider mb-2">
                <GraduationCap size={18} /> Panel de Control Docente
              </div>
              <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold tracking-tight">
                👋 Bienvenid@ al Portal Docente
              </h1>
              <p className="text-blue-100 text-xs sm:text-sm max-w-2xl mt-1.5 leading-relaxed">
                Gestiona tus asignaturas asignadas, realiza la carga trimestral de calificaciones y mantente al tanto de la agenda de eventos del colegio.
              </p>
            </div>

            <div className="bg-white/10 backdrop-blur-md border border-white/20 p-3.5 rounded-xl text-right shrink-0 hidden sm:block">
              <p className="text-[10px] uppercase font-semibold text-blue-200">Período Lectivo</p>
              <p className="text-lg font-bold text-white">{new Date().getFullYear()}</p>
              <p className="text-[11px] text-blue-100">
                {new Date().toLocaleDateString("es-BO", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                })}
              </p>
            </div>
          </div>
        </motion.div>

        {/* MÉTRICAS PRINCIPALES / KPIS */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-5"
        >
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-all">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] sm:text-xs uppercase tracking-wide text-blue-700 font-bold">Materias</span>
              <div className="w-8 h-8 rounded-lg bg-blue-200/80 flex items-center justify-center text-blue-800">
                <BookOpen size={16} />
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-extrabold text-slate-900">{countCourses.length}</p>
            <p className="text-[10px] text-blue-600 font-medium mt-1">Asignaturas a tu cargo</p>
          </div>

          <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 border border-emerald-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-all">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] sm:text-xs uppercase tracking-wide text-emerald-700 font-bold">Estudiantes</span>
              <div className="w-8 h-8 rounded-lg bg-emerald-200/80 flex items-center justify-center text-emerald-800">
                <Users size={16} />
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-extrabold text-slate-900">{countEstudiantes}</p>
            <p className="text-[10px] text-emerald-600 font-medium mt-1">Matriculados generales</p>
          </div>

          <div className="bg-gradient-to-br from-amber-50 to-amber-100 border border-amber-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-all">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] sm:text-xs uppercase tracking-wide text-amber-700 font-bold">Próx. Evento</span>
              <div className="w-8 h-8 rounded-lg bg-amber-200/80 flex items-center justify-center text-amber-800">
                <CalendarDays size={16} />
              </div>
            </div>
            <p className="text-xs sm:text-sm font-bold text-slate-900 truncate">
              {eventoMasCercano ? eventoMasCercano.descripcion : "Sin eventos próximos"}
            </p>
            <p className="text-[10px] text-amber-700 font-medium mt-1">
              {eventoMasCercano ? eventoMasCercano.fecha : "Agenda al día"}
            </p>
          </div>

          <div className="bg-gradient-to-br from-sky-50 to-sky-100 border border-sky-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-all">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] sm:text-xs uppercase tracking-wide text-sky-700 font-bold">Estado Carga</span>
              <div className="w-8 h-8 rounded-lg bg-sky-200/80 flex items-center justify-center text-sky-800">
                <CheckCircle2 size={16} />
              </div>
            </div>
            <p className="text-sm sm:text-base font-bold text-slate-900">Activo</p>
            <p className="text-[10px] text-sky-600 font-medium mt-1">Habilitado para notas</p>
          </div>
        </motion.div>

       

        {/* LAYOUT DOS COLUMNAS: MENSAJE MOTIVACIONAL + AGENDA */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* BANNER RECONOCIMIENTO Y VALORACIÓN */}
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="lg:col-span-2 bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800 text-white rounded-xl p-6 shadow-sm flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center gap-2 text-emerald-200 text-xs font-bold uppercase tracking-wider mb-2">
                <Award size={18} /> Reconocimiento a la Labor Docente
              </div>
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight mb-2">
                Tu labor transforma vidas y construye futuro 🌱
              </h2>
              <p className="text-emerald-100 text-xs sm:text-sm leading-relaxed max-w-2xl">
                Gracias por tu compromiso constante con la excelencia educativa. Desde este portal puedes gestionar tus asignaturas, realizar la carga de calificaciones trimestrales y hacer un seguimiento oportuno del desempeño de tus estudiantes. ¡Cada jornada es una oportunidad para inspirar!
              </p>
            </div>

            <div className="mt-6 pt-4 border-t border-emerald-500/50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-emerald-100">
              <span className="font-semibold">Unidad Educativa Institucional</span>
              <span className="bg-emerald-800/80 px-3 py-1 rounded-full text-[11px] font-medium border border-emerald-400/30">
                Gestión Académica
              </span>
            </div>
          </motion.div>

          {/* PRÓXIMOS ACONTECIMIENTOS */}
          <motion.div
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.25 }}
            className="bg-gradient-to-br from-white to-blue-50/50 border border-slate-200 rounded-xl p-4 sm:p-5 shadow-sm flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-4">
                <h2 className="text-xs font-bold text-slate-800 flex items-center gap-2 tracking-wide uppercase">
                  <Clock size={16} className="text-blue-600" /> Eventos en Agenda
                </h2>
                <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded-full">
                  {calendario.length} pendiente(s)
                </span>
              </div>

              <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
                {calendario.length > 0 ? (
                  calendario.slice(0, 4).map((ev) => {
                    const diasFaltantes = Math.ceil(
                      (new Date(`${ev.fecha}T00:00:00`) - new Date(`${hoyStr}T00:00:00`)) /
                        (1000 * 60 * 60 * 24)
                    );

                    return (
                      <div
                        key={ev.id}
                        className="p-3 bg-white border border-slate-200 rounded-lg shadow-2xs hover:border-blue-300 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <p className="text-xs font-bold text-slate-800 leading-snug">
                            {ev.descripcion}
                          </p>
                          <span className="text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full whitespace-nowrap">
                            {diasFaltantes === 0
                              ? "Hoy"
                              : diasFaltantes === 1
                              ? "Mañana"
                              : `${diasFaltantes} días`}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 font-medium">
                          {new Date(`${ev.fecha}T00:00:00`).toLocaleDateString("es-BO", {
                            day: "numeric",
                            month: "long",
                            year: "numeric",
                          })}
                        </p>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-8 text-slate-400 text-xs italic">
                    No hay eventos programados en la agenda.
                  </div>
                )}
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-200 text-center">
              <Link
                to="/home-teacher/calendar"
                className="inline-flex items-center gap-1 text-xs font-bold text-blue-700 hover:text-blue-800 transition-colors"
              >
                Ver calendario escolar <ArrowRight size={13} />
              </Link>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};