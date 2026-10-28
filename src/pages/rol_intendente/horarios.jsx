import React, { useEffect, useMemo, useState } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { motion, AnimatePresence } from "framer-motion";
import { Formik } from "formik";
import * as XLSX from "xlsx";
import {
  Upload,
  CalendarRange,
  Clock,
  Download,
  Users,
  CheckCircle2,
  AlertCircle,
  BookOpen,
  Layers,
  Pencil,
  Trash2,
  PlusCircle,
  X,
  Save,
  User2,
  Filter,
} from "lucide-react";

import {
  gethorarios,
  createhorarios,
  updatehorarios,
  deletehorarios,
} from "../../api/api.horarios";
import { getMaterias } from "../../api/api.materia";
import { getParalelos } from "../../api/api.paralelos";
import { getVistaProf } from "../../api/api.vistaprofesores";// 👈 API ajustada

const DIAS_SEMANA = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"];

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

async function leerHorariosDesdeExcel(file) {
  if (!(file instanceof File)) {
    throw new Error("El archivo seleccionado no es válido.");
  }

  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet);

  if (!rows || rows.length === 0) {
    throw new Error("El archivo Excel se encuentra vacío.");
  }

  return rows.map((r) => ({
    dia_semana: String(r.DIA || r.dia || r.Dia || "").trim(),
    hora_inicio: String(r.HORA_INICIO || r.hora_inicio || "").trim(),
    hora_fin: String(r.HORA_FIN || r.hora_fin || "").trim(),
    materia_id: r.MATERIA_ID || r.materia_id,
    prof_id: r.PROF_ID || r.prof_id,
  }));
}

export const GestionHorarios = () => {
  const [horariosList, setHorariosList] = useState([]);
  const [materias, setMaterias] = useState([]);
  const [paralelos, setParalelos] = useState([]);
  const [profesores, setProfesores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mensaje, setMensaje] = useState("");

  // Modos y Filtros
  const [modoExcel, setModoExcel] = useState(false);
  const [filtroParalelo, setFiltroParalelo] = useState("");
  const [filtroDia, setFiltroDia] = useState("");

  // Modales
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMessage, setModalMessage] = useState("");
  const [modalSuccess, setModalSuccess] = useState(false);

  // Modal Edición
  const [modalEditOpen, setModalEditOpen] = useState(false);
  const [editData, setEditData] = useState({
    horario_id: null,
    paralelo_id: "",
    materia_id: "",
    prof_id: "",
    dia_semana: "Lunes",
    hora_inicio: "08:00",
    hora_fin: "09:00",
  });

  // Modal Eliminar
  const [modalDeleteOpen, setModalDeleteOpen] = useState(false);
  const [deleteData, setDeleteData] = useState({
    horario_id: null,
    materia_nombre: "",
    paralelo_nombre: "",
  });

  const formInicial = {
    paralelo_id: "",
    materia_id: "",
    prof_id: "",
    dia_semana: "Lunes",
    hora_inicio: "08:00",
    hora_fin: "09:00",
  };

  const cargarCatalogos = async () => {
    try {
      setLoading(true);
      const [resHorarios, resMaterias, resParalelos, resProf] =
        await Promise.all([
          gethorarios().catch(() => ({ data: [] })),
          getMaterias().catch(() => []),
          getParalelos().catch(() => []),
          getVistaProf().catch(() => []), // 👈 Uso de getVistaProf
        ]);

      setHorariosList(Array.isArray(resHorarios) ? resHorarios : resHorarios.data || []);
      setMaterias(Array.isArray(resMaterias) ? resMaterias : resMaterias.data || []);
      setParalelos(Array.isArray(resParalelos) ? resParalelos : resParalelos.data || []);

      const profArray = Array.isArray(resProf)
        ? resProf
        : resProf?.data && Array.isArray(resProf.data)
        ? resProf.data
        : [];
      setProfesores(profArray);
    } catch (err) {
      console.error("Error al cargar catálogos de horarios:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarCatalogos();
  }, []);

  const recargarHorarios = async () => {
    const res = await gethorarios();
    setHorariosList(Array.isArray(res) ? res : res.data || []);
  };

  // =========== CREACIÓN MANUAL ===========
  const handleGuardarNuevo = async (values, { resetForm }) => {
    try {
      if (!values.paralelo_id || !values.materia_id || !values.prof_id) {
        setModalSuccess(false);
        setModalMessage("Debe seleccionar Paralelo, Materia y Profesor obligatoriamente.");
        setModalOpen(true);
        return;
      }

      await createhorarios({
        paralelo_id: parseInt(values.paralelo_id, 10),
        materia_id: parseInt(values.materia_id, 10),
        prof_id: parseInt(values.prof_id, 10),
        dia_semana: values.dia_semana,
        hora_inicio: values.hora_inicio.length === 5 ? `${values.hora_inicio}:00` : values.hora_inicio,
        hora_fin: values.hora_fin.length === 5 ? `${values.hora_fin}:00` : values.hora_fin,
        activo: true,
      });

      await recargarHorarios();
      setModalSuccess(true);
      setModalMessage("Bloque de horario creado exitosamente.");
      setModalOpen(true);
      resetForm();
    } catch (error) {
      console.error(error);
      setModalSuccess(false);
      setModalMessage(
        error.response?.data?.message || "Ocurrió un error al registrar el horario."
      );
      setModalOpen(true);
    }
  };

  // =========== EDICIÓN ===========
  const handleOpenEdit = (h) => {
    setEditData({
      horario_id: h.horario_id,
      paralelo_id: h.paralelo_id,
      materia_id: h.materia_id,
      prof_id: h.prof_id,
      dia_semana: h.dia_semana,
      hora_inicio: h.hora_inicio ? h.hora_inicio.slice(0, 5) : "08:00",
      hora_fin: h.hora_fin ? h.hora_fin.slice(0, 5) : "09:00",
    });
    setModalEditOpen(true);
  };

  const handleConfirmarEdicion = async () => {
    if (!editData.horario_id) return;
    try {
      await updatehorarios(editData.horario_id, {
        paralelo_id: parseInt(editData.paralelo_id, 10),
        materia_id: parseInt(editData.materia_id, 10),
        prof_id: parseInt(editData.prof_id, 10),
        dia_semana: editData.dia_semana,
        hora_inicio: editData.hora_inicio.length === 5 ? `${editData.hora_inicio}:00` : editData.hora_inicio,
        hora_fin: editData.hora_fin.length === 5 ? `${editData.hora_fin}:00` : editData.hora_fin,
      });

      setModalEditOpen(false);
      await recargarHorarios();
      setModalSuccess(true);
      setModalMessage("Horario actualizado correctamente.");
      setModalOpen(true);
    } catch (error) {
      console.error(error);
      setModalSuccess(false);
      setModalMessage(
        error.response?.data?.message || "Error al actualizar el horario."
      );
      setModalOpen(true);
    }
  };

  // =========== ELIMINACIÓN ===========
  const handleOpenDelete = (h) => {
    setDeleteData({
      horario_id: h.horario_id,
      materia_nombre: h.materia_nombre,
      paralelo_nombre: h.paralelo_nombre,
    });
    setModalDeleteOpen(true);
  };

  const handleConfirmarEliminar = async () => {
    if (!deleteData.horario_id) return;
    try {
      await deletehorarios(deleteData.horario_id);
      setModalDeleteOpen(false);
      await recargarHorarios();
      setModalSuccess(true);
      setModalMessage("Bloque de horario eliminado correctamente.");
      setModalOpen(true);
    } catch (error) {
      console.error(error);
      setModalDeleteOpen(false);
      setModalSuccess(false);
      setModalMessage("Error al eliminar el registro.");
      setModalOpen(true);
    }
  };

  // =========== IMPORTAR EXCEL ===========
  const handleExcelUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!filtroParalelo) {
      setModalSuccess(false);
      setModalMessage("Por favor seleccione un paralelo antes de importar la plantilla de Excel.");
      setModalOpen(true);
      return;
    }

    try {
      setMensaje("Procesando plantilla de horarios...");
      const registros = await leerHorariosDesdeExcel(file);
      let creados = 0;

      for (const item of registros) {
        if (item.materia_id && item.prof_id && item.dia_semana) {
          await createhorarios({
            paralelo_id: parseInt(filtroParalelo, 10),
            materia_id: parseInt(item.materia_id, 10),
            prof_id: parseInt(item.prof_id, 10),
            dia_semana: item.dia_semana,
            hora_inicio: item.hora_inicio.length === 5 ? `${item.hora_inicio}:00` : item.hora_inicio,
            hora_fin: item.hora_fin.length === 5 ? `${item.hora_fin}:00` : item.hora_fin,
            activo: true,
          });
          creados++;
        }
      }

      await recargarHorarios();
      setMensaje("");
      setModalSuccess(true);
      setModalMessage(`Se registraron ${creados} bloques de horario correctamente desde Excel.`);
      setModalOpen(true);
    } catch (err) {
      console.error(err);
      setMensaje("");
      setModalSuccess(false);
      setModalMessage("Error al procesar la plantilla de Excel.");
      setModalOpen(true);
    } finally {
      e.target.value = "";
    }
  };

  // =========== FILTRADO DE HORARIOS ===========
  const horariosFiltrados = useMemo(() => {
    return horariosList.filter((h) => {
      const matchParalelo = !filtroParalelo || String(h.paralelo_id) === String(filtroParalelo);
      const matchDia = !filtroDia || h.dia_semana.toLowerCase().includes(filtroDia.toLowerCase());
      return matchParalelo && matchDia;
    });
  }, [horariosList, filtroParalelo, filtroDia]);

  // EXPORTAR PDF GENERAL DE HORARIOS
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

// Función auxiliar que dibuja los marcos de seguridad y marcas de agua en CUALQUIER página (Landscape)
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

  // Guilloche (detalles lineales en los bordes)
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
      const bigSize = 110;
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
    orientation: "landscape",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 16;

  // Cargar logo institucional desde public/logo.png
  const logoBase64 = await cargarImagenBase64("/logo.png");

  // Dibuja el fondo en la primera página
  dibujarFondoBoletin(doc, logoBase64);

  // ================== ENCABEZADO INSTITUCIONAL ==================
  let currentY = 16;
  if (logoBase64) {
    const logoHeaderSize = 18;
    doc.setDrawColor(...INK.gold);
    doc.setLineWidth(0.4);
    doc.circle(pageWidth / 2, currentY + logoHeaderSize / 2, logoHeaderSize / 2 + 1.4);
    doc.addImage(
      logoBase64,
      "PNG",
      (pageWidth - logoHeaderSize) / 2,
      currentY,
      logoHeaderSize,
      logoHeaderSize
    );
    currentY += logoHeaderSize + 5;
  }

  doc.setFont("times", "bold");
  doc.setFontSize(14);
  doc.setTextColor(...INK.navy);
  doc.text(COLEGIO_NOMBRE, pageWidth / 2, currentY, { align: "center" });

  currentY += 5;
  doc.setFont("times", "italic");
  doc.setFontSize(10);
  doc.setTextColor(...INK.gold);
  doc.text(
    "Reporte Consolidado de Horarios de Clases",
    pageWidth / 2,
    currentY,
    { align: "center" }
  );

  currentY += 4.5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...INK.slate);
  doc.text(
    `GESTIÓN ACADÉMICA ${new Date().getFullYear()}   ·   FECHA DE EMISIÓN: ${new Date().toLocaleDateString(
      "es-BO"
    )}`,
    pageWidth / 2,
    currentY,
    { align: "center" }
  );

  currentY += 4;
  const rt = currentY;
  doc.setDrawColor(...INK.gold);
  doc.setLineWidth(0.6);
  doc.line(margin, rt, pageWidth / 2 - 4, rt);
  doc.line(pageWidth / 2 + 4, rt, pageWidth - margin, rt);
  doc.setFillColor(...INK.gold);
  doc.triangle(pageWidth / 2 - 2, rt, pageWidth / 2 + 2, rt, pageWidth / 2, rt - 2, "F");
  doc.triangle(pageWidth / 2 - 2, rt, pageWidth / 2 + 2, rt, pageWidth / 2, rt + 2, "F");

  currentY += 6;

  // ================== DATOS Y CONSTRUCCIÓN DE TABLA ==================
  const tableRows = horariosFiltrados.map((h) => [
    (h.paralelo_nombre || "—").toUpperCase(),
    (h.dia_semana || "—").toUpperCase(),
    `${h.hora_inicio?.slice(0, 5) || "00:00"} - ${h.hora_fin?.slice(0, 5) || "00:00"}`,
    (h.materia_nombre || "—").toUpperCase(),
    `${h.prof_nombre || ""} ${h.prof_apellido || ""}`.trim().toUpperCase() || "—",
  ]);

  autoTable(doc, {
    startY: currentY,
    head: [["PARALELO / CURSO", "DÍA", "HORARIO", "MATERIA / ASIGNATURA", "DOCENTE A CARGO"]],
    body: tableRows,
    theme: "grid",
    margin: { left: margin, right: margin, top: 25, bottom: 20 },
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
      fontSize: 8,
      cellPadding: 3.2,
    },
    columnStyles: {
      0: { cellWidth: 45, halign: "center", fontStyle: "bold" },
      1: { cellWidth: 35, halign: "center" },
      2: { cellWidth: 42, halign: "center", fontStyle: "bold", textColor: INK.navy },
      3: { cellWidth: 70 },
      4: { cellWidth: 73, fontStyle: "bold" },
    },
    alternateRowStyles: { fillColor: [247, 244, 235] },

    // Dibuja el fondo y bordes en TODAS las páginas que cree autoTable
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
      `Documento Oficial de Horarios e Itinerarios Académicos   ·   Página ${i} de ${pageCount}`,
      pageWidth / 2,
      pageHeight - 9,
      { align: "center" }
    );
  }

  doc.save(`horarios_gestion_${new Date().getFullYear()}.pdf`);
};
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#EEF3FC] via-[#E9F0FB] to-[#E3ECFA] text-slate-800 p-3 xs:p-4 sm:p-6 md:p-10 font-sans">
      
      {/* MODAL RESPUESTA ÉXITO / FALLIDO */}
      <AnimatePresence>
        {modalOpen && (
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
              style={{ borderTopColor: modalSuccess ? "#2563EB" : "#DC2626" }}
            >
              {modalSuccess ? (
                <CheckCircle2 className="text-blue-600 mx-auto mb-3" size={36} />
              ) : (
                <AlertCircle className="text-red-600 mx-auto mb-3" size={36} />
              )}
              <h3 className="text-base font-bold text-slate-900 mb-2">
                {modalSuccess ? "Operación Exitosa" : "Atención / Error"}
              </h3>
              <p className="text-xs text-slate-600 mb-5 leading-relaxed">
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

      {/* MODAL EDITAR HORARIO */}
      <AnimatePresence>
        {modalEditOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 px-4"
          >
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-xl p-5 sm:p-6 max-w-md w-full shadow-2xl border-t-4 border-blue-600 text-slate-800"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Pencil size={15} className="text-blue-600" /> Modificar Bloque de Horario
                </h3>
                <button onClick={() => setModalEditOpen(false)} className="text-slate-400 hover:text-slate-600">
                  <X size={16} />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block font-semibold text-blue-700 uppercase mb-1">Paralelo</label>
                  <select
                    value={editData.paralelo_id}
                    onChange={(e) => setEditData({ ...editData, paralelo_id: e.target.value })}
                    className="w-full p-2 bg-white border border-slate-300 rounded-md outline-none"
                  >
                    <option value="">Seleccione Paralelo</option>
                    {paralelos.map((p) => (
                      <option key={p.paralelo_id} value={p.paralelo_id}>{p.descripcion}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-blue-700 uppercase mb-1">Materia</label>
                  <select
                    value={editData.materia_id}
                    onChange={(e) => setEditData({ ...editData, materia_id: e.target.value })}
                    className="w-full p-2 bg-white border border-slate-300 rounded-md outline-none"
                  >
                    <option value="">Seleccione Materia</option>
                    {materias.map((m) => (
                      <option key={m.materia_id} value={m.materia_id}>{m.nombre.toUpperCase()}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-blue-700 uppercase mb-1">Profesor / Docente</label>
                  <select
                    value={editData.prof_id}
                    onChange={(e) => setEditData({ ...editData, prof_id: e.target.value })}
                    className="w-full p-2 bg-white border border-slate-300 rounded-md outline-none"
                  >
                    <option value="">Seleccione Profesor</option>
                    {profesores.map((pf) => (
                      <option key={pf.prof_id} value={pf.prof_id}>
                        {pf.nombre.toUpperCase()} {pf.apellido.toUpperCase()}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block font-semibold text-blue-700 uppercase mb-1">Día</label>
                    <select
                      value={editData.dia_semana}
                      onChange={(e) => setEditData({ ...editData, dia_semana: e.target.value })}
                      className="w-full p-2 bg-white border border-slate-300 rounded-md outline-none"
                    >
                      {DIAS_SEMANA.map((d) => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-blue-700 uppercase mb-1">Hora Inicio</label>
                    <input
                      type="time"
                      value={editData.hora_inicio}
                      onChange={(e) => setEditData({ ...editData, hora_inicio: e.target.value })}
                      className="w-full p-2 bg-white border border-slate-300 rounded-md outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-blue-700 uppercase mb-1">Hora Fin</label>
                    <input
                      type="time"
                      value={editData.hora_fin}
                      onChange={(e) => setEditData({ ...editData, hora_fin: e.target.value })}
                      className="w-full p-2 bg-white border border-slate-300 rounded-md outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="mt-5 flex justify-end gap-2 border-t border-slate-100 pt-3">
                <button
                  onClick={() => setModalEditOpen(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-md text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleConfirmarEdicion}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md text-xs font-semibold flex items-center gap-1.5"
                >
                  <Save size={14} /> Guardar Cambios
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODAL ELIMINAR HORARIO */}
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
              className="bg-white rounded-xl p-6 max-w-sm w-full shadow-2xl border-t-4 border-red-600 text-center"
            >
              <Trash2 className="text-red-600 mx-auto mb-3" size={34} />
              <h3 className="text-base font-bold text-slate-900 mb-1">¿Eliminar horario?</h3>
              <p className="text-xs text-slate-600 mb-4">
                Se eliminará el bloque de la materia{" "}
                <span className="font-bold text-slate-800">"{deleteData.materia_nombre}"</span> del paralelo{" "}
                <span className="font-bold text-slate-800">{deleteData.paralelo_nombre}</span>.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setModalDeleteOpen(false)}
                  className="flex-1 py-2 bg-slate-100 text-slate-700 text-xs font-semibold rounded-md"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleConfirmarEliminar}
                  className="flex-1 py-2 bg-red-600 text-white text-xs font-semibold rounded-md"
                >
                  Eliminar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CONTENEDOR PRINCIPAL */}
      <div className="max-w-7xl mx-auto">
        
        {/* CABECERA */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 border-b border-slate-300 pb-6 mb-6"
        >
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-lg bg-gradient-to-br from-blue-100 to-blue-200 border border-blue-300 flex items-center justify-center shrink-0 shadow-sm">
              <CalendarRange className="text-blue-700" size={24} />
            </div>
            <div>
              <p className="text-[10px] sm:text-xs uppercase tracking-[0.2em] text-blue-700 font-semibold mb-1">
                Gestión Institucional · Dirección
              </p>
              <h1 className="text-lg xs:text-xl sm:text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">
                Planificación de Horarios Escolares
              </h1>
            </div>
          </div>

          <div className="flex gap-2">
           

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={generarPDF}
              className="flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-blue-500 text-white font-semibold rounded-md shadow-sm px-4 py-2 text-xs tracking-wide"
            >
              <Download size={14} /> Exportar PDF
            </motion.button>
          </div>
        </motion.div>

        {/* TARJETAS RESUMEN / KPIS */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-6">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-xl p-3.5 shadow-sm">
            <div className="flex items-center gap-2 text-blue-700 text-[11px] uppercase font-semibold mb-1">
              <Clock size={14} /> Total Bloques
            </div>
            <p className="text-xl font-bold text-slate-900">{horariosList.length}</p>
          </div>

          <div className="bg-gradient-to-br from-sky-50 to-sky-100 border border-sky-200 rounded-xl p-3.5 shadow-sm">
            <div className="flex items-center gap-2 text-sky-700 text-[11px] uppercase font-semibold mb-1">
              <Layers size={14} /> Paralelos Activos
            </div>
            <p className="text-xl font-bold text-slate-900">{paralelos.length}</p>
          </div>

          <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 border border-emerald-200 rounded-xl p-3.5 shadow-sm">
            <div className="flex items-center gap-2 text-emerald-700 text-[11px] uppercase font-semibold mb-1">
              <BookOpen size={14} /> Asignaturas
            </div>
            <p className="text-xl font-bold text-slate-900">{materias.length}</p>
          </div>

          <div className="bg-gradient-to-br from-amber-50 to-amber-100 border border-amber-200 rounded-xl p-3.5 shadow-sm">
            <div className="flex items-center gap-2 text-amber-700 text-[11px] uppercase font-semibold mb-1">
              <Users size={14} /> Profesores
            </div>
            <p className="text-xl font-bold text-slate-900">{profesores.length}</p>
          </div>
        </div>

        {mensaje && (
          <div className="bg-blue-50 border border-blue-200 text-blue-800 text-xs font-semibold p-3 rounded-lg mb-6 text-center">
            {mensaje}
          </div>
        )}

        {/* MODO CARGA (MANUAL O EXCEL) */}
        <div className="mb-8">
          {modoExcel ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-gradient-to-br from-white to-amber-50/50 border border-amber-200 rounded-xl p-5 shadow-sm max-w-3xl mx-auto"
            >
              <h2 className="text-xs font-bold text-slate-800 flex items-center gap-2 uppercase mb-3">
                <Upload size={16} className="text-amber-600" /> Importar Horarios por Lote (Excel)
              </h2>

              <div className="mb-4">
                <label className="block text-xs font-semibold text-blue-700 uppercase mb-1">
                  Seleccione el Paralelo Destino
                </label>
                <select
                  value={filtroParalelo}
                  onChange={(e) => setFiltroParalelo(e.target.value)}
                  className="w-full p-2.5 rounded-md bg-white border border-slate-300 text-xs outline-none"
                >
                  <option value="">-- Seleccione Paralelo --</option>
                  {paralelos.map((p) => (
                    <option key={p.paralelo_id} value={p.paralelo_id}>{p.descripcion}</option>
                  ))}
                </select>
              </div>

              <label className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-amber-300 rounded-xl cursor-pointer bg-white hover:bg-amber-50/50 transition-colors text-center">
                <Upload size={32} className="text-amber-600 mb-2" />
                <span className="text-xs font-bold text-slate-800">Cargar archivo Excel (.xlsx, .xls)</span>
                <span className="text-[11px] text-slate-500 mt-1">
                  Columnas requeridas: DIA, HORA_INICIO, HORA_FIN, MATERIA_ID, PROF_ID
                </span>
                <input type="file" accept=".xlsx,.xls" onChange={handleExcelUpload} className="hidden" />
              </label>
            </motion.div>
          ) : (
            <Formik initialValues={formInicial} enableReinitialize={true} onSubmit={handleGuardarNuevo}>
              {({ handleChange, handleSubmit, values }) => (
                <motion.form
                  onSubmit={handleSubmit}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-gradient-to-br from-white to-blue-50/50 border border-slate-200 rounded-xl p-5 shadow-sm max-w-4xl mx-auto"
                >
                  <h2 className="text-xs font-bold text-slate-800 flex items-center gap-2 uppercase mb-4">
                    <PlusCircle size={16} className="text-blue-600" /> Registrar Nuevo Bloque de Horario
                  </h2>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-blue-700 uppercase mb-1">
                        Paralelo / Curso
                      </label>
                      <select
                        name="paralelo_id"
                        value={values.paralelo_id}
                        onChange={handleChange}
                        className="w-full p-2.5 rounded-md bg-white border border-slate-300 text-xs outline-none"
                      >
                        <option value="">-- Seleccionar --</option>
                        {paralelos.map((p) => (
                          <option  key={p.paralelo_id} value={p.paralelo_id}>{p.descripcion}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-blue-700 uppercase mb-1">
                        Materia
                      </label>
                      <select
                        name="materia_id"
                        value={values.materia_id}
                        onChange={handleChange}
                        className="w-full p-2.5 rounded-md bg-white border border-slate-300 text-xs outline-none"
                      >
                        <option value="">-- Seleccionar --</option>
                        {materias.map((m) => (
                          <option key={m.materia_id} value={m.materia_id}>{m.nombre.toUpperCase()}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-blue-700 uppercase mb-1">
                        Profesor
                      </label>
                      <select
                        name="prof_id"
                        value={values.prof_id}
                        onChange={handleChange}
                        className="w-full p-2.5 rounded-md bg-white border border-slate-300 text-xs outline-none"
                      >
                        <option value="">-- Seleccionar Profesor --</option>
                        {profesores.map((pf) => (
                          <option key={pf.prof_id} value={pf.prof_id}>
                            {pf.nombre.toUpperCase()} {pf.apellido.toUpperCase()}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                    <div>
                      <label className="block text-[11px] font-semibold text-blue-700 uppercase mb-1">
                        Día de la Semana
                      </label>
                      <select
                        name="dia_semana"
                        value={values.dia_semana}
                        onChange={handleChange}
                        className="w-full p-2.5 rounded-md bg-white border border-slate-300 text-xs outline-none"
                      >
                        {DIAS_SEMANA.map((d) => (
                          <option key={d} value={d}>{d}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-blue-700 uppercase mb-1">
                        Hora Inicio
                      </label>
                      <input
                        type="time"
                        name="hora_inicio"
                        value={values.hora_inicio}
                        onChange={handleChange}
                        className="w-full p-2 rounded-md bg-white border border-slate-300 text-xs outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-blue-700 uppercase mb-1">
                        Hora Fin
                      </label>
                      <input
                        type="time"
                        name="hora_fin"
                        value={values.hora_fin}
                        onChange={handleChange}
                        className="w-full p-2 rounded-md bg-white border border-slate-300 text-xs outline-none"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 text-white font-semibold rounded-md text-xs uppercase tracking-wide transition-colors"
                  >
                    Guardar Bloque de Horario
                  </button>
                </motion.form>
              )}
            </Formik>
          )}
        </div>

        {/* TABLA CONSOLIDADA DE HORARIOS */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-gradient-to-b from-white to-slate-50 border border-slate-200 rounded-xl shadow-sm overflow-hidden"
        >
          {/* BARRA DE BÚSQUEDA Y FILTROS */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 border-b border-slate-200 bg-gradient-to-r from-blue-50/70 to-transparent">
            <h2 className="text-xs font-bold text-slate-800 flex items-center gap-2 uppercase">
              <CalendarRange size={16} className="text-blue-600" />
              Horarios Programados ({horariosFiltrados.length})
            </h2>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5 bg-white border border-slate-300 rounded-md px-2 py-1">
                <Filter size={13} className="text-slate-400" />
                <select
                  value={filtroParalelo}
                  onChange={(e) => setFiltroParalelo(e.target.value)}
                  className="text-xs bg-transparent outline-none text-slate-700"
                >
                  <option value="">Todos los Paralelos</option>
                  {paralelos.map((p) => (
                    <option key={p.paralelo_id} value={p.paralelo_id}>{p.descripcion}</option>
                  ))}
                </select>
              </div>

              <select
                value={filtroDia}
                onChange={(e) => setFiltroDia(e.target.value)}
                className="text-xs bg-white border border-slate-300 rounded-md px-2 py-1 outline-none text-slate-700"
              >
                <option value="">Todos los Días</option>
                {DIAS_SEMANA.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-12 text-blue-700 text-xs font-semibold">
              Cargando horarios...
            </div>
          ) : horariosFiltrados.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-xs italic">
              No hay bloques de horario registrados para los filtros seleccionados.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-xs">
                <thead className="bg-gradient-to-r from-blue-100 to-sky-100 text-blue-900 border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4 text-left font-bold uppercase">Paralelo</th>
                    <th className="py-3 px-4 text-center font-bold uppercase">Día</th>
                    <th className="py-3 px-4 text-center font-bold uppercase">Horario</th>
                    <th className="py-3 px-4 text-left font-bold uppercase">Materia</th>
                    <th className="py-3 px-4 text-left font-bold uppercase">Profesor</th>
                    <th className="py-3 px-4 text-center font-bold uppercase">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {horariosFiltrados.map((h) => (
                    <tr key={h.horario_id} className="hover:bg-blue-50/40 transition-colors">
                      <td className="py-3 px-4 font-bold text-blue-900">
                        {h.paralelo_nombre}
                      </td>

                      <td className="py-3 px-4 text-center">
                        <span className="text-[10px] uppercase font-bold text-slate-700 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full">
                          {h.dia_semana}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-center font-bold text-slate-800">
                        <span className="inline-flex items-center gap-1 bg-blue-50 border border-blue-200 text-blue-800 px-2 py-0.5 rounded-md">
                          <Clock size={12} className="text-blue-600" />
                          {h.hora_inicio?.slice(0, 5)} - {h.hora_fin?.slice(0, 5)}
                        </span>
                      </td>

                      <td className="py-3 px-4 font-extrabold text-slate-900 uppercase">
                        {h.materia_nombre}
                      </td>

                      <td className="py-3 px-4 text-slate-600 font-medium uppercase">
                        <div className="flex items-center gap-1.5">
                          <User2 size={13} className="text-slate-400" />
                          <span>{h.prof_nombre} {h.prof_apellido}</span>
                        </div>
                      </td>

                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleOpenEdit(h)}
                            className="p-1.5 rounded bg-amber-50 border border-amber-300 text-amber-700 hover:bg-amber-100 transition-colors"
                            title="Editar horario"
                          >
                            <Pencil size={13} />
                          </button>
                          <button
                            onClick={() => handleOpenDelete(h)}
                            className="p-1.5 rounded bg-red-50 border border-red-300 text-red-700 hover:bg-red-100 transition-colors"
                            title="Eliminar horario"
                          >
                            <Trash2 size={13} />
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
    </div>
  );
};