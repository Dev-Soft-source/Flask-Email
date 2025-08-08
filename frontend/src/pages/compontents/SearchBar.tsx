import { KeyboardEvent, useState } from "react";

export default function SearchBar({ onSearch }: { onSearch: (text: string) => void }) {
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(false);

    function handleKeyDown(e: KeyboardEvent<HTMLInputElement>): void {
        if (e.key === "Enter") {
            setLoading(true);
            onSearch(search);
            setLoading(false);
        }
    }

    function onSearchClick(event: React.MouseEvent<HTMLButtonElement, MouseEvent>): void {
        setLoading(true);
        onSearch(search);
        setLoading(false);
    }

    return (
        <div className="flex justify-end w-full">
            <div className="w-full max-w-md bg-white rounded shadow overflow-hidden flex mb-5">
                <input
                    type="text"
                    placeholder="Search by username or role"
                    value={search}
                    readOnly={loading}
                    required
                    onKeyDown={handleKeyDown}
                    onChange={(e) => setSearch(e.target.value)}
                    className="flex-1 px-4 py-2 text-sm text-gray-700 focus:outline-none"
                />
                <button
                    disabled={loading}
                    onClick={onSearchClick}
                    className="bg-green-500 hover:bg-green-600 px-4 flex items-center justify-center"
                >
                    {/* Replace <Search /> with an actual icon or text if not defined */}
                    <span className="text-white w-4 h-4">🔍</span>
                </button>
            </div>
        </div>
    );
}
