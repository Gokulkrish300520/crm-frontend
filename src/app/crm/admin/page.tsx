"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { format, isBefore, addDays, differenceInDays } from "date-fns";
import { 
  ChevronRight, 
  ChevronDown, 
  Check, 
  X, 
  Eye, 
  Edit2, 
  Layers,
  Clock,
  AlertCircle,
  CheckCircle,
  XCircle,
  User as UserIcon,
  Bell,
  Calendar,
  AlertTriangle,
  Target,
  TrendingUp
} from "lucide-react";
import { HierarchicalPipeline, pipelineHelpers, type FlatPipeline } from "@/types/pipeline";
import { MOCK_USERS, type PipelineStatistics, type RejectionModalInfo } from "./data";
import { HIERARCHICAL_PIPELINES_KEY, USER_PIPELINE_VISIBILITY_KEY } from "./constants";
import { readJson, writeJson } from "@/utils/storage";

type DeadlineItem = {
  id: string;
  title: string;
  company_name: string;
  deadline: string;
  type: string;
  stage: string;
  priority: "High" | "Medium" | "Low";
  status: string;
  pipelineId: string;
  department?: string;
  assigned_to?: string;
};

export default function AdminDashboard() {
  const router = useRouter();
  const [allPipelines, setAllPipelines] = useState<HierarchicalPipeline[]>([]);
  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set());
  const [expandedPipelines, setExpandedPipelines] = useState<Set<string>>(new Set());
  const [filterStatus, setFilterStatus] = useState<"All" | "Active" | "Pending" | "Rejected" | "Completed">("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [rejectionModal, setRejectionModal] = useState<RejectionModalInfo | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [userPipelineVisibility, setUserPipelineVisibility] = useState<Record<string, string[]>>({});
  const [showVisibilityPanel, setShowVisibilityPanel] = useState(false);
  const [pendingApprovalsCount, setPendingApprovalsCount] = useState(0);
  const [allDeadlines, setAllDeadlines] = useState<DeadlineItem[]>([]);
  const [showDeadlines, setShowDeadlines] = useState(true);
  const [expandedUserDeadlines, setExpandedUserDeadlines] = useState<Set<string>>(new Set());

  useEffect(() => {
    // Load approval requests count
    try {
      const approvalRequests = JSON.parse(localStorage.getItem("approvalRequests") || "[]");
      const preprocessData = JSON.parse(localStorage.getItem("preprocessData") || "[]");
      
      // Count only requests that are still pending
      const pendingCount = approvalRequests.filter((req: any) => {
        const item = preprocessData.find((p: any) => p.id === req.id);
        return item && item.approval_status === "Pending Approval";
      }).length;
      
      setPendingApprovalsCount(pendingCount);
    } catch (error) {
      console.error("Failed to load approval requests:", error);
    }

    // Load all deadlines from all stages
        {/* Per-User Deadlines & Follow-ups */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Per-User Deadlines & Follow-ups</h2>
              <p className="text-gray-600 mt-1">View deadlines and follow-up dates grouped by assigned user</p>
            </div>
          </div>

          <div className="mt-4 space-y-4">
            {MOCK_USERS.map(user => {
              const items = deadlinesByUser[user.id] || [];
              return (
                <div key={user.id} className="border rounded-lg">
                  <button
                    onClick={() => toggleUserDeadlines(user.id)}
                    className="w-full text-left p-4 flex items-center justify-between bg-gray-50 hover:bg-gray-100"
                  >
                    <div>
                      <p className="font-medium text-gray-900">{user.name}</p>
                      <p className="text-xs text-gray-500">{user.email} • {user.role}</p>
                    </div>
                    <div className="text-sm text-gray-700">{items.length} item{items.length !== 1 ? 's' : ''}</div>
                  </button>

                  {expandedUserDeadlines.has(user.id) && (
                    <div className="p-4">
                      {items.length === 0 ? (
                        <p className="text-gray-500">No deadlines assigned</p>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead className="text-xs text-gray-600 uppercase">
                              <tr>
                                <th className="px-3 py-2 text-left">Company</th>
                                <th className="px-3 py-2 text-left">Task</th>
                                <th className="px-3 py-2">Stage</th>
                                <th className="px-3 py-2">Deadline</th>
                                <th className="px-3 py-2">Status</th>
                                <th className="px-3 py-2">Priority</th>
                                <th className="px-3 py-2">Action</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y">
                              {items.map(d => {
                                const status = getDeadlineStatus(d.deadline);
                                return (
                                  <tr key={d.id} className="hover:bg-gray-50">
                                    <td className="px-3 py-2 font-medium text-gray-900">{d.company_name}</td>
                                    <td className="px-3 py-2 text-gray-700">{d.title}</td>
                                    <td className="px-3 py-2 text-center">
                                      <span className="px-2 py-1 text-xs font-semibold bg-purple-100 text-purple-800 rounded-full">{d.stage}</span>
                                    </td>
                                    <td className="px-3 py-2">{format(new Date(d.deadline), "MMM dd, yyyy")}</td>
                                    <td className="px-3 py-2">
                                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${status.color}`}>{status.label}</span>
                                    </td>
                                    <td className="px-3 py-2">
                                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                                        d.priority === "High" ? "bg-red-100 text-red-800" :
                                        d.priority === "Medium" ? "bg-yellow-100 text-yellow-800" :
                                        "bg-green-100 text-green-800"
                                      }`}>{d.priority}</span>
                                    </td>
                                    <td className="px-3 py-2">
                                      <button onClick={() => { if (d.pipelineId) router.push(`/crm/pipelines/${d.pipelineId}/${d.type.toLowerCase()}`); }} className="text-blue-600">View</button>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Other/Unassigned buckets */}
            {(() => {
              const otherKeys = Object.keys(deadlinesByUser).filter(k => k !== 'unassigned' && !MOCK_USERS.some(u => u.id === k));
              return (
                <>
                  {otherKeys.map(key => {
                    const items = deadlinesByUser[key] || [];
                    return (
                      <div key={key} className="border rounded-lg">
                        <button onClick={() => toggleUserDeadlines(key)} className="w-full text-left p-4 flex items-center justify-between bg-gray-50 hover:bg-gray-100">
                          <div>
                            <p className="font-medium text-gray-900">{key}</p>
                            <p className="text-xs text-gray-500">Imported/Unknown assignee</p>
                          </div>
                          <div className="text-sm text-gray-700">{items.length} item{items.length !== 1 ? 's' : ''}</div>
                        </button>
                        {expandedUserDeadlines.has(key) && (
                          <div className="p-4">
                            <div className="overflow-x-auto">
                              <table className="w-full text-sm">
                                <thead className="text-xs text-gray-600 uppercase">
                                  <tr>
                                    <th className="px-3 py-2 text-left">Company</th>
                                    <th className="px-3 py-2 text-left">Task</th>
                                    <th className="px-3 py-2">Stage</th>
                                    <th className="px-3 py-2">Deadline</th>
                                    <th className="px-3 py-2">Status</th>
                                    <th className="px-3 py-2">Priority</th>
                                    <th className="px-3 py-2">Action</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y">
                                  {items.map(d => {
                                    const status = getDeadlineStatus(d.deadline);
                                    return (
                                      <tr key={d.id} className="hover:bg-gray-50">
                                        <td className="px-3 py-2 font-medium text-gray-900">{d.company_name}</td>
                                        <td className="px-3 py-2 text-gray-700">{d.title}</td>
                                        <td className="px-3 py-2 text-center"><span className="px-2 py-1 text-xs font-semibold bg-purple-100 text-purple-800 rounded-full">{d.stage}</span></td>
                                        <td className="px-3 py-2">{format(new Date(d.deadline), "MMM dd, yyyy")}</td>
                                        <td className="px-3 py-2"><span className={`px-2 py-1 text-xs font-semibold rounded-full ${status.color}`}>{status.label}</span></td>
                                        <td className="px-3 py-2"><span className={`px-2 py-1 text-xs font-semibold rounded-full ${d.priority === "High" ? "bg-red-100 text-red-800" : d.priority === "Medium" ? "bg-yellow-100 text-yellow-800" : "bg-green-100 text-green-800"}`}>{d.priority}</span></td>
                                        <td className="px-3 py-2"><button onClick={() => { if (d.pipelineId) router.push(`/crm/pipelines/${d.pipelineId}/${d.type.toLowerCase()}`); }} className="text-blue-600">View</button></td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* Unassigned bucket */}
                  {deadlinesByUser['unassigned'] && (
                    <div className="border rounded-lg">
                      <button onClick={() => toggleUserDeadlines('unassigned')} className="w-full text-left p-4 flex items-center justify-between bg-gray-50 hover:bg-gray-100">
                        <div>
                          <p className="font-medium text-gray-900">Unassigned</p>
                          <p className="text-xs text-gray-500">Deadlines without an assigned user</p>
                        </div>
                        <div className="text-sm text-gray-700">{deadlinesByUser['unassigned'].length} item{deadlinesByUser['unassigned'].length !== 1 ? 's' : ''}</div>
                      </button>
                      {expandedUserDeadlines.has('unassigned') && (
                        <div className="p-4">
                          {deadlinesByUser['unassigned'].length === 0 ? <p className="text-gray-500">No unassigned deadlines</p> : (
                            <div className="overflow-x-auto">
                              <table className="w-full text-sm">
                                <thead className="text-xs text-gray-600 uppercase">
                                  <tr>
                                    <th className="px-3 py-2 text-left">Company</th>
                                    <th className="px-3 py-2 text-left">Task</th>
                                    <th className="px-3 py-2">Stage</th>
                                    <th className="px-3 py-2">Deadline</th>
                                    <th className="px-3 py-2">Status</th>
                                    <th className="px-3 py-2">Priority</th>
                                    <th className="px-3 py-2">Action</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y">
                                  {deadlinesByUser['unassigned'].map(d => {
                                    const status = getDeadlineStatus(d.deadline);
                                    return (
                                      <tr key={d.id} className="hover:bg-gray-50">
                                        <td className="px-3 py-2 font-medium text-gray-900">{d.company_name}</td>
                                        <td className="px-3 py-2 text-gray-700">{d.title}</td>
                                        <td className="px-3 py-2 text-center"><span className="px-2 py-1 text-xs font-semibold bg-purple-100 text-purple-800 rounded-full">{d.stage}</span></td>
                                        <td className="px-3 py-2">{format(new Date(d.deadline), "MMM dd, yyyy")}</td>
                                        <td className="px-3 py-2"><span className={`px-2 py-1 text-xs font-semibold rounded-full ${status.color}`}>{status.label}</span></td>
                                        <td className="px-3 py-2"><span className={`px-2 py-1 text-xs font-semibold rounded-full ${d.priority === "High" ? "bg-red-100 text-red-800" : d.priority === "Medium" ? "bg-yellow-100 text-yellow-800" : "bg-green-100 text-green-800"}`}>{d.priority}</span></td>
                                        <td className="px-3 py-2"><button onClick={() => { if (d.pipelineId) router.push(`/crm/pipelines/${d.pipelineId}/${d.type.toLowerCase()}`); }} className="text-blue-600">View</button></td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        </div>

        {/* Stats Cards */}
  }, []);

  const loadAllDeadlines = () => {
    const deadlines: DeadlineItem[] = [];

    // Load from RFQ
    try {
      const rfqData = JSON.parse(localStorage.getItem("rfqData") || "[]");
      rfqData.forEach((item: any) => {
        if (item.deadline) {
          deadlines.push({
            id: item.id,
            title: item.description || "RFQ",
            company_name: item.company_name,
            deadline: item.deadline,
            type: "RFQ",
            stage: "RFQ",
            priority: item.priority || "Medium",
            status: item.status || "Active",
            pipelineId: item.pipelineId || "",
            department: item.department,
            assigned_to: item.project_handled_by,
          });
        }
      });
    } catch (e) {}

    // Load from Feasibility
    try {
      const feasibilityData = JSON.parse(localStorage.getItem("feasibilityData") || "[]");
      feasibilityData.forEach((item: any) => {
        if (item.deadline) {
          deadlines.push({
            id: item.id,
            title: item.description || "Feasibility",
            company_name: item.company_name,
            deadline: item.deadline,
            type: "Feasibility",
            stage: "Feasibility",
            priority: item.priority || "Medium",
            status: item.status || "Active",
            pipelineId: item.pipelineId || "",
            department: item.department,
            assigned_to: item.project_handled_by,
          });
        }
      });
    } catch (e) {}

    // Load from Quotation
    try {
      const quotationData = JSON.parse(localStorage.getItem("quotationData") || "[]");
      quotationData.forEach((item: any) => {
        if (item.deadline) {
          deadlines.push({
            id: item.id,
            title: item.description || "Quotation",
            company_name: item.company_name,
            deadline: item.deadline,
            type: "Quotation",
            stage: "Quotation",
            priority: item.priority || "Medium",
            status: item.status || "Active",
            pipelineId: item.pipelineId || "",
            department: item.department,
            assigned_to: item.project_handled_by,
          });
        }
      });
    } catch (e) {}

    // Load from Preprocess - Working Timeline & Project Timeline
    try {
      const preprocessData = JSON.parse(localStorage.getItem("preprocessData") || "[]");
      preprocessData.forEach((item: any) => {
        // Working Timeline deadlines
        if (Array.isArray(item.working_timeline)) {
          item.working_timeline.forEach((timeline: any, index: number) => {
            if (timeline.deadline) {
              deadlines.push({
                id: `${item.id}-wt-${index}`,
                title: timeline.description || `Working Timeline ${index + 1}`,
                company_name: item.company_name,
                deadline: timeline.deadline,
                type: "Preprocess",
                stage: "Preprocess - Working Timeline",
                priority: "Medium",
                status: timeline.approved || "Pending",
                pipelineId: item.pipelineId || "",
                department: item.department,
                assigned_to: item.project_handled_by,
              });
            }
          });
        }

        // Project Timeline deadlines
        if (Array.isArray(item.project_timeline)) {
          item.project_timeline.forEach((timeline: any, index: number) => {
            if (timeline.deadline) {
              deadlines.push({
                id: `${item.id}-pt-${index}`,
                title: timeline.description || `Project Timeline ${index + 1}`,
                company_name: item.company_name,
                deadline: timeline.deadline,
                type: "Preprocess",
                stage: "Preprocess - Project Timeline",
                priority: "High",
                status: "Active",
                pipelineId: item.pipelineId || "",
                department: item.department,
                assigned_to: item.project_handled_by,
              });
            }
          });
        }

        // Main preprocess deadline
        if (item.deadline) {
          deadlines.push({
            id: item.id,
            title: item.description || "Preprocess",
            company_name: item.company_name,
            deadline: item.deadline,
            type: "Preprocess",
            stage: "Preprocess",
            priority: "High",
            status: item.approval_status || "Active",
            pipelineId: item.pipelineId || "",
            department: item.department,
            assigned_to: item.project_handled_by,
          });
        }
      });
    } catch (e) {}

    // Load from Postprocess
    try {
      const postprocessData = JSON.parse(localStorage.getItem("postprocessData") || "[]");
      postprocessData.forEach((item: any) => {
        // Working Timeline deadlines
        if (Array.isArray(item.working_timeline)) {
          item.working_timeline.forEach((timeline: any, index: number) => {
            if (timeline.deadline) {
              deadlines.push({
                id: `${item.id}-post-wt-${index}`,
                title: timeline.description || `Postprocess Working Timeline ${index + 1}`,
                company_name: item.company_name,
                deadline: timeline.deadline,
                type: "Postprocess",
                stage: "Postprocess - Working Timeline",
                priority: "High",
                status: timeline.status || "Pending",
                pipelineId: item.pipelineId || "",
                department: item.department,
                assigned_to: item.project_handled_by,
              });
            }
          });
        }

        // Project Timeline deadlines
        if (Array.isArray(item.project_timeline)) {
          item.project_timeline.forEach((timeline: any, index: number) => {
            if (timeline.deadline) {
              deadlines.push({
                id: `${item.id}-post-pt-${index}`,
                title: timeline.description || `Postprocess Project Timeline ${index + 1}`,
                company_name: item.company_name,
                deadline: timeline.deadline,
                type: "Postprocess",
                stage: "Postprocess - Project Timeline",
                priority: "High",
                status: timeline.status || "Pending",
                pipelineId: item.pipelineId || "",
                department: item.department,
                assigned_to: item.project_handled_by,
              });
            }
          });
        }

        // Main postprocess deadline
        if (item.deadline) {
          deadlines.push({
            id: item.id,
            title: item.description || "Postprocess",
            company_name: item.company_name,
            deadline: item.deadline,
            type: "Postprocess",
            stage: "Postprocess",
            priority: "High",
            status: item.post_process_status || "Active",
            pipelineId: item.pipelineId || "",
            department: item.department,
            assigned_to: item.project_handled_by,
          });
        }
      });
    } catch (e) {}

    // Load from Payment Pending
    try {
      const paymentPendingData = JSON.parse(localStorage.getItem("paymentPendingData") || "[]");
      paymentPendingData.forEach((item: any) => {
        // Working Timeline deadlines
        if (Array.isArray(item.working_timeline)) {
          item.working_timeline.forEach((timeline: any, index: number) => {
            if (timeline.deadline) {
              deadlines.push({
                id: `${item.id}-pp-wt-${index}`,
                title: timeline.description || `Payment Pending Working Timeline ${index + 1}`,
                company_name: item.company_name,
                deadline: timeline.deadline,
                type: "Payment Pending",
                stage: "Payment Pending - Working Timeline",
                priority: "High",
                status: timeline.status || "Pending",
                pipelineId: item.pipelineId || "",
                department: item.department,
                assigned_to: item.project_handled_by,
              });
            }
          });
        }

        // Project Timeline deadlines
        if (Array.isArray(item.project_timeline)) {
          item.project_timeline.forEach((timeline: any, index: number) => {
            if (timeline.deadline) {
              deadlines.push({
                id: `${item.id}-pp-pt-${index}`,
                title: timeline.description || `Payment Pending Project Timeline ${index + 1}`,
                company_name: item.company_name,
                deadline: timeline.deadline,
                type: "Payment Pending",
                stage: "Payment Pending - Project Timeline",
                priority: "High",
                status: timeline.status || "Pending",
                pipelineId: item.pipelineId || "",
                department: item.department,
                assigned_to: item.project_handled_by,
              });
            }
          });
        }

        // Main payment pending deadline
        if (item.deadline) {
          deadlines.push({
            id: item.id,
            title: item.description || "Payment Pending",
            company_name: item.company_name,
            deadline: item.deadline,
            type: "Payment Pending",
            stage: "Payment Pending",
            priority: "High",
            status: item.payment_status || "Pending",
            pipelineId: item.pipelineId || "",
            department: item.department,
            assigned_to: item.project_handled_by,
          });
        }
      });
    } catch (e) {}

    // Load from Completed Projects
    try {
      const completedProjectsData = JSON.parse(localStorage.getItem("completedProjectsData") || "[]");
      completedProjectsData.forEach((item: any) => {
        // Working Timeline deadlines (for historical reference)
        if (Array.isArray(item.working_timeline)) {
          item.working_timeline.forEach((timeline: any, index: number) => {
            if (timeline.deadline) {
              deadlines.push({
                id: `${item.id}-cp-wt-${index}`,
                title: timeline.description || `Completed Project Working Timeline ${index + 1}`,
                company_name: item.company_name,
                deadline: timeline.deadline,
                type: "Completed Projects",
                stage: "Completed Projects - Working Timeline",
                priority: "Low",
                status: timeline.status || "Completed",
                pipelineId: item.pipelineId || "",
                department: item.department,
                assigned_to: item.project_handled_by,
              });
            }
          });
        }

        // Project Timeline deadlines (for historical reference)
        if (Array.isArray(item.project_timeline)) {
          item.project_timeline.forEach((timeline: any, index: number) => {
            if (timeline.deadline) {
              deadlines.push({
                id: `${item.id}-cp-pt-${index}`,
                title: timeline.description || `Completed Project Timeline ${index + 1}`,
                company_name: item.company_name,
                deadline: timeline.deadline,
                type: "Completed Projects",
                stage: "Completed Projects - Project Timeline",
                priority: "Low",
                status: timeline.status || "Completed",
                pipelineId: item.pipelineId || "",
                department: item.department,
                assigned_to: item.project_handled_by,
              });
            }
          });
        }

        // Main completion deadline
        if (item.deadline) {
          deadlines.push({
            id: item.id,
            title: item.description || "Completed Project",
            company_name: item.company_name,
            deadline: item.deadline,
            type: "Completed Projects",
            stage: "Completed Projects",
            priority: "Low",
            status: item.final_status || "Completed",
            pipelineId: item.pipelineId || "",
            department: item.department,
            assigned_to: item.project_handled_by,
          });
        }
      });
    } catch (e) {}

    // Load from Negotiation - Follow-up dates
    try {
      const negotiationData = JSON.parse(localStorage.getItem("negotiationData") || "[]");
      negotiationData.forEach((item: any) => {
        if (Array.isArray(item.events)) {
          item.events.forEach((event: any, index: number) => {
            if (event.next_followup_date) {
              deadlines.push({
                id: `${item.id}-event-${index}`,
                title: event.remarks || `Follow-up ${index + 1}`,
                company_name: item.company_name,
                deadline: event.next_followup_date,
                type: "Negotiation",
                stage: "Negotiation - Follow-up",
                priority: "High",
                status: item.quotation_status || "Active",
                pipelineId: item.pipelineId || "",
                department: item.department,
                assigned_to: item.project_handled_by,
              });
            }
          });
        }

        // Main negotiation deadline
        if (item.deadline) {
          deadlines.push({
            id: item.id,
            title: item.description || "Negotiation",
            company_name: item.company_name,
            deadline: item.deadline,
            type: "Negotiation",
            stage: "Negotiation",
            priority: "High",
            status: item.quotation_status || "Active",
            pipelineId: item.pipelineId || "",
            department: item.department,
            assigned_to: item.project_handled_by,
          });
        }
      });
    } catch (e) {}

    // Sort by deadline (closest first)
    deadlines.sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime());
    
    setAllDeadlines(deadlines);
  };

  useEffect(() => {
    try {
      const storedPipelines = readJson<FlatPipeline[]>(HIERARCHICAL_PIPELINES_KEY, []);
      if (storedPipelines.length > 0) {
        setAllPipelines(pipelineHelpers.buildTree(storedPipelines));
      } else {
        setAllPipelines([]);
      }
    } catch (error) {
      console.error("Failed to load pipelines:", error);
      setAllPipelines([]);
    }

    const storedVisibility = readJson<Record<string, string[]>>(USER_PIPELINE_VISIBILITY_KEY, {});
    setUserPipelineVisibility(storedVisibility);
  }, []);

  const saveUserPipelineVisibility = useCallback((visibility: Record<string, string[]>) => {
    writeJson(USER_PIPELINE_VISIBILITY_KEY, visibility);
  }, []);

  const togglePipelineVisibilityForUser = useCallback((userId: string, pipelineId: string) => {
    setUserPipelineVisibility((previous) => {
      const currentAssignments = new Set(previous[userId] ?? []);
      if (currentAssignments.has(pipelineId)) {
        currentAssignments.delete(pipelineId);
      } else {
        currentAssignments.add(pipelineId);
      }

      const nextVisibility = {
        ...previous,
        [userId]: Array.from(currentAssignments)
      };

      saveUserPipelineVisibility(nextVisibility);
      return nextVisibility;
    });
  }, [saveUserPipelineVisibility]);

  const isPipelineVisibleToUser = (userId: string, pipelineId: string): boolean => {
    return userPipelineVisibility[userId]?.includes(pipelineId) ?? false;
  };

  // Recursive function to render pipelines with sub-pipelines in visibility panel
  const renderPipelineVisibilityItem = (userId: string, pipeline: HierarchicalPipeline, depth: number = 0) => {
    const isVisible = isPipelineVisibleToUser(userId, pipeline.id);
    const hasChildren = pipeline.children.length > 0;
    const indentStyle = { paddingLeft: `${depth * 24}px` };

    const items = [];

    // Render the current pipeline
    items.push(
      <div 
        key={pipeline.id}
        style={indentStyle}
        className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded"
      >
        <input
          type="checkbox"
          checked={isVisible}
          onChange={() => togglePipelineVisibilityForUser(userId, pipeline.id)}
          className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
        />
        <Layers size={16} className="text-blue-600 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-gray-900 truncate">{pipeline.name}</p>
            {hasChildren && (
              <span className="text-xs text-gray-500">
                ({pipeline.children.length} sub-pipeline{pipeline.children.length !== 1 ? 's' : ''})
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500">
            Status: {pipeline.status} | Created: {format(new Date(pipeline.createdAt), "PP")}
          </p>
        </div>
        <span className={`px-2 py-0.5 text-xs font-semibold rounded-full flex-shrink-0 ${
          pipeline.status === 'Active' ? 'bg-green-100 text-green-800' :
          pipeline.status === 'Pending' ? 'bg-yellow-100 text-yellow-800' :
          pipeline.status === 'Rejected' ? 'bg-red-100 text-red-800' :
          'bg-blue-100 text-blue-800'
        }`}>
          {pipeline.status}
        </span>
      </div>
    );

    // Recursively render children (sub-pipelines)
    if (hasChildren) {
      pipeline.children.forEach(child => {
        items.push(...renderPipelineVisibilityItem(userId, child, depth + 1));
      });
    }

    return items;
  };

  const savePipelines = useCallback((updatedTree: HierarchicalPipeline[]) => {
    const flat = pipelineHelpers.flattenTree(updatedTree);
    writeJson(HIERARCHICAL_PIPELINES_KEY, flat);
    setAllPipelines(updatedTree);
  }, []);

  const handleApprovePipeline = (pipelineId: string) => {
    const updateStatus = (nodes: HierarchicalPipeline[]): HierarchicalPipeline[] => {
      return nodes.map(node => {
        if (node.id === pipelineId) {
          return {
            ...node,
            status: "Active" as const,
            updatedAt: new Date().toISOString(),
            rejectionInfo: undefined, // Clear any previous rejection
            activityLogs: [
              ...node.activityLogs,
              {
                id: crypto.randomUUID(),
                action: "approved",
                timestamp: new Date().toISOString(),
                userId: "admin",
                userName: "Admin",
                details: "Pipeline approved and set to Active"
              }
            ]
          };
        }
        if (node.children.length > 0) {
          return { ...node, children: updateStatus(node.children) };
        }
        return node;
      });
    };

    const updated = updateStatus(allPipelines);
    savePipelines(updated);
  };

  const handleRejectPipeline = () => {
    if (!rejectionModal || !rejectionReason.trim()) {
      alert("Please provide a rejection reason");
      return;
    }

    const updateStatus = (nodes: HierarchicalPipeline[]): HierarchicalPipeline[] => {
      return nodes.map(node => {
        if (node.id === rejectionModal.pipelineId) {
          return {
            ...node,
            status: "Rejected" as const,
            updatedAt: new Date().toISOString(),
            rejectionInfo: {
              reason: rejectionReason.trim(),
              rejectedAt: new Date().toISOString(),
              rejectedBy: "Admin" // In production, use actual admin name
            }
          };
        }
        if (node.children.length > 0) {
          return { ...node, children: updateStatus(node.children) };
        }
        return node;
      });
    };

    const updated = updateStatus(allPipelines);
    savePipelines(updated);
    setRejectionModal(null);
    setRejectionReason("");
  };

  const toggleUserExpand = (userId: string) => {
    setExpandedUsers(prev => {
      const next = new Set(prev);
      if (next.has(userId)) {
        next.delete(userId);
      } else {
        next.add(userId);
      }
      return next;
    });
  };

  const togglePipelineExpand = (pipelineId: string) => {
    setExpandedPipelines(prev => {
      const next = new Set(prev);
      if (next.has(pipelineId)) {
        next.delete(pipelineId);
      } else {
        next.add(pipelineId);
      }
      return next;
    });
  };

  const renderPipelineTree = (pipeline: HierarchicalPipeline, depth: number = 0) => {
    const hasChildren = pipeline.children.length > 0;
    const isExpanded = expandedPipelines.has(pipeline.id);
    const hasContent = pipelineHelpers.hasContent(pipeline);
    
    const indentStyle = { paddingLeft: `${depth * 24}px` };

    const statusBadge = {
      Pending: "bg-yellow-100 text-yellow-800",
      Active: "bg-green-100 text-green-800",
      Rejected: "bg-red-100 text-red-800",
      Completed: "bg-blue-100 text-blue-800"
    };

    return (
      <div key={pipeline.id} className="border-b last:border-b-0">
        <div 
          style={indentStyle}
          className="flex items-center gap-3 p-4 hover:bg-gray-50 transition"
        >
          {/* Expand/Collapse */}
          {hasChildren ? (
            <button
              onClick={() => togglePipelineExpand(pipeline.id)}
              className="flex-shrink-0 p-1 hover:bg-gray-200 rounded"
            >
              {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </button>
          ) : (
            <span className="flex-shrink-0 w-6" />
          )}

          {/* Pipeline Icon */}
          <Layers size={18} className="flex-shrink-0 text-blue-600" />

          {/* Pipeline Name */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h4 className="font-medium text-gray-900 truncate">{pipeline.name}</h4>
              <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${statusBadge[pipeline.status]}`}>
                {pipeline.status}
              </span>
              {!hasContent && (
                <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded-full">
                  Empty
                </span>
              )}
            </div>
            <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <UserIcon size={12} />
                {pipeline.userName || "Unknown User"}
              </span>
              <span title={`Created: ${format(new Date(pipeline.createdAt), "PPpp")}`}>
                Created: {format(new Date(pipeline.createdAt), "dd MMM yyyy")}
              </span>
              <span title={`Last Updated: ${format(new Date(pipeline.updatedAt), "PPpp")}`}>
                Updated: {format(new Date(pipeline.updatedAt), "dd MMM yyyy")}
              </span>
              <span>Stages: {pipeline.stages.length}</span>
              <span>Items: {pipeline.stages.reduce((sum, s) => sum + s.items.length, 0)}</span>
              {hasChildren && <span>Sub-pipelines: {pipeline.children.length}</span>}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => router.push(`/crm/pipelines/${pipeline.id}/rfq`)}
              className="p-2 text-blue-600 hover:bg-blue-50 rounded transition"
              title="View Pipeline"
            >
              <Eye size={18} />
            </button>
            
            {pipeline.status === "Pending" && (
              <>
                <button
                  onClick={() => handleApprovePipeline(pipeline.id)}
                  className="p-2 text-green-600 hover:bg-green-50 rounded transition"
                  title="Approve"
                >
                  <Check size={18} />
                </button>
                <button
                  onClick={() => setRejectionModal({ pipelineId: pipeline.id, pipelineName: pipeline.name })}
                  className="p-2 text-red-600 hover:bg-red-50 rounded transition"
                  title="Reject"
                >
                  <X size={18} />
                </button>
              </>
            )}
            
            {pipeline.status === "Rejected" && pipeline.rejectionInfo && (
              <div className="text-xs text-red-600" title={`Rejected: ${pipeline.rejectionInfo.reason}`}>
                <AlertCircle size={18} />
              </div>
            )}
          </div>
        </div>

        {/* Children */}
        {hasChildren && isExpanded && (
          <div>
            {pipeline.children.map(child => renderPipelineTree(child, depth + 1))}
          </div>
        )}

        {/* Rejection Info */}
        {pipeline.status === "Rejected" && pipeline.rejectionInfo && (
          <div style={indentStyle} className="ml-6 p-3 bg-red-50 border-l-2 border-red-200 mb-2">
            <p className="text-sm text-red-800">
              <strong>Rejection Reason:</strong> {pipeline.rejectionInfo.reason}
            </p>
            <p className="text-xs text-red-600 mt-1">
              Rejected on {format(new Date(pipeline.rejectionInfo.rejectedAt), "PPP")} by {pipeline.rejectionInfo.rejectedBy}
            </p>
          </div>
        )}
      </div>
    );
  };

  const flattenedPipelines = useMemo(() => {
    const collected: HierarchicalPipeline[] = [];

    const traverse = (nodes: HierarchicalPipeline[]) => {
      nodes.forEach((node) => {
        collected.push(node);
        if (node.children.length > 0) {
          traverse(node.children);
        }
      });
    };

    traverse(allPipelines);
    return collected;
  }, [allPipelines]);

  const stats = useMemo<PipelineStatistics>(() => {
    return flattenedPipelines.reduce<PipelineStatistics>((accumulator, pipeline) => {
      accumulator.total += 1;
      if (pipeline.status === "Pending") accumulator.pending += 1;
      if (pipeline.status === "Active") accumulator.active += 1;
      if (pipeline.status === "Rejected") accumulator.rejected += 1;
      if (pipeline.status === "Completed") accumulator.completed += 1;
      return accumulator;
    }, { total: 0, pending: 0, active: 0, rejected: 0, completed: 0 });
  }, [flattenedPipelines]);

  const deadlineStats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const overdue = allDeadlines.filter(d => isBefore(new Date(d.deadline), today)).length;
    const dueToday = allDeadlines.filter(d => {
      const deadline = new Date(d.deadline);
      deadline.setHours(0, 0, 0, 0);
      return deadline.getTime() === today.getTime();
    }).length;
    const thisWeek = allDeadlines.filter(d => {
      const deadline = new Date(d.deadline);
      const nextWeek = addDays(today, 7);
      return deadline >= today && deadline <= nextWeek;
    }).length;

    return { total: allDeadlines.length, overdue, dueToday, thisWeek };
  }, [allDeadlines]);

  const getDeadlineStatus = (deadline: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const deadlineDate = new Date(deadline);
    const diffDays = differenceInDays(deadlineDate, today);

    if (diffDays < 0) return { label: "Overdue", color: "bg-red-100 text-red-800" };
    if (diffDays === 0) return { label: "Today", color: "bg-orange-100 text-orange-800" };
    if (diffDays <= 3) return { label: `${diffDays}d`, color: "bg-yellow-100 text-yellow-800" };
    if (diffDays <= 7) return { label: `${diffDays}d`, color: "bg-blue-100 text-blue-800" };
    return { label: `${diffDays}d`, color: "bg-green-100 text-green-800" };
  };

  // Group deadlines by assigned user (matches by user.name or user.id if present)
  const deadlinesByUser = useMemo(() => {
    const map: Record<string, DeadlineItem[]> = {};

    // initialize with known users
    MOCK_USERS.forEach(u => (map[u.id] = []));
    map["unassigned"] = [];

    allDeadlines.forEach((d) => {
      if (!d.assigned_to) {
        map["unassigned"].push(d);
        return;
      }

      // try to find a matching mock user by name or id
      const match = MOCK_USERS.find(u => u.name === d.assigned_to || u.id === d.assigned_to || u.email === d.assigned_to);
      if (match) {
        map[match.id].push(d);
      } else {
        // unknown user string - put into unassigned bucket under that string key
        const key = d.assigned_to || "unassigned";
        if (!map[key]) map[key] = [];
        map[key].push(d);
      }
    });

    return map;
  }, [allDeadlines]);

  const toggleUserDeadlines = (userKey: string) => {
    setExpandedUserDeadlines(prev => {
      const next = new Set(prev);
      if (next.has(userKey)) next.delete(userKey);
      else next.add(userKey);
      return next;
    });
  };

  const filteredPipelineTree = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    const nodeMatchesFilters = (node: HierarchicalPipeline) => {
      const statusMatches = filterStatus === "All" || node.status === filterStatus;
      const searchMatches = !normalizedQuery || node.name.toLowerCase().includes(normalizedQuery);
      return statusMatches && searchMatches;
    };

    const applyFilters = (nodes: HierarchicalPipeline[]): HierarchicalPipeline[] => {
      return nodes.reduce<HierarchicalPipeline[]>((accumulator, node) => {
        const filteredChildren = applyFilters(node.children);
        if (nodeMatchesFilters(node) || filteredChildren.length > 0) {
          accumulator.push({
            ...node,
            children: filteredChildren
          });
        }
        return accumulator;
      }, []);
    };

    return applyFilters(allPipelines);
  }, [allPipelines, filterStatus, searchQuery]);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Admin Dashboard</h1>
            <p className="text-gray-600">Manage all user pipelines and sub-pipelines</p>
          </div>
          <button
            onClick={() => router.push('/crm/admin/approvals')}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 font-semibold shadow-md transition"
          >
            <Bell size={20} />
            Approval Requests
            {pendingApprovalsCount > 0 && (
              <span className="ml-1 px-2 py-0.5 bg-red-500 text-white text-xs font-bold rounded-full">
                {pendingApprovalsCount}
              </span>
            )}
          </button>
        </div>

        {/* Deadline Overview Section */}
        {showDeadlines && (
          <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg shadow-lg p-6 mb-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                  <Target className="text-blue-600" />
                  System-Wide Deadlines Overview
                </h2>
                <p className="text-gray-600 mt-1">All active deadlines across all pipelines and stages</p>
              </div>
              <button
                onClick={() => setShowDeadlines(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={24} />
              </button>
            </div>

            {/* Deadline Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-white rounded-lg shadow p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total Deadlines</p>
                    <p className="text-3xl font-bold text-gray-900">{deadlineStats.total}</p>
                  </div>
                  <Calendar className="text-blue-600" size={36} />
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Overdue</p>
                    <p className="text-3xl font-bold text-red-600">{deadlineStats.overdue}</p>
                  </div>
                  <AlertTriangle className="text-red-600" size={36} />
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Due Today</p>
                    <p className="text-3xl font-bold text-orange-600">{deadlineStats.dueToday}</p>
                  </div>
                  <Clock className="text-orange-600" size={36} />
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">This Week</p>
                    <p className="text-3xl font-bold text-blue-600">{deadlineStats.thisWeek}</p>
                  </div>
                  <TrendingUp className="text-blue-600" size={36} />
                </div>
              </div>
            </div>

            {/* Critical Deadlines Table */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="p-4 bg-gray-50 border-b">
                <h3 className="font-semibold text-gray-900">Critical & Upcoming Deadlines (Next 10)</h3>
              </div>
              <div className="max-h-96 overflow-y-auto">
                {allDeadlines.slice(0, 10).length === 0 ? (
                  <div className="p-8 text-center text-gray-500">
                    <CheckCircle className="mx-auto mb-2 text-gray-300" size={48} />
                    <p>No deadlines found</p>
                  </div>
                ) : (
                  <table className="w-full">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr className="text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        <th className="px-4 py-3">Company</th>
                        <th className="px-4 py-3">Task</th>
                        <th className="px-4 py-3">Stage</th>
                        <th className="px-4 py-3">Deadline</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3">Assigned To</th>
                        <th className="px-4 py-3">Priority</th>
                        <th className="px-4 py-3">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {allDeadlines.slice(0, 10).map((deadline) => {
                        const status = getDeadlineStatus(deadline.deadline);
                        return (
                          <tr key={deadline.id} className="hover:bg-gray-50 transition">
                            <td className="px-4 py-3 text-sm font-medium text-gray-900">{deadline.company_name}</td>
                            <td className="px-4 py-3 text-sm text-gray-700">{deadline.title}</td>
                            <td className="px-4 py-3">
                              <span className="px-2 py-1 text-xs font-semibold bg-purple-100 text-purple-800 rounded-full">
                                {deadline.stage}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-700">
                              {format(new Date(deadline.deadline), "MMM dd, yyyy")}
                            </td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-1 text-xs font-semibold rounded-full ${status.color}`}>
                                {status.label}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600">{deadline.assigned_to || "-"}</td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                                deadline.priority === "High" ? "bg-red-100 text-red-800" :
                                deadline.priority === "Medium" ? "bg-yellow-100 text-yellow-800" :
                                "bg-green-100 text-green-800"
                              }`}>
                                {deadline.priority}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <button
                                onClick={() => {
                                  if (deadline.pipelineId) {
                                    const stage = deadline.type.toLowerCase();
                                    router.push(`/crm/pipelines/${deadline.pipelineId}/${stage}`);
                                  }
                                }}
                                className="text-blue-600 hover:text-blue-800 font-medium text-sm"
                              >
                                View
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
              {allDeadlines.length > 10 && (
                <div className="p-4 bg-gray-50 border-t text-center">
                  <button
                    onClick={() => router.push('/crm/admin/deadlines')}
                    className="text-blue-600 hover:text-blue-800 font-semibold text-sm"
                  >
                    View All {allDeadlines.length} Deadlines →
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {!showDeadlines && (
          <div className="bg-blue-50 rounded-lg p-4 mb-6">
            <button
              onClick={() => setShowDeadlines(true)}
              className="flex items-center gap-2 text-blue-600 hover:text-blue-800 font-semibold"
            >
              <Target size={20} />
              Show Deadlines Overview
            </button>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Pipelines</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              </div>
              <Layers className="text-blue-600" size={32} />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pending</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
              </div>
              <Clock className="text-yellow-600" size={32} />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active</p>
                <p className="text-2xl font-bold text-green-600">{stats.active}</p>
              </div>
              <CheckCircle className="text-green-600" size={32} />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Rejected</p>
                <p className="text-2xl font-bold text-red-600">{stats.rejected}</p>
              </div>
              <XCircle className="text-red-600" size={32} />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Completed</p>
                <p className="text-2xl font-bold text-blue-600">{stats.completed}</p>
              </div>
              <CheckCircle className="text-blue-600" size={32} />
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search pipelines..."
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => setFilterStatus("All")}
                className={`px-4 py-2 rounded-lg transition ${
                  filterStatus === "All"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                All
              </button>
              <button
                onClick={() => setFilterStatus("Pending")}
                className={`px-4 py-2 rounded-lg transition ${
                  filterStatus === "Pending"
                    ? "bg-yellow-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                Pending
              </button>
              <button
                onClick={() => setFilterStatus("Active")}
                className={`px-4 py-2 rounded-lg transition ${
                  filterStatus === "Active"
                    ? "bg-green-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                Active
              </button>
              <button
                onClick={() => setFilterStatus("Rejected")}
                className={`px-4 py-2 rounded-lg transition ${
                  filterStatus === "Rejected"
                    ? "bg-red-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                Rejected
              </button>
              <button
                onClick={() => setFilterStatus("Completed")}
                className={`px-4 py-2 rounded-lg transition ${
                  filterStatus === "Completed"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                Completed
              </button>
            </div>
          </div>
          
          {/* User Visibility Management Button */}
          <div className="mt-4 pt-4 border-t border-gray-200">
            <button
              onClick={() => setShowVisibilityPanel(!showVisibilityPanel)}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              <UserIcon size={20} />
              {showVisibilityPanel ? 'Hide' : 'Manage'} User Pipeline Visibility
            </button>
          </div>
        </div>

        {/* User Pipeline Visibility Panel */}
        {showVisibilityPanel && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">User Pipeline Visibility Control</h2>
            <p className="text-gray-600 mb-6">Select which pipelines each user can see in their dashboard</p>
            
            <div className="space-y-6">
              {MOCK_USERS.map(user => {
                const userPipelines = userPipelineVisibility[user.id] || [];
                const visibleCount = userPipelines.length;
                
                return (
                  <div key={user.id} className="border border-gray-200 rounded-lg p-4">
                    <div 
                      className="flex items-center justify-between cursor-pointer"
                      onClick={() => toggleUserExpand(user.id)}
                    >
                      <div className="flex items-center gap-3">
                        {expandedUsers.has(user.id) ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                        <UserIcon size={20} className="text-purple-600" />
                        <div>
                          <h3 className="font-semibold text-gray-900">{user.name}</h3>
                          <p className="text-sm text-gray-500">{user.email} - {user.role}</p>
                        </div>
                      </div>
                      <div className="text-sm font-medium text-purple-600">
                        {visibleCount} pipeline{visibleCount !== 1 ? 's' : ''} visible
                      </div>
                    </div>
                    
                    {expandedUsers.has(user.id) && (
                      <div className="mt-4 pl-8 space-y-2 max-h-96 overflow-y-auto">
                        {allPipelines.length === 0 ? (
                          <p className="text-gray-500 text-sm">No pipelines available</p>
                        ) : (
                          allPipelines.map(pipeline => renderPipelineVisibilityItem(user.id, pipeline))
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Pipelines Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="p-4 border-b bg-gray-50">
            <h2 className="text-lg font-semibold text-gray-900">All Pipelines</h2>
          </div>

          {filteredPipelineTree.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <Layers size={48} className="mx-auto mb-4 text-gray-300" />
              <p>No pipelines found</p>
            </div>
          ) : (
            <div className="divide-y">
              {filteredPipelineTree.map((pipeline) => renderPipelineTree(pipeline))}
            </div>
          )}
        </div>
      </div>

      {/* Rejection Modal */}
      {rejectionModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Reject Pipeline: {rejectionModal.pipelineName}
              </h3>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Rejection Reason *
                </label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  placeholder="Provide a clear reason for rejection..."
                  rows={4}
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleRejectPipeline}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
                >
                  Reject Pipeline
                </button>
                <button
                  onClick={() => {
                    setRejectionModal(null);
                    setRejectionReason("");
                  }}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
