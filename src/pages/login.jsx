import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { User, Lock, Eye, EyeOff, ShieldCheck, ArrowRight, AlertCircle, CheckCircle2, RefreshCw, X } from "lucide-react";
import { login } from "../services/authServices";
import { useNavigate } from "react-router-dom";

// ==========================================
// EFECTO DE COLORES ONDULANTES Y PARTÍCULAS
// ==========================================
const AnimatedBackground = () => {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
      {/* Aurora Azul */}
      <motion.div
        animate={{
          x: [0, 100, -50, 0],
          y: [0, -80, 50, 0],
          scale: [1, 1.2, 0.9, 1],
        }}
        transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
        className="absolute -top-[20%] -left-[10%] w-[60vw] h-[60vh] bg-blue-600/30 rounded-full blur-[120px]"
      />
      {/* Aurora Celeste/Cian */}
      <motion.div
        animate={{
          x: [0, -120, 80, 0],
          y: [0, 100, -60, 0],
          scale: [1, 0.8, 1.3, 1],
        }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-[40%] -right-[10%] w-[50vw] h-[50vh] bg-sky-500/20 rounded-full blur-[100px]"
      />
      
      {/* Partículas sutiles tipo polvo estelar */}
      {Array.from({ length: 20 }).map((_, i) => (
        <motion.span
          key={i}
          className="absolute w-1.5 h-1.5 bg-white/40 rounded-full shadow-[0_0_8px_rgba(255,255,255,0.8)]"
          initial={{
            x: Math.random() * (typeof window !== "undefined" ? window.innerWidth : 1000),
            y: Math.random() * (typeof window !== "undefined" ? window.innerHeight : 1000),
            opacity: 0,
            scale: 0.5,
          }}
          animate={{
            y: [Math.random() * 800, -50],
            opacity: [0, 0.8, 0],
            scale: [0.5, 1.5, 0.5],
          }}
          transition={{
            duration: 10 + Math.random() * 10,
            repeat: Infinity,
            delay: Math.random() * 5,
            ease: "linear",
          }}
        />
      ))}
    </div>
  );
};

export const SchoolLogin = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showHelp, setShowHelp] = useState(false);

  // Estados para el CAPTCHA de selección de imágenes (Simulado)
  const [isCaptchaOpen, setIsCaptchaOpen] = useState(false);
  const [captchaVerified, setCaptchaVerified] = useState(false);
  const [selectedTiles, setSelectedTiles] = useState([]);
  
  // Celdas correctas simuladas (ej. celdas 1, 5 y 6 donde está el semáforo)
  const correctTiles = [1, 5, 6]; 

  const navigate = useNavigate();

  const handleTileClick = (index) => {
    if (selectedTiles.includes(index)) {
      setSelectedTiles(selectedTiles.filter((t) => t !== index));
    } else {
      setSelectedTiles([...selectedTiles, index]);
    }
  };

  const handleVerifyCaptcha = () => {
    // Verificamos si seleccionó al menos los correctos o simulamos éxito
    const isCorrect = 
      selectedTiles.length > 0 && 
      correctTiles.every(t => selectedTiles.includes(t)) &&
      selectedTiles.length <= correctTiles.length + 1;

    if (isCorrect || selectedTiles.length >= 2) {
      setCaptchaVerified(true);
      setIsCaptchaOpen(false);
      setError("");
    } else {
      setError("Por favor, selecciona todas las imágenes correspondientes.");
      setSelectedTiles([]);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

    if (!captchaVerified) {
      setError("Debes completar la verificación de seguridad (Captcha) para continuar.");
      return;
    }

    setLoading(true);

    try {
      const user = await login({ username, password });
      switch ((user?.rol || "").toLowerCase()) {
        case "docente":
          navigate("/home-teacher", { replace: true });
          break;
        case "estudiante":
          navigate("/home-student", { replace: true });
          break;
        case "director":
        case "admin":
          navigate("/home-intendente", { replace: true });
          break;
        default:
          navigate("/teacher", { replace: true });
      }
    } catch (err) {
      setError(
        err?.response?.data?.detail ||
          err?.response?.data?.message ||
          "Credenciales inválidas. Verifica tu usuario y contraseña."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 sm:p-6 font-sans text-slate-100 overflow-hidden bg-slate-900">
      
      {/* 1. IMAGEN DE FONDO DEL COLEGIO */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat z-0 opacity-60"
        style={{ backgroundImage: "url('/colegio.jpg')" }}
      />
      
      {/* 2. CAPA DE OSCURECIMIENTO GENERAL */}
      <div className="absolute inset-0 bg-slate-950/60 z-0" />

      {/* 3. AURORAS Y PARTÍCULAS */}
      <AnimatedBackground />

      {/* CONTENEDOR CRISTALINO (GLASSMORPHISM) */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: "easeOut" }}
        className="w-full max-w-5xl rounded-3xl overflow-hidden grid grid-cols-1 md:grid-cols-12 relative z-10 border border-white/10 shadow-[0_8px_32px_0_rgba(0,0,0,0.6)] backdrop-blur-xl bg-slate-900/30"
      >
        {/* ========================================================= */}
        {/* SECCIÓN IZQUIERDA: LOGO Y BIENVENIDA (OCULTA EN MÓVILES)   */}
        {/* ========================================================= */}
        <div className="hidden md:flex md:col-span-5 p-8 sm:p-12 flex-col items-center text-center justify-center relative overflow-hidden bg-gradient-to-b from-blue-900/40 to-slate-900/60 border-b md:border-b-0 md:border-r border-white/10">
          
          {/* Logo del colegio en grande */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="w-32 h-32 sm:w-40 sm:h-40 rounded-full bg-white/5 border border-white/20 p-2 shadow-[0_0_30px_rgba(59,130,246,0.3)] mb-6 flex items-center justify-center backdrop-blur-md"
          >
            <img
              src="/logo.png"
              alt="Logo Institucional"
              className="w-full h-full object-cover rounded-full drop-shadow-xl"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = "https://via.placeholder.com/150?text=UE";
              }}
            />
          </motion.div>

          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight leading-tight text-white mb-3 drop-shadow-md">
            Unidad Educativa Roberto Alvarado Daza 'B'
          </h1>
          <p className="text-blue-200/90 text-sm leading-relaxed mb-8 max-w-xs drop-shadow-sm font-medium">
            Sistema Integrado de Gestión Académica. Ingresa para acceder a tus calificaciones, reportes y herramientas.
          </p>

          <div className="flex items-center gap-2 text-[11px] text-white/70 font-semibold uppercase tracking-wider bg-black/20 px-4 py-2 rounded-full border border-white/5">
            <ShieldCheck size={16} className="text-blue-400 shrink-0" />
            <span>Acceso Seguro Restringido</span>
          </div>
        </div>

        {/* ========================================================= */}
        {/* SECCIÓN DERECHA: FORMULARIO                                */}
        {/* ========================================================= */}
        <div className="col-span-1 md:col-span-7 bg-slate-950/60 p-8 sm:p-12 flex flex-col justify-center relative">
          
          <div className="mb-6">
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-wide">
              Iniciar Sesión
            </h2>
            <p className="text-slate-400 text-sm mt-1">
              Introduce tus credenciales institucionales
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            {/* INPUT USUARIO */}
            <div>
              <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-widest mb-1.5">
                Usuario
              </label>
              <div className="relative group">
                <User
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-400 transition-colors"
                  size={18}
                />
                <input
                  type="text"
                  placeholder="Ej. carlosquispe"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 rounded-xl bg-black/40 border border-white/10 text-white text-sm placeholder-slate-500 focus:bg-black/60 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all shadow-inner"
                  required
                />
              </div>
            </div>

            {/* INPUT CONTRASEÑA */}
            <div>
              <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-widest mb-1.5">
                Contraseña
              </label>
              <div className="relative group">
                <Lock
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-400 transition-colors"
                  size={18}
                />
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-11 pr-11 py-3 rounded-xl bg-black/40 border border-white/10 text-white text-sm placeholder-slate-500 focus:bg-black/60 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all shadow-inner"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* WIDGET TIPO RECAPTCHA (CAJA DE VERIFICACIÓN) */}
            <div className="pt-2">
              <div className="bg-slate-900/90 border border-white/15 rounded-xl p-3.5 flex items-center justify-between shadow-lg backdrop-blur-md">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => !captchaVerified && setIsCaptchaOpen(true)}
                    className={`w-7 h-7 rounded border-2 flex items-center justify-center transition-all ${
                      captchaVerified
                        ? "bg-emerald-500 border-emerald-400 text-white cursor-default"
                        : "bg-black/40 border-slate-400 hover:border-blue-400 cursor-pointer"
                    }`}
                  >
                    {captchaVerified && <CheckCircle2 size={18} />}
                  </button>
                  <div className="text-left select-none">
                    <span className="text-xs font-semibold text-slate-200 block">
                      {captchaVerified ? "Verificación completada" : "No soy un robot"}
                    </span>
                    <span className="text-[10px] text-slate-400 block">reCAPTCHA</span>
                  </div>
                </div>
                <div className="flex flex-col items-center">
                  <div className="w-8 h-8 bg-blue-600/20 rounded-full flex items-center justify-center border border-blue-500/40">
                    <ShieldCheck size={18} className="text-blue-400" />
                  </div>
                  <span className="text-[9px] text-slate-500 mt-0.5 tracking-tighter">Privacy - Terms</span>
                </div>
              </div>
            </div>

            {/* MODAL / POPUP DE LA CUADRÍCULA CAPTCHA */}
            <AnimatePresence>
              {isCaptchaOpen && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
                >
                  <motion.div
                    initial={{ scale: 0.9, y: 20 }}
                    animate={{ scale: 1, y: 0 }}
                    exit={{ scale: 0.9, y: 20 }}
                    className="bg-slate-900 border border-white/20 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl"
                  >
                    {/* Cabecera Azul del Captcha */}
                    <div className="bg-blue-600 p-4 text-white relative">
                      <button
                        type="button"
                        onClick={() => setIsCaptchaOpen(false)}
                        className="absolute right-3 top-3 text-white/80 hover:text-white"
                      >
                        <X size={20} />
                      </button>
                      <p className="text-xs text-blue-100 font-medium">Selecciona todos los cuadrados con</p>
                      <h3 className="text-lg font-bold tracking-wide">semáforos</h3>
                      <p className="text-[11px] text-blue-100/80 mt-0.5">Si no hay ninguno, haz clic en saltar</p>
                    </div>

                    {/* Cuadrícula de 3x3 imágenes */}
                    <div className="p-3 bg-slate-950">
                      <div className="grid grid-cols-3 gap-1.5">
                        {[
                          { id: 0, isTrafficLight: false, url: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSME5in7khrelXvpKUEkIfP31ueeUxDD7Ubnbe9NdcfHQ&s=10" },
                          { id: 1, isTrafficLight: true,  url: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRBgCHklDWozfbBXbzdFIM6tswVFGxMWvVzwUnuA8y80g&s=10"},
                          { id: 2, isTrafficLight: false, url: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQP67FX7kOayj1JZTaZ4ddqXn2UAi4iOXw0GqJtTPSe8A&s=10" },
                          { id: 3, isTrafficLight: false, url: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcR9sED2ocUWxk9DRl-C9SaDFSajaS5e_AP04lp5ArWJWg&s=10" },
                          { id: 4, isTrafficLight: true,  url: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRv966qYkOkMQQyQpFA9o81xKQdx4OVLRbd9wz9y0rWaQ&s=10" },
                          { id: 5, isTrafficLight: false, url: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQGz2qay0X4tL7woYGtNFKsoccr_UX_aFTclOE2QjOShw&s=10" },
                          { id: 6, isTrafficLight: false, url: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTTe9bITwXH8tyX4k2i5DucrgXZ8ZUBJrj22FNLYAIUag&s=10" },
                          { id: 7, isTrafficLight: true,  url: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSs8mqshwW6xrEOZF2BH8WTv7jcUsu9Ci-_XycnqxBITw&s=10" },
                          { id: 8, isTrafficLight: false, url: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRtK7gT1vJwiTZ8VDRYWuj-RQTL-CyUwn4UnAkaJA4_Nw&s=10" },
                        ].map((tile, index) => {
                          const isSelected = selectedTiles.includes(index);
                          return (
                            <div
                              key={tile.id}
                              onClick={() => handleTileClick(index)}
                              className={`relative h-24 rounded-lg overflow-hidden cursor-pointer border-2 transition-all ${
                                isSelected ? "border-blue-500 scale-[0.97]" : "border-transparent opacity-80 hover:opacity-100"
                              }`}
                              style={{
                                backgroundImage: `url('${tile.url}')`,
                                backgroundSize: "cover",
                                backgroundPosition: "center",
                              }}
                            >
                              {/* Check de selección */}
                              {isSelected && (
                                <div className="absolute inset-0 bg-blue-500/30 flex items-center justify-center backdrop-blur-[1px]">
                                  <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-white shadow-md">
                                    ✓
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Pie del Captcha (Botones inferiores) */}
                    <div className="p-3 bg-slate-900 border-t border-white/10 flex items-center justify-between">
                      <div className="flex items-center gap-1 text-slate-400">
                        <button
                          type="button"
                          onClick={() => setSelectedTiles([])}
                          title="Recargar / Cambiar imagen"
                          className="p-2 hover:text-white transition-colors"
                        >
                          <RefreshCw size={18} />
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={handleVerifyCaptcha}
                        className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs uppercase tracking-wider rounded-lg shadow-md transition-all"
                      >
                        Verificar
                      </button>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ALERTAS DE ERROR */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="flex items-start gap-2 bg-red-950/50 border border-red-500/30 text-red-200 p-3 rounded-xl text-xs font-medium backdrop-blur-sm mt-1">
                    <AlertCircle size={16} className="shrink-0 mt-0.5 text-red-400" />
                    <span>{error}</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* BOTÓN DE ACCESO */}
            <div className="pt-2">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={loading}
                className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-bold rounded-xl shadow-[0_0_15px_rgba(37,99,235,0.4)] transition-all duration-300 text-sm tracking-widest uppercase flex items-center justify-center gap-2 border border-blue-400/50 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Autenticando...</span>
                  </>
                ) : (
                  <>
                    <span>Ingresar</span>
                    <ArrowRight size={18} />
                  </>
                )}
              </motion.button>
            </div>
          </form>

          {/* ÁREA DE AYUDA / RECUPERACIÓN */}
          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => setShowHelp(!showHelp)}
              className="text-xs text-slate-400 hover:text-white font-medium transition-colors border-b border-transparent hover:border-white pb-0.5"
            >
              ¿Olvidaste tu contraseña o tienes problemas de acceso?
            </button>

            <AnimatePresence>
              {showHelp && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="mt-3"
                >
                  <p className="text-[11px] text-slate-300 bg-white/5 p-3 rounded-xl border border-white/10 leading-relaxed backdrop-blur-sm">
                    La recuperación de credenciales se realiza de forma presencial. Dirígete a la <strong>Secretaría o Dirección Académica</strong> de la institución con tu cédula de identidad para el restablecimiento de tu contraseña.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

        </div>
      </motion.div>
    </div>
  );
};