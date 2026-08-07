import type { HttpClientLike } from "../../http";
import { WhatsAppTemplatesResource } from "./templates";
import { WhatsAppFlowsResource } from "./flows";
import { WhatsAppBroadcastsResource } from "./broadcasts";
import { WhatsAppMediaResource } from "./media";
import { WhatsAppRegistrationResource } from "./registration";
import { WhatsAppOtpCaptureResource } from "./otp-capture";
import { WhatsAppHealthResource } from "./health";
import { WhatsAppCallingResource } from "./calling";

/**
 * WhatsApp-specific resource namespace. Mounted on `AtribuClient.whatsapp`.
 * Cross-channel messaging stays on `AtribuClient.messages`.
 */
export class WhatsAppNamespace {
  readonly templates: WhatsAppTemplatesResource;
  /** Flow lifecycle (create/publish/…). Sending one is `messages.send()` with `content.type: "flow"`. */
  readonly flows: WhatsAppFlowsResource;
  readonly broadcasts: WhatsAppBroadcastsResource;
  readonly media: WhatsAppMediaResource;
  readonly registration: WhatsAppRegistrationResource;
  /** The relay carrying an OTP heard off Meta's call to the dealer's screen. */
  readonly otpCapture: WhatsAppOtpCaptureResource;
  readonly health: WhatsAppHealthResource;
  readonly calling: WhatsAppCallingResource;

  constructor(http: HttpClientLike) {
    this.templates = new WhatsAppTemplatesResource(http);
    this.flows = new WhatsAppFlowsResource(http);
    this.broadcasts = new WhatsAppBroadcastsResource(http);
    this.media = new WhatsAppMediaResource(http);
    this.registration = new WhatsAppRegistrationResource(http);
    this.otpCapture = new WhatsAppOtpCaptureResource(http);
    this.health = new WhatsAppHealthResource(http);
    this.calling = new WhatsAppCallingResource(http);
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
export type { WhatsAppCallingSettings } from "./calling";
