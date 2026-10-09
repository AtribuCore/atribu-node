import type { HttpClientLike } from "../../http";
import { WhatsAppTemplatesResource } from "./templates";
import { WhatsAppFlowsResource } from "./flows";
import { WhatsAppBroadcastsResource } from "./broadcasts";
import { WhatsAppConversationsResource } from "./conversations";
import { WhatsAppMediaResource } from "./media";
import { WhatsAppRegistrationResource } from "./registration";
import { WhatsAppOtpCaptureResource } from "./otp-capture";
import { WhatsAppHealthResource } from "./health";
import { WhatsAppCallingResource } from "./calling";
import { WhatsAppConsoleResource } from "./console";
import { WhatsAppAdsResource } from "./ads";

/**
 * WhatsApp-specific resource namespace. Mounted on `AtribuClient.whatsapp`.
 * Cross-channel messaging stays on `AtribuClient.messages`.
 */
export class WhatsAppNamespace {
  readonly templates: WhatsAppTemplatesResource;
  /** Flow lifecycle (create/publish/…). Sending one is `messages.send()` with `content.type: "flow"`. */
  readonly flows: WhatsAppFlowsResource;
  readonly broadcasts: WhatsAppBroadcastsResource;
  /**
   * #649 — `conversations.listMessages(id)` / `.sendMessage(id, …)` /
   * `.sendInteractive(id, …)` / `.sendTemplate(id, …)`. Cross-channel
   * `AtribuClient.messages.send()` cannot express these: it targets a raw
   * phone number via `connection_id`, with no `conversations` row concept —
   * these need a `conversations.id`, which the console (and this resource)
   * has instead.
   */
  readonly conversations: WhatsAppConversationsResource;
  readonly media: WhatsAppMediaResource;
  readonly registration: WhatsAppRegistrationResource;
  /** The relay carrying an OTP heard off Meta's call to the dealer's screen. */
  readonly otpCapture: WhatsAppOtpCaptureResource;
  readonly health: WhatsAppHealthResource;
  readonly calling: WhatsAppCallingResource;
  /** The SETTINGS panel: Automatic Events opt-in + label mapping. Not messaging. */
  readonly console: WhatsAppConsoleResource;
  /**
   * Ad-level reads: `ads.list()` for every click-to-WhatsApp ad on the profile
   * with its destination, call-to-action and greeting, and
   * `ads.welcomeMessage(adId)` for the greeting Meta shows a customer before
   * their first message and never sends over the webhook.
   */
  readonly ads: WhatsAppAdsResource;

  constructor(http: HttpClientLike) {
    this.templates = new WhatsAppTemplatesResource(http);
    this.flows = new WhatsAppFlowsResource(http);
    this.broadcasts = new WhatsAppBroadcastsResource(http);
    this.conversations = new WhatsAppConversationsResource(http);
    this.media = new WhatsAppMediaResource(http);
    this.registration = new WhatsAppRegistrationResource(http);
    this.otpCapture = new WhatsAppOtpCaptureResource(http);
    this.health = new WhatsAppHealthResource(http);
    this.calling = new WhatsAppCallingResource(http);
    this.console = new WhatsAppConsoleResource(http);
    this.ads = new WhatsAppAdsResource(http);
  }
}

export type {
  WhatsAppTemplate,
  WhatsAppTemplateCreateInput,
  WhatsAppTemplateCreateResult,
  WhatsAppTemplateSyncResult,
} from "./templates";
export type {
  WhatsAppFlow,
  WhatsAppFlowDetail,
  WhatsAppFlowCreateInput,
  WhatsAppFlowCreateResult,
  WhatsAppFlowUpdateInput,
  WhatsAppFlowAsset,
  WhatsAppFlowJson,
  WhatsAppFlowJsonUploadResult,
} from "./flows";
export type {
  WhatsAppBroadcast,
  WhatsAppBroadcastDetail,
  WhatsAppBroadcastCreateInput,
} from "./broadcasts";
export type {
  WhatsAppConversationMessage,
  WhatsAppConversationMessagesPage,
  SendMessageOptions as WhatsAppSendMessageOptions,
  SendInteractiveInput as WhatsAppSendInteractiveInput,
  SendDeclaredSourcePromptInput as WhatsAppSendDeclaredSourcePromptInput,
  SendTemplateOptions as WhatsAppSendTemplateOptions,
} from "./conversations";
export type {
  WhatsAppMediaUpload,
  UploadMediaOptions,
  WhatsAppMediaResolved,
  GetMediaOptions,
} from "./media";
export type {
  WhatsAppAddNumberInput,
  WhatsAppAddNumberResult,
  WhatsAppRequestCodeInput,
  WhatsAppVerifyCodeInput,
  WhatsAppRegisterInput,
  WhatsAppSubscribeInput,
  WhatsAppSubscribedApp,
  WhatsAppFundingInfo,
} from "./registration";
export type {
  WhatsAppOtpCapture,
  WhatsAppOtpCaptureInput,
} from "./otp-capture";
export type {
  WhatsAppChannelHealth,
  WhatsAppHealthIssue,
  HealthGetOptions,
} from "./health";
export type {
  WhatsAppAdWelcome,
  WhatsAppAdWelcomeMessage,
  AdWelcomeMessageOptions,
  WhatsAppCtwaAd,
  WhatsAppCtwaAdGreetingStatus,
  WhatsAppCtwaAdPage,
  ListCtwaAdsOptions,
} from "./ads";
export type { WhatsAppCallingSettings } from "./calling";
export type {
  WhatsAppAutomaticEventsAccount,
  SetAutomaticEventsOptInInput,
  WhatsAppDeclaredSourcePrompt,
  WhatsAppDeclaredSourcePromptAccount,
  WhatsAppDeclaredSourcePromptSpec,
  SetDeclaredSourcePromptInput,
  RecordDeclaredSourceAnswerInput,
  DeclaredSourceAnswerRecord,
  RecordAdReferralInput,
  AdReferralRecord,
  PreviewAdReferralsInput,
  AdReferralImpactPreview,
  WhatsAppSettingsLabel,
  WhatsAppLabelMapping,
  CreateWhatsAppLabelInput,
  UpsertWhatsAppLabelMappingInput,
} from "./console";
