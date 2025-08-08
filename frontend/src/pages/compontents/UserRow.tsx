type UserData = {
    username: string;
    role: string;
    sent: string;
    inbox: number;
    spam: number;
    ratio: string;
};

const UserRow = ({ user }: { user: UserData }) => {
    return (
        <tr className="hover:bg-gray-100 cursor-pointer text-center">
            <td>{user.username}</td>
            <td>{user.role}</td>
            <td>[ {user.sent} ]</td>
            <td className="text-green-600">{user.inbox}</td>
            <td className="text-red-600">{user.spam}</td>
            <td>{user.ratio}</td>
            <td className="flex gap-2">
                <input type="password" placeholder="Password" className="border px-2 py-1 text-sm" />
                <button className="bg-green-500 text-white px-2 rounded">Change Password</button>
                <button className="bg-red-500 text-white px-2 rounded">Delete</button>
            </td>
        </tr>
    );
};

export default UserRow;
