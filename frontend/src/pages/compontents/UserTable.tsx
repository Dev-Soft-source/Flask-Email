import { useState, useRef } from "react";
import { User, emailUser } from "../types/User";
import { Email } from "../Instance";
import api from "../Api";

interface UserTableProps {
    users: User[];
    emailList: Email[]
}

export default function UserTable({ users, emailList }: UserTableProps) {
    const [usersState, setUsersState] = useState<User[]>([...users]); // manage editable user list
    const [visibleCount, setVisibleCount] = useState(10);
    const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
    const [isAddingUser, setIsAddingUser] = useState(false);
    const [newUserData, setNewUserData] = useState<emailUser>({
        id: 0,
        name: "",
        password: "",
        is_admin: "0"
    });


    const passwordRefs = useRef<Record<string, HTMLInputElement | null>>({});
    const [currentPage, setCurrentPage] = useState(1);
    const usersPerPage = 20;

    const paginatedUsers = users.slice(
        (currentPage - 1) * usersPerPage,
        currentPage * usersPerPage
    );

    const totalPages = Math.ceil(190 / 10);

    const handleRowClick = (id: number) => {
        setExpandedRows((prev) => {
            const newSet = new Set(prev);
            if (newSet.has(id)) newSet.delete(id);
            else newSet.add(id);
            return newSet;
        });
    };

    const handleResetAll = () => {
        if (window.confirm("Are you sure you want to reset all user data?")) {
            setUsersState([]);
            setExpandedRows(new Set());
        }
    };

    const handleToggleAdd = () => {
        setIsAddingUser((prev) => !prev);
    };

    const handleDeleteUser = (id: number) => {
        if (window.confirm("Delete this user?")) {
            setUsersState((prev) => prev.filter((u) => u[0] !== id));
        }
    };

    const handleChangePassword = (username: string) => {

        const inputEl = passwordRefs.current[username];
        if (!inputEl) {
            alert("Password input not found.");
            return;
        }

        const newPassword = inputEl.value;
        if (!newPassword || !username) {
            alert("Username and password cannot be empty.");
            return;
        }

        if (!newPassword || !username) {
            alert("Username and password cannot be empty.");
            return;
        }
        if (newPassword) {
            api.post("/api/change_password", {
                username: username,
                password: newPassword,
            })
                .then((res) => {
                    if (res.data.status === 'OK') {
                        alert("Password changed successfully.");
                    } else {
                        alert("Failed to change password.");
                    }
                })
                .catch((error) => {
                    console.error("API Error:", error);
                    alert("Request failed. Check console for details.");
                });
        }
    };

    const handleCancelNewUser = () => {
        setIsAddingUser(false);
    };

    const handleShowMore = () => {
        setVisibleCount((prev) => prev + 10);
    };

    const handleInputChange = (field: keyof emailUser, value: string) => {
        setNewUserData((prev) => ({
            ...prev,
            [field]: value,
        }));
    };

    const handleSaveUser = () => {
        // Extract values from newUserData (which is bound to the input fields)
        const name = newUserData.name;
        const password = newUserData.password;
        const is_admin = newUserData.is_admin === "1" ? 1 : 0;

        // Send to backend
        api.post("/api/create", {
            username: name,
            password: password,
            is_admin: is_admin,
        })
            .then((res) => {
                if (res.data.status === 'OK') {
                    // Reset form after success
                    setNewUserData({
                        id: 0,
                        name: "",
                        password: "",
                        is_admin: "0",
                    });
                    setIsAddingUser(false);
                } else {
                    alert("Invalid credentials or search result not found.");
                }
            })
            .catch((error) => {
                console.error("API Error:", error);
                alert("Request failed. Check console for details.");
            });
    };
    // Move renderRow inside UserTable so it can access handleRowClick and other handlers
    const renderRow = (user: User, index: number, isChild = false, parentIndex?: number) => {
        const ratio =
            user[4] > 0 ? `${Math.round((user[4] / (user[3])) * 100)}%` : "0%";

        const rowNumber = isChild
            ? `${parentIndex! + 1}.${index + 1}`
            : `${index + 1}`;

        return (
            <tr
                key={(isChild ? `child-` : `parent-`) + user[0] + "-" + index}
                className={`${isChild ? "bg-gray-50" : "cursor-pointer hover:bg-gray-100"} border-b`}
                onClick={!isChild ? () => handleRowClick(user[0]) : undefined}
            >
                <td className="font-semibold text-gray-500">{rowNumber}</td>
                <td>{user[1]}</td>
                <td>{user[2]}</td>
                <td>[ {user[3]} ]</td>
                <td className="text-green-600">{user[4]}</td>
                <td className="text-red-600">{user[5]}</td>
                <td>{ratio}</td>
                <td className="flex items-center gap-2 py-2">
                    <input
                        type="password"
                        placeholder="Password"
                        className="border px-2 py-1 rounded"
                        ref={(el) => {
                            if (el) passwordRefs.current[user[1]] = el;
                        }}
                    />
                    <button
                        className="bg-green-500 text-white px-2 py-1 rounded"
                        onClick={(e) => {
                            e.stopPropagation();
                            handleChangePassword(user[1]);
                        }}
                    >
                        Change Password
                    </button>
                    <button
                        className="bg-red-500 text-white px-2 py-1 rounded"
                        onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteUser(user[0]);
                        }}
                    >
                        Delete
                    </button>
                </td>
            </tr>
        );
    };

    const pages = [];

    if (totalPages <= 5) {
        for (let i = 1; i <= totalPages; i++) {
            pages.push(i);
        }
    } else {
        if (currentPage <= 3) {
            pages.push(1, 2, 3, 4, "...", totalPages);
        } else if (currentPage >= totalPages - 2) {
            pages.push(1, "...", totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
        } else {
            pages.push(1, "...", currentPage - 1, currentPage, currentPage + 1, "...", totalPages);
        }
    }

    return (
        <div className="overflow-x-auto">
            <div className="flex justify-between items-center mb-4">
                <button className="bg-gray-700 text-white px-4 py-2 rounded" onClick={handleResetAll}>
                    Reset All User Data
                </button>
                <button
                    className="bg-blue-600 text-white px-4 py-2 rounded"
                    onClick={handleToggleAdd}
                >
                    {isAddingUser ? "Cancel Add User" : "Add New User"}
                </button>
            </div>


            <table className="w-full table-auto border-collapse">
                <thead>
                    <tr className="bg-gray-200 text-left">
                        <th>No</th>
                        <th>Username</th>
                        <th>Role</th>
                        <th>Total Sent</th>
                        <th>Inbox</th>
                        <th>Spam</th>
                        <th>Ratio</th>
                        <th>Action</th>
                    </tr>
                </thead>
                {isAddingUser && (
                    <tr className="bg-yellow-50 border-b">
                        <td className="text-gray-500 font-semibold">{"+ New +"}</td>
                        <td>
                            <input
                                type="text"
                                value={newUserData.name}
                                placeholder="Name"
                                onChange={(e) => handleInputChange("name", e.target.value)}
                                className="border px-4 py-1 rounded w-full"
                            />
                        </td>
                        <td>

                            <input
                                type="text"
                                placeholder="Password"
                                value={newUserData.password}
                                onChange={(e) => handleInputChange("password", e.target.value)}
                                className="border px-4 py-1 rounded w-full"
                            />
                        </td>
                        <td className="flex flex-col text-right">
                            <p>Admin :</p>
                        </td>
                        <td>
                            <input
                                type="checkbox"
                                placeholder="is_Admin"
                                checked={Boolean(newUserData.is_admin)}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange("is_admin", e.target.checked ? "1" : "0")}
                                className="border px-4 py-1 rounded w-full"
                            />
                        </td>

                        <td className="flex gap-2">
                            <button
                                className="bg-green-600 text-white px-2 py-1 rounded"
                                onClick={handleSaveUser}
                            >
                                Save
                            </button>
                            <button
                                className="bg-gray-400 text-white px-2 py-1 rounded"
                                onClick={() => setIsAddingUser(false)}
                            >
                                Cancel
                            </button>
                        </td>
                    </tr>
                )}
                <tbody>
                    {users.slice(0, visibleCount).flatMap((user, parentIndex) => {
                        const rows = [renderRow(user, parentIndex)];
                        if (expandedRows.has(user[0])) {
                            const children = Array.from({ length: 10 }, (_, childIndex) =>
                                renderRow(
                                    { ...user, 0: user[0] * 100 + childIndex },
                                    childIndex,
                                    true,
                                    parentIndex
                                )
                            );
                            rows.push(...children);
                        }
                        return rows;
                    })}
                </tbody>
            </table>

            <div className="flex items-center justify-center space-x-2 mt-4">
                {/* Prev Button */}
                <button
                    onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className={`px-3 py-1 border rounded ${currentPage === 1 ? "bg-gray-100 text-gray-400 cursor-not-allowed" : "bg-white"
                        }`}
                >
                    {"< "} Prev
                </button>

                {/* Page Numbers */}
                {pages.map((page, index) =>
                    page === "..." ? (
                        <span key={index} className="px-2 py-1 text-gray-500">
                            ...
                        </span>
                    ) : (
                        <button
                            key={index}
                            onClick={() => setCurrentPage(Number(page))}
                            className={`px-3 py-1 border rounded ${currentPage === page ? "bg-blue-600 text-white" : "bg-gray-200"
                                }`}
                        >
                            {page}
                        </button>
                    )
                )}

                {/* Next Button */}
                <button
                    onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className={`px-3 py-1 border rounded ${currentPage === totalPages ? "bg-gray-100 text-gray-400 cursor-not-allowed" : "bg-white"
                        }`}
                >
                    Next {" >"}
                </button>
            </div>
        </div>
    );
}
