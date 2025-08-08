import React, { useState, useEffect } from "react";
import { PencilSquareIcon, TrashIcon, EyeIcon } from "@heroicons/react/24/solid";
import { Link } from "react-router-dom";
import api from "./../Api";
import axios from "axios";
type User = {
    id: number;
    username: string;
    password: string;
    is_admin: number;
    total: number;
    inbox: number;
    spam: number;
    ratio: string;
};



const Users = ({ searchText }: { searchText: string }) => {
    const [users, setUsers] = useState<User[]>([]);
    const [formData, setFormData] = useState({ username: "", password: "", is_admin: 0 });
    const [usersState, setUsersState] = useState<User[]>([...users]);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [showModal, setShowModal] = useState(false);
    const filteredUsers = users.filter((user) =>
        user.username.toLowerCase().includes(searchText.toLowerCase())
    );
    const pageSize = 10; // Number of users per page
    const totalPages = Math.ceil(filteredUsers.length / pageSize);
    const paginatedUsers = filteredUsers.slice(
        (currentPage - 1) * pageSize,
        currentPage * pageSize
    );
    const fetchUserList = async () => {
        try {
            const res = await api.get("/api/users");

            if (res.data.status === "OK") {
                setUsers(res.data.results);
            }
        } catch (err: unknown) {
            alert("Failed to fetch users. Please try again later.");
        }

    };
    const createUser = async (data: { username: string; password: string; is_admin: number }) => {
        try {
            const res = await api.post("/api/users", data);

            if (res) {
                setUsers([res.data, ...users]);

                //return res.data.results;
            }
        } catch (err: unknown) {
            alert("Failed to fetch users. Please try again later.");
        }

    };

    const updateUser = async (id: number, data: { username: string; password: string; is_admin: number }) => {
        try {
            const res = await api.put(`/api/users/${id}`, data);

            if (res.data) {
                return res.data;  // or res.data.updatedUser depending on your backend response
            } else {
                throw new Error("Update failed");
            }
        } catch (err: unknown) {
            if (axios.isAxiosError(err)) {
                console.error("Axios error:", err.response?.data || err.message);
            } else {
                console.error("Unexpected error:", err);
            }
            throw err; // Re-throw to handle it in caller
        }
    };

    const deleteUser = async (id: number) => {
        try {
            const res = await api.delete(`/api/users/${id}`);

            if (res.data.status === "OK") {
                setUsers(users.filter(u => u.id !== id));
                //return res.data.results;
            }
        } catch (err: unknown) {
            alert("Failed to delete user. Please try again later.");
        }
    };

    useEffect(() => {
        fetchUserList();
    }, []);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchText]);

    const openAddModal = () => {
        setFormData({ username: "", password: "", is_admin: 0 });
        setEditingId(null);
        setShowModal(true);
    };

    const openEditModal = (user: User) => {
        setFormData({ username: user.username, password: "user", is_admin: user.is_admin });
        setEditingId(user.id);
        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
        setFormData({ username: "", password: "", is_admin: 0 });
        setEditingId(null);
    };

    const handleSubmit = async () => {
        if (!formData.username) {
            alert("All fields are required");
            return;
        }
        let savedUser: any;
        try {
            if (editingId) {
                savedUser = await updateUser(editingId, formData);
                setUsers(users.map(u => u.id === editingId ? { ...u, ...savedUser } : u));
            } else {
                savedUser = await createUser(formData);
                //setUsers([savedUser, ...users]);
            }
        }
        catch (error) {
            console.error("Save failed:", error);
            alert("Something went wrong.");
        }

        closeModal();
    };

    const handleResetAll = () => {
        if (window.confirm("Are you sure you want to reset all log data?")) {
            api.get("/api/reset_all_data", {})
                .then((res) => {
                    if (res.data.status === 'OK') {
                        alert("Reset all log data successfully.");
                    } else {
                        alert("Failed to reset all log data.");
                    }
                })
                .catch((error) => {
                    console.error("API Error:", error);
                    alert("Request failed. Check console for details.");
                });
        }
    };


    const handleDelete = async (id: number) => {
        if (window.confirm("Delete this user?")) {
            await deleteUser(id);
            setUsers(users.filter(u => u.id !== id));
        }
    };



    // Pagination logic for page numbers
    const getPages = (current: number, total: number) => {
        const pages: (number | string)[] = [];
        if (total <= 7) {
            for (let i = 1; i <= total; i++) pages.push(i);
        } else {
            if (current <= 4) {
                pages.push(1, 2, 3, 4, 5, "...", total);
            } else if (current >= total - 3) {
                pages.push(1, "...", total - 4, total - 3, total - 2, total - 1, total);
            } else {
                pages.push(1, "...", current - 1, current, current + 1, "...", total);
            }
        }
        return pages;
    };
    const pages = getPages(currentPage, totalPages);

    return (
        <div className=" mx-auto mt-10 p-4 bg-white shadow rounded-lg">
            <div className="flex justify-between mb-4">
                <button className="bg-gray-700 text-white px-4 py-2 rounded" onClick={handleResetAll}>
                    Reset All User Data
                </button>

                <button
                    onClick={openAddModal}
                    className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
                >
                    + Add User
                </button>
            </div>

            <table className="w-full text-center border-collapse">
                <thead>
                    <tr className="bg-gray-100">
                        <th className="p-2 border">#</th>
                        <th className="p-2 border">Name</th>
                        <th className="p-2 border">Role</th>
                        <th className="p-2 border">Total Sent</th>
                        <th className="p-2 border">Inbox</th>
                        <th className="p-2 border">Spam</th>
                        <th className="p-2 border">Ratio</th>
                        <th className="p-2 border">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {paginatedUsers.map((user, index) => (
                        <tr key={user.id}>
                            <td className="p-2 border">{(currentPage - 1) * pageSize + index + 1}</td>
                            <td className="p-2 border">{user.username}</td>
                            <td className="p-2 border">{user.is_admin === 0 ? "User" : "Admin"}</td>
                            <td className="p-2 border text-green-600">{user.total}</td>
                            <td className="p-2 border text-blue-600">{user.inbox}</td>
                            <td className="p-2 border text-red-600">{user.spam}</td>
                            <td className="p-2 border">{user.ratio}</td>
                            <td className="p-2 border space-x-2">
                                <div className="flex gap-2">
                                    {/* View Button */}
                                    <Link
                                        to={`/user/detail/${user.id}`}
                                        className="bg-blue-500 text-white p-2 rounded hover:bg-blue-600 flex items-center justify-center"
                                        title="View"
                                    >
                                        <EyeIcon className="h-5 w-5" />
                                    </Link>
                                    {/* Edit Button */}
                                    <button
                                        onClick={() => openEditModal(user)}
                                        className="bg-yellow-400 text-white p-2 rounded hover:bg-yellow-500 flex items-center justify-center"
                                        title="Edit"
                                    >
                                        <PencilSquareIcon className="h-5 w-5" />
                                    </button>

                                    {/* Delete Button */}
                                    <button
                                        onClick={() => handleDelete(user.id)}
                                        className="bg-red-500 text-white p-2 rounded hover:bg-red-600 flex items-center justify-center"
                                        title="Delete"
                                    >
                                        <TrashIcon className="h-5 w-5" />
                                    </button>
                                </div>
                            </td>
                        </tr>
                    ))}
                    {paginatedUsers.length === 0 && (
                        <tr>
                            <td colSpan={8} className="text-center p-4 text-gray-500">
                                No users found.
                            </td>
                        </tr>
                    )}
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


            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-50">
                    <div className="bg-white rounded-lg w-full max-w-md p-6 shadow-lg">
                        <h2 className="text-xl font-semibold mb-4">
                            {editingId ? "Edit User" : "Add User"}
                        </h2>
                        <div className="space-y-4">
                            <input
                                className="w-full border p-2 rounded"
                                placeholder="Name"
                                value={formData.username}
                                onChange={e => setFormData({ ...formData, username: e.target.value })}
                            />
                            <input
                                className="w-full border p-2 rounded"
                                placeholder="Password"
                                value={formData.password}
                                onChange={e => setFormData({ ...formData, password: e.target.value })}
                            />
                            <select
                                className="w-full border p-2 rounded"
                                value={formData.is_admin}
                                onChange={e => setFormData({ ...formData, is_admin: parseInt(e.target.value) })}
                            >
                                <option value={1}>Admin</option>
                                <option value={0}>User</option>
                            </select>
                            <div className="flex justify-end space-x-2 pt-4">
                                <button
                                    onClick={closeModal}
                                    className="px-4 py-2 border rounded hover:bg-gray-100"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSubmit}
                                    className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                                >
                                    {editingId ? "Update" : "Create"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Users;
