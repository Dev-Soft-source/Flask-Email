import React, { useEffect, useState } from "react";
import SearchBar from './compontents/SearchBar';
import StatsCards from './compontents/StatsCards';
import Users from './compontents/Users';
import { User } from "./types/User";
import { Email } from "./Instance";
import { HomeIcon } from '@heroicons/react/24/solid'; // or outline
import { Link } from 'react-router-dom';
type DashboardPageProps = {
    onDashboardLayout: () => void;
    emailList: Email[];
    totalInfo: { sum_inbox: number; sum_spam: number; total_percent: number };
};

const DashboardPage: React.FC<DashboardPageProps> = ({ onDashboardLayout, emailList, totalInfo }) => {
    const [filtered, setFiltered] = useState<User[]>([]);
    const [searchText, setSearchText] = useState("");
    const [users, setUsers] = useState([
        { id: 1, name: "Alice", email: "alice@mail.com" },
        { id: 2, name: "Bob", email: "bob@mail.com" },
        { id: 3, name: "Charlie", email: "charlie@mail.com" },
    ]);
    const handleSearch = (text: string) => {
        const lower = text.toLowerCase();

        setSearchText(lower);
    };

    // useEffect(() => {
    //     setFiltered(adminInfo);
    // }, []);

    return (
        <div className="p-4 px-[3%] mx-auto w-full">
            <Link to="/" title="Back to Home" className="inline-block mb-4 hover:text-blue-600">
                <HomeIcon className="h-6 w-6" />
            </Link>
            <SearchBar onSearch={handleSearch} />
            <StatsCards totalInfo={totalInfo} />
            <Users searchText={searchText} />
        </div>
    );
};

export default DashboardPage;
