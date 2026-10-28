import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Home,
  Users,
  BarChart2,
  Calendar,
  PieChart,
  FileText,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Shield,
  Menu,
  X,
  GraduationCap,
} from "lucide-react";
import { Link, Outlet, useNavigate, useLocation } from "react-router-dom";
import { logout } from "../../services/authServices";

export const SidebarDirector = () => {
  const [isOpen, setIsOpen] = useState(true);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  const toggleSidebar = () => setIsOpen(!isOpen);
  const toggleMobileSidebar = () => setIsMobileOpen(!isMobileOpen);

  const menuItems = [
    {
      name: "Inicio",
      icon: <Home size={18} />,
      link: "/home-intendente/info",
    },
    {
      name: "Gestión Directores",
      icon: <Shield size={18} />,
      link: "/home-intendente/admin",
    },
    {
      name: "Gestión Docentes",
      icon: <Users size={18} />,
      link: "/home-intendente/teachers",
    },
    {
      name: "Gestión Estudiantes",
      icon: <Users size={18} />,
      link: "/home-intendente/students",
    },
    {
      name: "Gestión de Calificaciones",
      icon: <GraduationCap size={18} />,
      link: "/home-intendente/grades-intendente",
    },
    {
      name: "Gestión de Paralelos",
      icon: <GraduationCap size={18} />,
      link: "/home-intendente/paralelos",
    },
    {
      name: "Gestión del Horario",
      icon: <Calendar size={18} />,
      link: "/home-intendente/horarios",
    },
    {
      name: "Reportes",
      icon: <BarChart2 size={18} />,
      link: "/home-intendente/reports",
    },
    {
      name: "Estadísticas",
      icon: <PieChart size={18} />,
      link: "/home-intendente/statistics",
    },
    {
      name: "Calendario Escolar",
      icon: <Calendar size={18} />,
      link: "/home-intendente/calendar",
    },
    {
      name: "Emitir Boletines",
      icon: <FileText size={18} />,
      link: "/home-intendente/boletines",
    },
    {
      name: "Verificar Boletines",
      icon: <FileText size={18} />,
      link: "/home-intendente/verify-voletin",
    },
  ];

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-[#EEF3FC] via-[#E9F0FB] to-[#E3ECFA] font-sans">
      {/* BOTÓN HAMBURGUESA MÓVIL */}
      <div className="md:hidden fixed top-3 left-3 z-50">
        <button
          onClick={toggleMobileSidebar}
          className="p-2.5 bg-slate-900 text-white rounded-lg shadow-lg border border-slate-700 flex items-center justify-center"
        >
          {isMobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* OVERLAY PARA MÓVIL */}
      <AnimatePresence>
        {isMobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={toggleMobileSidebar}
            className="md:hidden fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-40"
          />
        )}
      </AnimatePresence>

      {/* SIDEBAR DESKTOP / MÓVIL */}
      <motion.aside
        animate={{
          width: isOpen ? 260 : 80,
        }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        className={`fixed md:sticky top-0 left-0 h-screen z-40 bg-gradient-to-b from-slate-950 via-blue-950 to-slate-900 border-r border-slate-800 p-4 shadow-2xl flex flex-col justify-between shrink-0 ${
          isMobileOpen ? "translate-x-0 w-64" : "-translate-x-full md:translate-x-0"
        } transition-transform duration-300 md:transition-none`}
      >
        {/* TOGGLE DESKTOP */}
        <button
          onClick={toggleSidebar}
          className="hidden md:flex absolute -right-3 top-7 w-7 h-7 bg-blue-600 hover:bg-blue-500 text-white rounded-full items-center justify-center shadow-lg cursor-pointer border border-blue-400 transition-all z-50"
        >
          {isOpen ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
        </button>

        {/* LOGO E IDENTIDAD INSTITUCIONAL */}
        <div>
          <div className="flex flex-col items-center justify-center pt-2 pb-6 border-b border-slate-800/80 mb-6">
            <motion.div
              animate={{
                width: isOpen ? 64 : 40,
                height: isOpen ? 64 : 40,
              }}
              transition={{ duration: 0.3 }}
              className="relative rounded-full border-2 border-blue-400/60 shadow-lg shadow-blue-500/20 overflow-hidden shrink-0 bg-slate-900 flex items-center justify-center mb-2"
            >
              <img
                src="/logo.png"
                alt="Logo Colegio"
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = "https://via.placeholder.com/64?text=UE";
                }}
              />
            </motion.div>

            <AnimatePresence>
              {isOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  className="text-center min-w-0"
                >
                  <h2 className="text-sm font-bold text-white tracking-wide truncate">
                    Panel de Dirección
                  </h2>
                  <p className="text-[10px] text-blue-300 font-semibold uppercase tracking-widest mt-0.5">
                    Gestión Académica
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* MENÚ NAVEGACIÓN */}
          <nav className="space-y-1.5 overflow-y-auto max-h-[calc(100vh-250px)] pr-1">
            {menuItems.map((item, index) => {
              const isActive = location.pathname === item.link;

              return (
                <Link
                  key={index}
                  to={item.link}
                  onClick={() => setIsMobileOpen(false)}
                  className={`flex items-center gap-3.5 px-3 py-2.5 rounded-lg text-xs font-semibold transition-all duration-200 group ${
                    isActive
                      ? "bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-md shadow-blue-900/40"
                      : "text-slate-300 hover:bg-slate-800/80 hover:text-white"
                  }`}
                >
                  <span
                    className={`shrink-0 transition-colors ${
                      isActive ? "text-white" : "text-blue-400 group-hover:text-blue-300"
                    }`}
                  >
                    {item.icon}
                  </span>
                  {isOpen && (
                    <span className="truncate tracking-wide">{item.name}</span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* PIE DE SIDEBAR / CERRAR SESIÓN */}
        <div className="pt-4 border-t border-slate-800/80">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3.5 px-3 py-2.5 rounded-lg text-xs font-semibold text-rose-300 hover:bg-rose-950/60 hover:text-rose-100 transition-colors duration-200"
          >
            <LogOut size={18} className="shrink-0 text-rose-400" />
            {isOpen && <span className="truncate tracking-wide">Cerrar Sesión</span>}
          </button>

          {isOpen && (
            <p className="text-[10px] text-slate-500 text-center mt-4 font-medium">
              © {new Date().getFullYear()} Sistema Institucional
            </p>
          )}
        </div>
      </motion.aside>

      {/* ÁREA DE CONTENIDO DINÁMICO */}
      <main className="flex-1 min-w-0 overflow-x-hidden">
        <Outlet />
      </main>
    </div>
  );
};