export const STORAGE_KEYS = {
  HIERARCHICAL_PIPELINES: "hierarchicalPipelines",
  USER_PIPELINE_VISIBILITY: "userPipelineVisibility",
  RFQ: "rfqData",
  FEASIBILITY: "feasibilityData",
  QUOTATION: "quotationData",
  NEGOTIATION: "negotiationData",
  CLOSED: "closedData",
  PREPROCESS: "preprocessData",
  POSTPROCESS: "postprocessData",
  PAYMENT_PENDING: "paymentPendingData",
  COMPLETED_PROJECTS: "completedProjectsData",
  GST_PURCHASE: "gstPurchaseData",
  COMPANY: "companyData",
  ACCESS_TOKEN: "accessToken",
  REFRESH_TOKEN: "refreshToken"
} as const;

export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS];
