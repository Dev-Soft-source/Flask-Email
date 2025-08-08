export default function Badge({ text, color = "blue" }) {
  const colors = {
    blue: "bg-blue-100 text-blue-800",
    green: "bg-green-700 text-green-100",
    red: "bg-red-700 text-red-100",
    yellow: "bg-yellow-100 text-yellow-800",
    gray: "bg-gray-100 text-gray-800",
    purple: "bg-purple-100 text-purple-800",
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${colors[color]}`}
    >
      {text}
    </span>
  );
}