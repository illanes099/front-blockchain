import React, { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Edit3,
  Save,
  X,
  Camera,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  BookOpen,
  Sparkles,
} from "lucide-react";
import { Formik } from "formik";

// Importaciones de tus servicios de API
import { getUsuarios } from "../../api/api.usuario";
import { getProfesor, updateprofesores } from "../../api/api.profesores";

export const PerfilDocente = () => {
  const [userList, setUserList] = useState([]);
  const [profesoresList, setProfesoresList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Estados de modal y edición
  const [modalOpen, setModalOpen] = useState(false);
  const [modalSuccess, setModalSuccess] = useState(true);
  const [messageModal, setMessageModal] = useState("");
  const [editable, setEditable] = useState(false);

  // Previsualización de la foto de perfil
  const [previewFoto, setPreviewFoto] = useState("");

  // Carga unificada de datos
  const cargarDatosPerfil = async () => {
    try {
      setLoading(true);
      setError(null);

      const [responseUser, responseProf] = await Promise.all([
        getUsuarios().catch(() => ({ data: [] })),
        getProfesor().catch(() => []),
      ]);

      setUserList(responseUser.data || responseUser || []);
      setProfesoresList(responseProf || []);
    } catch (err) {
      console.error("Error al cargar datos del perfil docente:", err);
      setError("No fue posible cargar la información de tu perfil académico.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarDatosPerfil();
  }, []);

  // Coincidencia con el usuario logueado en localStorage
  const userId = useMemo(() => {
    const localUsername = localStorage.getItem("username");
    return userList.find((u) => u.username === localUsername);
  }, [userList]);

  // Registro del profesor coincidente con usuario_id
  const docenteId = useMemo(() => {
    return profesoresList.find((p) => p.usuario_id === userId?.usuario_id);
  }, [profesoresList, userId]);

  // Procesamiento del campo BYTEA / Buffer / Base64 devuelto por PostgreSQL (fotos)
  useEffect(() => {
    const fotoBD = docenteId?.fotos;

    if (fotoBD) {
      // Si la foto llega en formato Buffer desde PostgreSQL (bytea)
      if (typeof fotoBD === "object" && fotoBD?.type === "Buffer" && Array.isArray(fotoBD.data)) {
        try {
          const uint8Array = new Uint8Array(fotoBD.data);
          let binaryString = "";
          const chunkSize = 8192;
          for (let i = 0; i < uint8Array.length; i += chunkSize) {
            const chunk = uint8Array.subarray(i, i + chunkSize);
            binaryString += String.fromCharCode.apply(null, chunk);
          }
          const base64String = btoa(binaryString);
          setPreviewFoto(`data:image/jpeg;base64,${base64String}`);
        } catch (err) {
          console.error("Error al convertir el bytea Buffer:", err);
          setPreviewFoto("");
        }
      } 
      // Si la foto llega como string en Base64
      else if (typeof fotoBD === "string" && fotoBD.length > 0) {
        if (fotoBD.startsWith("data:image")) {
          setPreviewFoto(fotoBD);
        } else {
          setPreviewFoto(`data:image/jpeg;base64,${fotoBD}`);
        }
      } else {
        setPreviewFoto("");
      }
    } else {
      setPreviewFoto("");
    }
  }, [docenteId]);

  // Valores del Payload sincronizados con los campos de tu BD
  const payloadDocente = useMemo(() => {
    return {
      usuario_id: userId?.usuario_id || 0,
      frase: docenteId?.frase || "",
      fotos: docenteId?.fotos || "",
    };
  }, [userId, docenteId]);

  // Compresión en Canvas (400x400 px, 80% calidad) antes de subir a la BD
  const comprimirYConvertirBase64 = (file, setFieldValue) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX_WIDTH = 400;
        const MAX_HEIGHT = 400;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);

        const base64String = canvas.toDataURL("image/jpeg", 0.8);
        setPreviewFoto(base64String);
        setFieldValue("fotos", base64String);
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e, setFieldValue) => {
    const file = e.target.files[0];
    if (file) {
      comprimirYConvertirBase64(file, setFieldValue);
    }
  };

  // Guardado en Base de Datos a través del Endpoint PUT
  const Envio = async (values) => {
    try {
      const id = docenteId?.prof_id;

      if (!id) {
        setModalSuccess(false);
        setMessageModal("¡Error! No se encontró el ID (prof_id) del registro del docente.");
        setModalOpen(true);
        return;
      }

      await updateprofesores(id, values);

      setEditable(false);
      setModalSuccess(true);
      setMessageModal("¡Éxito! Tu fotografía y eslogan se han guardado correctamente en la base de datos.");
      setModalOpen(true);

      await cargarDatosPerfil();
    } catch (err) {
      console.error("Error al actualizar datos en BD:", err);
      setModalSuccess(false);
      setMessageModal("¡Fallido! Ocurrió un error al actualizar los datos en el servidor.");
      setModalOpen(true);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#EEF3FC] via-[#E9F0FB] to-[#E3ECFA] flex items-center justify-center p-4 font-sans">
        <div className="flex items-center gap-3 bg-white border border-slate-200 px-6 py-4 rounded-xl shadow-lg">
          <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-slate-700 text-sm font-semibold">
            Cargando perfil docente…
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
      
      {/* MODAL DE NOTIFICACIÓN DE ÉXITO O ERROR */}
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
              className="bg-white rounded-2xl p-6 max-w-sm w-full text-center shadow-2xl border-t-4"
              style={{ borderTopColor: modalSuccess ? "#2563EB" : "#DC2626" }}
            >
              {modalSuccess ? (
                <CheckCircle2 className="text-blue-600 mx-auto mb-3" size={40} />
              ) : (
                <AlertCircle className="text-red-600 mx-auto mb-3" size={40} />
              )}
              <h3 className="text-base font-bold text-slate-900 mb-2">
                {modalSuccess ? "¡Operación Exitosa!" : "Atención / Error"}
              </h3>
              <p className="text-xs text-slate-600 mb-5 leading-relaxed">
                {messageModal}
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

      <div className="max-w-5xl mx-auto space-y-6 sm:space-y-8">
        
        {/* ENCABEZADO DE LA VISTA */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 border-b border-slate-300 pb-6"
        >
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-lg bg-gradient-to-br from-blue-100 to-blue-200 border border-blue-300 flex items-center justify-center shrink-0 shadow-sm">
              <BookOpen className="text-blue-700" size={24} />
            </div>
            <div>
              <p className="text-[10px] sm:text-xs uppercase tracking-[0.2em] text-blue-700 font-semibold mb-1">
                Portal Docente · Cuenta Personal
              </p>
              <h1 className="text-lg xs:text-xl sm:text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">
                Mi Perfil Profesional
              </h1>
            </div>
          </div>
        </motion.div>

        {/* LAYOUT PRINCIPAL CON FORMIK */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          <Formik
            initialValues={payloadDocente}
            enableReinitialize={true}
            onSubmit={Envio}
          >
            {({ handleChange, handleSubmit, values, setFieldValue }) => (
              <>
                {/* COLUMNA IZQUIERDA: TARJETA DE FOTO E IDENTIDAD */}
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 }}
                  className="md:col-span-4 bg-gradient-to-b from-white to-slate-50 border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col items-center text-center justify-between"
                >
                  <div className="w-full flex flex-col items-center">
                    <div className="relative mb-4">
                      {previewFoto ? (
                        <img
                          src={previewFoto}
                          alt="Fotografía del docente"
                          className="h-32 w-32 rounded-full object-cover border-4 border-blue-400 shadow-md bg-slate-100"
                        />
                      ) : (
                        <div className="h-32 w-32 rounded-full border-4 border-blue-400 shadow-md bg-blue-50 flex items-center justify-center text-blue-700 font-bold text-2xl">
                          {((userId?.nombre?.[0] || "D")).toUpperCase()}
                        </div>
                      )}

                      {editable && (
                        <label
                          htmlFor="fileInput"
                          className="absolute bottom-0 right-0 bg-blue-600 hover:bg-blue-700 text-white rounded-full p-2.5 cursor-pointer shadow-md transition"
                          title="Subir nueva fotografía"
                        >
                          <Camera size={16} />
                          <input
                            id="fileInput"
                            type="file"
                            name="archivo"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => handleFileChange(e, setFieldValue)}
                          />
                        </label>
                      )}
                    </div>

                    <h2 className="text-lg font-extrabold text-slate-900">
                      {userId?.nombre ?? "Profesor/a"} {userId?.apellido ?? ""}
                    </h2>
                    <p className="text-xs font-semibold text-blue-700 mt-0.5">
                      {userId?.username ?? "docente"}
                    </p>

                    <div className="mt-3 inline-flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-bold px-3 py-1 rounded-full">
                      <ShieldCheck size={14} /> Docente Activo
                    </div>
                  </div>

                  <div className="w-full mt-6 pt-4 border-t border-slate-200 text-left space-y-2 text-xs">
                   
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-medium">Rol del Sistema:</span>
                      <span className="font-bold text-slate-800 uppercase">Docente</span>
                    </div>
                  </div>
                </motion.div>

                {/* COLUMNA DERECHA: FORMULARIO Y EDICIÓN DE FRASE */}
                <motion.div
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.15 }}
                  className="md:col-span-8 bg-gradient-to-b from-white to-slate-50 border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between border-b border-slate-200 pb-4 mb-6">
                      <div>
                        <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide flex items-center gap-2">
                          <Sparkles size={16} className="text-blue-600" /> Información Profesional
                        </h3>
                        
                      </div>

                      <button
                        type="button"
                        onClick={() => setEditable(!editable)}
                        className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all shadow-xs ${
                          editable
                            ? "bg-red-50 border border-red-200 text-red-700 hover:bg-red-100"
                            : "bg-blue-600 border border-blue-500 text-white hover:bg-blue-700"
                        }`}
                      >
                        {editable ? (
                          <>
                            <X size={15} /> Cancelar
                          </>
                        ) : (
                          <>
                            <Edit3 size={15} /> Editar Perfil
                          </>
                        )}
                      </button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-5">
                      <div>
                        <label className="block text-xs font-semibold text-blue-700 uppercase tracking-wide mb-1.5">
                          Eslogan o Frase Personal
                        </label>
                        <input
                          id="frase"
                          type="text"
                          name="frase"
                          value={values.frase ?? ""}
                          disabled={!editable}
                          onChange={handleChange}
                          placeholder="Ej. La educación es el arma más poderosa para cambiar el mundo."
                          className={`w-full p-3 rounded-xl text-sm transition-all outline-none ${
                            editable
                              ? "bg-white border-2 border-blue-400 text-slate-900 shadow-inner focus:ring-2 focus:ring-blue-400/50"
                              : "bg-slate-100 border border-slate-200 text-slate-600 cursor-not-allowed"
                          }`}
                        />
                      </div>

                      {/* BOTÓN DE GUARDADO */}
                      {editable && (
                        <motion.div
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="pt-3"
                        >
                          <button
                            type="submit"
                            className="w-full py-3 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white font-semibold text-xs uppercase tracking-wider rounded-xl shadow-sm shadow-blue-200 transition-all flex items-center justify-center gap-2"
                          >
                            <Save size={16} /> Guardar Cambios en Base de Datos
                          </button>
                        </motion.div>
                      )}
                    </form>
                  </div>

                 
                </motion.div>
              </>
            )}
          </Formik>
        </div>
      </div>
    </div>
  );
};