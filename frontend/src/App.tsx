import { useState, useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useLocation,
  useNavigate,
} from "react-router-dom";

import LoginPage from "./pages/Login";
import EmailChecker from "./pages/EmailChecker";
import DashboardPage from "./pages/Dashboard";
import UserDetail from "./pages/compontents/UserDetail"
import api from "./pages/Api";
import axios from "axios";

type Email = {
  id: number;
  email: string;
  name?: string;
  status?: string;
};



function App() {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [emailList, setEmailList] = useState<Email[]>([]);
  const [is_admin, setIsAdmin] = useState<boolean>(false);
  const [totalInfo, setTotalInfo] = useState<{ sum_inbox: number; sum_spam: number; total_percent: number }>({ sum_inbox: 0, sum_spam: 0, total_percent: 0 });
  const navigate = useNavigate();
  const fetchEmailList = async () => {
    try {
      const res = await api.get("/api/emails");
      if (res.data.status === "OK") {
        setEmailList(res.data.results);
        let inboxSum = res.data.total_info[0];
        let spamSum = res.data.total_info[1];
        let total = res.data.total_info[2];
        if (inboxSum === null)
          inboxSum = 0;
        if (spamSum === null)
          spamSum = 0;
        if (total === null)
          total = 0;
        setTotalInfo({
          sum_inbox: inboxSum,
          sum_spam: spamSum,
          total_percent: total
        });
        setIsAdmin(res.data.is_admin);

      } else {
        alert("No emails found.");
      }
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        console.error("Axios error:", err.response?.data || err.message);
        alert("A server error occurred. Please try again.");
      } else {
        console.error("Unexpected error:", err);
        alert("An unknown error occurred.");
      }
    }
  };

  useEffect(() => {
    const token = localStorage.getItem("token");
    setIsLoggedIn(!!token);
  }, []);

  if (!isLoggedIn) {
    return <LoginPage onLoginSuccess={() => setIsLoggedIn(true)} />;
  }

  return (
    <Routes>
      <Route
        path="/"
        element={
          <EmailChecker
            onLogout={() => {
              localStorage.removeItem("token");
              setIsLoggedIn(false);
            }}

            isAdmin={is_admin}
            onDashboardLayout={async () => {
              await fetchEmailList();  // refresh data
              navigate("/admin");      // then navigate
            }}
            fetchMailList={fetchEmailList}
            emailList={emailList}
          />
        }
      />
      <Route
        path="/admin"
        element={
          <DashboardPage
            emailList={emailList}
            totalInfo={totalInfo}
            onDashboardLayout={() => { }}
          />
        }
      />
      <Route path="/user/detail/:id" element={<UserDetail />} />
      {/* Redirect all unknown paths */}
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}

export default App;
