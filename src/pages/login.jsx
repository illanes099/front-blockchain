import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { User, Lock, Eye, EyeOff, ShieldCheck, ArrowRight, AlertCircle, GraduationCap } from "lucide-react";
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

  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
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
        {/* SECCIÓN IZQUIERDA: LOGO Y BIENVENIDA                        */}
        {/* ========================================================= */}
        <div className="md:col-span-5 p-8 sm:p-12 flex flex-col items-center text-center justify-center relative overflow-hidden bg-gradient-to-b from-blue-900/40 to-slate-900/60 border-b md:border-b-0 md:border-r border-white/10">
          
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
        {/* SECCIÓN DERECHA: FORMULARIO "MEDIO ESCURO"                */}
        {/* ========================================================= */}
        <div className="md:col-span-7 bg-slate-950/60 p-8 sm:p-12 flex flex-col justify-center relative">
          
          <div className="mb-8">
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-wide">
              Iniciar Sesión
            </h2>
            <p className="text-slate-400 text-sm mt-1">
              Introduce tus credenciales institucionales
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            {/* INPUT USUARIO */}
            <div>
              <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-widest mb-2">
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
              <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-widest mb-2">
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

            {/* ALERTAS DE ERROR */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="flex items-start gap-2 bg-red-950/50 border border-red-500/30 text-red-200 p-3 rounded-xl text-xs font-medium backdrop-blur-sm mt-2">
                    <AlertCircle size={16} className="shrink-0 mt-0.5 text-red-400" />
                    <span>{error}</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* BOTÓN DE ACCESO */}
            <div className="pt-4">
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
                    <span>Acceder al Portal</span>
                    <ArrowRight size={18} />
                  </>
                )}
              </motion.button>
            </div>
          </form>

          {/* ÁREA DE AYUDA / RECUPERACIÓN */}
          <div className="mt-8 text-center">
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
                  className="mt-4"
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