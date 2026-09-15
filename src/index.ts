export { AtribuClient } from "./client";
export type { AtribuClientConfig, CredentialKind } from "./config";
// #656 — the credential-less client. Exposes `public.*` and nothing else, so a
// credentialed call on one is a compile error rather than a 401.
export { AtribuPublicClient, type PublicClientConfig } from "./public-client";
export {
  PublicNamespace,
  PublicReportsResource,
  type PublicSharedReportResponse,
} from "./resources/public";
export { SDK_VERSION } from "./version";
export { detectRuntime, runtimeTag, type Runtime } from "./runtime";

export {
  AtribuError,
  AtribuApiError,
  AtribuConfigError,
  AtribuTransportError,
  AtribuOauthError,
  AtribuWebhookError,
  type ApiErrorCode,
  type ApiErrorBody,
  type OauthErrorCode,
  type WebhookErrorCode,
} from "./errors";

export type { RetryHint } from "./retry";

export {
  RetryingHttpClient,
  isRetryableError,
  type RetryOptions,
  type BackoffStrategy,
} from "./retry-wrapper";

export type {
  MessageSendInput,
  MessageSendResponse,
  MessageContent,
  SendOptions,
  MessageTypingInput,
  MessageTypingResponse,
  MessageMarkReadInput,
  TypingOptions,
} from "./resources/messages";

export type {
  EmailSearchInput,
  EmailSearchResult,
  EmailThread,
  EmailThreadMessage,
  EmailDraftInput,
  EmailDraftResult,
  EmailModifyLabelsInput,
  EmailModifyLabelsResult,
  EmailLabelsResult,
  EmailLabel,
  EmailMutationOptions,
  EmailReadOptions,
} from "./resources/email";

export type {
  CalendarEventDateTimeInput,
  CalendarAttendeeInput,
  CalendarSendUpdates,
  CalendarCreateEventInput,
  CalendarUpdateEventInput,
  CalendarEventDateTime,
  CalendarEvent,
  CalendarEventDeleted,
  CalendarMutationOptions,
  CalendarDeleteOptions,
  CalendarSummary,
  CalendarCreateInput,
  AclRule,
  ShareCalendarInput,
  CalendarListOptions,
  CalendarRevokeShareOptions,
} from "./resources/calendar";

export type {
  ExternalCalendarAccessRole,
  ExternalCalendar,
  ExternalEventDateTime,
  ExternalEventStatus,
  ExternalEventTransparency,
  ExternalCalendarEvent,
  ExternalEventsListInput,
  ExternalEventsPage,
  ExternalCalendarReadOptions,
} from "./resources/calendar-read";

export type {
  CommentReplyInput,
  CommentPrivateReplyInput,
  CommentReplyResponse,
  CommentReplyOptions,
} from "./resources/comments";

export type {
  WebhookSubscription,
  WebhookSubscriptionWithSecret,
  WebhookSubscriptionCreateInput,
  WebhookSubscriptionUpdateInput,
  WebhookSubscriptionRotateOptions,
  WebhookSubscriptionRotateResult,
  WebhookSubscriptionTestResult,
  MutationOptions,
} from "./resources/webhook-subscriptions";

export type {
  WebhookDeliveryReplayResult,
  ReplayOptions,
} from "./resources/webhook-deliveries";

export type {
  Connection,
  ConnectionChannel,
  ConnectionKind,
  ConnectionPixel,
  ConnectionSync,
  RevokeResult,
  PendingConnectionResponse,
  FinalizePendingConnectionInput,
  FinalizePendingConnectionResponse,
} from "./resources/connections";

// #489 slice B — the Shopify console surface (manual-mode webhooks + the app
// pixel). Same indexing rule as every type above it.
export type {
  ShopifyManualConnection,
  ShopifyWebPixelActivation,
} from "./resources/shopify";

// #1045 — the hand-off object. Indexed out of the generated `paths`, like
// every type above it.
export type { Handoff, HandoffKind, HandoffStatus } from "./resources/handoffs";

// #1051 — DPA/BAA signing. Same indexing rule as every type above it.
export type {
  LegalHandoff,
  LegalAcceptance,
  LegalAcceptInput,
  LegalDocument,
} from "./resources/legal";

// The analytics-area resources (#590). Every type here is indexed out of the
// generated OpenAPI `paths` — none is hand-written, so they cannot drift.
export type { ReadExtras, WriteExtras } from "./resources/common";

export type {
  OverviewOptions,
  OverviewResponse,
  CampaignsOptions,
  CampaignsResponse,
  CampaignConversionsOptions,
  CampaignConversionsResponse,
  BreakdownOptions,
  BreakdownResponse,
  DrillOptions,
  DrillResponse,
  FunnelsOptions,
  FunnelsResponse,
  NewVsReturningOptions,
  NewVsReturningResponse,
  LtvOptions,
  LtvResponse,
  CustomersOptions,
  CustomersResponse,
  VisitorsOptions,
  VisitorsResponse,
} from "./resources/analytics";

export type {
  AttributionModelsOptions,
  AttributionModelsResponse,
  AttributionExploreOptions,
  AttributionExploreResponse,
  MessagingAttributionOptions,
  MessagingAttributionResponse,
  MessagingKpiOptions,
  MessagingKpiResponse,
  MessagingConversionChainOptions,
  MessagingConversionChainResponse,
} from "./resources/attribution";

// #646 — the click-to-message board.
export type { DmAdsBoardOptions, DmAdsBoardResponse } from "./resources/dm-ads";

export type {
  OrganicPostsOptions,
  OrganicPostsResponse,
  OrganicPostOptions,
  OrganicPostResponse,
  OrganicPostIntelligenceOptions,
  OrganicPostIntelligenceResponse,
  OrganicStoryOptions,
  OrganicStoryResponse,
} from "./resources/organic";

export type { AdCreativeAnalysisResponse } from "./resources/ads";
// #489 — the AI console operations' response types, so a Client Component can
// `import type` the published DTO instead of hand-mirroring an internal route's
// body (which is how `ad-inline-analysis.tsx` and `ai-analysis-sheet.tsx` each
// carried their own copy of the analysis shape).
export type {
  AdAnalysisInput,
  AdAnalysisResponse,
  AdCreativeReviewResponse,
  AdVideoSourceResponse,
  CreativeVariantsInput,
  CreativeVariantsPublishInput,
  CreativeVariantsPublishResponse,
  CreativeVariantsResponse,
} from "./resources/ads";

export type {
  ProfileContextResponse,
  ProfileFreshnessResponse,
  WorkspaceProfilesOptions,
  WorkspaceProfilesResponse,
  // #488 — the settings/onboarding batch.
  ProfileUpdateInput,
  OutcomeDefinitionRow,
  OutcomeDefinitionUpdateInput,
  OutcomeDefinitionsReplaceInput,
  OutcomeDefinitionsReplaceResult,
  ProfileAuditEventType,
  DarkMessagingSpend,
  // #488 (PR-2) — the session-authenticated "add a profile to my workspace" branch.
  CreateProfileInput,
  CreatedProfile,
  // #1060 — the attribution WINDOW settings.
  AttributionSettings,
  AttributionSettingsUpdateInput,
  AttributionSettingsUpdateResult,
  // #489 (#1233) — "Analyze history".
  CreativeAnalysisBackfillInput,
  CreativeAnalysisBackfillPlan,
  // #489 — the profile knowledge-base document surface.
  KnowledgeBaseDocumentListItem,
  KnowledgeBaseDocumentCreateInput,
  KnowledgeBaseDocumentQueuedResult,
  KnowledgeBaseDocumentDetail,
  KnowledgeBaseDocumentUpdateInput,
  KnowledgeBaseDocumentUpdateResult,
  KnowledgeBaseDocumentDeleteResult,
} from "./resources/profile";

// #487 / #617 — the workspace-scoped surface. Session bearers only.
export type {
  WorkspacesResponse,
  WorkspaceTopPerformersOptions,
  WorkspaceTopPerformersResponse,
  WorkspaceCreativePatternsOptions,
  WorkspaceCreativePatternsResponse,
  WorkspaceProfilesListResponse,
  WorkspaceAuditOptions,
  WorkspaceAuditResponse,
  // #488 (PR-2) — the workspace subscription read.
  WorkspaceSubscription,
  // #1052 — the plan-checkout hand-off.
  CheckoutSessionInput,
  CheckoutHandoff,
  // #489 slice B — the Customer Portal and the Shopify plan picker.
  BillingPortalSession,
  ShopifyPlanSelectionInput,
  ShopifyPlanSelection,
  // #488 — the workspace MCP privacy panel.
  McpSettings,
  McpSettingsUpdateInput,
  McpWritebackAudit,
  // #1176 — DELETE /api/v1/workspaces/{id}: archive, terminal, owner only.
  ArchivedWorkspace,
} from "./resources/workspaces";
// #648 — the user-scoped surface. Session bearers only, and the only scope form
// that names no tenant (`userScoped: true`).
export type {
  MeResponse,
  MeUpdateBody,
  MeUpdateResponse,
  MeSessionsResponse,
} from "./resources/me";

export type {
  QualityUtmOptions,
  QualityUtmResponse,
  QualityUtmRefreshInput,
  QualityUtmRefreshOptions,
  QualityUtmRefreshResponse,
  QualityUtmAnomaliesOptions,
  QualityUtmAnomaliesResponse,
  QualityAttributionOptions,
  QualityAttributionResponse,
  QualityInstrumentationHealthOptions,
  QualityInstrumentationHealthResponse,
} from "./resources/quality";

// #643 — customer identity: the merge review queue + the repair scan.
export type {
  MergeProposalsOptions,
  MergeProposalsResponse,
  MergeProposalScanResponse,
  MergeProposalPreviewResponse,
  MergeProposalDecisionInput,
  MergeProposalDecisionResponse,
  IdentityRepairScanOptions,
  IdentityRepairScanResponse,
  IdentityRepairInput,
  IdentityRepairResponse,
  MergeHistoryOptions,
  MergeHistoryResponse,
  CustomerImportInput,
  CustomerImportResponse,
  CustomerImportRow,
} from "./resources/identity";

export type {
  GoalDefinitionsOptions,
  GoalDefinitionsResponse,
  GoalDefinitionSuggestionsOptions,
  GoalDefinitionSuggestionsResponse,
  GoalDefinitionPreviewBody,
  GoalDefinitionPreviewResponse,
  GoalDefinitionDiffBody,
  GoalDefinitionDiffResponse,
  GoalDefinitionWindowOptions,
} from "./resources/goals";

// #647 — channel classification rules. Reads only; the writes stay on the
// internal surface for now (see services/api/src/routes/classification.ts).
export type {
  ChannelRulesResponse,
  ChannelRuleSuggestionsOptions,
  ChannelRuleSuggestionsResponse,
  ChannelRuleMatchCountBody,
  ChannelRuleMatchCountResponse,
  ChannelRuleDiffBody,
  ChannelRuleDiffResponse,
  ChannelRuleWindowOptions,
} from "./resources/channel-rules";

// #391 — the commerce surface.
export type {
  CommerceOrder,
  CommerceOrderStatus,
  CommerceOrdersOptions,
  CommerceOrdersResponse,
  CommerceProduct,
  CommerceProductsOptions,
  CommerceProductsResponse,
  CommerceStockState,
  CommerceVariant,
} from "./resources/commerce";

export type {
  FilterValuesOptions,
  FilterValuesResponse,
} from "./resources/filters";

export type {
  RecommendationsOptions,
  RecommendationsResponse,
  RecommendationApplyInput,
  RecommendationApplyResponse,
  RecommendationDismissInput,
  RecommendationDismissResponse,
  RecommendationDiagnoseResponse,
} from "./resources/recommendations";

export type {
  ExportDestinationsResponse,
  ExportLedgerOptions,
  ExportLedgerResponse,
  ExportTriggerInput,
  ExportTriggerResponse,
  ExportBatchResponse,
  // #489 (second slice) — the export REVIEW surface.
  ExportReviewOptions,
  ExportReviewResponse,
  ExportReviewWarningsResponse,
  ExportRetryInput,
  ExportRetryResponse,
} from "./resources/exports";

export type {
  TrackingKeysResponse,
  IssueTrackingKeyInput,
  IssueTrackingKeyResponse,
  TrackingSnippetOptions,
  TrackingSnippetResponse,
  GtmInstallerOptions,
  GtmInstallerResponse,
  ShopifyPixelInstallerOptions,
  ShopifyPixelInstallerResponse,
  // #489 — the tracking CONSOLE surface.
  TrackingSettingsResponse,
  TrackingSettingsUpdateInput,
  TrackingSettingsUpdateResponse,
  TrackingOriginResponse,
  TrackingEventsOptions,
  TrackingEventsResponse,
  TrackingReplayStatusResponse,
  TrackingVerificationResponse,
  StartTrackingVerificationResponse,
  RevokeTrackingKeyResponse,
  TrackingOpsOptions,
  TrackingOpsResponse,
  TrackingQualityOptions,
  TrackingQualityResponse,
  // #489 (second slice) — first-party tracking domains.
  TrackingDomainsResponse,
  CreateTrackingDomainInput,
  CreateTrackingDomainResponse,
  VerifyTrackingDomainResponse,
  DeleteTrackingDomainResponse,
} from "./resources/tracking";

export type {
  ConversionSyncActionsResponse,
  ConversionSyncAuditOptions,
  ConversionSyncAuditResponse,
  ConversionSyncDefinitionResponse,
  ConversionSyncLegalResponse,
  ConversionSyncAudiencesResponse,
  ConversionSyncAudienceSeedPreviewResponse,
  ConversionSyncFeedOptions,
  ConversionSyncFeedResponse,
  ConversionSyncSetupLinkResponse,
  ConversionSyncTransparencyResponse,
} from "./resources/conversion-sync";

export type {
  ReportListOptions,
  ReportListResponse,
  ReportScheduleChangesOptions,
  ReportScheduleChangesResponse,
  ReportTemplatesResponse,
  ReportSchedulesResponse,
  ReportScheduleInput,
  ReportScheduleResponse,
  ReportScheduleUpdateInput,
  ReportScheduleUpdateResponse,
  ReportScheduleDeleteResponse,
  ReportDeliveriesOptions,
  ReportDeliveriesResponse,
  ReportGenerateOptions,
  ReportGenerateResponse,
  ReportResponse,
  ReportSendInput,
  ReportSendResponse,
  // #489 — the report-commentary AI assist.
  CommentaryAssistInput,
  CommentaryAssistResponse,
} from "./resources/reports";

export { EventsResource } from "./resources/events";
export { PaymentsResource } from "./resources/payments";
export type {
  WebpayCommit,
  WebpayIngestInput,
  WebpayIngestResult,
  WebpayIngestAccepted,
  WebpayIngestIgnored,
} from "./resources/payments";
export { PaymentsImportResource, PaymentsImportsResource } from "./resources/payments-import";
export type {
  PaymentsImportParseResult,
  PaymentsImportCommitResult,
  PaymentsImportCommitInput,
  PaymentsImportTemplate,
  PaymentsImportListItem,
  PaymentsImportUndoResult,
  PaymentsImportProvider,
} from "./resources/payments-import";
export type {
  TrackEventInput,
  PurchaseInput,
  TrackEventResponse,
  EventTrackOptions,
} from "./resources/events";

export type {
  WhatsAppTemplate,
  WhatsAppTemplateCreateInput,
  WhatsAppTemplateCreateResult,
  WhatsAppTemplateSyncResult,
  WhatsAppFlow,
  WhatsAppFlowDetail,
  WhatsAppFlowCreateInput,
  WhatsAppFlowCreateResult,
  WhatsAppFlowUpdateInput,
  WhatsAppFlowAsset,
  WhatsAppFlowJson,
  WhatsAppFlowJsonUploadResult,
  WhatsAppBroadcast,
  WhatsAppBroadcastDetail,
  WhatsAppBroadcastCreateInput,
  WhatsAppConversationMessage,
  WhatsAppConversationMessagesPage,
  WhatsAppSendMessageOptions,
  WhatsAppSendInteractiveInput,
  WhatsAppSendTemplateOptions,
  WhatsAppMediaUpload,
  UploadMediaOptions,
  WhatsAppMediaResolved,
  GetMediaOptions,
  WhatsAppAddNumberInput,
  WhatsAppAddNumberResult,
  WhatsAppRequestCodeInput,
  WhatsAppVerifyCodeInput,
  WhatsAppRegisterInput,
  WhatsAppSubscribeInput,
  WhatsAppSubscribedApp,
  WhatsAppFundingInfo,
  WhatsAppChannelHealth,
  WhatsAppHealthIssue,
  HealthGetOptions,
  WhatsAppAdWelcome,
  WhatsAppAdWelcomeMessage,
  AdWelcomeMessageOptions,
  WhatsAppCtwaAd,
  WhatsAppCtwaAdGreetingStatus,
  WhatsAppCtwaAdPage,
  ListCtwaAdsOptions,
} from "./resources/whatsapp";

export type {
  InstagramTrigger,
  InstagramTriggerCreateInput,
  InstagramTriggerUpdateInput,
  InstagramContact,
  GetContactOptions,
  InstagramMedia,
  InstagramMediaChild,
  InstagramMediaPage,
  InstagramMediaContainerInput,
  InstagramMediaContainer,
  InstagramMediaPublishInput,
  InstagramMediaPublishResult,
  InstagramMediaListOptions,
  InstagramMediaReadOptions,
  InstagramMediaWriteOptions,
  InstagramConversation,
  InstagramConversationParticipant,
  InstagramConversationMessage,
  InstagramConversationPage,
  InstagramConversationMessagePage,
  InstagramMessageParty,
  InstagramMessageAttachment,
  InstagramConversationListOptions,
  InstagramConversationMessagesOptions,
  // #489 — the console surface: `client.instagram.{accounts,competitorSources,
  // shortLinks,bioMedia,insights}`. `Ig*`-prefixed rather than `Instagram*`
  // so the two generations of this namespace stay tellable apart at a glance;
  // see `./resources/instagram/index.ts` for what separates them.
  IgAccount,
  IgAccountCommentTrigger,
  IgAccountCommentTriggerCreateInput,
  IgAccountCommentTriggerUpdateInput,
  IgAccountMediaOptions,
  IgAccountMediaPage,
  IgBioMediaVisibility,
  IgCompetitorMedia,
  IgCompetitorRefreshResult,
  IgCompetitorSource,
  IgCompetitorSourceCreateInput,
  IgCompetitorSourceUpdateInput,
  IgCtmHealth,
  IgCtmInventory,
  IgFollowProxyInput,
  IgFollowProxyLink,
  IgFollowerAttribution,
  IgIdentityReviewDecision,
  IgIdentityReviews,
  IgShortLink,
  IgShortLinkCreateInput,
  IgShortLinkCreated,
  IgShortLinkList,
  IgSyncResult,
  IgWindowOptions,
} from "./resources/instagram";

// #649 — the unified inbox: `client.conversations`. Distinct from
// `InstagramConversation*` / `WhatsAppConversation*` above — those are
// Vitrina's own messaging surfaces (keyed by connection/IGSID); this is
// Atribu's own inbox record of those conversations, channel-agnostic.
export type {
  ConversationsListResponse,
  ConversationsListOptions,
  ConversationMessagesResponse,
  ConversationMessagesOptions,
  ConversationOrganicMatchesResponse,
  ConversationOrganicMatchesOptions,
  ConversationLabelsResponse,
  ConversationReviewProposalsResponse,
  PendingReviewsCountResponse,
  UnlinkedInstagramPaymentsResponse,
  UnlinkedInstagramPaymentsOptions,
  InstagramConversationSearchResponse,
  InstagramConversationSearchOptions,
  SendMessageBody,
  SendMessageResponse,
  SaveDraftBody,
  SaveDraftResponse,
  ApplyLabelsBody,
  ApplyLabelsResponse,
  LinkCustomerBody,
  LinkCustomerResponse,
  UnlinkCustomerResponse,
  DecideReviewProposalBody,
  DecideReviewProposalResponse,
  ResolveConversationUserResponse,
} from "./resources/conversations";
