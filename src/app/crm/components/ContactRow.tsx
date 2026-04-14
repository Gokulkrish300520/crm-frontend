"use client";

interface ContactRowProps {
  contact: {
    name: string;
    company: string;
    email: string;
    phone: string;
    owner: string;
  };
}

export default function ContactRow({ contact }: ContactRowProps) {
  return (
    <tr className="text-sm text-gray-800 hover:bg-gray-50">
      <td className="px-4 py-2 border">{contact.name}</td>
      <td className="px-4 py-2 border">{contact.company}</td>
      <td className="px-4 py-2 border">{contact.email}</td>
      <td className="px-4 py-2 border">{contact.phone || "-"}</td>
      <td className="px-4 py-2 border">{contact.owner}</td>
    </tr>
  );
}
