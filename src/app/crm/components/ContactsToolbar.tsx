"use client";

interface Props {
  onAddContact: () => void;
}

export default function ContactsToolbar({ onAddContact }: Props) {
  return (
    <div className="flex items-center justify-between bg-white p-3 rounded-lg shadow-sm border">
      {/* Left Section */}
      <div className="flex items-center gap-2">
        <select className="border rounded-md px-2 py-1 text-sm">
          <option>All Contacts</option>
          <option>My Contacts</option>
        </select>
      </div>

      {/* Right Section */}
      <div className="flex items-center gap-2">
        <input
          type="text"
          placeholder="Search..."
          className="border px-3 py-1 rounded-md text-sm"
        />
        <button
          onClick={onAddContact}
          className="bg-green-600 text-white px-3 py-1 rounded-md text-sm hover:bg-green-700"
        >
          + Contact
        </button>
      </div>
    </div>
  );
}
