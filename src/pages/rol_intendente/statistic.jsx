import React, { useEffect, useState, useMemo, useRef } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import html2canvas from "html2canvas";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { motion } from "framer-motion";
import {
  BarChart3,
  Users,
  Award,
  BookOpen,
  PieChart as PieIcon,
  TrendingUp,
  AlertCircle,
  GraduationCap,
  Download,
} from "lucide-react";

import { getCalificacionesMaterias } from "../../api/api.calificaciones";
import { getEstudiantes } from "../../api/api.estudiante";
import { getParalelos } from "../../api/api.paralelos";
import { getUsuarios } from "../../api/api.usuario";

export const Estadisticas = () => {
  const dashboardRef = useRef(null);
  const [generandoPdf, setGenerandoPdf] = useState(false);

  const [calificacionesMaterias, setCalificacionesMaterias] = useState([]);
  const [estudiantes, setEstudiantes] = useState([]);
  const [paralelos, setParalelos] = useState([]);
  const [usuarios, setUsuarios] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // ================== CARGA DE DATOS DESDE LAS APIS ==================
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        const [
          respUsuarios,
          dataEstudiantes,
          dataParalelos,
          dataCalifMaterias,
        ] = await Promise.all([
          getUsuarios(),
          getEstudiantes(),
          getParalelos(),
          getCalificacionesMaterias(),
        ]);

        setUsuarios(respUsuarios.data || []);
        setEstudiantes(dataEstudiantes || []);
        setParalelos(dataParalelos || []);
        setCalificacionesMaterias(dataCalifMaterias || []);
      } catch (err) {
        console.error(err);
        setError("Ocurrió un error al cargar las estadísticas institucionales.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // ================== PROMEDIO DE NOTAS POR MATERIA ==================
  const notasPorMateria = useMemo(() => {
    if (!calificacionesMaterias.length) return [];

    const mapa = new Map();
    calificacionesMaterias.forEach((c) => {
      const materia = c.nombre || "Sin materia";
      const nota = Number(c.total) || 0;

      if (!mapa.has(materia)) {
        mapa.set(materia, { materia, suma: nota, cantidad: 1 });
      } else {
        const prev = mapa.get(materia);
        mapa.set(materia, {
          materia,
          suma: prev.suma + nota,
          cantidad: prev.cantidad + 1,
        });
      }
    });

    return Array.from(mapa.values()).map((m) => ({
      materia: m.materia,
      promedio: Number((m.suma / m.cantidad).toFixed(2)),
      evaluaciones: m.cantidad,
    }));
  }, [calificacionesMaterias]);

  // ================== PROMEDIO DE NOTAS POR PARALELO ==================
  const promedioPorParalelo = useMemo(() => {
    if (!calificacionesMaterias.length || !estudiantes.length || !paralelos.length)
      return [];

    const mapEstudianteParalelo = new Map();
    estudiantes.forEach((e) => {
      mapEstudianteParalelo.set(e.estudiante_id, e.paralelo_id);
    });

    const mapParaleloDescripcion = new Map();
    paralelos.forEach((p) => {
      mapParaleloDescripcion.set(p.paralelo_id, p.descripcion);
    });

    const mapa = new Map();

    calificacionesMaterias.forEach((c) => {
      const paraleloId = mapEstudianteParalelo.get(c.estudiante_id);
      if (!paraleloId) return;

      const desc = mapParaleloDescripcion.get(paraleloId) || `Paralelo ${paraleloId}`;
      const nota = Number(c.total) || 0;

      if (!mapa.has(desc)) {
        mapa.set(desc, { paralelo: desc, suma: nota, cantidad: 1 });
      } else {
        const prev = mapa.get(desc);
        mapa.set(desc, {
          paralelo: desc,
          suma: prev.suma + nota,
          cantidad: prev.cantidad + 1,
        });
      }
    });

    return Array.from(mapa.values()).map((p) => ({
      paralelo: p.paralelo,
      promedio: Number((p.suma / p.cantidad).toFixed(2)),
    }));
  }, [calificacionesMaterias, estudiantes, paralelos]);

  // ================== DISTRIBUCIÓN DE ROLES ==================
  const rolesUsuarios = useMemo(() => {
    if (!usuarios.length) return [];

    const conteo = new Map();
    usuarios.forEach((u) => {
      const rolRaw = u.rol || "Sin Rol";
      const rolFormatted = rolRaw.charAt(0).toUpperCase() + rolRaw.slice(1).toLowerCase();
      conteo.set(rolFormatted, (conteo.get(rolFormatted) || 0) + 1);
    });

    return Array.from(conteo.entries()).map(([rol, value]) => ({
      name: rol,
      value,
    }));
  }, [usuarios]);

  // ================== MÉTRICAS GENERALES ==================
  const promedioGeneral = useMemo(() => {
    if (!calificacionesMaterias.length) return "0.0";
    const total = calificacionesMaterias.reduce((acc, curr) => acc + (Number(curr.total) || 0), 0);
    return (total / calificacionesMaterias.length).toFixed(1);
  }, [calificacionesMaterias]);

  const COLORS = ["#2563EB", "#059669", "#D97706", "#DB2777", "#4F46E5"];

  // ================== GENERACIÓN DEL REPORTES EN PDF CON GRÁFICOS ==================
  

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

// HELPER PARA CONVERTIR IMAGEN A BASE64
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

// DIBUJAR MARCO Y MARCAS DE AGUA EN CUALQUIER PÁGINA
const dibujarFondoBoletin = (doc, logoBase64) => {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Marco de seguridad
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

  // Marcas de agua
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

const exportarPDF = async () => {
  if (!dashboardRef.current) return;

  try {
    setGenerandoPdf(true);

    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "letter",
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 16;

    // Cargar imagen de forma segura
    const logoBase64 = await cargarImagenBase64("/logo.png");

    // Dibuja el marco y fondo en la primera página
    dibujarFondoBoletin(doc, logoBase64);

    // Encabezado
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
    doc.text("Reporte Estadístico e Indicadores Académicos", pageWidth / 2, currentY, { align: "center" });

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

    // Resumen Ejecutivo (KPIs)
    doc.setFont("times", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...INK.navy);
    doc.text("1. RESUMEN GENERAL DE INDICADORES", margin, currentY);

    autoTable(doc, {
      startY: currentY + 3,
      head: [["PROMEDIO GENERAL", "MATERIAS EVALUADAS", "PARALELOS ACTIVOS", "TOTAL USUARIOS"]],
      body: [[
        `${promedioGeneral} / 100 pts`,
        `${notasPorMateria.length} Asignaturas`,
        `${paralelos.length} Secciones`,
        `${usuarios.length} Registrados`
      ]],
      theme: "grid",
      margin: { left: margin, right: margin },
      styles: {
        font: "helvetica",
        fontSize: 8.5,
        halign: "center",
        valign: "middle",
        cellPadding: 3,
        textColor: INK.ink,
        lineColor: [214, 211, 199],
        lineWidth: 0.15,
      },
      headStyles: {
        fillColor: INK.navy,
        textColor: [250, 248, 242],
        fontStyle: "bold",
        fontSize: 8,
      },
      alternateRowStyles: { fillColor: [247, 244, 235] },
    });

    // Captura HTML2Canvas
    const canvas = await html2canvas(dashboardRef.current, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: "#FFFFFF",
    });

    const imgData = canvas.toDataURL("image/png");
    const imgWidth = pageWidth - margin * 2;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    currentY = (doc.lastAutoTable?.finalY || currentY + 30) + 7;
    doc.setFont("times", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...INK.navy);
    doc.text("2. GRÁFICOS ANALÍTICOS DE RENDIMIENTO", margin, currentY);

    currentY += 4;
    const maxImgHeight = pageHeight - currentY - 18;
    doc.addImage(imgData, "PNG", margin, currentY, imgWidth, Math.min(imgHeight, maxImgHeight));

    // Página 2: Tabla desglosada
    doc.addPage();
    dibujarFondoBoletin(doc, logoBase64);

    doc.setFont("times", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...INK.navy);
    doc.text("3. DESGLOSE DETALLADO DE NOTAS POR MATERIA", margin, 20);

    const filasMateria = notasPorMateria.map((m) => [
      (m.materia || "ASIGNATURA").toUpperCase(),
      m.evaluaciones || "0",
      `${m.promedio} pts`,
      m.promedio >= 85 ? "SOBRESALIENTE" : m.promedio >= 70 ? "SATISFACTORIO" : "EN RIESGO",
    ]);

    autoTable(doc, {
      startY: 24,
      head: [["ASIGNATURA / MATERIA", "EVALUACIONES REGISTRADAS", "PROMEDIO", "ESTADO ACADÉMICO"]],
      body: filasMateria,
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
        0: { cellWidth: 70, fontStyle: "bold" },
        1: { cellWidth: 42, halign: "center" },
        2: { cellWidth: 33, halign: "center", fontStyle: "bold", textColor: INK.navy },
        3: { cellWidth: 36.9, halign: "center", fontStyle: "bold" },
      },
      alternateRowStyles: { fillColor: [247, 244, 235] },
      didParseCell: (data) => {
        if (data.section === "body" && data.column.index === 3) {
          const val = data.cell.raw;
          if (val === "SOBRESALIENTE") data.cell.styles.textColor = [6, 95, 70];
          if (val === "EN RIESGO") data.cell.styles.textColor = [178, 34, 34];
          if (val === "SATISFACTORIO") data.cell.styles.textColor = [30, 58, 95];
        }
      },
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

    // Pie de página
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFont("times", "italic");
      doc.setFontSize(7.5);
      doc.setTextColor(...INK.slate);
      doc.text(
        `Reporte Estadístico Académico Oficial   ·   Página ${i} de ${pageCount}`,
        pageWidth / 2,
        pageHeight - 10,
        { align: "center" }
      );
    }

    doc.save(`reporte_estadisticas_notas_${new Date().toISOString().slice(0, 10)}.pdf`);
  } catch (err) {
    console.error("Error al exportar PDF:", err);
  } finally {
    setGenerandoPdf(false);
  }
};

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900 text-white p-2.5 rounded-lg shadow-xl text-xs border border-slate-700">
          <p className="font-bold border-b border-slate-700 pb-1 mb-1">{label || payload[0].name}</p>
          <p className="text-blue-300">
            {payload[0].name}: <span className="font-semibold text-white">{payload[0].value}</span>
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
            Cargando estadísticas e informes…
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
              <BarChart3 className="text-blue-700" size={24} />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] sm:text-xs uppercase tracking-[0.2em] text-blue-700 font-semibold mb-1">
                Panel analítico · Reporte general
              </p>
              <h1 className="text-lg xs:text-xl sm:text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">
                Estadísticas del Colegio
              </h1>
            </div>
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={exportarPDF}
            disabled={generandoPdf}
            className="flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white font-semibold rounded-md shadow-sm shadow-blue-200 px-5 py-2.5 text-xs tracking-wide transition-all disabled:opacity-50"
          >
            <Download size={15} />
            {generandoPdf ? "Generando PDF de Reportes..." : "Exportar PDF con Gráficos"}
          </motion.button>
        </motion.div>

        {/* TARJETAS DE RESUMEN KPI */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8"
        >
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-xl p-3.5 sm:p-4 shadow-sm">
            <div className="flex items-center gap-2 text-blue-700 text-[11px] sm:text-xs uppercase tracking-wide font-semibold mb-2">
              <Award size={14} /> Promedio General
            </div>
            <p className="text-xl sm:text-2xl font-bold text-slate-900">{promedioGeneral} <span className="text-xs font-normal text-slate-500">/ 100</span></p>
          </div>

          <div className="bg-gradient-to-br from-sky-50 to-sky-100 border border-sky-200 rounded-xl p-3.5 sm:p-4 shadow-sm">
            <div className="flex items-center gap-2 text-sky-700 text-[11px] sm:text-xs uppercase tracking-wide font-semibold mb-2">
              <BookOpen size={14} /> Materias Evaluadas
            </div>
            <p className="text-xl sm:text-2xl font-bold text-slate-900">{notasPorMateria.length}</p>
          </div>

          <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 border border-emerald-200 rounded-xl p-3.5 sm:p-4 shadow-sm">
            <div className="flex items-center gap-2 text-emerald-700 text-[11px] sm:text-xs uppercase tracking-wide font-semibold mb-2">
              <GraduationCap size={14} /> Paralelos Activos
            </div>
            <p className="text-xl sm:text-2xl font-bold text-slate-900">{paralelos.length}</p>
          </div>

          <div className="bg-gradient-to-br from-amber-50 to-amber-100 border border-amber-200 rounded-xl p-3.5 sm:p-4 shadow-sm">
            <div className="flex items-center gap-2 text-amber-700 text-[11px] sm:text-xs uppercase tracking-wide font-semibold mb-2">
              <Users size={14} /> Total Usuarios
            </div>
            <p className="text-xl sm:text-2xl font-bold text-slate-900">{usuarios.length}</p>
          </div>
        </motion.div>

        {/* CONTENEDOR DE GRÁFICOS (REFERENCIADO PARA EL PDF) */}
        <div ref={dashboardRef} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* GRÁFICO 1: PROMEDIO POR MATERIA */}
            <div className="bg-gradient-to-br from-white to-slate-50 border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                <h2 className="text-xs font-bold text-slate-800 flex items-center gap-2 tracking-wide uppercase">
                  <BarChart3 size={16} className="text-blue-600" /> Promedio de Notas por Materia
                </h2>
                <span className="text-[10px] font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">
                  Rendimiento
                </span>
              </div>

              {notasPorMateria.length === 0 ? (
                <div className="h-64 flex items-center justify-center text-slate-400 text-xs italic">
                  No hay datos suficientes de calificaciones registradas.
                </div>
              ) : (
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={notasPorMateria} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                      <XAxis dataKey="materia" stroke="#64748B" fontSize={10} tickLine={false} />
                      <YAxis stroke="#64748B" fontSize={10} domain={[0, 100]} tickLine={false} />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "5px" }} />
                      <Bar name="Promedio" dataKey="promedio" fill="#2563EB" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* GRÁFICO 2: PROMEDIO POR PARALELO */}
            <div className="bg-gradient-to-br from-white to-slate-50 border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                <h2 className="text-xs font-bold text-slate-800 flex items-center gap-2 tracking-wide uppercase">
                  <TrendingUp size={16} className="text-emerald-600" /> Promedio de Notas por Paralelo
                </h2>
                <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                  Comparativo
                </span>
              </div>

              {promedioPorParalelo.length === 0 ? (
                <div className="h-64 flex items-center justify-center text-slate-400 text-xs italic">
                  No hay datos suficientes para calcular promedios por paralelo.
                </div>
              ) : (
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={promedioPorParalelo} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                      <XAxis dataKey="paralelo" stroke="#64748B" fontSize={10} tickLine={false} />
                      <YAxis stroke="#64748B" fontSize={10} domain={[0, 100]} tickLine={false} />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "5px" }} />
                      <Bar name="Promedio" dataKey="promedio" fill="#059669" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>

          {/* GRÁFICO 3: DISTRIBUCIÓN POR ROL */}
          <div className="bg-gradient-to-br from-white to-slate-50 border border-slate-200 rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <h2 className="text-xs font-bold text-slate-800 flex items-center gap-2 tracking-wide uppercase">
                <PieIcon size={16} className="text-amber-600" /> Distribución Demográfica de Usuarios
              </h2>
              <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                Roles
              </span>
            </div>

            {rolesUsuarios.length === 0 ? (
              <div className="h-64 flex items-center justify-center text-slate-400 text-xs italic">
                No hay registros de usuarios para mostrar.
              </div>
            ) : (
              <div className="h-64 w-full flex justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={rolesUsuarios}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={85}
                      innerRadius={40}
                      paddingAngle={4}
                      label={({ name, value }) => `${name}: ${value}`}
                    >
                      {rolesUsuarios.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "5px" }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};