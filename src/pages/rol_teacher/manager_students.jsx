import React, { useEffect, useMemo, useState } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { motion, AnimatePresence } from "framer-motion";
import {
  GraduationCap,
  UserPlus,
  Search,
  Pencil,
  Trash2,
  KeyRound,
  IdCard,
  CheckCircle2,
  AlertCircle,
  Users,
  Download,
  ClipboardList,
  ShieldCheck,
  Layers,
  Filter,
} from "lucide-react";

import {
  getUsuarios,
  createUsuario,
  updateUsuarioById,
  deleteUsuarioById,
} from "../../api/api.usuario";

import { getParalelos } from "../../api/api.paralelos";
import { getEstudiantes } from "../../api/api.estudiante";

// Helper slug para autogenerar username
function slug(str) {
  return String(str || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "");
}

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

export const GestionEstudiantesCuentas = () => {
  const [usuariosRaw, setUsuariosRaw] = useState([]);
  const [estudiantesRaw, setEstudiantesRaw] = useState([]);
  const [paralelos, setParalelos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mensajeError, setMensajeError] = useState("");

  // Filtro superior por Paralelo
  const [filtroParalelo, setFiltroParalelo] = useState("TODOS");

  // Formulario agregar / editar datos generales
  const [formEstudiante, setFormEstudiante] = useState({
    nombre: "",
    apellido: "",
    username: "",
    paralelo_id: "",
  });
  const [editId, setEditId] = useState(null);
  const esModoEdicion = editId !== null;

  // Formulario independiente: actualizar contraseña
  const [passUsuarioId, setPassUsuarioId] = useState("");
  const [nuevaPassword, setNuevaPassword] = useState("");
  const [confirmarPassword, setConfirmarPassword] = useState("");

  const [search, setSearch] = useState("");

  // Modales
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMessage, setModalMessage] = useState("");
  const [modalSuccess, setModalSuccess] = useState(false);

  const [modalEliminar, setModalEliminar] = useState({
    open: false,
    id: null,
    nombreCompleto: "",
  });

  const mostrarModal = (success, message) => {
    setModalSuccess(success);
    setModalMessage(message);
    setModalOpen(true);
  };

  const cargarDatos = async () => {
    try {
      setLoading(true);
      setMensajeError("");
      const [resUsuarios, resEstudiantes, resParalelos] = await Promise.all([
        getUsuarios().catch(() => ({ data: [] })),
        getEstudiantes().catch(() => []),
        getParalelos().catch(() => []),
      ]);

      const listaUsuarios = resUsuarios.data || resUsuarios || [];
      setUsuariosRaw(listaUsuarios);
      setEstudiantesRaw(resEstudiantes || []);
      setParalelos(resParalelos || []);
    } catch (error) {
      console.error(error);
      setMensajeError("No fue posible cargar el listado de cuentas o paralelos.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  const resetFormulario = () => {
    setFormEstudiante({ nombre: "", apellido: "", username: "", paralelo_id: "" });
    setEditId(null);
  };

  // Mapear nombres de paralelos por ID
  const paralelosMap = useMemo(() => {
    const map = new Map();
    paralelos.forEach((p) => {
      map.set(Number(p.paralelo_id), p.descripcion);
    });
    return map;
  }, [paralelos]);

  // Mapear el paralelo_id desde la tabla estudiantes usando el usuario_id
  const estudianteParaleloMap = useMemo(() => {
    const map = new Map();
    estudiantesRaw.forEach((e) => {
      if (e.usuario_id && e.paralelo_id) {
        map.set(Number(e.usuario_id), Number(e.paralelo_id));
      }
    });
    return map;
  }, [estudiantesRaw]);

  // Listado de usuarios con el rol estudiante y su respectivo paralelo
  const estudiantesList = useMemo(() => {
    return usuariosRaw
      .filter((u) => String(u.rol || "estudiante").toLowerCase() === "estudiante")
      .map((u) => {
        const paraleloId = estudianteParaleloMap.get(Number(u.usuario_id)) || u.paralelo_id || "";
        const paraleloNombre = paralelosMap.get(Number(paraleloId)) || "S/N";
        return {
          ...u,
          paralelo_id: paraleloId,
          paraleloNombre,
        };
      });
  }, [usuariosRaw, estudianteParaleloMap, paralelosMap]);

  // Filtrado dinámico por paralelo y término de búsqueda
  const estudiantesFiltrados = useMemo(() => {
    const q = search.toLowerCase().trim();

    return estudiantesList.filter((e) => {
      const coincideParalelo =
        filtroParalelo === "TODOS" ||
        String(e.paraleloNombre).toUpperCase() === String(filtroParalelo).toUpperCase();

      const texto = `${e.nombre || ""} ${e.apellido || ""} ${e.username || ""}`.toLowerCase();
      const coincideBusqueda = !q || texto.includes(q);

      return coincideParalelo && coincideBusqueda;
    });
  }, [estudiantesList, search, filtroParalelo]);

  const handleAgregar = async () => {
    if (!formEstudiante.nombre.trim() || !formEstudiante.apellido.trim()) {
      mostrarModal(false, "Por favor complete los campos de nombre y apellido.");
      return;
    }

    if (!formEstudiante.paralelo_id) {
      mostrarModal(false, "Por favor seleccione un paralelo/curso obligatoriamente.");
      return;
    }

    try {
      const usuariosResp = await getUsuarios();
      const usedUsernames = new Set(
        (usuariosResp.data || usuariosResp || []).map((u) => String(u.username))
      );

      const primerNombre = String(formEstudiante.nombre || "").trim().split(" ")[0] || "";
      const primerApellido = String(formEstudiante.apellido || "").trim().split(" ")[0] || "";

      let baseUsername = slug(`${primerNombre}${primerApellido}`);
      if (!baseUsername) {
        baseUsername = slug(`${formEstudiante.nombre}${formEstudiante.apellido}`) || "estudiante";
      }

      let username = baseUsername;
      let contador = 1;
      while (usedUsernames.has(username)) {
        username = `${baseUsername}${contador}`;
        contador++;
      }

      const password = username;

      const payload = {
        nombre: formEstudiante.nombre.trim(),
        apellido: formEstudiante.apellido.trim(),
        username,
        password,
        rol: "estudiante",
        paralelo_id: parseInt(formEstudiante.paralelo_id, 10),
        fecha_creacion: new Date(),
      };

      await createUsuario(payload);
      await cargarDatos();

      resetFormulario();
      mostrarModal(
        true,
        `Cuenta de estudiante creada exitosamente.\n\nUsuario: ${username}\nContraseña inicial: ${password}`
      );
    } catch (error) {
      console.error("Error al crear usuario de estudiante:", error.response?.data || error);
      mostrarModal(false, "Ocurrió un error al registrar al estudiante.");
    }
  };

  const solicitarEliminacion = (est) => {
    setModalEliminar({
      open: true,
      id: est.usuario_id,
      nombreCompleto: `${est.nombre || ""} ${est.apellido || ""}`.trim(),
    });
  };

  const handleEliminarConfirmado = async () => {
    if (!modalEliminar.id) return;
    try {
      await deleteUsuarioById(modalEliminar.id);
      setUsuariosRaw((prev) => prev.filter((e) => e.usuario_id !== modalEliminar.id));
      if (passUsuarioId === String(modalEliminar.id)) setPassUsuarioId("");
      setModalEliminar({ open: false, id: null, nombreCompleto: "" });
      mostrarModal(true, "La cuenta de estudiante ha sido eliminada.");
    } catch (error) {
      console.error(error);
      setModalEliminar({ open: false, id: null, nombreCompleto: "" });
      mostrarModal(false, "No fue posible eliminar la cuenta.");
    }
  };

  const handleEditar = (est) => {
    setEditId(est.usuario_id);
    setFormEstudiante({
      nombre: est.nombre || "",
      apellido: est.apellido || "",
      username: est.username || "",
      paralelo_id: est.paralelo_id || "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleGuardarEdicion = async () => {
    if (!editId) return;
    if (!formEstudiante.nombre.trim() || !formEstudiante.apellido.trim() || !formEstudiante.username.trim()) {
      mostrarModal(false, "Todos los campos son obligatorios.");
      return;
    }

    try {
      const payload = {
        nombre: formEstudiante.nombre.trim(),
        apellido: formEstudiante.apellido.trim(),
        username: formEstudiante.username.trim(),
        rol: "estudiante",
        paralelo_id: formEstudiante.paralelo_id ? parseInt(formEstudiante.paralelo_id, 10) : null,
      };

      await updateUsuarioById(editId, payload);
      await cargarDatos();
      resetFormulario();
      mostrarModal(true, "Los datos de la cuenta fueron actualizados correctamente.");
    } catch (error) {
      console.error(error);
      mostrarModal(false, "Ocurrió un error al actualizar los datos.");
    }
  };

  const handleActualizarPassword = async () => {
    if (!passUsuarioId) {
      mostrarModal(false, "Seleccione un estudiante de la lista.");
      return;
    }
    if (!nuevaPassword || nuevaPassword.length < 4) {
      mostrarModal(false, "La contraseña debe tener al menos 4 caracteres.");
      return;
    }
    if (nuevaPassword !== confirmarPassword) {
      mostrarModal(false, "Las contraseñas no coinciden.");
      return;
    }

    try {
      await updateUsuarioById(passUsuarioId, { password: nuevaPassword });
      const afectado = estudiantesList.find(
        (e) => String(e.usuario_id) === String(passUsuarioId)
      );
      setPassUsuarioId("");
      setNuevaPassword("");
      setConfirmarPassword("");
      mostrarModal(
        true,
        `Contraseña actualizada para ${
          afectado ? `${afectado.nombre}${afectado.apellido}` : "el estudiante"
        }.`
      );
    } catch (error) {
      console.error(error);
      mostrarModal(false, "Ocurrió un error al actualizar la contraseña.");
    }
  };

  const iniciales = (e) =>
    `${(e.nombre || "?").charAt(0)}${(e.apellido || "").charAt(0)}`.toUpperCase();

  /* ============================================================
   TOKENS DE DISEÑO — PALETA OFICIAL DIPLOMA Y CERTIFICACIÓN
   ============================================================ */
  const INK = {
    navy: [15, 42, 74],
    gold: [184, 149, 46],
    ink: [28, 43, 58],
    slate: [91, 107, 124],
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
    doc.text(`Listado Oficial de Cuentas de Estudiantes (${filtroParalelo})`, pageWidth / 2, currentY, { align: "center" });

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

    currentY += 8;

    const tableRows = estudiantesFiltrados.map((e) => [
      `${e.nombre || ""} ${e.apellido || ""}`.trim().toUpperCase() || "—",
      e.username || "—",
      e.paraleloNombre || "S/N",
      e.fecha_creacion
        ? new Date(e.fecha_creacion).toLocaleString("es-BO", {
            dateStyle: "short",
            timeStyle: "short",
          })
        : "—",
    ]);

    autoTable(doc, {
      startY: currentY,
      head: [["NOMBRE COMPLETO", "USUARIO", "PARALELO", "FECHA REGISTRO"]],
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
        0: { cellWidth: 70, fontStyle: "bold" },
        1: { cellWidth: 45 },
        2: { cellWidth: 32, halign: "center", fontStyle: "bold", textColor: INK.navy },
        3: { cellWidth: 34.9, halign: "center" },
      },
      alternateRowStyles: { fillColor: [247, 244, 235] },
      didDrawPage: () => {
        dibujarFondoBoletin(doc, logoBase64);
      },
    });

    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFont("times", "italic");
      doc.setFontSize(7.5);
      doc.setTextColor(...INK.slate);
      doc.text(
        `Documento Oficial de Registro de Usuarios   ·   Página ${i} de ${pageCount}`,
        pageWidth / 2,
        pageHeight - 10,
        { align: "center" }
      );
    }

    doc.save(`cuentas_estudiantes_${filtroParalelo.toLowerCase().replace(/\s+/g, "_")}.pdf`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#EEF3FC] via-[#E9F0FB] to-[#E3ECFA] text-slate-800 p-3 xs:p-4 sm:p-6 md:p-10 font-sans">
      <AnimatePresence>
        {modalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 px-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
              className="bg-white rounded-xl p-6 max-w-sm w-full text-center shadow-2xl border-t-4"
              style={{ borderTopColor: modalSuccess ? "#2563EB" : "#DC2626" }}
            >
              {modalSuccess ? (
                <CheckCircle2 className="text-blue-600 mx-auto mb-3" size={36} />
              ) : (
                <AlertCircle className="text-red-600 mx-auto mb-3" size={36} />
              )}
              <h3 className="text-base font-bold text-slate-900 mb-2">
                {modalSuccess ? "Operación Completada" : "Atención"}
              </h3>
              <p className="text-xs text-slate-600 mb-5 leading-relaxed whitespace-pre-line">
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
              className="bg-white rounded-xl p-6 max-w-sm w-full shadow-2xl border-t-4 border-red-600 text-center"
            >
              <Trash2 className="text-red-600 mx-auto mb-3" size={34} />
              <h3 className="text-base font-bold text-slate-900 mb-1">
                ¿Eliminar cuenta?
              </h3>
              <p className="text-xs text-slate-600 mb-4 leading-relaxed">
                Esta acción eliminará el usuario de{" "}
                <span className="font-semibold text-slate-800">
                  "{modalEliminar.nombreCompleto}"
                </span>.
              </p>
              <div className="flex gap-2 w-full">
                <button
                  onClick={() => setModalEliminar({ open: false, id: null, nombreCompleto: "" })}
                  className="flex-1 py-2 bg-slate-100 text-slate-700 text-xs font-semibold rounded-md hover:bg-slate-200 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleEliminarConfirmado}
                  className="flex-1 py-2 bg-red-600 text-white text-xs font-semibold rounded-md hover:bg-red-700 transition-colors"
                >
                  Eliminar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 border-b border-slate-300 pb-6 mb-6 sm:mb-8"
        >
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-lg bg-gradient-to-br from-blue-100 to-blue-200 border border-blue-300 flex items-center justify-center shrink-0 shadow-sm">
              <GraduationCap className="text-blue-700" size={24} />
            </div>
            <div>
              <p className="text-[10px] sm:text-xs uppercase tracking-[0.2em] text-blue-700 font-semibold mb-1">
                Administración de Usuarios · Estudiantes
              </p>
              <h1 className="text-lg xs:text-xl sm:text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">
                Gestión de Cuentas y Accesos
              </h1>
            </div>
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={generarPDF}
            className="flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white font-semibold rounded-md shadow-sm px-5 py-2.5 text-xs tracking-wide transition-colors"
          >
            <Download size={15} /> Exportar Lista PDF
          </motion.button>
        </motion.div>

        <div className="grid grid-cols-2 md:grid-cols-2 gap-3 sm:gap-4 mb-6 sm:mb-8">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-xl p-3.5 sm:p-4 shadow-sm">
            <div className="flex items-center gap-2 text-blue-700 text-[11px] uppercase font-semibold mb-2">
              <Users size={14} /> Total Cuentas
            </div>
            <p className="text-xl sm:text-2xl font-bold text-slate-900">{estudiantesFiltrados.length}</p>
          </div>

          <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 border border-emerald-200 rounded-xl p-3.5 sm:p-4 shadow-sm">
            <div className="flex items-center gap-2 text-emerald-700 text-[11px] uppercase font-semibold mb-2">
              <ShieldCheck size={14} /> Rol Asignado
            </div>
            <p className="text-xl sm:text-2xl font-bold text-slate-900">Estudiante</p>
          </div>
        </div>

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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="lg:col-span-2 bg-gradient-to-b from-white to-slate-50 border border-slate-200 rounded-xl shadow-sm overflow-hidden"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 sm:p-5 border-b border-slate-200 bg-gradient-to-r from-blue-50/70 to-transparent">
              <h2 className="text-xs font-bold text-slate-800 flex items-center gap-2 tracking-wide uppercase">
                <ClipboardList size={16} className="text-blue-600" />
                Cuentas de Estudiantes Registradas ({estudiantesFiltrados.length})
              </h2>

              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                <input
                  type="text"
                  placeholder="Buscar estudiante…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-md bg-white text-slate-800 border border-slate-300 text-xs focus:ring-2 focus:ring-blue-400/50 outline-none"
                />
              </div>
            </div>

            {mensajeError && (
              <div className="mx-4 sm:mx-5 mt-4 flex items-start gap-2 text-red-800 text-xs bg-red-50 border border-red-200 px-4 py-3 rounded-lg">
                <AlertCircle size={16} className="text-red-600 shrink-0 mt-0.5" />
                {mensajeError}
              </div>
            )}

            {loading ? (
              <div className="text-center py-14 text-blue-700 text-sm font-medium">
                Cargando cuentas…
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-xs">
                  <thead className="bg-gradient-to-r from-blue-100 to-sky-100 text-blue-900 border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4 text-left font-bold uppercase">Estudiante</th>
                      <th className="py-3 px-4 text-left font-bold uppercase">Usuario</th>
                      <th className="py-3 px-4 text-center font-bold uppercase">Paralelo</th>
                      <th className="py-3 px-4 text-center font-bold uppercase">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {estudiantesFiltrados.length > 0 ? (
                      estudiantesFiltrados.map((e) => (
                        <tr key={e.usuario_id} className="hover:bg-blue-50/50 transition-colors">
                          <td className="py-3 px-4 font-semibold text-slate-900">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-200 to-blue-300 border border-blue-300 flex items-center justify-center text-[11px] font-bold text-blue-800 shrink-0">
                                {iniciales(e)}
                              </div>
                              <span>{e.nombre} {e.apellido}</span>
                            </div>
                          </td>

                          <td className="py-3 px-4 text-slate-600 font-medium">{e.username}</td>

                          <td className="py-3 px-4 text-center">
                            <span className="text-[10px] font-bold text-blue-800 bg-blue-100 border border-blue-200 px-2.5 py-0.5 rounded-full">
                              {e.paraleloNombre}
                            </span>
                          </td>

                          <td className="py-3 px-4 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => handleEditar(e)}
                                className="p-1.5 rounded bg-blue-50 border border-blue-200 text-blue-600 hover:bg-blue-100 transition-colors"
                                title="Editar datos de cuenta"
                              >
                                <Pencil size={13} />
                              </button>
                              <button
                                onClick={() => setPassUsuarioId(String(e.usuario_id))}
                                className="p-1.5 rounded bg-amber-50 border border-amber-300 text-amber-600 hover:bg-amber-100 transition-colors"
                                title="Cambiar contraseña"
                              >
                                <KeyRound size={13} />
                              </button>
                              <button
                                onClick={() => solicitarEliminacion(e)}
                                className="p-1.5 rounded bg-red-50 border border-red-200 text-red-600 hover:bg-red-100 transition-colors"
                                title="Eliminar cuenta"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="p-12 text-center text-slate-400 italic">
                          No se encontraron estudiantes registrados para este filtro.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </motion.div>

          {/* COLUMNA DERECHA */}
          <div className="flex flex-col gap-6">
            <motion.div
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-gradient-to-br from-white to-blue-50/60 border border-slate-200 rounded-xl p-4 sm:p-5 shadow-sm"
            >
              <div className="flex items-center justify-between mb-4 gap-2">
                <h2 className="text-xs font-bold text-slate-800 flex items-center gap-2 tracking-wide uppercase">
                  <UserPlus size={16} className="text-blue-600" />
                  {esModoEdicion ? "Editar Estudiante" : "Nuevo Estudiante"}
                </h2>
                {esModoEdicion && (
                  <span className="text-[10px] uppercase font-semibold text-amber-800 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded-full">
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
                    placeholder="Ej. Ana"
                    value={formEstudiante.nombre}
                    onChange={(e) => setFormEstudiante({ ...formEstudiante, nombre: e.target.value })}
                    className="w-full p-2.5 rounded-md bg-white border border-slate-300 text-slate-800 text-sm focus:ring-2 focus:ring-blue-400/50 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-blue-700 uppercase tracking-wide mb-1.5">
                    Apellido
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. Toro"
                    value={formEstudiante.apellido}
                    onChange={(e) => setFormEstudiante({ ...formEstudiante, apellido: e.target.value })}
                    className="w-full p-2.5 rounded-md bg-white border border-slate-300 text-slate-800 text-sm focus:ring-2 focus:ring-blue-400/50 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-blue-700 uppercase tracking-wide mb-1.5">
                    Paralelo / Curso
                  </label>
                  <div className="relative">
                    <Layers className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={15} />
                    <select
                      value={formEstudiante.paralelo_id}
                      onChange={(e) => setFormEstudiante({ ...formEstudiante, paralelo_id: e.target.value })}
                      className="w-full pl-9 pr-8 py-2.5 rounded-md bg-white border border-slate-300 text-slate-800 text-xs focus:ring-2 focus:ring-blue-400/50 outline-none truncate"
                    >
                      <option value="">-- Seleccione Paralelo --</option>
                      {paralelos.map((p) => (
                        <option key={p.paralelo_id} value={p.paralelo_id}>
                          {p.descripcion}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {esModoEdicion && (
                  <div>
                    <label className="block text-xs font-semibold text-blue-700 uppercase tracking-wide mb-1.5">
                      Nombre de Usuario
                    </label>
                    <input
                      type="text"
                      value={formEstudiante.username}
                      onChange={(e) => setFormEstudiante({ ...formEstudiante, username: e.target.value })}
                      className="w-full p-2.5 rounded-md bg-white border border-slate-300 text-slate-800 text-sm focus:ring-2 focus:ring-blue-400/50 outline-none"
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
                  className="bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white font-semibold rounded-md shadow-sm px-5 py-2 text-xs tracking-wide"
                >
                  {esModoEdicion ? "Guardar cambios" : "Registrar Cuenta"}
                </motion.button>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-gradient-to-br from-white to-amber-50/60 border border-amber-200 rounded-xl p-4 sm:p-5 shadow-sm"
            >
              <h2 className="text-xs font-bold text-slate-800 flex items-center gap-2 tracking-wide uppercase mb-4">
                <KeyRound size={16} className="text-amber-600" />
                Actualizar contraseña
              </h2>

              <div className="flex flex-col gap-3">
                <div>
                  <label className="block text-xs font-semibold text-blue-700 uppercase tracking-wide mb-1.5">
                    Estudiante
                  </label>
                  <div className="relative">
                    <IdCard className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={15} />
                    <select
                      value={passUsuarioId}
                      onChange={(e) => setPassUsuarioId(e.target.value)}
                      className="w-full pl-9 pr-8 py-2.5 rounded-md bg-white border border-slate-300 text-slate-800 text-xs focus:ring-2 focus:ring-amber-400/50 outline-none truncate"
                    >
                      <option value="">Seleccione un estudiante…</option>
                      {estudiantesList.map((e) => (
                        <option key={e.usuario_id} value={e.usuario_id}>
                          {e.nombre} {e.apellido} ({e.username})
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
                    className="w-full p-2.5 rounded-md bg-white border border-slate-300 text-slate-800 text-xs focus:ring-2 focus:ring-amber-400/50 outline-none"
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
                    className="w-full p-2.5 rounded-md bg-white border border-slate-300 text-slate-800 text-xs focus:ring-2 focus:ring-amber-400/50 outline-none"
                  />
                </div>
              </div>

              <div className="mt-5 flex justify-end border-t border-slate-200 pt-4">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleActualizarPassword}
                  className="w-full sm:w-auto bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-600 hover:to-amber-500 text-white font-semibold rounded-md shadow-sm px-5 py-2 text-xs tracking-wide"
                >
                  Actualizar Contraseña
                </motion.button>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
};