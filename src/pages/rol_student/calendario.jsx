import React, { useEffect, useState, useMemo } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { motion } from "framer-motion";
import {
  CalendarDays,
  Search,
  Download,
  Clock,
  CheckCheck,
  AlertCircle,
  Calendar as CalendarIcon,
  Sparkles,
  BookOpen,
} from "lucide-react";

import { getCalendarios } from "../../api/api.calendario";

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

export const CalendarioEscolarEstudiante = () => {
  const [eventos, setEventos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");

  // =========== CARGAR EVENTOS DE LA API ===========
  const cargarEventos = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getCalendarios();
      const data = res.data || res || [];

      const mapeados = data.map((c) => ({
        id: c.calendario_id,
        descripcion: c.descripcion || "",
        fecha: typeof c.fecha === "string" ? c.fecha.split("T")[0] : "",
      }));

      setEventos(mapeados);
    } catch (err) {
      console.error("Error al consultar el calendario:", err);
      setError("No fue posible cargar la agenda de eventos del calendario.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarEventos();
  }, []);

  // =========== CLASIFICACIÓN Y FILTRADO ===========
  const hoyStr = useMemo(() => new Date().toISOString().split("T")[0], []);

  const eventosFiltrados = useMemo(() => {
    return eventos.filter((e) =>
      e.descripcion.toLowerCase().includes(search.toLowerCase())
    );
  }, [eventos, search]);

  const eventosProximos = useMemo(() => {
    return [...eventos]
      .filter((e) => e.fecha >= hoyStr)
      .sort((a, b) => a.fecha.localeCompare(b.fecha));
  }, [eventos, hoyStr]);

  const eventoMasCercano = eventosProximos[0] || null;

  const eventosConcluidosCount = useMemo(() => {
    return eventos.filter((e) => e.fecha < hoyStr).length;
  }, [eventos, hoyStr]);

  // =========== GENERAR PDF OFICIAL CON LOGO ===========
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
  doc.text("Calendario Oficial de Actividades Estudiantiles", pageWidth / 2, currentY, { align: "center" });

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

  // ================== PREPARACIÓN DE DATOS PARA LA TABLA ==================
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
      `Documento Estudiantil   ·   Página ${i} de ${pageCount}`,
      pageWidth / 2,
      pageHeight - 10,
      { align: "center" }
    );
  }

  doc.save(`calendario_escolar_estudiante_${new Date().getFullYear()}.pdf`);
};

  // =========== ESTADOS CARGA / ERROR ===========
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#EEF3FC] via-[#E9F0FB] to-[#E3ECFA] flex items-center justify-center p-4 font-sans">
        <div className="flex items-center gap-3 bg-white border border-slate-200 px-6 py-4 rounded-xl shadow-lg">
          <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-slate-700 text-sm font-semibold">
            Cargando la agenda de eventos…
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
      <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8">
        {/* ENCABEZADO */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 border-b border-slate-300 pb-6"
        >
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-lg bg-gradient-to-br from-blue-100 to-blue-200 border border-blue-300 flex items-center justify-center shrink-0 shadow-sm">
              <CalendarDays className="text-blue-700" size={24} />
            </div>
            <div>
              <p className="text-[10px] sm:text-xs uppercase tracking-[0.2em] text-blue-700 font-semibold mb-1">
                Portal Estudiantil · Planificación Escolar
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
            <Download size={15} /> Descargar PDF Oficial
          </motion.button>
        </motion.div>

        {/* TARJETAS KPI RESUMEN */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4"
        >
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-xl p-3.5 sm:p-4 shadow-sm">
            <div className="flex items-center gap-2 text-blue-700 text-[11px] sm:text-xs uppercase tracking-wide font-semibold mb-2">
              <CalendarIcon size={14} /> Total Actividades
            </div>
            <p className="text-xl sm:text-2xl font-bold text-slate-900">{eventos.length}</p>
          </div>

          <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 border border-emerald-200 rounded-xl p-3.5 sm:p-4 shadow-sm">
            <div className="flex items-center gap-2 text-emerald-700 text-[11px] sm:text-xs uppercase tracking-wide font-semibold mb-2">
              <Clock size={14} /> Programados
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
          {/* COLUMNA IZQUIERDA: TABLA Y BUSCADOR */}
          <div className="lg:col-span-2 flex flex-col gap-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="bg-gradient-to-b from-white to-slate-50 border border-slate-200 rounded-xl shadow-sm overflow-hidden"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 border-b border-slate-200 bg-gradient-to-r from-blue-50/70 to-transparent">
                <h2 className="text-xs font-bold text-slate-800 flex items-center gap-2 tracking-wide uppercase">
                  <BookOpen size={16} className="text-blue-600" /> Agenda General de Eventos
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
                <table className="min-w-full text-xs">
                  <thead className="bg-gradient-to-r from-blue-100 to-sky-100 text-blue-900 border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4 text-left font-bold uppercase tracking-wider">Descripción</th>
                      <th className="py-3 px-4 text-center font-bold uppercase tracking-wider w-36">Fecha</th>
                      <th className="py-3 px-4 text-center font-bold uppercase tracking-wider w-28">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {eventosFiltrados.length > 0 ? (
                      eventosFiltrados.map((e) => {
                        const esPasado = e.fecha < hoyStr;

                        return (
                          <tr
                            key={e.id}
                            className={`transition-colors ${
                              esPasado ? "bg-slate-50/70 text-slate-500" : "hover:bg-blue-50/50 text-slate-800"
                            }`}
                          >
                            <td className="py-3.5 px-4 font-medium">
                              <span className={esPasado ? "line-through text-slate-400" : ""}>
                                {e.descripcion}
                              </span>
                            </td>

                            <td className="py-3.5 px-4 text-center font-semibold">
                              {e.fecha || "—"}
                            </td>

                            <td className="py-3.5 px-4 text-center">
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
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={3} className="py-8 text-center text-slate-400 italic">
                          No se encontraron eventos en la agenda.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </motion.div>
          </div>

          {/* COLUMNA DERECHA: ACONTECIMIENTOS PRÓXIMOS Y CERCANO DESTACADO */}
          <motion.div
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.25 }}
            className="bg-gradient-to-br from-white to-blue-50/50 border border-slate-200 rounded-xl p-4 sm:p-5 shadow-sm flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-4">
                <h2 className="text-xs font-bold text-slate-800 flex items-center gap-2 tracking-wide uppercase">
                  <Clock size={16} className="text-blue-600" /> Eventos Próximos
                </h2>
                <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded-full">
                  {eventosProximos.length} pendiente(s)
                </span>
              </div>

              {/* EVENTO MÁS CERCANO DESTACADO */}
              {eventoMasCercano ? (
                (() => {
                  const diasFaltantes = Math.ceil(
                    (new Date(`${eventoMasCercano.fecha}T00:00:00`) - new Date(`${hoyStr}T00:00:00`)) /
                      (1000 * 60 * 60 * 24)
                  );

                  return (
                    <div className="mb-4 bg-gradient-to-br from-blue-600 to-blue-700 text-white rounded-xl p-4 shadow-md border border-blue-500 relative overflow-hidden">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] uppercase font-extrabold tracking-widest text-blue-200 flex items-center gap-1">
                          <Sparkles size={12} /> Evento Más Inminente
                        </span>
                        <span className="text-[10px] font-bold text-blue-900 bg-blue-100 px-2 py-0.5 rounded-full">
                          {diasFaltantes === 0
                            ? "¡Hoy!"
                            : diasFaltantes === 1
                            ? "Mañana"
                            : `En ${diasFaltantes} días`}
                        </span>
                      </div>

                      <h3 className="text-sm font-bold leading-snug mb-1">
                        {eventoMasCercano.descripcion}
                      </h3>

                      <p className="text-[11px] text-blue-100 font-medium">
                        {new Date(`${eventoMasCercano.fecha}T00:00:00`).toLocaleDateString("es-BO", {
                          weekday: "long",
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                  );
                })()
              ) : null}

              {/* SIGUIENTES EVENTOS */}
              <div className="space-y-2.5 max-h-[320px] overflow-y-auto pr-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Siguientes en agenda:
                </p>

                {eventosProximos.length > 1 ? (
                  eventosProximos.slice(1).map((ev) => {
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
                            {`En ${diasFaltantes} días`}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 font-medium">
                          {new Date(`${ev.fecha}T00:00:00`).toLocaleDateString("es-BO", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </p>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-6 text-slate-400 text-xs italic bg-slate-50 rounded-lg border border-dashed border-slate-200">
                    No hay más eventos programados a futuro.
                  </div>
                )}
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-200 text-center">
              <p className="text-[11px] text-slate-500 italic">
                Agenda oficial del establecimiento para la gestión actual.
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};