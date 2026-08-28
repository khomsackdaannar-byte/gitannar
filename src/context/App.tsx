import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "./Authcontext";
import AppRoutes from "../Routes/Approutes";

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;