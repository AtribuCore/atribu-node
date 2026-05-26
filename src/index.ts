export { AtribuClient } from "./client";
export type { AtribuClientConfig } from "./config";
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
} from "./resources/calendar";

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

export type { Connection } from "./resources/connections";

export type {
  WhatsAppTemplate,
  WhatsAppTemplateCreateInput,
  WhatsAppTemplateCreateResult,
  WhatsAppBroadcast,
  WhatsAppBroadcastDetail,
  WhatsAppBroadcastCreateInput,
} from "./resources/whatsapp";

export type {
  InstagramTrigger,
  InstagramTriggerCreateInput,
  InstagramTriggerUpdateInput,
} from "./resources/instagram";
