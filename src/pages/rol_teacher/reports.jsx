import React, { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText,
  Search,
  Download,
  GraduationCap,
  Award,
  Users,
  BookOpen,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  FileCheck,
  Filter,
  Layers,
} from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { getEstudiantesGeneral } from "../../api/api.estudiante";
import { getParalelos } from "../../api/api.paralelos";

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

export const ReportesTeacher = () => {
  const [filtro, setFiltro] = useState("");
  const [filtroParalelo, setFiltroParalelo] = useState("TODOS");
  const [reportes, setReportes] = useState([]);
  const [paralelos, setParalelos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Control de desglose desplegable en la tabla (Acordeón)
  const [expandedRows, setExpandedRows] = useState({});

  const cargarDatos = async () => {
    try {
      setLoading(true);
      setError(null);
      const [responseReportes, responseParalelos] = await Promise.all([
        getEstudiantesGeneral(),
        getParalelos().catch(() => []),
      ]);
      setReportes(responseReportes || []);
      setParalelos(responseParalelos || []);
    } catch (err) {
      console.error("Error al obtener los reportes académicos:", err);
      setError("No se pudieron cargar los reportes de rendimiento académico.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  // Agrupación de estudiantes por nombre y apellido incluyendo trimestres
  const estudiantesAgrupadosArray = useMemo(() => {
    const acc = reportes.reduce((map, reporteActual) => {
      const claveEstudiante = `${reporteActual.nombre || ""} ${reporteActual.apellido || ""}`.trim();

      if (!map[claveEstudiante]) {
        map[claveEstudiante] = {
          nombre: reporteActual.nombre || "Sin nombre",
          apellido: reporteActual.apellido || "",
          paralelo: reporteActual.paralelo || reporteActual.descripcion || "S/N",
          materias: [],
          totalGeneral: 0,
        };
      }

      const t1 = parseInt(reporteActual.primer_trimestre, 10) || 0;
      const t2 = parseInt(reporteActual.segundo_trimestre, 10) || 0;
      const t3 = parseInt(reporteActual.tercer_trimestre, 10) || 0;
      const notaTotal = parseInt(reporteActual.total, 10) || Math.round((t1 + t2 + t3) / 3);

      map[claveEstudiante].materias.push({
        materia: reporteActual.materia || "Asignatura",
        primer_trimestre: t1,
        segundo_trimestre: t2,
        tercer_trimestre: t3,
        total: notaTotal,
      });

      map[claveEstudiante].totalGeneral += notaTotal;

      return map;
    }, {});

    return Object.values(acc);
  }, [reportes]);

  // Filtro dinámico por paralelo, estudiante o materia
  const reportesFiltrados = useMemo(() => {
    const textoFiltro = filtro.toLowerCase().trim();

    return estudiantesAgrupadosArray.filter((r) => {
      const coincideParalelo =
        filtroParalelo === "TODOS" ||
        String(r.paralelo).toUpperCase() === String(filtroParalelo).toUpperCase();

      const coincideNombre = r.nombre.toLowerCase().includes(textoFiltro);
      const coincideApellido = r.apellido.toLowerCase().includes(textoFiltro);
      const coincideMateria = r.materias.some((mat) =>
        mat.materia.toLowerCase().includes(textoFiltro)
      );

      const coincideTexto = !textoFiltro || coincideNombre || coincideApellido || coincideMateria;

      return coincideParalelo && coincideTexto;
    });
  }, [estudiantesAgrupadosArray, filtro, filtroParalelo]);

  const toggleRowExpand = (clave) => {
    setExpandedRows((prev) => ({
      ...prev,
      [clave]: !prev[clave],
    }));
  };

  const iniciales = (nombre, apellido) => {
    return `${(nombre || "?").charAt(0)}${(apellido || "").charAt(0)}`.toUpperCase();
  };

  const totalEstudiantes = reportesFiltrados.length;
  const totalNotas = useMemo(() => {
    return reportesFiltrados.reduce((acc, est) => acc + est.materias.length, 0);
  }, [reportesFiltrados]);

  const promedioClase = useMemo(() => {
    if (!reportesFiltrados.length) return "0.0";
    let sumaPromedios = 0;

    reportesFiltrados.forEach((est) => {
      const cant = est.materias.length || 1;
      sumaPromedios += est.totalGeneral / cant;
    });

    return (sumaPromedios / reportesFiltrados.length).toFixed(1);
  }, [reportesFiltrados]);

  const estudiantesEnRiesgo = useMemo(() => {
    return reportesFiltrados.filter((est) => {
      const cant = est.materias.length || 1;
      const prom = est.totalGeneral / cant;
      return prom < 70;
    }).length;
  }, [reportesFiltrados]);

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

  const dibujarFondoBoletin = (doc, logoBase64) => {
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    const frameOuter = 6;
    const frameInner = 8.6;
    doc.setDrawColor(...INK.navy);
    doc.setLineWidth(0.9);
    doc.rect(frameOuter, frameOuter, pageWidth - frameOuter * 2, pageHeight - frameOuter * 2);
    doc.setDrawColor(...INK.gold);
    doc.setLineWidth(0.3);
    doc.rect(frameInner, frameInner, pageWidth - frameInner * 2, pageHeight - frameInner * 2);

    doc.setDrawColor(...INK.gold);
    doc.setLineWidth(0.15);
    for (let x = frameInner + 4; x < pageWidth - frameInner - 4; x += 4) {
      doc.line(x, frameInner, x, frameInner + 1.3);
      doc.line(x, pageHeight - frameInner, x, pageHeight - frameInner - 1.3);
    }

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

  const handleGenerarPDF = async () => {
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
    doc.text("Reporte General de Rendimiento y Calificaciones Académicas", pageWidth / 2, currentY, { align: "center" });

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

    const datosTabla = [];

    reportesFiltrados.forEach((r) => {
      r.materias.forEach((mat) => {
        const estatus = mat.total >= 85 ? "SOBRESALIENTE" : mat.total >= 70 ? "APROBADO" : "EN RIESGO";
        datosTabla.push([
          `${r.nombre || ""} ${r.apellido || ""}`.trim().toUpperCase() || "—",
          (mat.materia || "ASIGNATURA").toUpperCase(),
          mat.primer_trimestre ?? 0,
          mat.segundo_trimestre ?? 0,
          mat.tercer_trimestre ?? 0,
          `${mat.total ?? 0} pts`,
          estatus,
        ]);
      });
    });

    autoTable(doc, {
      startY: currentY,
      head: [["ESTUDIANTE", "MATERIA", "1ER", "2DO", "3ER", "FINAL", "ESTATUS"]],
      body: datosTabla,
      theme: "grid",
      margin: { left: margin, right: margin, top: 25, bottom: 25 },
      styles: {
        font: "helvetica",
        fontSize: 8,
        cellPadding: 2.5,
        textColor: INK.ink,
        halign: "center",
        valign: "middle",
        lineColor: [214, 211, 199],
        lineWidth: 0.15,
      },
      headStyles: {
        fillColor: INK.navy,
        textColor: [250, 248, 242],
        fontStyle: "bold",
        halign: "center",
        fontSize: 7.5,
        cellPadding: 3,
      },
      columnStyles: {
        0: { cellWidth: 55, halign: "left", fontStyle: "bold" },
        1: { cellWidth: 45, halign: "left" },
        2: { cellWidth: 16 },
        3: { cellWidth: 16 },
        4: { cellWidth: 16 },
        5: { cellWidth: 20, fontStyle: "bold", textColor: INK.navy },
        6: { cellWidth: 23.9, fontStyle: "bold" },
      },
      didParseCell: (data) => {
        if (data.section === "body" && data.column.index === 6) {
          const val = data.cell.raw;
          if (val === "SOBRESALIENTE" || val === "APROBADO") {
            data.cell.styles.textColor = INK.emerald;
          } else {
            data.cell.styles.textColor = INK.red;
          }
        }
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

    let finalY = (doc.lastAutoTable?.finalY || currentY + 40) + 15;

    if (finalY + 30 > pageHeight - 20) {
      doc.addPage();
      dibujarFondoBoletin(doc, logoBase64);
      finalY = 40;
    }

    const lineLength = 52;
    const contentWidth = pageWidth - margin * 2;
    const leftSignatureX = margin + contentWidth / 4 - lineLength / 2;
    const rightSignatureX = margin + (3 * contentWidth) / 4 - lineLength / 2;

    doc.setDrawColor(...INK.navy);
    doc.setLineWidth(0.4);
    doc.line(leftSignatureX, finalY, leftSignatureX + lineLength, finalY);
    doc.line(rightSignatureX, finalY, rightSignatureX + lineLength, finalY);

    doc.setFont("times", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(...INK.navy);
    doc.text("DIRECCIÓN ADMINISTRATIVA", leftSignatureX + lineLength / 2, finalY + 5, { align: "center" });
    doc.text("DOCENTE DE ASIGNATURA", rightSignatureX + lineLength / 2, finalY + 5, { align: "center" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.8);
    doc.setTextColor(...INK.slate);
    doc.text("Sello y Firma Oficial", leftSignatureX + lineLength / 2, finalY + 9, { align: "center" });
    doc.text("Firma de Conformidad", rightSignatureX + lineLength / 2, finalY + 9, { align: "center" });

    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFont("times", "italic");
      doc.setFontSize(7.5);
      doc.setTextColor(...INK.slate);
      doc.text(
        `Reporte Académico Docente   ·   Página ${i} de ${pageCount}`,
        pageWidth / 2,
        pageHeight - 10,
        { align: "center" }
      );
    }

    doc.save(`reporte_academico_docente_${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#EEF3FC] via-[#E9F0FB] to-[#E3ECFA] flex items-center justify-center p-4 font-sans">
        <div className="flex items-center gap-3 bg-white border border-slate-200 px-6 py-4 rounded-xl shadow-lg">
          <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-slate-700 text-sm font-semibold">
            Cargando reportes académicos…
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
            onClick={cargarDatos}
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
                Panel docente · Rendimiento del Grupo
              </p>
              <h1 className="text-lg xs:text-xl sm:text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">
                Reportes Académicos
              </h1>
            </div>
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleGenerarPDF}
            className="flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white font-semibold rounded-md shadow-sm shadow-blue-200 px-5 py-2.5 text-xs tracking-wide transition-colors"
          >
            <Download size={15} /> Exportar Reporte PDF
          </motion.button>
        </motion.div>

        {/* BARRA DE FILTRADO RÁPIDO POR PARALELO */}
        <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
          <span className="text-xs font-bold text-slate-600 uppercase tracking-wide flex items-center gap-1 shrink-0 mr-1">
            <Filter size={14} className="text-blue-600" /> Filtrar Paralelo:
          </span>
          <button
            onClick={() => setFiltroParalelo("TODOS")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
              filtroParalelo === "TODOS"
                ? "bg-blue-600 text-white shadow-xs"
                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
            }`}
          >
            Todos los Paralelos
          </button>
          {paralelos.map((p) => (
            <button
              key={p.paralelo_id}
              onClick={() => setFiltroParalelo(p.descripcion)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                String(filtroParalelo).toUpperCase() === String(p.descripcion).toUpperCase()
                  ? "bg-blue-600 text-white shadow-xs"
                  : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
              }`}
            >
              {p.descripcion}
            </button>
          ))}
        </div>

        {/* TABLA CONSOLIDADA DE REPORTES CON ACORDEÓN */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="bg-gradient-to-b from-white to-slate-50 border border-slate-200 rounded-xl shadow-sm overflow-hidden"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 sm:p-5 border-b border-slate-200 bg-gradient-to-r from-blue-50/70 to-transparent">
            <h2 className="text-xs font-bold text-slate-800 flex items-center gap-2 tracking-wide uppercase">
              <FileCheck size={16} className="text-blue-600" /> Control de Calificaciones por Estudiante ({reportesFiltrados.length})
            </h2>

            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
              <input
                type="text"
                placeholder="Buscar por estudiante o materia…"
                value={filtro}
                onChange={(e) => setFiltro(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 rounded-md bg-white text-slate-800 border border-slate-300 text-xs focus:ring-2 focus:ring-blue-400/50 outline-none"
              />
            </div>
          </div>

          {reportesFiltrados.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-xs italic">
              No se encontraron registros académicos que coincidan con la búsqueda.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-xs">
                <thead className="bg-gradient-to-r from-blue-100 to-sky-100 text-blue-900 border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-5 text-left font-bold uppercase">Estudiante</th>
                    <th className="py-3 px-5 text-center font-bold uppercase">Paralelo</th>
                    <th className="py-3 px-5 text-center font-bold uppercase">Asignaturas Evaluadas</th>
                    <th className="py-3 px-5 text-center font-bold uppercase">Promedio General</th>
                    <th className="py-3 px-5 text-center font-bold uppercase">Estatus Académico</th>
                    <th className="py-3 px-5 text-center font-bold uppercase">Detalles</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {reportesFiltrados.map((r, index) => {
                    const claveRow = `${r.nombre}-${r.apellido}-${index}`;
                    const isExpanded = !!expandedRows[claveRow];

                    const cantidadMaterias = r.materias.length || 1;
                    const promedioGeneral = (r.totalGeneral / cantidadMaterias).toFixed(1);

                    const esSobresaliente = promedioGeneral >= 85;
                    const esReprobado = promedioGeneral < 70;

                    return (
                      <React.Fragment key={claveRow}>
                        <tr className="hover:bg-blue-50/40 transition-colors">
                          <td className="py-3.5 px-5 font-semibold text-slate-900">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-200 to-blue-300 border border-blue-300 flex items-center justify-center text-[11px] font-bold text-blue-800 shrink-0">
                                {iniciales(r.nombre, r.apellido)}
                              </div>
                              <span>{r.nombre} {r.apellido}</span>
                            </div>
                          </td>

                          <td className="py-3.5 px-5 text-center">
                            <span className="text-[10px] font-bold text-blue-800 bg-blue-100 border border-blue-200 px-2.5 py-0.5 rounded-full">
                              {r.paralelo}
                            </span>
                          </td>

                          <td className="py-3.5 px-5 text-center text-slate-600 font-medium">
                            {r.materias.length} materia(s)
                          </td>

                          <td className="py-3.5 px-5 text-center">
                            <span
                              className={`px-2.5 py-0.5 rounded font-bold ${
                                esSobresaliente
                                  ? "bg-emerald-100 border border-emerald-300 text-emerald-800"
                                  : esReprobado
                                  ? "bg-red-100 border border-red-300 text-red-800"
                                  : "bg-amber-100 border border-amber-300 text-amber-800"
                              }`}
                            >
                              {promedioGeneral} pts
                            </span>
                          </td>

                          <td className="py-3.5 px-5 text-center">
                            <span
                              className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                                esSobresaliente
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                  : esReprobado
                                  ? "bg-red-50 text-red-700 border border-red-200"
                                  : "bg-amber-50 text-amber-700 border border-amber-200"
                              }`}
                            >
                              {esSobresaliente ? "Sobresaliente" : esReprobado ? "En Riesgo" : "Aprobado"}
                            </span>
                          </td>

                          <td className="py-3.5 px-5 text-center">
                            <button
                              onClick={() => toggleRowExpand(claveRow)}
                              className="p-1.5 rounded-md bg-slate-100 border border-slate-300 text-slate-700 hover:bg-slate-200 transition-colors inline-flex items-center gap-1 font-semibold text-xs"
                            >
                              {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                              <span>{isExpanded ? "Ocultar" : "Ver Notas"}</span>
                            </button>
                          </td>
                        </tr>

                        {/* DESGLOSE DESPLEGABLE CON LAS MATERIAS Y TRIMESTRES EN TABLA LIMPIA */}
{isExpanded && (
  <tr className="bg-slate-50/80">
    <td colSpan={6} className="p-4 border-t border-b border-slate-200">
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs max-w-4xl mx-auto">
        
        {/* Sub-encabezado */}
        <div className="bg-slate-100/80 px-4 py-2.5 border-b border-slate-200 flex items-center justify-between">
          <h4 className="text-[11px] uppercase tracking-wider font-bold text-slate-700 flex items-center gap-2">
            <BookOpen size={14} className="text-blue-600" />
            Historial de Notas Trimestrales — {r.nombre} {r.apellido}
          </h4>
          <span className="text-[10px] text-slate-500 font-medium">
            {r.materias.length} materia(s) registrada(s)
          </span>
        </div>

        {/* Tabla interna limpia */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200 text-[10px] uppercase tracking-wider">
              <tr>
                <th className="py-2 px-4">Asignatura</th>
                <th className="py-2 px-3 text-center">1° Trimestre</th>
                <th className="py-2 px-3 text-center">2° Trimestre</th>
                <th className="py-2 px-3 text-center">3° Trimestre</th>
                <th className="py-2 px-4 text-center">Promedio Final</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {r.materias.map((mat, i) => {
                const esSobresaliente = mat.total >= 85;
                const esReprobado = mat.total < 70;

                return (
                  <tr key={i} className="hover:bg-blue-50/30 transition-colors">
                    <td className="py-2.5 px-4 font-medium text-slate-800">
                      {mat.materia}
                    </td>
                    <td className="py-2.5 px-3 text-center text-slate-600 font-mono text-[11px]">
                      {mat.primer_trimestre} pts
                    </td>
                    <td className="py-2.5 px-3 text-center text-slate-600 font-mono text-[11px]">
                      {mat.segundo_trimestre} pts
                    </td>
                    <td className="py-2.5 px-3 text-center text-slate-600 font-mono text-[11px]">
                      {mat.tercer_trimestre} pts
                    </td>
                    <td className="py-2.5 px-4 text-center">
                      <span
                        className={`inline-block min-w-[3.2rem] py-0.5 px-2 rounded-md font-bold text-[11px] border ${
                          esSobresaliente
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : esReprobado
                            ? "bg-red-50 text-red-700 border-red-200"
                            : "bg-amber-50 text-amber-700 border-amber-200"
                        }`}
                      >
                        {mat.total} pts
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

      </div>
    </td>
  </tr>
)}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};