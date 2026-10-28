import React, { useEffect, useMemo, useState } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { motion, AnimatePresence } from "framer-motion";
import { Formik } from "formik";
import * as XLSX from "xlsx";
import {
  Upload,
  UserPlus,
  FileText,
  Search,
  Download,
  GraduationCap,
  Users,
  CheckCircle2,
  AlertCircle,
  BookOpen,
  Award,
  Sparkles,
  Layers,
  Pencil,
  Trash2,
  ChevronDown,
  ChevronUp,
  X,
  Save,
  Plus,
  Filter,
  BarChart3,
  TrendingUp,
} from "lucide-react";

import {
  createEstudiante,
  getEstudiantes,
  getEstudiantesGeneral,
} from "../../api/api.estudiante";
import { getMaterias } from "../../api/api.materia";
import { getParalelos } from "../../api/api.paralelos";
import { createUsuario, getUsuarios } from "../../api/api.usuario";
import {
  createCalificacione,
  updateCalificacione,
  deleteCalificacione,
} from "../../api/api.calificaciones";

// Helper para formatear notas: enteros sin decimales y decimales solo si existen
function formatNota(val) {
  const num = Number(val);
  if (isNaN(num)) return "0";
  return Number.isInteger(num) ? String(num) : String(Number(num.toFixed(2)));
}

function splitNombreApellido(nombreCompleto) {
  const parts = String(nombreCompleto || "").trim().split(" ").filter(Boolean);

  if (parts.length === 1) return { apellido: parts[0], nombre: parts[0] };
  if (parts.length === 2) return { apellido: parts[0], nombre: parts[1] };
  
  const apellido = parts.slice(0, 2).join(" ");
  const nombre = parts.slice(2).join(" ");
  return { apellido, nombre };
}

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

async function leerAlumnosDesdeExcel(file) {
  if (!(file instanceof File)) {
    throw new Error("El parámetro ingresado no es un archivo válido.");
  }

  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });

  if (!rows || rows.length === 0) {
    throw new Error("El Excel está vacío o no se pudo leer.");
  }

  const normalize = (v) =>
    String(v || "").trim().toUpperCase().replace(/\s+/g, "");

  const targets = {
    numero: ["N°", "Nº", "NRO", "NUMERO", "NO"].map((t) =>
      t.replace(/\s+/g, "")
    ),
    nombre: "APELLIDOSYNOMBRES",
    t1: "1TRIM",
    t2: "2TRIM",
    t3: "3TRIM",
    anual: "ANUAL",
  };

  let headerRowIndex = -1;
  const colIndex = {
    numero: -1,
    nombre: -1,
    t1: -1,
    t2: -1,
    t3: -1,
    anual: -1,
  };

  const maxHeaderScan = Math.min(rows.length, 20);

  for (let r = 0; r < maxHeaderScan; r++) {
    const row = rows[r] || [];
    row.forEach((cell, c) => {
      const cellNorm = normalize(cell);

      if (
        colIndex.numero === -1 &&
        targets.numero.some((t) => cellNorm === t)
      ) {
        colIndex.numero = c;
      }

      if (cellNorm === targets.nombre) colIndex.nombre = c;
      if (cellNorm === targets.t1) colIndex.t1 = c;
      if (cellNorm === targets.t2) colIndex.t2 = c;
      if (cellNorm === targets.t3) colIndex.t3 = c;
      if (cellNorm === targets.anual) colIndex.anual = c;
    });

    if (
      colIndex.nombre !== -1 &&
      colIndex.t1 !== -1 &&
      colIndex.t2 !== -1 &&
      colIndex.t3 !== -1
    ) {
      headerRowIndex = r;
    }

    if (headerRowIndex !== -1 && colIndex.numero !== -1) break;
  }

  if (headerRowIndex === -1) {
    throw new Error(
      "No se encontraron las columnas necesarias (APELLIDOS Y NOMBRES, 1TRIM, 2TRIM, 3TRIM). Revisa el formato."
    );
  }

  const alumnos = [];
  let started = false;

  for (let r = headerRowIndex + 1; r < rows.length; r++) {
    const row = rows[r] || [];

    if (colIndex.numero !== -1) {
      const valorNumero = row[colIndex.numero];
      const esVacio =
        valorNumero === undefined || valorNumero === null || valorNumero === "";
      const esNumeroValido =
        !esVacio && !Number.isNaN(Number(String(valorNumero).trim()));

      if (!started) {
        if (!esNumeroValido) continue;
        started = true;
      } else {
        if (!esNumeroValido) break;
      }
    }

    const nombreCompleto = row[colIndex.nombre];
    if (!nombreCompleto || String(nombreCompleto).trim() === "") continue;

    const trim1 = row[colIndex.t1];
    const trim2 = row[colIndex.t2];
    const trim3 = row[colIndex.t3];
    const anual = colIndex.anual !== -1 ? row[colIndex.anual] : undefined;

    alumnos.push({
      nombreCompleto: String(nombreCompleto).trim(),
      trim1: trim1 !== undefined && trim1 !== null ? Number(trim1) : 0,
      trim2: trim2 !== undefined && trim2 !== null ? Number(trim2) : 0,
      trim3: trim3 !== undefined && trim3 !== null ? Number(trim3) : 0,
      anual:
        anual !== undefined && anual !== null && anual !== ""
          ? Number(anual)
          : 0,
    });
  }

  return alumnos;
}

export const GestionCalificacionesEstudiantes = () => {
  const [mensaje, setMensaje] = useState("");
  const [studentsList, setStudentsList] = useState([]);
  const [materias, setMaterias] = useState([]);
  const [paralelos, setParalelos] = useState([]);

  // FILTRO RÁPIDO DE PARALELO PARA EL DIRECTOR
  const [filtroParalelo, setFiltroParalelo] = useState("TODOS");

  const [pdfParalelo, setPdfParalelo] = useState("");
  const [pdfMateria, setPdfMateria] = useState("");
  const [pdfMode, setPdfMode] = useState(true);

  const [searchEstudiante, setSearchEstudiante] = useState("");
  const [expandedRows, setExpandedRows] = useState({});

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMessage, setModalMessage] = useState("");
  const [modalSuccess, setModalSuccess] = useState(false);

  // Modal Edición de Nota Existente
  const [modalEditOpen, setModalEditOpen] = useState(false);
  const [editCalificacionData, setEditCalificacionData] = useState({
    calificacion_id: null,
    materiaNombre: "",
    estudianteNombre: "",
    primer_trimestre: 0,
    segundo_trimestre: 0,
    tercer_trimestre: 0,
    total: 0,
  });

  // Modal Agregar Nueva Materia/Nota a Estudiante Existente
  const [modalAddMateriaOpen, setModalAddMateriaOpen] = useState(false);
  const [addMateriaData, setAddMateriaData] = useState({
    estudiante_id: null,
    estudianteNombre: "",
    materia_id: "",
    primer_trimestre: 0,
    segundo_trimestre: 0,
    tercer_trimestre: 0,
    total: 0,
  });

  // Modal Eliminar
  const [modalDeleteOpen, setModalDeleteOpen] = useState(false);
  const [deleteCalificacionData, setDeleteCalificacionData] = useState({
    calificacion_id: null,
    materiaNombre: "",
    estudianteNombre: "",
  });

  const [usuario] = useState({
    username: "",
    password: "",
    rol: "",
    nombre: "",
    apellido: "",
    fecha_creacion: "",
    paralelo: "",
    materias: "",
    trimestre1: "",
    trimestre2: "",
    trimestre3: "",
    Anual: "",
  });

  useEffect(() => {
    async function getValues() {
      try {
        const [responseEstudiantesGeneral, responseMaterias, responseParalelos] =
          await Promise.all([
            getEstudiantesGeneral(),
            getMaterias(),
            getParalelos(),
          ]);
        setStudentsList(responseEstudiantesGeneral || []);
        setMaterias(responseMaterias || []);
        setParalelos(responseParalelos || []);
      } catch (err) {
        console.error("Error al cargar listados:", err);
      }
    }
    getValues();
  }, []);

  async function getIdUser(username) {
    const response = await getUsuarios();
    return response.data.find((u) => u.username === username)?.usuario_id;
  }

  async function getIdStudent(idUser) {
    const response = await getEstudiantes();
    return response.find((e) => e.usuario_id === idUser)?.estudiante_id;
  }

  async function recargarEstudiantes() {
    const responseEstudiantesGeneral = await getEstudiantesGeneral();
    setStudentsList(responseEstudiantesGeneral || []);
    return responseEstudiantesGeneral || [];
  }

  const toggleRowExpand = (id) => {
    setExpandedRows((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleOpenEditModal = (mat, estNombre) => {
    setEditCalificacionData({
      calificacion_id: mat.calificacion_id,
      materiaNombre: mat.materia,
      estudianteNombre: estNombre,
      primer_trimestre: mat.primer_trimestre || 0,
      segundo_trimestre: mat.segundo_trimestre || 0,
      tercer_trimestre: mat.tercer_trimestre || 0,
      total: mat.total || 0,
    });
    setModalEditOpen(true);
  };

  const handleGuardarCalificacion = async () => {
    if (!editCalificacionData.calificacion_id) return;

    const t1 = Number(editCalificacionData.primer_trimestre) || 0;
    const t2 = Number(editCalificacionData.segundo_trimestre) || 0;
    const t3 = Number(editCalificacionData.tercer_trimestre) || 0;
    const tot = Number(editCalificacionData.total) || 0;

    if (t1 < 0 || t1 > 100 || t2 < 0 || t2 > 100 || t3 < 0 || t3 > 100 || tot < 0 || tot > 100) {
      setModalSuccess(false);
      setModalMessage("Las notas deben estar entre 0 y 100 puntos.");
      setModalOpen(true);
      return;
    }

    try {
      const payload = {
        primer_trimestre: t1,
        segundo_trimestre: t2,
        tercer_trimestre: t3,
        total: tot,
      };

      await updateCalificacione(editCalificacionData.calificacion_id, payload);
      setModalEditOpen(false);
      await recargarEstudiantes();
      setModalSuccess(true);
      setModalMessage("Calificaciones actualizadas correctamente.");
      setModalOpen(true);
    } catch (err) {
      console.error(err);
      setModalSuccess(false);
      setModalMessage("Error al actualizar las notas.");
      setModalOpen(true);
    }
  };

  // HANDLER PARA ABRIR MODAL AGREGAR MATERIA Y NOTAS A UN ESTUDIANTE
  const handleOpenAddMateriaModal = (est) => {
    setAddMateriaData({
      estudiante_id: est.estudiante_id,
      estudianteNombre: `${est.nombre} ${est.apellido}`,
      materia_id: "",
      primer_trimestre: 0,
      segundo_trimestre: 0,
      tercer_trimestre: 0,
      total: 0,
    });
    setModalAddMateriaOpen(true);
  };

  // HANDLER PARA GUARDAR LA NUEVA MATERIA DEL ESTUDIANTE EXISTENTE
  const handleGuardarNuevaMateria = async () => {
    if (!addMateriaData.estudiante_id || !addMateriaData.materia_id) {
      setModalSuccess(false);
      setModalMessage("Por favor selecciona una materia.");
      setModalOpen(true);
      return;
    }

    const t1 = Number(addMateriaData.primer_trimestre) || 0;
    const t2 = Number(addMateriaData.segundo_trimestre) || 0;
    const t3 = Number(addMateriaData.tercer_trimestre) || 0;
    const total = Number(addMateriaData.total) || Math.round((t1 + t2 + t3) / 3);

    if (t1 < 0 || t1 > 100 || t2 < 0 || t2 > 100 || t3 < 0 || t3 > 100 || total < 0 || total > 100) {
      setModalSuccess(false);
      setModalMessage("Las notas deben estar entre 0 y 100 puntos.");
      setModalOpen(true);
      return;
    }

    try {
      const payload = {
        primer_trimestre: t1,
        segundo_trimestre: t2,
        tercer_trimestre: t3,
        total: total,
        materia_id: parseInt(addMateriaData.materia_id, 10),
        estudiante_id: addMateriaData.estudiante_id,
      };

      await createCalificacione(payload);
      setModalAddMateriaOpen(false);
      await recargarEstudiantes();
      setModalSuccess(true);
      setModalMessage("Nueva materia y calificaciones agregadas correctamente.");
      setModalOpen(true);
    } catch (err) {
      console.error(err);
      setModalAddMateriaOpen(false);
      setModalSuccess(false);
      setModalMessage("Error al registrar la nueva materia.");
      setModalOpen(true);
    }
  };

  const handleOpenDeleteModal = (mat, estNombre) => {
    setDeleteCalificacionData({
      calificacion_id: mat.calificacion_id,
      materiaNombre: mat.materia,
      estudianteNombre: estNombre,
    });
    setModalDeleteOpen(true);
  };

  const handleConfirmarEliminarCalificacion = async () => {
    if (!deleteCalificacionData.calificacion_id) return;

    try {
      await deleteCalificacione(deleteCalificacionData.calificacion_id);
      setModalDeleteOpen(false);
      await recargarEstudiantes();
      setModalSuccess(true);
      setModalMessage("Calificación eliminada correctamente.");
      setModalOpen(true);
    } catch (err) {
      console.error(err);
      setModalDeleteOpen(false);
      setModalSuccess(false);
      setModalMessage("Error al eliminar el registro.");
      setModalOpen(true);
    }
  };

  // ENVÍO MANUAL CON VERIFICACIÓN SI YA EXISTE EL ESTUDIANTE
  const Envio = async (values, { resetForm }) => {
    const t1 = Number(values.trimestre1) || 0;
    const t2 = Number(values.trimestre2) || 0;
    const t3 = Number(values.trimestre3) || 0;
    const tot = Number(values.Anual) || 0;

    if (t1 < 0 || t1 > 100 || t2 < 0 || t2 > 100 || t3 < 0 || t3 > 100 || tot < 0 || tot > 100) {
      setModalSuccess(false);
      setModalMessage("Las notas deben estar entre 0 y 100 puntos.");
      setModalOpen(true);
      return;
    }

    try {
      const listaGeneral = await getEstudiantesGeneral();
      const materiaIdSelected = parseInt(values.materias, 10);

      // Verificar si el estudiante ya existe en el sistema por Nombre y Apellido
      const estudianteExistente = (listaGeneral || []).find(
        (e) =>
          slug(e.nombre) === slug(values.nombre) &&
          slug(e.apellido) === slug(values.apellido)
      );

      if (estudianteExistente) {
        // Si existe, verificar si ya tiene registrada esta materia
        const coincidenciaMateria = (listaGeneral || []).find(
          (e) =>
            e.estudiante_id === estudianteExistente.estudiante_id &&
            parseInt(e.materia_id, 10) === materiaIdSelected
        );

        if (coincidenciaMateria && coincidenciaMateria.calificacion_id) {
          // 1. SI YA TIENE LA MATERIA: ACTUALIZAR NOTAS
          await updateCalificacione(coincidenciaMateria.calificacion_id, {
            primer_trimestre: t1,
            segundo_trimestre: t2,
            tercer_trimestre: t3,
            total: tot,
          });

          await recargarEstudiantes();
          setModalSuccess(true);
          setModalMessage(`Calificaciones de ${values.nombre} ${values.apellido} actualizadas correctamente.`);
          setModalOpen(true);
          resetForm();
          return;
        } else {
          // 2. SI NO TIENE LA MATERIA: AGREGARLA AL ESTUDIANTE EXISTENTE
          await createCalificacione({
            primer_trimestre: t1,
            segundo_trimestre: t2,
            tercer_trimestre: t3,
            total: tot,
            materia_id: materiaIdSelected,
            estudiante_id: estudianteExistente.estudiante_id,
          });

          await recargarEstudiantes();
          setModalSuccess(true);
          setModalMessage(`Nueva asignatura agregada y notas guardadas para: ${values.nombre} ${values.apellido}`);
          setModalOpen(true);
          resetForm();
          return;
        }
      }

      // 3. SI EL ESTUDIANTE NO EXISTE: CREAR USUARIO + ESTUDIANTE + NOTA
      const usuariosResp = await getUsuarios();
      const usedUsernames = new Set((usuariosResp.data || []).map((u) => String(u.username)));

      const primerNombre = String(values.nombre || "").trim().split(" ")[0] || "";
      const primerApellido = String(values.apellido || "").trim().split(" ")[0] || "";

      let baseUsername = slug(`${primerNombre}${primerApellido}`) || "usermanual";
      let username = baseUsername;
      let contador = 1;
      while (usedUsernames.has(username)) {
        username = `${baseUsername}${contador}`;
        contador++;
      }

      await createUsuario({
        username,
        password: username,
        rol: "estudiante",
        nombre: values.nombre,
        apellido: values.apellido,
        fecha_creacion: new Date(),
      });

      const idUser = await getIdUser(username);
      await createEstudiante({
        usuario_id: idUser,
        paralelo_id: parseInt(values.paralelo, 10),
      });

      const idStudent = await getIdStudent(idUser);
      await createCalificacione({
        primer_trimestre: t1,
        segundo_trimestre: t2,
        tercer_trimestre: t3,
        total: tot,
        materia_id: materiaIdSelected,
        estudiante_id: idStudent,
      });

      await recargarEstudiantes();
      setModalSuccess(true);
      setModalMessage(`Notas y registro guardados para: ${username}`);
      setModalOpen(true);
      resetForm();
    } catch (error) {
      console.error(error);
      setModalSuccess(false);
      setModalMessage("Ocurrió un error al registrar las notas.");
      setModalOpen(true);
    }
  };

  async function handleExcelUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!pdfParalelo || !pdfMateria) {
      setModalSuccess(false);
      setModalMessage("Selecciona Paralelo y Materia antes de subir el archivo.");
      setModalOpen(true);
      return;
    }

    try {
      setMensaje("Procesando Excel...");
      const alumnos = await leerAlumnosDesdeExcel(file);
      const usuariosResp = await getUsuarios();
      const usedUsernames = new Set((usuariosResp.data || []).map((u) => String(u.username)));

      let registrados = 0;
      const materiaIdSelected = parseInt(pdfMateria, 10);

      for (let i = 0; i < alumnos.length; i++) {
        const item = alumnos[i];
        const { apellido, nombre } = splitNombreApellido(item.nombreCompleto);

        // Actualizamos la lista general en cada iteración para evitar datos obsoletos
        const listaGeneralActual = await recargarEstudiantes();

        // 1. Verificar si el estudiante ya existe en la BD por Nombre y Apellido
        const estudianteExistente = (listaGeneralActual || []).find(
          (e) =>
            slug(e.nombre) === slug(nombre) &&
            slug(e.apellido) === slug(apellido)
        );

        let idStudent;

        if (estudianteExistente) {
          idStudent = estudianteExistente.estudiante_id;
        } else {
          let baseUsername = slug(`${nombre.split(" ")[0]}${apellido.split(" ")[0]}`) || `user${i + 1}`;
          let username = baseUsername;
          let contador = 1;
          while (usedUsernames.has(username)) {
            username = `${baseUsername}${contador}`;
            contador++;
          }
          usedUsernames.add(username);

          await createUsuario({
            username,
            password: username,
            rol: "estudiante",
            nombre,
            apellido,
            fecha_creacion: new Date(),
          });

          const idUser = await getIdUser(username);
          await createEstudiante({
            usuario_id: idUser,
            paralelo_id: parseInt(pdfParalelo, 10),
          });

          idStudent = await getIdStudent(idUser);
        }

        // 2. Volver a consultar para obtener los registros actualizados de calificaciones de este estudiante
        const listaActualizada = await recargarEstudiantes();
        const calificacionExistente = (listaActualizada || []).find(
          (e) =>
            e.estudiante_id === idStudent &&
            parseInt(e.materia_id, 10) === materiaIdSelected
        );

        const p1 = Number(item.trim1) || 0;
        const p2 = Number(item.trim2) || 0;
        const p3 = Number(item.trim3) || 0;
        const totalAnual = Number(item.anual) || 0;

        if (calificacionExistente && calificacionExistente.calificacion_id) {
          await updateCalificacione(calificacionExistente.calificacion_id, {
            primer_trimestre: p1,
            segundo_trimestre: p2,
            tercer_trimestre: p3,
            total: totalAnual,
          });
        } else {
          await createCalificacione({
            primer_trimestre: p1,
            segundo_trimestre: p2,
            tercer_trimestre: p3,
            total: totalAnual,
            materia_id: materiaIdSelected,
            estudiante_id: idStudent,
          });
        }

        registrados++;
      }

      await recargarEstudiantes();
      setMensaje("");
      setModalSuccess(true);
      setModalMessage(`Se procesaron y actualizaron notas para ${registrados} estudiantes.`);
      setModalOpen(true);
    } catch (error) {
      console.error(error);
      setMensaje("");
      setModalSuccess(false);
      setModalMessage("Error al procesar el archivo Excel.");
      setModalOpen(true);
    } finally {
      event.target.value = "";
    }
  }

  const groupedStudents = useMemo(() => {
    const map = new Map();

    studentsList.forEach((s) => {
      const key = `${s.estudiante_id ?? ""}-${s.nombre}-${s.apellido}`;
      if (!map.has(key)) {
        map.set(key, {
          estudiante_id: s.estudiante_id,
          nombre: s.nombre || "",
          apellido: s.apellido || "",
          username: s.username || "—",
          paralelo: s.paralelo || s.descripcion || "S/N",
          materias: [],
        });
      }
      map.get(key).materias.push({
        calificacion_id: s.calificacion_id,
        materia: s.materia || "Asignatura",
        primer_trimestre: Number(s.primer_trimestre) || 0,
        segundo_trimestre: Number(s.segundo_trimestre) || 0,
        tercer_trimestre: Number(s.tercer_trimestre) || 0,
        total: Number(s.total) || 0,
      });
    });

    return Array.from(map.values());
  }, [studentsList]);

  // FILTRADO CONJUNTO DE PARALELOS Y BÚSQUEDA
  const estudiantesFiltrados = useMemo(() => {
    const q = searchEstudiante.toLowerCase().trim();

    return groupedStudents.filter((est) => {
      const coincideParalelo =
        filtroParalelo === "TODOS" ||
        String(est.paralelo).toUpperCase() === String(filtroParalelo).toUpperCase();

      const nombreCompleto = `${est.nombre} ${est.apellido}`.toLowerCase();
      const coincideBusqueda =
        !q ||
        nombreCompleto.includes(q) ||
        (est.paralelo || "").toLowerCase().includes(q) ||
        (est.username || "").toLowerCase().includes(q);

      return coincideParalelo && coincideBusqueda;
    });
  }, [groupedStudents, searchEstudiante, filtroParalelo]);

  // CALCULO DE METRICAS GLOBALES INSTITUCIONALES PARA EL DIRECTOR
  const metricasGlobales = useMemo(() => {
    let totalPromedios = 0;
    let aprobados = 0;

    estudiantesFiltrados.forEach((est) => {
      const totalNotas = est.materias.reduce((acc, m) => acc + (m.total || 0), 0);
      const promedioGral = totalNotas / (est.materias.length || 1);
      totalPromedios += promedioGral;
      if (promedioGral >= 70) aprobados++;
    });

    const promInstitucional = estudiantesFiltrados.length
      ? formatNota(totalPromedios / estudiantesFiltrados.length)
      : "0";

    const tasaAprobacion = estudiantesFiltrados.length
      ? Math.round((aprobados / estudiantesFiltrados.length) * 100)
      : 0;

    return { promInstitucional, tasaAprobacion };
  }, [estudiantesFiltrados]);

  const generarPDFEstudiante = async (est) => {
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pageWidth = doc.internal.pageSize.getWidth();

    const logoBase64 = await cargarImagenBase64("/logo.png");
    if (logoBase64) {
      doc.addImage(logoBase64, "PNG", 14, 12, 20, 20);
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(15);
    doc.setTextColor(15, 23, 42);
    doc.text("DIRECCIÓN ACADÉMICA INSTITUCIONAL", logoBase64 ? 38 : 14, 18);

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(51, 65, 85);
    doc.text("Boletín Oficial de Notas y Rendimiento Académico", logoBase64 ? 38 : 14, 24);

    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(`Fecha de emisión: ${new Date().toLocaleDateString("es-BO")}`, logoBase64 ? 38 : 14, 29);

    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.4);
    doc.line(14, 35, pageWidth - 14, 35);

    doc.setFillColor(241, 245, 249);
    doc.roundedRect(14, 39, pageWidth - 28, 16, 2, 2, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(30, 58, 138);
    doc.text(`ESTUDIANTE: ${est.nombre.toUpperCase()} ${est.apellido.toUpperCase()}`, 18, 46);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105);
    doc.text(`Paralelo: ${est.paralelo}`, 18, 51);

    const tableColumn = ["Asignatura / Materia", "1er Trim.", "2do Trim.", "3er Trim.", "Promedio Anual"];
    const tableRows = [];
    let sumaFinal = 0;

    est.materias.forEach((m) => {
      const promCalculado = Number(((m.primer_trimestre + m.segundo_trimestre + m.tercer_trimestre) / 3));
      const notaTotal = m.total > 0 ? m.total : promCalculado;
      sumaFinal += notaTotal;

      tableRows.push([
        m.materia,
        formatNota(m.primer_trimestre),
        formatNota(m.segundo_trimestre),
        formatNota(m.tercer_trimestre),
        `${formatNota(notaTotal)} pts`,
      ]);
    });

    const promedioAcumulado = formatNota(sumaFinal / (est.materias.length || 1));

    autoTable(doc, {
      startY: 60,
      head: [tableColumn],
      body: tableRows,
      theme: "grid",
      styles: { fontSize: 9, cellPadding: 3, textColor: [30, 41, 59], halign: "center" },
      headStyles: { fillColor: [37, 99, 235], textColor: [255, 255, 255], fontStyle: "bold" },
      columnStyles: { 0: { cellWidth: 70, halign: "left" }, 1: { cellWidth: 28 }, 2: { cellWidth: 28 }, 3: { cellWidth: 28 }, 4: { cellWidth: 28, fontStyle: "bold" } },
    });

    const finalY = doc.lastAutoTable?.finalY || 100;

    doc.setFillColor(238, 242, 255);
    doc.roundedRect(14, finalY + 5, pageWidth - 28, 12, 2, 2, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(30, 58, 138);
    doc.text(`PROMEDIO ACUMULADO GENERAL: ${promedioAcumulado} / 100 pts`, 18, finalY + 12);

    doc.save(`boletin_${est.nombre}_${est.apellido}`.toLowerCase().replace(/\s+/g, "_") + ".pdf");
  };

  const iniciales = (nombre, apellido) =>
    `${(nombre || "?").charAt(0)}${(apellido || "").charAt(0)}`.toUpperCase();

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#EEF3FC] via-[#E9F0FB] to-[#E3ECFA] text-slate-800 p-3 xs:p-4 sm:p-6 md:p-10 font-sans">
      
      {/* MODAL DE NOTIFICACIONES */}
      <AnimatePresence>
        {modalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-[999] px-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-xl p-6 max-w-sm w-full text-center shadow-2xl border-t-4 "
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

      {/* MODAL EDITAR NOTA */}
      <AnimatePresence>
        {modalEditOpen && (
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
              className="bg-white rounded-xl p-5 sm:p-6 max-w-md w-full shadow-2xl border-t-4 border-blue-600 text-slate-800"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Pencil size={15} className="text-blue-600" /> Editar Calificación
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium">
                    {editCalificacionData.estudianteNombre} — <span className="text-blue-700 font-semibold">{editCalificacionData.materiaNombre}</span>
                  </p>
                </div>
                <button
                  onClick={() => setModalEditOpen(false)}
                  className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-4">
                <div>
                  <label className="block text-[11px] font-semibold text-blue-700 uppercase tracking-wide mb-1">
                    Trimestre 1
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={editCalificacionData.primer_trimestre}
                    onChange={(e) =>
                      setEditCalificacionData({
                        ...editCalificacionData,
                        primer_trimestre: e.target.value,
                      })
                    }
                    className="w-full p-2 bg-white border border-slate-300 rounded-md text-xs font-semibold outline-none focus:ring-2 focus:ring-blue-400/50"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-blue-700 uppercase tracking-wide mb-1">
                    Trimestre 2
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={editCalificacionData.segundo_trimestre}
                    onChange={(e) =>
                      setEditCalificacionData({
                        ...editCalificacionData,
                        segundo_trimestre: e.target.value,
                      })
                    }
                    className="w-full p-2 bg-white border border-slate-300 rounded-md text-xs font-semibold outline-none focus:ring-2 focus:ring-blue-400/50"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-blue-700 uppercase tracking-wide mb-1">
                    Trimestre 3
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={editCalificacionData.tercer_trimestre}
                    onChange={(e) =>
                      setEditCalificacionData({
                        ...editCalificacionData,
                        tercer_trimestre: e.target.value,
                      })
                    }
                    className="w-full p-2 bg-white border border-slate-300 rounded-md text-xs font-semibold outline-none focus:ring-2 focus:ring-blue-400/50"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-blue-700 uppercase tracking-wide mb-1">
                    Nota Total
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={editCalificacionData.total}
                    onChange={(e) =>
                      setEditCalificacionData({
                        ...editCalificacionData,
                        total: e.target.value,
                      })
                    }
                    className="w-full p-2 bg-blue-50 border border-blue-300 rounded-md text-xs font-bold text-blue-800 outline-none focus:ring-2 focus:ring-blue-400/50"
                  />
                </div>
              </div>

              <div className="flex gap-2 justify-end border-t border-slate-100 pt-3">
                <button
                  onClick={() => setModalEditOpen(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-md text-xs font-semibold transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleGuardarCalificacion}
                  className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 text-white rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
                >
                  <Save size={14} /> Guardar Notas
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODAL AGREGAR MATERIA Y NOTAS A ESTUDIANTE */}
      <AnimatePresence>
        {modalAddMateriaOpen && (
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
              className="bg-white rounded-xl p-5 sm:p-6 max-w-md w-full shadow-2xl border-t-4 border-blue-600 text-slate-800"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Plus size={16} className="text-blue-600" /> Agregar Materia y Calificación
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Estudiante: <span className="text-blue-700 font-semibold">{addMateriaData.estudianteNombre}</span>
                  </p>
                </div>
                <button
                  onClick={() => setModalAddMateriaOpen(false)}
                  className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="space-y-3 mb-4">
                <div>
                  <label className="block text-[11px] font-semibold text-blue-700 uppercase tracking-wide mb-1">
                    Seleccionar Materia
                  </label>
                  <select
                    value={addMateriaData.materia_id}
                    onChange={(e) => setAddMateriaData({ ...addMateriaData, materia_id: e.target.value })}
                    className=" w-full p-2 bg-white border border-slate-300 rounded-md text-xs font-semibold outline-none focus:ring-2 focus:ring-blue-400/50"
                  >
                    <option value=""  >-- Seleccione Materia --</option>
                    {materias.map((m) => (
                      <option  key={m.materia_id} value={m.materia_id}>
                        {m.nombre.toUpperCase()}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-blue-700 uppercase tracking-wide mb-1">
                      Trimestre 1
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={addMateriaData.primer_trimestre}
                      onChange={(e) => {
                        const val = e.target.value;
                        setAddMateriaData((prev) => {
                          const t1 = Number(val) || 0;
                          const t2 = Number(prev.segundo_trimestre) || 0;
                          const t3 = Number(prev.tercer_trimestre) || 0;
                          return { ...prev, primer_trimestre: val, total: Math.round((t1 + t2 + t3) / 3) };
                        });
                      }}
                      className="w-full p-2 bg-white border border-slate-300 rounded-md text-xs font-semibold outline-none focus:ring-2 focus:ring-blue-400/50"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-blue-700 uppercase tracking-wide mb-1">
                      Trimestre 2
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={addMateriaData.segundo_trimestre}
                      onChange={(e) => {
                        const val = e.target.value;
                        setAddMateriaData((prev) => {
                          const t1 = Number(prev.primer_trimestre) || 0;
                          const t2 = Number(val) || 0;
                          const t3 = Number(prev.tercer_trimestre) || 0;
                          return { ...prev, segundo_trimestre: val, total: Math.round((t1 + t2 + t3) / 3) };
                        });
                      }}
                      className="w-full p-2 bg-white border border-slate-300 rounded-md text-xs font-semibold outline-none focus:ring-2 focus:ring-blue-400/50"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-blue-700 uppercase tracking-wide mb-1">
                      Trimestre 3
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={addMateriaData.tercer_trimestre}
                      onChange={(e) => {
                        const val = e.target.value;
                        setAddMateriaData((prev) => {
                          const t1 = Number(prev.primer_trimestre) || 0;
                          const t2 = Number(prev.segundo_trimestre) || 0;
                          const t3 = Number(val) || 0;
                          return { ...prev, tercer_trimestre: val, total: Math.round((t1 + t2 + t3) / 3) };
                        });
                      }}
                      className="w-full p-2 bg-white border border-slate-300 rounded-md text-xs font-semibold outline-none focus:ring-2 focus:ring-blue-400/50"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-blue-700 uppercase tracking-wide mb-1">
                      Nota Total
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={addMateriaData.total}
                      onChange={(e) => setAddMateriaData({ ...addMateriaData, total: e.target.value })}
                      className="w-full p-2 bg-blue-50 border border-blue-300 rounded-md text-xs font-bold text-blue-800 outline-none focus:ring-2 focus:ring-blue-400/50"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-2 justify-end border-t border-slate-100 pt-3">
                <button
                  onClick={() => setModalAddMateriaOpen(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-md text-xs font-semibold transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleGuardarNuevaMateria}
                  className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 text-white rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
                >
                  <Save size={14} /> Guardar Materia
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODAL ELIMINAR NOTA */}
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
              exit={{ opacity: 0, y: 10 }}
              className="bg-white rounded-xl p-6 max-w-sm w-full shadow-2xl border-t-4 border-red-600 text-center"
            >
              <Trash2 className="text-red-600 mx-auto mb-3" size={34} />
              <h3 className="text-base font-bold text-slate-900 mb-1">
                ¿Eliminar registro de nota?
              </h3>
              <p className="text-xs text-slate-600 mb-4 leading-relaxed">
                Esta acción eliminará la asignatura{" "}
                <span className="font-semibold text-slate-800">
                  "{deleteCalificacionData.materiaNombre}"
                </span>{" "}
                de <span className="font-semibold text-slate-800">{deleteCalificacionData.estudianteNombre}</span>.
              </p>
              <div className="flex gap-2 w-full">
                <button
                  onClick={() => setModalDeleteOpen(false)}
                  className="flex-1 py-2 bg-slate-100 text-slate-700 text-xs font-semibold rounded-md hover:bg-slate-200 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleConfirmarEliminarCalificacion}
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
        
        {/* ENCABEZADO DE DIRECCIÓN ACADÉMICA */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 border-b border-slate-300 pb-6 mb-6 sm:mb-8"
        >
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-lg bg-gradient-to-br from-blue-100 to-blue-200 border border-blue-300 flex items-center justify-center shrink-0 shadow-sm">
              <Award className="text-blue-700" size={24} />
            </div>
            <div>
              <p className="text-[10px] sm:text-xs uppercase tracking-[0.2em] text-blue-700 font-semibold mb-1">
                Dirección Académica · Control e Informes
              </p>
              <h1 className="text-lg xs:text-xl sm:text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">
                Consolidado de Calificaciones por Paralelo
              </h1>
            </div>
          </div>

          <div className="flex gap-2 self-start md:self-auto bg-slate-200/60 p-1 rounded-lg border border-slate-300">
            <button
              onClick={() => setPdfMode(true)}
              className={`px-3.5 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all ${
                pdfMode ? "bg-white text-blue-700 shadow-xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <FileText size={14} /> Importar Excel
            </button>
            <button
              onClick={() => setPdfMode(false)}
              className={`px-3.5 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all ${
                !pdfMode ? "bg-white text-blue-700 shadow-xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <UserPlus size={14} /> Carga Manual
            </button>
          </div>
        </motion.div>

        {/* METRICAS EJECUTIVAS PARA EL DIRECTOR */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4 mb-6 sm:mb-8">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-xl p-3.5 sm:p-4 shadow-sm">
            <div className="flex items-center gap-2 text-blue-700 text-[11px] uppercase font-semibold mb-2">
              <Users size={14} /> Estudiantes Filtrados
            </div>
            <p className="text-xl sm:text-2xl font-bold text-slate-900">{estudiantesFiltrados.length}</p>
          </div>

          <div className="bg-gradient-to-br from-sky-50 to-sky-100 border border-sky-200 rounded-xl p-3.5 sm:p-4 shadow-sm">
            <div className="flex items-center gap-2 text-sky-700 text-[11px] uppercase font-semibold mb-2">
              <BarChart3 size={14} /> Promedio General
            </div>
            <p className="text-xl sm:text-2xl font-bold text-slate-900">
              {metricasGlobales.promInstitucional} <span className="text-xs font-normal text-slate-500">pts</span>
            </p>
          </div>

         

          <div className="bg-gradient-to-br from-amber-50 to-amber-100 border border-amber-200 rounded-xl p-3.5 sm:p-4 shadow-sm">
            <div className="flex items-center gap-2 text-amber-700 text-[11px] uppercase font-semibold mb-2">
              <Layers size={14} /> Paralelo Seleccionado
            </div>
            <p className="text-xs sm:text-sm font-bold text-slate-900 truncate">
              {filtroParalelo}
            </p>
          </div>
        </div>

        {/* BARRA DE FILTRADO RÁPIDO DE PARALELOS */}
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

        {mensaje && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-blue-50 border border-blue-200 text-blue-800 text-xs font-semibold p-3.5 rounded-lg mb-6 text-center shadow-xs"
          >
            {mensaje}
          </motion.div>
        )}

        {/* CARGA EXCEL / REGISTRO MANUAL */}
        <div className="mb-8">
          {pdfMode ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-gradient-to-br from-white to-blue-50/50 border border-slate-200 rounded-xl p-5 shadow-sm max-w-3xl mx-auto"
            >
              <h2 className="text-xs font-bold text-slate-800 flex items-center gap-2 tracking-wide uppercase mb-4">
                <Upload size={16} className="text-blue-600" /> Cargar Notas desde Excel
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-xs font-semibold text-blue-700 uppercase tracking-wide mb-1.5">
                    Paralelo
                  </label>
                  <select
                    value={pdfParalelo}
                    onChange={(e) => setPdfParalelo(e.target.value)}
                    className="w-full p-2.5 rounded-md bg-white border border-slate-300 text-slate-800 text-sm focus:ring-2 focus:ring-blue-400/50 outline-none"
                  >
                    <option value="">-- Seleccione Paralelo --</option>
                    {paralelos.map((p) => (
                      <option key={p.paralelo_id} value={p.paralelo_id}>
                        {p.descripcion}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-blue-700 uppercase tracking-wide mb-1.5">
                    Materia
                  </label>
                  <select
                    value={pdfMateria}
                    onChange={(e) => setPdfMateria(e.target.value)}
                    className=" w-full p-2.5 rounded-md bg-white border border-slate-300 text-slate-800 text-sm focus:ring-2 focus:ring-blue-400/50 outline-none"
                  >
                    <option value="">-- Seleccione Materia --</option>
                    {materias.map((m) => (
                      <option key={m.materia_id} value={m.materia_id} className="uppercase" >
                        {m.nombre}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <label className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-blue-300 rounded-xl cursor-pointer bg-white/60 hover:bg-blue-50/50 transition-colors text-center">
                <Upload size={32} className="text-blue-600 mb-2" />
                <span className="text-xs font-bold text-slate-800">
                  Seleccionar o arrastrar centralizador Excel (.xlsx, .xls)
                </span>
                <span className="text-[11px] text-slate-500 mt-1">
                  Requisito: Columnas 'APELLIDOS Y NOMBRES', '1TRIM', '2TRIM', '3TRIM'
                </span>
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleExcelUpload}
                  className="hidden"
                />
              </label>
            </motion.div>
          ) : (
            <Formik initialValues={usuario} enableReinitialize={true} onSubmit={Envio}>
              {({ handleChange, handleSubmit, values }) => (
                <motion.form
                  onSubmit={handleSubmit}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-gradient-to-br from-white to-blue-50/50 border border-slate-200 rounded-xl p-5 shadow-sm max-w-3xl mx-auto"
                >
                  <h2 className="text-xs font-bold text-slate-800 flex items-center gap-2 tracking-wide uppercase mb-4">
                    <UserPlus size={16} className="text-blue-600" /> Carga Manual de Notas
                  </h2>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-xs font-semibold text-blue-700 uppercase tracking-wide mb-1.5">
                        Nombre(s)
                      </label>
                      <input
                        type="text"
                        name="nombre"
                        value={values.nombre}
                        onChange={handleChange}
                        required
                        placeholder="Ej. Ana"
                        className="w-full p-2.5 rounded-md bg-white border border-slate-300 text-slate-800 text-sm focus:ring-2 focus:ring-blue-400/50 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-blue-700 uppercase tracking-wide mb-1.5">
                        Apellido(s)
                      </label>
                      <input
                        type="text"
                        name="apellido"
                        value={values.apellido}
                        onChange={handleChange}
                        required
                        placeholder="Ej. Toro"
                        className="w-full p-2.5 rounded-md bg-white border border-slate-300 text-slate-800 text-sm focus:ring-2 focus:ring-blue-400/50 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-blue-700 uppercase tracking-wide mb-1.5">
                        Paralelo
                      </label>
                      <select
                        name="paralelo"
                        value={values.paralelo}
                        onChange={handleChange}
                        className="w-full p-2.5 rounded-md bg-white border border-slate-300 text-slate-800 text-sm focus:ring-2 focus:ring-blue-400/50 outline-none"
                      >
                        <option value="">-- Seleccione Paralelo --</option>
                        {paralelos.map((p) => (
                          <option key={p.paralelo_id} value={p.paralelo_id}>
                            {p.descripcion}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-blue-700 uppercase tracking-wide mb-1.5">
                        Materia
                      </label>
                      <select
                        name="materias"
                        value={values.materias}
                        onChange={handleChange}
                        className="w-full p-2.5 rounded-md bg-white border border-slate-300 text-slate-800 text-sm focus:ring-2 focus:ring-blue-400/50 outline-none"
                      >
                        <option value="">-- Seleccione Materia --</option>
                        {materias.map((m) => (
                          <option key={m.materia_id} value={m.materia_id} className="uppercase" >
                            {m.nombre}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
                    {["trimestre1", "trimestre2", "trimestre3", "Anual"].map((field, i) => (
                      <div key={i}>
                        <label className="block text-[11px] font-semibold text-blue-700 uppercase tracking-wide mb-1">
                          {field === "Anual" ? "Prom. Anual" : `Trimestre ${i + 1}`}
                        </label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          name={field}
                          value={values[field]}
                          onChange={handleChange}
                          placeholder="0-100"
                          className="w-full p-2 rounded-md bg-white border border-slate-300 text-slate-800 text-xs focus:ring-2 focus:ring-blue-400/50 outline-none"
                        />
                      </div>
                    ))}
                  </div>

                  <motion.button
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    type="submit"
                    className="w-full py-2.5 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 text-white font-semibold rounded-md shadow-xs text-xs uppercase tracking-wide transition-colors"
                  >
                    Guardar Notas
                  </motion.button>
                </motion.form>
              )}
            </Formik>
          )}
        </div>

        {/* TABLA CONSOLIDADA CON REGISTROS FILTRADOS POR PARALELO */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-gradient-to-b from-white to-slate-50 border border-slate-200 rounded-xl shadow-sm overflow-hidden"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 sm:p-5 border-b border-slate-200 bg-gradient-to-r from-blue-50/70 to-transparent">
            <h2 className="text-xs font-bold text-slate-800 flex items-center gap-2 tracking-wide uppercase">
              <BookOpen size={16} className="text-blue-600" /> Registro Consolidado ({estudiantesFiltrados.length})
            </h2>

            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
              <input
                type="text"
                placeholder="Buscar estudiante o username…"
                value={searchEstudiante}
                onChange={(e) => setSearchEstudiante(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 rounded-md bg-white text-slate-800 border border-slate-300 text-xs focus:ring-2 focus:ring-blue-400/50 outline-none"
              />
            </div>
          </div>

          {estudiantesFiltrados.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-xs italic">
              No se encontraron calificaciones registradas para el filtro seleccionado.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-xs">
                <thead className="bg-gradient-to-r from-blue-100 to-sky-100 text-blue-900 border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4 text-left font-bold uppercase">Estudiante</th>
                    <th className="py-3 px-4 text-center font-bold uppercase">Paralelo</th>
                    <th className="py-3 px-4 text-center font-bold uppercase">Materias</th>
                    <th className="py-3 px-4 text-center font-bold uppercase">Promedio Gral.</th>
                    <th className="py-3 px-4 text-center font-bold uppercase">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {estudiantesFiltrados.map((est) => {
                    const rowId = est.estudiante_id ?? `${est.nombre}-${est.apellido}`;
                    const isExpanded = !!expandedRows[rowId];

                    const totalNotas = est.materias.reduce((acc, m) => acc + (m.total || 0), 0);
                    const promedioGral = formatNota(totalNotas / (est.materias.length || 1));
                    const numPromedioGral = Number(promedioGral);

                    return (
                      <React.Fragment key={rowId}>
                        <tr className="hover:bg-blue-50/40 transition-colors">
                          <td className="py-3 px-4 font-semibold text-slate-900">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-200 to-blue-300 border border-blue-300 flex items-center justify-center text-[11px] font-bold text-blue-800 shrink-0">
                                {iniciales(est.nombre, est.apellido)}
                              </div>
                              <span>{est.nombre} {est.apellido}</span>
                            </div>
                          </td>


                          <td className="py-3 px-4 text-center">
                            <span className="text-[10px] font-bold text-blue-800 bg-blue-100 border border-blue-200 px-2.5 py-0.5 rounded-full">
                              {est.paralelo}
                            </span>
                          </td>

                          <td className="py-3 px-4 text-center font-medium text-slate-600">
                            {est.materias.length} asignatura(s)
                          </td>

                          <td className="py-3 px-4 text-center">
                            <span
                              className={`px-2.5 py-0.5 rounded font-bold ${
                                numPromedioGral >= 85
                                  ? "bg-emerald-100 border border-emerald-300 text-emerald-800"
                                  : numPromedioGral < 70
                                  ? "bg-red-100 border border-red-300 text-red-800"
                                  : "bg-amber-100 border border-amber-300 text-amber-800"
                              }`}
                            >
                              {promedioGral} pts
                            </span>
                          </td>

                          <td className="py-3 px-4 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => generarPDFEstudiante(est)}
                                className="p-1.5 rounded-md bg-blue-50 border border-blue-200 text-blue-600 hover:bg-blue-100 transition-colors"
                                title="Exportar Boletín PDF"
                              >
                                <Download size={14} />
                              </button>

                              <button
                                onClick={() => toggleRowExpand(rowId)}
                                className="p-1.5 rounded-md bg-slate-100 border border-slate-300 text-slate-700 hover:bg-slate-200 transition-colors flex items-center gap-1 font-semibold"
                                title="Ver materias y editar notas"
                              >
                                {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                              </button>
                            </div>
                          </td>
                        </tr>

                        {isExpanded && (
                          <tr className="bg-slate-50/80">
                            <td colSpan={6} className="p-4 border-t border-b border-slate-200">
                              <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-2xs">
                                <div className="flex items-center justify-between mb-2.5">
                                  <h4 className="text-[11px] uppercase tracking-wide font-bold text-blue-800 flex items-center gap-1.5">
                                    <BookOpen size={14} /> Desglose de Notas de {est.nombre} {est.apellido}
                                  </h4>

                                  <button
                                    onClick={() => handleOpenAddMateriaModal(est)}
                                    className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-[11px] font-semibold flex items-center gap-1 transition-colors shadow-xs"
                                    title="Agregar nueva materia a este estudiante"
                                  >
                                    <Plus size={13} /> Agregar Materia / Nota
                                  </button>
                                </div>

                                <div className="overflow-x-auto">
                                  <table className="min-w-full text-[11px]">
                                    <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                                      <tr>
                                        <th className="py-2 px-3 text-left">Materia</th>
                                        <th className="py-2 px-3 text-center">Trimestre 1</th>
                                        <th className="py-2 px-3 text-center">Trimestre 2</th>
                                        <th className="py-2 px-3 text-center">Trimestre 3</th>
                                        <th className="py-2 px-3 text-center">Total Anual</th>
                                        <th className="py-2 px-3 text-center">Estatus</th>
                                        <th className="py-2 px-3 text-center">Acciones</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                      {est.materias.map((mat, idx) => {
                                        const estNombre = `${est.nombre} ${est.apellido}`;
                                        const notaTotal = mat.total || 0;
                                        const notaTotalStr = formatNota(notaTotal);
                                        const numNotaTotal = Number(notaTotalStr);

                                        return (
                                          <tr key={idx} className="hover:bg-blue-50/30 transition-colors">
                                            <td className="py-2 px-3 font-semibold text-slate-800">
                                              {mat.materia}
                                            </td>
                                            <td className="py-2 px-3 text-center text-slate-600">
                                              {formatNota(mat.primer_trimestre)}
                                            </td>
                                            <td className="py-2 px-3 text-center text-slate-600">
                                              {formatNota(mat.segundo_trimestre)}
                                            </td>
                                            <td className="py-2 px-3 text-center text-slate-600">
                                              {formatNota(mat.tercer_trimestre)}
                                            </td>
                                            <td className="py-2 px-3 text-center font-bold text-blue-800">
                                              {notaTotalStr} pts
                                            </td>
                                            <td className="py-2 px-3 text-center">
                                              <span
                                                className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                                  numNotaTotal >= 85
                                                    ? "text-emerald-800 bg-emerald-100"
                                                    : numNotaTotal < 70
                                                    ? "text-red-800 bg-red-100"
                                                    : "text-amber-800 bg-amber-100"
                                                }`}
                                              >
                                                {numNotaTotal >= 85 ? "Sobresaliente" : numNotaTotal < 70 ? "En Riesgo" : "Aprobado"}
                                              </span>
                                            </td>
                                            <td className="py-2 px-3 text-center">
                                              <div className="flex items-center justify-center gap-1.5">
                                                <button
                                                  onClick={() => handleOpenEditModal(mat, estNombre)}
                                                  className="p-1 rounded bg-amber-50 border border-amber-300 text-amber-700 hover:bg-amber-100 transition-colors"
                                                  title="Editar calificaciones"
                                                >
                                                  <Pencil size={12} />
                                                </button>
                                                <button
                                                  onClick={() => handleOpenDeleteModal(mat, estNombre)}
                                                  className="p-1 rounded bg-red-50 border border-red-300 text-red-700 hover:bg-red-100 transition-colors"
                                                  title="Eliminar materia"
                                                >
                                                  <Trash2 size={12} />
                                                </button>
                                              </div>
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