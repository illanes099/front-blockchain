import React, { useEffect, useState, useMemo } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar as CalendarIcon,
  Search,
  Download,
  PlusCircle,
  Pencil,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Clock,
  CheckCheck,
  CalendarDays,
  FileText,
} from "lucide-react";

import {
  getCalendarios,
  createCalendarios,
  updateCalendarios,
  deleteCalendarios,
} from "../../api/api.calendario";

export const CalendarioEscolarDire = () => {
  // Estado de eventos desde backend
  const [eventos, setEventos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Formulario nuevo evento
  const [nuevoEvento, setNuevoEvento] = useState({
    descripcion: "",
    fecha: "",
  });

  // Estado de edición en línea
  const [editId, setEditId] = useState(null);
  const [editEvento, setEditEvento] = useState({
    descripcion: "",
    fecha: "",
  });

  // Buscador
  const [search, setSearch] = useState("");

  // Modales
  const [modalNotificacion, setModalNotificacion] = useState({
    open: false,
    success: true,
    message: "",
  });

  const [modalEliminar, setModalEliminar] = useState({
    open: false,
    id: null,
    descripcion: "",
  });

  const mostrarNotificacion = (success, message) => {
    setModalNotificacion({ open: true, success, message });
  };

  // ================== CARGAR EVENTOS ==================
  const cargarEventos = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getCalendarios();
      const data = res.data || [];

      const mapeados = data.map((c) => ({
        id: c.calendario_id,
        descripcion: c.descripcion || "",
        fecha: typeof c.fecha === "string" ? c.fecha.split("T")[0] : "",
      }));

      setEventos(mapeados);
    } catch (err) {
      console.error(err);
      setError("Ocurrió un error al cargar el calendario escolar.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarEventos();
  }, []);

  // ================== CREAR EVENTO ==================
  const handleAgregar = async () => {
    if (!nuevoEvento.descripcion.trim() || !nuevoEvento.fecha) {
      mostrarNotificacion(false, "Complete la descripción y la fecha del evento.");
      return;
    }

    try {
      const payload = {
        descripcion: nuevoEvento.descripcion.trim(),
        fecha: nuevoEvento.fecha,
      };
      await createCalendarios(payload);
      setNuevoEvento({ descripcion: "", fecha: "" });
      await cargarEventos();
      mostrarNotificacion(true, "Evento registrado correctamente en el calendario.");
    } catch (err) {
      console.error(err);
      mostrarNotificacion(false, "No se pudo registrar el evento. Intente nuevamente.");
    }
  };

  // ================== EDICIÓN ==================
  const handleIniciarEditar = (evento) => {
    setEditId(evento.id);
    setEditEvento({
      descripcion: evento.descripcion,
      fecha: evento.fecha,
    });
  };

  const handleGuardarEdicion = async (id) => {
    if (!editEvento.descripcion.trim() || !editEvento.fecha) {
      mostrarNotificacion(false, "La descripción y la fecha no pueden estar vacías.");
      return;
    }

    try {
      const payload = {
        descripcion: editEvento.descripcion.trim(),
        fecha: editEvento.fecha,
      };
      await updateCalendarios(id, payload);
      setEditId(null);
      await cargarEventos();
      mostrarNotificacion(true, "Evento actualizado correctamente.");
    } catch (err) {
      console.error(err);
      mostrarNotificacion(false, "Ocurrió un error al actualizar el evento.");
    }
  };

  // ================== ELIMINAR EVENTO ==================
  const confirmarEliminacion = (evento) => {
    setModalEliminar({
      open: true,
      id: evento.id,
      descripcion: evento.descripcion,
    });
  };

  const handleEliminarConfirmado = async () => {
    if (!modalEliminar.id) return;
    try {
      await deleteCalendarios(modalEliminar.id);
      setModalEliminar({ open: false, id: null, descripcion: "" });
      await cargarEventos();
      mostrarNotificacion(true, "El evento ha sido eliminado del calendario.");
    } catch (err) {
      console.error(err);
      setModalEliminar({ open: false, id: null, descripcion: "" });
      mostrarNotificacion(false, "Ocurrió un error al intentar eliminar el evento.");
    }
  };

  // ================== CLASIFICACIÓN DE EVENTOS ==================
  const hoyStr = useMemo(() => new Date().toISOString().split("T")[0], []);

  const eventosFiltrados = useMemo(() => {
    return eventos.filter((e) =>
      e.descripcion.toLowerCase().includes(search.toLowerCase())
    );
  }, [eventos, search]);

  // Ordenar próximos eventos por fecha ascendente
  const eventosProximos = useMemo(() => {
    return [...eventos]
      .filter((e) => e.fecha >= hoyStr)
      .sort((a, b) => a.fecha.localeCompare(b.fecha));
  }, [eventos, hoyStr]);

  const eventosConcluidosCount = useMemo(() => {
    return eventos.filter((e) => e.fecha < hoyStr).length;
  }, [eventos, hoyStr]);

  // Helper para cargar imagen como Base64 para jsPDF
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

  // ================== GENERAR PDF PROFESIONAL ==================
  /* ============================================================
   TOKENS DE DISEÑO — PALETA OFICIAL DIPLOMA Y CERTIFICACIÓN
   ============================================================ */
const INK = {
  navy: [15, 42, 74],
  navy2: [30, 58, 95],
  gold: [184, 149, 46],
  ink: [28, 43, 58],
  slate: [91, 107, 124],
  paper: [251, 249, 244],
  red: [178, 34, 34],
  emerald: [6, 95, 70],
};

const COLEGIO_NOMBRE = "UNIDAD EDUCATIVA ROBERTO ALVARADO DAZA 'B'";

// Función que dibuja el marco de seguridad y las marcas de agua en CUALQUIER página
const dibujarFondoBoletin = (doc, logoBase64) => {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // ================== MARCO DE SEGURIDAD CEREMONIAL ==================
  const frameOuter = 6;
  const frameInner = 8.6;
  doc.setDrawColor(...INK.navy);
  doc.setLineWidth(0.9);
  doc.rect(frameOuter, frameOuter, pageWidth - frameOuter * 2, pageHeight - frameOuter * 2);
  doc.setDrawColor(...INK.gold);
  doc.setLineWidth(0.3);
  doc.rect(frameInner, frameInner, pageWidth - frameInner * 2, pageHeight - frameInner * 2);

  // Guilloche
  doc.setDrawColor(...INK.gold);
  doc.setLineWidth(0.15);
  for (let x = frameInner + 4; x < pageWidth - frameInner - 4; x += 4) {
    doc.line(x, frameInner, x, frameInner + 1.3);
    doc.line(x, pageHeight - frameInner, x, pageHeight - frameInner - 1.3);
  }

  // ================== MARCAS DE AGUA (MOSAICO Y CENTRAL) ==================
  if (logoBase64) {
    try {
      doc.saveGraphicsState();
      if (doc.setGState) doc.setGState(new doc.GState({ opacity: 0.045 }));
      const wmSize = 34;
      const stepX = 52;
      const stepY = 62;
      let rowOffset = 0;
      for (let y = -10; y < pageHeight + 20; y += stepY) {
        for (let x = -10 + rowOffset; x < pageWidth + 20; x += stepX) {
          try {
            doc.addImage(logoBase64, "PNG", x, y, wmSize, wmSize, undefined, undefined, 28);
          } catch {
            doc.addImage(logoBase64, "PNG", x, y, wmSize, wmSize);
          }
        }
        rowOffset = rowOffset === 0 ? stepX / 2 : 0;
      }
      doc.restoreGraphicsState();
    } catch (err) {}

    try {
      doc.saveGraphicsState();
      if (doc.setGState) doc.setGState(new doc.GState({ opacity: 0.06 }));
      const bigSize = 120;
      doc.addImage(
        logoBase64,
        "PNG",
        (pageWidth - bigSize) / 2,
        (pageHeight - bigSize) / 2,
        bigSize,
        bigSize
      );
      doc.restoreGraphicsState();
    } catch {}
  }
};

const generarPDF = async () => {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "letter",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 16;

  // Cargar logo institucional desde public/logo.png
  const logoBase64 = await cargarImagenBase64("/logo.png");

  // Dibuja el marco y fondo en la primera página
  dibujarFondoBoletin(doc, logoBase64);

  // ================== ENCABEZADO INSTITUCIONAL ==================
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
  doc.text("Calendario General de Actividades Escolares", pageWidth / 2, currentY, { align: "center" });

  currentY += 5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...INK.slate);
  doc.text(
    `GESTIÓN ACADÉMICA ${new Date().getFullYear()}   ·   FECHA DE EMISIÓN: ${new Date().toLocaleDateString("es-BO")}`,
    pageWidth / 2,
    currentY,
    { align: "center" }
  );

  currentY += 4.5;
  const rt = currentY;
  doc.setDrawColor(...INK.gold);
  doc.setLineWidth(0.6);
  doc.line(margin, rt, pageWidth / 2 - 4, rt);
  doc.line(pageWidth / 2 + 4, rt, pageWidth - margin, rt);
  doc.setFillColor(...INK.gold);
  doc.triangle(pageWidth / 2 - 2, rt, pageWidth / 2 + 2, rt, pageWidth / 2, rt - 2.2, "F");
  doc.triangle(pageWidth / 2 - 2, rt, pageWidth / 2 + 2, rt, pageWidth / 2, rt + 2.2, "F");

  currentY += 7;

  // ================== PREPARAR FILAS DE LA TABLA ==================
  const tableRows = eventosFiltrados.map((e) => {
    const esPasado = e.fecha < hoyStr;
    const estado = esPasado ? "Concluido" : "Programado";
    const fechaFormateada = e.fecha
      ? new Date(`${e.fecha}T00:00:00`).toLocaleDateString("es-BO", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })
      : "—";

    return [(e.descripcion || "ACTIVIDAD").toUpperCase(), fechaFormateada, estado];
  });

  autoTable(doc, {
    startY: currentY,
    head: [["DESCRIPCIÓN DE LA ACTIVIDAD / EVENTO", "FECHA", "ESTADO"]],
    body: tableRows,
    theme: "grid",
    margin: { left: margin, right: margin, top: 25, bottom: 20 },
    styles: {
      font: "helvetica",
      fontSize: 8.5,
      cellPadding: 3,
      textColor: INK.ink,
      valign: "middle",
      lineColor: [214, 211, 199],
      lineWidth: 0.15,
    },
    headStyles: {
      fillColor: INK.navy,
      textColor: [250, 248, 242],
      fontStyle: "bold",
      halign: "center",
      fontSize: 8,
      cellPadding: 3.2,
    },
    columnStyles: {
      0: { cellWidth: 110, fontStyle: "bold" },
      1: { cellWidth: 40, halign: "center" },
      2: { cellWidth: 31.9, halign: "center" },
    },
    didParseCell: (data) => {
      if (data.section === "body" && data.column.index === 2) {
        if (data.cell.raw === "Concluido") {
          data.cell.styles.textColor = INK.slate;
        } else {
          data.cell.styles.textColor = INK.emerald;
          data.cell.styles.fontStyle = "bold";
        }
      }
    },
    alternateRowStyles: { fillColor: [247, 244, 235] },

    // Renderiza marco y marcas de agua en TODAS las páginas que cree la tabla
    didDrawPage: (data) => {
      dibujarFondoBoletin(doc, logoBase64);

      doc.setDrawColor(...INK.gold);
      doc.setLineWidth(0.5);
      doc.line(
        margin,
        data.table.head[0].cells[0].y + data.table.head[0].height,
        pageWidth - margin,
        data.table.head[0].cells[0].y + data.table.head[0].height
      );
    },
  });

  // ================== PAGINACIÓN Y PIE DE PÁGINA ==================
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFont("times", "italic");
    doc.setFontSize(7.5);
    doc.setTextColor(...INK.slate);
    doc.text(
      `Documento Oficial de Dirección Académica   ·   Página ${i} de ${pageCount}`,
      pageWidth / 2,
      pageHeight - 10,
      { align: "center" }
    );
  }

  doc.save(`calendario_escolar_${new Date().getFullYear()}.pdf`);
};
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#EEF3FC] via-[#E9F0FB] to-[#E3ECFA] flex items-center justify-center p-4 font-sans">
        <div className="flex items-center gap-3 bg-white border border-slate-200 px-6 py-4 rounded-xl shadow-lg">
          <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-slate-700 text-sm font-semibold">
            Cargando calendario escolar…
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
            onClick={cargarEventos}
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
      {/* MODAL NOTIFICACIÓN */}
      <AnimatePresence>
        {modalNotificacion.open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 px-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-xl p-6 max-w-sm w-full text-center shadow-2xl border-t-4"
              style={{
                borderTopColor: modalNotificacion.success ? "#2563EB" : "#DC2626",
              }}
            >
              {modalNotificacion.success ? (
                <CheckCircle2 className="text-blue-600 mx-auto mb-3" size={36} />
              ) : (
                <AlertCircle className="text-red-600 mx-auto mb-3" size={36} />
              )}
              <h3 className="text-base font-bold text-slate-900 mb-2">
                {modalNotificacion.success ? "Operación exitosa" : "Atención"}
              </h3>
              <p className="text-sm text-slate-600 mb-5 leading-relaxed">
                {modalNotificacion.message}
              </p>
              <button
                onClick={() => setModalNotificacion({ ...modalNotificacion, open: false })}
                className="px-5 py-2 bg-blue-600 text-white rounded-md text-xs font-semibold hover:bg-blue-700 transition-colors"
              >
                Entendido
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODAL ELIMINAR */}
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
              exit={{ opacity: 0, y: 10 }}
              className="bg-white rounded-xl p-6 max-w-sm w-full shadow-2xl border-t-4 border-red-600"
            >
              <div className="flex flex-col items-center text-center">
                <Trash2 className="text-red-600 mb-3" size={34} />
                <h3 className="text-base font-bold text-slate-900 mb-1">
                  ¿Eliminar evento?
                </h3>
                <p className="text-xs text-slate-600 mb-4 leading-relaxed">
                  Esta acción eliminará el evento{" "}
                  <span className="font-semibold text-slate-800">
                    "{modalEliminar.descripcion}"
                  </span>{" "}
                  del calendario escolar.
                </p>
                <div className="flex gap-2 w-full">
                  <button
                    onClick={() => setModalEliminar({ open: false, id: null, descripcion: "" })}
                    className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-md transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleEliminarConfirmado}
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
              <CalendarIcon className="text-blue-700" size={24} />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] sm:text-xs uppercase tracking-[0.2em] text-blue-700 font-semibold mb-1">
                Panel administrativo · Planificación
              </p>
              <h1 className="text-lg xs:text-xl sm:text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">
                Calendario Escolar
              </h1>
            </div>
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={generarPDF}
            className="flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white font-semibold rounded-md shadow-sm shadow-blue-200 px-5 py-2.5 text-xs tracking-wide transition-colors"
          >
            <Download size={15} /> Exportar PDF Oficial
          </motion.button>
        </motion.div>

        {/* TARJETAS KPI RESUMEN */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8"
        >
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-xl p-3.5 sm:p-4 shadow-sm">
            <div className="flex items-center gap-2 text-blue-700 text-[11px] sm:text-xs uppercase tracking-wide font-semibold mb-2">
              <CalendarDays size={14} /> Total Eventos
            </div>
            <p className="text-xl sm:text-2xl font-bold text-slate-900">{eventos.length}</p>
          </div>

          <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 border border-emerald-200 rounded-xl p-3.5 sm:p-4 shadow-sm">
            <div className="flex items-center gap-2 text-emerald-700 text-[11px] sm:text-xs uppercase tracking-wide font-semibold mb-2">
              <Clock size={14} /> Próximos
            </div>
            <p className="text-xl sm:text-2xl font-bold text-slate-900">{eventosProximos.length}</p>
          </div>

          <div className="bg-gradient-to-br from-slate-100 to-slate-200/60 border border-slate-300/70 rounded-xl p-3.5 sm:p-4 shadow-sm">
            <div className="flex items-center gap-2 text-slate-600 text-[11px] sm:text-xs uppercase tracking-wide font-semibold mb-2">
              <CheckCheck size={14} /> Concluidos
            </div>
            <p className="text-xl sm:text-2xl font-bold text-slate-900">{eventosConcluidosCount}</p>
          </div>

          <div className="bg-gradient-to-br from-sky-50 to-sky-100 border border-sky-200 rounded-xl p-3.5 sm:p-4 shadow-sm">
            <div className="flex items-center gap-2 text-sky-700 text-[11px] sm:text-xs uppercase tracking-wide font-semibold mb-2">
              <Search size={14} /> Filtrados
            </div>
            <p className="text-xl sm:text-2xl font-bold text-slate-900">{eventosFiltrados.length}</p>
          </div>
        </motion.div>

        {/* LAYOUT PRINCIPAL DOS COLUMNAS */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* COLUMNA IZQUIERDA: FORMULARIO Y TABLA GENERAL */}
          <div className="lg:col-span-2 flex flex-col gap-6">
            {/* REGISTRAR EVENTO */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="bg-gradient-to-br from-white to-blue-50/50 border border-slate-200 rounded-xl p-4 sm:p-5 shadow-sm"
            >
              <h2 className="text-xs font-bold text-slate-800 flex items-center gap-2 tracking-wide uppercase mb-3">
                <PlusCircle size={16} className="text-blue-600" /> Nuevo Evento o Actividad
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <input
                    type="text"
                    placeholder="Ej. Aniversario de la Unidad Educativa…"
                    value={nuevoEvento.descripcion}
                    onChange={(e) => setNuevoEvento({ ...nuevoEvento, descripcion: e.target.value })}
                    className="w-full p-2.5 rounded-md bg-white border border-slate-300 text-slate-800 text-sm placeholder-slate-400 focus:ring-2 focus:ring-blue-400/50 focus:border-blue-400 outline-none transition-all"
                  />
                </div>
                <div>
                  <input
                    type="date"
                    value={nuevoEvento.fecha}
                    onChange={(e) => setNuevoEvento({ ...nuevoEvento, fecha: e.target.value })}
                    className="w-full p-2.5 rounded-md bg-white border border-slate-300 text-slate-800 text-sm focus:ring-2 focus:ring-blue-400/50 focus:border-blue-400 outline-none transition-all"
                  />
                </div>
              </div>

              <div className="mt-3 flex justify-end">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleAgregar}
                  className="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white font-semibold rounded-md shadow-sm shadow-blue-200 px-5 py-2 text-xs tracking-wide transition-colors"
                >
                  Agregar al Calendario
                </motion.button>
              </div>
            </motion.div>

            {/* TABLA PRINCIPAL DE EVENTOS */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="bg-gradient-to-b from-white to-slate-50 border border-slate-200 rounded-xl shadow-sm overflow-hidden"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 border-b border-slate-200 bg-gradient-to-r from-blue-50/70 to-transparent">
                <h2 className="text-xs font-bold text-slate-800 flex items-center gap-2 tracking-wide uppercase">
                  <FileText size={16} className="text-blue-600" /> Registro Completo de Eventos
                </h2>

                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                  <input
                    type="text"
                    placeholder="Buscar evento…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 rounded-md bg-white text-slate-800 border border-slate-300 text-xs focus:ring-2 focus:ring-blue-400/50 focus:border-blue-400 outline-none transition-all"
                  />
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-gradient-to-r from-blue-100 to-sky-100 text-blue-800 text-xs">
                    <tr>
                      <th className="py-3 px-4 text-left font-bold uppercase tracking-wider">Descripción</th>
                      <th className="py-3 px-4 text-center font-bold uppercase tracking-wider w-36">Fecha</th>
                      <th className="py-3 px-4 text-center font-bold uppercase tracking-wider w-28">Estado</th>
                      <th className="py-3 px-4 text-center font-bold uppercase tracking-wider w-28">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {eventosFiltrados.length > 0 ? (
                      eventosFiltrados.map((e) => {
                        const esPasado = e.fecha < hoyStr;
                        const esEditando = editId === e.id;

                        return (
                          <tr
                            key={e.id}
                            className={`transition-colors ${
                              esPasado ? "bg-slate-50/70 text-slate-500" : "hover:bg-blue-50/50 text-slate-800"
                            }`}
                          >
                            <td className="py-3 px-4 font-medium uppercase">
                              {esEditando ? (
                                <input
                                  type="text"
                                  value={editEvento.descripcion}
                                  onChange={(ev) =>
                                    setEditEvento({ ...editEvento, descripcion: ev.target.value })
                                  }
                                  className="w-full p-1.5 border border-blue-300 rounded bg-white text-slate-800 outline-none text-xs"
                                />
                              ) : (
                                <span className={esPasado ? "line-through text-slate-400" : ""}>
                                  {e.descripcion}
                                </span>
                              )}
                            </td>

                            <td className="py-3 px-4 text-center">
                              {esEditando ? (
                                <input
                                  type="date"
                                  value={editEvento.fecha}
                                  onChange={(ev) =>
                                    setEditEvento({ ...editEvento, fecha: ev.target.value })
                                  }
                                  className="p-1 border border-blue-300 rounded bg-white text-slate-800 outline-none text-xs"
                                />
                              ) : (
                                <span>{e.fecha || "—"}</span>
                              )}
                            </td>

                            <td className="py-3 px-4 text-center">
                              {esPasado ? (
                                <span className="inline-block text-[10px] uppercase font-bold text-slate-500 bg-slate-200/80 border border-slate-300 px-2 py-0.5 rounded-full">
                                  Concluido
                                </span>
                              ) : (
                                <span className="inline-block text-[10px] uppercase font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded-full">
                                  Programado
                                </span>
                              )}
                            </td>

                            <td className="py-3 px-4 text-center">
                              {esEditando ? (
                                <div className="flex items-center justify-center gap-1">
                                  <button
                                    onClick={() => handleGuardarEdicion(e.id)}
                                    className="p-1.5 rounded bg-emerald-100 border border-emerald-300 text-emerald-700 hover:bg-emerald-200 transition-colors"
                                    title="Guardar"
                                  >
                                    <CheckCheck size={14} />
                                  </button>
                                  <button
                                    onClick={() => setEditId(null)}
                                    className="p-1.5 rounded bg-slate-100 border border-slate-300 text-slate-600 hover:bg-slate-200 transition-colors"
                                    title="Cancelar"
                                  >
                                    <AlertCircle size={14} />
                                  </button>
                                </div>
                              ) : (
                                <div className="flex items-center justify-center gap-1.5">
                                  <button
                                    onClick={() => handleIniciarEditar(e)}
                                    className="p-1.5 rounded bg-amber-50 border border-amber-300 text-amber-700 hover:bg-amber-100 transition-colors"
                                    title="Editar evento"
                                  >
                                    <Pencil size={13} />
                                  </button>
                                  <button
                                    onClick={() => confirmarEliminacion(e)}
                                    className="p-1.5 rounded bg-red-50 border border-red-300 text-red-700 hover:bg-red-100 transition-colors"
                                    title="Eliminar evento"
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={4} className="py-8 text-center text-slate-400 italic">
                          No se encontraron eventos programados.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </motion.div>
          </div>

          {/* COLUMNA DERECHA: PRÓXIMOS ACONTECIMIENTOS */}
          <motion.div
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.25 }}
            className="bg-gradient-to-br from-white to-blue-50/50 border border-slate-200 rounded-xl p-4 sm:p-5 shadow-sm flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-4">
                <h2 className="text-xs font-bold text-slate-800 flex items-center gap-2 tracking-wide uppercase">
                  <Clock size={16} className="text-blue-600" /> Acontecimientos Próximos
                </h2>
                <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded-full">
                  {eventosProximos.length} pendiente(s)
                </span>
              </div>

              <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
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
                              ? "¡Hoy!"
                              : diasFaltantes === 1
                              ? "Mañana"
                              : `En ${diasFaltantes} días`}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 font-medium">
                          {new Date(`${ev.fecha}T00:00:00`).toLocaleDateString("es-BO", {
                            weekday: "long",
                            day: "numeric",
                            month: "long",
                            year: "numeric",
                          })}
                        </p>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-10 text-slate-400 text-xs italic">
                    No hay eventos programados a futuro.
                  </div>
                )}
              </div>
            </div>

           
          </motion.div>
        </div>
      </div>
    </div>
  );
};