import React, { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
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
  Sparkles,
} from "lucide-react";

import { verificarCertificado } from "../../api/api.blockchain"; // API de verificación

// =========================================================================
// CONSTANTES Y UTILIDADES
// =========================================================================

const TIEMPO_ESPERA_CAMARA_MS = 10000;
const REGEX_HASH = /0x[a-fA-F0-9]{40,64}/;

const bytesABase64 = (bytes) => {
  const u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let binario = "";
  const chunkSize = 8192;
  for (let i = 0; i < u8.length; i += chunkSize) {
    binario += String.fromCharCode.apply(null, u8.subarray(i, i + chunkSize));
  }
  return btoa(binario);
};

const fotoADataUrl = (fotoBD) => {
  if (!fotoBD) return "";
  try {
    if (fotoBD.type === "Buffer" && Array.isArray(fotoBD.data) && fotoBD.data.length > 0) {
      return `data:image/jpeg;base64,${bytesABase64(fotoBD.data)}`;
    }
    if (Array.isArray(fotoBD) && fotoBD.length > 0) {
      return `data:image/jpeg;base64,${bytesABase64(fotoBD)}`;
    }
    if (typeof fotoBD === "string" && fotoBD.length > 0) {
      return fotoBD.startsWith("data:image") ? fotoBD : `data:image/jpeg;base64,${fotoBD}`;
    }
  } catch (err) {
    console.error("Error al convertir la foto:", err);
  }
  return "";
};

const extraerHash = (texto) => {
  if (!texto) return null;
  const limpio = String(texto).trim();

  try {
    const url = new URL(limpio);
    const h = url.searchParams.get("hash");
    if (h) return h.trim();
  } catch {
    /* no es una URL completa */
  }

  const porParam = limpio.match(/[?&]hash=([^&#\s]+)/i);
  if (porParam) {
    try {
      return decodeURIComponent(porParam[1]).trim();
    } catch {
      return porParam[1].trim();
    }
  }

  const suelto = limpio.match(REGEX_HASH);
  return suelto ? suelto[0] : null;
};

const esErrorDePermiso = (err) => /NotAllowed|Permission|denied/i.test(String(err?.name || err?.message || err || ""));

const mensajeErrorCamara = (err) => {
  if (typeof window !== "undefined" && (!window.isSecureContext || !navigator.mediaDevices)) {
    return "La cámara solo funciona en conexión segura. Abre el portal con https:// (o desde localhost).";
  }
  const txt = String(err?.name || err?.message || err || "");
  if (/NotAllowed|Permission|denied/i.test(txt)) {
    return "Permiso de cámara denegado. Actívalo desde el candado de la barra de direcciones y vuelve a intentar.";
  }
  if (/NotFound|Requested device not found|no camera/i.test(txt)) {
    return "No se encontró ninguna cámara en este dispositivo.";
  }
  if (/NotReadable|TrackStart|in use|Could not start/i.test(txt)) {
    return "La cámara está siendo usada por otra aplicación o pestaña. Ciérrala e intenta nuevamente.";
  }
  return "No se pudo acceder a la cámara. Permite el acceso en tu navegador e intenta nuevamente.";
};

const liberarScanner = async (scanner) => {
  if (!scanner) return;
  try {
    if (scanner.isScanning) await scanner.stop();
  } catch {
    /* ya detenido */
  }
  try {
    scanner.clear();
  } catch {
    /* nada */
  }
};

const reescalarImagen = async (file, maxLado) => {
  const bitmap = await createImageBitmap(file);
  const escala = maxLado / Math.max(bitmap.width, bitmap.height);
  const w = Math.round(bitmap.width * escala);
  const h = Math.round(bitmap.height * escala);
  const margen = Math.round(Math.max(w, h) * 0.08);

  const canvas = document.createElement("canvas");
  canvas.width = w + margen * 2;
  canvas.height = h + margen * 2;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, margen, margen, w, h);
  if (bitmap.close) bitmap.close();

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
  return new File([blob], "qr.png", { type: "image/png" });
};

const decodificarImagenQR = async (file) => {
  if ("BarcodeDetector" in window) {
    try {
      const detector = new window.BarcodeDetector({ formats: ["qr_code"] });
      const bitmap = await createImageBitmap(file);
      const codigos = await detector.detect(bitmap);
      if (bitmap.close) bitmap.close();
      if (codigos.length > 0 && codigos[0].rawValue) return codigos[0].rawValue;
    } catch {
      /* continuar */
    }
  }

  const scanner = new Html5Qrcode("reader-hidden", {
    formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
    verbose: false,
  });

  try {
    try {
      return await scanner.scanFile(file, false);
    } catch {
      /* probar reescalado */
    }
    for (const lado of [1200, 600]) {
      try {
        const reescalada = await reescalarImagen(file, lado);
        return await scanner.scanFile(reescalada, false);
      } catch {
        /* siguiente */
      }
    }
    throw new Error("QR no detectado");
  } finally {
    try {
      scanner.clear();
    } catch {
      /* nada */
    }
  }
};

// =========================================================================
// COMPONENTE
// =========================================================================
export const VerificadorBoletinProfesor = () => {
  const [searchParams] = useSearchParams();
  const hashUrl = searchParams.get("hash");

  const [modoEscaneo, setModoEscaneo] = useState("upload");
  const [loading, setLoading] = useState(false);
  const [camaraActiva, setCamaraActiva] = useState(false);
  const [camaraKey, setCamaraKey] = useState(0); 
  const [resultado, setResultado] = useState(null);
  const [error, setError] = useState(null);
  const [fotoUrl, setFotoUrl] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [modoAnterior, setModoAnterior] = useState("upload");

  const scannerRef = useRef(null);
  const timeoutCamaraRef = useRef(null);
  const tokenCamaraRef = useRef(0);
  const procesandoRef = useRef(false);

  useEffect(() => {
    setFotoUrl(resultado ? fotoADataUrl(resultado.foto) : "");
  }, [resultado]);

  useEffect(() => {
    if (hashUrl) {
      procesarHash(hashUrl);
    }
  }, [hashUrl]);

  // Soporte optimizado para portapapeles (Ctrl + V)
  useEffect(() => {
    const handlePaste = async (e) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (const item of items) {
        if (item.type.indexOf("image") !== -1) {
          const blob = item.getAsFile();
          if (blob) {
            const file = new File([blob], "qr-clipboard.png", { type: blob.type });
            await procesarArchivoAutomatico(file);
            break;
          }
        }
      }
    };

    window.addEventListener("paste", handlePaste);
    return () => {
      window.removeEventListener("paste", handlePaste);
    };
  }, []);

  const limpiarTimeout = () => {
    if (timeoutCamaraRef.current) {
      clearTimeout(timeoutCamaraRef.current);
      timeoutCamaraRef.current = null;
    }
  };

  const detenerCamara = async () => {
    limpiarTimeout();
    const scanner = scannerRef.current;
    scannerRef.current = null;
    await liberarScanner(scanner);
    setCamaraActiva(false);
  };

  const onQrDetectado = (textoDecodificado) => {
    if (procesandoRef.current) return;
    procesandoRef.current = true;
    manejarTextoQR(textoDecodificado);
  };

  const arrancarCamara = async (token) => {
    procesandoRef.current = false;

    if (typeof window === "undefined" || !window.isSecureContext || !navigator.mediaDevices) {
      setError(mensajeErrorCamara(null));
      return;
    }

    const elemento = document.getElementById("reader-camera");
    if (!elemento) return;

    const intentarIniciar = async (cameraConfig, videoConstraints) => {
      if (token !== tokenCamaraRef.current) return "cancelado";

      const scanner = new Html5Qrcode("reader-camera", {
        formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
        experimentalFeatures: { useBarCodeDetectorIfSupported: true },
        verbose: false,
      });

      try {
        await scanner.start(
          cameraConfig,
          {
            fps: 10,
            disableFlip: true,
          },
          onQrDetectado,
          () => {}
        );

        if (token !== tokenCamaraRef.current) {
          await liberarScanner(scanner);
          return "cancelado";
        }

        scannerRef.current = scanner;
        setCamaraActiva(true);

        limpiarTimeout();
        timeoutCamaraRef.current = setTimeout(async () => {
          await detenerCamara();
          setError("Tiempo agotado: No se detectó ningún código QR válido o el código no es válido.");
        }, TIEMPO_ESPERA_CAMARA_MS);

        try {
          await scanner.applyVideoConstraints({ focusMode: "continuous" });
        } catch {
          /* no soportado */
        }
        return "ok";
      } catch (err) {
        await liberarScanner(scanner);
        throw err;
      }
    };

    const intentos = [
      [
        { facingMode: "environment" },
        { facingMode: "environment", width: { ideal: 1920 }, height: { ideal: 1080 } },
      ],
      [{ facingMode: "environment" }, null],
      [{ facingMode: "user" }, null],
    ];

    let ultimoError = null;

    for (const [config, video] of intentos) {
      try {
        const res = await intentarIniciar(config, video);
        if (res) return;
      } catch (err) {
        ultimoError = err;
        if (esErrorDePermiso(err)) break;
      }
    }

    if (!esErrorDePermiso(ultimoError)) {
      try {
        const camaras = await Html5Qrcode.getCameras();
        if (camaras && camaras.length > 0) {
          const trasera = camaras.find((c) => /back|rear|trasera|environment/i.test(c.label));
          const elegida = trasera || camaras[camaras.length - 1];
          const res = await intentarIniciar(elegida.id, null);
          if (res) return;
        }
      } catch (err) {
        ultimoError = err;
      }
    }

    if (token === tokenCamaraRef.current) {
      setCamaraActiva(false);
      setError(mensajeErrorCamara(ultimoError));
    }
  };

  useEffect(() => {
    if (modoEscaneo !== "cam") return undefined;
    const token = ++tokenCamaraRef.current;
    arrancarCamara(token);
    return () => {
      tokenCamaraRef.current++;
      detenerCamara();
    };
  }, [modoEscaneo, camaraKey]);

  const iniciarCamara = async () => {
    await detenerCamara();
    procesandoRef.current = false;
    setError(null);
    setResultado(null);
    setFotoUrl("");
    setModoEscaneo("cam");
    setModoAnterior("cam");
    setCamaraKey((k) => k + 1);
  };

  const cambiarAModoUpload = async () => {
    await detenerCamara();
    procesandoRef.current = false;
    setModoEscaneo("upload");
    setModoAnterior("upload");
  };

  const procesarHash = async (hashExtraido) => {
    await detenerCamara();

    setLoading(true);
    setError(null);
    setResultado(null);
    setFotoUrl("");

    try {
      const hashLimpio = String(hashExtraido).trim();
      const data = await verificarCertificado(hashLimpio);

      if (data && data.existe) {
        setResultado(data);
      } else {
        setError("El hash proporcionado no se encuentra registrado en el sistema institucional.");
      }
    } catch (err) {
      setError("No se pudo verificar el boletín. El documento podría ser falso o haber sido alterado.");
    } finally {
      setLoading(false);
      procesandoRef.current = false;
    }
  };

  const manejarTextoQR = async (texto) => {
    const hash = extraerHash(texto);
    if (hash) {
      await procesarHash(hash);
    } else {
      await detenerCamara();
      setLoading(false);
      setError("El Código QR escaneado no pertenece a la red de certificación institucional.");
    }
  };

  const procesarArchivoAutomatico = async (file) => {
    if (!file) return;

    if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
      setLoading(true);
      setError(null);

      const reader = new FileReader();
      reader.onload = () => {
        try {
          const textoPDF = new TextDecoder("latin1").decode(new Uint8Array(reader.result));
          const hash = extraerHash(textoPDF);

          if (hash) {
            procesarHash(hash);
          } else {
            setError("No se encontró una firma hash digital válida dentro del PDF seleccionado.");
            setLoading(false);
          }
        } catch (err) {
          setError("Ocurrió un error al procesar el archivo PDF.");
          setLoading(false);
        }
      };
      reader.onerror = () => {
        setError("Ocurrió un error al leer el archivo PDF.");
        setLoading(false);
      };
      reader.readAsArrayBuffer(file);
      return;
    }

    if (file.type.startsWith("image/") || /\.(jpe?g|png|webp|bmp)$/i.test(file.name)) {
      try {
        setLoading(true);
        setError(null);
        const texto = await decodificarImagenQR(file);
        await manejarTextoQR(texto);
      } catch (err) {
        setError("No se detectó ningún Código QR válido en la imagen cargada.");
        setLoading(false);
      }
      return;
    }

    setError("Formato de archivo no soportado. Sube una imagen con código QR o un archivo PDF.");
  };

  const handleFileUploadChange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file) await procesarArchivoAutomatico(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) await procesarArchivoAutomatico(file);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#EEF3FC] via-[#E9F0FB] to-[#E3ECFA] text-slate-800 p-3 xs:p-4 sm:p-6 md:p-10 font-sans flex flex-col items-center justify-center relative">
      <div id="reader-hidden" className="hidden" />

      {/* MODAL FLOTANTE DE ERROR / TIEMPO AGOTADO */}
      <AnimatePresence>
        {error && !loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white border border-red-100 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl text-center relative"
            >
              <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center text-red-600 mx-auto mb-4 shadow-xs">
                <XCircle size={36} />
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-slate-900">Verificación Fallida</h3>
              <p className="text-xs sm:text-sm text-slate-600 mt-2 leading-relaxed">{error}</p>

              <div className="mt-6 flex gap-3">
                <button
                  onClick={() => {
                    setError(null);
                    setResultado(null);
                    setFotoUrl("");
                    if (modoEscaneo === "cam") iniciarCamara();
                  }}
                  className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs sm:text-sm font-semibold transition-colors shadow-md"
                >
                  Intentar de Nuevo
                </button>
                <button
                  onClick={() => {
                    setError(null);
                    setModoEscaneo(modoAnterior);
                  }}
                  className="px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs sm:text-sm font-semibold transition-colors"
                >
                  Cerrar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-3xl w-full">
        {/* ENCABEZADO INSTITUCIONAL */}
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

        {/* PANEL PRINCIPAL */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 md:p-8 shadow-xl">
          {!resultado && !loading && (
            <div>
              <div className="grid grid-cols-2 gap-2 p-1.5 bg-slate-100 border border-slate-200 rounded-xl mb-6">
                <button
                  onClick={cambiarAModoUpload}
                  className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs font-semibold transition-all ${
                    modoEscaneo === "upload"
                      ? "bg-blue-600 text-white shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <Upload size={16} /> Cargar Archivo o QR
                </button>

                <button
                  onClick={iniciarCamara}
                  className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs font-semibold transition-all ${
                    modoEscaneo === "cam"
                      ? "bg-blue-600 text-white shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <Camera size={16} /> Cámara
                </button>
              </div>

              {/* MODO CARGAR ARCHIVO */}
              {modoEscaneo === "upload" && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-2 sm:py-4">
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={`border-2 border-dashed rounded-2xl p-8 sm:p-10 flex flex-col items-center justify-center transition-all ${
                      isDragging
                        ? "border-blue-600 bg-blue-100/60 scale-[1.01]"
                        : "border-blue-200 bg-blue-50/50"
                    }`}
                  >
                    <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 mb-3">
                      <QrCode size={28} />
                    </div>
                    <p className="text-sm font-bold text-slate-800 mb-1">
                      Arrastra y suelta tu archivo PDF o Imagen QR aquí
                    </p>
                    <p className="text-xs text-slate-500 mb-4">
                      También puedes presionar <strong className="text-blue-600">Ctrl + V</strong> para pegar una captura del QR
                    </p>

                    <label className="cursor-pointer inline-block px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors">
                      Seleccionar Archivo
                      <input
                        type="file"
                        accept="application/pdf,image/*"
                        onChange={handleFileUploadChange}
                        className="hidden"
                      />
                    </label>
                  </div>
                </motion.div>
              )}

              {/* MODO CÁMARA */}
              {modoEscaneo === "cam" && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center py-2">
                  <div className="w-full max-w-sm sm:max-w-md overflow-hidden rounded-2xl border-2 border-blue-400 bg-slate-900 relative shadow-md">
                    <style>{`
                      #reader-camera video { object-fit: cover !important; width: 100% !important; height: 100% !important; }
                    `}</style>

                    <div key={camaraKey} id="reader-camera" className="w-full h-80 sm:h-64" />

                    {camaraActiva && (
                      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                        <div className="relative w-3/5 aspect-square">
                          <span className="absolute top-0 left-0 w-7 h-7 border-t-4 border-l-4 border-blue-400 rounded-tl-lg" />
                          <span className="absolute top-0 right-0 w-7 h-7 border-t-4 border-r-4 border-blue-400 rounded-tr-lg" />
                          <span className="absolute bottom-0 left-0 w-7 h-7 border-b-4 border-l-4 border-blue-400 rounded-bl-lg" />
                          <span className="absolute bottom-0 right-0 w-7 h-7 border-b-4 border-r-4 border-blue-400 rounded-br-lg" />
                        </div>
                      </div>
                    )}

                    {!camaraActiva && (
                      <div className="absolute inset-0 bg-slate-100 flex flex-col items-center justify-center text-xs text-slate-500 p-4 text-center">
                        <Camera className="mb-2 text-slate-400" size={32} />
                        Iniciando cámara del dispositivo...
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-3 text-center">
                    Apunta la cámara hacia el Código QR del boletín.
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

          {/* FICHA DE RESULTADO (VERIFICADO) */}
          {resultado && !loading && (
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-5 sm:space-y-6">
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

              <div className="bg-slate-50 rounded-xl p-4 sm:p-6 border border-slate-200 space-y-5">
                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6 pb-5 border-b border-slate-200 text-center sm:text-left">
                  <div className="shrink-0">
                    {fotoUrl ? (
                      <img
                        src={fotoUrl}
                        alt={`Foto de ${resultado.estudiante}`}
                        className="w-28 h-28 sm:w-32 sm:h-32 rounded-full object-cover border-4 border-blue-400 shadow-md bg-white"
                        onError={() => setFotoUrl("")}
                      />
                    ) : (
                      <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-full border-4 border-blue-400 bg-blue-50 flex items-center justify-center text-blue-700 font-bold text-4xl shadow-md">
                        {(resultado.estudiante?.[0] || "U").toUpperCase()}
                      </div>
                    )}
                  </div>

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

                <div className="pt-1">
                  <span className="text-[11px] font-semibold text-slate-600 block mb-1">
                    Hash Criptográfico (Firma Digital del Documento):
                  </span>
                  <div className="bg-slate-100 p-3 rounded-xl font-mono text-[10px] sm:text-[11px] text-slate-700 border border-slate-200 break-all select-all">
                    {resultado.hash}
                  </div>
                </div>
              </div>

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
                  onClick={async () => {
                    setResultado(null);
                    setError(null);
                    setFotoUrl("");
                    procesandoRef.current = false;
                    if (modoAnterior === "cam") {
                      await iniciarCamara();
                    } else {
                      await detenerCamara();
                      setModoEscaneo("upload");
                    }
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