import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "./context/Authcontext";
import { LanguageProvider } from "./context/LanguageContext";
import AppRoutes from "./Routes/Approutes";
import "./App.css";

function App() {
  // BASE_URL = "/" ຕອນ localhost, Firebase, Vercel
  // BASE_URL = "/gitannar/" ຕອນ build ສຳລັບ GitHub Pages (ຕັ້ງໃນ vite.config.ts)
  // ຕັດ "/" ທ້າຍອອກ ເພາະ basename ບໍ່ຕ້ອງການ
  const basename = import.meta.env.BASE_URL.replace(/\/$/, "") || "/";

  return (
    <BrowserRouter basename={basename}>
      <LanguageProvider>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </LanguageProvider>
    </BrowserRouter>
  );
}

export default App;