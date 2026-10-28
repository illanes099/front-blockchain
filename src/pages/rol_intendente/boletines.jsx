import React, { useEffect, useState, useMemo } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { motion, AnimatePresence } from "framer-motion";
import {
  BookOpen,
  Search,
  Download,
  GraduationCap,
  ShieldCheck,
  Award,
  Users,
  AlertCircle,
  FileCheck,
  CheckCircle2,
  Filter,
  QrCode,
  Layers,
  Stamp,
  Loader2,
  FileBadge,
  CheckCircle,
  Info,
  X,
  FileText
} from "lucide-react";

import { getCalificaciones } from "../../api/api.calificaciones";
import { getEstudiantes } from "../../api/api.estudiante";
import { getUsuarios } from "../../api/api.usuario";
import { getParalelos } from "../../api/api.paralelos";
import { getMaterias } from "../../api/api.materia";
import { certificarBoletin, verificarCertificado } from "../../api/api.blockchain";

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

// Helper para convertir URL de imagen o Canvas a Base64 de forma asíncrona
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

// Genera el código QR institucional con el logo incrustado y placa protectora al centro
const generarQRConLogo = (texto, logoUrl) => {
  return new Promise((resolve) => {
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=320x320&margin=8&ecc=H&color=15-42-74&data=${encodeURIComponent(
      texto
    )}`;
    const qrImg = new Image();
    qrImg.crossOrigin = "Anonymous";
    qrImg.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = qrImg.width;
      canvas.height = qrImg.height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(qrImg, 0, 0);

      const finalize = () => resolve(canvas.toDataURL("image/png"));

      if (!logoUrl) return finalize();

      const logoImg = new Image();
      logoImg.crossOrigin = "Anonymous";
      logoImg.onload = () => {
        const logoSize = canvas.width * 0.22;
        const cx = (canvas.width - logoSize) / 2;
        const cy = (canvas.height - logoSize) / 2;
        const pad = logoSize * 0.16;
        const bx = cx - pad,
          by = cy - pad,
          bw = logoSize + pad * 2,
          bh = logoSize + pad * 2;
        const r = 10;

        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.moveTo(bx + r, by);
        ctx.arcTo(bx + bw, by, bx + bw, by + bh, r);
        ctx.arcTo(bx + bw, by + bh, bx, by + bh, r);
        ctx.arcTo(bx, by + bh, bx, by, r);
        ctx.arcTo(bx, by, bx + bw, by, r);
        ctx.closePath();
        ctx.fill();
        ctx.lineWidth = 4;
        ctx.strokeStyle = "#B8952E";
        ctx.stroke();

        ctx.save();
        ctx.beginPath();
        ctx.arc(cx + logoSize / 2, cy + logoSize / 2, logoSize / 2, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(logoImg, cx, cy, logoSize, logoSize);
        ctx.restore();

        finalize();
      };
      logoImg.onerror = finalize;
      logoImg.src = logoUrl;
    };
    qrImg.onerror = () => resolve(null);
    qrImg.src = qrUrl;
  });
};

export const Boletines = () => {
  const [estudiantesData, setEstudiantesData] = useState([]);
  const [paralelosList, setParalelosList] = useState([]);
  const [materiasList, setMateriasList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [certificandoId, setCertificandoId] = useState(null);

  // Contador de boletines emitidos/verificados durante la sesión
  const [boletinesEmitidos, setBoletinesEmitidos] = useState(0);

  // Estado para controlar la visibilidad e información del Modal
  const [modalInfo, setModalInfo] = useState(null);

  const [filter, setFilter] = useState({
    estudiante: "",
    paralelo: "",
    materia: "",
  });

  // ================== CARGA Y ASOCIACIÓN DE DATOS ==================
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        const [
          resUsuarios,
          dataEstudiantes,
          dataParalelos,
          dataMaterias,
          dataCalificaciones,
        ] = await Promise.all([
          getUsuarios(),
          getEstudiantes(),
          getParalelos(),
          getMaterias(),
          getCalificaciones(),
        ]);

        const usuarios = (resUsuarios.data || resUsuarios || []).filter(
          (u) => u.rol && u.rol.toLowerCase() === "estudiante"
        );
        const estudiantes = dataEstudiantes || [];
        const paralelos = dataParalelos || [];
        const materias = dataMaterias || [];
        const calificaciones = dataCalificaciones || [];

        setParalelosList(paralelos);
        setMateriasList(materias);

        const mapUsuarioById = new Map(usuarios.map((u) => [u.usuario_id, u]));
        const mapParaleloById = new Map(paralelos.map((p) => [p.paralelo_id, p.descripcion]));
        const mapMateriaById = new Map(materias.map((m) => [m.materia_id, m.nombre]));

        // Agrupar asignaturas por estudiante
        const mapMateriasPorEst = new Map();
        calificaciones.forEach((c) => {
          const estId = c.estudiante_id;
          const materiaNombre = mapMateriaById.get(c.materia_id) || `Materia ${c.materia_id}`;

          const materiaObj = {
            materia: materiaNombre,
            trimestre1: Number(c.primer_trimestre) || 0,
            trimestre2: Number(c.segundo_trimestre) || 0,
            trimestre3: Number(c.tercer_trimestre) || 0,
            total: Number(c.total) || 0,
          };

          if (!mapMateriasPorEst.has(estId)) {
            mapMateriasPorEst.set(estId, [materiaObj]);
          } else {
            mapMateriasPorEst.get(estId).push(materiaObj);
          }
        });

        const resultado = [];

        estudiantes.forEach((est) => {
          const user = mapUsuarioById.get(est.usuario_id);
          if (!user) return;

          const materiasEst = mapMateriasPorEst.get(est.estudiante_id) || [];
          if (materiasEst.length === 0) return;

          const nombreCompleto = `${user.nombre || ""} ${user.apellido || ""}`.trim();
          const paraleloDesc = mapParaleloById.get(est.paralelo_id) || `Paralelo ${est.paralelo_id}`;

          // Procesamiento dinámico de imagen de perfil de la BD
          let fotoUrl = "";
          const fotoBD = est.foto || user.foto;
          if (fotoBD) {
            if (typeof fotoBD === "object" && fotoBD.type === "Buffer" && Array.isArray(fotoBD.data)) {
              try {
                const uint8Array = new Uint8Array(fotoBD.data);
                let binaryString = "";
                const chunkSize = 8192;
                for (let i = 0; i < uint8Array.length; i += chunkSize) {
                  const chunk = uint8Array.subarray(i, i + chunkSize);
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

          resultado.push({
            id: est.estudiante_id,
            nombre: nombreCompleto || "Estudiante",
            paralelo: paraleloDesc,
            foto: fotoUrl,
            materias: materiasEst,
          });
        });

        setEstudiantesData(resultado);
      } catch (err) {
        console.error(err);
        setError("Ocurrió un error al cargar los datos de boletines académicos.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // ================== FILTRADO EN TIEMPO REAL ==================
  const filteredEstudiantes = useMemo(() => {
    const fEst = filter.estudiante.toLowerCase().trim();
    const fPar = filter.paralelo.toLowerCase().trim();
    const fMat = filter.materia.toLowerCase().trim();

    return estudiantesData
      .filter((e) => {
        const coincideEstudiante = !fEst || e.nombre.toLowerCase().includes(fEst);
        const coincideParalelo = !fPar || fPar === "todos" || e.paralelo.toLowerCase().includes(fPar);
        return coincideEstudiante && coincideParalelo;
      })
      .map((e) => ({
        ...e,
        materias: e.materias.filter(
          (m) => !fMat || fMat === "todas" || m.materia.toLowerCase().includes(fMat)
        ),
      }))
      .filter((e) => e.materias.length > 0);
  }, [estudiantesData, filter]);

  // ================== EMISIÓN DE BOLETÍN Y NÚCLEO DE GENERACIÓN ==================
  const procesarEmisionBoletin = async (estudiante) => {
    try {
      setCertificandoId(estudiante.id);

      const datosParaCertificar = {
        estudianteId: estudiante.id,
        paralelo: estudiante.paralelo,
        materias: estudiante.materias,
      };

      // Solicitamos la certificación al backend Node.js
      const resBlockchain = await certificarBoletin(datosParaCertificar);
      const hashReal = resBlockchain.hash;

      if (!hashReal) {
        throw new Error("El servidor no retornó una firma digital criptográfica válida.");
      }

      setBoletinesEmitidos((prev) => prev + 1);

      // Desplegar Modal informando si es nuevo o si ya existía previamente
      setModalInfo({
        estudiante,
        hashReal,
        yaExistia: !!resBlockchain.yaExistia,
        message: resBlockchain.message || (resBlockchain.yaExistia 
          ? "Este boletín ya contaba con un registro previamente certificado." 
          : "Se ha registrado y certificado el boletín por primera vez en la Blockchain."),
      });

    } catch (err) {
      console.error("Error en la certificación blockchain:", err);
      alert("No se pudo procesar la certificación del boletín en la Blockchain.");
    } finally {
      setCertificandoId(null);
    }
  };

  // Función que construye y descarga el archivo PDF
  const descargarPDFOficial = async (estudiante, hashReal) => {
    try {
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "letter",
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 16;
      const contentWidth = pageWidth - margin * 2;

      const logoBase64 = await cargarImagenBase64("/logo.png");

      // ================== MARCO DE SEGURIDAD ==================
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

      // ================== MARCAS DE AGUA ==================
      if (logoBase64) {
        try {
          doc.saveGraphicsState();
          if (doc.setGState) {
            doc.setGState(new doc.GState({ opacity: 0.045 }));
          }
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
        } catch (err) {
          console.error("Error aplicando marcas de agua:", err);
        }
      }

      if (logoBase64) {
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

      // ================== ENCABEZADO INSTITUCIONAL ==================
      let currentY = 20;

      if (logoBase64) {
        const logoHeaderSize = 20;
        doc.setDrawColor(...INK.gold);
        doc.setLineWidth(0.4);
        doc.circle(pageWidth / 2, currentY + logoHeaderSize / 2, logoHeaderSize / 2 + 1.6);
        doc.addImage(
          logoBase64,
          "PNG",
          (pageWidth - logoHeaderSize) / 2,
          currentY,
          logoHeaderSize,
          logoHeaderSize
        );
        currentY += logoHeaderSize + 6;
      }

      const colegioNombre = "UNIDAD EDUCATIVA ROBERTO ALVARADO DAZA 'B'";

      doc.setFont("times", "bold");
      doc.setFontSize(15);
      doc.setTextColor(...INK.navy);
      doc.text(colegioNombre, pageWidth / 2, currentY, { align: "center" });

      currentY += 6;
      doc.setFont("times", "italic");
      doc.setFontSize(10.5);
      doc.setTextColor(...INK.gold);
      doc.text("Boletín Oficial de Calificaciones Trimestrales", pageWidth / 2, currentY, { align: "center" });

      currentY += 5;
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

      currentY += 4.5;
      const rt = currentY;
      doc.setDrawColor(...INK.gold);
      doc.setLineWidth(0.6);
      doc.line(margin, rt, pageWidth / 2 - 4, rt);
      doc.line(pageWidth / 2 + 4, rt, pageWidth - margin, rt);
      doc.setFillColor(...INK.gold);
      doc.triangle(pageWidth / 2 - 2, rt, pageWidth / 2 + 2, rt, pageWidth / 2, rt - 2.2, "F");
      doc.triangle(pageWidth / 2 - 2, rt, pageWidth / 2 + 2, rt, pageWidth / 2, rt + 2.2, "F");

      // ================== FICHA TÉCNICA DEL ESTUDIANTE ==================
      currentY += 7;
      const cardHeight = 24;
      doc.setFillColor(...INK.paper);
      doc.setDrawColor(...INK.navy);
      doc.setLineWidth(0.35);
      doc.roundedRect(margin, currentY, contentWidth, cardHeight, 1.5, 1.5, "FD");
      doc.setDrawColor(...INK.gold);
      doc.setLineWidth(0.25);
      doc.roundedRect(margin + 1, currentY + 1, contentWidth - 2, cardHeight - 2, 1, 1);

      let textStartX = margin + 8;
      if (estudiante.foto) {
        try {
          doc.setDrawColor(...INK.gold);
          doc.setLineWidth(0.5);
          doc.rect(margin + 4, currentY + 3, 18, 18);
          doc.addImage(estudiante.foto, "JPEG", margin + 4, currentY + 3, 18, 18);
          textStartX = margin + 27;
        } catch {
          textStartX = margin + 8;
        }
      }

      doc.setFont("times", "bold");
      doc.setFontSize(11.5);
      doc.setTextColor(...INK.navy);
      doc.text(estudiante.nombre.toUpperCase(), textStartX, currentY + 9);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(...INK.slate);
      doc.text(`Paralelo / Curso:  ${estudiante.paralelo}`, textStartX, currentY + 16);

      // Sello circular
      const sealCx = pageWidth - margin - 16;
      const sealCy = currentY + cardHeight / 2;
      doc.setDrawColor(...INK.emerald);
      doc.setLineWidth(0.5);
      doc.circle(sealCx, sealCy, 9.2);
      doc.setLineWidth(0.2);
      doc.circle(sealCx, sealCy, 7.6);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(5.4);
      doc.setTextColor(...INK.emerald);
      doc.text("VERIFICADO", sealCx, sealCy - 1.6, { align: "center" });
      doc.text("BLOCKCHAIN", sealCx, sealCy + 1.4, { align: "center" });
      doc.setFontSize(4.6);
      doc.text("★", sealCx, sealCy + 4.6, { align: "center" });

      currentY += cardHeight + 7;

      // ================== TABLA DE NOTAS ==================
      const tableColumn = ["ASIGNATURA / MATERIA", "1ER TRIM.", "2DO TRIM.", "3ER TRIM.", "PROMEDIO FINAL"];
      const tableRows = [];
      let sumaPromedios = 0;

      estudiante.materias.forEach((m) => {
        const promCalculado = Number(((m.trimestre1 + m.trimestre2 + m.trimestre3) / 3).toFixed(2));
        const notaFinal = m.total > 0 ? m.total : promCalculado;
        sumaPromedios += notaFinal;
        tableRows.push([
          m.materia.toUpperCase(),
          m.trimestre1 || "0",
          m.trimestre2 || "0",
          m.trimestre3 || "0",
          `${notaFinal} pts`,
        ]);
      });

      const promedioGeneralEstudiante = Number((sumaPromedios / (estudiante.materias.length || 1)).toFixed(2));

      autoTable(doc, {
        startY: currentY,
        head: [tableColumn],
        body: tableRows,
        theme: "grid",
        margin: { left: margin, right: margin },
        styles: {
          font: "helvetica",
          fontSize: 8.5,
          cellPadding: 3,
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
          fontSize: 8,
          cellPadding: 3.2,
        },
        columnStyles: {
          0: { cellWidth: 70, halign: "left", fontStyle: "bold" },
          1: { cellWidth: 28 },
          2: { cellWidth: 28 },
          3: { cellWidth: 28 },
          4: { cellWidth: 29.9, fontStyle: "bold", textColor: INK.navy },
        },
        alternateRowStyles: { fillColor: [247, 244, 235] },
        didDrawPage: (data) => {
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

      // ================== RESUMEN ==================
      currentY = (doc.lastAutoTable?.finalY || currentY + 50) + 5;

      doc.setFillColor(...INK.navy);
      doc.roundedRect(margin, currentY, contentWidth, 13, 1.5, 1.5, "F");
      doc.setFillColor(...INK.gold);
      doc.rect(margin, currentY, 2.2, 13, "F");

      doc.setFont("times", "bold");
      doc.setFontSize(9.5);
      doc.setTextColor(250, 248, 242);
      doc.text(`PROMEDIO GENERAL:  ${promedioGeneralEstudiante} / 100 pts`, margin + 7, currentY + 8.2);

      const condicion =
        promedioGeneralEstudiante >= 85
          ? "SOBRESALIENTE"
          : promedioGeneralEstudiante >= 70
          ? "APROBADO"
          : "EN RIESGO ACADÉMICO";

      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(
        condicion === "EN RIESGO ACADÉMICO" ? 248 : 212,
        condicion === "EN RIESGO ACADÉMICO" ? 180 : 195,
        condicion === "EN RIESGO ACADÉMICO" ? 170 : 130
      );
      doc.text(`ESTATUS ACADÉMICO:  ${condicion}`, pageWidth - margin - 7, currentY + 8.2, { align: "right" });

      // ================== CÓDIGO QR Y FIRMA ==================
      currentY += 20;

      // const urlVerificacion = `http://localhost:5173/verificar?hash=${hashReal}`;
      const urlVerificacion = `https://boletines-daza.pages.dev/verificar?hash=${hashReal}`;
      const textoContenidoQR = `Institución: ${colegioNombre}\nEstudiante: ${estudiante.nombre}\nVerificación: ${urlVerificacion}`;

      const qrBase64 = await generarQRConLogo(textoContenidoQR, "/logo.png");

      const qrBoxHeight = 34;
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(...INK.navy);
      doc.setLineWidth(0.3);
      doc.roundedRect(margin, currentY, contentWidth, qrBoxHeight, 1.5, 1.5, "FD");
      doc.setDrawColor(...INK.gold);
      doc.setLineWidth(0.6);
      doc.line(margin + 30, currentY + 4, margin + 30, currentY + qrBoxHeight - 4);

      if (qrBase64) {
        doc.addImage(qrBase64, "PNG", margin + 4, currentY + 4, 26, 26);
      }

      const securityTextX = margin + 37;
      doc.setFont("times", "bold");
      doc.setFontSize(9);
      doc.setTextColor(...INK.navy);
      doc.text("DOCUMENTO OFICIAL PROTEGIDO Y VERIFICADO", securityTextX, currentY + 8);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(...INK.slate);
      doc.text("Certificación digital con inmutabilidad de datos registrada en Blockchain.", securityTextX, currentY + 13.5);
      doc.text("Escanee el código para validar la autenticidad de este boletín.", securityTextX, currentY + 17.8);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(7);
      doc.setTextColor(...INK.red);
      doc.text("PROHIBIDO SU PLAGIO O ALTERACIÓN — cualquier modificación invalida el documento.", securityTextX, currentY + 23.5);

      doc.setFont("courier", "normal");
      doc.setFontSize(6.3);
      doc.setTextColor(...INK.slate);
      doc.text(`HASH: ${hashReal}`, securityTextX, currentY + 29);

      // ================== FIRMAS ==================
      currentY += qrBoxHeight + 18;

      const lineLength = 52;
      const leftSignatureX = margin + contentWidth / 4 - lineLength / 2;
      const rightSignatureX = margin + (3 * contentWidth) / 4 - lineLength / 2;

      doc.setDrawColor(...INK.navy);
      doc.setLineWidth(0.4);
      doc.line(leftSignatureX, currentY, leftSignatureX + lineLength, currentY);
      doc.line(rightSignatureX, currentY, rightSignatureX + lineLength, currentY);

      doc.setFont("times", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(...INK.navy);
      doc.text("DIRECCIÓN GENERAL", leftSignatureX + lineLength / 2, currentY + 5, { align: "center" });
      doc.text("SECRETARÍA ACADÉMICA", rightSignatureX + lineLength / 2, currentY + 5, { align: "center" });

      doc.setFont("helvetica", "normal");
      doc.setFontSize(6.8);
      doc.setTextColor(...INK.slate);
      doc.text("Sello y Firma Oficial", leftSignatureX + lineLength / 2, currentY + 9, { align: "center" });
      doc.text("Firma de Conformidad", rightSignatureX + lineLength / 2, currentY + 9, { align: "center" });

      doc.setFont("times", "italic");
      doc.setFontSize(7);
      doc.setTextColor(...INK.slate);
      doc.text(
        "Sistema de Gestión Académica Institucional   ·   Documento válido sin enmiendas",
        pageWidth / 2,
        pageHeight - 11,
        { align: "center" }
      );

      doc.save(`boletin_${estudiante.nombre.toLowerCase().replace(/\s+/g, "_")}.pdf`);
    } catch (err) {
      console.error("Error generando PDF:", err);
    }
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
            Cargando boletines trimestrales…
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

  const totalEstudiantes = estudiantesData.length;
  const paralelosActivos = new Set(estudiantesData.map((e) => e.paralelo)).size;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#EEF3FC] via-[#E9F0FB] to-[#E3ECFA] text-slate-800 p-3 xs:p-4 sm:p-6 md:p-10 font-sans relative">
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
              <GraduationCap className="text-blue-700" size={24} />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] sm:text-xs uppercase tracking-[0.2em] text-blue-700 font-semibold mb-1">
                Panel Académico · Certificación Digital
              </p>
              <h1 className="text-lg xs:text-xl sm:text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">
                Boletines Trimestrales
              </h1>
             
            </div>
          </div>
        </motion.div>

       

        {/* BARRA DE FILTROS */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-gradient-to-br from-white to-blue-50/50 border border-slate-200 rounded-xl p-4 sm:p-5 shadow-sm mb-6 sm:mb-8"
        >
          <div className="flex items-center gap-2 mb-4">
            <Filter size={13} className="text-blue-600" />
            <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-blue-700">
              Filtros de Búsqueda
            </span>
            <div className="h-px flex-1 bg-slate-200" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
            <div>
              <label className="block text-xs font-semibold text-blue-700 uppercase tracking-wide mb-1.5 flex items-center gap-1">
                <Search size={13} /> Buscar Estudiante
              </label>
              <input
                type="text"
                placeholder="Nombre o apellido…"
                value={filter.estudiante}
                onChange={(e) => setFilter({ ...filter, estudiante: e.target.value })}
                className="w-full p-2.5 rounded-md bg-white border border-slate-300 text-slate-800 text-xs focus:ring-2 focus:ring-blue-400/50 outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-blue-700 uppercase tracking-wide mb-1.5 flex items-center gap-1">
                <Layers size={13} /> Paralelo / Curso
              </label>
              <select
                value={filter.paralelo}
                onChange={(e) => setFilter({ ...filter, paralelo: e.target.value })}
                className="w-full p-2.5 rounded-md bg-white border border-slate-300 text-slate-800 text-xs focus:ring-2 focus:ring-blue-400/50 outline-none transition-all"
              >
                <option value="">Todos los Paralelos</option>
                {paralelosList.map((p) => (
                  <option key={p.paralelo_id} value={p.descripcion}>
                    {p.descripcion}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-blue-700 uppercase tracking-wide mb-1.5 flex items-center gap-1">
                <BookOpen size={13} /> Materia / Asignatura
              </label>
              <select
                value={filter.materia}
                onChange={(e) => setFilter({ ...filter, materia: e.target.value })}
                className="w-full p-2.5 rounded-md bg-white border border-slate-300 text-slate-800 text-xs focus:ring-2 focus:ring-blue-400/50 outline-none transition-all"
              >
                <option value="">Todas las Materias</option>
                {materiasList.map((m) => (
                  <option key={m.materia_id} value={m.nombre}>
                    {m.nombre.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </motion.div>

        {/* LISTA DE BOLETINES */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="space-y-6"
        >
          {filteredEstudiantes.length === 0 ? (
            <div className="bg-gradient-to-b from-white to-slate-50 border border-slate-200 rounded-xl p-12 text-center text-slate-500 text-xs italic shadow-sm">
              No se encontraron boletines de calificaciones con los filtros seleccionados.
            </div>
          ) : (
            filteredEstudiantes.map((est) => (
              <motion.div
                key={est.id}
                whileHover={{ y: -2 }}
                className="bg-gradient-to-br from-white to-slate-50 border border-slate-200 rounded-xl shadow-sm overflow-hidden"
              >
                {/* Cabecera de la tarjeta */}
                <div className="p-4 sm:p-5 border-b border-slate-200 bg-gradient-to-r from-blue-50/70 to-transparent flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    {est.foto ? (
                      <img
                        src={est.foto}
                        alt={`Foto de ${est.nombre}`}
                        className="w-11 h-11 rounded-full object-cover border-2 border-blue-400 shadow-sm shrink-0 bg-slate-100"
                      />
                    ) : (
                      <div className="w-11 h-11 rounded-full bg-gradient-to-br from-blue-200 to-blue-300 border border-blue-300 flex items-center justify-center text-xs font-bold text-blue-800 shrink-0 shadow-xs">
                        {iniciales(est.nombre)}
                      </div>
                    )}

                    <div>
                      <h2 className="text-base font-bold text-slate-900 leading-snug">
                        {est.nombre}
                      </h2>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className="text-[11px] font-semibold text-blue-800 bg-blue-100 border border-blue-200 px-2.5 py-0.5 rounded-full">
                          {est.paralelo}
                        </span>
                        <span className="text-[11px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                          <QrCode size={12} /> Blockchain Ready
                        </span>
                      </div>
                    </div>
                  </div>

                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    disabled={certificandoId === est.id}
                    onClick={() => procesarEmisionBoletin(est)}
                    className="flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 disabled:opacity-50 text-white font-semibold rounded-md shadow-sm shadow-blue-200 px-4 py-2 text-xs tracking-wide transition-colors self-start sm:self-auto"
                  >
                    {certificandoId === est.id ? (
                      <>
                        <Loader2 size={14} className="animate-spin" />
                        Certificando en Sepolia…
                      </>
                    ) : (
                      <>
                        <Download size={14} /> Exportar Boletín PDF
                      </>
                    )}
                  </motion.button>
                </div>

                {/* Tabla de materias */}
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead className="bg-gradient-to-r from-blue-100/70 to-sky-100/70 text-blue-800 text-xs">
                      <tr>
                        <th className="py-3 px-5 text-left font-bold uppercase tracking-wider">Materia</th>
                        <th className="py-3 px-5 text-center font-bold uppercase tracking-wider">1er Trim.</th>
                        <th className="py-3 px-5 text-center font-bold uppercase tracking-wider">2do Trim.</th>
                        <th className="py-3 px-5 text-center font-bold uppercase tracking-wider">3er Trim.</th>
                        <th className="py-3 px-5 text-center font-bold uppercase tracking-wider">Promedio</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                      {est.materias.map((m, index) => {
                        const promedioCalculado = (m.trimestre1 + m.trimestre2 + m.trimestre3) / 3;
                        const promedio = Number(promedioCalculado.toFixed(2));
                        const notaFinal = m.total > 0 ? m.total : promedio;
                        const esSobresaliente = notaFinal >= 85;
                        const esReprobado = notaFinal < 70;

                        return (
                          <tr key={index} className="hover:bg-blue-50/50 transition-colors">
                            <td className="py-3 px-5 font-semibold text-slate-800">
                              {m.materia}
                            </td>
                            <td className="py-3 px-5 text-center text-slate-600 font-medium">{m.trimestre1}</td>
                            <td className="py-3 px-5 text-center text-slate-600 font-medium">{m.trimestre2}</td>
                            <td className="py-3 px-5 text-center text-slate-600 font-medium">{m.trimestre3}</td>
                            <td className="py-3 px-5 text-center">
                              <span
                                className={`inline-flex items-center justify-center min-w-[3.2rem] px-2.5 py-0.5 rounded font-bold ${
                                  esSobresaliente
                                    ? "bg-emerald-100 border border-emerald-300 text-emerald-800"
                                    : esReprobado
                                    ? "bg-red-100 border border-red-300 text-red-800"
                                    : "bg-amber-100 border border-amber-300 text-amber-800"
                                }`}
                              >
                                {notaFinal} pts
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="bg-blue-50/70 border-t-2 border-blue-200">
                        <td
                          colSpan={4}
                          className="py-2.5 px-5 text-right text-[11px] font-bold uppercase tracking-wide text-blue-800"
                        >
                          Promedio General
                        </td>
                        <td className="py-2.5 px-5 text-center">
                          <span className="inline-flex items-center gap-1 text-[13px] font-bold text-blue-800">
                            <Stamp size={13} className="text-blue-500" />
                            {Number(
                              (
                                est.materias.reduce(
                                  (acc, m) =>
                                    acc +
                                    (m.total > 0 ? m.total : (m.trimestre1 + m.trimestre2 + m.trimestre3) / 3),
                                  0
                                ) / (est.materias.length || 1)
                              ).toFixed(2)
                            )}{" "}
                            pts
                          </span>
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </motion.div>
            ))
          )}
        </motion.div>
      </div>

      {/* ============================================================
          MODAL INSTITUCIONAL DE CONFIRMACIÓN Y ESTADO BLOCKCHAIN
          ============================================================ */}
      <AnimatePresence>
        {modalInfo && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.2 }}
              className="bg-white border border-slate-200 rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden"
            >
              {/* Encabezado del Modal */}
              <div
                className={`p-5 flex items-center justify-between border-b ${
                  modalInfo.yaExistia
                    ? "bg-amber-50/80 border-amber-200 text-amber-900"
                    : "bg-emerald-50/80 border-emerald-200 text-emerald-950"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                      modalInfo.yaExistia
                        ? "bg-amber-100 text-amber-700"
                        : "bg-emerald-100 text-emerald-700"
                    }`}
                  >
                    {modalInfo.yaExistia ? <Info size={22} /> : <CheckCircle size={22} />}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold leading-tight">
                      {modalInfo.yaExistia
                        ? "Boletín Previamente Certificado"
                        : "Boletín Registrado con Éxito"}
                    </h3>
                    <p className="text-[11px] opacity-80 mt-0.5">
                      {modalInfo.yaExistia
                        ? "Estado en Blockchain: Registrado"
                        : "Estado en Blockchain: Nuevo Registro"}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setModalInfo(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Cuerpo del Modal */}
              <div className="p-5 sm:p-6 space-y-4">
                <p className="text-xs text-slate-600 leading-relaxed">
                  {modalInfo.message}
                </p>

                {/* Tarjeta con resumen del estudiante */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex items-center gap-3">
                  {modalInfo.estudiante.foto ? (
                    <img
                      src={modalInfo.estudiante.foto}
                      alt="Foto"
                      className="w-10 h-10 rounded-full object-cover border border-blue-400 shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs shrink-0">
                      {iniciales(modalInfo.estudiante.nombre)}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-slate-900 truncate">
                      {modalInfo.estudiante.nombre}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      {modalInfo.estudiante.paralelo}
                    </p>
                  </div>
                </div>

                {/* Bloque con la firma Hash */}
                <div>
                  <span className="text-[10px] uppercase tracking-wider font-bold text-slate-500 block mb-1">
                    Firma Hash Criptográfica :
                  </span>
                  <div className="bg-slate-100 border border-slate-200 p-2.5 rounded-lg font-mono text-[10px] text-slate-700 break-all select-all">
                    {modalInfo.hashReal}
                  </div>
                </div>
              </div>

              {/* Pie del Modal con Botón Entendido / Descargar */}
              <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
                <button
                  onClick={() => {
                    descargarPDFOficial(modalInfo.estudiante, modalInfo.hashReal);
                    setModalInfo(null);
                  }}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs py-2.5 px-5 rounded-lg transition-colors shadow-xs"
                >
                  <Download size={14} /> Entendido / Descargar PDF
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};