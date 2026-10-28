import React, { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  BookOpen,
  BarChart2,
  Calendar,
  User,
  GraduationCap,
  Clock,
  Sparkles,
  Award,
  ArrowRight,
  CalendarRange,
  Target,
} from "lucide-react";

import { getCalendarios } from "../../api/api.calendario";
import {
  getEstudiantes,
  getEstudiantesGeneral,
} from "../../api/api.estudiante";
import { getUsuarios } from "../../api/api.usuario";

export const InicioStudent = () => {
  const [generalEstudiantes, setGeneralEstudiantes] = useState([]);
  const [calendario, setCalendario] = useState([]);
  const [usuario, setUsuario] = useState([]);
  const [estudiante, setEstudiante] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getValues = async () => {
      try {
        setLoading(true);
        const [
          responseGeneralEstudiantes,
          responseCalendarios,
          responseUsuario,
          responseEstudiante,
        ] = await Promise.all([
          getEstudiantesGeneral().catch(() => []),
          getCalendarios().catch(() => ({ data: [] })),
          getUsuarios().catch(() => ({ data: [] })),
          getEstudiantes().catch(() => []),
        ]);

        setGeneralEstudiantes(responseGeneralEstudiantes || []);
        setCalendario(responseCalendarios.data || responseCalendarios || []);
        setUsuario(responseUsuario.data || responseUsuario || []);
        setEstudiante(responseEstudiante || []);
      } catch (err) {
        console.error("Error al cargar datos del estudiante:", err);
      } finally {
        setLoading(false);
      }
    };

    getValues();
  }, []);

  // Identificar usuario actual y su ID de estudiante
  const usuarioStudent = useMemo(() => {
    const localUsername = localStorage.getItem("username");
    return usuario.find((u) => u.username === localUsername);
  }, [usuario]);

  const resultUserId = usuarioStudent?.usuario_id;

  const estudianteId = useMemo(() => {
    return estudiante.find((e) => e.usuario_id === resultUserId)?.estudiante_id;
  }, [estudiante, resultUserId]);

  const resultMaterias = useMemo(() => {
    return generalEstudiantes.filter(
      (cantidad) => cantidad.estudiante_id === estudianteId
    ).length;
  }, [generalEstudiantes, estudianteId]);

  // Cálculo del promedio general anual
  const promedioGeneral = useMemo(() => {
    const resultFilter = generalEstudiantes.filter(
      (mat) => mat.estudiante_id === estudianteId
    );

    if (resultFilter.length === 0) return "0.0";

    const sumaTotal = resultFilter.reduce((acc, item) => {
      const nota = Number(item.total);
      return acc + (isNaN(nota) ? 0 : nota);
    }, 0);

    return (sumaTotal / resultFilter.length).toFixed(1);
  }, [generalEstudiantes, estudianteId]);

  // Filtrado de eventos futuros del calendario
  const hoyStr = useMemo(() => new Date().toISOString().split("T")[0], []);

  const eventosProximos = useMemo(() => {
    return calendario
      .filter((c) => {
        const fechaStr = typeof c.fecha === "string" ? c.fecha.split("T")[0] : "";
        return fechaStr >= hoyStr;
      })
      .map((c) => ({
        id: c.calendario_id,
        descripcion: c.descripcion || "",
        fecha: typeof c.fecha === "string" ? c.fecha.split("T")[0] : "",
      }))
      .sort((a, b) => a.fecha.localeCompare(b.fecha));
  }, [calendario, hoyStr]);

  const eventoMasCercano = eventosProximos[0] || null;

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#EEF3FC] via-[#E9F0FB] to-[#E3ECFA] flex items-center justify-center p-4 font-sans">
        <div className="flex items-center gap-3 bg-white border border-slate-200 px-6 py-4 rounded-xl shadow-lg">
          <div className="w-5 h-5 border-2 border-sky-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-slate-700 text-sm font-semibold">
            Cargando portal estudiantil…
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#EEF3FC] via-[#E9F0FB] to-[#E3ECFA] text-slate-800 p-3 xs:p-4 sm:p-6 md:p-10 font-sans">
      <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8">
        
        {/* BANNER ENCABEZADO ESTUDIANTE */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="bg-gradient-to-r from-sky-700 via-sky-600 to-blue-600 text-white rounded-2xl p-6 sm:p-8 shadow-md relative overflow-hidden"
        >
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-sky-200 text-xs font-bold uppercase tracking-wider mb-2">
                <GraduationCap size={18} /> Portal Estudiantil Unificado
              </div>
              <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold tracking-tight">
                👋 ¡Bienvenido, {usuarioStudent?.nombre ?? "Estudiante"} {usuarioStudent?.apellido ?? ""}!
              </h1>
              <p className="text-sky-100 text-xs sm:text-sm max-w-2xl mt-1.5 leading-relaxed">
                Consulta tus calificaciones trimestrales, revisa tu horario semanal y mantente al día con los eventos y actividades de la institución.
              </p>
            </div>

            <div className="bg-white/10 backdrop-blur-md border border-white/20 p-3.5 rounded-xl text-right shrink-0 hidden sm:block">
              <p className="text-[10px] uppercase font-semibold text-sky-200">Gestión Académica</p>
              <p className="text-lg font-bold text-white">{new Date().getFullYear()}</p>
              <p className="text-[11px] text-sky-100">
                {new Date().toLocaleDateString("es-BO", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                })}
              </p>
            </div>
          </div>
        </motion.div>

        {/* TARJETAS PRINCIPALES / KPIS */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-5"
        >
          <div className="bg-gradient-to-br from-sky-50 to-sky-100 border border-sky-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-all">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] sm:text-xs uppercase tracking-wide text-sky-700 font-bold">Perfil</span>
              <div className="w-8 h-8 rounded-lg bg-sky-200/80 flex items-center justify-center text-sky-800">
                <User size={16} />
              </div>
            </div>
            <p className="text-lg sm:text-xl font-extrabold text-slate-900 truncate">Estudiante</p>
            <p className="text-[10px] text-sky-600 font-medium mt-1">Cuenta verificada</p>
          </div>

          <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-all">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] sm:text-xs uppercase tracking-wide text-blue-700 font-bold">Materias</span>
              <div className="w-8 h-8 rounded-lg bg-blue-200/80 flex items-center justify-center text-blue-800">
                <BookOpen size={16} />
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-extrabold text-slate-900">{resultMaterias}</p>
            <p className="text-[10px] text-blue-600 font-medium mt-1">Asignaturas inscritas</p>
          </div>

          <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 border border-emerald-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-all">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] sm:text-xs uppercase tracking-wide text-emerald-700 font-bold">Promedio Gral.</span>
              <div className="w-8 h-8 rounded-lg bg-emerald-200/80 flex items-center justify-center text-emerald-800">
                <Award size={16} />
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-extrabold text-slate-900">
              {promedioGeneral} <span className="text-xs font-normal text-slate-500">/ 100</span>
            </p>
            <p className="text-[10px] text-emerald-600 font-medium mt-1">Rendimiento anual</p>
          </div>

          <div className="bg-gradient-to-br from-amber-50 to-amber-100 border border-amber-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-all">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] sm:text-xs uppercase tracking-wide text-amber-700 font-bold">Próx. Evento</span>
              <div className="w-8 h-8 rounded-lg bg-amber-200/80 flex items-center justify-center text-amber-800">
                <Calendar size={16} />
              </div>
            </div>
            <p className="text-xs sm:text-sm font-bold text-slate-900 truncate">
              {eventoMasCercano ? eventoMasCercano.descripcion : "Sin eventos"}
            </p>
            <p className="text-[10px] text-amber-700 font-medium mt-1">
              {eventoMasCercano ? eventoMasCercano.fecha : "Agenda al día"}
            </p>
          </div>
        </motion.div>

        {/* ACCESOS RÁPIDOS */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-sm"
        >
          <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wide mb-3 flex items-center gap-2 border-b border-slate-100 pb-2">
            <Sparkles size={16} className="text-sky-600" /> Accesos Directos
          </h2>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Link
              to="/home-student/grades"
              className="p-3 bg-gradient-to-br from-slate-50 to-sky-50/50 border border-slate-200 rounded-lg hover:border-sky-300 transition-all flex flex-col items-center text-center gap-2 group"
            >
              <div className="p-2 rounded-full bg-sky-100 text-sky-700 group-hover:scale-110 transition-transform">
                <BarChart2 size={18} />
              </div>
              <span className="text-xs font-semibold text-slate-800">Mis Calificaciones</span>
            </Link>

            <Link
              to="/home-student/horario"
              className="p-3 bg-gradient-to-br from-slate-50 to-blue-50/50 border border-slate-200 rounded-lg hover:border-blue-300 transition-all flex flex-col items-center text-center gap-2 group"
            >
              <div className="p-2 rounded-full bg-blue-100 text-blue-700 group-hover:scale-110 transition-transform">
                <CalendarRange size={18} />
              </div>
              <span className="text-xs font-semibold text-slate-800">Mi Horario</span>
            </Link>

            <Link
              to="/home-student/calendar"
              className="p-3 bg-gradient-to-br from-slate-50 to-emerald-50/50 border border-slate-200 rounded-lg hover:border-emerald-300 transition-all flex flex-col items-center text-center gap-2 group"
            >
              <div className="p-2 rounded-full bg-emerald-100 text-emerald-700 group-hover:scale-110 transition-transform">
                <Calendar size={18} />
              </div>
              <span className="text-xs font-semibold text-slate-800">Calendario Escolar</span>
            </Link>

            <Link
              to="/home-student/profile"
              className="p-3 bg-gradient-to-br from-slate-50 to-amber-50/50 border border-slate-200 rounded-lg hover:border-amber-300 transition-all flex flex-col items-center text-center gap-2 group"
            >
              <div className="p-2 rounded-full bg-amber-100 text-amber-700 group-hover:scale-110 transition-transform">
                <User size={18} />
              </div>
              <span className="text-xs font-semibold text-slate-800">Mi Perfil</span>
            </Link>
          </div>
        </motion.div>

        {/* LAYOUT DOS COLUMNAS: MOTIVACIÓN + AGENDA */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* BANNER MOTIVACIONAL */}
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="lg:col-span-2 bg-gradient-to-br from-sky-600 via-sky-700 to-blue-800 text-white rounded-xl p-6 shadow-sm flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center gap-2 text-sky-200 text-xs font-bold uppercase tracking-wider mb-2">
                <Target size={18} /> Tu Progreso Importa 🎯
              </div>
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight mb-2">
                Cada paso te acerca más a tus metas académicas
              </h2>
              <p className="text-sky-100 text-xs sm:text-sm leading-relaxed max-w-2xl">
                Consulta permanentemente tus calificaciones trimestrales, revisa las asignaturas que cursas y mantente al tanto de las actividades y eventos programados por el colegio. ¡Sigue esforzándote para alcanzar la excelencia!
              </p>
            </div>

           
          </motion.div>

          {/* PRÓXIMOS EVENTOS AGENDA */}
          <motion.div
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.25 }}
            className="bg-gradient-to-br from-white to-sky-50/50 border border-slate-200 rounded-xl p-4 sm:p-5 shadow-sm flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-4">
                <h2 className="text-xs font-bold text-slate-800 flex items-center gap-2 tracking-wide uppercase">
                  <Clock size={16} className="text-sky-600" /> Próximos Eventos
                </h2>
                <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded-full">
                  {eventosProximos.length} pendiente(s)
                </span>
              </div>

              <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
                {eventosProximos.length > 0 ? (
                  eventosProximos.slice(0, 4).map((ev) => {
                    const diasFaltantes = Math.ceil(
                      (new Date(`${ev.fecha}T00:00:00`) - new Date(`${hoyStr}T00:00:00`)) /
                        (1000 * 60 * 60 * 24)
                    );

                    return (
                      <div
                        key={ev.id}
                        className="p-3 bg-white border border-slate-200 rounded-lg shadow-2xs hover:border-sky-300 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <p className="text-xs font-bold text-slate-800 leading-snug">
                            {ev.descripcion}
                          </p>
                          <span className="text-[10px] font-bold text-sky-700 bg-sky-50 border border-sky-200 px-2 py-0.5 rounded-full whitespace-nowrap">
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
                    No hay eventos registrados en la agenda escolar.
                  </div>
                )}
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-200 text-center">
              <Link
                to="/home-student/calendar"
                className="inline-flex items-center gap-1 text-xs font-bold text-sky-700 hover:text-sky-800 transition-colors"
              >
                Ver calendario completo <ArrowRight size={13} />
              </Link>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};