import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Layers,
  Plus,
  Search,
  Pencil,
  Trash2,
  CheckCircle2,
  AlertCircle,
  X,
  Save,
  Filter,
  Users,
  BookOpen,
  UserCheck,
} from "lucide-react";

import {
  getParalelos,
  createParalelo,
  updateParalelo,
  deleteParalelo,
} from "../../api/api.paralelos";
import { getProfesor } from "../../api/api.profesores";
import { getUsuarios } from "../../api/api.usuario";

export const GestionParalelos = () => {
  const [paralelos, setParalelos] = useState([]);
  const [profesores, setProfesores] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);

  // Estados de Notificación Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMessage, setModalMessage] = useState("");
  const [modalSuccess, setModalSuccess] = useState(false);

  // Modales Formulario (Crear / Editar)
  const [modalFormOpen, setModalFormOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    paralelo_id: null,
    descripcion: "",
    prof_id: "",
  });

  // Modal Confirmación Eliminar
  const [modalDeleteOpen, setModalDeleteOpen] = useState(false);
  const [deleteData, setDeleteData] = useState({
    paralelo_id: null,
    descripcion: "",
  });

  // Cargar paralelos, profesores y usuarios en paralelo
  const cargarDatos = async () => {
    try {
      setLoading(true);
      const [resParalelos, resProf, resUsuarios] = await Promise.all([
        getParalelos(),
        getProfesor(),
        getUsuarios(),
      ]);
      setParalelos(resParalelos || []);
      setProfesores(resProf || []);
      setUsuarios(resUsuarios.data || resUsuarios || []);
    } catch (err) {
      console.error(err);
      setModalSuccess(false);
      setModalMessage("Error al obtener los listados del servidor.");
      setModalOpen(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  // Mapear profesores con su respectivo nombre de usuario
  const profesoresConDetalle = useMemo(() => {
    return profesores.map((prof) => {
      const user = usuarios.find((u) => u.usuario_id === prof.usuario_id);
      return {
        ...prof,
        nombreCompleto: user ? `${user.nombre} ${user.apellido}` : `Profesor #${prof.prof_id}`,
      };
    });
  }, [profesores, usuarios]);

  // Cruzar paralelos con el nombre del profesor asignado
  const paralelosConProfesor = useMemo(() => {
    return paralelos.map((p) => {
      const profInfo = profesoresConDetalle.find((pr) => pr.prof_id === p.prof_id);
      return {
        ...p,
        profesorNombre: profInfo ? profInfo.nombreCompleto : "Sin Asignar",
      };
    });
  }, [paralelos, profesoresConDetalle]);

  // Abrir Modal para Crear
  const handleOpenCreateModal = () => {
    setIsEditing(false);
    setFormData({ paralelo_id: null, descripcion: "", prof_id: "" });
    setModalFormOpen(true);
  };

  // Abrir Modal para Editar
  const handleOpenEditModal = (paralelo) => {
    setIsEditing(true);
    setFormData({
      paralelo_id: paralelo.paralelo_id,
      descripcion: paralelo.descripcion || "",
      prof_id: paralelo.prof_id || "",
    });
    setModalFormOpen(true);
  };

  // Abrir Modal para Eliminar
  const handleOpenDeleteModal = (paralelo) => {
    setDeleteData({
      paralelo_id: paralelo.paralelo_id,
      descripcion: paralelo.descripcion || "",
    });
    setModalDeleteOpen(true);
  };

  // Guardar (Crear o Editar)
  const handleGuardarParalelo = async (e) => {
    e.preventDefault();
    if (!formData.descripcion.trim()) {
      setModalSuccess(false);
      setModalMessage("La descripción del paralelo no puede estar vacía.");
      setModalOpen(true);
      return;
    }

    if (!formData.prof_id) {
      setModalSuccess(false);
      setModalMessage("Debe seleccionar un profesor tutor/encargado para el paralelo.");
      setModalOpen(true);
      return;
    }

    try {
      const payload = {
        descripcion: formData.descripcion.trim(),
        prof_id: parseInt(formData.prof_id, 10),
      };

      if (isEditing) {
        await updateParalelo(formData.paralelo_id, payload);
        setModalSuccess(true);
        setModalMessage("Paralelo actualizado correctamente.");
      } else {
        await createParalelo(payload);
        setModalSuccess(true);
        setModalMessage("Nuevo paralelo registrado correctamente.");
      }

      setModalFormOpen(false);
      await cargarDatos();
      setModalOpen(true);
    } catch (err) {
      console.error(err);
      setModalSuccess(false);
      setModalMessage("Ocurrió un error al procesar la solicitud en el servidor.");
      setModalOpen(true);
    }
  };

  // Confirmar Eliminación
  const handleConfirmarEliminar = async () => {
    if (!deleteData.paralelo_id) return;

    try {
      await deleteParalelo(deleteData.paralelo_id);
      setModalDeleteOpen(false);
      await cargarDatos();
      setModalSuccess(true);
      setModalMessage("Paralelo eliminado exitosamente.");
      setModalOpen(true);
    } catch (err) {
      console.error(err);
      setModalDeleteOpen(false);
      setModalSuccess(false);
      setModalMessage("No se pudo eliminar el paralelo. Puede estar asignado a estudiantes.");
      setModalOpen(true);
    }
  };

  // Filtro de Búsqueda
  const paralelosFiltrados = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return paralelosConProfesor.filter(
      (p) =>
        String(p.descripcion || "").toLowerCase().includes(q) ||
        String(p.profesorNombre || "").toLowerCase().includes(q)
    );
  }, [paralelosConProfesor, searchQuery]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#EEF3FC] via-[#E9F0FB] to-[#E3ECFA] text-slate-800 p-3 xs:p-4 sm:p-6 md:p-10 font-sans">
      <div className="max-w-6xl mx-auto">
        
        {/* ENCABEZADO */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 border-b border-slate-300 pb-6 mb-6 sm:mb-8"
        >
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-lg bg-gradient-to-br from-blue-100 to-blue-200 border border-blue-300 flex items-center justify-center shrink-0 shadow-sm">
              <Layers className="text-blue-700" size={24} />
            </div>
            <div>
              <p className="text-[10px] sm:text-xs uppercase tracking-[0.2em] text-blue-700 font-semibold mb-1">
                Dirección Académica · Configuración
              </p>
              <h1 className="text-lg xs:text-xl sm:text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">
                Gestión e Inventario de Paralelos
              </h1>
            </div>
          </div>

          <button
            onClick={handleOpenCreateModal}
            className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 text-white font-semibold rounded-lg shadow-xs text-xs flex items-center gap-2 self-start md:self-auto transition-all"
          >
            <Plus size={16} /> Nuevo Paralelo
          </button>
        </motion.div>

        {/* METRICAS Y RESUMEN */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-6 sm:mb-8">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-xl p-3.5 sm:p-4 shadow-sm">
            <div className="flex items-center gap-2 text-blue-700 text-[11px] uppercase font-semibold mb-2">
              <Layers size={14} /> Total Paralelos Registrados
            </div>
            <p className="text-xl sm:text-2xl font-bold text-slate-900">{paralelos.length}</p>
          </div>

          <div className="bg-gradient-to-br from-sky-50 to-sky-100 border border-sky-200 rounded-xl p-3.5 sm:p-4 shadow-sm">
            <div className="flex items-center gap-2 text-sky-700 text-[11px] uppercase font-semibold mb-2">
              <Filter size={14} /> Filtrados
            </div>
            <p className="text-xl sm:text-2xl font-bold text-slate-900">
              {paralelosFiltrados.length}
            </p>
          </div>

          
        </div>

        {/* TABLA DE PARALELOS */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-gradient-to-b from-white to-slate-50 border border-slate-200 rounded-xl shadow-sm overflow-hidden"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 sm:p-5 border-b border-slate-200 bg-gradient-to-r from-blue-50/70 to-transparent">
            <h2 className="text-xs font-bold text-slate-800 flex items-center gap-2 tracking-wide uppercase">
              <BookOpen size={16} className="text-blue-600" /> Lista de Paralelos ({paralelosFiltrados.length})
            </h2>

            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
              <input
                type="text"
                placeholder="Buscar por curso o profesor..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 rounded-md bg-white text-slate-800 border border-slate-300 text-xs focus:ring-2 focus:ring-blue-400/50 outline-none"
              />
            </div>
          </div>

          {paralelosFiltrados.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-xs italic">
              {loading ? "Cargando paralelos..." : "No se encontraron paralelos registrados."}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-xs">
                <thead className="bg-gradient-to-r from-blue-100 to-sky-100 text-blue-900 border-b border-slate-200">
                  <tr>
                   
                    <th className="py-3 px-4 text-left font-bold uppercase">Curso</th>
                    <th className="py-3 px-4 text-left font-bold uppercase">Profesor Asignado</th>
                    <th className="py-3 px-4 text-center font-bold uppercase w-32">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paralelosFiltrados.map((p) => (
                    <tr key={p.paralelo_id} className="hover:bg-blue-50/40 transition-colors">
                     

                      <td className="py-3 px-4 font-semibold text-slate-900">
                        <span className="bg-blue-50 text-blue-800 border border-blue-200 px-3 py-1 rounded-md text-xs font-bold inline-block">
                          {p.descripcion}
                        </span>
                      </td>

                      <td className="py-3 px-4 font-medium text-slate-700 flex items-center gap-1.5 pt-4 uppercase">
                        <UserCheck size={14} className="text-blue-600 shrink-0" />
                        <span>{p.profesorNombre}</span>
                      </td>

                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleOpenEditModal(p)}
                            className="p-1.5 rounded-md bg-amber-50 border border-amber-300 text-amber-700 hover:bg-amber-100 transition-colors"
                            title="Editar paralelo"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            onClick={() => handleOpenDeleteModal(p)}
                            className="p-1.5 rounded-md bg-red-50 border border-red-300 text-red-700 hover:bg-red-100 transition-colors"
                            title="Eliminar paralelo"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </motion.div>
      </div>

      {/* MODAL EDITAR / CREAR PARALELO */}
      <AnimatePresence>
        {modalFormOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 px-4"
          >
            <motion.div
              initial={{ opacity: 0, y: 12, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.97 }}
              className="bg-white rounded-xl p-5 sm:p-6 max-w-md w-full shadow-2xl border-t-4 border-blue-600 text-slate-800"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    {isEditing ? <Pencil size={15} className="text-blue-600" /> : <Plus size={16} className="text-blue-600" />}
                    {isEditing ? "Editar Paralelo" : "Nuevo Paralelo"}
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium">
                    {isEditing ? `Modificando registro #${formData.paralelo_id}` : "Asigna el curso y profesor encargado"}
                  </p>
                </div>
                <button
                  onClick={() => setModalFormOpen(false)}
                  className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleGuardarParalelo}>
                <div className="space-y-4 mb-5">
                  <div>
                    <label className="block text-[11px] font-semibold text-blue-700 uppercase tracking-wide mb-1.5">
                      Descripción del Paralelo
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.descripcion}
                      onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                      placeholder="Ej. 1ro Sec. 'A', 6to B, etc."
                      className="w-full p-2.5 bg-white border border-slate-300 rounded-md text-xs font-semibold outline-none focus:ring-2 focus:ring-blue-400/50"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-blue-700 uppercase tracking-wide mb-1.5">
                      Profesor Asignado
                    </label>
                    <select
                      required
                      value={formData.prof_id}
                      onChange={(e) => setFormData({ ...formData, prof_id: e.target.value })}
                      className="uppercase w-full p-2.5 bg-white border border-slate-300 rounded-md text-xs font-semibold outline-none focus:ring-2 focus:ring-blue-400/50"
                    >
                      <option value="">-- Seleccionar Profesor --</option>
                      {profesoresConDetalle.map((prof) => (
                        <option key={prof.prof_id} value={prof.prof_id}>
                          {prof.nombreCompleto}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex gap-2 justify-end border-t border-slate-100 pt-3">
                  <button
                    type="button"
                    onClick={() => setModalFormOpen(false)}
                    className="px-4 py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-md text-xs font-semibold transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 text-white rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
                  >
                    <Save size={14} /> Guardar Registro
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODAL CONFIRMAR ELIMINAR */}
      <AnimatePresence>
        {modalDeleteOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 px-4"
          >
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="bg-white rounded-xl p-6 max-w-sm w-full shadow-2xl border-t-4 border-red-600 text-center"
            >
              <Trash2 className="text-red-600 mx-auto mb-3" size={34} />
              <h3 className="text-base font-bold text-slate-900 mb-1">
                ¿Eliminar paralelo?
              </h3>
              <p className="text-xs text-slate-600 mb-4 leading-relaxed">
                Esta acción eliminará el paralelo{" "}
                <span className="font-semibold text-slate-800">
                  "{deleteData.descripcion}"
                </span>.
              </p>
              <div className="flex gap-2 w-full">
                <button
                  onClick={() => setModalDeleteOpen(false)}
                  className="flex-1 py-2 bg-slate-100 text-slate-700 text-xs font-semibold rounded-md hover:bg-slate-200 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleConfirmarEliminar}
                  className="flex-1 py-2 bg-red-600 text-white text-xs font-semibold rounded-md hover:bg-red-700 transition-colors"
                >
                  Eliminar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODAL DE NOTIFICACIONES GLOBAL (z-[100] SIEMPRE ARRIBA) */}
      <AnimatePresence>
        {modalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-[100] px-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-xl p-6 max-w-sm w-full text-center shadow-2xl border-t-4"
              style={{ borderTopColor: modalSuccess ? "#2563EB" : "#DC2626" }}
            >
              {modalSuccess ? (
                <CheckCircle2 className="text-blue-600 mx-auto mb-3" size={36} />
              ) : (
                <AlertCircle className="text-red-600 mx-auto mb-3" size={36} />
              )}
              <h3 className="text-base font-bold text-slate-900 mb-2">
                {modalSuccess ? "Operación Completada" : "Atención"}
              </h3>
              <p className="text-xs text-slate-600 mb-5 leading-relaxed whitespace-pre-line">
                {modalMessage}
              </p>
              <button
                onClick={() => setModalOpen(false)}
                className="px-5 py-2 bg-blue-600 text-white rounded-md text-xs font-semibold hover:bg-blue-700 transition-colors shadow-xs"
              >
                Cerrar
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
};