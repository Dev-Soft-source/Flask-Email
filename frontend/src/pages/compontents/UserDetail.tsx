import { useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { ArrowLeftEndOnRectangleIcon,PencilSquareIcon, TrashIcon  } from '@heroicons/react/24/solid'; // or outline
import { Link } from 'react-router-dom';
import api from "./../Api";
type UserItem = {
    id: number;
    email: string;
    password: string;
    user_id: number;
};
const UserDetail = () => {
    const { id } = useParams();
    const [user, setUser] = useState<UserItem[]>([]);
    const [editingUser, setEditingUser] = useState<number | null>(null);
    const [formData, setFormData] = useState<{ user_id: number | null; email: string; password: string }>({ user_id: null, email: "", password: "" });
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [loading, setLoading] = useState(true);
    const fetchUser = async () => {
        try {
            const res = await api.get(`/api/user/${id}`);

            if (res.data.status === "OK") {
                setUser(res.data.results);


            } else {

            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };
    const openEditModal = (user: UserItem) => {
        setFormData(user);
        setEditingUser(user.id);
        setIsModalOpen(true);
    };

    const openAddModal = () => {
        setFormData({ user_id: id ? Number(id) : null, email: "", password: "" });
        setEditingUser(null);
        setIsModalOpen(true);
    };

    const closeModal = () => setIsModalOpen(false);

    const saveUser = async () => {
        try {
            if (editingUser) {
                const res = await api.put(`/api/user/${editingUser}`, formData);
                setUser(user.map(u => u.id === editingUser ? res.data.results : u));
            } else {
                const mail_count = user.length;
                if (mail_count > 10) {
                    window.confirm("This user has over 10 emails.");
                    return;
                }
                const res = await api.post("/api/user", formData);
                setUser([res.data.results, ...user]);
            }
            closeModal();
        } catch (err) {
            console.error("Save failed", err);
        }
    };
    const handleDelete = async (id: number) => {
        if (!window.confirm("Delete this user?")) return;
        try {
            await api.delete(`/api/user/${id}`);
            setUser(user.filter(u => u.id !== id));
        } catch (err) {
            console.error("Delete failed", err);
        }
    };

    useEffect(() => {


        fetchUser();
    }, [id]);

    if (loading) return <div className="p-4">Loading user...</div>;
    if (!user) return <div className="p-4 text-red-500">User not found</div>;

    return (
        <>
            <div className="p-6 w-full bg-white rounded shadow">
                <Link to="/admin" title="Back to Admin" className="inline-block mb-4 hover:text-blue-600">
                    <ArrowLeftEndOnRectangleIcon  className="h-6 w-6" />
                </Link>
                <button onClick={openAddModal} className="bg-green-500 text-white mx-[3%] px-3 py-2 w-auto rounded my-4">
                    Add Mail
                </button>
                <div className="space-y-2 px-[3%]">
                    <table className="w-full border mt-4">
                        <thead>
                            <tr>
                                <th className="border p-2">#</th>
                                <th className="border p-2">Email</th>
                                <th className="border p-2">Password</th>
                                <th className="border p-2">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {user.map((item, index) => (
                                <tr key={item.id}>
                                    <td className="border p-2">{index + 1}</td>
                                    <td className="border p-2">{item.email}</td>
                                    <td className="border p-2">{item.password}</td>
                                    <td className="border p-2 flex gap-2">
                                        <button onClick={() => openEditModal(item)} className="bg-yellow-400 text-white p-2 rounded hover:bg-yellow-500 flex items-center justify-center"
                                        title="Edit">
                                            <PencilSquareIcon className="h-5 w-5" />
                                        </button>
                                        <button onClick={() => handleDelete(item.id)}  className="bg-red-500 text-white p-2 rounded hover:bg-red-600 flex items-center justify-center"
                                        title="Delete">
                                            <TrashIcon className="h-5 w-5" />
                                        </button>

                                        
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                </div>
            </div>
            {isModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center">
                    <div className="bg-white p-6 rounded shadow-lg w-80">
                        <h2 className="text-xl mb-4">{editingUser ? "Edit User" : "Add User"}</h2>
                        <input
                            type="email"
                            className="w-full border p-2 mb-2"
                            placeholder="Email"
                            value={formData.email}
                            onChange={e => setFormData({ ...formData, email: e.target.value })}
                        />
                        <input
                            type="text"
                            className="w-full border p-2 mb-4"
                            placeholder="Password"
                            value={formData.password}
                            onChange={e => setFormData({ ...formData, password: e.target.value })}
                        />
                        <div className="flex justify-between">
                            <button onClick={saveUser} className="bg-blue-500 text-white px-3 py-1 rounded">
                                Save
                            </button>
                            <button onClick={closeModal} className="bg-gray-300 px-3 py-1 rounded">
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </>
    );
};

export default UserDetail;
