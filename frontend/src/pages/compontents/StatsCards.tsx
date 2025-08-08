const StatCard = ({ title, value, color }: { title: string, value: string, color: string }) => (
    <div className="shadow p-4 rounded w-full text-center">
        <h2 className="text-gray-600 text-sm">{title}</h2>
        <p className={`text-2xl font-bold ${color}`}>{value}</p>
    </div>
);

type StatsCardsProps = {
    totalInfo: { sum_inbox: number; sum_spam: number; total_percent: number };
};

export default function StatsCards({ totalInfo }: StatsCardsProps) {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6 border-2 border-emerald-300 rounded p-2">
            <StatCard title="Total Inbox" value={totalInfo.sum_inbox.toString()} color="text-green-600" />
            <StatCard title="Total Spam" value={totalInfo.sum_spam.toString()} color="text-red-600" />
            <StatCard title="Total Inbox Ratio" value={`${totalInfo.total_percent}%`} color="text-blue-600" />
        </div>
    );
}
