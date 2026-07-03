import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { useAuth } from "./context/useAuth";
import Navbar from "./components/Navbar";
import { SkeletonPronosticos, SkeletonTabla } from "./components/Skeleton";

// Lazy load páginas para code splitting
const Auth = lazy(() => import("./pages/Auth"));
const Inicio = lazy(() => import("./pages/Inicio"));
const Pronosticos = lazy(() => import("./pages/Pronosticos"));
const Grupo = lazy(() => import("./pages/Grupo"));
const Tabla = lazy(() => import("./pages/Tabla"));
const Perfil = lazy(() => import("./pages/Perfil"));
const Ayuda = lazy(() => import("./pages/Ayuda"));
const Resultados = lazy(() => import("./pages/Resultados"));

function ProtectedLayout({ children }) {
  const user = useAuth();
  if (user === undefined) return <SkeletonPronosticos />;
  if (user === null) return <Navigate to="/" replace />;
  return (
    <>
      <Navbar />
      <main>{children}</main>
    </>
  );
}

function PublicRoute({ children }) {
  const user = useAuth();
  if (user === undefined) return null;
  if (user !== null) return <Navigate to="/inicio" replace />;
  return children;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<PublicRoute><Suspense fallback={<SkeletonPronosticos />}><Auth /></Suspense></PublicRoute>} />
      <Route path="/inicio" element={<ProtectedLayout><Suspense fallback={<SkeletonPronosticos />}><Inicio /></Suspense></ProtectedLayout>} />
      <Route path="/pronosticos" element={<ProtectedLayout><Suspense fallback={<SkeletonPronosticos />}><Pronosticos /></Suspense></ProtectedLayout>} />
      <Route path="/grupo" element={<ProtectedLayout><Suspense fallback={<SkeletonPronosticos />}><Grupo /></Suspense></ProtectedLayout>} />
      <Route path="/tabla" element={<ProtectedLayout><Suspense fallback={<SkeletonTabla />}><Tabla /></Suspense></ProtectedLayout>} />
      <Route path="/perfil" element={<ProtectedLayout><Suspense fallback={<SkeletonPronosticos />}><Perfil /></Suspense></ProtectedLayout>} />
      <Route path="/ayuda" element={<ProtectedLayout><Suspense fallback={<SkeletonPronosticos />}><Ayuda /></Suspense></ProtectedLayout>} />
      <Route path="/resultados" element={<ProtectedLayout><Suspense fallback={<SkeletonPronosticos />}><Resultados /></Suspense></ProtectedLayout>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}
