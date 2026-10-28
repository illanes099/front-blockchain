import React, { useEffect, useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  Users,
  GraduationCap,
  BookOpen,
  Calendar,
  Award,
  TrendingUp,
  BarChart3,
  CalendarDays,
  FileText,
  UserPlus,
  Clock,
  ArrowRight,
  AlertCircle,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

import { getEstudiantesGeneral } from "../../api/api.estudiante";
import { getUsuarios } from "../../api/api.usuario";
import { getCalificacionesMaterias } from "../../api/api.calificaciones";
import { getCalendarios } from "../../api/api.calendario";
import { getParalelos } from "../../api/api.paralelos";

export const DashboardDirector = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Estados de datos
  const [estudiantes, setEstudiantes] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [calificaciones, setCalificaciones] = useState([]);
  const [calendario, setCalendario] = useState([]);
  const [paralelos, setParalelos] = useState([]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        setError(null);

        const [
          resEstudiantes,
          resUsuarios,
          resCalificaciones,
          resCalendario,
          resParalelos,
        ] = await Promise.all([
          getEstudiantesGeneral().catch(() => []),
          getUsuarios().catch(() => ({ data: [] })),
          getCalificacionesMaterias().catch(() => []),
          getCalendarios().catch(() => ({ data: [] })),
          getParalelos().catch(() => []),
        ]);

        setEstudiantes(resEstudiantes || []);
        setUsuarios(resUsuarios.data || []);
        setCalificaciones(resCalificaciones || []);

        const calData = resCalendario.data || resCalendario || [];
        const mapeadosCal = calData.map((c) => ({
          id: c.calendario_id,
          descripcion: c.descripcion || "",
          fecha: typeof c.fecha === "string" ? c.fecha.split("T")[0] : "",
        }));
        setCalendario(mapeadosCal);

        setParalelos(resParalelos || []);
      } catch (err) {
        console.error("Error al cargar datos del dashboard:", err);
        setError("Ocurrió un inconveniente al obtener las métricas del sistema.");
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  // ==== CÁLCULOS KPI ====
  const totalDocentes = useMemo(() => {
    return usuarios.filter((u) => u.rol && u.rol.toLowerCase() === "docente").length;
  }, [usuarios]);

  const totalEstudiantesUnicos = useMemo(() => {
    const setIds = new Set(estudiantes.map((e) => e.estudiante_id));
    return setIds.size || estudiantes.length;
  }, [estudiantes]);

  const promedioInstitucional = useMemo(() => {
    if (!calificaciones.length) return "0.0";
    const suma = calificaciones.reduce((acc, curr) => acc + (Number(curr.total) || 0), 0);
    return (suma / calificaciones.length).toFixed(1);
  }, [calificaciones]);

  const hoyStr = useMemo(() => new Date().toISOString().split("T")[0], []);

  const eventosProximos = useMemo(() => {
    return calendario
      .filter((e) => e.fecha >= hoyStr)
      .sort((a, b) => a.fecha.localeCompare(b.fecha))
      .slice(0, 5);
  }, [calendario, hoyStr]);

  // Promedio agrupado por materia para gráfico
  const datosGraficoMaterias = useMemo(() => {
    if (!calificaciones.length) return [];
    const mapa = new Map();

    calificaciones.forEach((c) => {
      const mat = c.nombre || "Materia";
      const nota = Number(c.total) || 0;
      if (!mapa.has(mat)) {
        mapa.set(mat, { materia: mat, suma: nota, cantidad: 1 });
      } else {
        const prev = mapa.get(mat);
        mapa.set(mat, { materia: mat, suma: prev.suma + nota, cantidad: prev.cantidad + 1 });
      }
    });

    return Array.from(mapa.values())
      .map((m) => ({
        materia: m.materia,
        promedio: Number((m.suma / m.cantidad).toFixed(1)),
      }))
      .slice(0, 6);
  }, [calificaciones]);

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900 text-white p-2.5 rounded-lg shadow-xl text-xs border border-slate-700">
          <p className="font-bold border-b border-slate-700 pb-1 mb-1">{label}</p>
          <p className="text-blue-300">
            Promedio: <span className="font-semibold text-white">{payload[0].value} pts</span>
          </p>
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#EEF3FC] via-[#E9F0FB] to-[#E3ECFA] flex items-center justify-center p-4 font-sans">
        <div className="flex items-center gap-3 bg-white border border-slate-200 px-6 py-4 rounded-xl shadow-lg">
          <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-slate-700 text-sm font-semibold">
            Cargando panel de control del director…
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
          <h3 className="text-base font-bold text-slate-900 mb-1">Error de conexión</h3>
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
        {/* BANNER ENCABEZADO */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="bg-gradient-to-r from-blue-700 via-blue-600 to-sky-600 text-white rounded-2xl p-6 sm:p-8 shadow-md relative overflow-hidden"
        >
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-blue-200 text-xs font-bold uppercase tracking-wider mb-2">
                <GraduationCap size={18} /> Panel de Dirección General
              </div>
              <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold tracking-tight">
                🎓 Bienvenido, Director
              </h1>
              <p className="text-blue-100 text-xs sm:text-sm max-w-2xl mt-1.5 leading-relaxed">
                Supervisa el rendimiento académico institucional, gestión de cuerpo docente, matrícula de estudiantes y programación de eventos del establecimiento.
              </p>
            </div>

            <div className="bg-white/10 backdrop-blur-md border border-white/20 p-3.5 rounded-xl text-right shrink-0 hidden sm:block">
              <p className="text-[10px] uppercase font-semibold text-blue-200">Gestión Escolar</p>
              <p className="text-lg font-bold text-white">{new Date().getFullYear()}</p>
              <p className="text-[11px] text-blue-100">{new Date().toLocaleDateString("es-BO", { weekday: 'long', day: 'numeric', month: 'long' })}</p>
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
              <span className="text-[11px] sm:text-xs uppercase tracking-wide text-blue-700 font-bold">Estudiantes</span>
              <div className="w-8 h-8 rounded-lg bg-blue-200/80 flex items-center justify-center text-blue-800">
                <GraduationCap size={16} />
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-extrabold text-slate-900">{totalEstudiantesUnicos}</p>
            <p className="text-[10px] text-blue-600 font-medium mt-1">Matriculados en sistema</p>
          </div>

          <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 border border-emerald-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-all">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] sm:text-xs uppercase tracking-wide text-emerald-700 font-bold">Docentes</span>
              <div className="w-8 h-8 rounded-lg bg-emerald-200/80 flex items-center justify-center text-emerald-800">
                <Users size={16} />
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-extrabold text-slate-900">{totalDocentes}</p>
            <p className="text-[10px] text-emerald-600 font-medium mt-1">Plantel académico activo</p>
          </div>

          <div className="bg-gradient-to-br from-amber-50 to-amber-100 border border-amber-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-all">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] sm:text-xs uppercase tracking-wide text-amber-700 font-bold">Promedio Gral.</span>
              <div className="w-8 h-8 rounded-lg bg-amber-200/80 flex items-center justify-center text-amber-800">
                <Award size={16} />
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-extrabold text-slate-900">{promedioInstitucional} <span className="text-xs font-normal text-slate-500">/100</span></p>
            <p className="text-[10px] text-amber-700 font-medium mt-1">Rendimiento institucional</p>
          </div>

          <div className="bg-gradient-to-br from-sky-50 to-sky-100 border border-sky-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-all">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] sm:text-xs uppercase tracking-wide text-sky-700 font-bold">Eventos</span>
              <div className="w-8 h-8 rounded-lg bg-sky-200/80 flex items-center justify-center text-sky-800">
                <CalendarDays size={16} />
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-extrabold text-slate-900">{eventosProximos.length}</p>
            <p className="text-[10px] text-sky-600 font-medium mt-1">Próximos en agenda</p>
          </div>
        </motion.div>

       

        {/* LAYOUT DOS COLUMNAS: GRÁFICO + EVENTOS */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* GRÁFICO RESUMEN DE MATERIAS */}
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="lg:col-span-2 bg-gradient-to-br from-white to-slate-50 border border-slate-200 rounded-xl p-4 sm:p-5 shadow-sm flex flex-col justify-between"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <h2 className="text-xs font-bold text-slate-800 flex items-center gap-2 tracking-wide uppercase">
                <BarChart3 size={16} className="text-blue-600" /> Rendimiento por Materia (Vista Previa)
              </h2>
              <span className="text-[10px] font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">
                Promedios
              </span>
            </div>

            {datosGraficoMaterias.length === 0 ? (
              <div className="h-64 flex items-center justify-center text-slate-400 text-xs italic">
                Sin datos suficientes de calificaciones registradas.
              </div>
            ) : (
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={datosGraficoMaterias} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                    <XAxis dataKey="materia" stroke="#64748B" fontSize={10} tickLine={false} />
                    <YAxis stroke="#64748B" fontSize={10} domain={[0, 100]} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="promedio" fill="#2563EB" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </motion.div>

          {/* EVENTOS PRÓXIMOS DE LA DIRECCIÓN */}
          <motion.div
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.25 }}
            className="bg-gradient-to-br from-white to-blue-50/50 border border-slate-200 rounded-xl p-4 sm:p-5 shadow-sm flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-4">
                <h2 className="text-xs font-bold text-slate-800 flex items-center gap-2 tracking-wide uppercase">
                  <Clock size={16} className="text-blue-600" /> Agenda de Dirección
                </h2>
                <span className="text-[10px] font-bold text-blue-800 bg-blue-100 border border-blue-200 px-2 py-0.5 rounded-full">
                  Próximos
                </span>
              </div>

              <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
                {eventosProximos.length > 0 ? (
                  eventosProximos.map((ev) => {
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
                    No hay eventos registrados en la agenda próxima.
                  </div>
                )}
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-200 text-center">
              <a
                href="/calendario"
                className="inline-flex items-center gap-1 text-xs font-bold text-blue-700 hover:text-blue-800 transition-colors"
              >
                Ver calendario completo <ArrowRight size={13} />
              </a>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};