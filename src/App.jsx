import { useState } from "react";

import { BrowserRouter, HashRouter, Route, Router, Routes } from "react-router-dom";
import { SchoolLogin } from "./pages/login";
import { StudentSidebar } from "./pages/rol_student/sidebar_student";

import { Calificaciones } from "./pages/rol_student/grades";
import { Perfil } from "./pages/rol_student/profile";
import { TeacherSidebar } from "./pages/rol_teacher/sidebar_teacher";
import { GestionEstudiantesCuentas } from "./pages/rol_teacher/manager_students";
import { GestionCalificacionesEstudiantes } from "./pages/rol_teacher/upload_grades";
import { CalendarioEscolar } from "./pages/rol_teacher/calendar_school";
import { PerfilDocente } from "./pages/rol_teacher/profile";
import { ReportesTeacher } from "./pages/rol_teacher/reports";
import { SidebarDirector } from "./pages/rol_intendente/sidebar_intedente";
import { DashboardDirector } from "./pages/rol_intendente/info";
import { GestionDocentes } from "./pages/rol_intendente/manager_teachers";
import { Estadisticas } from "./pages/rol_intendente/statistic";
import { Boletines } from "./pages/rol_intendente/boletines";
import PrivateRoute from "./services/protected";
import { InicioStudent } from "./pages/rol_student/info";
import { InicioDocente } from "./pages/rol_teacher/info";
import { ReportesDire } from "./pages/rol_intendente/reports";
import { CalendarioEscolarDire } from "./pages/rol_intendente/calendar";
import { HorarioStudent } from "./pages/rol_student/horario";
import { CalendarioEscolarEstudiante } from "./pages/rol_student/calendario";
import { GestionAdministradores } from "./pages/rol_intendente/manager_admin.jsx";
import { GestionHorarios } from "./pages/rol_intendente/horarios.jsx";
import { GestionUsuariosAdmin } from "./pages/rol_intendente/manager_estudents.jsx";
import { GestionCalificacionesDirector } from "./pages/rol_intendente/manager_grades.jsx";
import { VerificadorBoletin } from "./pages/rol_intendente/verify_boletin.jsx";
import { VerificadorBoletinProfesor } from "./pages/rol_teacher/verify_boletin.jsx";
import { GestionParalelos } from "./pages/rol_intendente/maneger_paralelos.jsx";


function App() {
  const [count, setCount] = useState(0);

  return (
    <>
      <HashRouter>
        <Routes>
          <Route path="/" element={<SchoolLogin />} />
          <Route element={<PrivateRoute />}>
            <Route path="/home-student" element={<StudentSidebar />}>
              <Route index element={<InicioStudent />} />
              <Route path="info" element={<InicioStudent />} />
              
              <Route path="grades" element={<Calificaciones />} />
              <Route path="profile" element={<Perfil />} />
              <Route path="materias" element={<Perfil />} />
              <Route path="horario" element={<HorarioStudent />} />
              <Route path="calendar" element={<CalendarioEscolarEstudiante />} />
            </Route>
          </Route>

          <Route element={<PrivateRoute />}>
            <Route path="/home-teacher" element={<TeacherSidebar />}>
              <Route index element={<InicioDocente />} />
              <Route path="info" element={<InicioDocente />} />
              <Route path="register" element={<GestionEstudiantesCuentas />} />
              <Route path="upload-grades" element={<GestionCalificacionesEstudiantes />} />
              <Route path="calendar" element={<CalendarioEscolar />} />
              <Route path="profile" element={<PerfilDocente />} />
              <Route path="reports" element={<ReportesTeacher />} />
              <Route path="verify-boletin" element={<VerificadorBoletinProfesor />} />
            </Route>
          </Route>
          <Route element={<PrivateRoute />}>
            <Route path="/home-intendente" element={<SidebarDirector />}>
              <Route index element={<DashboardDirector />} />
              <Route path="info" element={<DashboardDirector />} />
              <Route path="teachers" element={<GestionDocentes />} />
              <Route path="reports" element={<ReportesDire />} />
              <Route path="statistics" element={<Estadisticas />} />
              <Route path="calendar" element={<CalendarioEscolarDire />} />
              <Route path="boletines" element={<Boletines />} />
              <Route path="students" element={<GestionUsuariosAdmin />} />
              <Route path="admin" element={<GestionAdministradores />} />
              <Route path="horarios" element={<GestionHorarios />} />
              <Route path="grades-intendente" element={<GestionCalificacionesDirector />} />
              <Route path="verify-voletin" element={<VerificadorBoletin />} />
              <Route path="paralelos" element={<GestionParalelos />} />
            </Route>
          </Route>
        </Routes>
      </HashRouter>
    </>
  );
}

export default App;
