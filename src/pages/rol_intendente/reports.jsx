import React, { useEffect, useState, useMemo } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { motion } from "framer-motion";
import {
  FileText,
  Search,
  Download,
  GraduationCap,
  Users,
  BookOpen,
  Filter,
  CheckCircle2,
  AlertCircle,
  Award,
} from "lucide-react";

import { getUsuarios } from "../../api/api.usuario";
import { getParalelos, getParaleloById } from "../../api/api.paralelos";
import { getEstudiantes } from "../../api/api.estudiante";
import { getCalificacionesMaterias } from "../../api/api.calificaciones";
import { getMaterias } from "../../api/api.materia";

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

// Helper para convertir el logo a Base64 para jsPDF
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

export const ReportesDire = () => {
  const [estudiantesData, setEstudiantesData] = useState([]);
  const [paralelosCatalogo, setParalelosCatalogo] = useState([]);
  const [materiasCatalogo, setMateriasCatalogo] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filtros
  const [filtroEstudiante, setFiltroEstudiante] = useState("");
  const [filtroParalelo, setFiltroParalelo] = useState("");
  const [filtroMateria, setFiltroMateria] = useState("");

  useEffect(() => {
    const getValuesUsers = async () => {
      try {
        setLoading(true);
        setError(null);

        const [
          responseUser,
          responseEstudiante,
          responseCalificaciones,
          responseParalelos,
          responseMaterias,
        ] = await Promise.all([
          getUsuarios(),
          getEstudiantes(),
          getCalificacionesMaterias(),
          getParalelos().catch(() => []),
          getMaterias().catch(() => []),
        ]);

        const users = (responseUser.data || responseUser || []).filter(
          (u) => u.rol && u.rol.toLowerCase() === "estudiante"
        );
        const estudiantes = responseEstudiante || [];
        const calificaciones = responseCalificaciones || [];

        // Guardar catálogos completos para los selectores
        const paralelosRaw = Array.isArray(responseParalelos)
          ? responseParalelos
          : responseParalelos.data || [];
        setParalelosCatalogo(paralelosRaw);

        const materiasRaw = Array.isArray(responseMaterias)
          ? responseMaterias
          : responseMaterias.data || [];
        setMateriasCatalogo(materiasRaw);

        const estudianteObj = [];

        for (let i = 0; i < estudiantes.length; i++) {
          const est = estudiantes[i];
          const user = users.find((u) => u.usuario_id === est.usuario_id);
          const nombreUsuario = user?.nombre ?? "";
          const apellidoUsuario = user?.apellido ?? "";
          const estudianteId = est.estudiante_id;

          // Procesamiento dinámico de la foto de perfil en Base64
          let fotoUrl = "";
          const fotoBD = est.foto || user?.foto;
          if (fotoBD) {
            if (typeof fotoBD === "object" && fotoBD.type === "Buffer" && Array.isArray(fotoBD.data)) {
              try {
                const uint8Array = new Uint8Array(fotoBD.data);
                let binaryString = "";
                const chunkSize = 8192;
                for (let j = 0; j < uint8Array.length; j += chunkSize) {
                  const chunk = uint8Array.subarray(j, j + chunkSize);
                  binaryString += String.fromCharCode.apply(null, chunk);
                }
                fotoUrl = `data:image/jpeg;base64,${btoa(binaryString)}`;
              } catch {
                fotoUrl = "";
              }
            } else if (typeof fotoBD === "string" && fotoBD.length > 0) {
              fotoUrl = fotoBD.startsWith("data:image") ? fotoBD : `data:image/jpeg;base64,${fotoBD}`;
            }
          }

          const resultCalificacionesFiltradas = calificaciones.filter(
            (c) => c.estudiante_id === estudianteId
          );

          let paraleloDesc = "S/N";
          try {
            const resultParalelo = await getParaleloById(est.paralelo_id);
            paraleloDesc = resultParalelo?.descripcion || "S/N";
          } catch {
            paraleloDesc = "S/N";
          }

          estudianteObj.push({
            id: estudianteId,
            nombre: `${nombreUsuario} ${apellidoUsuario}`.trim() || "Sin nombre",
            paralelo: paraleloDesc,
            foto: fotoUrl,
            CalificacionesFiltradas: resultCalificacionesFiltradas,
          });
        }

        setEstudiantesData(estudianteObj);
      } catch (err) {
        console.error(err);
        setError("Ocurrió un error al cargar los reportes de notas.");
      } finally {
        setLoading(false);
      }
    };

    getValuesUsers();
  }, []);

  // Listas completas basadas directamente en las respuestas de las APIs de catálogos
  const listaParalelosUnicos = useMemo(() => {
    return paralelosCatalogo
      .map((p) => p.descripcion)
      .filter(Boolean)
      .sort();
  }, [paralelosCatalogo]);

  const listaMateriasUnicas = useMemo(() => {
    return materiasCatalogo
      .map((m) => m.nombre?.trim())
      .filter(Boolean)
      .sort();
  }, [materiasCatalogo]);

  // Aplicar filtros en tiempo real
  const estudiantesFiltrados = useMemo(() => {
    return estudiantesData.filter((est) => {
      const matchEstudiante = est.nombre
        .toLowerCase()
        .includes(filtroEstudiante.toLowerCase());
      
      const matchParalelo =
        !filtroParalelo || est.paralelo.toLowerCase() === filtroParalelo.toLowerCase();

      const matchMateria =
        !filtroMateria ||
        (est.CalificacionesFiltradas || []).some((c) =>
          (c.nombre || "").trim().toLowerCase() === filtroMateria.trim().toLowerCase()
        );

      return matchEstudiante && matchParalelo && matchMateria;
    });
  }, [estudiantesData, filtroEstudiante, filtroParalelo, filtroMateria]);

  // ============================================================
  // GENERAR PDF OFICIAL CON EL MISMO FONDO Y ESTÉTICA DE BOLETINES
  // ============================================================
  const dibujarFondoBoletin = (doc, logoBase64) => {
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // ================== MARCO DE SEGURIDAD ==================
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

    const logoBase64 = await cargarImagenBase64("/logo.png");

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
    doc.text("Reporte Consolidado de Calificaciones Institucionales", pageWidth / 2, currentY, { align: "center" });

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

    // ================== CONSTRUCCIÓN DE LA TABLA ==================
    const tableRows = [];

    estudiantesFiltrados.forEach((est) => {
      const califsAceptadas = filtroMateria
        ? (est.CalificacionesFiltradas || []).filter(
            (c) => (c.nombre || "").trim().toLowerCase() === filtroMateria.trim().toLowerCase()
          )
        : est.CalificacionesFiltradas || [];

      if (califsAceptadas.length === 0) {
        tableRows.push([
          est.nombre.toUpperCase(),
          est.paralelo,
          "Sin asignaturas registradas",
          "—"
        ]);
      } else {
        califsAceptadas.forEach((cal) => {
          tableRows.push([
            est.nombre.toUpperCase(),
            est.paralelo,
            (cal.nombre || "Asignatura").toUpperCase(),
            `${cal.total ?? 0} pts`,
          ]);
        });
      }
    });

    if (tableRows.length === 0) {
      doc.setFont("helvetica", "italic");
      doc.setFontSize(10);
      doc.setTextColor(...INK.slate);
      doc.text("No existen registros de calificaciones para los filtros aplicados.", pageWidth / 2, currentY + 10, { align: "center" });
      doc.save("reporte_consolidado_calificaciones.pdf");
      return;
    }

    autoTable(doc, {
      startY: currentY,
      head: [["ESTUDIANTE", "PARALELO", "ASIGNATURA / MATERIA", "NOTA FINAL"]],
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
        0: { cellWidth: 65, fontStyle: "bold" },
        1: { cellWidth: 25, halign: "center" },
        2: { cellWidth: 65 },
        3: { cellWidth: 26.9, halign: "center", fontStyle: "bold", textColor: INK.navy },
      },
      alternateRowStyles: { fillColor: [247, 244, 235] },

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
        `Página ${i} de ${pageCount}   ·   Sistema de Dirección Académica Institucional`,
        pageWidth / 2,
        pageHeight - 10,
        { align: "center" }
      );
    }

    doc.save("reporte_consolidado_calificaciones.pdf");
  };

  const iniciales = (nombre) => {
    const partes = (nombre || "?").trim().split(" ");
    if (partes.length >= 2) {
      return `${partes[0].charAt(0)}${partes[1].charAt(0)}`.toUpperCase();
    }
    return (partes[0] || "?").charAt(0).toUpperCase();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#EEF3FC] via-[#E9F0FB] to-[#E3ECFA] flex items-center justify-center p-4 font-sans">
        <div className="flex items-center gap-3 bg-white border border-slate-200 px-6 py-4 rounded-xl shadow-lg">
          <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-slate-700 text-sm font-semibold">
            Cargando reportes de calificaciones…
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
          <h3 className="text-base font-bold text-slate-900 mb-1">Error al cargar datos</h3>
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

  const totalEstudiantes = estudiantesData.length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#EEF3FC] via-[#E9F0FB] to-[#E3ECFA] text-slate-800 p-3 xs:p-4 sm:p-6 md:p-10 font-sans">
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
              <FileText className="text-blue-700" size={24} />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] sm:text-xs uppercase tracking-[0.2em] text-blue-700 font-semibold mb-1">
                Panel de Dirección · Rendimiento Académico
              </p>
              <h1 className="text-lg xs:text-xl sm:text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">
                Reportes de Calificaciones
              </h1>
            </div>
          </div>
        </motion.div>

        {/* TARJETAS DE RESUMEN KPI */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 md:grid-cols-2 gap-3 sm:gap-4 mb-6 sm:mb-8"
        >
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-xl p-3.5 sm:p-4 shadow-sm">
            <div className="flex items-center gap-2 text-blue-700 text-[11px] sm:text-xs uppercase tracking-wide font-semibold mb-2">
              <Users size={14} /> Total Estudiantes
            </div>
            <p className="text-xl sm:text-2xl font-bold text-slate-900">{totalEstudiantes}</p>
          </div>

          <div className="bg-gradient-to-br from-sky-50 to-sky-100 border border-sky-200 rounded-xl p-3.5 sm:p-4 shadow-sm">
            <div className="flex items-center gap-2 text-sky-700 text-[11px] sm:text-xs uppercase tracking-wide font-semibold mb-2">
              <Filter size={14} /> Resultados
            </div>
            <p className="text-xl sm:text-2xl font-bold text-slate-900">
              {estudiantesFiltrados.length}
            </p>
          </div>
        </motion.div>

        {/* PANEL DE FILTROS Y ACCIONES */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-gradient-to-br from-white to-blue-50/50 border border-slate-200 rounded-xl p-4 sm:p-5 shadow-sm mb-6 sm:mb-8"
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4 mb-4">
            
            {/* Campo de texto libre para escribir y buscar al estudiante */}
            <div>
              <label className="block text-xs font-semibold text-blue-700 uppercase tracking-wide mb-1.5">
                Filtrar Estudiante
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                <input
                  type="text"
                  placeholder="Escriba el nombre del estudiante…"
                  value={filtroEstudiante}
                  onChange={(e) => setFiltroEstudiante(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-md bg-white border border-slate-300 text-slate-800 text-sm focus:ring-2 focus:ring-blue-400/50 focus:border-blue-400 outline-none placeholder-slate-400 transition-all"
                />
              </div>
            </div>

            {/* Select Catálogo Completo para Paralelo */}
            <div>
              <label className="block text-xs font-semibold text-blue-700 uppercase tracking-wide mb-1.5">
                Filtrar Paralelo
              </label>
              <select
                value={filtroParalelo}
                onChange={(e) => setFiltroParalelo(e.target.value)}
                className="w-full px-3 py-2 rounded-md bg-white border border-slate-300 text-slate-800 text-sm focus:ring-2 focus:ring-blue-400/50 focus:border-blue-400 outline-none transition-all"
              >
                <option value="">-- Todos los Paralelos --</option>
                {listaParalelosUnicos.map((paralelo) => (
                  <option key={paralelo} value={paralelo}>
                    {paralelo}
                  </option>
                ))}
              </select>
            </div>

            {/* Select Catálogo Completo para Materia */}
            <div>
              <label className="block text-xs font-semibold text-blue-700 uppercase tracking-wide mb-1.5">
                Filtrar Materia
              </label>
              <select
                value={filtroMateria}
                onChange={(e) => setFiltroMateria(e.target.value)}
                className=" w-full px-3 py-2 rounded-md bg-white border border-slate-300 text-slate-800 text-sm focus:ring-2 focus:ring-blue-400/50 focus:border-blue-400 outline-none transition-all"
              >
                <option value="">-- Todas las Materias --</option>
                {listaMateriasUnicas.map((materia) => (
                  <option key={materia} value={materia}>
                    {materia.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-3 border-t border-slate-200">
            <p className="text-xs text-slate-600 font-medium">
              Mostrando <span className="text-blue-700 font-bold">{estudiantesFiltrados.length}</span> registros organizados por tarjetas.
            </p>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={generarPDF}
              className="w-full sm:w-auto flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white font-semibold rounded-md shadow-sm shadow-blue-200 px-5 py-2 text-xs tracking-wide transition-colors"
            >
              <Download size={15} /> Generar PDF Oficial
            </motion.button>
          </div>
        </motion.div>

        {/* CONTENIDO PRINCIPAL: TARJETAS DE ESTUDIANTES */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          {estudiantesFiltrados.length === 0 ? (
            <div className="bg-gradient-to-b from-white to-slate-50 border border-slate-200 rounded-xl p-12 text-center text-slate-500 text-sm italic shadow-sm">
              No se encontraron estudiantes que coincidan con los filtros aplicados.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {estudiantesFiltrados.map((estudiante) => (
                <motion.div
                  key={estudiante.id}
                  whileHover={{ y: -3 }}
                  className="bg-gradient-to-br from-white to-slate-50 border border-slate-200 rounded-xl shadow-sm hover:shadow-md transition-all flex flex-col justify-between overflow-hidden"
                >
                  {/* Encabezado Tarjeta con Foto en Base64 */}
                  <div className="p-4 border-b border-slate-100 bg-gradient-to-r from-blue-50/60 to-transparent">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-3 min-w-0">
                        {estudiante.foto ? (
                          <img
                            src={estudiante.foto}
                            alt={`Foto de ${estudiante.nombre}`}
                            className="w-10 h-10 rounded-full object-cover border-2 border-blue-400 shadow-xs shrink-0 bg-slate-100"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-200 to-blue-300 border border-blue-300 flex items-center justify-center text-xs font-bold text-blue-800 shrink-0 shadow-xs">
                            {iniciales(estudiante.nombre)}
                          </div>
                        )}

                        <div className="min-w-0">
                          <h2 className="text-sm font-bold text-slate-900 leading-snug truncate">
                            {estudiante.nombre}
                          </h2>
                          <p className="text-[10px] text-blue-700 uppercase font-semibold tracking-wider">
                            Estudiante
                          </p>
                        </div>
                      </div>

                      <span className="text-[11px] font-bold text-blue-800 bg-blue-100 border border-blue-200 px-2.5 py-0.5 rounded-full whitespace-nowrap shrink-0">
                        {estudiante.paralelo}
                      </span>
                    </div>
                  </div>

                  {/* Lista de Calificaciones */}
                  <div className="p-4 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-2.5">
                        <span className="text-[11px] uppercase tracking-wide text-slate-500 font-bold flex items-center gap-1">
                          <Award size={13} className="text-blue-600" /> Materias y Notas
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium">
                          {estudiante.CalificacionesFiltradas.length} asignatura(s)
                        </span>
                      </div>

                      <ul className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
                        {estudiante.CalificacionesFiltradas.length > 0 ? (
                          estudiante.CalificacionesFiltradas.map((cal) => {
                            const nota = Number(cal.total || 0);
                            const esSobresaliente = nota >= 85;
                            const esReprobado = nota < 70;

                            return (
                              <li
                                key={cal.calificacion_id || `${estudiante.id}-${cal.nombre}`}
                                className="flex items-center justify-between bg-slate-50 border border-slate-200/80 rounded-lg px-3 py-2 text-xs hover:bg-slate-100/80 transition-colors"
                              >
                                <span className="text-slate-700 font-medium truncate mr-2">
                                  {cal.nombre}
                                </span>
                                <span
                                  className={`px-2 py-0.5 rounded font-bold text-[11px] shrink-0 ${
                                    esSobresaliente
                                      ? "bg-emerald-100 border border-emerald-300 text-emerald-800"
                                      : esReprobado
                                      ? "bg-red-100 border border-red-300 text-red-800"
                                      : "bg-amber-100 border border-amber-300 text-amber-800"
                                  }`}
                                >
                                  {cal.total ?? "—"}
                                </span>
                              </li>
                            );
                          })
                        ) : (
                          <li className="text-slate-400 text-xs italic py-4 text-center bg-slate-50/50 rounded-lg border border-dashed border-slate-200">
                            Sin calificaciones registradas
                          </li>
                        )}
                      </ul>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};