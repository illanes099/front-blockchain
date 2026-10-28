import React, { useEffect, useMemo, useState } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { motion, AnimatePresence } from "framer-motion";
import {
  GraduationCap,
  UserPlus,
  Search,
  Pencil,
  Trash2,
  KeyRound,
  IdCard,
  CheckCircle2,
  AlertCircle,
  Users,
  Download,
  ClipboardList,
  ShieldCheck,
} from "lucide-react";

import {
  getUsuarios,
  createUsuario,
  updateUsuarioById,
  deleteUsuarioById,
} from "../../api/api.usuario";

// Helper slug para autogenerar username
function slug(str) {
  return String(str || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "");
}

const cargarImagenBase64 = (url) => {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0);
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
};

export const GestionEstudiantesCuentas = () => {
  const [estudiantes, setEstudiantes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mensajeError, setMensajeError] = useState("");

  // Formulario agregar / editar datos generales
  const [formEstudiante, setFormEstudiante] = useState({
    nombre: "",
    apellido: "",
    username: "",
  });
  const [editId, setEditId] = useState(null);
  const esModoEdicion = editId !== null;

  // Formulario independiente: actualizar contraseña
  const [passUsuarioId, setPassUsuarioId] = useState("");
  const [nuevaPassword, setNuevaPassword] = useState("");
  const [confirmarPassword, setConfirmarPassword] = useState("");

  const [search, setSearch] = useState("");

  // Modales
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMessage, setModalMessage] = useState("");
  const [modalSuccess, setModalSuccess] = useState(false);

  const [modalEliminar, setModalEliminar] = useState({
    open: false,
    id: null,
    nombreCompleto: "",
  });

  const mostrarModal = (success, message) => {
    setModalSuccess(success);
    setModalMessage(message);
    setModalOpen(true);
  };

  const cargarEstudiantes = async () => {
    try {
      setLoading(true);
      setMensajeError("");
      const res = await getUsuarios();
      const soloEstudiantes = (res.data || []).filter(
        (u) => u.rol && u.rol.toLowerCase() === "estudiante"
      );
      setEstudiantes(soloEstudiantes);
    } catch (error) {
      console.error(error);
      setMensajeError("No fue posible cargar el listado de cuentas de estudiantes.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarEstudiantes();
  }, []);

  const resetFormulario = () => {
    setFormEstudiante({ nombre: "", apellido: "", username: "" });
    setEditId(null);
  };

  const handleAgregar = async () => {
    if (!formEstudiante.nombre.trim() || !formEstudiante.apellido.trim()) {
      mostrarModal(false, "Por favor complete los campos de nombre y apellido.");
      return;
    }

    try {
      const usuariosResp = await getUsuarios();
      const usedUsernames = new Set(
        (usuariosResp.data || []).map((u) => String(u.username))
      );

      const primerNombre = String(formEstudiante.nombre || "").trim().split(" ")[0] || "";
      const primerApellido = String(formEstudiante.apellido || "").trim().split(" ")[0] || "";

      let baseUsername = slug(`${primerNombre}${primerApellido}`);
      if (!baseUsername) {
        baseUsername = slug(`${formEstudiante.nombre}${formEstudiante.apellido}`) || "estudiante";
      }

      let username = baseUsername;
      let contador = 1;
      while (usedUsernames.has(username)) {
        username = `${baseUsername}${contador}`;
        contador++;
      }

      const password = username;

      const payload = {
        nombre: formEstudiante.nombre.trim(),
        apellido: formEstudiante.apellido.trim(),
        username,
        password,
        rol: "estudiante",
        fecha_creacion: new Date(),
      };

      const res = await createUsuario(payload);
      const creado = res.data;

      if (creado && creado.usuario_id) {
        if (creado.rol?.toLowerCase() === "estudiante") {
          setEstudiantes((prev) => [...prev, creado]);
        }
      } else {
        await cargarEstudiantes();
      }

      resetFormulario();
      mostrarModal(
        true,
        `Cuenta de estudiante creada exitosamente.\n\nUsuario: ${username}\nContraseña inicial: ${password}`
      );
    } catch (error) {
      console.error("Error al crear usuario de estudiante:", error.response?.data || error);
      mostrarModal(false, "Ocurrió un error al registrar al estudiante.");
    }
  };

  const solicitarEliminacion = (est) => {
    setModalEliminar({
      open: true,
      id: est.usuario_id,
      nombreCompleto: `${est.nombre || ""} ${est.apellido || ""}`.trim(),
    });
  };

  const handleEliminarConfirmado = async () => {
    if (!modalEliminar.id) return;
    try {
      await deleteUsuarioById(modalEliminar.id);
      setEstudiantes((prev) => prev.filter((e) => e.usuario_id !== modalEliminar.id));
      if (passUsuarioId === String(modalEliminar.id)) setPassUsuarioId("");
      setModalEliminar({ open: false, id: null, nombreCompleto: "" });
      mostrarModal(true, "La cuenta de estudiante ha sido eliminada.");
    } catch (error) {
      console.error(error);
      setModalEliminar({ open: false, id: null, nombreCompleto: "" });
      mostrarModal(false, "No fue posible eliminar la cuenta.");
    }
  };

  const handleEditar = (est) => {
    setEditId(est.usuario_id);
    setFormEstudiante({
      nombre: est.nombre || "",
      apellido: est.apellido || "",
      username: est.username || "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleGuardarEdicion = async () => {
    if (!editId) return;
    if (!formEstudiante.nombre.trim() || !formEstudiante.apellido.trim() || !formEstudiante.username.trim()) {
      mostrarModal(false, "Todos los campos son obligatorios.");
      return;
    }

    try {
      const payload = {
        nombre: formEstudiante.nombre.trim(),
        apellido: formEstudiante.apellido.trim(),
        username: formEstudiante.username.trim(),
        rol: "estudiante",
      };

      const res = await updateUsuarioById(editId, payload);
      const actualizado = res.data || payload;

      setEstudiantes((prev) =>
        prev.map((e) => (e.usuario_id === editId ? { ...e, ...actualizado } : e))
      );
      resetFormulario();
      mostrarModal(true, "Los datos de la cuenta fueron actualizados correctamente.");
    } catch (error) {
      console.error(error);
      mostrarModal(false, "Ocurrió un error al actualizar los datos.");
    }
  };

  const handleActualizarPassword = async () => {
    if (!passUsuarioId) {
      mostrarModal(false, "Seleccione un estudiante de la lista.");
      return;
    }
    if (!nuevaPassword || nuevaPassword.length < 4) {
      mostrarModal(false, "La contraseña debe tener al menos 4 caracteres.");
      return;
    }
    if (nuevaPassword !== confirmarPassword) {
      mostrarModal(false, "Las contraseñas no coinciden.");
      return;
    }

    try {
      await updateUsuarioById(passUsuarioId, { password: nuevaPassword });
      const afectado = estudiantes.find(
        (e) => String(e.usuario_id) === String(passUsuarioId)
      );
      setPassUsuarioId("");
      setNuevaPassword("");
      setConfirmarPassword("");
      mostrarModal(
        true,
        `Contraseña actualizada para ${
          afectado ? `${afectado.nombre} ${afectado.apellido}` : "el estudiante"
        }.`
      );
    } catch (error) {
      console.error(error);
      mostrarModal(false, "Ocurrió un error al actualizar la contraseña.");
    }
  };

  const estudiantesFiltrados = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return estudiantes;
    return estudiantes.filter((e) => {
      const texto = `${e.nombre || ""} ${e.apellido || ""} ${e.username || ""}`.toLowerCase();
      return texto.includes(q);
    });
  }, [estudiantes, search]);

  const iniciales = (e) =>
    `${(e.nombre || "?").charAt(0)}${(e.apellido || "").charAt(0)}`.toUpperCase();

  const generarPDF = async () => {
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pageWidth = doc.internal.pageSize.getWidth();

    const logoBase64 = await cargarImagenBase64("/logo.png");
    if (logoBase64) {
      doc.addImage(logoBase64, "PNG", 14, 12, 20, 20);
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(15);
    doc.setTextColor(15, 23, 42);
    doc.text("UNIDAD EDUCATIVA INSTITUCIONAL", logoBase64 ? 38 : 14, 18);

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(51, 65, 85);
    doc.text("Listado de Cuentas de Acceso de Estudiantes", logoBase64 ? 38 : 14, 24);

    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(`Fecha de emisión: ${new Date().toLocaleDateString("es-BO")}`, logoBase64 ? 38 : 14, 29);

    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.4);
    doc.line(14, 35, pageWidth - 14, 35);

    const tableRows = estudiantesFiltrados.map((e) => [
      `${e.nombre || ""} ${e.apellido || ""}`.trim() || "—",
      e.username || "—",
      e.fecha_creacion
        ? new Date(e.fecha_creacion).toLocaleString("es-BO", {
            dateStyle: "short",
            timeStyle: "short",
          })
        : "—",
    ]);

    autoTable(doc, {
      startY: 40,
      head: [["Nombre Completo", "Nombre de Usuario", "Fecha de Registro"]],
      body: tableRows,
      theme: "grid",
      styles: { fontSize: 9, cellPadding: 3, textColor: [30, 41, 59] },
      headStyles: { fillColor: [37, 99, 235], textColor: [255, 255, 255], fontStyle: "bold" },
      columnStyles: { 0: { cellWidth: 90 }, 1: { cellWidth: 55 }, 2: { cellWidth: 37, halign: "center" } },
    });

    doc.save(`cuentas_estudiantes_${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#EEF3FC] via-[#E9F0FB] to-[#E3ECFA] text-slate-800 p-3 xs:p-4 sm:p-6 md:p-10 font-sans">
      <AnimatePresence>
        {modalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 px-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
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

      <AnimatePresence>
        {modalEliminar.open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 px-4"
          >
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-xl p-6 max-w-sm w-full shadow-2xl border-t-4 border-red-600 text-center"
            >
              <Trash2 className="text-red-600 mx-auto mb-3" size={34} />
              <h3 className="text-base font-bold text-slate-900 mb-1">
                ¿Eliminar cuenta?
              </h3>
              <p className="text-xs text-slate-600 mb-4 leading-relaxed">
                Esta acción eliminará el usuario de{" "}
                <span className="font-semibold text-slate-800">
                  "{modalEliminar.nombreCompleto}"
                </span>.
              </p>
              <div className="flex gap-2 w-full">
                <button
                  onClick={() => setModalEliminar({ open: false, id: null, nombreCompleto: "" })}
                  className="flex-1 py-2 bg-slate-100 text-slate-700 text-xs font-semibold rounded-md hover:bg-slate-200 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleEliminarConfirmado}
                  className="flex-1 py-2 bg-red-600 text-white text-xs font-semibold rounded-md hover:bg-red-700 transition-colors"
                >
                  Eliminar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 border-b border-slate-300 pb-6 mb-6 sm:mb-8"
        >
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-lg bg-gradient-to-br from-blue-100 to-blue-200 border border-blue-300 flex items-center justify-center shrink-0 shadow-sm">
              <GraduationCap className="text-blue-700" size={24} />
            </div>
            <div>
              <p className="text-[10px] sm:text-xs uppercase tracking-[0.2em] text-blue-700 font-semibold mb-1">
                Administración de Usuarios · Estudiantes
              </p>
              <h1 className="text-lg xs:text-xl sm:text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">
                Gestión de Cuentas y Accesos
              </h1>
            </div>
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={generarPDF}
            className="flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white font-semibold rounded-md shadow-sm px-5 py-2.5 text-xs tracking-wide transition-colors"
          >
            <Download size={15} /> Exportar Lista PDF
          </motion.button>
        </motion.div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-xl p-3.5 sm:p-4 shadow-sm">
            <div className="flex items-center gap-2 text-blue-700 text-[11px] uppercase font-semibold mb-2">
              <Users size={14} /> Total Cuentas
            </div>
            <p className="text-xl sm:text-2xl font-bold text-slate-900">{estudiantes.length}</p>
          </div>

          <div className="bg-gradient-to-br from-sky-50 to-sky-100 border border-sky-200 rounded-xl p-3.5 sm:p-4 shadow-sm">
            <div className="flex items-center gap-2 text-sky-700 text-[11px] uppercase font-semibold mb-2">
              <Search size={14} /> Coincidencias
            </div>
            <p className="text-xl sm:text-2xl font-bold text-slate-900">{estudiantesFiltrados.length}</p>
          </div>

          <div className="bg-gradient-to-br from-amber-50 to-amber-100 border border-amber-200 rounded-xl p-3.5 sm:p-4 shadow-sm">
            <div className="flex items-center gap-2 text-amber-700 text-[11px] uppercase font-semibold mb-2">
              <Pencil size={14} /> En Edición
            </div>
            <p className="text-xl sm:text-2xl font-bold text-slate-900">{esModoEdicion ? 1 : 0}</p>
          </div>

          <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 border border-emerald-200 rounded-xl p-3.5 sm:p-4 shadow-sm">
            <div className="flex items-center gap-2 text-emerald-700 text-[11px] uppercase font-semibold mb-2">
              <ShieldCheck size={14} /> Rol Asignado
            </div>
            <p className="text-xl sm:text-2xl font-bold text-slate-900">Estudiante</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="lg:col-span-2 bg-gradient-to-b from-white to-slate-50 border border-slate-200 rounded-xl shadow-sm overflow-hidden"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 sm:p-5 border-b border-slate-200 bg-gradient-to-r from-blue-50/70 to-transparent">
              <h2 className="text-xs font-bold text-slate-800 flex items-center gap-2 tracking-wide uppercase">
                <ClipboardList size={16} className="text-blue-600" />
                Cuentas de Estudiantes Registradas
              </h2>

              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                <input
                  type="text"
                  placeholder="Buscar estudiante…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-md bg-white text-slate-800 border border-slate-300 text-xs focus:ring-2 focus:ring-blue-400/50 outline-none"
                />
              </div>
            </div>

            {mensajeError && (
              <div className="mx-4 sm:mx-5 mt-4 flex items-start gap-2 text-red-800 text-xs bg-red-50 border border-red-200 px-4 py-3 rounded-lg">
                <AlertCircle size={16} className="text-red-600 shrink-0 mt-0.5" />
                {mensajeError}
              </div>
            )}

            {loading ? (
              <div className="text-center py-14 text-blue-700 text-sm font-medium">
                Cargando cuentas…
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-xs">
                  <thead className="bg-gradient-to-r from-blue-100 to-sky-100 text-blue-900 border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4 text-left font-bold uppercase">Estudiante</th>
                      <th className="py-3 px-4 text-left font-bold uppercase">Nombre de Usuario</th>
                      <th className="py-3 px-4 text-left font-bold uppercase">Fecha Registro</th>
                      <th className="py-3 px-4 text-center font-bold uppercase">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {estudiantesFiltrados.length > 0 ? (
                      estudiantesFiltrados.map((e) => (
                        <tr key={e.usuario_id} className="hover:bg-blue-50/50 transition-colors">
                          <td className="py-3 px-4 font-semibold text-slate-900">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-200 to-blue-300 border border-blue-300 flex items-center justify-center text-[11px] font-bold text-blue-800 shrink-0">
                                {iniciales(e)}
                              </div>
                              <span>{e.nombre} {e.apellido}</span>
                            </div>
                          </td>

                          <td className="py-3 px-4 text-slate-600 font-medium">{e.username}</td>

                          <td className="py-3 px-4 text-slate-500">
                            {e.fecha_creacion
                              ? new Date(e.fecha_creacion).toLocaleString("es-BO", {
                                  dateStyle: "short",
                                  timeStyle: "short",
                                })
                              : "—"}
                          </td>

                          <td className="py-3 px-4 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => handleEditar(e)}
                                className="p-1.5 rounded bg-blue-50 border border-blue-200 text-blue-600 hover:bg-blue-100 transition-colors"
                                title="Editar datos de cuenta"
                              >
                                <Pencil size={13} />
                              </button>
                              <button
                                onClick={() => setPassUsuarioId(String(e.usuario_id))}
                                className="p-1.5 rounded bg-amber-50 border border-amber-300 text-amber-600 hover:bg-amber-100 transition-colors"
                                title="Cambiar contraseña"
                              >
                                <KeyRound size={13} />
                              </button>
                              <button
                                onClick={() => solicitarEliminacion(e)}
                                className="p-1.5 rounded bg-red-50 border border-red-200 text-red-600 hover:bg-red-100 transition-colors"
                                title="Eliminar cuenta"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="p-12 text-center text-slate-400 italic">
                          No se encontraron estudiantes registrados.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </motion.div>

          {/* COLUMNA DERECHA */}
          <div className="flex flex-col gap-6">
            <motion.div
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-gradient-to-br from-white to-blue-50/60 border border-slate-200 rounded-xl p-4 sm:p-5 shadow-sm"
            >
              <div className="flex items-center justify-between mb-4 gap-2">
                <h2 className="text-xs font-bold text-slate-800 flex items-center gap-2 tracking-wide uppercase">
                  <UserPlus size={16} className="text-blue-600" />
                  {esModoEdicion ? "Editar Estudiante" : "Nuevo Estudiante"}
                </h2>
                {esModoEdicion && (
                  <span className="text-[10px] uppercase font-semibold text-amber-800 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded-full">
                    Editando
                  </span>
                )}
              </div>

              <div className="flex flex-col gap-3">
                <div>
                  <label className="block text-xs font-semibold text-blue-700 uppercase tracking-wide mb-1.5">
                    Nombre
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. Ana"
                    value={formEstudiante.nombre}
                    onChange={(e) => setFormEstudiante({ ...formEstudiante, nombre: e.target.value })}
                    className="w-full p-2.5 rounded-md bg-white border border-slate-300 text-slate-800 text-sm focus:ring-2 focus:ring-blue-400/50 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-blue-700 uppercase tracking-wide mb-1.5">
                    Apellido
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. Toro"
                    value={formEstudiante.apellido}
                    onChange={(e) => setFormEstudiante({ ...formEstudiante, apellido: e.target.value })}
                    className="w-full p-2.5 rounded-md bg-white border border-slate-300 text-slate-800 text-sm focus:ring-2 focus:ring-blue-400/50 outline-none"
                  />
                </div>

                {esModoEdicion && (
                  <div>
                    <label className="block text-xs font-semibold text-blue-700 uppercase tracking-wide mb-1.5">
                      Nombre de Usuario
                    </label>
                    <input
                      type="text"
                      value={formEstudiante.username}
                      onChange={(e) => setFormEstudiante({ ...formEstudiante, username: e.target.value })}
                      className="w-full p-2.5 rounded-md bg-white border border-slate-300 text-slate-800 text-sm focus:ring-2 focus:ring-blue-400/50 outline-none"
                    />
                  </div>
                )}
              </div>

              <div className="mt-5 flex flex-col-reverse sm:flex-row justify-end gap-2 border-t border-slate-200 pt-4">
                {esModoEdicion && (
                  <button
                    onClick={resetFormulario}
                    className="bg-slate-100 border border-slate-300 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-md text-xs font-semibold transition-colors"
                  >
                    Cancelar
                  </button>
                )}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={esModoEdicion ? handleGuardarEdicion : handleAgregar}
                  className="bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white font-semibold rounded-md shadow-sm px-5 py-2 text-xs tracking-wide"
                >
                  {esModoEdicion ? "Guardar cambios" : "Registrar Cuenta"}
                </motion.button>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-gradient-to-br from-white to-amber-50/60 border border-amber-200 rounded-xl p-4 sm:p-5 shadow-sm"
            >
              <h2 className="text-xs font-bold text-slate-800 flex items-center gap-2 tracking-wide uppercase mb-4">
                <KeyRound size={16} className="text-amber-600" />
                Actualizar contraseña
              </h2>

              <div className="flex flex-col gap-3">
                <div>
                  <label className="block text-xs font-semibold text-blue-700 uppercase tracking-wide mb-1.5">
                    Estudiante
                  </label>
                  <div className="relative">
                    <IdCard className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={15} />
                    <select
                      value={passUsuarioId}
                      onChange={(e) => setPassUsuarioId(e.target.value)}
                      className="w-full pl-9 pr-8 py-2.5 rounded-md bg-white border border-slate-300 text-slate-800 text-xs focus:ring-2 focus:ring-amber-400/50 outline-none truncate"
                    >
                      <option value="">Seleccione un estudiante…</option>
                      {estudiantes.map((e) => (
                        <option key={e.usuario_id} value={e.usuario_id}>
                          {e.nombre} {e.apellido} ({e.username})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-blue-700 uppercase tracking-wide mb-1.5">
                    Nueva contraseña
                  </label>
                  <input
                    type="password"
                    placeholder="Mínimo 4 caracteres"
                    value={nuevaPassword}
                    onChange={(e) => setNuevaPassword(e.target.value)}
                    className="w-full p-2.5 rounded-md bg-white border border-slate-300 text-slate-800 text-xs focus:ring-2 focus:ring-amber-400/50 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-blue-700 uppercase tracking-wide mb-1.5">
                    Confirmar contraseña
                  </label>
                  <input
                    type="password"
                    placeholder="Repita la contraseña"
                    value={confirmarPassword}
                    onChange={(e) => setConfirmarPassword(e.target.value)}
                    className="w-full p-2.5 rounded-md bg-white border border-slate-300 text-slate-800 text-xs focus:ring-2 focus:ring-amber-400/50 outline-none"
                  />
                </div>
              </div>

              <div className="mt-5 flex justify-end border-t border-slate-200 pt-4">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleActualizarPassword}
                  className="w-full sm:w-auto bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-600 hover:to-amber-500 text-white font-semibold rounded-md shadow-sm px-5 py-2 text-xs tracking-wide"
                >
                  Actualizar Contraseña
                </motion.button>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
};