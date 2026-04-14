"use client";

import { Download, Trash2 } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import * as XLSX from "xlsx";

export type SupplierDetail = {
    s_no: number;
    component_type: "Active" | "Passive";
    manufacturer_part_number: string;
    vendor_details: string;
    currency: string;
    percentage: number;
    req_quantity: number;
    excise_quantity: number;
    quantity: number;
    unit_price: number;
    total_price: number;
    qc_status?: "Pending" | "Approved" | "Rejected";
    qc_remark?: string;
    qc_file?: string;
};

export type PreprocessItem = {
    id: string;
    supplier_details: SupplierDetail[];
    [key: string]: any;
};

const currencyOptions = ["INR", "USD", "EUR", "AED", "GBP", "JPY", "SGD", "AUD", "CAD"];

export default function UploadSuppliersPage() {
    const router = useRouter();
    const params = useParams();
    const id = params.id as string;
    const pipelineId = params?.pipelineId as string;

    const [uploadedData, setUploadedData] = useState<Partial<SupplierDetail>[]>([]);
    const [error, setError] = useState<string>("");
    const [isLoading, setIsLoading] = useState(false);

    // Generate sample Excel file
    const handleDownloadSampleExcel = () => {
        const sampleData = [
            {
                "S.No": 1,
                "Manufacturer - Part Number": "PART-001",
                "Vendor Details": "Supplier A",
                "Req Quantity": 100,
                "Unit Price": 150,
            },
            {
                "S.No": 2,
                "Manufacturer - Part Number": "PART-002",
                "Vendor Details": "Supplier B",
                "Req Quantity": 50,
                "Unit Price": 200,
            },
        ];

        const worksheet = XLSX.utils.json_to_sheet(sampleData);
        worksheet["!cols"] = [
            { wch: 10 },
            { wch: 25 },
            { wch: 25 },
            { wch: 15 },
            { wch: 12 },
        ];

        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Suppliers");
        XLSX.writeFile(workbook, "supplier_sample.xlsx");
    };

    // Handle Excel file upload
    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsLoading(true);
        setError("");
        setUploadedData([]);

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const data = event.target?.result as ArrayBuffer;
                const workbook = XLSX.read(data, { type: "array" });
                const worksheet = workbook.Sheets[workbook.SheetNames[0]];
                const jsonData = XLSX.utils.sheet_to_json(worksheet);

                // Validate headers
                const requiredHeaders = ["S.No", "Manufacturer - Part Number", "Vendor Details", "Req Quantity", "Unit Price"];
                if (jsonData.length === 0) {
                    setError("Excel file is empty. Please add supplier data.");
                    setIsLoading(false);
                    return;
                }

                const firstRow = jsonData[0] as Record<string, any>;
                const missingHeaders = requiredHeaders.filter((header) => !(header in firstRow));
                if (missingHeaders.length > 0) {
                    setError(`Missing required columns: ${missingHeaders.join(", ")}`);
                    setIsLoading(false);
                    return;
                }

                // Parse and validate data
                const parsedData: Partial<SupplierDetail>[] = (jsonData as Record<string, any>[]).map((row: Record<string, any>, index: number) => {
                    const reqQty = Number(row["Req Quantity"]) || 0;
                    const unitPrice = Number(row["Unit Price"]) || 0;

                    return {
                        s_no: Number(row["S.No"]) || index + 1,
                        manufacturer_part_number: String(row["Manufacturer - Part Number"] || "").trim(),
                        vendor_details: String(row["Vendor Details"] || "").trim(),
                        currency: "INR", // Default currency - user will change manually in edit modal
                        req_quantity: reqQty,
                        unit_price: unitPrice,
                        // These will be empty - user will fill them manually
                        component_type: "Active",
                        percentage: 0,
                        excise_quantity: 0,
                        quantity: reqQty,
                        total_price: 0,
                        qc_status: "Pending",
                        qc_remark: "",
                        qc_file: "",
                    };
                });

                setUploadedData(parsedData);
            } catch (err) {
                setError(`Error reading file: ${err instanceof Error ? err.message : "Unknown error"}`);
            } finally {
                setIsLoading(false);
            }
        };
        reader.readAsArrayBuffer(file);
    };

    // Handle adding uploaded data to supplier details
    const handleAddToSupplierDetails = () => {
        try {
            setIsLoading(true);

            // Load current preprocess data
            const storedData = localStorage.getItem("preprocessData") || "[]";
            const data: PreprocessItem[] = JSON.parse(storedData);
            const itemToUpdate = data.find((item) => item.id === id);

            if (!itemToUpdate) {
                setError("Could not find the preprocess item. Please go back and try again.");
                setIsLoading(false);
                return;
            }

            // Get existing supplier details count to calculate correct s_no
            const existingCount = (itemToUpdate.supplier_details || []).length;

            // Add uploaded data with calculated s_no
            const newSupplierRows: SupplierDetail[] = uploadedData.map((row, index) => ({
                ...(row as any),
                s_no: existingCount + index + 1,
            }));

            // Update the item
            itemToUpdate.supplier_details = [...(itemToUpdate.supplier_details || []), ...newSupplierRows];

            // Save back to localStorage
            const updatedData = data.map((item) => (item.id === id ? itemToUpdate : item));
            localStorage.setItem("preprocessData", JSON.stringify(updatedData));

            // Redirect back to edit page
            router.push(`/crm/pipelines/${pipelineId}/preprocess/${id}/edit`);
        } catch (err) {
            setError(`Error saving data: ${err instanceof Error ? err.message : "Unknown error"}`);
            setIsLoading(false);
        }
    };

    const handleRemoveRow = (indexToRemove: number) => {
        setUploadedData((prev) => prev.filter((_, index) => index !== indexToRemove));
    };

    const handleGoBack = () => {
        router.push(`/crm/pipelines/${pipelineId}/preprocess/${id}/edit`);
    };

    return (
        <div className="min-h-screen p-4 sm:p-8 bg-gray-50">
            <div className="max-w-6xl mx-auto">
                <header className="mb-6">
                    <h1 className="text-3xl font-bold text-green-700">Upload Suppliers from Excel</h1>
                    <p className="text-gray-600 mt-2">
                        Download the sample template, fill in supplier data (except currency, component type, percentage, and excise quantity which you&apos;ll enter manually), and upload the file.
                    </p>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    {/* Download Sample Container */}
                    <div className="p-6 bg-white border rounded-lg shadow-sm">
                        <h2 className="text-lg font-semibold text-green-800 mb-4">Step 1: Download Sample Template</h2>
                        <p className="text-gray-600 text-sm mb-4">
                            Download a pre-formatted Excel template showing the required columns and format.
                        </p>
                        <button
                            onClick={handleDownloadSampleExcel}
                            className="flex items-center gap-2 px-4 py-2 text-white bg-blue-600 rounded hover:bg-blue-700"
                        >
                            <Download size={18} />
                            Download Sample Excel
                        </button>
                    </div>

                    {/* Upload File Container */}
                    <div className="p-6 bg-white border rounded-lg shadow-sm">
                        <h2 className="text-lg font-semibold text-green-800 mb-4">Step 2: Upload Your File</h2>
                        <p className="text-gray-600 text-sm mb-4">
                            Select your completed Excel file with supplier data.
                        </p>
                        <label className="flex items-center justify-center w-full px-4 py-2 border-2 border-dashed border-gray-300 rounded cursor-pointer hover:border-blue-500 hover:bg-blue-50">
                            <input
                                type="file"
                                accept=".xlsx,.xls"
                                onChange={handleFileUpload}
                                className="hidden"
                                disabled={isLoading}
                            />
                            <span className="text-blue-600 font-medium">Click to select Excel file</span>
                        </label>
                    </div>
                </div>

                {/* Error Message */}
                {error && (
                    <div className="p-4 mb-6 bg-red-50 border border-red-200 rounded text-red-700">
                        <p className="font-semibold mb-1">Error:</p>
                        <p className="text-sm">{error}</p>
                    </div>
                )}

                {/* Data Preview */}
                {uploadedData.length > 0 && (
                    <div className="bg-white border rounded-lg shadow-sm p-6 mb-8">
                        <h2 className="text-lg font-semibold text-green-800 mb-4">
                            Step 3: Preview & Confirm ({uploadedData.length} rows)
                        </h2>
                        <p className="text-gray-600 text-sm mb-4">
                            Review the data below. All rows will be added to your supplier details. You can remove individual rows if needed.
                        </p>

                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[800px] table-fixed">
                                <thead>
                                    <tr className="bg-gray-50 text-left text-sm font-medium text-gray-600">
                                        <th className="p-2">S.No</th>
                                        <th className="p-2">Manufacturer - Part Number</th>
                                        <th className="p-2">Vendor Details</th>
                                        <th className="p-2">Req Quantity</th>
                                        <th className="p-2">Unit Price</th>
                                        <th className="p-2">Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {uploadedData.map((row, index) => (
                                        <tr key={index} className="border-t text-sm">
                                            <td className="p-2 font-semibold">{row.s_no}</td>
                                            <td className="p-2 max-w-[200px] truncate" title={row.manufacturer_part_number || ""}>
                                                {row.manufacturer_part_number || "-"}
                                            </td>
                                            <td className="p-2 max-w-[180px] truncate" title={row.vendor_details || ""}>
                                                {row.vendor_details || "-"}
                                            </td>
                                            <td className="p-2 text-right">{row.req_quantity}</td>
                                            <td className="p-2 text-right">{(row.unit_price || 0).toLocaleString("en-IN")}</td>
                                            <td className="p-2">
                                                <button
                                                    onClick={() => handleRemoveRow(index)}
                                                    className="p-2 text-red-500 hover:text-red-700"
                                                    title="Remove row"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded">
                            <p className="text-sm text-blue-800 mb-2">
                                <strong>Next steps after adding:</strong>
                            </p>
                            <ul className="text-sm text-blue-700 list-disc list-inside space-y-1">
                                <li>Select <strong>Currency</strong> (INR, USD, EUR, etc.) for each row</li>
                                <li>Select <strong>Component Type</strong> (Active/Passive) for each row</li>
                                <li>Enter <strong>Percentage</strong> for each row</li>
                                <li>
                                    <strong>Excise Quantity</strong> will be auto-calculated based on Req Quantity × (1 + Percentage/100)
                                </li>
                                <li>
                                    <strong>Total Price</strong> will be auto-calculated as Excise Quantity × Unit Price
                                </li>
                            </ul>
                        </div>
                    </div>
                )}

                {/* Action Buttons */}
                <div className="flex justify-end gap-4">
                    <button
                        onClick={handleGoBack}
                        className="px-6 py-2 font-semibold border rounded bg-gray-100 hover:bg-gray-200"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleAddToSupplierDetails}
                        disabled={uploadedData.length === 0 || isLoading}
                        className="px-6 py-2 font-semibold text-white bg-green-600 rounded hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                    >
                        {isLoading ? "Processing..." : "Add to Supplier Details"}
                    </button>
                </div>
            </div>
        </div>
    );
}
