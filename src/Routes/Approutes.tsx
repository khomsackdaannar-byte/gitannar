import { Routes, Route } from "react-router-dom";
import Welcome from "../pages/Welcome/Welcome";
import Login from "../pages/Login/Login";
import Register from "../pages/Register/Register";
import TechnicianLogin from "../pages/TechnicianLogin/TechnicianLogin";
import TechnicianHome from "../pages/TechnicianHome/TechnicianHome";
import TechnicianChat from "../pages/TechnicianChat/TechnicianChat";
import Home from "../pages/Home/Home";
import Detail from "../pages/Detail/Detail";
import Chat from "../pages/Chat/Chat";
import NotFound from "../pages/NotFound/NotFound";
import Bookings from "../pages/Bookings/Bookings";
import History from "../pages/History/History";
import Profile from "../pages/Profile/Profile";
import TechnicianRegister from "../pages/TechnicianRegister/TechnicianRegister";
import CustomerDetail from "../pages/CustomerDetail/CustomerDetail";

// ທຽບເທົ່າ home: const WelcomeScreen(), ບວກ Navigator.push/pushReplacement ທັງໝົດ
// ຂອງ Flutter ຖືກແທນທີ່ດ້ວຍ <Route> ຂອງ react-router-dom
function AppRoutes() {
  return (
    <Routes>
      {/* ລູກຄ້າ */}
      <Route path="/" element={<Welcome />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/home" element={<Home />} />
      <Route path="/detail/:phone" element={<Detail/>} />
      <Route path="/chat/:phone" element={<Chat />} />
      <Route path="/bookings" element={<Bookings />} />
      <Route path="/history" element={<History />} />
      <Route path="/profile" element={<Profile />} />

      {/* ຊ່າງ */}
      <Route path="/technician-login" element={<TechnicianLogin />} />
      <Route path="/technician-home/:phone" element={<TechnicianHome />} />
      <Route path="/technician-chat/:phone/:chatRoomId" element={<TechnicianChat />} />
      <Route path="/register-technician" element={<TechnicianRegister />} />
      <Route path="/technician-customer/:techPhone/:customerUid" element={<CustomerDetail />} />

      <Route path="*" element={<NotFound />} />
    </Routes>
  ); 
}

export default AppRoutes;