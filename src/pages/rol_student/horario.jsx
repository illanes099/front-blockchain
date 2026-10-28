import React, { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CalendarRange,
  BookOpen,
  User2,
  Clock,
  Sparkles,
  Layers,
  GraduationCap,
  AlertCircle,
} from "lucide-react";

import { getUsuarios } from "../../api/api.usuario";
import { getEstudiantes } from "../../api/api.estudiante";
import { gethorarios } from "../../api/api.horarios"; // O la ruta donde tengas Axios para axios.get('/horarios/estudiante/:estudiante_id')
import axios from "axios";

// Pestañas de días de la semana
const DAYS = [
  { id: "lunes", nombre: "Lunes", color: "from-blue-600 to-blue-500" },
  { id: "martes", nombre: "Martes", color: "from-sky-600 to-sky-500" },
  { id: "miercoles", nombre: "Miércoles", color: "from-indigo-600 to-blue-600" },
  { id: "jueves", nombre: "Jueves", color: "from-blue-700 to-sky-600" },
  { id: "viernes", nombre: "Viernes", color: "from-teal-600 to-blue-600" },
];

export const HorarioStudent = () => {
  const [selectedDay, setSelectedDay] = useState("lunes");
  const [horariosBD, setHorariosBD] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function cargarHorarioAlumno() {
      try {
        setLoading(true);
        setError(null);

        // 1. Obtener usuario del localStorage
        const localUsername = localStorage.getItem("username");
        if (!localUsername) {
          setError("No se identificó una sesión activa de estudiante.");
          return;
        }

        // 2. Traer lista de usuarios y buscar su usuario_id
        const resUsuarios = await getUsuarios().catch(() => ({ data: [] }));
        const listaUsuarios = Array.isArray(resUsuarios) ? resUsuarios : resUsuarios.data || [];
        const userObj = listaUsuarios.find((u) => u.username === localUsername);

        if (!userObj) {
          setError("No se encontró la cuenta de usuario en el sistema.");
          return;
        }

        // 3. Buscar el estudiante_id correspondiente a este usuario_id
        const resEstudiantes = await getEstudiantes().catch(() => []);
        const listaEstudiantes = Array.isArray(resEstudiantes) ? resEstudiantes : resEstudiantes.data || [];
        const estObj = listaEstudiantes.find((e) => Number(e.usuario_id) === Number(userObj.usuario_id));

        if (!estObj || !estObj.estudiante_id) {
          setError("Tu usuario no tiene asignado un perfil de estudiante en la base de datos.");
          return;
        }

        // 4. Consultar los horarios usando el id del estudiante
        // const resHorario = await axios.get(`http://localhost:20000/horarios/estudiante/${estObj.estudiante_id}`);
        const resHorario = await axios.get(`https://back-blockchain-88mqq4sf4-illanes.vercel.app/horarios/estudiante/${estObj.estudiante_id}`);
        setHorariosBD(resHorario.data || []);
      } catch (err) {
        console.error("Error al cargar horario del estudiante:", err);
        setError("Ocurrió un problema al sincronizar tu horario con el servidor.");
      } finally {
        setLoading(false);
      }
    }

    cargarHorarioAlumno();
  }, []);

  // Agrupar materias por día
  const horariosPorDia = useMemo(() => {
    const mapa = {
      lunes: [],
      martes: [],
      miercoles: [],
      jueves: [],
      viernes: [],
    };

    horariosBD.forEach((h) => {
      const diaClean = (h.dia_semana || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");

      if (mapa[diaClean]) {
        mapa[diaClean].push({
          id: h.horario_id,
          hora: `${h.hora_inicio?.slice(0, 5)} - ${h.hora_fin?.slice(0, 5)}`,
          materia: h.materia_nombre || "Asignatura",
          profesor: `${h.prof_nombre || ""} ${h.prof_apellido || ""}`.trim() || "Docente no asignado",
        });
      }
    });

    return mapa;
  }, [horariosBD]);

  // Contar asignaturas únicas
  const totalMateriasUnicas = useMemo(() => {
    const nombres = new Set(horariosBD.map((h) => h.materia_nombre).filter(Boolean));
    return nombres.size;
  }, [horariosBD]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#EEF3FC] via-[#E9F0FB] to-[#E3ECFA] flex items-center justify-center p-4 font-sans">
        <div className="flex items-center gap-3 bg-white border border-slate-200 px-6 py-4 rounded-xl shadow-lg">
          <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-slate-700 text-sm font-semibold">
            Cargando tu horario académico…
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
          <h3 className="text-base font-bold text-slate-900 mb-1">Aviso de Horario</h3>
          <p className="text-xs text-slate-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-5 py-2 rounded-md bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition-colors"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  const clasesDelDia = horariosPorDia[selectedDay] || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#EEF3FC] via-[#E9F0FB] to-[#E3ECFA] text-slate-800 p-3 xs:p-4 sm:p-6 md:p-10 font-sans">
      <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8">
        
        {/* ENCABEZADO INSTITUCIONAL */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 border-b border-slate-300 pb-6"
        >
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-lg bg-gradient-to-br from-blue-100 to-blue-200 border border-blue-300 flex items-center justify-center shrink-0 shadow-sm">
              <CalendarRange className="text-blue-700" size={24} />
            </div>
            <div>
              <p className="text-[10px] sm:text-xs uppercase tracking-[0.2em] text-blue-700 font-semibold mb-1">
                Portal Estudiantil · Planificación Semanal
              </p>
              <h1 className="text-lg xs:text-xl sm:text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">
                Mi Horario de Clases
              </h1>
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-2 bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-xs text-xs font-semibold text-slate-700">
            <Sparkles size={15} className="text-blue-600" /> Horario Oficial Vigente
          </div>
        </motion.div>

        {/* TARJETAS KPI RESUMEN */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4"
        >
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-xl p-3.5 sm:p-4 shadow-sm">
            <div className="flex items-center gap-2 text-blue-700 text-[11px] uppercase font-semibold mb-2">
              <BookOpen size={14} /> Materias Inscritas
            </div>
            <p className="text-xl sm:text-2xl font-bold text-slate-900">{totalMateriasUnicas}</p>
          </div>

          <div className="bg-gradient-to-br from-sky-50 to-sky-100 border border-sky-200 rounded-xl p-3.5 sm:p-4 shadow-sm">
            <div className="flex items-center gap-2 text-sky-700 text-[11px] uppercase font-semibold mb-2">
              <Layers size={14} /> Clases Hoy
            </div>
            <p className="text-xl sm:text-2xl font-bold text-slate-900">{clasesDelDia.length} Bloques</p>
          </div>

          <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 border border-emerald-200 rounded-xl p-3.5 sm:p-4 shadow-sm">
            <div className="flex items-center gap-2 text-emerald-700 text-[11px] uppercase font-semibold mb-2">
              <GraduationCap size={14} /> Turno
            </div>
            <p className="text-xl sm:text-2xl font-bold text-slate-900">Regular</p>
          </div>

          <div className="bg-gradient-to-br from-amber-50 to-amber-100 border border-amber-200 rounded-xl p-3.5 sm:p-4 shadow-sm">
            <div className="flex items-center gap-2 text-amber-700 text-[11px] uppercase font-semibold mb-2">
              <CalendarRange size={14} /> Días Lectivos
            </div>
            <p className="text-xl sm:text-2xl font-bold text-slate-900">Lunes a Viernes</p>
          </div>
        </motion.div>

        {/* CONTENEDOR PRINCIPAL: PESTAÑAS DE DÍAS Y PLANNER */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="bg-gradient-to-b from-white to-slate-50 border border-slate-200 rounded-2xl shadow-sm overflow-hidden p-4 sm:p-6"
        >
          {/* BOTONES SELECTORES DE DÍA (TABS RESPONSIVOS) */}
          <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 mb-6 border-b border-slate-200 pb-5">
            {DAYS.map((day) => {
              const isActive = selectedDay === day.id;

              return (
                <button
                  key={day.id}
                  onClick={() => setSelectedDay(day.id)}
                  className={`px-4 sm:px-6 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all shadow-xs flex items-center gap-2 ${
                    isActive
                      ? `bg-gradient-to-r ${day.color} text-white shadow-md scale-105`
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900"
                  }`}
                >
                  <CalendarRange size={15} />
                  <span>{day.nombre}</span>
                </button>
              );
            })}
          </div>

          {/* TARJETAS DE BLOQUES HORARIOS PARA EL DÍA SELECCIONADO */}
          <div className="space-y-4">
            <div className="flex items-center justify-between px-2">
              <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Itinerario para el día <span className="text-blue-700 capitalize">{selectedDay}</span>
              </h2>
              <span className="text-xs font-semibold text-slate-400">
                {clasesDelDia.length} Clases programadas
              </span>
            </div>

            {clasesDelDia.length === 0 ? (
              <div className="p-12 text-center text-slate-400 text-xs italic bg-slate-50 border border-slate-200 rounded-xl">
                No tienes clases programadas para este día.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <AnimatePresence mode="wait">
                  {clasesDelDia.map((clase, idx) => (
                    <motion.div
                      key={clase.id || idx}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.3, delay: idx * 0.05 }}
                      className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between group border-l-4 border-l-blue-600"
                    >
                      <div>
                        {/* Horario de la Clase */}
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-800 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-lg">
                            <Clock size={13} className="text-blue-600" /> {clase.hora}
                          </span>
                        </div>

                        {/* Nombre de la Materia */}
                        <h3 className="text-base sm:text-lg font-extrabold text-slate-900 group-hover:text-blue-600 transition-colors">
                          {clase.materia}
                        </h3>
                      </div>

                      {/* Docente a cargo */}
                      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-2 text-xs text-slate-600 font-medium">
                        <div className="w-7 h-7 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 shrink-0">
                          <User2 size={14} />
                        </div>
                        <span>
                          Docente: <span className="font-bold text-slate-800">{clase.profesor}</span>
                        </span>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>

          {/* PIE DE NOTA */}
          <div className="mt-8 pt-4 border-t border-slate-200 text-center">
            <p className="text-[11px] text-slate-400 italic">
              * Horario sujeto a modificaciones extraordinarias por parte de la Dirección Académica de la institución.
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
};