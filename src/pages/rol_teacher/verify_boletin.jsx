import React, { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { Html5Qrcode } from "html5-qrcode";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldCheck,
  QrCode,
  FileText,
  Camera,
  Upload,
  CheckCircle2,
  ExternalLink,
  RefreshCw,
  XCircle,
  FileSearch,
  Lock,
  User,
  Sparkles,
} from "lucide-react";

import { verificarCertificado } from "../../api/api.blockchain"; // API de verificación

export const VerificadorBoletinProfesor = () => {
  const [searchParams] = useSearchParams();
  const hashUrl = searchParams.get("hash");

  // Estados de navegación y procesamiento
  const [modoEscaneo, setModoEscaneo] = useState("qr_file"); // 'cam', 'pdf_file', 'qr_file'
  const [loading, setLoading] = useState(false);
  const [camaraActiva, setCamaraActiva] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [error, setError] = useState(null);
  const [fotoUrl, setFotoUrl] = useState("");

  const scannerRef = useRef(null);

  // =========================================================================
  // LÓGICA DE PROCESAMIENTO DE FOTO
  // =========================================================================
  useEffect(() => {
    if (resultado) {
      const fotoBD = resultado.foto;

      if (fotoBD) {
        // Caso 1: Buffer de PostgreSQL / Node ({ type: "Buffer", data: [...] })
        if (fotoBD.type === "Buffer" && Array.isArray(fotoBD.data)) {
          try {
            const uint8Array = new Uint8Array(fotoBD.data);
            let binaryString = "";
            const chunkSize = 8192;
            for (let i = 0; i < uint8Array.length; i += chunkSize) {
              const chunk = uint8Array.subarray(i, i + chunkSize);
              binaryString += String.fromCharCode.apply(null, chunk);
            }
            const base64String = btoa(binaryString);
            setFotoUrl(`data:image/jpeg;base64,${base64String}`);
          } catch (err) {
            console.error("Error al convertir buffer de la foto:", err);
            setFotoUrl("");
          }
        } 
        // Caso 2: Array de bytes directo
        else if (Array.isArray(fotoBD) && fotoBD.length > 0) {
          try {
            const uint8Array = new Uint8Array(fotoBD);
            let binaryString = "";
            const chunkSize = 8192;
            for (let i = 0; i < uint8Array.length; i += chunkSize) {
              const chunk = uint8Array.subarray(i, i + chunkSize);
              binaryString += String.fromCharCode.apply(null, chunk);
            }
            const base64String = btoa(binaryString);
            setFotoUrl(`data:image/jpeg;base64,${base64String}`);
          } catch (err) {
            console.error("Error al convertir array de bytes:", err);
            setFotoUrl("");
          }
        } 
        // Caso 3: String Base64 directo
        else if (typeof fotoBD === "string" && fotoBD.length > 0) {
          if (fotoBD.startsWith("data:image")) {
            setFotoUrl(fotoBD);
          } else {
            setFotoUrl(`data:image/jpeg;base64,${fotoBD}`);
          }
        } else {
          setFotoUrl("");
        }
      } else {
        setFotoUrl("");
      }
    } else {
      setFotoUrl("");
    }
  }, [resultado]);

  // Si entra directamente desde la URL del QR (ej. app nativa)
  useEffect(() => {
    if (hashUrl) {
      procesarHash(hashUrl);
    }
  }, [hashUrl]);

  // Limpieza del scanner al desmontar el componente
  useEffect(() => {
    return () => {
      detenerCamara();
    };
  }, []);

  // =========================================================================
  // NÚCLEO: CONSULTA Y VERIFICACIÓN DEL HASH (BD + BLOCKCHAIN SEPOLIA)
  // =========================================================================
  const procesarHash = async (hashExtraido) => {
    try {
      setLoading(true);
      setError(null);
      setResultado(null);
      setFotoUrl("");
      detenerCamara();

      const hashLimpio = hashExtraido.trim();
      console.log("Verificando hash:", hashLimpio);

      const data = await verificarCertificado(hashLimpio);
      console.log("Respuesta del backend:", data);

      if (data && data.existe) {
        setResultado(data);
      } else {
        setError("El hash proporcionado no se encuentra registrado en el sistema institucional.");
      }
    } catch (err) {
      console.error("Error durante la verificación:", err);
      setError("No se pudo verificar el boletín. El documento podría ser falso o haber sido alterado.");
    } finally {
      setLoading(false);
    }
  };

  // =========================================================================
  // MODALIDADES DE ESCANEO
  // =========================================================================
 const iniciarCamara = async () => {
    setModoEscaneo("cam");
    setError(null);
    setCamaraActiva(true);

    setTimeout(async () => {
      try {
        const html5QrCode = new Html5Qrcode("reader-camera");
        scannerRef.current = html5QrCode;

        await html5QrCode.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          (decodedText) => {
            extraerYProcesarUrl(decodedText);
          },
          () => {}
        );
      } catch (err) {
        console.error("Error al acceder a la cámara:", err);
        setError("No se pudo acceder a la cámara. Permite el acceso e intenta nuevamente.");
        setCamaraActiva(false);
      }
    }, 300);
  };

  const detenerCamara = async () => {
    if (scannerRef.current && scannerRef.current.isScanning) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
      } catch (err) {
        console.error("Error al detener cámara:", err);
      }
    }
    setCamaraActiva(false);
  };

  const handleImagenQRUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      setLoading(true);
      setError(null);
      const html5QrCode = new Html5Qrcode("reader-hidden");
      const decodedText = await html5QrCode.scanFile(file, true);
      extraerYProcesarUrl(decodedText);
    } catch (err) {
      console.error("Error procesando imagen QR:", err);
      setError("No se detectó ningún Código QR válido en la imagen cargada.");
      setLoading(false);
    }
  };

  const handlePDFUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      setLoading(true);
      setError(null);

      const reader = new FileReader();
      reader.onload = async function () {
        const contenido = new Uint8Array(this.result);
        const textoPDF = new TextDecoder().decode(contenido);
        const matchHash = textoPDF.match(/0x[a-fA-F0-9]{40,64}/);

        if (matchHash && matchHash[0]) {
          procesarHash(matchHash[0]);
        } else {
          setError("No se encontró una firma hash digital válida dentro del PDF seleccionado.");
          setLoading(false);
        }
      };
      reader.readAsArrayBuffer(file);
    } catch (err) {
      console.error("Error leyendo archivo PDF:", err);
      setError("Ocurrió un error al procesar el archivo PDF.");
      setLoading(false);
    }
  };

  const extraerYProcesarUrl = (cadenaTexto) => {
    try {
      if (cadenaTexto.includes("hash=")) {
        const urlParams = new URLSearchParams(cadenaTexto.split("?")[1]);
        const hash = urlParams.get("hash");
        if (hash) {
          procesarHash(hash);
          return;
        }
      }
      if (cadenaTexto.startsWith("0x")) {
        procesarHash(cadenaTexto);
        return;
      }
      setError("El Código QR escaneado no pertenece a la red de certificación institucional.");
      setLoading(false);
    } catch (err) {
      setError("Formato de Código QR no reconocido.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#EEF3FC] via-[#E9F0FB] to-[#E3ECFA] text-slate-800 p-3 xs:p-4 sm:p-6 md:p-10 font-sans flex flex-col items-center justify-center">
      <div id="reader-hidden" className="hidden" />

      <div className="max-w-3xl w-full">
        {/* ENCABEZADO INSTITUCIONAL - ESTILO CLARO */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-6 sm:mb-8"
        >
          <div className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-blue-100 to-blue-200 border border-blue-300 shadow-xs mb-3">
            <ShieldCheck className="text-blue-700" size={32} />
          </div>
          <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-[0.2em] text-blue-700 mb-1">
            Portal Oficial de Auditoría & Verificación
          </p>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">
            Verificación de Boletines Académicos
          </h1>
          
        </motion.div>

        {/* PANEL PRINCIPAL - CARD BLANCO */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 md:p-8 shadow-xl">
          
          {/* OPCIONES DE MODALIDAD SI NO HAY RESULTADO */}
          {!resultado && !loading && (
            <div>
              {/* SELECTOR DE PESTAÑAS CLARO */}
              <div className="grid grid-cols-3 gap-1.5 sm:gap-2 p-1.5 bg-slate-100 border border-slate-200 rounded-xl mb-6">
                <button
                  onClick={() => {
                    detenerCamara();
                    setModoEscaneo("qr_file");
                  }}
                  className={`flex items-center justify-center gap-1.5 sm:gap-2 py-2 sm:py-2.5 px-2 sm:px-3 rounded-lg text-[11px] sm:text-xs font-semibold transition-all ${
                    modoEscaneo === "qr_file"
                      ? "bg-blue-600 text-white shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <QrCode size={15} /> <span className="hidden xs:inline">Imagen</span> QR
                </button>

                <button
                  onClick={() => {
                    detenerCamara();
                    setModoEscaneo("pdf_file");
                  }}
                  className={`flex items-center justify-center gap-1.5 sm:gap-2 py-2 sm:py-2.5 px-2 sm:px-3 rounded-lg text-[11px] sm:text-xs font-semibold transition-all ${
                    modoEscaneo === "pdf_file"
                      ? "bg-blue-600 text-white shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <FileText size={15} /> Leer PDF
                </button>

                <button
                  onClick={iniciarCamara}
                  className={`flex items-center justify-center gap-1.5 sm:gap-2 py-2 sm:py-2.5 px-2 sm:px-3 rounded-lg text-[11px] sm:text-xs font-semibold transition-all ${
                    modoEscaneo === "cam"
                      ? "bg-blue-600 text-white shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <Camera size={15} /> Cámara
                </button>
              </div>

              {/* MODO 1: SUBIR IMAGEN QR */}
              {modoEscaneo === "qr_file" && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-2 sm:py-4">
                  <label className="border-2 border-dashed border-blue-200 hover:border-blue-500 bg-blue-50/50 rounded-2xl p-6 sm:p-8 flex flex-col items-center justify-center cursor-pointer group transition-all">
                    <div className="w-12 h-12 sm:w-14 sm:h-14 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 mb-3 group-hover:scale-110 transition-transform">
                      <Upload size={24} />
                    </div>
                    <p className="text-sm font-bold text-slate-800 mb-1">Cargar Imagen con Código QR</p>
                    <p className="text-xs text-slate-500">Archivos PNG, JPG, WEBP o capturas de pantalla</p>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImagenQRUpload}
                      className="hidden"
                    />
                  </label>
                </motion.div>
              )}

              {/* MODO 2: SUBIR ARCHIVO PDF */}
              {modoEscaneo === "pdf_file" && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-2 sm:py-4">
                  <label className="border-2 border-dashed border-emerald-200 hover:border-emerald-500 bg-emerald-50/50 rounded-2xl p-6 sm:p-8 flex flex-col items-center justify-center cursor-pointer group transition-all">
                    <div className="w-12 h-12 sm:w-14 sm:h-14 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 mb-3 group-hover:scale-110 transition-transform">
                      <FileSearch size={24} />
                    </div>
                    <p className="text-sm font-bold text-slate-800 mb-1">Cargar Boletín Digital (PDF)</p>
                    <p className="text-xs text-slate-500">El sistema analizará automáticamente el hash integrado</p>
                    <input
                      type="file"
                      accept="application/pdf"
                      onChange={handlePDFUpload}
                      className="hidden"
                    />
                  </label>
                </motion.div>
              )}

              {/* MODO 3: CÁMARA */}
           {modoEscaneo === "cam" && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center py-2">
                  <div className="w-full max-w-sm sm:max-w-md overflow-hidden rounded-2xl border-2 border-blue-400 bg-slate-900 relative shadow-md">
                    
                    {/* Estilo local para eliminar el recuadro blanco de enfoque */}
                    <style>{`
                      #qr-shaded-region { display: none !important; }
                      #reader-camera video { object-fit: cover !important; width: 100% !important; height: 100% !important; }
                    `}</style>

                    {/* h-80 para celular (más grande) y sm:h-64 para PC (como estaba antes) */}
                    <div id="reader-camera" className="w-full h-80 sm:h-64" />

                    {!camaraActiva && (
                      <div className="absolute inset-0 bg-slate-100 flex flex-col items-center justify-center text-xs text-slate-500 p-4 text-center">
                        <Camera className="mb-2 text-slate-400" size={32} />
                        Iniciando cámara del dispositivo...
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-3 text-center">
                    Apunta la cámara de tu celular o computadora hacia el Código QR del boletín PDF.
                  </p>
                </motion.div>
              )}
            </div>
          )}

          {/* INDICADOR DE CARGA */}
          {loading && (
            <div className="py-12 text-center">
              <RefreshCw className="w-10 h-10 animate-spin text-blue-600 mx-auto mb-3" />
              <p className="text-sm font-bold text-slate-800">Auditando Criptográficamente...</p>
              <p className="text-xs text-slate-500 mt-1">
                Consultando Base de Datos + Nodo Ethereum Sepolia
              </p>
            </div>
          )}

          {/* MENSAJE DE ERROR */}
          {error && !loading && (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="my-2">
              <div className="bg-red-50 border border-red-200 rounded-2xl p-5 sm:p-6 text-center">
                <XCircle className="text-red-600 mx-auto mb-2" size={36} />
                <h3 className="text-base font-bold text-red-900">Verificación Fallida</h3>
                <p className="text-xs text-red-700 mt-1">{error}</p>
                <button
                  onClick={() => {
                    setError(null);
                    setResultado(null);
                    setFotoUrl("");
                  }}
                  className="mt-4 px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-semibold transition-colors"
                >
                  Intentar de Nuevo
                </button>
              </div>
            </motion.div>
          )}

          {/* FICHA DE RESULTADO (VERIFICADO) */}
          {resultado && !loading && (
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-5 sm:space-y-6">
              
              {/* BANNER DE ÉXITO */}
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 sm:p-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                    <CheckCircle2 size={22} />
                  </div>
                  <div>
                    <h3 className="text-xs sm:text-sm font-bold text-emerald-950">Documento Auténtico y Verificado</h3>
                    
                  </div>
                </div>
                
              </div>

              {/* DATOS DEL ESTUDIANTE Y FOTO */}
              <div className="bg-slate-50 rounded-xl p-4 sm:p-6 border border-slate-200 space-y-5">
                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6 pb-5 border-b border-slate-200 text-center sm:text-left">
                  
                  {/* FOTO MÁS GRANDE (AMPLIADA Y RESPONSIVE) */}
                  <div className="shrink-0">
                    {fotoUrl ? (
                      <img
                        src={fotoUrl}
                        alt={`Foto de ${resultado.estudiante}`}
                        className="w-28 h-28 sm:w-32 sm:h-32 rounded-full object-cover border-4 border-blue-400 shadow-md bg-white"
                        onError={(e) => {
                          console.error("Error cargando imagen:", e);
                          setFotoUrl("");
                        }}
                      />
                    ) : (
                      <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-full border-4 border-blue-400 bg-blue-50 flex items-center justify-center text-blue-700 font-bold text-4xl shadow-md">
                        {((resultado.estudiante?.[0] || "U")).toUpperCase()}
                      </div>
                    )}
                  </div>
                  
                  {/* NOMBRE Y DATOS (SIN MOSTRAR ID) */}
                  <div className="flex-1 min-w-0 self-center">
                    <p className="text-[10px] sm:text-xs uppercase font-bold text-blue-700 tracking-wider flex items-center justify-center sm:justify-start gap-1">
                      <Sparkles size={13} /> Estudiante Certificado
                    </p>
                    <h2 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-slate-900 mt-0.5 leading-tight">
                      {resultado.estudiante || "Estudiante Registrado"}
                    </h2>
                    <div className="mt-2 inline-flex items-center gap-2 bg-blue-100/70 border border-blue-200 px-3 py-1 rounded-lg text-xs text-blue-900 font-medium">
                      <span>Paralelo: </span>
                      <span className="font-bold">{resultado.paralelo || "General"}</span>
                    </div>
                  </div>
                </div>

                {/* INDICADORES DE AUDITORÍA */}
                <div className="grid grid-cols-1 xs:grid-cols-2 gap-3">
                  <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-xs">
                    <p className="text-[10px] text-slate-500 uppercase font-semibold">Estado en Base de Datos</p>
                    <p className="text-xs font-bold text-emerald-600 flex items-center gap-1 mt-1">
                      <CheckCircle2 size={14} /> Registrado & Activo
                    </p>
                  </div>

                  <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-xs">
                    <p className="text-[10px] text-slate-500 uppercase font-semibold">Red Blockchain</p>
                    <p className="text-xs font-bold text-blue-700 flex items-center gap-1 mt-1">
                      <Lock size={14} /> Ethereum Sepolia
                    </p>
                  </div>
                </div>

                {/* HASH CRIPTOGRÁFICO */}
                <div className="pt-1">
                  <span className="text-[11px] font-semibold text-slate-600 block mb-1">
                    Hash Criptográfico (Firma Digital del Documento):
                  </span>
                  <div className="bg-slate-100 p-3 rounded-xl font-mono text-[10px] sm:text-[11px] text-slate-700 border border-slate-200 break-all select-all">
                    {resultado.hash}
                  </div>
                </div>
              </div>

              {/* BOTONES DE ACCIÓN */}
              <div className="flex flex-col sm:flex-row gap-3 pt-1">
                <a
                  href={`https://sepolia.etherscan.io/address/${resultado.contractAddress || ""}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white font-bold py-3 px-4 rounded-xl text-xs transition-all shadow-xs text-center"
                >
                  <ExternalLink size={15} />
                  Auditar Contrato en Etherscan (Sepolia)
                </a>

                <button
                  onClick={() => {
                    setResultado(null);
                    setError(null);
                    setFotoUrl("");
                  }}
                  className="px-5 py-3 bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold rounded-xl text-xs transition-colors text-center"
                >
                  Verificar Otro Boletín
                </button>
              </div>

            </motion.div>
          )}

        </div>

        {/* PIE DE PÁGINA */}
        <p className="text-[11px] text-slate-500 text-center mt-6">
          Unidad Educativa Roberto Alvarado Daza 'B' · Sistema de Certificación Digital Blockchain
        </p>
      </div>
    </div>
  );
};