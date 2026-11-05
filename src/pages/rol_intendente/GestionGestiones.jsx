import React, { useEffect, useState } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar,
  PlusCircle,
  Search,
  Pencil,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Download,
  Layers,
  Lock,
  Unlock,
  ClipboardList,
  ShieldCheck,
} from "lucide-react";
import {
  getGestiones,
  createGestion,
  updateGestion,
  deleteGestion,
} from "../../api/api.gestion";

// Carga de imagen base64 para logo.png (Patrón institucional)
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

export const GestionGestiones = () => {
  const [gestiones, setGestiones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mensajeError, setMensajeError] = useState("");

  // Formulario agregar / editar gestiones
  const [formGestion, setFormGestion] = useState({
    gestion: "",
    detalle: "",
    token_activated: "f",
    cantidad_estudiantes: 15,
  });
  const [editId, setEditId] = useState(null);
  const esModoEdicion = editId !== null;

  const [search, setSearch] = useState("");

  // Modales de notificación
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMessage, setModalMessage] = useState("");
  const [modalSuccess, setModalSuccess] = useState(false);

  // Modal de confirmación para eliminar
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [gestionAEliminar, setGestionAEliminar] = useState(null);

  // Modal de confirmación para Habilitar/Deshabilitar Token (Cambio de estado)
  const [confirmTokenOpen, setConfirmTokenOpen] = useState(false);
  const [gestionACambiarEstado, setGestionACambiarEstado] = useState(null);

  const mostrarModal = (success, message) => {
    setModalSuccess(success);
    setModalMessage(message);
    setModalOpen(true);
  };

  // ==== Cargar gestiones desde la API ====
  const cargarGestiones = async () => {
    try {
      setLoading(true);
      setMensajeError("");
      const data = await getGestiones();
      setGestiones(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
      setMensajeError("No fue posible cargar el listado de gestiones.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarGestiones();
  }, []);

  const resetFormulario = () => {
    setFormGestion({
      gestion: "",
      detalle: "",
      token_activated: "f",
      cantidad_estudiantes: 15,
    });
    setEditId(null);
  };

  // ==== Agregar nueva gestión ====
  const handleAgregar = async () => {
    if (!formGestion.gestion.trim() || !formGestion.detalle.trim()) {
      mostrarModal(false, "Por favor complete los campos obligatorios antes de continuar.");
      return;
    }

    try {
      const payload = {
        gestion: formGestion.gestion.trim(),
        detalle: formGestion.detalle.trim(),
        token_activated: formGestion.token_activated || "f",
        cantidad_estudiantes: 15,
      };

      const nuevaCreada = await createGestion(payload);
      if (nuevaCreada) {
        setGestiones((prev) => [...prev, nuevaCreada]);
      } else {
        await cargarGestiones();
      }

      resetFormulario();
      mostrarModal(true, "Gestión académica registrada correctamente.");
    } catch (error) {
      console.error("Error al crear gestión:", error.response?.data || error);
      let msg = "Ocurrió un error al registrar la gestión.";
      if (error.response?.data?.message) {
        msg += `\nDetalle: ${error.response.data.message}`;
      }
      mostrarModal(false, msg);
    }
  };

  // ==== Eliminar gestión ====
  const solicitarEliminar = (gestionItem) => {
    setGestionAEliminar(gestionItem);
    setConfirmDeleteOpen(true);
  };

  const ejecutarEliminacion = async () => {
    if (!gestionAEliminar) return;
    const gestionId = gestionAEliminar.id;
    setConfirmDeleteOpen(false);

    try {
      await deleteGestion(gestionId);
      setGestiones((prev) => prev.filter((g) => g.id !== gestionId));
      mostrarModal(true, "La gestión ha sido eliminada permanentemente del sistema.");
    } catch (error) {
      console.error(error);
      let msg = "No fue posible eliminar la gestión.";
      if (error.response?.data?.message) {
        msg += `\nDetalle: ${error.response.data.message}`;
      }
      mostrarModal(false, msg);
    } finally {
      setGestionAEliminar(null);
    }
  };

  // ==== Cambiar Estado de Token (Habilitar / Deshabilitar de forma independiente) ====
  const solicitarCambioToken = (gestionItem) => {
    setGestionACambiarEstado(gestionItem);
    setConfirmTokenOpen(true);
  };

  const ejecutarCambioToken = async () => {
    if (!gestionACambiarEstado) return;
    const nuevoEstado = gestionACambiarEstado.token_activated === "t" ? "f" : "t";
    setConfirmTokenOpen(false);

    try {
      const payload = {
        gestion: gestionACambiarEstado.gestion,
        detalle: gestionACambiarEstado.detalle,
        token_activated: nuevoEstado,
        cantidad_estudiantes: gestionACambiarEstado.cantidad_estudiantes ?? 15,
      };

      await updateGestion(gestionACambiarEstado.id, payload);

      // Actualizar solo el estado de esta gestión de forma independiente
      setGestiones((prev) =>
        prev.map((g) => {
          if (g.id === gestionACambiarEstado.id) {
            return { ...g, token_activated: nuevoEstado };
          }
          return g;
        })
      );

      mostrarModal(true, `La gestión ${gestionACambiarEstado.gestion} ahora está ${nuevoEstado === "t" ? "ACTIVA" : "CERRADA"}.`);
    } catch (error) {
      console.error("Error al cambiar estado del token:", error);
      mostrarModal(false, "No se pudo actualizar el estado de la gestión.");
    } finally {
      setGestionACambiarEstado(null);
    }
  };

  // ==== Editar datos ====
  const handleEditar = (gestionItem) => {
    setEditId(gestionItem.id);
    setFormGestion({
      gestion: gestionItem.gestion || "",
      detalle: gestionItem.detalle || "",
      token_activated: gestionItem.token_activated || "f",
      cantidad_estudiantes: gestionItem.cantidad_estudiantes ?? 15,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleGuardarEdicion = async () => {
    if (!editId) return;
    if (!formGestion.gestion.trim() || !formGestion.detalle.trim()) {
      mostrarModal(false, "Los campos de gestión y detalle son obligatorios.");
      return;
    }

    try {
      const payload = {
        gestion: formGestion.gestion.trim(),
        detalle: formGestion.detalle.trim(),
        token_activated: formGestion.token_activated || "f",
        cantidad_estudiantes: formGestion.cantidad_estudiantes ?? 15,
      };

      const actualizado = await updateGestion(editId, payload);
      const resultadoFinal = actualizado || { id: editId, ...payload };

      setGestiones((prev) =>
        prev.map((g) => (g.id === editId ? { ...g, ...resultadoFinal } : g))
      );
      resetFormulario();
      mostrarModal(true, "Los datos de la gestión fueron actualizados correctamente.");
    } catch (error) {
      console.error("Error al actualizar gestión:", error.response?.data || error);
      let msg = "Ocurrió un error al actualizar la gestión.";
      if (error.response?.data?.message) msg += `\nDetalle: ${error.response.data.message}`;
      mostrarModal(false, msg);
    }
  };

  // ==== Buscar gestiones ====
  const gestionesFiltradas = gestiones.filter((g) => {
    const texto = `${g.gestion || ""} ${g.detalle || ""}`.toLowerCase();
    return texto.includes(search.toLowerCase().trim());
  });

  // ==== GENERAR PDF INSTITUCIONAL ====
  const INK = {
    navy: [15, 42, 74],
    gold: [184, 149, 46],
    ink: [28, 43, 58],
    slate: [91, 107, 124],
  };

  const COLEGIO_NOMBRE = "UNIDAD EDUCATIVA ROBERTO ALVARADO DAZA 'B'";

  const generarPDF = async () => {
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "letter",
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 16;

    const logoBase64 = await cargarImagenBase64("/logo.png");

    const frameOuter = 6;
    const frameInner = 8.6;
    doc.setDrawColor(...INK.navy);
    doc.setLineWidth(0.9);
    doc.rect(frameOuter, frameOuter, pageWidth - frameOuter * 2, pageHeight - frameOuter * 2);
    doc.setDrawColor(...INK.gold);
    doc.setLineWidth(0.3);
    doc.rect(frameInner, frameInner, pageWidth - frameInner * 2, pageHeight - frameInner * 2);

    let currentY = 20;
    if (logoBase64) {
      const logoHeaderSize = 20;
      doc.setDrawColor(...INK.gold);
      doc.setLineWidth(0.4);
      doc.circle(pageWidth / 2, currentY + logoHeaderSize / 2, logoHeaderSize / 2 + 1.6);
      doc.addImage(logoBase64, "PNG", (pageWidth - logoHeaderSize) / 2, currentY, logoHeaderSize, logoHeaderSize);
      currentY += logoHeaderSize + 6;
    }

    doc.setFont("times", "bold");
    doc.setFontSize(15);
    doc.setTextColor(...INK.navy);
    doc.text(COLEGIO_NOMBRE, pageWidth / 2, currentY, { align: "center" });

    currentY += 6;
    doc.setFont("times", "italic");
    doc.setFontSize(10.5);
    doc.setTextColor(...INK.gold);
    doc.text("Reporte Oficial de Gestiones Académicas", pageWidth / 2, currentY, { align: "center" });

    currentY += 5;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...INK.slate);
    doc.text(`REGISTRO INSTITUCIONAL   ·   FECHA DE EMISIÓN: ${new Date().toLocaleDateString("es-BO")}`, pageWidth / 2, currentY, { align: "center" });

    currentY += 9;

    const tableRows = gestionesFiltradas.map((g) => [
      g.gestion || "—",
      g.detalle || "—",
      g.token_activated === "t" ? "ACTIVA" : "CERRADA",
    ]);

    autoTable(doc, {
      startY: currentY,
      head: [["GESTIÓN", "DETALLE ACADÉMICO", "ESTADO"]],
      body: tableRows,
      theme: "grid",
      margin: { left: margin, right: margin },
      styles: {
        font: "helvetica",
        fontSize: 8.5,
        cellPadding: 3,
        textColor: INK.ink,
        halign: "left",
        valign: "middle",
        lineColor: [214, 211, 199],
        lineWidth: 0.15,
      },
      headStyles: {
        fillColor: INK.navy,
        textColor: [250, 248, 242],
        fontStyle: "bold",
        halign: "center",
      },
      columnStyles: {
        0: { cellWidth: 35, fontStyle: "bold", halign: "center" },
        1: { cellWidth: 105 },
        2: { cellWidth: 39.9, halign: "center", fontStyle: "bold" },
      },
      alternateRowStyles: { fillColor: [247, 244, 235] },
    });

    doc.save(`reporte_gestiones_${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#EEF3FC] via-[#E9F0FB] to-[#E3ECFA] text-slate-800 p-3 xs:p-4 sm:p-6 md:p-10 font-sans">
      
      {/* MODAL NOTIFICACIÓN */}
      <AnimatePresence>
        {modalOpen && (
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
              className="bg-gradient-to-br from-white to-slate-50 rounded-xl p-6 sm:p-7 max-w-sm w-full text-slate-800 shadow-2xl border-t-4"
              style={{ borderTopColor: modalSuccess ? "#2563EB" : "#DC2626" }}
            >
              <div className="flex flex-col items-center text-center">
                {modalSuccess ? (
                  <CheckCircle2 className="text-blue-600 mb-3" size={34} />
                ) : (
                  <AlertCircle className="text-red-600 mb-3" size={34} />
                )}
                <h3 className="text-base font-bold tracking-wide text-slate-900 mb-2">
                  {modalSuccess ? "Operación completada" : "Atención"}
                </h3>
                <p className="mb-5 whitespace-pre-line text-sm text-slate-700 leading-relaxed">
                  {modalMessage}
                </p>
                <button
                  onClick={() => setModalOpen(false)}
                  className="px-5 py-2 rounded-md bg-blue-600 text-white text-sm font-semibold tracking-wide hover:bg-blue-700 transition-colors shadow-xs"
                >
                  Cerrar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODAL ELIMINAR */}
      <AnimatePresence>
        {confirmDeleteOpen && (
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
              className="bg-white rounded-xl p-6 max-w-sm w-full shadow-2xl border-t-4 border-red-600"
            >
              <div className="flex flex-col items-center text-center">
                <Trash2 className="text-red-600 mb-3" size={34} />
                <h3 className="text-base font-bold text-slate-900 mb-1">
                  ¿Eliminar gestión?
                </h3>
                <p className="text-xs text-slate-600 mb-4 leading-relaxed">
                  Esta acción eliminará permanentemente la gestión{" "}
                  <span className="font-semibold text-slate-800">
                    "{gestionAEliminar?.gestion}"
                  </span>{" "}
                  del sistema.
                </p>
                <div className="flex gap-2 w-full">
                  <button
                    onClick={() => {
                      setConfirmDeleteOpen(false);
                      setGestionAEliminar(null);
                    }}
                    className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-md transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={ejecutarEliminacion}
                    className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-md transition-colors"
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODAL CAMBIAR TOKEN / ACTIVACIÓN */}
      <AnimatePresence>
        {confirmTokenOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 px-4"
          >
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-xl p-6 max-w-sm w-full shadow-2xl border-t-4 border-t-amber-500"
            >
              <div className="flex flex-col items-center text-center">
                <AlertCircle className="text-amber-500 mb-3" size={34} />
                <h3 className="text-base font-bold text-slate-900 mb-1">
                  ¿Cambiar estado de la gestión?
                </h3>
                <p className="text-xs text-slate-600 mb-4 leading-relaxed">
                  {gestionACambiarEstado?.token_activated === "t"
                    ? `¿Está seguro de deshabilitar la gestión "${gestionACambiarEstado?.gestion}"? Quedará en estado cerrada.`
                    : `¿Está seguro de habilitar la gestión "${gestionACambiarEstado?.gestion}" como ACTIVA?`}
                </p>
                <div className="flex items-center gap-2 w-full">
                  <button
                    onClick={() => {
                      setConfirmTokenOpen(false);
                      setGestionACambiarEstado(null);
                    }}
                    className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-md transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={ejecutarCambioToken}
                    className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-md transition-colors"
                  >
                    Confirmar
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-7xl mx-auto">
        {/* ENCABEZADO */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 border-b border-slate-300 pb-6 mb-6 sm:mb-8"
        >
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-lg bg-gradient-to-br from-blue-100 to-blue-200 border border-blue-300 flex items-center justify-center shrink-0 shadow-sm">
              <Calendar className="text-blue-700" size={24} />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] sm:text-xs uppercase tracking-[0.2em] text-blue-700 font-semibold mb-1">
                Panel administrativo · Configuración Institucional
              </p>
              <h1 className="text-lg xs:text-xl sm:text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">
                Gestión de Períodos Académicos
              </h1>
            </div>
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={generarPDF}
            className="flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white font-semibold rounded-md shadow-sm shadow-blue-200 px-5 py-2.5 text-xs tracking-wide transition-colors"
          >
            <Download size={15} /> Exportar Lista en PDF
          </motion.button>
        </motion.div>

        {/* TARJETAS KPI RESUMEN */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 md:grid-cols-2 gap-3 sm:gap-4 mb-6 sm:mb-8"
        >
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-xl p-3.5 sm:p-4 shadow-sm">
            <div className="flex items-center gap-2 text-blue-700 text-[11px] sm:text-xs uppercase tracking-wide font-semibold mb-2">
              <Layers size={14} /> Total Gestiones
            </div>
            <p className="text-xl sm:text-2xl font-bold text-slate-900">{gestiones.length}</p>
          </div>

          <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 border border-emerald-200 rounded-xl p-3.5 sm:p-4 shadow-sm">
            <div className="flex items-center gap-2 text-emerald-700 text-[11px] sm:text-xs uppercase tracking-wide font-semibold mb-2">
              <ShieldCheck size={14} /> Configuración de Sistema
            </div>
            <p className="text-xl sm:text-2xl font-bold text-slate-900">Períodos Lectivos</p>
          </div>
        </motion.div>

        {/* LAYOUT PRINCIPAL: LISTADO DE CARDS + FORMULARIO */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* COLUMNA IZQUIERDA: LISTADO */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="lg:col-span-2 bg-gradient-to-b from-white to-slate-50 border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col justify-between"
          >
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 sm:p-5 border-b border-slate-200 bg-gradient-to-r from-blue-50/70 to-transparent">
                <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2 tracking-wide uppercase">
                  <ClipboardList size={16} className="text-blue-600" />
                  Listado de gestiones
                </h2>

                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                  <input
                    type="text"
                    placeholder="Buscar gestión…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-md bg-white text-slate-800 border border-slate-300 text-sm focus:ring-2 focus:ring-blue-400/50 focus:border-blue-400 outline-none placeholder-slate-400 transition-all"
                  />
                </div>
              </div>

              {mensajeError && (
                <div className="mx-4 sm:mx-5 mt-4 flex items-start gap-2 text-red-800 text-sm bg-gradient-to-r from-red-50 to-rose-50 border border-red-200 px-4 py-3 rounded-lg">
                  <AlertCircle size={16} className="text-red-600 shrink-0 mt-0.5" />
                  {mensajeError}
                </div>
              )}

              {loading ? (
                <div className="text-center py-14 text-blue-700 text-sm font-medium">
                  Cargando gestiones académicas…
                </div>
              ) : (
                <div className="p-4 sm:p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {gestionesFiltradas.length > 0 ? (
                    gestionesFiltradas.map((g) => {
                      const esActiva = g.token_activated === "t";
                      return (
                        <motion.div
                          key={g.id}
                          whileHover={{ y: -2 }}
                          transition={{ duration: 0.2 }}
                          className={`bg-white rounded-xl p-4 border shadow-sm flex flex-col justify-between transition-all ${
                            esActiva ? "border-amber-400 ring-1 ring-amber-400/30" : "border-slate-200"
                          }`}
                        >
                          <div>
                            <div className="flex items-center justify-between gap-2 mb-2">
                              <h3 className="text-lg font-bold text-slate-900">{g.gestion}</h3>
                              <span
                                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                  esActiva
                                    ? "bg-emerald-50 text-emerald-700 border border-emerald-300"
                                    : "bg-slate-100 text-slate-600 border border-slate-300"
                                }`}
                              >
                                {esActiva ? <Unlock size={10} /> : <Lock size={10} />}
                                {esActiva ? "Activa" : "Cerrada"}
                              </span>
                            </div>
                            <p className="text-xs text-slate-600 line-clamp-3 mb-4 leading-relaxed">
                              {g.detalle || "Sin detalle."}
                            </p>
                          </div>

                          <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => handleEditar(g)}
                                title="Editar detalles"
                                className="p-2 rounded-md bg-gradient-to-br from-blue-50 to-blue-100 hover:from-blue-100 hover:to-blue-200 border border-blue-300 text-blue-600 hover:text-blue-700 transition-colors"
                              >
                                <Pencil size={14} />
                              </button>
                              <button
                                onClick={() => solicitarEliminar(g)}
                                title="Eliminar gestión"
                                className="p-2 rounded-md bg-gradient-to-br from-red-50 to-red-100 hover:from-red-100 hover:to-red-200 border border-red-300 text-red-600 hover:text-red-700 transition-colors"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>

                            <button
                              onClick={() => solicitarCambioToken(g)}
                              className={`px-3 py-1.5 rounded-md text-xs font-semibold tracking-wide transition-all shadow-xs ${
                                esActiva
                                  ? "bg-gradient-to-br from-red-50 to-red-100 hover:from-red-100 hover:to-red-200 border border-red-300 text-red-700"
                                  : "bg-gradient-to-br from-emerald-50 to-emerald-100 hover:from-emerald-100 hover:to-emerald-200 border border-emerald-300 text-emerald-700"
                              }`}
                            >
                              {esActiva ? "Deshabilitar" : "Habilitar"}
                            </button>
                          </div>
                        </motion.div>
                      );
                    })
                  ) : (
                    <div className="col-span-full text-center py-12 text-slate-500 text-sm italic">
                      No se encontraron gestiones que coincidan con la búsqueda.
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>

          {/* COLUMNA DERECHA: FORMULARIO */}
          <div className="flex flex-col gap-6">
            <motion.div
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.25 }}
              className="bg-gradient-to-br from-white to-blue-50/60 border border-slate-200 rounded-xl p-4 sm:p-5 shadow-sm"
            >
              <div className="flex items-center justify-between mb-4 gap-2">
                <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2 tracking-wide uppercase">
                  <PlusCircle size={16} className="text-blue-600" />
                  {esModoEdicion ? "Editar gestión" : "Nueva gestión"}
                </h2>
                {esModoEdicion && (
                  <span className="text-[10px] uppercase tracking-wider text-amber-800 font-semibold bg-gradient-to-r from-amber-100 to-amber-50 border border-amber-300 px-2 py-0.5 rounded-full whitespace-nowrap">
                    Editando
                  </span>
                )}
              </div>

              <div className="flex flex-col gap-3">
                <div>
                  <label className="block text-xs font-semibold text-blue-700 uppercase tracking-wide mb-1.5">
                    Año / Período (Gestión)
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. 2029"
                    value={formGestion.gestion}
                    onChange={(e) => setFormGestion({ ...formGestion, gestion: e.target.value })}
                    className="w-full p-2.5 rounded-md bg-white border border-slate-300 text-slate-800 text-sm placeholder-slate-400 focus:ring-2 focus:ring-blue-400/50 focus:border-blue-400 outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-blue-700 uppercase tracking-wide mb-1.5">
                    Detalle o Descripción
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Ej. GESTION ACADEMICA OFICIAL 2029"
                    value={formGestion.detalle}
                    onChange={(e) => setFormGestion({ ...formGestion, detalle: e.target.value })}
                    className="w-full p-2.5 rounded-md bg-white border border-slate-300 text-slate-800 text-sm placeholder-slate-400 focus:ring-2 focus:ring-blue-400/50 focus:border-blue-400 outline-none transition-all resize-none"
                  />
                </div>

                {/* Switch para Activar / Desactivar Token */}
                <div className="flex items-center justify-between p-3 rounded-md bg-slate-50 border border-slate-200">
                  <div>
                    <label className="block text-xs font-semibold text-blue-700 uppercase tracking-wide">
                      Estado Inicial
                    </label>
                    <p className="text-[11px] text-slate-500">
                      {formGestion.token_activated === "t" ? "Activa" : "Cerrada"}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setFormGestion({
                        ...formGestion,
                        token_activated: formGestion.token_activated === "t" ? "f" : "t",
                      })
                    }
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      formGestion.token_activated === "t" ? "bg-blue-600" : "bg-slate-300"
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                        formGestion.token_activated === "t" ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>
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
                  className="bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white font-semibold rounded-md shadow-sm shadow-blue-200 transition-colors duration-200 px-5 py-2 text-xs tracking-wide"
                >
                  {esModoEdicion ? "Guardar cambios" : "Registrar Gestión"}
                </motion.button>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
};