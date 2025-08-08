import React, { useState, useEffect, useRef } from "react";

import { Search, LogOut } from "lucide-react";
import axios from "axios";
import Badge from './compontents/Badge'
import Spinner from './compontents/Spinner'
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Pagination } from "swiper/modules";
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";
import api from "./Api";


const statusColors: Record<string, string> = {
  inbox: "bg-green-100 text-green-800",
  spam: "bg-red-100 text-red-800",
};

type EmailResultItem = {
  type?: string;
  diff_time: string;
  date?: Date;
  text: string;
  sender_name: string;
  sender_email: string;
  subject: string;
};

type EmailSection = {
  email: string;
  results: EmailResultItem[];
  inbox?: number;
  spam?: number;
  type?: string;
};

type Email = {
  id: number,
  email: string;
  name?: string;
  status?: string;
}

type EmailLoading = {
  email: string;
  loaded: boolean;
}

interface DashboardsProps {
  onLogout: () => void;
}

const DashboardPage = ({ onLogout }: DashboardsProps) => {

  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [inbox, setInbox] = useState<number>(0);
  const [spam, setSpam] = useState<number>(0);

  const [percent_inbox, setPercentInbox] = useState<number>(0);
  const [percent_spam, setPercentSpam] = useState<number>(0);
  const [emailSections, setResults] = useState<EmailSection[]>([]);
  const [emailList, setEmailList] = useState<Email[]>([]);
  const [emailLoading, setEmailLoading] = useState<EmailLoading[]>([]);
  const hasFetched = useRef(false);

  interface HandleKeyDownEvent extends React.KeyboardEvent<HTMLInputElement> {}

  const handleKeyDown = (e: HandleKeyDownEvent) => {
    if (e.key === 'Enter') {
      onSearchClick(e as unknown as React.MouseEvent<HTMLButtonElement>);
    }
  };

  const onSearchClick = async (e: React.MouseEvent<HTMLButtonElement>) => {
    
    if (!search.trim()) {            // <-- prevent empty or spaces
      alert("Input is required");
      return;
    }

    try {
      setLoading(true);
      setEmailLoading([]);
      setResults([]);
      setInbox(0);
      setSpam(0);

      for (const item of emailList) {
        let email = item.email;
        api.post("/api/check", { search, email })
          .then((res) => {
            if (res.data.status === 'OK') {

              setResults(prev => [...prev, res.data.results]);
              setEmailLoading(prev => [...prev, { email: email, loaded: true }]);
              setInbox(prev => prev + Number(res.data.results.inbox));
              setSpam(prev => prev + Number(res.data.results.spam));

            } else {
              alert("Invalid credentials or search result not found.");
            }
          })
          .catch((error) => {
            console.error("API Error:", error);
            alert("Request failed. Check console for details.");
          });
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

  const fetchEmailList = async () => {
    try {
      // setLoading
      const res = await api.get("/api/emails");

      if (res.data.status == 'OK') {
        setEmailList(res.data.results);
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
    } finally {
      // setLoading(false);
    }
  };

  const onSignout = () => {
    api.post("/api/logout")
      .then((res) => {
        if (res.data.status === "OK") {
          localStorage.removeItem("token");
          onLogout();
        } else {
          alert("Logout failed.");
        }
      })
      .catch((err) => {
        console.error("Logout error:", err);
        alert("A server error occurred. Please try again.");
      });
  };

  useEffect(() => {
    if (hasFetched.current) return; // Prevent re-run
    hasFetched.current = true;
    fetchEmailList();
  }, []);

  useEffect(() => {
    let all_box = inbox + spam;
    let p_inbox = all_box > 0 ? Number(((inbox / all_box) * 100).toFixed(2)) : 0;
    let p_spam = all_box > 0 ? Number(((spam / all_box) * 100).toFixed(2)) : 0;
    setPercentInbox(p_inbox);
    setPercentSpam(p_spam);
  }, [inbox,spam]);

  useEffect(() => {
    if(emailLoading.length === emailList.length) {
      // All emails have been processed
      setLoading(false);
    }
  }, [emailLoading, emailList.length]);

  return (
    <div className="">
      {/* Header */}
      <div className="flex justify-end w-full bg-[#174866] p-4">


        <div className="w-full max-w-md bg-white rounded shadow overflow-hidden flex">
          <input
            type="text"
            placeholder="Enter name or email and press enter"
            value={search}
            readOnly={loading}
            required
            onKeyDown={(e) => handleKeyDown(e)}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 px-4 py-2 text-sm text-gray-700 focus:outline-none"
          />
          <button
            disabled={loading}
            onClick={onSearchClick}
            className="bg-green-500 hover:bg-green-600 px-4 flex items-center justify-center"
          >
            <Search className="text-white w-4 h-4" />
          </button>
        </div>
        <div className="flex mx-4">
          <button
            onClick={onSignout}
            className="bg-red-100 w-10 h-10 p-3 rounded-full border-none hover:opacity-80"
            title="Logout"
          >
            <LogOut className="text-gray-700 w-4 h-4" />
          </button>

        </div>
      </div>

      {/* Stats */}
      <div className="flex flex-wrap gap-6 justify-center my-8">
        <StatCircle label="Inbox" value={percent_inbox} color="green" />
        <StatCircle label="Spam" value={percent_spam} color="red" />
      </div>

      {/* Email Sections */}
      {emailList.length === 0 && (
        <div className="text-center text-gray-500 mt-8">
          No emails found.
        </div>
      )}

      {emailList.map((row: Email, blockIndex) => {
        let emailSection = emailSections.filter((item) => item.email === row.email);
        let emailInfo = emailSection.length > 0 ? emailSection[0].results : [];
        let emailType = emailSection.length > 0 ? emailSection[0].type : "_";
        let emailLoaded = emailLoading.find((item) => item.email === row.email)?.loaded || false;

        // sort by date
        emailInfo = [...emailInfo].sort((a, b) => {
          const dateA = a.date ? new Date(a.date).getTime() : 0;
          const dateB = b.date ? new Date(b.date).getTime() : 0;
          return dateB - dateA;
        })

        return (
          <div key={blockIndex} className="flex items-center gap-6 p-4">
            {/* Left static card */}
            <div className="w-[300px] flex flex-col bg-gray-200 p-4 rounded-xl flex-shrink-0 items-center justify-center ">
              <img src="/gmail.png" alt="icon" className="max-w-full max-h-40 object-contain" />
              <p className="text-base mt-2 text-center">{row.email}</p>
              <p className={`font-bold text-sm text-center ${emailType == 'valid' ? 'text-green-500' : 'text-red-500'}`}>{emailType}</p>
            </div>

            {/* Right scrollable section */}
            <div className="flex-1 overflow-hidden">
              <Swiper
                modules={[Navigation, Pagination]}
                spaceBetween={20}
                slidesPerView={4}
                navigation
                pagination={{ clickable: true }}
                loop={false}
                className="w-full"
                breakpoints={{
                  320: { slidesPerView: 1 },  // Mobile
                  640: { slidesPerView: 2 },  // Tablet
                  1024: { slidesPerView: 4 }, // Desktop
                }}
              >
                {emailInfo.length === 0 && (
                  <div className="flex-1 border rounded-xl p-12 text-gray-500">
                    {loading && !emailLoaded ? <Spinner /> : "No recent emails found from this sender or email."}
                  </div>
                )}
                {emailInfo.map((item: EmailResultItem, index: number) => {
                  const status = item.type || "inbox"; // Default to 'inbox' if type is not defined
                  const colorClass = statusColors[status] || "bg-gray-100 text-gray-800"; // Fallback color
                  return (
                    <SwiperSlide key={index}>
                      <div className={`p-2 px-[10px] pb-[10px] border rounded-lg shadow ${colorClass}`}
                      >
                        <h1 className="text-lg text-gray-900">{item.sender_name}</h1>
                        <p className="text-sm text-gray-700">---{item.sender_email}</p>
                        <p className="line-clamp-1 text-sm text-gray-700">Subject: {item.subject}</p>
                        <p className="line-clamp-1 text-sm text-gray-700">Description: {item.text}</p>
                        <div className="flex items-center justify-between">
                          <p><Badge text={item.type} color={item.type == 'inbox' ? 'green' : 'red'} /></p>
                          <p className="text-xs tracking-wide uppercase">{item.diff_time}</p>
                        </div>
                      </div>
                    </SwiperSlide>
                  );
                })}
              </Swiper>
            </div>
          </div>)
      })}
    </div>

  );
};

type Color = "red" | "green" | "blue";

interface StatCircleProps {
  label: string;
  value: number;
  color: Color;
}


function StatCircle({ label, value, color }: StatCircleProps) {
  const radius = 45;
  const stroke = 10;
  const normalizedRadius = radius - stroke / 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset =
    circumference - (value / 100) * circumference;

  return (
    <div className="relative w-24 h-24 flex items-center justify-center">
      <svg
        height="100%"
        width="100%"
        className="rotate-[-90deg]"
      >
        {/* Background circle */}
        <circle
          stroke="#e5e7eb" // gray-200
          fill="transparent"
          strokeWidth={stroke}
          r={normalizedRadius}
          cx="48"
          cy="48"
        />
        {/* Progress circle */}
        <circle
          stroke={color} // Fallback if dynamic color fails
          className={`stroke-${color}-500`} // Tailwind dynamic stroke
          fill="transparent"
          strokeWidth={stroke}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          r={normalizedRadius}
          cx="48"
          cy="48"
        />
      </svg>

      {/* Center Text */}
      <div className="absolute text-center text-sm font-semibold text-black">
        <p>{label}</p>
        <p>{value}%</p>
      </div>
    </div>
  );
}



export default DashboardPage;
