export default function CRMNavbar() {
  return (
    <header className="h-14 flex items-center justify-between px-4 border-b bg-white shadow-sm">
      <h1 className="text-lg font-semibold text-gray-700">CRM Dashboard</h1>
      <div className="flex items-center space-x-4">
        <button className="px-3 py-1 bg-blue-600 text-white rounded-lg">
          + Add
        </button>
      </div>
    </header>
  );
}
