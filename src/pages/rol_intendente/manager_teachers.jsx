import React, { useEffect, useState } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users,
  UserPlus,
  Search,
  Pencil,
  Trash2,
  KeyRound,
  IdCard,
  CheckCircle2,
  AlertCircle,
  GraduationCap,
  ClipboardList,
  ShieldCheck,
  Download,
} from "lucide-react";
import {
  getUsuarios,
  createUsuario,
  updateUsuarioById,
  deleteUsuarioById,
} from "../../api/api.usuario";

// ---------- HELPER SLUG (MISMA LÓGICA QUE EN REGISTROESTUDIANTES) ----------
function slug(str) {
  return String(str || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "");
}

// Carga de imagen base64 para logo.png
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

export const GestionDocentes = () => {
  const [docentes, setDocentes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mensajeError, setMensajeError] = useState("");

  // Formulario agregar / editar datos generales
  const [formDocente, setFormDocente] = useState({
    nombre: "",
    apellido: "",
    username: "",
  });
  const [editId, setEditId] = useState(null);
  const esModoEdicion = editId !== null;

  // Formulario independiente: actualizar contraseña
  const [passDocenteId, setPassDocenteId] = useState("");
  const [nuevaPassword, setNuevaPassword] = useState("");
  const [confirmarPassword, setConfirmarPassword] = useState("");

  const [search, setSearch] = useState("");

  // Modal de resultado
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMessage, setModalMessage] = useState("");
  const [modalSuccess, setModalSuccess] = useState(false);

  // Modal de confirmación para eliminar
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [docenteAEliminar, setDocenteAEliminar] = useState(null);

  const mostrarModal = (success, message) => {
    setModalSuccess(success);
    setModalMessage(message);
    setModalOpen(true);
  };

  // ==== Cargar docentes desde la API ====
  const cargarDocentes = async () => {
    try {
      setLoading(true);
      setMensajeError("");
      const res = await getUsuarios();
      const soloDocentes = (res.data || []).filter(
        (u) => u.rol && u.rol.toLowerCase() === "docente"
      );
      setDocentes(soloDocentes);
    } catch (error) {
      console.error(error);
      setMensajeError("No fue posible cargar el listado de docentes. Intente nuevamente.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarDocentes();
  }, []);

  const resetFormulario = () => {
    setFormDocente({ nombre: "", apellido: "", username: "" });
    setEditId(null);
  };

  // ==== Agregar nuevo docente ====
  const handleAgregar = async () => {
    if (!formDocente.nombre || !formDocente.apellido) {
      mostrarModal(false, "Por favor complete los campos de nombre y apellido antes de continuar.");
      return;
    }

    try {
      const usuariosResp = await getUsuarios();
      const usedUsernames = new Set(
        (usuariosResp.data || []).map((u) => String(u.username))
      );

      const primerNombre = String(formDocente.nombre || "").trim().split(" ")[0] || "";
      const primerApellido = String(formDocente.apellido || "").trim().split(" ")[0] || "";

      let baseUsername = slug(`${primerNombre}${primerApellido}`);
      if (!baseUsername) {
        baseUsername = slug(`${formDocente.nombre}${formDocente.apellido}`) || "docente";
      }

      let username = baseUsername;
      let contador = 1;
      while (usedUsernames.has(username)) {
        username = `${baseUsername}${contador}`;
        contador++;
      }

      const password = username;

      const payload = {
        nombre: formDocente.nombre,
        apellido: formDocente.apellido,
        username,
        password,
        rol: "docente",
      };

      const res = await createUsuario(payload);
      const creado = res.data;

      if (creado && creado.usuario_id) {
        if (creado.rol?.toLowerCase() === "docente") {
          setDocentes((prev) => [...prev, creado]);
        }
      } else {
        await cargarDocentes();
      }

      resetFormulario();
      mostrarModal(
        true,
        `Docente registrado correctamente.\n\nUsuario: ${username}\nContraseña temporal: ${password}`
      );
    } catch (error) {
      console.error("Error al crear docente:", error.response?.data || error);
      let msg = "Ocurrió un error al registrar al docente.";
      if (error.response?.data?.message) {
        msg += `\nDetalle: ${error.response.data.message}`;
      } else if (error.response?.status === 409) {
        msg += "\nEl nombre de usuario ya existe.";
      }
      mostrarModal(false, msg);
    }
  };

  // ==== Eliminar docente (Apertura de modal de confirmación) ====
  const solicitarEliminar = (docente) => {
    setDocenteAEliminar(docente);
    setConfirmDeleteOpen(true);
  };

  // ==== Confirmación real de eliminación ====
  const ejecutarEliminacion = async () => {
    if (!docenteAEliminar) return;
    const usuario_id = docenteAEliminar.usuario_id;
    setConfirmDeleteOpen(false);

    try {
      await deleteUsuarioById(usuario_id);
      setDocentes((prev) => prev.filter((d) => d.usuario_id !== usuario_id));
      if (passDocenteId === String(usuario_id)) setPassDocenteId("");
      mostrarModal(true, "El docente ha sido eliminado permanentemente del sistema.");
    } catch (error) {
      console.error(error);
      let msg = "No fue posible eliminar al docente.";
      if (error.response?.data?.error) {
        msg += `\nDetalle: ${error.response.data.error}`;
      } else if (error.response?.data?.message) {
        msg += `\nDetalle: ${error.response.data.message}`;
      }
      mostrarModal(false, msg);
    } finally {
      setDocenteAEliminar(null);
    }
  };

  // ==== Editar datos generales ====
  const handleEditar = (docente) => {
    setEditId(docente.usuario_id);
    setFormDocente({
      nombre: docente.nombre || "",
      apellido: docente.apellido || "",
      username: docente.username || "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleGuardarEdicion = async () => {
    if (!editId) return;
    if (!formDocente.nombre || !formDocente.apellido || !formDocente.username) {
      mostrarModal(false, "Los campos de nombre, apellido y usuario son obligatorios para guardar los cambios.");
      return;
    }

    try {
      const payload = {
        nombre: formDocente.nombre,
        apellido: formDocente.apellido,
        username: formDocente.username,
        rol: "docente",
      };

      const res = await updateUsuarioById(editId, payload);
      const actualizado = res.data || payload;

      setDocentes((prev) =>
        prev.map((d) => (d.usuario_id === editId ? { ...d, ...actualizado } : d))
      );
      resetFormulario();
      mostrarModal(true, "Los datos del docente se actualizaron correctamente.");
    } catch (error) {
      console.error("Error al actualizar docente:", error.response?.data || error);
      let msg = "Ocurrió un error al actualizar los datos del docente.";
      if (error.response?.data?.message) msg += `\nDetalle: ${error.response.data.message}`;
      mostrarModal(false, msg);
    }
  };

  // ==== Sección independiente: actualizar contraseña ====
  const handleActualizarPassword = async () => {
    if (!passDocenteId) {
      mostrarModal(false, "Seleccione un docente para actualizar su contraseña.");
      return;
    }
    if (!nuevaPassword || nuevaPassword.length < 4) {
      mostrarModal(false, "La contraseña debe tener al menos 4 caracteres.");
      return;
    }
    if (nuevaPassword !== confirmarPassword) {
      mostrarModal(false, "Las contraseñas ingresadas no coinciden.");
      return;
    }

    try {
      await updateUsuarioById(passDocenteId, { password: nuevaPassword });
      const docenteAfectado = docentes.find(
        (d) => String(d.usuario_id) === String(passDocenteId)
      );
      setPassDocenteId("");
      setNuevaPassword("");
      setConfirmarPassword("");
      mostrarModal(
        true,
        `Contraseña actualizada correctamente${
          docenteAfectado ? ` para ${docenteAfectado.nombre}${docenteAfectado.apellido}` : ""
        }.`
      );
    } catch (error) {
      console.error("Error al actualizar contraseña:", error.response?.data || error);
      mostrarModal(false, "Ocurrió un error al actualizar la contraseña. Intente nuevamente.");
    }
  };

  // ==== Buscar docentes ====
  const docentesFiltrados = docentes.filter((d) => {
    const texto = `${d.nombre || ""} ${d.apellido || ""} ${d.username || ""} ${d.rol || ""}`.toLowerCase();
    return texto.includes(search.toLowerCase());
  });

  const iniciales = (d) =>
    `${(d.nombre || "?").charAt(0)}${(d.apellido || "").charAt(0)}`.toUpperCase();

  // ==== GENERAR PDF DE DOCENTES (ESTILO ADMINISTRADORES) ====
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

    // ================== MARCO DE SEGURIDAD CEREMONIAL ==================
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

    doc.setFont("times", "bold");
    doc.setFontSize(15);
    doc.setTextColor(...INK.navy);
    doc.text(COLEGIO_NOMBRE, pageWidth / 2, currentY, { align: "center" });

    currentY += 6;
    doc.setFont("times", "italic");
    doc.setFontSize(10.5);
    doc.setTextColor(...INK.gold);
    doc.text(
      "Reporte Oficial de Personal Docente y Gestión Académica",
      pageWidth / 2,
      currentY,
      { align: "center" }
    );

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

    currentY += 7;

    // ================== DATOS Y CONSTRUCCIÓN DE TABLA ==================
    const tableRows = docentesFiltrados.map((d) => [
      `${d.nombre || ""} ${d.apellido || ""}`.trim().toUpperCase() || "—",
      d.username || "—",
      (d.rol || "docente").toUpperCase(),
      d.fecha_creacion
        ? new Date(d.fecha_creacion).toLocaleString("es-BO", {
            dateStyle: "short",
            timeStyle: "short",
          })
        : "—",
    ]);

    autoTable(doc, {
      startY: currentY,
      head: [["NOMBRE COMPLETO", "NOMBRE DE USUARIO", "ROL ASIGNADO", "FECHA REGISTRO"]],
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
        fontSize: 8,
        cellPadding: 3.2,
      },
      columnStyles: {
        0: { cellWidth: 65, fontStyle: "bold" },
        1: { cellWidth: 45 },
        2: { cellWidth: 32, halign: "center" },
        3: { cellWidth: 39.9, halign: "center", fontStyle: "bold", textColor: INK.navy },
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

    // ================== PAGINACIÓN Y PIE DE PÁGINA ==================
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFont("times", "italic");
      doc.setFontSize(7.5);
      doc.setTextColor(...INK.slate);
      doc.text(
        `Documento Confidencial Académico   ·   Página ${i} de ${pageCount}`,
        pageWidth / 2,
        pageHeight - 10,
        { align: "center" }
      );
    }

    doc.save(`reporte_docentes_${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#EEF3FC] via-[#E9F0FB] to-[#E3ECFA] text-slate-800 p-3 xs:p-4 sm:p-6 md:p-10 font-sans">
      {/* MODAL DE RESULTADO (Éxito / Error) */}
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
              transition={{ duration: 0.2 }}
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
                  {modalSuccess ? "Operación completada" : "No se pudo completar la operación"}
                </h3>
                <p className="mb-5 whitespace-pre-line text-sm text-slate-700 leading-relaxed">
                  {modalMessage}
                </p>
                <button
                  onClick={() => setModalOpen(false)}
                  className="px-5 py-2 rounded-md bg-blue-600 text-white text-sm font-semibold tracking-wide hover:bg-blue-700 transition-colors"
                >
                  Cerrar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODAL DE CONFIRMACIÓN PARA ELIMINAR */}
      <AnimatePresence>
        {confirmDeleteOpen && (
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
              transition={{ duration: 0.2 }}
              className="bg-gradient-to-br from-white to-slate-50 rounded-xl p-6 sm:p-7 max-w-sm w-full text-slate-800 shadow-2xl border-t-4 border-t-red-600"
            >
              <div className="flex flex-col items-center text-center">
                <AlertCircle className="text-red-600 mb-3" size={34} />
                <h3 className="text-base font-bold tracking-wide text-slate-900 mb-2">
                  ¿Desea eliminar este docente?
                </h3>
                <p className="mb-6 text-sm text-slate-700 leading-relaxed">
                  Esta acción eliminará permanentemente a{" "}
                  <span className="font-semibold text-slate-900">
                    {docenteAEliminar?.nombre} {docenteAEliminar?.apellido}
                  </span>{" "}
                  del sistema. ¿Está seguro de continuar?
                </p>
                <div className="flex items-center gap-3 w-full">
                  <button
                    onClick={() => {
                      setConfirmDeleteOpen(false);
                      setDocenteAEliminar(null);
                    }}
                    className="flex-1 px-4 py-2 rounded-md bg-slate-100 border border-slate-300 hover:bg-slate-200 text-slate-700 text-xs font-semibold tracking-wide transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={ejecutarEliminacion}
                    className="flex-1 px-4 py-2 rounded-md bg-red-600 hover:bg-red-700 text-white text-xs font-semibold tracking-wide transition-colors shadow-sm shadow-red-200"
                  >
                    Sí, eliminar
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-7xl mx-auto">
        {/* Encabezado */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 border-b border-slate-300 pb-6 mb-6 sm:mb-8"
        >
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-lg bg-gradient-to-br from-blue-100 to-blue-200 border border-blue-300 flex items-center justify-center shrink-0">
              <GraduationCap className="text-blue-700" size={24} />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] sm:text-xs uppercase tracking-[0.2em] text-blue-700 font-semibold mb-1">
                Panel administrativo · Recursos humanos
              </p>
              <h1 className="text-lg xs:text-xl sm:text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">
                Gestión de Docentes
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

        {/* Tarjetas de resumen */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 md:grid-cols-2 gap-3 sm:gap-4 mb-6 sm:mb-8"
        >
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-xl p-3.5 sm:p-4 shadow-sm">
            <div className="flex items-center gap-2 text-blue-700 text-[11px] sm:text-xs uppercase tracking-wide font-semibold mb-2">
              <Users size={14} /> Total Docentes
            </div>
            <p className="text-xl sm:text-2xl font-bold text-slate-900">{docentes.length}</p>
          </div>
         
          <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 border border-emerald-200 rounded-xl p-3.5 sm:p-4 shadow-sm">
            <div className="flex items-center gap-2 text-emerald-700 text-[11px] sm:text-xs uppercase tracking-wide font-semibold mb-2">
              <ShieldCheck size={14} /> Rol Asignado
            </div>
            <p className="text-xl sm:text-2xl font-bold text-slate-900">Docente</p>
          </div>
        </motion.div>

        {/* Layout principal: tabla + panel lateral */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Columna izquierda: listado */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="lg:col-span-2 bg-gradient-to-b from-white to-slate-50 border border-slate-200 rounded-xl shadow-sm overflow-hidden"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 sm:p-5 border-b border-slate-200 bg-gradient-to-r from-blue-50/70 to-transparent">
              <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2 tracking-wide uppercase">
                <ClipboardList size={16} className="text-blue-600" />
                Listado de docentes
              </h2>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                <input
                  type="text"
                  placeholder="Buscar..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-md bg-white text-slate-800 border border-slate-300 text-sm
                             focus:ring-2 focus:ring-blue-400/50 focus:border-blue-400 outline-none placeholder-slate-400 transition-all"
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
                Cargando listado de docentes…
              </div>
            ) : (
              <>
                {/* Vista de tabla (pantallas medianas en adelante) */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="min-w-full">
                    <thead className="bg-gradient-to-r from-blue-100 to-sky-100 text-blue-800 text-xs">
                      <tr>
                        <th className="py-3.5 px-5 text-left font-bold uppercase tracking-wider">Nombre</th>
                        <th className="py-3.5 px-5 text-left font-bold uppercase tracking-wider">Usuario</th>
                        <th className="py-3.5 px-5 text-center font-bold uppercase tracking-wider">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {docentesFiltrados.length > 0 ? (
                        docentesFiltrados.map((d) => (
                          <tr key={d.usuario_id} className="hover:bg-blue-50/60 transition-colors">
                            <td className="py-3.5 px-5">
                              <div className="flex items-center gap-3 uppercase">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-200 to-blue-300 border border-blue-300 flex items-center justify-center text-[11px] font-bold text-blue-800 shrink-0">
                                  {iniciales(d)}
                                </div>
                                <div>
                                  <p className="text-slate-900 text-sm font-semibold leading-tight">
                                    {`${d.nombre || ""} ${d.apellido || ""}`}
                                  </p>
                                  <span className="text-[11px] uppercase tracking-wide text-blue-700 font-medium">
                                    {d.rol}
                                  </span>
                                </div>
                              </div>
                            </td>
                            <td className="py-3.5 px-5 text-sm text-slate-600 font-medium">{d.username}</td>
                            <td className="py-3.5 px-5">
                              <div className="flex items-center justify-center gap-2">
                                <button
                                  onClick={() => handleEditar(d)}
                                  title="Editar datos"
                                  className="p-2 rounded-md bg-gradient-to-br from-blue-50 to-blue-100 hover:from-blue-100 hover:to-blue-200 border border-blue-300 text-blue-600 hover:text-blue-700 transition-colors"
                                >
                                  <Pencil size={14} />
                                </button>
                                <button
                                  onClick={() => setPassDocenteId(String(d.usuario_id))}
                                  title="Actualizar contraseña"
                                  className="p-2 rounded-md bg-gradient-to-br from-amber-50 to-amber-100 hover:from-amber-100 hover:to-amber-200 border border-amber-300 text-amber-600 hover:text-amber-700 transition-colors"
                                >
                                  <KeyRound size={14} />
                                </button>
                                <button
                                  onClick={() => solicitarEliminar(d)}
                                  title="Eliminar docente"
                                  className="p-2 rounded-md bg-gradient-to-br from-red-50 to-red-100 hover:from-red-100 hover:to-red-200 border border-red-300 text-red-600 hover:text-red-700 transition-colors"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={3} className="text-center py-12 text-slate-500 text-sm italic">
                            No se encontraron docentes que coincidan con la búsqueda.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Vista de tarjetas (móvil) */}
                <div className="md:hidden divide-y divide-slate-200">
                  {docentesFiltrados.length > 0 ? (
                    docentesFiltrados.map((d) => (
                      <div
                        key={d.usuario_id}
                        className="p-4 flex flex-col gap-3 bg-gradient-to-br from-white to-slate-50 even:from-blue-50/40 even:to-white"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-200 to-blue-300 border border-blue-300 flex items-center justify-center text-[11px] font-bold text-blue-800 shrink-0">
                            {iniciales(d)}
                          </div>
                          <div className="min-w-0">
                            <p className="text-slate-900 text-sm font-semibold leading-tight truncate">
                              {`${d.nombre || ""} ${d.apellido || ""}`}
                            </p>
                            <span className="text-[11px] uppercase tracking-wide text-blue-700 font-medium">
                              {d.rol}
                            </span>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs text-slate-600">
                          <div className="min-w-0">
                            <p className="text-[10px] uppercase tracking-wide text-slate-500 font-semibold mb-0.5">Usuario</p>
                            <p className="text-slate-700 font-medium truncate">{d.username}</p>
                          </div>
                          <div className="min-w-0">
                            <p className="text-[10px] uppercase tracking-wide text-slate-500 font-semibold mb-0.5">Registro</p>
                            <p className="text-slate-700 font-medium">
                              {d.fecha_creacion
                                ? new Date(d.fecha_creacion).toLocaleString("es-BO", {
                                    dateStyle: "short",
                                    timeStyle: "short",
                                  })
                                : "—"}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 pt-1">
                          <button
                            onClick={() => handleEditar(d)}
                            className="flex-1 flex items-center justify-center gap-1.5 p-2 rounded-md bg-gradient-to-br from-blue-50 to-blue-100 active:from-blue-100 active:to-blue-200 border border-blue-300 text-blue-700 transition-colors text-xs font-semibold"
                          >
                            <Pencil size={13} /> Editar
                          </button>
                          <button
                            onClick={() => setPassDocenteId(String(d.usuario_id))}
                            className="flex-1 flex items-center justify-center gap-1.5 p-2 rounded-md bg-gradient-to-br from-amber-50 to-amber-100 active:from-amber-100 active:to-amber-200 border border-amber-300 text-amber-700 transition-colors text-xs font-semibold"
                          >
                            <KeyRound size={13} /> Clave
                          </button>
                          <button
                            onClick={() => solicitarEliminar(d)}
                            className="flex-1 flex items-center justify-center gap-1.5 p-2 rounded-md bg-gradient-to-br from-red-50 to-red-100 active:from-red-100 active:to-red-200 border border-red-300 text-red-700 transition-colors text-xs font-semibold"
                          >
                            <Trash2 size={13} /> Eliminar
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-12 text-slate-500 text-sm italic px-4">
                      No se encontraron docentes que coincidan con la búsqueda.
                    </div>
                  )}
                </div>
              </>
            )}
          </motion.div>

          {/* Columna derecha: formularios */}
          <div className="flex flex-col gap-6">
            {/* Registrar / editar */}
            <motion.div
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.25 }}
              className="bg-gradient-to-br from-white to-blue-50/60 border border-slate-200 rounded-xl p-4 sm:p-5 shadow-sm"
            >
              <div className="flex items-center justify-between mb-4 gap-2">
                <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2 tracking-wide uppercase">
                  <UserPlus size={16} className="text-blue-600" />
                  {esModoEdicion ? "Editar docente" : "Nuevo docente"}
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
                    Nombre
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. María"
                    value={formDocente.nombre}
                    onChange={(e) => setFormDocente({ ...formDocente, nombre: e.target.value })}
                    className="w-full p-2.5 rounded-md bg-white border border-slate-300 text-slate-800 text-sm
                               placeholder-slate-400 focus:ring-2 focus:ring-blue-400/50 focus:border-blue-400 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-blue-700 uppercase tracking-wide mb-1.5">
                    Apellido
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. Fernández"
                    value={formDocente.apellido}
                    onChange={(e) => setFormDocente({ ...formDocente, apellido: e.target.value })}
                    className="w-full p-2.5 rounded-md bg-white border border-slate-300 text-slate-800 text-sm
                               placeholder-slate-400 focus:ring-2 focus:ring-blue-400/50 focus:border-blue-400 outline-none transition-all"
                  />
                </div>
                {esModoEdicion && (
                  <div>
                    <label className="block text-xs font-semibold text-blue-700 uppercase tracking-wide mb-1.5">
                      Nombre de usuario
                    </label>
                    <input
                      type="text"
                      value={formDocente.username}
                      onChange={(e) => setFormDocente({ ...formDocente, username: e.target.value })}
                      className="w-full p-2.5 rounded-md bg-white border border-slate-300 text-slate-800 text-sm
                                 focus:ring-2 focus:ring-blue-400/50 focus:border-blue-400 outline-none transition-all"
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
                  className="bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white font-semibold rounded-md
                             shadow-sm shadow-blue-200 transition-colors duration-200 px-5 py-2 text-xs tracking-wide"
                >
                  {esModoEdicion ? "Guardar cambios" : "Registrar"}
                </motion.button>
              </div>
            </motion.div>

            {/* Actualizar contraseña */}
            <motion.div
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.35 }}
              className="bg-gradient-to-br from-white to-amber-50/60 border border-amber-200 rounded-xl p-4 sm:p-5 shadow-sm"
            >
              <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2 tracking-wide uppercase mb-4">
                <KeyRound size={16} className="text-amber-600" />
                Actualizar contraseña
              </h2>

              <div className="flex flex-col gap-3">
                <div>
                  <label className="block text-xs font-semibold text-blue-700 uppercase tracking-wide mb-1.5">
                    Docente
                  </label>
                  <div className="relative">
                    <IdCard className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={15} />
                    <select
                      value={passDocenteId}
                      onChange={(e) => setPassDocenteId(e.target.value)}
                      className="w-full pl-9 pr-8 py-2.5 rounded-md bg-white border border-slate-300 text-slate-800 text-sm
                                 focus:ring-2 focus:ring-amber-400/50 focus:border-amber-400 outline-none appearance-none transition-all truncate"
                    >
                      <option value="">Seleccione un docente…</option>
                      {docentes.map((d) => (
                        <option key={d.usuario_id} value={d.usuario_id}>
                          {d.nombre} {d.apellido} ({d.username})
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
                    className="w-full p-2.5 rounded-md bg-white border border-slate-300 text-slate-800 text-sm
                               placeholder-slate-400 focus:ring-2 focus:ring-amber-400/50 focus:border-amber-400 outline-none transition-all"
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
                    className="w-full p-2.5 rounded-md bg-white border border-slate-300 text-slate-800 text-sm
                               placeholder-slate-400 focus:ring-2 focus:ring-amber-400/50 focus:border-amber-400 outline-none transition-all"
                  />
                </div>
              </div>

              <div className="mt-5 flex justify-end border-t border-slate-200 pt-4">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleActualizarPassword}
                  className="w-full sm:w-auto bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-600 hover:to-amber-500 text-white font-semibold rounded-md
                             shadow-sm shadow-amber-200 transition-colors duration-200 px-5 py-2 text-xs tracking-wide"
                >
                  Actualizar contraseña
                </motion.button>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
};