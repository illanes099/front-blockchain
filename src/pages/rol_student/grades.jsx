import React, { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileDown,
  Eye,
  Award,
  BookOpen,
  CheckCircle2,
  AlertCircle,
  X,
  ShieldCheck,
  GraduationCap,
  Sparkles,
  Lock,
  QrCode,
  Stamp,
  FileBadge,
} from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// Importación de APIs
import { getUsuarios } from "../../api/api.usuario";
import {
  getEstudiantes,
  getEstudiantesGeneral,
} from "../../api/api.estudiante";
import { getParalelos } from "../../api/api.paralelos";
import { verificarCertificado } from "../../api/api.blockchain";

// Función formateadora: Muestra entero si no hay decimales, o hasta 2 decimales si existen
const formatearNota = (valor) => {
  if (valor === null || valor === undefined || valor === "" || isNaN(valor)) return "—";
  const num = Number(valor);
  return Number.isInteger(num) ? num.toString() : parseFloat(num.toFixed(2)).toString();
};

/* ============================================================
   TOKENS DE DISEÑO — MISMA PALETA INSTITUCIONAL DEL DIRECTOR
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

const ETHERSCAN_ADDRESS = "0xDc91065245897519FCE01b617EC2533399A928f5";
const ETHERSCAN_URL = `https://sepolia.etherscan.io/address/${ETHERSCAN_ADDRESS}`;
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

// Genera el código QR institucional con el logo incrustado
const generarQRConLogo = (texto, logoUrl) => {
  return new Promise((resolve) => {
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=340x340&margin=8&ecc=H&color=15-42-74&data=${encodeURIComponent(
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

export const Calificaciones = () => {
  const [usuario, setUsuario] = useState([]);
  const [calificacionesGenerales, setCalificacionesGenerales] = useState([]);
  const [estudiante, setEstudiante] = useState([]);
  const [paralelosList, setParalelosList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Estados de Certificación
  const [estaCertificado, setEstaCertificado] = useState(false);
  const [datosCertificacion, setDatosCertificacion] = useState(null);
  const [verificandoBlockchain, setVerificandoBlockchain] = useState(true);

  // Modal Vista Previa
  const [modalBoletinOpen, setModalBoletinOpen] = useState(false);

  useEffect(() => {
    const getValues = async () => {
      try {
        setLoading(true);
        setError(null);
        const [
          responseUsuarios,
          responseCalificacionesGenerales,
          responseStudent,
          responseParalelos,
        ] = await Promise.all([
          getUsuarios(),
          getEstudiantesGeneral(),
          getEstudiantes(),
          getParalelos(),
        ]);
        setUsuario(responseUsuarios.data || responseUsuarios || []);
        setCalificacionesGenerales(responseCalificacionesGenerales || []);
        setEstudiante(responseStudent || []);
        setParalelosList(responseParalelos || []);
      } catch (err) {
        console.error("Error al traer los datos:", err);
        setError("Ocurrió un error al consultar tus calificaciones.");
      } finally {
        setLoading(false);
      }
    };
    getValues();
  }, []);

  // Identificar usuario estudiante logueado
  const usuarioStudent = useMemo(() => {
    const localUsername = localStorage.getItem("username");
    return usuario.find((u) => u.username === localUsername);
  }, [usuario]);

  const usuarioId = usuarioStudent?.usuario_id;

  const estudianteObj = useMemo(() => {
    return estudiante.find((std) => std.usuario_id === usuarioId);
  }, [estudiante, usuarioId]);

  const estudianteId = estudianteObj?.estudiante_id;

  // Foto de perfil procesada de la BD
  const fotoEstudianteUrl = useMemo(() => {
    const fotoBD = estudianteObj?.foto || usuarioStudent?.foto;
    if (!fotoBD) return "";
    if (typeof fotoBD === "object" && fotoBD.type === "Buffer" && Array.isArray(fotoBD.data)) {
      try {
        const uint8Array = new Uint8Array(fotoBD.data);
        let binaryString = "";
        const chunkSize = 8192;
        for (let i = 0; i < uint8Array.length; i += chunkSize) {
          const chunk = uint8Array.subarray(i, i + chunkSize);
          binaryString += String.fromCharCode.apply(null, chunk);
        }
        return `data:image/jpeg;base64,${btoa(binaryString)}`;
      } catch {
        return "";
      }
    } else if (typeof fotoBD === "string" && fotoBD.length > 0) {
      return fotoBD.startsWith("data:image") ? fotoBD : `data:image/jpeg;base64,${fotoBD}`;
    }
    return "";
  }, [estudianteObj, usuarioStudent]);

  // Obtener descripción del Paralelo
  const paraleloNombre = useMemo(() => {
    if (!estudianteObj || !paralelosList.length) return "General";
    const par = paralelosList.find((p) => p.paralelo_id === estudianteObj.paralelo_id);
    return par ? par.descripcion : `Paralelo ${estudianteObj.paralelo_id}`;
  }, [estudianteObj, paralelosList]);

  // Calificaciones específicas del estudiante
  const calificaciones = useMemo(() => {
    return calificacionesGenerales.filter(
      (c) => c.estudiante_id === estudianteId
    );
  }, [calificacionesGenerales, estudianteId]);

  // ============================================================
  // VERIFICAR SI EL HASH DE LAS NOTAS ACTUALES ESTÁ EN BLOCKCHAIN
  // ============================================================
  useEffect(() => {
    const auditarBoletinEstudiante = async () => {
      if (!estudianteId || !calificaciones.length) {
        setVerificandoBlockchain(false);
        return;
      }

      try {
        setVerificandoBlockchain(true);

        // 1. Mapear y ordenar materias alfabéticamente igual que en el hash util del backend
        const materiasParaHash = calificaciones.map((c) => ({
          materia: c.materia,
          trimestre1: Number(c.primer_trimestre) || 0,
          trimestre2: Number(c.segundo_trimestre) || 0,
          trimestre3: Number(c.tercer_trimestre) || 0,
          total: Number(c.total) || 0,
        }));

        const materiasOrdenadas = [...materiasParaHash].sort((a, b) =>
          a.materia.localeCompare(b.materia)
        );

        const payloadString = JSON.stringify({
          estudianteId: Number(estudianteId),
          paralelo: paraleloNombre,
          materias: materiasOrdenadas,
        });

        // 2. Generar el Hash SHA-256 en el navegador
        const encoder = new TextEncoder();
        const dataBuffer = encoder.encode(payloadString);
        const hashBuffer = await crypto.subtle.digest("SHA-256", dataBuffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = "0x" + hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

        // 3. Consultar la API pública con el hash criptográfico calculado
        const res = await verificarCertificado(hashHex);

        if (res && res.existe && res.autentico !== false) {
          setEstaCertificado(true);
          setDatosCertificacion(res);
        } else {
          setEstaCertificado(false);
          setDatosCertificacion(null);
        }
      } catch (err) {
        console.log("No se encontró certificación activa para este boletín.");
        setEstaCertificado(false);
        setDatosCertificacion(null);
      } finally {
        setVerificandoBlockchain(false);
      }
    };

    auditarBoletinEstudiante();
  }, [estudianteId, calificaciones, paraleloNombre]);

  // Promedio General
  const promedioGeneral = useMemo(() => {
    if (!calificaciones.length) return "0";
    const suma = calificaciones.reduce(
      (acc, item) => acc + (Number(item.total) || 0),
      0
    );
    const prom = suma / calificaciones.length;
    return formatearNota(prom);
  }, [calificaciones]);

  const materiasAprobadas = useMemo(() => {
    return calificaciones.filter((c) => (Number(c.total) || 0) >= 70).length;
  }, [calificaciones]);

  const condicionAcademica = useMemo(() => {
    const prom = Number(promedioGeneral);
    if (prom >= 85) return { texto: "Sobresaliente", color: "text-emerald-700 bg-emerald-100 border-emerald-300" };
    if (prom >= 70) return { texto: "Aprobado Regular", color: "text-blue-700 bg-blue-100 border-blue-300" };
    return { texto: "En Riesgo Académico", color: "text-red-700 bg-red-100 border-red-300" };
  }, [promedioGeneral]);

  // ============================================================
  // GENERAR PDF IDÉNTICO AL DEL DIRECTOR
  // ============================================================
  const generarBoletinPDF = async () => {
    if (!usuarioStudent || !calificaciones.length || !estaCertificado) return;

    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "letter",
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 16;
    const contentWidth = pageWidth - margin * 2;

    const hashReal = datosCertificacion?.hash_boletin || datosCertificacion?.hash || "0x0000000000000000000000000000000000000000";
    const nombreCompleto = `${usuarioStudent.nombre || ""} ${usuarioStudent.apellido || ""}`.trim();

    const logoBase64 = await cargarImagenBase64("/logo.png");

    // Marco de Seguridad
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

    // Marca de Agua Mosaico y Central
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
        doc.addImage(logoBase64, "PNG", (pageWidth - bigSize) / 2, (pageHeight - bigSize) / 2, bigSize, bigSize);
        doc.restoreGraphicsState();
      } catch {}
    }

    // Encabezado Ceremonial
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
    doc.text("Boletín Oficial de Calificaciones Trimestrales", pageWidth / 2, currentY, { align: "center" });

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

    // Ficha Estudiante
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
    if (fotoEstudianteUrl) {
      try {
        doc.setDrawColor(...INK.gold);
        doc.setLineWidth(0.5);
        doc.rect(margin + 4, currentY + 3, 18, 18);
        doc.addImage(fotoEstudianteUrl, "JPEG", margin + 4, currentY + 3, 18, 18);
        textStartX = margin + 27;
      } catch {
        textStartX = margin + 8;
      }
    }

    doc.setFont("times", "bold");
    doc.setFontSize(11.5);
    doc.setTextColor(...INK.navy);
    doc.text(nombreCompleto.toUpperCase(), textStartX, currentY + 9);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(...INK.slate);
    doc.text(`Paralelo / Curso:  ${paraleloNombre}`, textStartX, currentY + 16);

    // Sello
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

    // Tabla de Notas
    const tableColumn = ["ASIGNATURA / MATERIA", "1ER TRIM.", "2DO TRIM.", "3ER TRIM.", "PROMEDIO FINAL"];
    const tableRows = calificaciones.map((item) => [
      (item.materia || "ASIGNATURA").toUpperCase(),
      formatearNota(item.primer_trimestre),
      formatearNota(item.segundo_trimestre),
      formatearNota(item.tercer_trimestre),
      `${formatearNota(item.total)} pts`,
    ]);

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

    // Resumen General
    currentY = (doc.lastAutoTable?.finalY || currentY + 50) + 5;

    doc.setFillColor(...INK.navy);
    doc.roundedRect(margin, currentY, contentWidth, 13, 1.5, 1.5, "F");
    doc.setFillColor(...INK.gold);
    doc.rect(margin, currentY, 2.2, 13, "F");

    doc.setFont("times", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(250, 248, 242);
    doc.text(`PROMEDIO GENERAL:  ${promedioGeneral} / 100 pts`, margin + 7, currentY + 8.2);

    const condicion =
      Number(promedioGeneral) >= 85
        ? "SOBRESALIENTE"
        : Number(promedioGeneral) >= 70
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

    // Código QR
    currentY += 20;

    // const urlVerificacionLocal = `http://localhost:5173/verificar?hash=${hashReal}`;
    const urlVerificacionLocal = `https://boletines-daza.pages.dev/verificar?hash=${hashReal}`;
    const textoContenidoQR = 
`Colegio: ${COLEGIO_NOMBRE}
Estudiante: ${nombreCompleto}
Paralelo: ${paraleloNombre}
Hash: ${hashReal}
Etherscan: ${ETHERSCAN_URL}
Verificar: ${urlVerificacionLocal}`;

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

    // Firmas
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

    doc.save(`boletin_oficial_${usuarioStudent.nombre.toLowerCase().replace(/\s+/g, "_")}.pdf`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#EEF3FC] via-[#E9F0FB] to-[#E3ECFA] flex items-center justify-center p-4 font-sans">
        <div className="flex items-center gap-3 bg-white border border-slate-200 px-6 py-4 rounded-xl shadow-lg">
          <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-slate-700 text-sm font-semibold">
            Cargando tus calificaciones…
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
          <h3 className="text-base font-bold text-slate-900 mb-1">Error de consulta</h3>
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
      
      {/* MODAL VISTA PREVIA DEL BOLETÍN OFICIAL */}
      <AnimatePresence>
        {modalBoletinOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between border-b border-slate-200 pb-4 mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-100 border border-blue-200 flex items-center justify-center text-blue-700">
                    <GraduationCap size={20} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">
                      Boletín Oficial Certificado
                    </h3>
                    <p className="text-xs text-slate-500">
                      Documento oficial inmutable verificado para {usuarioStudent?.nombre}{" "}
                      {usuarioStudent?.apellido}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setModalBoletinOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-5 space-y-3">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500">Estudiante:</span>
                  <span className="font-bold text-slate-900">
                    {usuarioStudent?.nombre} {usuarioStudent?.apellido}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500">Paralelo / Curso:</span>
                  <span className="font-semibold text-blue-700">
                    {paraleloNombre}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500">Estado Blockchain:</span>
                  <span className="font-bold text-emerald-700 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded flex items-center gap-1">
                    <ShieldCheck size={13} /> Registrado e Inmutable
                  </span>
                </div>
                <div className="pt-2 border-t border-slate-200">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block mb-1">
                    Firma Hash Digital:
                  </span>
                  <div className="bg-slate-100 p-2 rounded text-[10px] font-mono text-slate-700 break-all border border-slate-200 select-all">
                    {datosCertificacion?.hash_boletin || datosCertificacion?.hash || "Certificado Activo"}
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto border border-slate-200 rounded-xl mb-6">
                <table className="min-w-full text-xs">
                  <thead className="bg-blue-600 text-white font-bold">
                    <tr>
                      <th className="py-2.5 px-3 text-left">Materia</th>
                      <th className="py-2.5 px-3 text-center">1er Trim.</th>
                      <th className="py-2.5 px-3 text-center">2do Trim.</th>
                      <th className="py-2.5 px-3 text-center">3er Trim.</th>
                      <th className="py-2.5 px-3 text-center">Final</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {calificaciones.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="py-2 px-3 font-semibold text-slate-800">
                          {item.materia}
                        </td>
                        <td className="py-2 px-3 text-center text-slate-600">
                          {formatearNota(item.primer_trimestre)}
                        </td>
                        <td className="py-2 px-3 text-center text-slate-600">
                          {formatearNota(item.segundo_trimestre)}
                        </td>
                        <td className="py-2 px-3 text-center text-slate-600">
                          {formatearNota(item.tercer_trimestre)}
                        </td>
                        <td className="py-2 px-3 text-center font-bold text-blue-800">
                          {formatearNota(item.total)} pts
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
                <button
                  onClick={() => setModalBoletinOpen(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-md text-xs font-semibold transition-colors"
                >
                  Cerrar
                </button>
                <button
                  onClick={generarBoletinPDF}
                  className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white rounded-md text-xs font-semibold flex items-center gap-2 shadow-xs transition-colors"
                >
                  <FileDown size={15} /> Descargar PDF Oficial
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8">
        
        {/* ENCABEZADO Y SALUDO */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 border-b border-slate-300 pb-6"
        >
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-lg bg-gradient-to-br from-blue-100 to-blue-200 border border-blue-300 flex items-center justify-center shrink-0 shadow-sm">
              <GraduationCap className="text-blue-700" size={24} />
            </div>
            <div>
              <p className="text-[10px] sm:text-xs uppercase tracking-[0.2em] text-blue-700 font-semibold mb-1">
                Portal Estudiantil · Consulta Académica
              </p>
              <h1 className="text-lg xs:text-xl sm:text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">
                ¡Hola, {usuarioStudent?.nombre ?? "Estudiante"} {usuarioStudent?.apellido ?? ""}!
              </h1>
            </div>
          </div>

          {/* BOTONES DINÁMICOS */}
          <div className="flex flex-wrap items-center gap-2">
            {verificandoBlockchain ? (
              <div className="flex items-center gap-2 bg-white border border-slate-200 px-4 py-2 rounded-md text-xs text-slate-500 font-medium">
                <div className="w-3.5 h-3.5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                Auditando Blockchain…
              </div>
            ) : estaCertificado ? (
              <>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setModalBoletinOpen(true)}
                  className="flex items-center gap-1.5 bg-white border border-emerald-300 hover:bg-emerald-50 text-emerald-800 px-4 py-2 rounded-md text-xs font-semibold shadow-xs transition-colors"
                >
                  <Eye size={15} className="text-emerald-600" /> Ver Boletín
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={generarBoletinPDF}
                  className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white px-5 py-2 rounded-md text-xs font-semibold shadow-sm shadow-blue-200 transition-colors"
                >
                  <FileDown size={15} /> Descargar PDF Oficial
                </motion.button>
              </>
            ) : (
              <button
                disabled
                className="flex items-center gap-2 bg-slate-200/80 border border-slate-300 text-slate-500 cursor-not-allowed px-4 py-2 rounded-md text-xs font-semibold shadow-none"
                title="El boletín oficial aún no ha sido certificado por Dirección Académica."
              >
                <Lock size={14} className="text-slate-400" /> Boletín No Certificado Aún
              </button>
            )}
          </div>
        </motion.div>

        {/* TARJETAS DE RESUMEN KPI */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 md:grid-cols-2 gap-3 sm:gap-4"
        >
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-xl p-3.5 sm:p-4 shadow-sm">
            <div className="flex items-center gap-2 text-blue-700 text-[11px] uppercase font-semibold mb-2">
              <Award size={14} /> Promedio General
            </div>
            <p className="text-xl sm:text-2xl font-bold text-slate-900">
              {promedioGeneral} <span className="text-xs font-normal text-slate-500">/ 100</span>
            </p>
          </div>

          <div className="bg-gradient-to-br from-amber-50 to-amber-100 border border-amber-200 rounded-xl p-3.5 sm:p-4 shadow-sm">
            <div className="flex items-center gap-2 text-amber-700 text-[11px] uppercase font-semibold mb-2">
              <Sparkles size={14} /> Estatus Académico
            </div>
            <p className="text-xs sm:text-sm font-bold text-slate-900 truncate">
              {condicionAcademica.texto}
            </p>
          </div>
        </motion.div>

        {/* TABLA PRINCIPAL DE CALIFICACIONES */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="bg-gradient-to-b from-white to-slate-50 border border-slate-200 rounded-xl shadow-sm overflow-hidden"
        >
          <div className="p-4 sm:p-5 border-b border-slate-200 bg-gradient-to-r from-blue-50/70 to-transparent flex items-center justify-between">
            <h2 className="text-xs font-bold text-slate-800 flex items-center gap-2 tracking-wide uppercase">
              <BookOpen size={16} className="text-blue-600" />
              Detalle Anual de Calificaciones
            </h2>
            {estaCertificado ? (
              <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-100 border border-emerald-300 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                <ShieldCheck size={13} /> Certificación Activa
              </span>
            ) : (
              <span className="text-[11px] font-semibold text-amber-800 bg-amber-100 border border-amber-300 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                <Lock size={13} /> En Registro
              </span>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-xs">
              <thead className="bg-gradient-to-r from-blue-100 to-sky-100 text-blue-900 border-b border-slate-200">
                <tr>
                  <th className="py-3 px-5 text-left font-bold uppercase">Asignatura / Materia</th>
                  <th className="py-3 px-5 text-center font-bold uppercase">Trimestre 1</th>
                  <th className="py-3 px-5 text-center font-bold uppercase">Trimestre 2</th>
                  <th className="py-3 px-5 text-center font-bold uppercase">Trimestre 3</th>
                  <th className="py-3 px-5 text-center font-bold uppercase">Calificación Final</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {calificaciones.length > 0 ? (
                  calificaciones.map((item, index) => {
                    const notaFinal = Number(item.total) || 0;
                    const esSobresaliente = notaFinal >= 85;
                    const esReprobado = notaFinal < 70;

                    return (
                      <tr key={item.calificacion_id || index} className="hover:bg-blue-50/50 transition-colors">
                        <td className="py-3.5 px-5 font-semibold text-slate-800">
                          {item.materia || "Asignatura"}
                        </td>
                        <td className="py-3.5 px-5 text-center text-slate-600 font-medium">
                          {formatearNota(item.primer_trimestre)}
                        </td>
                        <td className="py-3.5 px-5 text-center text-slate-600 font-medium">
                          {formatearNota(item.segundo_trimestre)}
                        </td>
                        <td className="py-3.5 px-5 text-center text-slate-600 font-medium">
                          {formatearNota(item.tercer_trimestre)}
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
                            {formatearNota(item.total)} pts
                          </span>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="5" className="text-center py-12 text-slate-400 italic">
                      No se encontraron calificaciones registradas para tu usuario.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </motion.div>
      </div>
    </div>
  );
};